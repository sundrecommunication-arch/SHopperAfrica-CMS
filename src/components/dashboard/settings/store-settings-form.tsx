"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, Palette, MapPin, Save, Loader2, Sparkles, CheckCircle2, RefreshCw, Copy, ShoppingCart, Search, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCALES, LOCALE_ENGLISH_NAMES, LOCALE_NAMES } from "@/i18n/config";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader, type UploadedImage } from "@/components/dashboard/products/image-uploader";

interface StoreSettingsFormProps {
  store: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    currencySymbol: string;
    primaryColor: string;
    secondaryColor: string;
    addressText: string | null;
    isPublished: boolean;
    customDomain?: string | null;
    locale: string;
    domainVerified?: boolean;
    logoUrl?: string | null;
    heroImages?: string[];
    heroShowText?: boolean;
    heroTextPosition?: string;
    abandonedCartThresholdHours?: number;
    metaTitle?: string | null;
    metaDescription?: string | null;
    searchConsoleVerification?: string | null;
    llmsTxt?: string | null;
  };
}

type HeroTextPosition = "center" | "bottom-left" | "bottom-center" | "bottom-right";

const heroTextPositions: { value: HeroTextPosition; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

const currencies = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (₦)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi (₵)" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KSh)" },
];

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const router = useRouter();

  const [isPublished, setIsPublished] = useState(store.isPublished);
  const [currency, setCurrency] = useState(store.currency);
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor || "#16a34a");
  const [addressText, setAddressText] = useState(store.addressText ?? "");
  const [customDomain, setCustomDomain] = useState(store.customDomain ?? "");
  const [locale, setLocale] = useState(store.locale ?? "en");
  const [domainVerified, setDomainVerified] = useState(store.domainVerified ?? false);
  const [dnsInstructions, setDnsInstructions] = useState<{
    cnameTarget: string;
    txtHost: string;
    txtValue: string;
  } | null>(null);
  const [isLoadingInstructions, setIsLoadingInstructions] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [logo, setLogo] = useState<UploadedImage[]>(
    store.logoUrl ? [{ url: store.logoUrl, isPrimary: true }] : []
  );
  const [heroImages, setHeroImages] = useState<UploadedImage[]>(
    (store.heroImages ?? []).map((url, index) => ({ url, isPrimary: index === 0 }))
  );
  const [heroShowText, setHeroShowText] = useState(store.heroShowText ?? false);
  const [heroTextPosition, setHeroTextPosition] = useState<HeroTextPosition>(
    (store.heroTextPosition as HeroTextPosition) ?? "bottom-center"
  );
  const [abandonedCartThresholdHours, setAbandonedCartThresholdHours] = useState(
    store.abandonedCartThresholdHours ?? 2
  );
  const [metaTitle, setMetaTitle] = useState(store.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(store.metaDescription ?? "");
  const [searchConsoleVerification, setSearchConsoleVerification] = useState(
    store.searchConsoleVerification ?? ""
  );
  const [llmsTxt, setLlmsTxt] = useState(store.llmsTxt ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const selectedCurrencyObj = currencies.find((c) => c.code === currency) ?? currencies[0];
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const storefrontPath = `${appUrl}/store/${store.slug}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/stores/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished,
          currency: selectedCurrencyObj.code,
          currencySymbol: selectedCurrencyObj.symbol,
          primaryColor,
          addressText: addressText.trim() || null,
          customDomain: customDomain.trim() || null,
          locale,
          logoUrl: logo[0]?.url ?? null,
          heroImages: heroImages.map((img) => img.url),
          heroShowText,
          heroTextPosition,
          abandonedCartThresholdHours,
          metaTitle: metaTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          searchConsoleVerification: searchConsoleVerification.trim() || null,
          llmsTxt: llmsTxt.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");

      toast.success("Store settings updated successfully");
      setDomainVerified(Boolean(data.store?.domainVerified));
      setDnsInstructions(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  async function loadDnsInstructions() {
    setIsLoadingInstructions(true);
    try {
      const res = await fetch("/api/stores/domain/verify");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load DNS instructions");
        return;
      }
      setDomainVerified(Boolean(data.domainVerified));
      setDnsInstructions(data.instructions ?? null);
    } finally {
      setIsLoadingInstructions(false);
    }
  }

  async function verifyDomain() {
    setIsVerifyingDomain(true);
    try {
      const res = await fetch("/api/stores/domain/verify", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not verify domain");
        return;
      }
      if (data.verified) {
        setDomainVerified(true);
        setDnsInstructions(null);
        toast.success("Domain verified! Your storefront can now be reached there.");
        router.refresh();
      } else {
        setDnsInstructions(data.instructions ?? null);
        toast.error(
          "That TXT record isn't showing up yet — DNS changes can take a little while to propagate. Try again shortly."
        );
      }
    } finally {
      setIsVerifyingDomain(false);
    }
  }

  function copyToClipboard(value: string) {
    navigator.clipboard?.writeText(value).then(
      () => toast.success("Copied"),
      () => toast.error("Could not copy")
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Publishing Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Store Visibility</CardTitle>
                <CardDescription>
                  {isPublished
                    ? "Your storefront is LIVE and accessible to the public."
                    : "Your store is currently in draft preview mode."}
                </CardDescription>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardHeader>
      </Card>

      {/* 2. Currency & Formatting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currency & Region</CardTitle>
          <CardDescription>Choose the primary currency displayed on your store.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label>Store Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 3. Storefront Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Storefront Branding Colors
          </CardTitle>
          <CardDescription>Customize the accent button & brand color on your storefront.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border p-1 bg-background"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-28 font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <span
                className="h-8 w-24 rounded-md text-white text-xs font-semibold flex items-center justify-center shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                Button Preview
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3b. Logo & Hero Slider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Logo & Storefront Images
          </CardTitle>
          <CardDescription>
            Your logo appears in the storefront header. Hero images rotate in the banner at the
            top of your store page — add a few for the best effect.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="space-y-2">
            <Label>Store logo</Label>
            <ImageUploader
              images={logo}
              onChange={setLogo}
              folder="branding"
              multiple={false}
              label="Add logo"
            />
            <p className="text-muted-foreground text-xs">
              Best fit: a square image, at least 200 × 200px (PNG with a transparent background
              works well). Non-square logos are shown in full — never cropped — but a square
              image looks sharpest in the header.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Hero slider images</Label>
            <ImageUploader
              images={heroImages}
              onChange={setHeroImages}
              folder="branding"
              multiple
              label="Add hero image"
            />
            <p className="text-muted-foreground text-xs">
              Best fit: a wide image around 1600 × 600px (roughly 8:3). {heroImages.length === 0
                ? "No hero images yet — a generic placeholder banner is shown until you add some."
                : "Add a few for a rotating banner effect."}
            </p>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Show text over the hero banner</Label>
                <p className="text-muted-foreground text-xs">
                  Overlays your store name, description and WhatsApp button on top of the hero
                  images. Leave this off if your hero images already have their own text or
                  branding baked in.
                </p>
              </div>
              <label className="relative inline-flex shrink-0 items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroShowText}
                  onChange={(e) => setHeroShowText(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {heroShowText && (
              <div className="space-y-2">
                <Label className="text-xs">Text position</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {heroTextPositions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setHeroTextPosition(option.value)}
                      className={
                        heroTextPosition === option.value
                          ? "rounded-md border border-primary bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary"
                          : "rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  A bottom position keeps the text clear of the middle of your hero images.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Physical Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Physical Address
          </CardTitle>
          <CardDescription>Displayed on your storefront footer for customer trust.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="addressText">Store Address</Label>
            <Input
              id="addressText"
              placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4b. Abandoned Cart Follow-up */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Abandoned Cart Follow-up
          </CardTitle>
          <CardDescription>
            When a website checkout (Paystack or bank transfer) sits unpaid this long, it shows up
            under Abandoned Carts so you can nudge the customer on WhatsApp with one click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="abandonedCartThresholdHours">Flag as abandoned after (hours)</Label>
            <Input
              id="abandonedCartThresholdHours"
              type="number"
              min={1}
              max={168}
              value={abandonedCartThresholdHours}
              onChange={(e) =>
                setAbandonedCartThresholdHours(
                  Math.min(168, Math.max(1, Number(e.target.value) || 1))
                )
              }
              className="w-28"
            />
          </div>
        </CardContent>
      </Card>

      {/* 4c. SEO & Optimisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            SEO & Optimisation
          </CardTitle>
          <CardDescription>
            Fine-tune how your store appears in Google and in AI tools like ChatGPT and
            Perplexity. Everything here is optional — sensible defaults are already generated
            from your store name and description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Page title</Label>
            <Input
              id="metaTitle"
              placeholder={`${store.name} – ${store.slug}`}
              maxLength={70}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              The clickable headline shown in Google search results and browser tabs. Keep it
              under 60 characters.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta description</Label>
            <Textarea
              id="metaDescription"
              placeholder="A short, compelling summary of your store, shown under your title in search results."
              maxLength={300}
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Aim for 150–160 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="searchConsoleVerification">
              Google Search Console verification code
            </Label>
            <Input
              id="searchConsoleVerification"
              placeholder="e.g. AbCdEfGhIjKlMnOpQrStUvWxYz1234567890"
              value={searchConsoleVerification}
              onChange={(e) => setSearchConsoleVerification(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              In Search Console, add your property, choose the &quot;HTML tag&quot; verification
              method, and paste just the <code>content=&quot;...&quot;</code> value here — save,
              then click Verify in Search Console.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="llmsTxt">llms.txt (advanced)</Label>
            <Textarea
              id="llmsTxt"
              placeholder="Leave blank to auto-generate from your store info, categories and products."
              rows={4}
              value={llmsTxt}
              onChange={(e) => setLlmsTxt(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-muted-foreground text-xs">
              A plain-text summary AI assistants use to understand your store. Only fill this in
              if you want to override the auto-generated version.
            </p>
          </div>

          <div className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Your SEO files</p>
            <a
              href={`${appUrl}/sitemap.xml`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{appUrl}/sitemap.xml</span>
            </a>
            <a
              href={`${storefrontPath}/llms.txt`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{storefrontPath}/llms.txt</span>
            </a>
            <p>
              Both are generated automatically, and AI crawlers (ChatGPT, Perplexity, Claude,
              Gemini) are already allowed to index your store.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Custom Domain & Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Custom Domain & Locale
          </CardTitle>
          <CardDescription>
            Point your own domain (e.g. shop.yourbrand.com) at this store, and choose the
            language your storefront is written in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="customDomain">Custom Domain</Label>
              {store.customDomain && (
                <span
                  className={
                    domainVerified
                      ? "flex items-center gap-1 text-xs font-medium text-success"
                      : "flex items-center gap-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {domainVerified ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </>
                  ) : (
                    "Pending verification"
                  )}
                </span>
              )}
            </div>
            <Input
              id="customDomain"
              placeholder="e.g. shop.example.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Save your changes first, then set up the DNS records below to verify ownership.
            </p>

            {store.customDomain && !domainVerified && (
              <div className="mt-2 flex flex-col gap-3 rounded-md border p-3">
                {!dnsInstructions ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start gap-2"
                    onClick={loadDnsInstructions}
                    disabled={isLoadingInstructions}
                  >
                    {isLoadingInstructions && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Show DNS setup instructions
                  </Button>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Add these records with your domain&apos;s DNS provider, then verify below. DNS
                      changes can take anywhere from a few minutes up to 24-48 hours to take
                      effect.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="rounded border bg-muted/40 p-2">
                        <div className="font-medium">1. CNAME record</div>
                        <div className="mt-1 flex items-center justify-between gap-2 font-mono">
                          <span className="truncate">Host: {store.customDomain}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 font-mono">
                          <span className="truncate">Points to: {dnsInstructions.cnameTarget}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(dnsInstructions.cnameTarget)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Copy CNAME target"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded border bg-muted/40 p-2">
                        <div className="font-medium">2. TXT record (proves you own this domain)</div>
                        <div className="mt-1 flex items-center justify-between gap-2 font-mono">
                          <span className="truncate">Host: {dnsInstructions.txtHost}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(dnsInstructions.txtHost)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Copy TXT host"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 font-mono">
                          <span className="truncate">Value: {dnsInstructions.txtValue}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(dnsInstructions.txtValue)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Copy TXT value"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 self-start"
                      onClick={verifyDomain}
                      disabled={isVerifyingDomain}
                    >
                      {isVerifyingDomain ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      I&apos;ve added the records — Verify now
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">Store language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {LOCALE_ENGLISH_NAMES[code]}
                    {LOCALE_NAMES[code] !== LOCALE_ENGLISH_NAMES[code] ? ` — ${LOCALE_NAMES[code]}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Customers see your store in their phone&apos;s language when we support it, otherwise in
              this one. They can always switch with the 🌐 button. Your product names and descriptions
              stay as you wrote them.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </form>
  );
}
