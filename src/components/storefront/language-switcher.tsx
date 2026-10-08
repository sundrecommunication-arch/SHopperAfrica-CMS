"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { useT } from "@/i18n/client";

/** Lets a shopper override the auto-detected language; remembered for a year. */
export function LanguageSwitcher() {
  const router = useRouter();
  const t = useT();

  const choose = (value: string) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LANG_COOKIE}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 rounded-full p-2 text-xs font-semibold uppercase text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={t("common.language")}
      >
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline">{t.locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={t.locale} onValueChange={choose}>
          {LOCALES.map((code: Locale) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {LOCALE_NAMES[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
