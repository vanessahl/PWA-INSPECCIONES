import { inspections } from "../../../../lib/data/inspections.ts";
import { type VersionedInspection } from "../../../../lib/storage/schema.ts";
import { isValidIdempotencyKey, readBoundedJson, validateSyncPayload } from "../../../../lib/security/request.ts";

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
    return Response.json({ message: "Falta una clave idempotente válida." }, {
      status: 400,
      headers: { "cache-control": "no-store" }
    });
  }

  const bodyResult = await readBoundedJson(request);
  if (!bodyResult.ok) {
    return Response.json(
      { message: bodyResult.reason === "too-large" ? "El cuerpo supera el límite permitido." : "El cuerpo de sincronización no es válido." },
      {
        status: bodyResult.reason === "too-large" ? 413 : 400,
        headers: { "cache-control": "no-store" }
      }
    );
  }

  const payload = validateSyncPayload(bodyResult.value);
  if (!payload) {
    return Response.json({ message: "La inspección o su revisión no cumplen el esquema." }, {
      status: 400,
      headers: { "cache-control": "no-store" }
    });
  }

  const { inspection, updatedAt, expectedRevision } = payload;
  const previousResult = idempotentResults.get(idempotencyKey);
  if (previousResult) {
    return Response.json({
      kind: "synced",
      revision: previousResult.revision,
      inspection: previousResult.inspection,
      updatedAt: previousResult.updatedAt
    }, {
      headers: { "cache-control": "no-store" }
    });
  }

  const current = remoteRecords.get(inspection.id);
  if (current && expectedRevision !== current.revision) {
    return Response.json({ kind: "conflict", current }, {
      status: 409,
      headers: { "cache-control": "no-store" }
    });
  }
  if (!current && expectedRevision !== null) {
    return Response.json({ message: "La revisión remota ya no existe." }, {
      status: 409,
      headers: { "cache-control": "no-store" }
    });
  }

  const synced: VersionedInspection = {
    inspection,
    updatedAt,
    revision: (current?.revision ?? 0) + 1
  };
  remoteRecords.set(inspection.id, synced);
  idempotentResults.set(idempotencyKey, synced);
  return Response.json({
    kind: "synced",
    revision: synced.revision,
    inspection: synced.inspection,
    updatedAt: synced.updatedAt
  }, {
    headers: { "cache-control": "no-store" }
  });
}