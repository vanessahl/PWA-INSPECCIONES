import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

export type TestServer = { base: string; stop: () => void };

// Arranca `next start` sobre el build existente y espera a que responda.
export async function startServer(defaultPort: number): Promise<TestServer> {
  assert.ok(existsSync(resolve(root, ".next/BUILD_ID")), "Ejecuta `npm run build` antes de las pruebas E2E.");
  const port = Number(process.env.E2E_PORT ?? defaultPort);
  const base = `http://127.0.0.1:${port}`;
  let output = "";
  const server: ChildProcess = spawn(
    process.execPath,
    [resolve(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port)],
    { cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"] }
  );
  server.stdout?.on("data", (chunk) => { output += chunk; });
  server.stderr?.on("data", (chunk) => { output += chunk; });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`El servidor terminó prematuramente:\n${output}`);
    try {
      if ((await fetch(`${base}/`)).ok) return { base, stop: () => { server.kill(); } };
    } catch { /* aún iniciando */ }
    await new Promise((done) => setTimeout(done, 500));
  }
  server.kill();
  throw new Error(`El servidor no arrancó a tiempo:\n${output}`);
}
