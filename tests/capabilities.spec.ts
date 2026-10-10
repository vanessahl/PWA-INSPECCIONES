import assert from "node:assert/strict";
import { cameraFailureReason, isCameraSupported, validateEvidenceFile } from "../src/lib/device/camera";
import { getSyntheticLocation, isGeolocationSupported } from "../src/lib/device/geolocation";
import { notifyInspectionChange, notificationsSupported } from "../src/lib/notifications/client";

const originalNavigator = globalThis.navigator;
const originalNotification = globalThis.Notification;

try {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: undefined });
  assert.equal(isCameraSupported(), false);
  assert.equal(isGeolocationSupported(), false);
  assert.equal(cameraFailureReason(new Error("no browser")), "unsupported");

  const valid = new File(["synthetic evidence"], "evidence.png", { type: "image/png" });
  const invalid = new File(["not an image"], "evidence.txt", { type: "text/plain" });
  assert.equal(validateEvidenceFile(valid)?.name, "evidence.png");
  assert.equal(validateEvidenceFile(invalid), null);

  const synthetic = getSyntheticLocation();
  assert.equal(synthetic.latitude, 18.4356);
  assert.equal(synthetic.longitude, -97.3987);

  Object.defineProperty(globalThis, "Notification", { configurable: true, value: undefined });
  assert.equal(notificationsSupported(), false);
  let fallbackCalled = false;
  const notificationResult = await notifyInspectionChange("Cambio sintético", {}, () => {
    fallbackCalled = true;
  });
  assert.deepEqual(notificationResult, { ok: true, mode: "fallback" });
  assert.equal(fallbackCalled, true);

  console.log("capabilities.spec.ts: PASS");
} finally {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  Object.defineProperty(globalThis, "Notification", { configurable: true, value: originalNotification });
}
