import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { syntheticInspection } from "../helpers/fixtures.ts";
import { startServer, type TestServer } from "../helpers/server.ts";

let server: TestServer;
let base = "";

before(async () => {
  server = await startServer(3109);
  base = server.base;
});

after(() => { server?.stop(); });

async function getHtml(path: string): Promise<string> {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  return response.text();
}

test("página principal: entrega el shell y la entrada a inspecciones", async () => {
  const html = await getHtml("/");
  assert.match(html, /Inspecciones de laboratorio/);
  assert.match(html, /href="\/inspecciones"/);
  assert.match(html, /manifest\.webmanifest/);
});

test("inspecciones y detalle: responden las rutas esperadas", async () => {
  const list = await getHtml("/inspecciones");
  assert.match(list, /Cargando inspecciones/);

  const detail = await getHtml("/inspecciones/inspection-002");
  assert.match(detail, /Laboratorio de Electrónica/);
  assert.match(detail, /Requiere atención/);
});

test("manifest: conserva el contrato instalable", async () => {
  const response = await fetch(`${base}/manifest.webmanifest`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/manifest\+json|application\/json/);
  const manifest = await response.json();
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
});

test("sincronización: valida, confirma idempotencia y reporta conflicto", async () => {
  const inspection = syntheticInspection({ id: "e2e-contract-001" });
  const body = JSON.stringify({
    inspection,
    updatedAt: "2026-10-25T10:00:00.000Z",
    expectedRevision: null
  });
  const headers = { "content-type": "application/json", "idempotency-key": "e2e-contract-key-001" };

  const firstResponse = await fetch(`${base}/api/inspecciones/sync`, { method: "POST", headers, body });
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json();
  assert.equal(first.kind, "synced");
  assert.equal(first.inspection.id, inspection.id);

  const replayResponse = await fetch(`${base}/api/inspecciones/sync`, { method: "POST", headers, body });
  assert.deepEqual(await replayResponse.json(), first, "la misma clave devuelve el resultado original");

  const conflictResponse = await fetch(`${base}/api/inspecciones/sync`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "e2e-contract-key-002" },
    body: JSON.stringify({ ...JSON.parse(body), expectedRevision: 0 })
  });
  assert.equal(conflictResponse.status, 409);
  assert.equal((await conflictResponse.json()).current.revision, 1);

  const invalidResponse = await fetch(`${base}/api/inspecciones/sync`, { method: "POST", body });
  assert.equal(invalidResponse.status, 400, "la clave idempotente es obligatoria");
});
