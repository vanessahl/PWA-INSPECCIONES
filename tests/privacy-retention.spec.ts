
import assert from "node:assert/strict";
import { test } from "node:test";
import "fake-indexeddb/auto";
import { IndexedDbSyncStore } from "../src/lib/storage/schema.ts";
import { syntheticInspection } from "./helpers/fixtures.ts";

test("elimina la inspección y su tarea pendiente de sincronización", async () => {
  const store = new IndexedDbSyncStore();
  const inspection = syntheticInspection({
    id: "privacy-delete-001"
  });

  await store.enqueueLocal(
    inspection,
    "2026-10-31T10:00:00.000Z",
    inspection.id
  );

  assert.equal((await store.listLocal()).length, 1);
  assert.equal((await store.listPending()).length, 1);

  await store.deleteLocal(inspection.id);

  assert.equal((await store.listLocal()).length, 0);
  assert.equal((await store.listPending()).length, 0);
});

test("conserva las demás inspecciones al eliminar una", async () => {
  const store = new IndexedDbSyncStore();

  const first = syntheticInspection({
    id: "privacy-delete-002"
  });

  const second = syntheticInspection({
    id: "privacy-keep-003"
  });

  await store.enqueueLocal(first, "2026-10-31T10:00:00.000Z", first.id);
  await store.enqueueLocal(second, "2026-10-31T10:00:00.000Z", second.id);

  await store.deleteLocal(first.id);

  const remaining = await store.listLocal();
  const pending = await store.listPending();

  assert.deepEqual(
    remaining.map((record) => record.inspection.id),
    [second.id]
  );

  assert.deepEqual(
    pending.map((entry) => entry.id),
    [second.id]
  );
});

test("eliminar una inspección inexistente no afecta los demás registros", async () => {
  const store = new IndexedDbSyncStore();

  const inspection = syntheticInspection({
    id: "privacy-keep-004"
  });

  await store.enqueueLocal(
    inspection,
    "2026-10-31T10:00:00.000Z",
    inspection.id
  );

  const beforeLocal = await store.listLocal();
  const beforePending = await store.listPending();

  await store.deleteLocal("privacy-inexistent-005");

  const afterLocal = await store.listLocal();
  const afterPending = await store.listPending();

  assert.deepEqual(afterLocal, beforeLocal);
  assert.deepEqual(afterPending, beforePending);
});
