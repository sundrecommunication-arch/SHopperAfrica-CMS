import { getCurrentStore } from "@/lib/tenant";
import { listCategories } from "@/modules/categories/services/category-service";
import { ProductForm } from "@/components/dashboard/products/product-form";

export default async function NewProductPage() {
  const { store } = await getCurrentStore();
  const categories = await listCategories(store.id);

  return <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />;
}
