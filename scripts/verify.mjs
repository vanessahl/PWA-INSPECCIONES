import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "package.json",
  "package-lock.json",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/components/app-shell.tsx",
  "src/app/globals.css",
  "src/lib/data/inspections.ts",
  "public/manifest.webmanifest",
  "public/sw.js",
  "src/lib/pwa/register-service-worker.ts",
  "docs/requirements.md",
  "docs/decision-record.md",
  "docs/cache-strategy.md",
  "tests/starter.spec.mjs",
  "tests/manifest.spec.ts",
  "tests/service-worker.spec.ts",
  "tests/offline.spec.ts",
  "evidence/individual.md"
];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
const worker = existsSync(resolve(root, "public/sw.js"))
  ? readFileSync(resolve(root, "public/sw.js"), "utf8")
  : "";
const registration = existsSync(resolve(root, "src/lib/pwa/register-service-worker.ts"))
  ? readFileSync(resolve(root, "src/lib/pwa/register-service-worker.ts"), "utf8")
  : "";

const checks = {
  serviceWorkerEvents: ["install", "activate", "fetch"].every((event) =>
    new RegExp(`addEventListener\\(["']${event}["']`).test(worker)
  ),
  serviceWorkerRegistration: /navigator\.serviceWorker\.register\(["']\/sw\.js["']/.test(registration),
  offlineNavigationFallback:
    /event\.request\.mode === "navigate"/.test(worker) &&
    /caches\.match\("\/"\)/.test(worker),
  cacheVersioning: /const CACHE_NAME = ["']inspecciones-shell-v\d+["']/.test(worker)
};
const failedChecks = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);
const result = {
  schemaVersion: 2,
  checkedAt: new Date().toISOString(),
  status: missing.length === 0 && failedChecks.length === 0 ? "pass" : "fail",
  missing,
  checks,
  failedChecks
};

const report = resolve(root, "reports/verification.json");
mkdirSync(dirname(report), { recursive: true });
writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`);

if (missing.length > 0 || failedChecks.length > 0) {
  if (missing.length > 0) {
    console.error(`Faltan ${missing.length} artefactos: ${missing.join(", ")}`);
  }
  if (failedChecks.length > 0) {
    console.error(`Fallaron ${failedChecks.length} comprobaciones: ${failedChecks.join(", ")}`);
  }
  process.exit(1);
}

console.log("Verificación de PWA: PASS");
console.log(`Reporte: ${report}`);

