"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "OWNER" | "MANAGER" | "STAFF";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "owner",
  MANAGER: "manager",
  STAFF: "staff member",
};

interface AcceptInviteFormProps {
  token: string;
  storeName: string;
  role: Role;
  email: string;
  accountExists: boolean;
  signedInEmail: string | null;
}

export function AcceptInviteForm({
  token,
  storeName,
  role,
  email,
  accountExists,
  signedInEmail,
}: AcceptInviteFormProps) {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const roleLabel = ROLE_LABEL[role];
  const sameEmail = signedInEmail?.toLowerCase() === email.toLowerCase();

  async function acceptAsSignedInUser() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not accept this invite");
        return;
      }
      await update();
      window.location.assign("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Already signed in as the invited email — one click to join.
  if (signedInEmail && sameEmail) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Join {storeName}</h1>
          <p className="text-muted-foreground text-sm">
            You&apos;ve been invited as a <strong>{roleLabel}</strong>.
          </p>
        </div>
        <Button onClick={acceptAsSignedInUser} disabled={isSubmitting}>
          {isSubmitting ? "Joining…" : `Join ${storeName}`}
        </Button>
      </div>
    );
  }

  // Signed in as a different email — this invite isn't for this session.
  if (signedInEmail && !sameEmail) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Wrong account</h1>
          <p className="text-muted-foreground text-sm">
            You&apos;re signed in as <strong>{signedInEmail}</strong>, but this invite to join{" "}
            {storeName} was sent to <strong>{email}</strong>.
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: `/invite/${token}` })}>
          Sign out and try again
        </Button>
      </div>
    );
  }

  if (accountExists) {
    return <SignInAndAcceptForm token={token} storeName={storeName} roleLabel={roleLabel} email={email} />;
  }

  return <CreateAccountAndAcceptForm token={token} storeName={storeName} roleLabel={roleLabel} email={email} />;
}

const loginSchema = z.object({
  password: z.string().min(1, "Enter your password"),
});
type LoginInput = z.infer<typeof loginSchema>;

function SignInAndAcceptForm({
  token,
  storeName,
  roleLabel,
  email,
}: {
  token: string;
  storeName: string;
  roleLabel: string;
  email: string;
}) {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    try {
      const signInResult = await signIn("credentials", {
        email,
        password: values.password,
        redirect: false,
      });
      if (signInResult?.error) {
        toast.error("Incorrect password");
        return;
      }

      const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not accept this invite");
        return;
      }
      await update();
      window.location.assign("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold">Join {storeName}</h1>
        <p className="text-muted-foreground text-sm">
          Sign in as <strong>{email}</strong> to accept your invite as a {roleLabel}.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Joining…" : "Sign in & join"}
        </Button>
      </form>
    </div>
  );
}

const newAccountSchema = z.object({
  name: z.string().min(2, "Enter your name").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type NewAccountInput = z.infer<typeof newAccountSchema>;

function CreateAccountAndAcceptForm({
  token,
  storeName,
  roleLabel,
  email,
}: {
  token: string;
  storeName: string;
  roleLabel: string;
  email: string;
}) {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewAccountInput>({ resolver: zodResolver(newAccountSchema) });

  async function onSubmit(values: NewAccountInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not accept this invite");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password: values.password,
        redirect: false,
      });
      if (signInResult?.error) {
        toast.success("Account created — please log in.");
        window.location.assign("/login");
        return;
      }

      await update();
      window.location.assign("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold">Join {storeName}</h1>
        <p className="text-muted-foreground text-sm">
          You&apos;ve been invited as a {roleLabel}. Create your account with <strong>{email}</strong> to
          get started.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Creating account…" : `Join ${storeName}`}
        </Button>
      </form>
    </div>
  );
}
