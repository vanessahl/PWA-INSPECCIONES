"use client";

import { useEffect } from "react";

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return undefined;

  try {
    return await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none"
    });
  } catch (error) {
    console.error("No se pudo registrar el service worker", error);
    return undefined;
  }
}

export function registerWhenLoaded(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (document.readyState === "complete") {
    void registerServiceWorker();
  } else {
    window.addEventListener("load", () => void registerServiceWorker(), { once: true });
  }
}

// Activa una versión nueva que está en espera; la UI decide cuándo llamarla.
export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration): boolean {
  if (!registration.waiting) return false;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

// Invalidación controlada de las cachés de la aplicación.
export async function clearAppCaches(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const worker = registration?.active;
  if (!worker) return false;
  worker.postMessage({ type: "CLEAR_CACHE" });
  return true;
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerWhenLoaded();
  }, []);

  return null;
}
