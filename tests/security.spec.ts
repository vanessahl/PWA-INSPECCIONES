import assert from "node:assert/strict";
import { test } from "node:test";
import { getSecurityHeaders } from "../src/lib/security/headers.mjs";
import {
  isValidIdempotencyKey,
  MAX_SYNC_BODY_BYTES,
  readBoundedJson,
  validateSyncPayload
} from "../src/lib/security/request.ts";
import { POST } from "../src/app/api/inspecciones/sync/route.ts";
import { syncRequest, syntheticInspection } from "./helpers/fixtures.ts";

function validPayload(id: string) {
  return {
    inspection: syntheticInspection({ id }),
    updatedAt: "2026-10-20T10:00:00.000Z",
    expectedRevision: null
  };
}

test("encabezados limitan recursos y permisos, con endurecimiento adicional en producción", () => {
  const development = new Map(getSecurityHeaders(false).map(({ key, value }) => [key, value]));
  const production = new Map(getSecurityHeaders(true).map(({ key, value }) => [key, value]));

  assert.match(production.get("Content-Security-Policy") ?? "", /default-src 'self'/);
  assert.match(production.get("Content-Security-Policy") ?? "", /object-src 'none'/);
  assert.match(production.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.doesNotMatch(production.get("Content-Security-Policy") ?? "", /unsafe-eval/);
  assert.match(development.get("Content-Security-Policy") ?? "", /ws: wss:/);
  assert.match(development.get("Content-Security-Policy") ?? "", /unsafe-eval/);
  assert.equal(production.get("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(development.has("Strict-Transport-Security"), false);
  assert.equal(production.get("X-Content-Type-Options"), "nosniff");
  assert.match(production.get("Permissions-Policy") ?? "", /camera=\(self\)/);
  assert.match(production.get("Permissions-Policy") ?? "", /microphone=\(\)/);
});

test("parser de JSON acepta cuerpos válidos y limita bytes incluso sin Content-Length", async () => {
  const valid = await readBoundedJson(new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(validPayload("security-valid"))
  }));
  assert.equal(valid.ok, true);

  const oversized = await readBoundedJson(new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ value: "x".repeat(MAX_SYNC_BODY_BYTES) })
  }));
  assert.deepEqual(oversized, { ok: false, reason: "too-large" });

  const malformed = await readBoundedJson(new Request("http://localhost", {
    method: "POST",
    body: "{invalid"
  }));
  assert.deepEqual(malformed, { ok: false, reason: "invalid-json" });
});

test("valida estrictamente el contrato de sincronización y limita textos y revisiones", () => {
  const payload = validPayload("security-schema");
  assert.deepEqual(validateSyncPayload(payload), payload);
  assert.equal(validateSyncPayload({ ...payload, extra: "unexpected" }), null);
  assert.equal(validateSyncPayload({
    ...payload,
    inspection: { ...payload.inspection, unexpected: "unexpected" }
  }), null);
  assert.equal(validateSyncPayload({ ...payload, updatedAt: "invalid" }), null);
  assert.equal(validateSyncPayload({ ...payload, expectedRevision: Number.MAX_SAFE_INTEGER + 1 }), null);
  assert.equal(validateSyncPayload({
    ...payload,
    inspection: syntheticInspection({ location: "x".repeat(101) })
  }), null);
  assert.equal(validateSyncPayload({
    ...payload,
    inspection: syntheticInspection({ summary: "x".repeat(501) })
  }), null);
  assert.equal(validateSyncPayload({
    ...payload,
    inspection: syntheticInspection({ summary: "línea\nválida\u0000inválida" })
  }), null);
  assert.equal(validateSyncPayload({
    ...payload,
    inspection: syntheticInspection({ findings: 1001 })
  }), null);
});

test("claves idempotentes solo aceptan caracteres acotados del contrato", () => {
  assert.equal(isValidIdempotencyKey("synthetic.id:revision-2"), true);
  assert.equal(isValidIdempotencyKey(""), false);
  assert.equal(isValidIdempotencyKey("not a valid key"), false);
  assert.equal(isValidIdempotencyKey("x".repeat(257)), false);
});

test("endpoint rechaza cuerpo excesivo y no cachea respuestas de sincronización", async () => {
  const oversizedRequest = syncRequest(
    { inspection: syntheticInspection({ summary: "x".repeat(MAX_SYNC_BODY_BYTES) }), updatedAt: "2026-10-20", expectedRevision: null },
    "security-oversized"
  );
  const oversizedResponse = await POST(oversizedRequest);
  assert.equal(oversizedResponse.status, 413);
  assert.equal(oversizedResponse.headers.get("cache-control"), "no-store");

  const validResponse = await POST(syncRequest(validPayload("security-no-store"), "security-no-store"));
  assert.equal(validResponse.status, 200);
  assert.equal(validResponse.headers.get("cache-control"), "no-store");
});
