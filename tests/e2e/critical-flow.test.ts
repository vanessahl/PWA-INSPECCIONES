import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import "fake-indexeddb/auto";
import { createHttpSyncTransport, enqueueInspection, syncPending } from "../../src/lib/sync/queue.ts";
import { IndexedDbSyncStore } from "../../src/lib/storage/schema.ts";
import { syntheticInspection } from "../helpers/fixtures.ts";
import { startServer, type TestServer } from "../helpers/server.ts";

let server: TestServer;
let base = "";

before(async () => {
  server = await startServer(3107);
  base = server.base;
});

after(() => { server?.stop(); });

test("el shell, la lista de inspecciones y un detalle responden con HTML", async () => {
  for (const path of ["/", "/inspecciones", "/inspecciones/inspection-001"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/, path);
  }
  assert.match(await (await fetch(`${base}/inspecciones`)).text(), /manifest/);
});

test("el manifest y el service worker se sirven para instalación offline", async () => {
  const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.length > 0);
  const worker = await fetch(`${base}/sw.js`);
  assert.equal(worker.status, 200);
  assert.match(await worker.text(), /fetch/);
});

test("flujo crítico: captura sin red, reintento y sincronización contra el servidor real", async () => {
  const store = new IndexedDbSyncStore();
  const id = "e2e-flow-001";
  const createdAt = Date.parse("2026-10-20T10:00:00.000Z");
  await enqueueInspection(store, syntheticInspection({ id }), createdAt);

  let clock = createdAt;
  const deadServer = createHttpSyncTransport("/api/inspecciones/sync", (() =>
    Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch);
  assert.equal((await syncPending(store, deadServer, { now: () => clock })).retried, 1);

  const transport = createHttpSyncTransport(`${base}/api/inspecciones/sync`);
  clock = (await store.listPending())[0].nextAttemptAt;
  const summary = await syncPending(store, transport, { now: () => clock });
  assert.equal(summary.synced, 1);
  assert.equal(summary.remaining, 0);
  const [stored] = (await store.listLocal()).filter((item) => item.inspection.id === id);
  assert.equal(stored.syncStatus, "synced");
  assert.equal(stored.revision, 1);
});

test("el servidor es idempotente y detecta revisiones obsoletas por HTTP", async () => {
  const body = JSON.stringify({
    inspection: syntheticInspection({ id: "e2e-idem-001" }),
    updatedAt: "2026-10-20T10:00:00.000Z",
    expectedRevision: null
  });
  const post = (key: string, payload = body) => fetch(`${base}/api/inspecciones/sync`, {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: payload
  });
  const first = await (await post("e2e-idem-001")).json();
  const replay = await (await post("e2e-idem-001")).json();
  assert.deepEqual(replay, first);
  const stale = await post("e2e-idem-002");
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).current.revision, 1);
  assert.equal((await fetch(`${base}/api/inspecciones/sync`, { method: "POST", body })).status, 400);
});
