import { getCurrentStore } from "@/lib/tenant";
import { getStorePlan } from "@/modules/subscriptions/services/subscription-service";
import { countProducts } from "@/modules/products/services/product-service";
import { ProductImport } from "@/components/dashboard/products/product-import";

export default async function ImportProductsPage() {
  const { store } = await getCurrentStore();
  const [{ limits }, existing] = await Promise.all([getStorePlan(store.id), countProducts(store.id)]);
  const room = limits.maxProducts === null ? null : Math.max(0, limits.maxProducts - existing);

  return <ProductImport room={room} maxProducts={limits.maxProducts} currencySymbol={store.currencySymbol} />;
}
