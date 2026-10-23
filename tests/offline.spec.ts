import assert from "node:assert/strict";
import { test } from "node:test";
import { createServiceWorkerEnv, html, shellFetch } from "./helpers/sw-harness.ts";

type Online = { online: boolean; overrides: Record<string, () => Response> };

function envWithNetwork() {
  const network: Online = { online: true, overrides: {} };
  const env = createServiceWorkerEnv(async (request) => {
    if (!network.online) throw new TypeError("sin red");
    const { pathname } = new URL(request.url);
    return network.overrides[pathname]?.() ?? shellFetch(request);
  });
  return { env, network };
}

async function text(result: Awaited<ReturnType<ReturnType<typeof createServiceWorkerEnv>["request"]>>) {
  const response = await result.response!;
  await result.settle();
  return { status: response.status, body: await response.text() };
}

test("navegación online: Network First y guarda una copia", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.overrides["/inspecciones"] = () => html("lista fresca");
  const nav = await env.request("/inspecciones", { mode: "navigate" });
  assert.deepEqual(await text(nav), { status: 200, body: "lista fresca" });
  assert.equal(await (await env.cached("/inspecciones"))!.text(), "lista fresca");
});

test("navegación offline: sirve la última copia de una ruta ya visitada", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.overrides["/inspecciones"] = () => html("lista visitada");
  await text(await env.request("/inspecciones", { mode: "navigate" }));
  network.online = false;
  const nav = await env.request("/inspecciones", { mode: "navigate" });
  assert.deepEqual(await text(nav), { status: 200, body: "lista visitada" });
});

test("navegación offline a una ruta nunca visitada: muestra la página offline", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.online = false;
  const nav = await env.request("/inspecciones/nunca-visitada", { mode: "navigate" });
  assert.deepEqual(await text(nav), { status: 200, body: "OFFLINE PAGE" });
});

test("no cachea respuestas de error: un 500 nunca se sirve después offline", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.overrides["/inspecciones/roto"] = () => html("error del servidor", 500);
  const online = await env.request("/inspecciones/roto", { mode: "navigate" });
  assert.equal((await text(online)).status, 500, "el usuario ve el error real estando online");
  assert.equal(await env.cached("/inspecciones/roto"), undefined);
  network.online = false;
  const offline = await env.request("/inspecciones/roto", { mode: "navigate" });
  assert.equal((await text(offline)).body, "OFFLINE PAGE");
});

test("no intercepta POST, orígenes externos, /api/ ni /sw.js", async () => {
  const { env } = envWithNetwork();
  await env.install();
  assert.equal((await env.request("/api/inspecciones/sync", { method: "POST" })).intercepted, false);
  assert.equal((await env.request("/api/inspecciones/sync")).intercepted, false, "GET de la API");
  assert.equal((await env.request("/sw.js")).intercepted, false);
  assert.equal((await env.request("/x.js", { origin: "https://cdn.example.test" })).intercepted, false);
});

test("los archivos /_next/static usan Cache First: la segunda lectura no usa la red", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.overrides["/_next/static/app.abc123.js"] = () => html("console.log(1)");
  await text(await env.request("/_next/static/app.abc123.js"));
  const before = env.calls.fetch.length;
  const again = await env.request("/_next/static/app.abc123.js");
  assert.equal((await text(again)).body, "console.log(1)");
  assert.equal(env.calls.fetch.length, before, "servido desde caché");
});

test("otros recursos GET son Network First: se actualizan cuando hay red", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.overrides["/manifest.webmanifest"] = () => html("manifest nuevo");
  assert.equal((await text(await env.request("/manifest.webmanifest"))).body, "manifest nuevo");
  network.online = false;
  assert.equal((await text(await env.request("/manifest.webmanifest"))).body, "manifest nuevo");
});

test("no guarda recursos con Cache-Control no-store/private", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.overrides["/datos.json"] = () => html("{}", 200, { "cache-control": "private, no-store" });
  await text(await env.request("/datos.json"));
  assert.equal(await env.cached("/datos.json"), undefined);
});

test("sin red ni caché para un recurso: falla y registra el error", async () => {
  const { env, network } = envWithNetwork();
  await env.install();
  network.online = false;
  const result = await env.request("/_next/static/nunca.js");
  await assert.rejects(async () => result.response);
  assert.ok(env.errors.length > 0);
});
