import { getCurrentStore } from "@/lib/tenant";
import { listStorePaymentProviders } from "@/modules/payments/services/payment-service";
import { PaymentMethodsForm } from "@/components/dashboard/payments/payment-methods-form";

export default async function PaymentsPage() {
  const { store } = await getCurrentStore();
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
