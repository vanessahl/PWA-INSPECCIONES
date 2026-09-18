import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const worker = await readFile(resolve(root, "public/sw.js"), "utf8");
const registration = await readFile(
  resolve(root, "src/lib/pwa/register-service-worker.ts"),
  "utf8"
);

assert.match(worker, /addEventListener\(["']install["']/);
assert.match(worker, /addEventListener\(["']activate["']/);
assert.match(worker, /addEventListener\(["']fetch["']/);
assert.match(worker, /inspecciones-shell-v1/);
assert.match(worker, /SKIP_WAITING/);
assert.match(registration, /navigator\.serviceWorker\.register\(["']\/sw\.js["']/);
console.log("service-worker.spec.ts: PASS");