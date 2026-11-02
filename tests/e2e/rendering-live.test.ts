import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { startServer, type TestServer } from "../helpers/server.ts";

const RUNS = 10;
const MAX_MEDIAN_MS = 2000;
let server: TestServer;

before(async () => { server = await startServer(3108); });
after(() => { server?.stop(); });

async function measure(path: string) {
  const ttfb: number[] = [];
  const total: number[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const start = performance.now();
    const response = await fetch(`${server.base}${path}`);
    ttfb.push(performance.now() - start);
    await response.arrayBuffer();
    total.push(performance.now() - start);
  }
  return { path, ttfb, total };
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (value: number) => Math.round(value * 10) / 10;
const get = async (path: string) => {
  const response = await fetch(`${server.base}${path}`);
  return { status: response.status, html: await response.text() };
};

test("CSR: el HTML inicial del listado trae el estado de carga y no los datos", async () => {
  const { status, html } = await get("/inspecciones");
  assert.equal(status, 200);
  assert.match(html, /Cargando inspecciones/);
  assert.doesNotMatch(html, /Laboratorio de Redes/, "los registros se pintan en el navegador");
});

test("SSR: el HTML inicial del detalle ya contiene los datos", async () => {
  const { status, html } = await get("/inspecciones/inspection-001");
  assert.equal(status, 200);
  assert.match(html, /Laboratorio de Redes/);
  assert.match(html, /renderizado en servidor/);
});

test("detalle inexistente: no muestra datos de otro registro y expone el aviso accesible", async () => {
  const { html } = await get("/inspecciones/id-inexistente");
  assert.match(html, /Inspección no encontrada/);
  assert.doesNotMatch(html, /Laboratorio de Redes/);
});

test("hydration: dos respuestas del servidor son idénticas (sin fecha ni aleatorios en el render)", async () => {
  for (const path of ["/inspecciones", "/inspecciones/inspection-002"]) {
    const [first, second] = [await get(path), await get(path)];
    assert.equal(first.html, second.html, path);
  }
});

test("métrica de carga repetible: TTFB y tiempo total, CSR frente a SSR", async () => {
  const csr = await measure("/inspecciones");
  const ssr = await measure("/inspecciones/inspection-001");
  const report = {
    generatedAt: new Date().toISOString(),
    runs: RUNS,
    note: "Servidor local `next start`; compara rutas, no equivale a una medición en red real.",
    routes: [csr, ssr].map((item) => ({
      path: item.path,
      medianTtfbMs: round(median(item.ttfb)),
      medianTotalMs: round(median(item.total))
    }))
  };
  const out = resolve(import.meta.dirname, "../../reports/rendering-metrics.json");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.routes));
  for (const route of report.routes) {
    assert.ok(route.medianTotalMs < MAX_MEDIAN_MS, `${route.path}: ${route.medianTotalMs} ms`);
  }
});
