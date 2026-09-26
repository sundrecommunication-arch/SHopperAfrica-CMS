"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { categorySchema, slugify, type CategoryInput } from "@/modules/categories/validation/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader, type UploadedImage } from "../products/image-uploader";

export interface CategoryOption {
  id: string;
  name: string;
}

const emptyDefaults: CategoryInput = { name: "", slug: "", description: "", parentId: null, imageUrl: "" };

export function CategoryFormDialog({
  trigger,
  categoryOptions,
  initial,
  onSuccess,
}: {
  trigger: React.ReactNode;
  categoryOptions: CategoryOption[];
  initial?: (CategoryInput & { id: string }) | null;
  onSuccess?: (category: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<UploadedImage[]>(
    initial?.imageUrl ? [{ url: initial.imageUrl, isPrimary: true }] : []
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial ?? emptyDefaults,
  });

  const parentId = useWatch({ control, name: "parentId" });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset(initial ?? emptyDefaults);
      setImage(initial?.imageUrl ? [{ url: initial.imageUrl, isPrimary: true }] : []);
    }
  }

  async function onSubmit(values: CategoryInput) {
    setIsSubmitting(true);
    try {
      const payload = { ...values, imageUrl: image[0]?.url ?? "" };
      const res = await fetch(initial ? `/api/categories/${initial.id}` : "/api/categories", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save category");
        return;
      }
      toast.success(initial ? "Category updated." : "Category created.");
      setOpen(false);
      if (data?.category) {
        onSuccess?.(data.category);
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name", { onChange: (e) => setValue("slug", slugify(e.target.value)) })}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">URL</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          {categoryOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Parent category</Label>
              <Select
                value={parentId ?? "none"}
                onValueChange={(value) => setValue("parentId", value === "none" ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categoryOptions
                    .filter((c) => c.id !== initial?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Image</Label>
            <ImageUploader images={image} onChange={setImage} folder="categories" multiple={false} label="Add image" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : initial ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
