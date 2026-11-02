import type { InspectionRecord } from "../../src/lib/storage/schema.ts";

export function syntheticInspection(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
  return {
    id: "synthetic-w08-001",
    location: "Laboratorio de Prueba",
    date: "2026-10-20",
    inspector: "Técnica Sintética",
    status: "attention",
    statusLabel: "Requiere atención",
    findings: 1,
    summary: "Observación sintética para pruebas de la semana 8.",
    ...overrides
  };
}

export function syncRequest(
  body: unknown,
  idempotencyKey: string | null,
  url = "http://localhost/api/inspecciones/sync"
): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (idempotencyKey !== null) headers["idempotency-key"] = idempotencyKey;
  return new Request(url, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}
