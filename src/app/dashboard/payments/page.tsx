import { getCurrentStore } from "@/lib/tenant";
import { listStorePaymentProviders } from "@/modules/payments/services/payment-service";
import { PaymentMethodsForm } from "@/components/dashboard/payments/payment-methods-form";

export default async function PaymentsPage() {
  const { store, role } = await getCurrentStore();

  // Provider config carries live secret keys (Paystack secret key, PayDunya
  // master/private keys). Blocking the page itself for STAFF -- not just the
  // save API -- matters here because the form pre-fills those raw values
  // into the page payload on load, before anyone clicks Save.
  if (role === "STAFF") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Payment Methods</h1>
          <p className="text-muted-foreground text-sm">
            Only the store owner or a manager can view or change payment settings.
          </p>
        </div>
      </div>
    );
  }

  const providers = await listStorePaymentProviders(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <p className="text-muted-foreground text-sm">
          Set up how your customers can pay for orders in {store.name}.
        </p>
      </div>

      <PaymentMethodsForm initialProviders={providers} />
    </div>
  );
}
