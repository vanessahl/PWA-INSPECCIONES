import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const worker = await readFile(resolve(root, "public/sw.js"), "utf8");
const strategy = await readFile(resolve(root, "docs/cache-strategy.md"), "utf8");

assert.match(worker, /event\.request\.mode === "navigate"/);
assert.match(worker, /catch\(\(\) => caches\.match\(event\.request\)/);
assert.match(worker, /caches\.match\("\/"\)/);
assert.match(strategy, /Network first/i);
assert.match(strategy, /offline/i);
assert.match(strategy, /skipWaiting/i);
console.log("offline.spec.ts: PASS");