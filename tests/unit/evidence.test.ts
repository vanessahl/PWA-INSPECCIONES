
import assert from "node:assert/strict";
import test from "node:test";
import { validateEvidenceFile } from "../../src/lib/device/camera";

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

function createFile(
  name: string,
  type: string,
  size: number
): File {
  return new File([new Uint8Array(size)], name, { type });
}

test("acepta imágenes JPEG, PNG y WebP válidas", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const file = createFile("evidencia", type, 100);

    const result = validateEvidenceFile(file);

    assert.ok(result);
    assert.equal(result.name, "evidencia");
    assert.equal(result.type, type);
    assert.equal(result.size, 100);
    assert.equal(result.file, file);
  }
});

test("rechaza archivos que no son imágenes permitidas", () => {
  const file = createFile("documento.pdf", "application/pdf", 100);

  assert.equal(validateEvidenceFile(file), null);
});

test("rechaza archivos vacíos", () => {
  const file = createFile("vacia.png", "image/png", 0);

  assert.equal(validateEvidenceFile(file), null);
});

test("rechaza imágenes mayores de 5 MiB", () => {
  const file = createFile(
    "grande.png",
    "image/png",
    MAX_EVIDENCE_BYTES + 1
  );

  assert.equal(validateEvidenceFile(file), null);
});

test("acepta una imagen que mide exactamente 5 MiB", () => {
  const file = createFile(
    "limite.png",
    "image/png",
    MAX_EVIDENCE_BYTES
  );

  const result = validateEvidenceFile(file);

  assert.ok(result);
  assert.equal(result.size, MAX_EVIDENCE_BYTES);
});
