import { FolderTree, Plus } from "lucide-react";
import { getCurrentStore } from "@/lib/tenant";
import { listCategories } from "@/modules/categories/services/category-service";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { CategoriesTable } from "@/components/dashboard/categories/categories-table";
import { CategoryFormDialog } from "@/components/dashboard/categories/category-form-dialog";

export default async function CategoriesPage() {
  const { store } = await getCurrentStore();
  const categories = await listCategories(store.id);
  const options = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <CategoryFormDialog
          categoryOptions={options}
          trigger={
            <Button>
              <Plus className="size-4" /> Add category
            </Button>
          }
        />
      </div>
      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet."
          description="Organize your products into categories customers can browse."
        />
      ) : (
        <CategoriesTable categories={categories} />
      )}
    </div>
  );
}
