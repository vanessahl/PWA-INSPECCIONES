export const DATABASE_NAME = "pwa-inspecciones";
export const DATABASE_VERSION = 1;
export const INSPECTIONS_STORE = "inspections";
export const OUTBOX_STORE = "outbox";

export type InspectionRecord = {
  id: string;
  location: string;
  date: string;
  inspector: string;
  status: "ok" | "attention";
  statusLabel: string;
  findings: number;
  summary: string;
};

export type StoredInspection = {
  inspection: InspectionRecord;
  updatedAt: string;
  syncStatus: "pending" | "synced";
  revision?: number;
};

export type VersionedInspection = {
  inspection: InspectionRecord;
  updatedAt: string;
  revision: number;
};

export type OutboxEntry = {
  id: string;
  idempotencyKey: string;
  inspection: InspectionRecord;
  updatedAt: string;
  attempts: number;
  nextAttemptAt: number;
  status: "pending" | "in-flight";
  leaseUntil: number;
  expectedRevision?: number;
  lastError?: string;
};

export interface SyncStore {
  enqueueLocal(inspection: InspectionRecord, updatedAt: string, idempotencyKey: string): Promise<boolean>;
  listLocal(): Promise<StoredInspection[]>;
  listPending(): Promise<OutboxEntry[]>;
  claimDue(now: number, leaseMs: number): Promise<OutboxEntry[]>;
  defer(entry: OutboxEntry): Promise<void>;
  markSynced(entry: OutboxEntry, remote: VersionedInspection): Promise<void>;
  adoptRemote(entryId: string, remote: VersionedInspection): Promise<void>;
}

const INSPECTION_FIELDS = new Set([
  "id",
  "location",
  "date",
  "inspector",
  "status",
  "statusLabel",
  "findings",
  "summary"
]);

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value);
}

export function isInspectionRecord(value: unknown): value is InspectionRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== INSPECTION_FIELDS.size || keys.some((key) => !INSPECTION_FIELDS.has(key))) return false;

  return (
    isBoundedText(record.id, 128) &&
    isBoundedText(record.location, 100) &&
    isBoundedText(record.date, 40) && !Number.isNaN(Date.parse(record.date)) &&
    isBoundedText(record.inspector, 80) &&
    (record.status === "ok" || record.status === "attention") &&
    isBoundedText(record.statusLabel, 80) &&
    Number.isSafeInteger(record.findings) && (record.findings as number) >= 0 && (record.findings as number) <= 1000 &&
    isBoundedText(record.summary, 500)
  );
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no está disponible en este entorno."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(INSPECTIONS_STORE)) {
        database.createObjectStore(INSPECTIONS_STORE, { keyPath: "inspection.id" });
      }
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        outbox.createIndex("nextAttemptAt", "nextAttemptAt");
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    request.onblocked = () => reject(new Error("La actualización de IndexedDB está bloqueada."));
  });
}

function transaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction, setResult: (value: T) => void) => void
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const tx = database.transaction(stores, mode);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error("Falló una transacción de IndexedDB."));
    tx.onabort = () => reject(tx.error ?? new Error("Se canceló una transacción de IndexedDB."));
    try {
      run(tx, (value) => { result = value; });
    } catch (error) {
      tx.abort();
      reject(error);
    }
  }));
}

export class IndexedDbSyncStore implements SyncStore {
  enqueueLocal(inspection: InspectionRecord, updatedAt: string, idempotencyKey: string) {
    const entry: OutboxEntry = {
      id: inspection.id,
      idempotencyKey,
      inspection,
      updatedAt,
      attempts: 0,
      nextAttemptAt: 0,
      status: "pending",
      leaseUntil: 0
    };

    return transaction<boolean>([INSPECTIONS_STORE, OUTBOX_STORE], "readwrite", (tx, setResult) => {
      const inspections = tx.objectStore(INSPECTIONS_STORE);
      const outbox = tx.objectStore(OUTBOX_STORE);
      const existing = inspections.get(inspection.id);
      existing.onsuccess = () => {
        if (existing.result) {
          setResult(false);
          return;
        }
        inspections.add({ inspection, updatedAt, syncStatus: "pending" } satisfies StoredInspection);
        outbox.add(entry);
        setResult(true);
      };
    });
  }

  listLocal() {
    return transaction<StoredInspection[]>([INSPECTIONS_STORE], "readonly", (tx, setResult) => {
      const request = tx.objectStore(INSPECTIONS_STORE).getAll();
      request.onsuccess = () => setResult(request.result as StoredInspection[]);
    });
  }

  listPending() {
    return transaction<OutboxEntry[]>([OUTBOX_STORE], "readonly", (tx, setResult) => {
      const request = tx.objectStore(OUTBOX_STORE).getAll();
      request.onsuccess = () => setResult(request.result as OutboxEntry[]);
    });
  }

  claimDue(now: number, leaseMs: number) {
    return transaction<OutboxEntry[]>([OUTBOX_STORE], "readwrite", (tx, setResult) => {
      const outbox = tx.objectStore(OUTBOX_STORE);
      const request = outbox.getAll();
      request.onsuccess = () => {
        const [entry] = (request.result as OutboxEntry[]).filter((candidate) =>
          (candidate.status === "pending" && candidate.nextAttemptAt <= now) ||
          (candidate.status === "in-flight" && candidate.leaseUntil <= now)
        );
        if (!entry) {
          setResult([]);
          return;
        }
        const claimed = { ...entry, status: "in-flight" as const, leaseUntil: now + leaseMs };
        outbox.put(claimed);
        setResult([claimed]);
      };
    });
  }

  defer(entry: OutboxEntry) {
    return transaction<void>([OUTBOX_STORE], "readwrite", (tx, setResult) => {
      tx.objectStore(OUTBOX_STORE).put(entry);
      setResult(undefined);
    });
  }

  markSynced(entry: OutboxEntry, remote: VersionedInspection) {
    return transaction<void>([INSPECTIONS_STORE, OUTBOX_STORE], "readwrite", (tx, setResult) => {
      tx.objectStore(INSPECTIONS_STORE).put({
        inspection: remote.inspection,
        updatedAt: remote.updatedAt,
        revision: remote.revision,
        syncStatus: "synced"
      } satisfies StoredInspection);
      tx.objectStore(OUTBOX_STORE).delete(entry.id);
      setResult(undefined);
    });
  }

  adoptRemote(entryId: string, remote: VersionedInspection) {
    return transaction<void>([INSPECTIONS_STORE, OUTBOX_STORE], "readwrite", (tx, setResult) => {
      tx.objectStore(INSPECTIONS_STORE).put({
        inspection: remote.inspection,
        updatedAt: remote.updatedAt,
        revision: remote.revision,
        syncStatus: "synced"
      } satisfies StoredInspection);
      tx.objectStore(OUTBOX_STORE).delete(entryId);
      setResult(undefined);
    });
  }
}