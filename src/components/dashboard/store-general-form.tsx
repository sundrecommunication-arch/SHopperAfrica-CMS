"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  updateStoreGeneralSchema,
  type UpdateStoreGeneralInput,
} from "@/modules/stores/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StoreGeneralForm({ defaultValues }: { defaultValues: UpdateStoreGeneralInput }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateStoreGeneralInput>({
    resolver: zodResolver(updateStoreGeneralSchema),
    defaultValues,
  });

  async function onSubmit(values: UpdateStoreGeneralInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stores/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save changes");
        return;
      }
      toast.success("Store settings saved.");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Store name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input id="contactEmail" type="email" {...register("contactEmail")} />
        {errors.contactEmail && (
          <p className="text-destructive text-xs">{errors.contactEmail.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input id="contactPhone" {...register("contactPhone")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsappNumber">WhatsApp number</Label>
        <Input id="whatsappNumber" placeholder="+234..." {...register("whatsappNumber")} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register("whatsappEnabled")} />
        Let customers check out through WhatsApp
      </label>
      <Button type="submit" disabled={isSubmitting} className="mt-2 self-start">
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
