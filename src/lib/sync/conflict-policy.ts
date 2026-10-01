import type { VersionedInspection } from "../storage/schema.ts";

export type ConflictWinner = "local" | "remote";

export function chooseConflictWinner(
  local: Pick<VersionedInspection, "updatedAt">,
  remote: Pick<VersionedInspection, "updatedAt">
): ConflictWinner {
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) {
    throw new TypeError("Las fechas del conflicto deben ser válidas.");
  }
  return localTime > remoteTime ? "local" : "remote";
}