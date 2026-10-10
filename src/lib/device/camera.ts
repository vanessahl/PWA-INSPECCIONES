export type EvidenceFile = {
  name: string;
  type: string;
  size: number;
  file: File;
};

export type CameraFailureReason = "unsupported" | "permission-denied" | "unavailable" | "failed";

export type CameraResult =
  | { ok: true; file: File }
  | { ok: false; reason: CameraFailureReason };

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isCameraSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function validateEvidenceFile(file: File): EvidenceFile | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_EVIDENCE_BYTES) {
    return null;
  }
  return { name: file.name, type: file.type, size: file.size, file };
}

export async function requestCameraStream(): Promise<MediaStream | null> {
  if (!isCameraSupported()) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
      return null;
    }
    throw error;
  }
}

export function stopCameraStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

export function cameraFailureReason(error: unknown): CameraFailureReason {
  if (!isCameraSupported()) return "unsupported";
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "permission-denied";
  }
  if (error instanceof DOMException && error.name === "NotReadableError") return "unavailable";
  return "failed";
}
