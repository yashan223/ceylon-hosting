"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck, MessageCircle, X } from "lucide-react";

type Notification = {
  id: string;
  orderId: string;
  body: string;
  createdAt: string;
  read: boolean;
};

const pollIntervalMs = 10_000;
const toastLifetimeMs = 6_000;
const maxToasts = 4;
const readStorageKey = "ceylonhosting_read_notifications";

const keyOf = (notification: Notification) => `${notification.orderId}:${notification.id}`;

function loadCachedReadKeys() {
  try {
    const raw = window.localStorage.getItem(readStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [],
    );
  } catch {
    return new Set<string>();
  }
}

function saveCachedReadKeys(keys: Set<string>) {
  try {
    window.localStorage.setItem(readStorageKey, JSON.stringify([...keys].slice(-200)));
  } catch {
    /* storage unavailable — optimistic read state just won't persist */
  }
}

export function MessageNotifications({ enabled }: { enabled: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [localReadKeys, setLocalReadKeys] = useState<Set<string>>(() => new Set());
  const seenKeys = useRef<Set<string>>(new Set());
  const localReadRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const cacheLoaded = useRef(false);

  const isRead = useCallback(
    (notification: Notification) => notification.read || localReadKeys.has(keyOf(notification)),
    [localReadKeys],
  );

  const markKeysRead = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    setLocalReadKeys((current) => {
      const next = new Set(current);
      keys.forEach((key) => next.add(key));
      localReadRef.current = next;
      saveCachedReadKeys(next);
      return next;
    });
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    }).catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.status === 401) {
        setHidden(true);
        return;
      }
      if (!response.ok) return;
      if (!cacheLoaded.current) {
        cacheLoaded.current = true;
        const cached = loadCachedReadKeys();
        localReadRef.current = cached;
        setLocalReadKeys(cached);
      }
      const result = (await response.json()) as { notifications?: Notification[] };
      const incoming = (result.notifications ?? []).filter(
        (item) => item && item.id && item.orderId,
      );
      const fresh = isFirstLoad.current
        ? []
        : incoming.filter((item) => {
            const key = keyOf(item);
            return !seenKeys.current.has(key) && !localReadRef.current.has(key) && !item.read;
          });
      incoming.forEach((item) => seenKeys.current.add(keyOf(item)));
      if (fresh.length > 0) {
        setToasts((current) => {
          const existing = new Set(current.map(keyOf));
          return [...fresh.filter((item) => !existing.has(keyOf(item))), ...current].slice(
            0,
            maxToasts,
          );
        });
      }
      setNotifications(incoming);
      isFirstLoad.current = false;
    } catch {
      /* network hiccup — retry on the next poll */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), pollIntervalMs);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(
      () => setToasts((current) => current.slice(1)),
      toastLifetimeMs,
    );
    return () => window.clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!enabled || hidden) return null;

  const unreadCount = notifications.filter((item) => !isRead(item)).length;

  const dismissToast = (notification: Notification) =>
    setToasts((current) => current.filter((item) => item.id !== notification.id));

  const closePanel = () => {
    setOpen(false);
    markKeysRead(notifications.filter((item) => !isRead(item)).map(keyOf));
  };

  return (
    <>
      <div className="side-notif-root">
        {toasts.length > 0 && (
          <div className="side-notif-toasts" role="status" aria-live="polite">
            {toasts.map((toast) => (
              <div className="side-notif-toast" key={toast.id}>
                <span className="side-notif-toast-icon">
                  <MessageCircle size={14} />
                </span>
                <div className="side-notif-toast-body">
                  <span className="side-notif-kicker">Order {toast.orderId}</span>
                  <p>{toast.body}</p>
                  <small>
                    {new Date(toast.createdAt).toLocaleTimeString("en-LK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
                <div className="side-notif-toast-actions">
                  <Link
                    href={`/orders/${toast.orderId}`}
                    onClick={() => {
                      dismissToast(toast);
                      markKeysRead([keyOf(toast)]);
                    }}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => dismissToast(toast)}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          className={`side-notif-bell ${unreadCount > 0 ? "has-unread" : ""}`}
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          aria-expanded={open}
          onClick={() => (open ? closePanel() : setOpen(true))}
        >
          {unreadCount > 0 ? <BellRing size={17} /> : <Bell size={17} />}
          {unreadCount > 0 && (
            <span className="side-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </button>
      </div>
      {open && (
        <div className="side-notif-layer">
          <button
            className="side-notif-backdrop"
            type="button"
            aria-label="Close notifications"
            onClick={closePanel}
          />
          <aside
            className="side-notif-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Message notifications"
          >
            <header className="side-notif-drawer-header">
              <div>
                <span className="side-notif-kicker">Order chats</span>
                <h2>Notifications</h2>
              </div>
              <button type="button" aria-label="Close notifications" onClick={closePanel}>
                <X size={16} />
              </button>
            </header>
            {notifications.length === 0 ? (
              <p className="side-notif-empty">
                <MessageCircle size={20} />
                No messages yet. Updates about your orders will show up here.
              </p>
            ) : (
              <div className="side-notif-list">
                {notifications.map((item) => (
                  <Link
                    className={`side-notif-item ${isRead(item) ? "" : "unread"}`}
                    key={item.id}
                    href={`/orders/${item.orderId}`}
                    onClick={() => {
                      setOpen(false);
                      markKeysRead([keyOf(item)]);
                    }}
                  >
                    <span className="side-notif-kicker">Order {item.orderId}</span>
                    <p>{item.body}</p>
                    <small>{new Date(item.createdAt).toLocaleString("en-LK")}</small>
                  </Link>
                ))}
              </div>
            )}
            <footer className="side-notif-drawer-footer">
              <button
                type="button"
                onClick={() => markKeysRead(notifications.map(keyOf))}
                disabled={unreadCount === 0}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
