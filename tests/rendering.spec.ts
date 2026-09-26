import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const listPage = await readFile(resolve(root, "src/app/inspecciones/page.tsx"), "utf8");
const detailPage = await readFile(
  resolve(root, "src/app/inspecciones/[id]/page.tsx"),
  "utf8"
);
const detailLoading = await readFile(
  resolve(root, "src/app/inspecciones/[id]/loading.tsx"),
  "utf8"
);
const loadingState = await readFile(resolve(root, "src/components/loading-state.tsx"), "utf8");

assert.match(listPage, /^"use client";/);
assert.match(listPage, /useEffect\(/);
assert.match(listPage, /status: "loading"/);
assert.match(listPage, /LoadingState/);
assert.match(listPage, /No pudimos cargar las inspecciones/);
assert.match(listPage, /estado.*error|error.*estado/s);
assert.match(listPage, /estado.*vacio|vacio.*estado/s);
assert.match(listPage, /href=\{`\/inspecciones\/\$\{inspection\.id\}`\}/);
assert.doesNotMatch(detailPage, /"use client"/);
assert.match(detailPage, /params: \{ id: string \}/);
assert.match(detailPage, /inspections\.find\(/);
assert.match(detailPage, /role="alert"/);
assert.match(detailPage, /Inspección no encontrada/);
assert.match(detailLoading, /LoadingState/);
assert.match(loadingState, /role="status"/);
assert.match(loadingState, /aria-live="polite"/);
console.log("rendering.spec.ts: PASS");