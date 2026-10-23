import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { test } from "node:test";
import { POST } from "../../src/app/api/inspecciones/sync/route.ts";
import { createHttpSyncTransport, enqueueInspection, syncPending } from "../../src/lib/sync/queue.ts";
import { IndexedDbSyncStore } from "../../src/lib/storage/schema.ts";
import { syntheticInspection } from "../helpers/fixtures.ts";

// Conecta el transporte real con el handler real, sin red.
const routeFetch = ((url: string, init: RequestInit) =>
  POST(new Request(`http://localhost${url}`, init))) as unknown as typeof fetch;
const transport = createHttpSyncTransport("/api/inspecciones/sync", routeFetch);

test("IndexedDB + cola + API: captura offline y sincroniza al volver la conexión", async () => {
  const store = new IndexedDbSyncStore();
  const id = "integration-offline-001";
  const createdAt = Date.parse("2026-10-20T10:00:00.000Z");
  assert.equal(await enqueueInspection(store, syntheticInspection({ id }), createdAt), true);
  assert.equal(await enqueueInspection(store, syntheticInspection({ id }), createdAt), false,
    "no duplica por id");

  let clock = createdAt;
  const offline = async () => { throw new Error("sin conexión sintética"); };
  const failed = await syncPending(store, offline, { now: () => clock });
  assert.equal(failed.retried, 1);
  assert.equal((await store.listPending()).length, 1, "la inspección sigue en la cola");

  clock = (await store.listPending())[0].nextAttemptAt;
  const summary = await syncPending(store, transport, { now: () => clock });
  assert.equal(summary.synced, 1);
  assert.equal(summary.remaining, 0);
  const [stored] = (await store.listLocal()).filter((item) => item.inspection.id === id);
  assert.equal(stored.syncStatus, "synced");
  assert.equal(stored.revision, 1);
});

test("conflicto: gana el cambio local más reciente y se reintenta con la revisión remota", async () => {
  const store = new IndexedDbSyncStore();
  const id = "inspection-001";
  const createdAt = Date.parse("2026-10-20T10:00:00.000Z");
  await enqueueInspection(store, syntheticInspection({ id, summary: "Cambio local sintético." }), createdAt);

  let clock = createdAt;
  const first = await syncPending(store, transport, { now: () => clock });
  assert.equal(first.conflictsResolvedLocal, 1);
  const [pending] = await store.listPending();
  assert.equal(pending.expectedRevision, 1);

  clock = pending.nextAttemptAt;
  const second = await syncPending(store, transport, { now: () => clock });
  assert.equal(second.synced, 1);
  const [stored] = (await store.listLocal()).filter((item) => item.inspection.id === id);
  assert.equal(stored.revision, 2);
  assert.equal(stored.inspection.summary, "Cambio local sintético.");
});

test("conflicto: el servidor gana si su versión es más reciente", async () => {
  const store = new IndexedDbSyncStore();
  const id = "inspection-002";
  const oldLocal = Date.parse("2026-08-01T10:00:00.000Z");
  await enqueueInspection(store, syntheticInspection({ id, summary: "Cambio local antiguo." }), oldLocal);

  const summary = await syncPending(store, transport, { now: () => oldLocal });
  assert.equal(summary.conflictsResolvedRemote, 1);
  assert.equal(summary.remaining, 0);
  const [stored] = (await store.listLocal()).filter((item) => item.inspection.id === id);
  assert.notEqual(stored.inspection.summary, "Cambio local antiguo.");
  assert.equal(stored.syncStatus, "synced");
});
