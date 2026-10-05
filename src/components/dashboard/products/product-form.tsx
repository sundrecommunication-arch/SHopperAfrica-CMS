"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { z } from "zod";

import {
  productSchema,
  slugify,
  type ProductInput,
  type ProductVariantInput,
} from "@/modules/products/validation/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { VariantEditor } from "./variant-editor";
import { CategoryFormDialog } from "../categories/category-form-dialog";

export interface ProductCategoryOption {
  id: string;
  name: string;
}

// zod's `.default()`/`.coerce()` make the schema's pre-parse ("input") shape
// looser than its parsed ("output") shape — react-hook-form needs both to
// type the form correctly with a zod resolver.
type ProductFormInput = z.input<typeof productSchema>;
type ProductFormOutput = z.output<typeof productSchema>;

const emptyDefaults: ProductInput = {
  name: "",
  slug: "",
  description: "",
  status: "DRAFT",
  productType: "",
  brand: "",
  tags: [],
  price: 0,
  compareAtPrice: null,
  sku: "",
  weight: null,
  trackInventory: true,
  inventoryQuantity: 0,
  allowBackorder: false,
  lowStockThreshold: 3,
  seoTitle: "",
  seoDescription: "",
  categoryIds: [],
  images: [],
  variants: [],
};

export function ProductForm({
  categories,
  initial,
  productId,
}: {
  categories: ProductCategoryOption[];
  initial?: ProductInput;
  productId?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>(initial?.images ?? []);
  const [categoryList, setCategoryList] = useState<ProductCategoryOption[]>(categories);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: (initial ?? emptyDefaults) as ProductFormInput,
  });
  const [formKey, setFormKey] = useState(0);

  const name = useWatch({ control, name: "name" });
  const status = useWatch({ control, name: "status" }) ?? "DRAFT";
  const trackInventory = useWatch({ control, name: "trackInventory" }) ?? true;
  const categoryIds = useWatch({ control, name: "categoryIds" }) ?? [];
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const tags = useWatch({ control, name: "tags" }) ?? [];

  async function onSubmit(values: ProductFormOutput, options?: { addAnother?: boolean }) {
    setIsSubmitting(true);
    try {
      const payload = { ...values, images };
      const res = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save product");
        return;
      }
      if (!productId) {
        if (options?.addAnother) {
          toast.success("Product created. Add another below.");
          reset(emptyDefaults as ProductFormInput);
          setImages([]);
          setShowAdvanced(false);
          setFormKey((k) => k + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          toast.success("Product created.");
          router.push("/dashboard/products");
        }
      } else {
        toast.success("Product updated.");
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleCategory(id: string) {
    const next = categoryIds.includes(id) ? categoryIds.filter((c) => c !== id) : [...categoryIds, id];
    setValue("categoryIds", next);
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{productId ? "Edit product" : "Add product"}</h1>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setValue("status", v as ProductInput["status"])}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          {!productId && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onSubmit(values, { addAnother: true }))}
            >
              {isSubmitting ? "Saving…" : "Save & add another"}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : name ? `Save "${name}"` : "Save product"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              placeholder="e.g. Ankara Print Tote Bag"
              {...register("name", { onChange: (e) => setValue("slug", slugify(e.target.value)) })}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Product URL</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Images</Label>
            <ImageUploader images={images} onChange={setImages} folder="products" label="Add images" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Categories</Label>
              <CategoryFormDialog
                categoryOptions={categoryList}
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="h-auto py-1">
                    <Plus className="size-3.5" />
                    New category
                  </Button>
                }
                onSuccess={(category) => {
                  setCategoryList((prev) => [...prev, category]);
                  setValue("categoryIds", [...categoryIds, category.id]);
                }}
              />
            </div>
            {categoryList.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-md border p-3">
                {categoryList.map((category) => (
                  <label
                    key={category.id}
                    className="has-checked:border-primary has-checked:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                No categories yet — create one without leaving this page.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pb-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
            {errors.price && <p className="text-destructive text-xs">{errors.price.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compareAtPrice">Compare-at price</Label>
            <Input id="compareAtPrice" type="number" step="0.01" min="0" {...register("compareAtPrice")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" {...register("trackInventory")} />
            Track inventory for this product
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inventoryQuantity">Quantity</Label>
              {variants.length > 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Stock is set per option below (
                  {(variants as ProductVariantInput[]).reduce(
                    (sum, v) => sum + (Number(v.inventoryQuantity) || 0),
                    0
                  )}{" "}
                  in total).
                </p>
              ) : (
                <Input
                  id="inventoryQuantity"
                  type="number"
                  min="0"
                  disabled={!trackInventory}
                  {...register("inventoryQuantity")}
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lowStockThreshold">Low stock warning at</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                disabled={!trackInventory}
                {...register("lowStockThreshold")}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" disabled={!trackInventory} {...register("allowBackorder")} />
            Allow customers to order when out of stock
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku")} className="max-w-xs" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>Add options like Color or Size if this product comes in variants.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <VariantEditor
            key={formKey}
            variants={variants as ProductVariantInput[]}
            onChange={(v) => setValue("variants", v)}
          />
        </CardContent>
      </Card>

      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Advanced settings
        </Button>
      </div>

      {showAdvanced && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 sm:max-w-xs">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" step="0.001" min="0" {...register("weight")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pb-6 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="productType">Product type</Label>
                <Input id="productType" {...register("productType")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register("brand")} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  defaultValue={tags.join(", ")}
                  onChange={(e) =>
                    setValue(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoTitle">SEO title</Label>
                <Input id="seoTitle" {...register("seoTitle")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoDescription">SEO description</Label>
                <Textarea id="seoDescription" rows={2} {...register("seoDescription")} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </form>
  );
}
