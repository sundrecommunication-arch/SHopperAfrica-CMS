"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, parseConsent, type ConsentValue } from "@/lib/consent";
import { Button } from "@/components/ui/button";

// A tiny store over the consent cookie so every component (banner, analytics
// loader, footer link) re-renders the moment the visitor chooses.
const EVENT = "shopper-consent-change";

function readConsent(): ConsentValue | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return parseConsent(match?.[1]);
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/**
 * "pending" during server render and hydration (no banner flash, no
 * scripts), then the visitor's stored choice, or null if they haven't chosen.
 */
export function useConsent(): ConsentValue | null | "pending" {
  return useSyncExternalStore(subscribe, readConsent, () => "pending");
}

export function setConsent(value: ConsentValue | null) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    value === null
      ? `${CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
      : `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

export function CookieConsentBanner() {
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      // Compact on phones (short text, buttons side by side) so it covers as
      // little of the page as possible; full wording from sm: up. Decline and
      // Accept stay equally easy to tap. The bottom offset keeps it above the
      // iPhone home indicator.
      className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-2xl rounded-xl border border-border bg-background p-3 shadow-lg sm:inset-x-6 sm:bottom-6 sm:rounded-2xl sm:p-5"
    >
      <p className="text-xs leading-snug text-foreground sm:text-sm">
        <span className="sm:hidden">
          We use cookies to measure our ads and show you relevant ones. Essential cookies are always on.
        </span>
        <span className="hidden sm:inline">
          We use cookies to see which posts and ads bring people to Shopper, and to show you relevant
          Shopper ads on Instagram, Facebook and Google. Essential cookies (like keeping you signed in)
          are always on.
        </span>{" "}
        <Link href="/contact" className="underline underline-offset-2">
          Questions?
        </Link>
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3 sm:flex sm:justify-end">
        <Button variant="outline" size="sm" className="h-9" onClick={() => setConsent("denied")}>
          Decline
        </Button>
        <Button size="sm" className="h-9" onClick={() => setConsent("granted")}>
          Accept
        </Button>
      </div>
    </div>
  );
}

/** Footer link to change the choice later. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => setConsent(null)} className={className}>
      Cookie settings
    </button>
  );
}
