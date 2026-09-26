import { getCurrentStore } from "@/lib/tenant";
import { listNavItems } from "@/modules/nav/services/nav-service";
import { listProducts } from "@/modules/products/services/product-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { NavItemsManager } from "@/components/dashboard/nav/nav-items-manager";

export default async function NavPage() {
  const { store } = await getCurrentStore();
  const [items, products, categories] = await Promise.all([
    listNavItems(store.id),
    listProducts(store.id),
    listCategories(store.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Navigation</h1>
        <p className="text-muted-foreground text-sm">
          Reorder, rename, or hide the menu shown on your storefront. Home, Products, Blog, and
          Contact Us stay linked to their built-in pages — renaming them here only changes what
          customers see, not where the link goes. Add your own links to a specific product,
          category, or any other page.
        </p>
      </div>
      <NavItemsManager
        storeSlug={store.slug}
        products={products
          .filter((p) => p.status === "ACTIVE")
          .map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        initialItems={items.map((item) => ({
          kind: item.kind,
          label: item.label,
          url: item.url,
          isVisible: item.isVisible,
        }))}
      />
    </div>
  );
}
