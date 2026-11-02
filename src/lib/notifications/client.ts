export type NotificationResult =
  | { ok: true; mode: "notification" | "fallback" }
  | { ok: false; reason: "unsupported" | "permission-denied" | "failed" };

export function notificationsSupported(): boolean {
  return typeof Notification !== "undefined";
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}

export async function notifyInspectionChange(
  title: string,
  options: NotificationOptions = {},
  fallback: () => void = () => undefined
): Promise<NotificationResult> {
  if (!notificationsSupported()) {
    fallback();
    return { ok: true, mode: "fallback" };
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission === "unsupported" || permission === "denied") {
      fallback();
      return permission === "denied"
        ? { ok: true, mode: "fallback" }
        : { ok: false, reason: "unsupported" };
    }
    new Notification(title, options);
    return { ok: true, mode: "notification" };
  } catch {
    fallback();
    return { ok: false, reason: "failed" };
  }
}
