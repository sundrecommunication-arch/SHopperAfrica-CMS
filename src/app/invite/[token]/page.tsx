import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getInviteByToken } from "@/modules/stores/services/staff-service";
import { AcceptInviteForm } from "@/components/invite/accept-invite-form";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <Image src="/logo-mark.png" alt="Shopper" width={28} height={28} className="size-7" priority />
          Shopper
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {!invite ? (
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-xl font-semibold">Invite not found</h1>
              <p className="text-muted-foreground text-sm">
                This invite link is invalid or has expired. Ask the store owner to send a new one.
              </p>
            </div>
          ) : (
            <AcceptInviteForm
              token={token}
              storeName={invite.storeName}
              role={invite.role}
              email={invite.email}
              accountExists={invite.accountExists}
              signedInEmail={session?.user?.email ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
