import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  ".github/workflows/week-05-w05-sync-data.yml",
  "src/app/api/inspecciones/sync/route.ts",
  "package.json",
  "package-lock.json",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/components/app-shell.tsx",
  "src/components/loading-state.tsx",
  "src/app/inspecciones/page.tsx",
  "src/app/inspecciones/[id]/page.tsx",
  "src/app/inspecciones/[id]/loading.tsx",
  "src/app/globals.css",
  "src/lib/data/inspections.ts",
  "public/manifest.webmanifest",
  "public/sw.js",
  "src/lib/pwa/register-service-worker.ts",
  "docs/requirements.md",
  "docs/decision-record.md",
  "docs/cache-strategy.md",
  "docs/rendering-decision.md",
  "docs/sync-policy.md",
  "tests/starter.spec.mjs",
  "tests/manifest.spec.ts",
  "tests/service-worker.spec.ts",
  "tests/offline.spec.ts",
  "tests/rendering.spec.ts",
  "tests/sync.spec.ts",
  "src/lib/storage/schema.ts",
  "src/lib/sync/queue.ts",
  "src/lib/sync/conflict-policy.ts",
  "evidence/individual.md"
];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
const worker = existsSync(resolve(root, "public/sw.js"))
  ? readFileSync(resolve(root, "public/sw.js"), "utf8")
  : "";
const registration = existsSync(resolve(root, "src/lib/pwa/register-service-worker.ts"))
  ? readFileSync(resolve(root, "src/lib/pwa/register-service-worker.ts"), "utf8")
  : "";
const listPage = existsSync(resolve(root, "src/app/inspecciones/page.tsx"))
  ? readFileSync(resolve(root, "src/app/inspecciones/page.tsx"), "utf8")
  : "";
const detailPage = existsSync(resolve(root, "src/app/inspecciones/[id]/page.tsx"))
  ? readFileSync(resolve(root, "src/app/inspecciones/[id]/page.tsx"), "utf8")
  : "";
const syncQueue = existsSync(resolve(root, "src/lib/sync/queue.ts"))
  ? readFileSync(resolve(root, "src/lib/sync/queue.ts"), "utf8")
  : "";
const storageSchema = existsSync(resolve(root, "src/lib/storage/schema.ts"))
  ? readFileSync(resolve(root, "src/lib/storage/schema.ts"), "utf8")
  : "";
const conflictPolicy = existsSync(resolve(root, "src/lib/sync/conflict-policy.ts"))
  ? readFileSync(resolve(root, "src/lib/sync/conflict-policy.ts"), "utf8")
  : "";
const packageJson = existsSync(resolve(root, "package.json"))
  ? readFileSync(resolve(root, "package.json"), "utf8")
  : "";
const syncWorkflow = existsSync(resolve(root, ".github/workflows/week-05-w05-sync-data.yml"))
  ? readFileSync(resolve(root, ".github/workflows/week-05-w05-sync-data.yml"), "utf8")
  : "";
const inspectionPage = existsSync(resolve(root, "src/app/inspecciones/page.tsx"))
  ? readFileSync(resolve(root, "src/app/inspecciones/page.tsx"), "utf8")
  : "";
const syncEndpoint = existsSync(resolve(root, "src/app/api/inspecciones/sync/route.ts"))
  ? readFileSync(resolve(root, "src/app/api/inspecciones/sync/route.ts"), "utf8")
  : "";

const checks = {
  serviceWorkerEvents: ["install", "activate", "fetch"].every((event) =>
    new RegExp(`addEventListener\\(["']${event}["']`).test(worker)
  ),
  serviceWorkerRegistration: /navigator\.serviceWorker\.register\(["']\/sw\.js["']/.test(registration),
  offlineNavigationFallback:
    /event\.request\.mode === "navigate"/.test(worker) &&
    /caches\.match\("\/"\)/.test(worker),
  cacheVersioning: /const CACHE_NAME = ["']inspecciones-shell-v\d+["']/.test(worker),
  clientRenderedList: /^"use client";/.test(listPage) && /useEffect\(/.test(listPage),
  serverRenderedDetail: !/"use client"/.test(detailPage) && /inspections\.find\(/.test(detailPage),
  indexedDbOutbox: /indexedDB\.open/.test(storageSchema) && /OUTBOX_STORE/.test(storageSchema),
  idempotentRetryQueue: /enqueueInspection/.test(syncQueue) && /idempotencyKey/.test(syncQueue) && /nextAttemptAt/.test(syncQueue),
  conflictPolicy: /chooseConflictWinner/.test(conflictPolicy) && /localTime > remoteTime/.test(conflictPolicy),
  syncTestsRegistered: /tests\/sync\.spec\.ts/.test(packageJson),
  nodeVersionDeclared: JSON.parse(packageJson).engines?.node === ">=20",
  week5Workflow: /node-version:\s*20/.test(syncWorkflow) &&
    ["npm ci", "npm run build", "npm test", "npm run verify"].every((command) =>
      syncWorkflow.includes(command)
    ),
  offlineCaptureForm: /handleSubmit/.test(inspectionPage) && /enqueueInspection/.test(inspectionPage),
  httpSyncEndpoint: /createHttpSyncTransport/.test(inspectionPage) &&
    /idempotency-key/.test(syncEndpoint) && /status: 409/.test(syncEndpoint)
};
const failedChecks = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);
const result = {
  schemaVersion: 4,
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

