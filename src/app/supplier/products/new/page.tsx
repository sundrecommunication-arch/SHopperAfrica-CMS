import { requireApprovedSupplierPage } from "../../supplier-page";
import { SupplierProductForm } from "@/components/dropship/supplier-product-form";

export default async function NewSupplierProductPage() {
  await requireApprovedSupplierPage();
  return <SupplierProductForm />;
}
