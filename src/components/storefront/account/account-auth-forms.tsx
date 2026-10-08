"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

interface AccountAuthFormsProps {
  storeSlug: string;
  defaultPhone?: string;
}

/** Login / create-account tabs for /store/[slug]/account when no session cookie is set. */
export function AccountAuthForms({ storeSlug, defaultPhone = "" }: AccountAuthFormsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(defaultPhone ? "signup" : "login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useT();

  const [name, setName] = useState("");
  const [signupPhone, setSignupPhone] = useState(defaultPhone);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [identifier, setIdentifier] = useState(defaultPhone);
  const [loginPassword, setLoginPassword] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/storefront/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug,
          name,
          phone: signupPhone,
          email: signupEmail,
          password: signupPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("account.errCreate"));
      toast.success(t("account.created"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("account.errCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/storefront/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, identifier, password: loginPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("account.errSignIn"));
      toast.success(t("account.signedIn"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("account.errSignIn"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={
            mode === "login"
              ? "border-b-2 border-primary px-3 py-2 text-sm font-semibold text-foreground"
              : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {t("account.signIn")}
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={
            mode === "signup"
              ? "border-b-2 border-primary px-3 py-2 text-sm font-semibold text-foreground"
              : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {t("account.createAccount")}
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">{t("account.phoneOrEmail")}</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loginPassword">{t("account.password")}</Label>
            <Input
              id="loginPassword"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("account.signIn")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("account.fullName")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupPhone">{t("account.phone")}</Label>
            <Input
              id="signupPhone"
              value={signupPhone}
              onChange={(e) => setSignupPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupEmail">{t("account.emailOptional")}</Label>
            <Input
              id="signupEmail"
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupPassword">{t("account.password")}</Label>
            <Input
              id="signupPassword"
              type="password"
              minLength={6}
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("account.createAccount")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("account.pastOrdersHint")}
          </p>
        </form>
      )}
    </div>
  );
}
