import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupplierForUser } from "@/modules/dropship/services/supplier-service";

/** For supplier pages that need an approved account; others are sent to the overview, which explains. */
export async function requireApprovedSupplierPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/supplier");
  const supplier = await getSupplierForUser(session.user.id);
  if (!supplier) redirect("/supplier/apply");
  if (supplier.status !== "APPROVED") redirect("/supplier");
  return supplier;
}
