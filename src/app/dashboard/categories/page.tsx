import { FolderTree } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <EmptyState icon={FolderTree} title="No categories yet." description="Organize your products into categories customers can browse." />
    </div>
  );
}
