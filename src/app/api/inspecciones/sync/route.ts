import { inspections } from "../../../../lib/data/inspections.ts";
import {
  isInspectionRecord,
  type InspectionRecord,
  type VersionedInspection
} from "../../../../lib/storage/schema.ts";

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
  if (!idempotencyKey || idempotencyKey.length > 256) {
    return Response.json({ message: "Falta una clave idempotente válida." }, { status: 400 });
  }

  const payload: unknown = await request.json().catch(() => null);
  if (typeof payload !== "object" || payload === null) {
    return Response.json({ message: "El cuerpo de sincronización no es válido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const inspection: unknown = body.inspection;
  const updatedAt = body.updatedAt;
  const expectedRevision = body.expectedRevision;
  if (
    !isInspectionRecord(inspection) ||
    typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt)) ||
    !(expectedRevision === null || (Number.isInteger(expectedRevision) && (expectedRevision as number) >= 0))
  ) {
    return Response.json({ message: "La inspección o su revisión no cumplen el esquema." }, { status: 400 });
  }

  const previousResult = idempotentResults.get(idempotencyKey);
  if (previousResult) {
    return Response.json({
      kind: "synced",
      revision: previousResult.revision,
      inspection: previousResult.inspection,
      updatedAt: previousResult.updatedAt
    });
  }

  const current = remoteRecords.get(inspection.id);
  if (current && expectedRevision !== current.revision) {
    return Response.json({ kind: "conflict", current }, { status: 409 });
  }
  if (!current && expectedRevision !== null) {
    return Response.json({ message: "La revisión remota ya no existe." }, { status: 409 });
  }

  const synced: VersionedInspection = {
    inspection: inspection as InspectionRecord,
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
  });
}