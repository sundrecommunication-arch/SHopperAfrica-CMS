"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

// Turn "new order" push notifications on/off for THIS device (phone, laptop).
// Needs the service worker from the Shopper app (public/sw.js). On iPhone/iPad
// push only works once Shopper is added to the Home Screen, so there it
// points to that instead.

type State =
  | { kind: "loading" }
  | { kind: "unsupported"; installFirst: boolean }
  | { kind: "blocked" }
  | { kind: "off" }
  | { kind: "on"; subscription: PushSubscription };

function base64UrlToBytes(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const DISMISS_KEY = "shopper_alerts_dismissed";

export function OrderAlertsCard({ variant = "card" }: { variant?: "card" | "settings" }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = { kind: "unsupported", installFirst: ios && !standalone };
      } else if (Notification.permission === "denied") {
        next = { kind: "blocked" };
      } else {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = registration ? await registration.pushManager.getSubscription() : null;
        next = subscription ? { kind: "on", subscription } : { kind: "off" };
      }
      let wasDismissed = false;
      try {
        wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {}
      if (!cancelled) {
        setState(next);
        setDismissed(wasDismissed);
      }
    }
    check().catch(() => !cancelled && setState({ kind: "unsupported", installFirst: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? { kind: "blocked" } : { kind: "off" });
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch("/api/push/key").then((r) => r.json());
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        await subscription.unsubscribe();
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't turn on alerts");
      }
      setState({ kind: "on", subscription });
      toast.success("Order alerts are on for this device");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't turn on alerts");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (state.kind !== "on") return;
    setBusy(true);
    const { endpoint } = state.subscription;
    await state.subscription.unsubscribe().catch(() => {});
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
    setBusy(false);
    setState({ kind: "off" });
    toast.success("Order alerts turned off for this device");
  }

  async function sendTest() {
    setBusy(true);
    const res = await fetch("/api/push/test", { method: "POST" }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (!res?.sent) toast.error("Couldn't send a test alert. Try turning alerts off and on again.");
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  if (state.kind === "loading") return null;

  // On the Overview it's a prompt: only while alerts can still be turned on.
  if (variant === "card" && (state.kind !== "off" || dismissed)) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {state.kind === "on" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {state.kind === "on" ? "Order alerts are on for this device" : "Get an alert for every new order"}
        </p>
        <p className="text-xs text-muted-foreground">
          {state.kind === "unsupported"
            ? state.installFirst
              ? "On iPhone and iPad, add Shopper to your Home Screen first (tap Share, then Add to Home Screen), then open it from there."
              : "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari."
            : state.kind === "blocked"
              ? "Notifications are blocked for Shopper. Allow them in your browser or phone settings, then come back here."
              : state.kind === "on"
                ? "You'll get a notification the moment an order comes in, even when Shopper is closed."
                : "A notification on this phone or computer the moment an order comes in, even when Shopper is closed."}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {state.kind === "off" && (
            <Button size="sm" onClick={turnOn} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Bell className="mr-1 h-3.5 w-3.5" />}
              Turn on order alerts
            </Button>
          )}
          {state.kind === "on" && (
            <>
              <Button size="sm" variant="outline" onClick={sendTest} disabled={busy}>
                Send a test alert
              </Button>
              <Button size="sm" variant="ghost" onClick={turnOff} disabled={busy}>
                Turn off
              </Button>
            </>
          )}
        </div>
      </div>
      {variant === "card" && (
        <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <span aria-hidden>×</span>
        </button>
      )}
    </div>
  );
}
