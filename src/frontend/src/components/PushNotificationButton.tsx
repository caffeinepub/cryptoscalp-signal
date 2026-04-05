import { Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PushNotificationButton() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  // Attach native DOM listener -- bypass React synthetic events entirely
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn || !supported || permission !== "default") return;

    function handleNativeClick() {
      Notification.requestPermission().then((result) => {
        setPermission(result);
        if (result === "granted" && "serviceWorker" in navigator) {
          navigator.serviceWorker.register("/sw.js").catch(() => {});
        }
      });
    }

    btn.addEventListener("click", handleNativeClick);
    btn.addEventListener("touchend", handleNativeClick, { passive: false });

    return () => {
      btn.removeEventListener("click", handleNativeClick);
      btn.removeEventListener("touchend", handleNativeClick);
    };
  }, [supported, permission]);

  if (!supported) return null;

  if (permission === "denied") {
    return (
      <button
        type="button"
        disabled
        title="Notifiche bloccate — abilita nelle impostazioni del browser"
        className="h-9 w-9 p-0 flex items-center justify-center rounded border border-border text-muted-foreground opacity-50 cursor-not-allowed bg-transparent"
      >
        <BellOff className="w-4 h-4" />
      </button>
    );
  }

  if (permission === "granted") {
    return (
      <button
        type="button"
        title="Notifiche LONG attive"
        className="h-9 w-9 p-0 flex items-center justify-center rounded border border-signal-green/30 text-signal-green bg-transparent relative"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-signal-green animate-pulse" />
      </button>
    );
  }

  // permission === 'default' -- show clickable bell
  return (
    <button
      ref={btnRef}
      type="button"
      title="Abilita notifiche LONG"
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        cursor: "pointer",
        zIndex: 9999,
        position: "relative",
        pointerEvents: "all",
      }}
      className="h-9 w-9 p-0 flex items-center justify-center rounded border border-border text-muted-foreground bg-transparent active:scale-90"
    >
      <Bell className="w-4 h-4" />
    </button>
  );
}
