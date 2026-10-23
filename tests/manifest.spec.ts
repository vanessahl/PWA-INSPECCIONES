import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pages = {
  "page.tsx": await readFile(resolve(root, "src/app/page.tsx"), "utf8"),
  "inspecciones/page.tsx": await readFile(resolve(root, "src/app/inspecciones/page.tsx"), "utf8"),
  "inspecciones/[id]/page.tsx": await readFile(resolve(root, "src/app/inspecciones/[id]/page.tsx"), "utf8")
};
const manifest = JSON.parse(await readFile(resolve(root, "public/manifest.webmanifest"), "utf8"));
const layout = await readFile(resolve(root, "src/app/layout.tsx"), "utf8");
const shell = await readFile(resolve(root, "src/components/app-shell.tsx"), "utf8");
const page = await readFile(resolve(root, "src/app/page.tsx"), "utf8");

assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.lang, "es-MX");
assert.ok(manifest.name && manifest.short_name && manifest.short_name.length <= 12);
assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
assert.ok(sizes.includes("192x192") && sizes.includes("512x512"), "iconos 192 y 512");
for (const icon of manifest.icons as Array<{ src: string; type: string }>) {
  assert.ok(icon.src.startsWith("/") && icon.type, `icono con ruta y tipo: ${icon.src}`);
  assert.ok(existsSync(resolve(root, "public", icon.src.slice(1))), `existe el archivo ${icon.src}`);
}
assert.match(layout, /manifest:\s*["']\/manifest\.webmanifest/);
assert.match(layout, /themeColor/);
assert.match(shell, /aria-label="Navegación principal"/);
assert.match(shell, /href="#contenido"/, "enlace para saltar al contenido");
assert.match(shell, /<footer/);
for (const [name, source] of Object.entries(pages)) {
  assert.match(source, /<main[^>]*id="contenido"/, `${name} expone el landmark main con id`);
}
assert.match(page, /Cargando inspecciones/);
assert.match(page, /No pudimos cargar las inspecciones/);
assert.match(page, /No hay inspecciones/);
console.log("manifest.spec.ts: PASS");
