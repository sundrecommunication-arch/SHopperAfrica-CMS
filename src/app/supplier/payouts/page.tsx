import { requireApprovedSupplierPage } from "../supplier-page";
import { getPayoutAccount } from "@/modules/dropship/services/payout-service";
import { PayoutAccountForm } from "@/components/dropship/payout-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SupplierPayoutsPage() {
  const supplier = await requireApprovedSupplierPage();
  const account = await getPayoutAccount({ supplierId: supplier.id });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Where you get paid</CardTitle>
        <CardDescription>
          When a customer pays for your product, your price is sent straight to this account by Paystack — usually the next
          working day. You don&apos;t need to chase anyone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PayoutAccountForm
          saveEndpoint="/api/supplier/payout"
          existing={account ? { bankName: account.bankName, accountName: account.accountName, accountNumberLast4: account.accountNumberLast4 } : null}
        />
      </CardContent>
    </Card>
  );
}
