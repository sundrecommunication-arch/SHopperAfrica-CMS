"use client";

import { useEffect } from "react";

/** Remembers which country page a visitor came from, so store setup can preselect it. */
export function RememberCountry({ code }: { code: string }) {
  useEffect(() => {
    try {
      localStorage.setItem("shopper_country", code);
    } catch {
      // storage blocked -- they can still pick the country at signup
    }
  }, [code]);
  return null;
}
