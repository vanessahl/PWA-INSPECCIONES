export type SyntheticLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

export type LocationResult =
  | { ok: true; location: SyntheticLocation }
  | { ok: false; reason: "unsupported" | "insecure-context" | "permission-denied" | "timeout" | "failed" };

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function getSyntheticLocation(): SyntheticLocation {
  return {
    latitude: 18.4356,
    longitude: -97.3987,
    accuracy: 1000,
    capturedAt: new Date().toISOString()
  };
}

export function getCurrentLocation(options: PositionOptions = {}): Promise<LocationResult> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }
  if (typeof isSecureContext !== "undefined" && !isSecureContext &&
      window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return Promise.resolve({ ok: false, reason: "insecure-context" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        ok: true,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString()
        }
      }),
      (error) => {
        const reason = error.code === 1
          ? "permission-denied"
          : error.code === 3 ? "timeout" : "failed";
        resolve({ ok: false, reason });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000, ...options }
    );
  });
}
