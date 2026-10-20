import { getCurrentStore } from "@/lib/tenant";
import { listStorePaymentProviders } from "@/modules/payments/services/payment-service";
import {
  getStripeConnection,
  getStripeSetup,
  refreshStripeConnection,
  stripeEligibility,
} from "@/modules/payments/services/stripe-connect-service";
import { stripeConfigured } from "@/modules/payments/adapters/stripe-adapter";
import { getStorePlan } from "@/modules/subscriptions/services/subscription-service";
import { getCountry } from "@/modules/regions/countries";
import { PaymentMethodsForm } from "@/components/dashboard/payments/payment-methods-form";
import { StripeConnectCard } from "@/components/dashboard/payments/stripe-connect-card";
import { StripeKeysCard } from "@/components/dashboard/payments/stripe-keys-card";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string; stripe_error?: string }>;
}) {
  const { store, role } = await getCurrentStore();
  const sp = await searchParams;

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

  // Card payments: Paystack/PayDunya for African stores, Stripe for UK/US/Canada.
  // Stripe via the merchant's own key, unless Shopper has a platform account
  // (STRIPE_SECRET_KEY) for Stripe Connect.
  const usesStripe = getCountry(store.country).cardProvider === "STRIPE";
  const platformConnect = stripeConfigured();
  let stripeError = sp.stripe_error ?? null;
  if (usesStripe && platformConnect && sp.stripe === "return") {
    // Back from Stripe's onboarding: read the account's status now rather
    // than waiting for the webhook.
    await refreshStripeConnection(store.id).catch((error) => {
      console.error("stripe status refresh failed", error);
      stripeError = "Couldn't check your Stripe account just now. Try \"Check again\" in a moment.";
    });
  }

  const [allProviders, connection, keysSetup, plan] = await Promise.all([
    listStorePaymentProviders(store.id),
    usesStripe && platformConnect ? getStripeConnection(store.id) : null,
    usesStripe ? getStripeSetup(store.id) : null,
    usesStripe ? getStorePlan(store.id) : null,
  ]);
  // The Stripe row holds the merchant's key; it has its own card and must
  // not be sent to the browser with the other providers.
  const providers = allProviders.filter((p) => p.type !== "STRIPE");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const stripeBlocked =
    usesStripe &&
    (stripeEligibility(store) ??
      (plan && !plan.limits.onlinePayments ? "Card payments are included on the Starter and Business plans. See Billing to upgrade." : null));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <p className="text-muted-foreground text-sm">
          Set up how your customers can pay for orders in {store.name}.
        </p>
      </div>

      {usesStripe &&
        (platformConnect && !keysSetup ? (
          <StripeConnectCard blockedReason={stripeBlocked || null} connection={connection} error={stripeError} />
        ) : (
          <StripeKeysCard
            blockedReason={stripeBlocked || null}
            setup={keysSetup}
            webhookUrl={`${appUrl}/api/payments/webhooks/stripe?store=${store.id}`}
          />
        ))}

      <PaymentMethodsForm initialProviders={providers} cardProvider={getCountry(store.country).cardProvider} />
    </div>
  );
}
