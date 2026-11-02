import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { startServer, type TestServer } from "../helpers/server.ts";

let browser: Browser;
let server: TestServer;

before(async () => {
  server = await startServer(3110);
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  server?.stop();
});

async function openInspectionsPage(): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  await page.goto(`${server.base}/inspecciones`);
  await page.getByRole("heading", { name: "Nueva inspección" }).waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await page.waitForFunction(async () => {
    const cache = await caches.open("inspecciones-shell-v2");
    return Boolean(await cache.match("/inspecciones"));
  });
  return { context, page };
}

async function fillSyntheticInspection(page: Page, location: string): Promise<void> {
  await page.getByLabel("Laboratorio").fill(location);
  await page.getByLabel("Fecha").fill("2026-10-25");
  await page.getByLabel("Resumen").fill("Inspección E2E sintética para validar el flujo crítico.");
}

test("UI: guarda offline, sobrevive recarga y sincroniza una sola inspección al reconectar", async () => {
  const { context, page } = await openInspectionsPage();
  const location = `Laboratorio E2E offline ${Date.now()}`;

  try {
    await page.getByText("Con conexión", { exact: true }).waitFor();
    await fillSyntheticInspection(page, location);
    await context.setOffline(true);
    await page.getByText("Sin conexión", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Guardar inspección" }).click();
    await page.getByText("Inspección guardada en este dispositivo; pendiente de conexión.", { exact: true }).waitFor();
    await page.getByText("Pendiente de sincronizar", { exact: true }).waitFor();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: location, exact: true }).waitFor();
    await page.getByText("Pendiente de sincronizar", { exact: true }).waitFor();

    await context.setOffline(false);
    await page.getByText("Sincronizada", { exact: true }).waitFor();
    assert.equal(await page.getByRole("heading", { name: location, exact: true }).count(), 1);
  } finally {
    await context.close();
  }
});

test("UI: permite completar la captura cuando se deniega la geolocalización", async () => {
  const { context, page } = await openInspectionsPage();
  const location = `Laboratorio E2E sin ubicación ${Date.now()}`;

  try {
    await page.evaluate(`() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
        configurable: true,
        value: function (_success, error) {
          if (error) error({ code: 1 });
        }
      });
    }`);
    await page.getByRole("button", { name: "Usar ubicación" }).click();
    await page.getByText("Se rechazó el permiso de ubicación; puedes guardar la inspección sin ella.", { exact: true }).waitFor();
    await fillSyntheticInspection(page, location);
    await page.getByRole("button", { name: "Guardar inspección" }).click();
    await page.locator(".sync-notice").filter({ hasText: "Inspección guardada y sincronizada." }).waitFor();
    assert.equal(await page.getByRole("heading", { name: location, exact: true }).count(), 1);
  } finally {
    await context.close();
  }
});
