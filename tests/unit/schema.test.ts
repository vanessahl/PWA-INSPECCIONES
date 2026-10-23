import assert from "node:assert/strict";
import { test } from "node:test";
import { isInspectionRecord } from "../../src/lib/storage/schema.ts";
import { syntheticInspection } from "../helpers/fixtures.ts";

test("acepta una inspección sintética válida", () => {
  assert.equal(isInspectionRecord(syntheticInspection()), true);
  assert.equal(isInspectionRecord(syntheticInspection({ status: "ok", findings: 0 })), true);
});

test("rechaza valores que no son objetos", () => {
  for (const value of [null, undefined, "texto", 42]) {
    assert.equal(isInspectionRecord(value), false);
  }
});

test("rechaza campos obligatorios vacíos o ausentes", () => {
  for (const field of ["id", "location", "inspector", "statusLabel", "summary"] as const) {
    assert.equal(isInspectionRecord(syntheticInspection({ [field]: "   " })), false, field);
  }
  const { id: _id, ...withoutId } = syntheticInspection();
  assert.equal(isInspectionRecord(withoutId), false);
});

test("rechaza hallazgos no enteros o negativos", () => {
  assert.equal(isInspectionRecord(syntheticInspection({ findings: -1 })), false);
  assert.equal(isInspectionRecord(syntheticInspection({ findings: 1.5 })), false);
  assert.equal(isInspectionRecord({ ...syntheticInspection(), findings: "2" }), false);
});

test("rechaza estado o fecha inválidos", () => {
  assert.equal(isInspectionRecord({ ...syntheticInspection(), status: "unknown" }), false);
  assert.equal(isInspectionRecord(syntheticInspection({ date: "ayer" })), false);
});
