import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

export const ORIGIN = "https://lab.example.test";
export const CACHE_NAME = "inspecciones-shell-v2";
const root = resolve(import.meta.dirname, "../..");

type Handler = (event: any) => void;
type FetchImpl = (request: Request) => Promise<Response>;

class FakeCache {
  entries = new Map<string, Response>();
  static key(input: Request | string) {
    return new URL(typeof input === "string" ? input : input.url, ORIGIN).href;
  }
  async match(input: Request | string) {
    return this.entries.get(FakeCache.key(input))?.clone();
  }
  async put(input: Request | string, response: Response) {
    this.entries.set(FakeCache.key(input), response);
  }
}

export function createServiceWorkerEnv(fetchImpl: FetchImpl) {
  const stores = new Map<string, FakeCache>();
  const handlers = new Map<string, Handler>();
  const errors: unknown[][] = [];
  const calls = { skipWaiting: 0, claim: 0, fetch: [] as string[] };

  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new FakeCache());
      const cache = stores.get(name)!;
      return Object.assign(cache, {
        // Como la API real, addAll es atómico: si algo falla no guarda nada.
        async addAll(urls: string[]) {
          const responses = await Promise.all(urls.map(async (url) => {
            const response = await fetchImpl(new Request(new URL(url, ORIGIN)));
            if (!response.ok) throw new TypeError(`addAll falló para ${url}: ${response.status}`);
            return [url, response] as const;
          }));
          for (const [url, response] of responses) await cache.put(url, response);
        }
      });
    },
    async match(input: Request | string) {
      for (const cache of stores.values()) {
        const hit = await cache.match(input);
        if (hit) return hit;
      }
      return undefined;
    },
    async keys() { return [...stores.keys()]; },
    async delete(name: string) { return stores.delete(name); }
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: () => { calls.skipWaiting += 1; },
    clients: { claim: async () => { calls.claim += 1; } }
  };

  const context = vm.createContext({
    self, caches, URL, Promise, Response, Request,
    fetch: (request: Request) => { calls.fetch.push(request.url); return fetchImpl(request); },
    console: { error: (...args: unknown[]) => errors.push(args) }
  });
  vm.runInContext(readFileSync(resolve(root, "public/sw.js"), "utf8"), context, { filename: "sw.js" });

  async function dispatchLifecycle(type: string, extra: object = {}) {
    const waits: Promise<unknown>[] = [];
    handlers.get(type)!({ ...extra, waitUntil: (promise: Promise<unknown>) => waits.push(promise) });
    await Promise.all(waits);
  }

  async function request(
    path: string,
    init: { method?: string; mode?: RequestMode; origin?: string } = {}
  ) {
    const url = new URL(path, init.origin ?? ORIGIN);
    const req = new Request(url, { method: init.method ?? "GET" });
    // Request no permite construir mode "navigate"; se simula como lo hace el navegador.
    const fakeRequest = Object.create(req, { mode: { value: init.mode ?? "cors" } }) as Request;
    let responded: Promise<Response> | undefined;
    const waits: Promise<unknown>[] = [];
    handlers.get("fetch")!({
      request: fakeRequest,
      respondWith: (promise: Promise<Response>) => { responded = promise; },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise)
    });
    return {
      intercepted: responded !== undefined,
      response: responded,
      settle: () => Promise.all(waits)
    };
  }

  return {
    stores, errors, calls, request,
    seed: async (name: string, path: string, response: Response) => {
      if (!stores.has(name)) stores.set(name, new FakeCache());
      await stores.get(name)!.put(path, response);
    },
    install: () => dispatchLifecycle("install"),
    activate: () => dispatchLifecycle("activate"),
    message: (data: unknown) => dispatchLifecycle("message", { data }),
    cached: (path: string, cacheName = CACHE_NAME) => stores.get(cacheName)?.match(path)
  };
}

export const html = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers });

export const shellFetch: FetchImpl = async (request) => {
  const { pathname } = new URL(request.url);
  if (pathname === "/offline.html") return html("OFFLINE PAGE");
  return html(`shell:${pathname}`);
};
