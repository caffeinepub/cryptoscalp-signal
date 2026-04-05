import { useCallback, useEffect, useRef, useState } from "react";

type NotificationPermission = "default" | "granted" | "denied";

interface UsePushNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => void;
  sendNotification: (
    title: string,
    body: string,
    tag?: string,
  ) => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const isSupported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported
      ? (Notification.permission as NotificationPermission)
      : "denied",
  );

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as NotificationPermission);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          registrationRef.current = reg;
        })
        .catch(() => {});
    }
  }, [isSupported]);

  const requestPermission = useCallback(() => {
    if (!isSupported) return;
    Notification.requestPermission().then((result) => {
      setPermission(result as NotificationPermission);
    });
  }, [isSupported]);

  const sendNotification = useCallback(
    async (title: string, body: string, tag?: string) => {
      if (!isSupported || Notification.permission !== "granted") return;

      const opts: NotificationOptions = {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: tag ?? "cryptoscalp-signal",
        requireInteraction: false,
        vibrate: [200, 100, 200],
      } as NotificationOptions;

      try {
        const reg =
          registrationRef.current ??
          ("serviceWorker" in navigator
            ? await navigator.serviceWorker.ready
            : null);
        if (reg) {
          await reg.showNotification(title, opts);
        } else {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      } catch {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch {
          /* silent */
        }
      }
    },
    [isSupported],
  );

  return { permission, isSupported, requestPermission, sendNotification };
}
