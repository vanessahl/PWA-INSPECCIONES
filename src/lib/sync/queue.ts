import { chooseConflictWinner } from "./conflict-policy.ts";
import {
  IndexedDbSyncStore,
  isInspectionRecord,
  type InspectionRecord,
  type OutboxEntry,
  type SyncStore,
  type VersionedInspection
} from "../storage/schema.ts";

export type SyncResponse =
  | { kind: "synced"; revision: number; inspection?: InspectionRecord; updatedAt?: string }
  | { kind: "conflict"; current: VersionedInspection };

export type SyncTransport = (entry: OutboxEntry, signal: AbortSignal) => Promise<SyncResponse>;

export function createHttpSyncTransport(
  endpoint = "/api/inspecciones/sync",
  fetcher: typeof fetch = fetch
): SyncTransport {
  return async (entry, signal) => {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": entry.idempotencyKey
      },
      body: JSON.stringify({
        inspection: entry.inspection,
        updatedAt: entry.updatedAt,
        expectedRevision: entry.expectedRevision ?? null
      }),
      signal
    });
    const result: unknown = await response.json();
    if (response.status === 409) return result as SyncResponse;
    if (!response.ok) throw new Error("El servidor no pudo sincronizar la inspección.");
    return result as SyncResponse;
  };
}

export type SyncOptions = {
  now?: () => number;
  leaseMs?: number;
  timeoutMs?: number;
  maxOperations?: number;
};

export type SyncSummary = {
  synced: number;
  retried: number;
  conflictsResolvedLocal: number;
  conflictsResolvedRemote: number;
  remaining: number;
};

const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OPERATIONS = 50;
const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 60_000;

export async function enqueueInspection(
  store: SyncStore,
  inspection: InspectionRecord,
  now = Date.now()
): Promise<boolean> {
  if (!isInspectionRecord(inspection)) {
    throw new TypeError("La inspección no cumple el esquema esperado.");
  }
  if (!Number.isFinite(now)) throw new TypeError("La hora de creación no es válida.");
  return store.enqueueLocal(inspection, new Date(now).toISOString(), inspection.id);
}

function retryDelay(attempts: number): number {
  return Math.min(BASE_RETRY_MS * 2 ** Math.min(Math.max(attempts - 1, 0), 16), MAX_RETRY_MS);
}

async function sendWithTimeout(
  transport: SyncTransport,
  entry: OutboxEntry,
  timeoutMs: number
): Promise<SyncResponse> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("La sincronización excedió el tiempo límite."));
    }, timeoutMs);
  });
  try {
    return await Promise.race([transport(entry, controller.signal), timedOut]);
  } finally {
    clearTimeout(timeout!);
  }
}

function isVersionedInspection(value: unknown): value is VersionedInspection {
  if (typeof value !== "object" || value === null) return false;
  const remote = value as Record<string, unknown>;
  return isInspectionRecord(remote.inspection) &&
    typeof remote.updatedAt === "string" && Number.isFinite(Date.parse(remote.updatedAt)) &&
    Number.isInteger(remote.revision) && (remote.revision as number) >= 0;
}

export async function syncPending(
  store: SyncStore,
  transport: SyncTransport,
  options: SyncOptions = {}
): Promise<SyncSummary> {
  const now = options.now ?? Date.now;
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOperations = options.maxOperations ?? DEFAULT_MAX_OPERATIONS;
  const summary: SyncSummary = {
    synced: 0,
    retried: 0,
    conflictsResolvedLocal: 0,
    conflictsResolvedRemote: 0,
    remaining: 0
  };

  for (let operation = 0; operation < maxOperations; operation += 1) {
    const [entry] = await store.claimDue(now(), leaseMs);
    if (!entry) break;
    try {
      const response = await sendWithTimeout(transport, entry, timeoutMs);
      if (response.kind === "synced") {
        if (!Number.isInteger(response.revision) || response.revision < 0) {
          throw new TypeError("La respuesta de sincronización no contiene una revisión válida.");
        }
        const remote: VersionedInspection = {
          inspection: response.inspection ?? entry.inspection,
          updatedAt: response.updatedAt ?? entry.updatedAt,
          revision: response.revision
        };
        if (!isVersionedInspection(remote) || remote.inspection.id !== entry.id) {
          throw new TypeError("La respuesta remota no corresponde a la inspección encolada.");
        }
        await store.markSynced(entry, remote);
        summary.synced += 1;
      } else if (
        response.kind === "conflict" &&
        isVersionedInspection(response.current) &&
        response.current.inspection.id === entry.id
      ) {
        const local = {
          inspection: entry.inspection,
          updatedAt: entry.updatedAt,
          revision: entry.expectedRevision ?? 0
        };
        if (chooseConflictWinner(local, response.current) === "remote") {
          await store.adoptRemote(entry.id, response.current);
          summary.conflictsResolvedRemote += 1;
        } else {
          const revision = response.current.revision;
          await store.defer({
            ...entry,
            idempotencyKey: `${entry.id}:revision:${revision}`,
            expectedRevision: revision,
            attempts: entry.attempts + 1,
            nextAttemptAt: now() + BASE_RETRY_MS,
            status: "pending",
            leaseUntil: 0
          });
          summary.conflictsResolvedLocal += 1;
        }
      } else {
        throw new TypeError("La respuesta de sincronización tiene un formato desconocido.");
      }
    } catch (error) {
      const attempts = entry.attempts + 1;
      await store.defer({
        ...entry,
        attempts,
        nextAttemptAt: now() + retryDelay(attempts),
        status: "pending",
        leaseUntil: 0,
        lastError: error instanceof Error ? error.message : "Error desconocido de sincronización."
      });
      summary.retried += 1;
    }
  }

  summary.remaining = (await store.listPending()).length;
  return summary;
}

export function registerOnlineSync(
  store: SyncStore,
  transport: SyncTransport,
  options: SyncOptions & {
    onComplete?: (summary: SyncSummary) => void;
    onError?: (error: unknown) => void;
  } = {}
): () => void {
  if (typeof window === "undefined") return () => undefined;
  let running = false;
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const clearRetryTimer = () => {
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const scheduleRetry = async () => {
    if (disposed || !navigator.onLine) return;
    try {
      const pending = await store.listPending();
      if (disposed || pending.length === 0) return;
      const nextAttemptAt = Math.min(...pending.map((entry) =>
        entry.status === "in-flight" ? entry.leaseUntil : entry.nextAttemptAt
      ));
      clearRetryTimer();
      retryTimer = setTimeout(run, Math.max(0, nextAttemptAt - (options.now ?? Date.now)()));
    } catch (error) {
      options.onError?.(error);
    }
  };

  const run = () => {
    if (running || disposed || !navigator.onLine) return;
    clearRetryTimer();
    running = true;
    void syncPending(store, transport, options)
      .then((summary) => options.onComplete?.(summary))
      .catch((error: unknown) => options.onError?.(error))
      .finally(() => {
        running = false;
        void scheduleRetry();
      });
  };
  const handleOffline = () => clearRetryTimer();
  window.addEventListener("online", run);
  window.addEventListener("offline", handleOffline);
  if (navigator.onLine) run();
  return () => {
    disposed = true;
    clearRetryTimer();
    window.removeEventListener("online", run);
    window.removeEventListener("offline", handleOffline);
  };
}

export function createSyncStore(): SyncStore {
  return new IndexedDbSyncStore();
}