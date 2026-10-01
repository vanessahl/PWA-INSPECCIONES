import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { POST as syncRoute } from "../src/app/api/inspecciones/sync/route.ts";
import { createHttpSyncTransport, enqueueInspection, syncPending } from "../src/lib/sync/queue.ts";
import { chooseConflictWinner } from "../src/lib/sync/conflict-policy.ts";
import {
  DATABASE_NAME,
  IndexedDbSyncStore,
  type InspectionRecord,
  type OutboxEntry,
  type StoredInspection,
  type SyncStore,
  type VersionedInspection
} from "../src/lib/storage/schema.ts";

class MemoryStore implements SyncStore {
  local = new Map<string, StoredInspection>();
  outbox = new Map<string, OutboxEntry>();
  async enqueueLocal(inspection: InspectionRecord, updatedAt: string, idempotencyKey: string) {
    if (this.local.has(inspection.id)) return false;
    this.local.set(inspection.id, { inspection, updatedAt, syncStatus: "pending" });
    this.outbox.set(inspection.id, { id: inspection.id, idempotencyKey, inspection, updatedAt,
      attempts: 0, nextAttemptAt: 0, status: "pending", leaseUntil: 0 });
    return true;
  }
  async listLocal() { return [...this.local.values()]; }
  async listPending() { return [...this.outbox.values()]; }
  async claimDue(now: number, leaseMs: number) {
    const entry = [...this.outbox.values()].find((item) =>
      (item.status === "pending" && item.nextAttemptAt <= now) ||
      (item.status === "in-flight" && item.leaseUntil <= now));
    if (!entry) return [];
    const claimed = { ...entry, status: "in-flight" as const, leaseUntil: now + leaseMs };
    this.outbox.set(entry.id, claimed);
    return [claimed];
  }
  async defer(entry: OutboxEntry) { this.outbox.set(entry.id, entry); }
  async markSynced(entry: OutboxEntry, remote: VersionedInspection) {
    this.local.set(entry.id, { ...remote, syncStatus: "synced" });
    this.outbox.delete(entry.id);
  }
  async adoptRemote(id: string, remote: VersionedInspection) {
    this.local.set(id, { ...remote, syncStatus: "synced" });
    this.outbox.delete(id);
  }
}

const fixture: InspectionRecord = {
  id: "synthetic-101", location: "Laboratorio de Prueba", date: "2026-09-29",
  inspector: "Técnica A", status: "attention", statusLabel: "Requiere atención",
  findings: 1, summary: "Observación sintética de prueba."
};
const remote = (updatedAt: string, revision: number, inspection = fixture): VersionedInspection =>
  ({ inspection, updatedAt, revision });
let now = Date.parse("2026-09-29T10:00:00.000Z");

const retryStore = new MemoryStore();
assert.equal(await enqueueInspection(retryStore, fixture, now), true);
assert.equal(await enqueueInspection(retryStore, fixture, now), false, "evita duplicar por ID");
assert.equal((await retryStore.listLocal()).length, 1);
let attempts = 0;
const transientTransport = async () => {
  attempts += 1;
  if (attempts === 1) throw new Error("fallo de red sintético");
  return { kind: "synced" as const, revision: 1 };
};
assert.equal((await syncPending(retryStore, transientTransport, { now: () => now })).retried, 1);
assert.equal((await syncPending(retryStore, transientTransport, { now: () => now })).retried, 0,
  "espera el backoff");
now = (await retryStore.listPending())[0].nextAttemptAt;
assert.equal((await syncPending(retryStore, transientTransport, { now: () => now })).synced, 1);
assert.equal((await retryStore.listPending()).length, 0);
assert.equal((await retryStore.listLocal())[0].syncStatus, "synced");

const timeoutStore = new MemoryStore();
await enqueueInspection(timeoutStore, { ...fixture, id: "synthetic-timeout-101" }, now);
let aborted = false;
const timedOut = await syncPending(timeoutStore, (_entry, signal) => new Promise((_resolve, reject) => {
  signal.addEventListener("abort", () => {
    aborted = true;
    reject(new Error("solicitud abortada"));
  }, { once: true });
}), { now: () => now, timeoutMs: 0 });
assert.equal(timedOut.retried, 1);
assert.equal(aborted, true, "aborta el transporte que excede el timeout");

const localStore = new MemoryStore();
now = Date.parse("2026-09-29T12:00:00.000Z");
await enqueueInspection(localStore, fixture, now);
let sends = 0;
const localResult = await syncPending(localStore, async (entry) => {
  sends += 1;
  if (sends === 1) return { kind: "conflict" as const, current: remote("2026-09-29T11:00:00.000Z", 7) };
  assert.equal(entry.expectedRevision, 7);
  return { kind: "synced" as const, revision: 8 };
}, { now: () => now });
assert.equal(localResult.conflictsResolvedLocal, 1);
assert.equal(localResult.synced, 0, "no reintenta inmediatamente el mismo conflicto");
assert.equal(sends, 1);
now = (await localStore.listPending())[0].nextAttemptAt;
assert.equal((await syncPending(localStore, async (entry) => {
  assert.equal(entry.expectedRevision, 7);
  return { kind: "synced" as const, revision: 8 };
}, { now: () => now })).synced, 1);

