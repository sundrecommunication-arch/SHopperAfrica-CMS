import { getCurrentStore } from "@/lib/tenant";
import { getPayoutAccount } from "@/modules/dropship/services/payout-service";
import {
  listCatalog,
  listCatalogCategories,
  listStoreDropshipProducts,
} from "@/modules/dropship/services/catalog-service";
import { DropshipCatalog } from "@/components/dropship/dropship-catalog";
import { PayoutAccountForm } from "@/components/dropship/payout-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DropshippingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { store, role } = await getCurrentStore();
  const { q, category } = await searchParams;

  if (store.currency !== "NGN") {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Dropshipping</CardTitle>
          <CardDescription>Dropshipping is available for stores selling in Naira (₦) for now. More countries soon.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [payout, catalog, categories, mine] = await Promise.all([
    getPayoutAccount({ storeId: store.id }),
    listCatalog({ storeId: store.id, search: q, category }),
    listCatalogCategories(),
    listStoreDropshipProducts(store.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dropshipping</h1>
        <p className="text-sm text-muted-foreground">
          Sell products from trusted Shopper suppliers without buying stock. You set your price — when a customer orders, the
          supplier delivers it and your profit is paid to you automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Pick products", "Browse the catalog below and tap “Add to my store”. Photos and details are copied for you."],
          ["2", "Share your store", "Customers order and pay online like any other product."],
          ["3", "Supplier delivers", "The supplier ships to your customer. Your profit lands in your bank — nothing for you to do."],
        ].map(([n, title, body]) => (
          <div key={n} className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">
              <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
              {title}
            </p>
            <p className="mt-1 text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      {(!payout || role === "OWNER") && (
        <Card className={payout ? "" : "border-primary/40"}>
          <CardHeader>
            <CardTitle className="text-base">{payout ? "Where your profit is paid" : "First: where should we send your profit?"}</CardTitle>
            <CardDescription>
              Customers pay online; Paystack sends the supplier their price and your profit straight to this account,
              usually the next working day. Paystack&apos;s fee (about 1.5% + ₦100) comes out of your share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {role === "OWNER" ? (
              <PayoutAccountForm
                saveEndpoint="/api/dropship/payout"
                existing={payout ? { bankName: payout.bankName, accountName: payout.accountName, accountNumberLast4: payout.accountNumberLast4 } : null}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Ask the store owner to add the store&apos;s bank account here first.</p>
            )}
          </CardContent>
        </Card>
      )}

      <DropshipCatalog
        products={catalog}
        categories={categories}
        search={q ?? ""}
        category={category ?? ""}
        canAdd={Boolean(payout) && role !== "STAFF"}
        mine={mine.map((m) => ({
          id: m.id,
          name: m.name,
          price: Number(m.price),
          wholesalePrice: Number(m.wholesalePrice),
          stock: m.stock,
          status: m.status,
          supplierName: m.supplierName,
          available: m.available,
        }))}
      />
    </div>
  );
}
