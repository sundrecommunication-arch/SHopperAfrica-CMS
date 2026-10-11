import { notFound } from "next/navigation";
import { requireApprovedSupplierPage } from "../../supplier-page";
import { getSupplierProduct } from "@/modules/dropship/services/supplier-service";
import { SupplierProductForm } from "@/components/dropship/supplier-product-form";

export default async function EditSupplierProductPage({ params }: { params: Promise<{ id: string }> }) {
  const supplier = await requireApprovedSupplierPage();
  const { id } = await params;
  const p = await getSupplierProduct(supplier.id, id);
  if (!p) notFound();
  return (
    <SupplierProductForm
      productId={p.id}
      initial={{
        name: p.name,
        description: p.description ?? "",
        images: p.images,
        category: p.category ?? "",
        wholesalePrice: Number(p.wholesalePrice),
        suggestedPrice: p.suggestedPrice ? Number(p.suggestedPrice) : null,
        stock: p.stock,
        sku: p.sku ?? "",
        isActive: p.isActive,
      }}
    />
  );
}
