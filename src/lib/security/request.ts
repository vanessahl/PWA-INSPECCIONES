import { isInspectionRecord, type InspectionRecord } from "../storage/schema.ts";

export const MAX_SYNC_BODY_BYTES = 16 * 1024;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 256;

export type JsonRequestResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "too-large" | "invalid-json" | "unreadable" };

export type SyncPayload = {
  inspection: InspectionRecord;
  updatedAt: string;
  expectedRevision: number | null;
};

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 40 &&
    !/[\u0000-\u001F\u007F-\u009F]/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export async function readBoundedJson(
  request: Request,
  maxBytes = MAX_SYNC_BODY_BYTES
): Promise<JsonRequestResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return { ok: false, reason: "invalid-json" };
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes) {
      return { ok: false, reason: "too-large" };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, reason: "invalid-json" };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

export function isValidIdempotencyKey(value: string | null): value is string {
  return value !== null &&
    value.length > 0 &&
    value.length <= MAX_IDEMPOTENCY_KEY_LENGTH &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

export function validateSyncPayload(value: unknown): SyncPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload);
  const expectedRevision = payload.expectedRevision;
  const validExpectedRevision = expectedRevision === null
    ? null
    : typeof expectedRevision === "number" &&
        Number.isSafeInteger(expectedRevision) &&
        expectedRevision >= 0
      ? expectedRevision
      : undefined;
  if (
    keys.length !== 3 ||
    !keys.includes("inspection") ||
    !keys.includes("updatedAt") ||
    !keys.includes("expectedRevision")
  ) {
    return null;
  }

  if (
    !isInspectionRecord(payload.inspection) ||
    !isValidTimestamp(payload.updatedAt) ||
    validExpectedRevision === undefined
  ) {
    return null;
  }

  return {
    inspection: payload.inspection,
    updatedAt: payload.updatedAt,
    expectedRevision: validExpectedRevision
  };
}
