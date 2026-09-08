"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createStoreSchema,
  slugify,
  type CreateStoreInput,
} from "@/modules/stores/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateStoreForm() {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateStoreInput>({ resolver: zodResolver(createStoreSchema) });

  const name = useWatch({ control, name: "name" });

  async function onSubmit(values: CreateStoreInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Could not create your store");
        return;
      }

      toast.success("Your store is ready.");
      await update(); // refresh the session so it picks up the new store membership
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">What&apos;s your store name?</Label>
        <Input
          id="name"
          placeholder="e.g. Heart of Creativity Boutique"
          {...register("name", {
            onChange: (e) => setValue("slug", slugify(e.target.value)),
          })}
        />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Store URL</Label>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">shopper.app/store/</span>
          <Input id="slug" {...register("slug")} />
        </div>
        {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsappNumber">WhatsApp number (optional)</Label>
        <Input id="whatsappNumber" placeholder="+234..." {...register("whatsappNumber")} />
        <p className="text-muted-foreground text-xs">
          You can turn on WhatsApp checkout anytime from Store settings.
        </p>
      </div>
      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Creating your store…" : name ? `Create "${name}"` : "Create my store"}
      </Button>
    </form>
  );
}
