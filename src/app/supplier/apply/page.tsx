import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSupplierForUser } from "@/modules/dropship/services/supplier-service";
import { SupplierApplicationForm } from "@/components/dropship/supplier-application-form";

export default async function SupplierApplyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup?callbackUrl=/supplier/apply");
  const existing = await getSupplierForUser(session.user.id);
  if (existing?.status === "SUSPENDED") redirect("/supplier");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{existing ? "Your supplier details" : "Become a Shopper supplier"}</h1>
        <p className="text-sm text-muted-foreground">
          Online stores on Shopper sell your products. You deliver to their customers and get paid automatically for every
          order. Takes about 3 minutes.
        </p>
      </div>
      <SupplierApplicationForm
        initial={
          existing
            ? {
                businessName: existing.businessName,
                phone: existing.phone,
                state: existing.state,
                address: existing.address ?? "",
                description: existing.description ?? "",
                deliveryAreas: existing.deliveryAreas,
                deliveryDays: existing.deliveryDays,
              }
            : null
        }
      />
    </div>
  );
}
