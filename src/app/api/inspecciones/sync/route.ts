import { inspections } from "../../../../lib/data/inspections.ts";
import type { VersionedInspection } from "../../../../lib/storage/schema.ts";
import {
  isValidIdempotencyKey,
  readBoundedJson,
  validateSyncPayload
} from "../../../../lib/security/request.ts";

const remoteRecords = new Map<string, VersionedInspection>(
  inspections.map((inspection) => [inspection.id, {
    inspection,
    updatedAt: `${inspection.date}T12:00:00.000Z`,
    revision: 1
  }])
);
const idempotentResults = new Map<string, VersionedInspection>();

export async function POST(request: Request): Promise<Response> {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return jsonResponse({ message: "Falta una clave idempotente válida." }, 400);
  }

  const parsed = await readBoundedJson(request);
  if (!parsed.ok) {
    const status = parsed.reason === "too-large" ? 413 : 400;
    return jsonResponse({ message: "El cuerpo de sincronización no es válido." }, status);
  }

  const payload = validateSyncPayload(parsed.value);
  if (!payload) {
    return jsonResponse({ message: "La inspección o su revisión no cumplen el esquema." }, 400);
  }

  const previousResult = idempotentResults.get(idempotencyKey);
  if (previousResult) {
    return jsonResponse({
      kind: "synced",
      revision: previousResult.revision,
      inspection: previousResult.inspection,
      updatedAt: previousResult.updatedAt
    });
  }

  const current = remoteRecords.get(payload.inspection.id);
  if (current && payload.expectedRevision !== current.revision) {
    return jsonResponse({ kind: "conflict", current }, 409);
  }
  if (!current && payload.expectedRevision !== null) {
    return jsonResponse({ message: "La revisión remota ya no existe." }, 409);
  }

  const synced: VersionedInspection = {
    inspection: payload.inspection,
    updatedAt: payload.updatedAt,
    revision: (current?.revision ?? 0) + 1
  };
  remoteRecords.set(payload.inspection.id, synced);
  idempotentResults.set(idempotencyKey, synced);
  return jsonResponse({
    kind: "synced",
    revision: synced.revision,
    inspection: synced.inspection,
    updatedAt: synced.updatedAt
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}