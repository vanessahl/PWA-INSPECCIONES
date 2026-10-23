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

  // Permiso concedido: se crea la notificación nativa y no se usa el fallback.
  const created: string[] = [];
  class FakeNotification {
    static permission: NotificationPermission = "granted";
    static requestPermission = async () => "granted" as NotificationPermission;
    constructor(title: string) { created.push(title); }
  }
  setNotification(FakeNotification as unknown as typeof Notification);
  fallbackCalled = false;
  assert.deepEqual(await notifyInspectionChange("Cambio concedido", {}, () => { fallbackCalled = true; }), { ok: true, mode: "notification" });
  assert.deepEqual(created, ["Cambio concedido"]);
  assert.equal(fallbackCalled, false);

  // Permiso "default": se pide una vez y, si la persona acepta, se notifica.
  let asked = 0;
  FakeNotification.permission = "default";
  FakeNotification.requestPermission = async () => { asked += 1; return "granted"; };
  assert.equal((await notifyInspectionChange("Tras aceptar")).ok, true);
  assert.equal(asked, 1);
  assert.equal(created.at(-1), "Tras aceptar");

  // Diálogo descartado: no se crea notificación y se usa el fallback.
  FakeNotification.permission = "default";
  FakeNotification.requestPermission = async () => "default";
  const before = created.length;
  fallbackCalled = false;
  assert.deepEqual(await notifyInspectionChange("Descartado", {}, () => { fallbackCalled = true; }), { ok: true, mode: "fallback" });
  assert.equal(created.length, before);
  assert.equal(fallbackCalled, true);

  // El constructor falla: se informa el fallo y se ejecuta el fallback.
  class ThrowingNotification {
    static permission: NotificationPermission = "granted";
    static requestPermission = async () => "granted" as NotificationPermission;
    constructor() { throw new Error("no disponible"); }
  }
  setNotification(ThrowingNotification as unknown as typeof Notification);
  fallbackCalled = false;
  assert.deepEqual(await notifyInspectionChange("Falla", {}, () => { fallbackCalled = true; }), { ok: false, reason: "failed" });
  assert.equal(fallbackCalled, true);

  // Geolocalización: éxito, timeout, fallo genérico.
  setNavigator({
    geolocation: {
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords: { latitude: 1, longitude: 2, accuracy: 30 } } as GeolocationPosition)
    }
  } as unknown as Navigator);
  const located = await getCurrentLocation();
  assert.equal(located.ok, true);
  if (located.ok) {
    assert.deepEqual([located.location.latitude, located.location.longitude, located.location.accuracy], [1, 2, 30]);
    assert.deepEqual(Object.keys(located.location).sort(), ["accuracy", "capturedAt", "latitude", "longitude"]);
  }
  for (const [code, reason] of [[3, "timeout"], [2, "failed"]] as const) {
    setNavigator({
      geolocation: { getCurrentPosition: (_s: PositionCallback, f?: PositionErrorCallback) => f?.({ code } as GeolocationPositionError) }
    } as unknown as Navigator);
    assert.deepEqual(await getCurrentLocation(), { ok: false, reason });
  }

  // Cámara: errores distintos al permiso se clasifican y los inesperados se propagan.
  setNavigator({ mediaDevices: { getUserMedia: async () => { throw new DOMException("ocupada", "NotReadableError"); } } } as unknown as Navigator);
  assert.equal(cameraFailureReason(new DOMException("ocupada", "NotReadableError")), "unavailable");
  await assert.rejects(requestCameraStream());
  assert.equal(cameraFailureReason(new Error("otro")), "failed");

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
  assert.doesNotMatch(
    inspectionPage.slice(inspectionPage.indexOf("const handleFileRequest")).split("const records")[0],
    /requestCameraStream/,
    "seleccionar archivo no depende del permiso de cámara"
  );

  console.log("capabilities.spec.ts: PASS");
} finally {
  restoreGlobal("navigator", originalNavigator);
  restoreGlobal("Notification", originalNotification);
}
