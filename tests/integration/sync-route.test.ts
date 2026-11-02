import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../../src/app/api/inspecciones/sync/route.ts";
import { syncRequest, syntheticInspection } from "../helpers/fixtures.ts";

const valid = (id: string, expectedRevision: number | null = null) => ({
  inspection: syntheticInspection({ id }),
  updatedAt: "2026-10-20T10:00:00.000Z",
  expectedRevision
});

test("400 sin clave idempotente o con clave demasiado larga", async () => {
  assert.equal((await POST(syncRequest(valid("route-no-key"), null))).status, 400);
  assert.equal((await POST(syncRequest(valid("route-long-key"), "k".repeat(257)))).status, 400);
});

test("400 con cuerpo no JSON, vacío o con esquema inválido", async () => {
  assert.equal((await POST(syncRequest("{no-json", "route-bad-json"))).status, 400);
  assert.equal((await POST(syncRequest("null", "route-null"))).status, 400);
  const badInspection = { ...valid("route-bad"), inspection: { id: "route-bad" } };
  assert.equal((await POST(syncRequest(badInspection, "route-bad-schema"))).status, 400);
  const badDate = { ...valid("route-bad-date"), updatedAt: "nunca" };
  assert.equal((await POST(syncRequest(badDate, "route-bad-date"))).status, 400);
  const badRevision = valid("route-bad-rev", -1);
  assert.equal((await POST(syncRequest(badRevision, "route-bad-rev"))).status, 400);
});

test("crea una inspección nueva con revisión 1", async () => {
  const response = await POST(syncRequest(valid("route-new"), "route-new"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.kind, "synced");
  assert.equal(body.revision, 1);
  assert.equal(body.inspection.id, "route-new");
});

test("reintentar con la misma clave idempotente no duplica ni incrementa revisión", async () => {
  const first = await (await POST(syncRequest(valid("route-idem"), "route-idem"))).json();
  const replay = await POST(syncRequest(valid("route-idem"), "route-idem"));
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), first);
});

test("409 con la versión actual cuando la revisión esperada es obsoleta", async () => {
  const response = await POST(syncRequest(valid("inspection-001", 99), "route-stale"));
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.kind, "conflict");
  assert.equal(body.current.revision, 1);
  assert.equal(body.current.inspection.id, "inspection-001");
});

test("409 si se espera una revisión de un registro remoto inexistente", async () => {
  const response = await POST(syncRequest(valid("route-ghost", 2), "route-ghost"));
  assert.equal(response.status, 409);
});

test("actualiza con la revisión correcta e incrementa la revisión", async () => {
  await POST(syncRequest(valid("route-update"), "route-update-1"));
  const response = await POST(syncRequest(valid("route-update", 1), "route-update-2"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revision, 2);
});
