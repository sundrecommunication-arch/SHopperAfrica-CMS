"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// "Install the Shopper app" on the dashboard. Chrome/Edge/Android get a real
// install button (beforeinstallprompt); iPhone/iPad Safari has no such API,
// so it gets the two-tap instructions instead. Hidden once installed or
// dismissed.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "shopper_install_dismissed";

function readEnvironment() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {}
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return `${standalone ? 1 : 0}${dismissed ? 1 : 0}${ios ? 1 : 0}`;
}

const noopSubscribe = () => () => {};

export function InstallAppBanner() {
  // "standalone|dismissed|ios" as one string so the snapshot is stable.
  const env = useSyncExternalStore(noopSubscribe, readEnvironment, () => "110");
  const [standalone, dismissedAtLoad, ios] = env.split("").map((c) => c === "1");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our button instead of the browser's mini-bar
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || standalone || dismissedAtLoad || (!deferred && !ios)) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setHidden(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg border" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Get the Shopper app</p>
        {deferred ? (
          <p className="text-xs text-muted-foreground">
            Open your store from your home screen, full-screen, in one tap. No app store needed.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Share" /> in Safari, then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        )}
        {deferred && (
          <Button size="sm" className="mt-2" onClick={install}>
            <Download className="mr-1 h-3.5 w-3.5" /> Install
          </Button>
        )}
      </div>
      <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
