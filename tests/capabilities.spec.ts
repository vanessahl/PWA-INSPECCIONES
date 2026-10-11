import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  cameraFailureReason,
  isCameraSupported,
  requestCameraStream,
  validateEvidenceFile
} from "../src/lib/device/camera";
import {
  getCurrentLocation,
  getSyntheticLocation,
  isGeolocationSupported
} from "../src/lib/device/geolocation";
import {
  notifyInspectionChange,
  notificationsSupported,
  requestNotificationPermission
} from "../src/lib/notifications/client";
import { enqueueInspection } from "../src/lib/sync/queue";
import { isInspectionRecord, type InspectionRecord, type SyncStore } from "../src/lib/storage/schema";

const root = resolve(import.meta.dirname, "..");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalNotification = Object.getOwnPropertyDescriptor(globalThis, "Notification");

function setNavigator(value: Navigator | undefined): void {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value });
}

function setNotification(value: typeof Notification | undefined): void {
  Object.defineProperty(globalThis, "Notification", { configurable: true, value });
}

function restoreGlobal(name: "navigator" | "Notification", descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete (globalThis as Record<string, unknown>)[name];
}

const syntheticInspection: InspectionRecord = {
  id: "synthetic-capabilities-101",
  location: "Laboratorio de Prueba",
  date: "2026-10-11",
  inspector: "Técnica A",
  status: "ok",
  statusLabel: "Sin incidencias",
  findings: 0,
  summary: "Registro sintético sin fotografía ni ubicación."
};

try {
  setNavigator(undefined);
  assert.equal(isCameraSupported(), false);
  assert.equal(await requestCameraStream(), null);
  assert.equal(cameraFailureReason(new Error("navegador no disponible")), "unsupported");

  setNavigator({
    mediaDevices: {
      getUserMedia: async () => { throw new DOMException("Permiso rechazado", "NotAllowedError"); }
    }
  } as unknown as Navigator);
  assert.equal(await requestCameraStream(), null);
  assert.equal(cameraFailureReason(new DOMException("Permiso rechazado", "NotAllowedError")), "permission-denied");

  const validFile = new File(["evidencia sintética"], "evidence.png", { type: "image/png" });
  const invalidFile = new File(["no es imagen"], "evidence.txt", { type: "text/plain" });
  const oversizedFile = new File(
    [new Uint8Array(5 * 1024 * 1024 + 1)],
    "oversized-synthetic.png",
    { type: "image/png" }
  );
  assert.equal(validateEvidenceFile(validFile)?.name, "evidence.png");
  assert.equal(validateEvidenceFile(invalidFile), null);
  assert.equal(validateEvidenceFile(oversizedFile), null);

  setNavigator(undefined);
  assert.equal(isGeolocationSupported(), false);
  assert.deepEqual(await getCurrentLocation(), { ok: false, reason: "unsupported" });

  setNavigator({
    geolocation: {
      getCurrentPosition: (_success, failure) => failure?.({ code: 1 } as GeolocationPositionError)
    }
  } as unknown as Navigator);
  assert.equal(isGeolocationSupported(), true);
  assert.deepEqual(await getCurrentLocation(), { ok: false, reason: "permission-denied" });
  const syntheticLocation = getSyntheticLocation();
  assert.equal(syntheticLocation.latitude, 18.4356);
  assert.equal(syntheticLocation.longitude, -97.3987);

  setNotification(undefined);
  assert.equal(notificationsSupported(), false);
  let fallbackCalled = false;
  const unsupportedNotification = await notifyInspectionChange("Cambio sintético", {}, () => {
    fallbackCalled = true;
  });
  assert.deepEqual(unsupportedNotification, { ok: true, mode: "fallback" });
  assert.equal(fallbackCalled, true);

  setNotification({
    permission: "denied",
    requestPermission: async () => "denied"
  } as unknown as typeof Notification);
  fallbackCalled = false;
  assert.equal(await requestNotificationPermission(), "denied");
  const deniedNotification = await notifyInspectionChange("Cambio sintético", {}, () => {
    fallbackCalled = true;
  });
  assert.deepEqual(deniedNotification, { ok: true, mode: "fallback" });
  assert.equal(fallbackCalled, true, "muestra una alternativa cuando se rechaza la notificación");

  assert.equal(isInspectionRecord(syntheticInspection), true);
  let storedInspection: InspectionRecord | undefined;
  const optionalCapabilitiesStore = {
    async enqueueLocal(inspection: InspectionRecord) {
      storedInspection = inspection;
      return true;
    }
  } as unknown as SyncStore;
  assert.equal(await enqueueInspection(optionalCapabilitiesStore, syntheticInspection), true);
  assert.deepEqual(storedInspection, syntheticInspection);
  assert.equal("photo" in syntheticInspection, false);
  assert.equal("locationCapture" in syntheticInspection, false);

  const inspectionPage = await readFile(resolve(root, "src/app/inspecciones/page.tsx"), "utf8");
  assert.match(inspectionPage, /setEvidenceName\(""\);\s*setLocationCapture\(null\);/s);
  assert.match(inspectionPage, /puedes guardar la inspección sin ella/);

  console.log("capabilities.spec.ts: PASS");
} finally {
  restoreGlobal("navigator", originalNavigator);
  restoreGlobal("Notification", originalNotification);
}
