import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseConflictWinner } from "../../src/lib/sync/conflict-policy.ts";

test("gana el cambio local cuando es más reciente", () => {
  assert.equal(chooseConflictWinner(
    { updatedAt: "2026-10-20T12:00:00.000Z" },
    { updatedAt: "2026-10-20T11:00:00.000Z" }
  ), "local");
});

test("gana el servidor cuando es más reciente", () => {
  assert.equal(chooseConflictWinner(
    { updatedAt: "2026-10-20T10:00:00.000Z" },
    { updatedAt: "2026-10-20T11:00:00.000Z" }
  ), "remote");
});

test("el servidor gana en empate", () => {
  const same = { updatedAt: "2026-10-20T10:00:00.000Z" };
  assert.equal(chooseConflictWinner(same, same), "remote");
});

test("rechaza fechas inválidas", () => {
  assert.throws(() => chooseConflictWinner(
    { updatedAt: "no-es-fecha" }, { updatedAt: "2026-10-20T10:00:00.000Z" }
  ), TypeError);
  assert.throws(() => chooseConflictWinner(
    { updatedAt: "2026-10-20T10:00:00.000Z" }, { updatedAt: "" }
  ), TypeError);
});
