import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to manage your store.</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
