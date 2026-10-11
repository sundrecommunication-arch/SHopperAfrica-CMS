import { getCurrentStore } from "@/lib/tenant";
import { listProducts } from "@/modules/products/services/product-service";
import { BulkPhotoUpload } from "@/components/dashboard/products/bulk-photo-upload";

export default async function BulkPhotosPage() {
  const { store } = await getCurrentStore();
  const products = await listProducts(store.id);

  return (
    <BulkPhotoUpload
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        hasPhoto: Boolean(p.primaryImageUrl),
      }))}
    />
  );
}
