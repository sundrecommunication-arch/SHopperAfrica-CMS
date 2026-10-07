"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Google Analytics 4 + Meta Pixel for Shopper's OWN marketing and signup
// pages only (never merchants' storefronts or the dashboard). Both are off
// unless their ID is set at build time:
//   NEXT_PUBLIC_GA_MEASUREMENT_ID  e.g. G-XXXXXXXXXX
//   NEXT_PUBLIC_META_PIXEL_ID      e.g. 1234567890
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = (...args: unknown[]) => void;
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

/** Fire once a new merchant account is created (signup form). */
export function trackSignUp() {
  window.gtag?.("event", "sign_up", { method: "email" });
  window.fbq?.("track", "CompleteRegistration");
}

export function MarketingAnalytics() {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  // The Pixel's init snippet records the first PageView; record the rest on
  // client-side navigation. (GA4's enhanced measurement already does this.)
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
