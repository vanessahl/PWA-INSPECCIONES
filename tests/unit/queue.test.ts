import assert from "node:assert/strict";
import { test } from "node:test";
import { createHttpSyncTransport, enqueueInspection } from "../../src/lib/sync/queue.ts";
import type { InspectionRecord, OutboxEntry, SyncStore } from "../../src/lib/storage/schema.ts";
import { syntheticInspection } from "../helpers/fixtures.ts";

const entry: OutboxEntry = {
  id: "synthetic-w08-001",
  idempotencyKey: "synthetic-w08-001",
  inspection: syntheticInspection(),
  updatedAt: "2026-10-20T10:00:00.000Z",
  attempts: 0,
  nextAttemptAt: 0,
  status: "in-flight",
  leaseUntil: 0
};

function recordingFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

test("enqueueInspection delega al store con ISO y clave idempotente igual al id", async () => {
  const seen: unknown[][] = [];
  const store = {
    enqueueLocal: async (...args: unknown[]) => { seen.push(args); return true; }
  } as unknown as SyncStore;
  const now = Date.parse("2026-10-20T10:00:00.000Z");
  assert.equal(await enqueueInspection(store, syntheticInspection(), now), true);
  assert.deepEqual(seen[0].slice(1), ["2026-10-20T10:00:00.000Z", "synthetic-w08-001"]);
});

test("enqueueInspection rechaza inspecciones y relojes inválidos sin tocar el store", async () => {
  const store = {
    enqueueLocal: async () => assert.fail("no debe llegar al store")
  } as unknown as SyncStore;
  await assert.rejects(() => enqueueInspection(store, { id: "x" } as InspectionRecord), TypeError);
  await assert.rejects(() => enqueueInspection(store, syntheticInspection(), Number.NaN), TypeError);
});

test("el transporte HTTP envía clave idempotente y revisión esperada", async () => {
  const { calls, fetcher } = recordingFetch(200, { kind: "synced", revision: 1 });
  const transport = createHttpSyncTransport("/sync", fetcher);
  const result = await transport({ ...entry, expectedRevision: 3 }, new AbortController().signal);
  assert.deepEqual(result, { kind: "synced", revision: 1 });
  assert.equal(calls[0].url, "/sync");
  assert.equal(calls[0].init.method, "POST");
  assert.equal((calls[0].init.headers as Record<string, string>)["idempotency-key"], entry.idempotencyKey);
  const body = JSON.parse(calls[0].init.body as string);
  assert.equal(body.expectedRevision, 3);
  assert.equal(body.inspection.id, entry.id);
});

test("el transporte HTTP usa expectedRevision null para registros nuevos", async () => {
  const { calls, fetcher } = recordingFetch(200, { kind: "synced", revision: 1 });
  await createHttpSyncTransport("/sync", fetcher)(entry, new AbortController().signal);
  assert.equal(JSON.parse(calls[0].init.body as string).expectedRevision, null);
});

test("el transporte HTTP devuelve el conflicto 409 y lanza en otros errores", async () => {
  const conflict = { kind: "conflict", current: { revision: 2 } };
  const ok409 = recordingFetch(409, conflict);
  assert.deepEqual(
    await createHttpSyncTransport("/sync", ok409.fetcher)(entry, new AbortController().signal),
    conflict
  );
  const fail = recordingFetch(500, { message: "error" });
  await assert.rejects(
    () => createHttpSyncTransport("/sync", fail.fetcher)(entry, new AbortController().signal),
    /no pudo sincronizar/
  );
});