const remoteStore = new MemoryStore();
now = Date.parse("2026-09-29T10:00:00.000Z");
await enqueueInspection(remoteStore, fixture, now);
const remoteFixture = { ...fixture, summary: "Versión remota sintética." };
const remoteResult = await syncPending(remoteStore, async () => ({
  kind: "conflict" as const, current: remote("2026-09-29T11:00:00.000Z", 9, remoteFixture)
}), { now: () => now });
assert.equal(remoteResult.conflictsResolvedRemote, 1);
assert.equal((await remoteStore.listLocal())[0].inspection.summary, remoteFixture.summary);
assert.equal(chooseConflictWinner(
  { updatedAt: "2026-09-29T10:00:00.000Z" }, { updatedAt: "2026-09-29T10:00:00.000Z" }
), "remote", "el servidor gana en empate");
await assert.rejects(() => enqueueInspection(remoteStore, { ...fixture, findings: -1 }, now), TypeError);

const recoveryStore = new MemoryStore();
await enqueueInspection(recoveryStore, { ...fixture, id: "synthetic-102" }, now);
assert.equal((await recoveryStore.claimDue(now, 1000)).length, 1);
const transport = async () => ({ kind: "synced" as const, revision: 1 });
assert.equal((await syncPending(recoveryStore, transport, { now: () => now + 500, leaseMs: 1000 })).synced, 0);
assert.equal((await syncPending(recoveryStore, transport, { now: () => now + 1001, leaseMs: 1000 })).synced, 1,
  "recupera una operación cuyo lease expiró");

const mismatchStore = new MemoryStore();
await enqueueInspection(mismatchStore, { ...fixture, id: "synthetic-mismatch-101" }, now);
const mismatch = await syncPending(mismatchStore, async () => ({
  kind: "synced" as const,
  revision: 1,
  inspection: { ...fixture, id: "synthetic-unrelated-101" }
}), { now: () => now });
assert.equal(mismatch.retried, 1, "rechaza una respuesta para otra inspección");

const indexedDbStore = new IndexedDbSyncStore();
const persistedFixture = { ...fixture, id: "synthetic-indexeddb-101" };
assert.equal(await enqueueInspection(indexedDbStore, persistedFixture, now), true);
const reopenedStore = new IndexedDbSyncStore();
assert.equal((await reopenedStore.listLocal()).length, 1, "conserva el registro al abrir otro adapter");
assert.equal((await reopenedStore.listPending()).length, 1, "persiste la outbox junto al registro");
assert.equal(await enqueueInspection(reopenedStore, persistedFixture, now), false,
  "IndexedDB impide duplicados tras reabrir");

const endpointStore = new MemoryStore();
await enqueueInspection(endpointStore, { ...fixture, id: "synthetic-endpoint-101" }, now);
const endpointTransport = createHttpSyncTransport("/api/inspecciones/sync", async (_input, init) =>
  syncRoute(new Request("http://localhost/api/inspecciones/sync", init))
);
assert.equal((await syncPending(endpointStore, endpointTransport, { now: () => now })).synced, 1,
  "sincroniza outbox contra el endpoint HTTP sintético");

const idempotentRequest = new Request("http://localhost/api/inspecciones/sync", {
  method: "POST",
  headers: { "content-type": "application/json", "idempotency-key": "synthetic-idempotency-101" },
  body: JSON.stringify({ inspection: fixture, updatedAt: new Date(now).toISOString(), expectedRevision: null })
});
const firstApiResponse = await syncRoute(idempotentRequest);
assert.equal(firstApiResponse.status, 200);
const duplicateApiResponse = await syncRoute(new Request("http://localhost/api/inspecciones/sync", {
  method: "POST",
  headers: { "content-type": "application/json", "idempotency-key": "synthetic-idempotency-101" },
  body: JSON.stringify({ inspection: { ...fixture, summary: "reintento cambiado" },
    updatedAt: new Date(now).toISOString(), expectedRevision: null })
}));
assert.equal(duplicateApiResponse.status, 200, "reintento HTTP devuelve ACK idempotente");
assert.equal((await duplicateApiResponse.json()).kind, "synced");

const staleRevisionResponse = await syncRoute(new Request("http://localhost/api/inspecciones/sync", {
  method: "POST",
  headers: { "content-type": "application/json", "idempotency-key": "synthetic-conflict-101" },
  body: JSON.stringify({ inspection: { ...fixture, id: "inspection-001" },
    updatedAt: new Date(now).toISOString(), expectedRevision: null })
}));
assert.equal(staleRevisionResponse.status, 409, "la revisión obsoleta responde conflicto");
assert.equal((await staleRevisionResponse.json()).kind, "conflict");

console.log("sync.spec.ts: PASS");