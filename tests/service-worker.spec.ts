import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CACHE_NAME, createServiceWorkerEnv, html, shellFetch
} from "./helpers/sw-harness.ts";

test("install: precarga el shell y la página offline sin saltar la espera", async () => {
  const env = createServiceWorkerEnv(shellFetch);
  await env.install();
  for (const path of ["/", "/offline.html", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"]) {
    assert.ok(await env.cached(path), `${path} precargado`);
  }
  assert.equal(env.calls.skipWaiting, 0, "install no debe forzar la activación");
});

test("install: si un recurso del shell falla, la instalación falla y se registra el error", async () => {
  const env = createServiceWorkerEnv(async (request) =>
    request.url.endsWith("/icon-512.svg") ? html("no", 404) : shellFetch(request));
  await assert.rejects(() => env.install());
  assert.equal(await env.cached("/"), undefined, "no queda una caché incompleta");
  assert.ok(env.errors.length > 0, "registra el error");
});

test("activate: borra versiones anteriores, conserva cachés ajenas y reclama clientes", async () => {
  const env = createServiceWorkerEnv(shellFetch);
  await env.install();
  await env.seed("inspecciones-shell-v1", "/viejo", html("viejo"));
  await env.seed("otra-app-v1", "/otro", html("otro"));
  await env.activate();
  assert.deepEqual([...env.stores.keys()].sort(), [CACHE_NAME, "otra-app-v1"].sort());
  assert.equal(env.calls.claim, 1, "clients.claim para controlar la primera carga");
});

test("message SKIP_WAITING activa la nueva versión solo bajo petición", async () => {
  const env = createServiceWorkerEnv(shellFetch);
  await env.message({ type: "OTRO" });
  await env.message(undefined);
  assert.equal(env.calls.skipWaiting, 0);
  await env.message({ type: "SKIP_WAITING" });
  assert.equal(env.calls.skipWaiting, 1);
});

test("message CLEAR_CACHE invalida solo las cachés de la aplicación", async () => {
  const env = createServiceWorkerEnv(shellFetch);
  await env.install();
  await env.seed("otra-app-v1", "/otro", html("otro"));
  await env.message({ type: "CLEAR_CACHE" });
  assert.deepEqual([...env.stores.keys()], ["otra-app-v1"]);
});

test("el registro usa /sw.js con scope / y no depende de la caché HTTP", async () => {
  const calls: unknown[][] = [];
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  Object.defineProperty(globalThis, "navigator", {
    value: { serviceWorker: { register: async (...args: unknown[]) => { calls.push(args); return { scope: "/" }; } } },
    configurable: true
  });
  try {
    const { registerServiceWorker } = await import("../src/lib/pwa/register-service-worker.ts");
    assert.deepEqual(await registerServiceWorker(), { scope: "/" });
    assert.deepEqual(calls[0], ["/sw.js", { scope: "/", updateViaCache: "none" }]);

    (globalThis.navigator as any).serviceWorker.register = async () => { throw new Error("falló"); };
    assert.equal(await registerServiceWorker(), undefined, "no rompe la app si falla");
    assert.equal(errors.length, 1, "registra el error");
  } finally {
    console.error = originalError;
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("applyServiceWorkerUpdate solo envía SKIP_WAITING si hay una versión en espera", async () => {
  const { applyServiceWorkerUpdate } = await import("../src/lib/pwa/register-service-worker.ts");
  const sent: unknown[] = [];
  assert.equal(applyServiceWorkerUpdate({ waiting: null } as unknown as ServiceWorkerRegistration), false);
  const registration = { waiting: { postMessage: (m: unknown) => sent.push(m) } };
  assert.equal(applyServiceWorkerUpdate(registration as unknown as ServiceWorkerRegistration), true);
  assert.deepEqual(sent, [{ type: "SKIP_WAITING" }]);
});
