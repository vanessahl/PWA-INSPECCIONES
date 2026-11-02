import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "public/manifest.webmanifest"), "utf8"));
const layout = await readFile(resolve(root, "src/app/layout.tsx"), "utf8");
const shell = await readFile(resolve(root, "src/components/app-shell.tsx"), "utf8");
const page = await readFile(resolve(root, "src/app/page.tsx"), "utf8");

assert.equal(manifest.start_url, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.lang, "es-MX");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
assert.match(layout, /manifest:\s*["']\/manifest\.webmanifest/);
assert.match(shell, /aria-label="Navegación principal"/);
assert.match(page, /Cargando inspecciones/);
assert.match(page, /No pudimos cargar las inspecciones/);
assert.match(page, /No hay inspecciones/);
console.log("manifest.spec.ts: PASS");
