"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface AccountAuthFormsProps {
  storeSlug: string;
  defaultPhone?: string;
}

/** Login / create-account tabs for /store/[slug]/account when no session cookie is set. */
export function AccountAuthForms({ storeSlug, defaultPhone = "" }: AccountAuthFormsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(defaultPhone ? "signup" : "login");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (!res.ok) throw new Error(data?.error ?? "Could not create your account");
      toast.success("Account created");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creating account");
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
      if (!res.ok) throw new Error(data?.error ?? "Could not sign you in");
      toast.success("Signed in");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error signing in");
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
          Sign in
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
          Create account
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Phone number or email</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loginPassword">Password</Label>
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
            Sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupPhone">Phone number</Label>
            <Input
              id="signupPhone"
              value={signupPhone}
              onChange={(e) => setSignupPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupEmail">Email (optional)</Label>
            <Input
              id="signupEmail"
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupPassword">Password</Label>
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
            Create account
          </Button>
          <p className="text-xs text-muted-foreground">
            Already ordered with us before? Use the same phone number and your past orders will
            show up here automatically.
          </p>
        </form>
      )}
    </div>
  );
}
