"use client";

import { useEffect, useState } from "react";
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
import { COUNTRIES, getCountry } from "@/modules/regions/countries";

export function CreateStoreForm() {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateStoreInput>({ resolver: zodResolver(createStoreSchema), defaultValues: { country: "NG" } });

  const name = useWatch({ control, name: "name" });
  const country = getCountry(useWatch({ control, name: "country" }));

  // Visitors who came through a country page (/sell-online/uk etc.) start
  // with that country picked.
  useEffect(() => {
    try {
      const remembered = localStorage.getItem("shopper_country");
      if (remembered && COUNTRIES.some((c) => c.code === remembered)) setValue("country", remembered);
    } catch {
      // storage blocked -- the default stays
    }
  }, [setValue]);

  async function onSubmit(values: CreateStoreInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error ?? "Could not create your store");
        setIsSubmitting(false);
        return;
      }

      toast.success("Your store is ready.");
      // Refresh the session so it picks up the new store membership, then do a
      // full navigation (not router.push) so the dashboard's server component
      // reads the freshly-updated session cookie instead of a cached RSC tree.
      await update();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional: router.push() here can render the dashboard from a stale RSC tree captured before the session cookie above was updated.
      window.location.assign("/dashboard");
    } catch (error) {
      console.error("create store failed", error);
      toast.error("Something went wrong creating your store. Please try again.");
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
        <Label htmlFor="country">Where is your business?</Label>
        <select
          id="country"
          {...register("country")}
          className="border-input focus-visible:ring-ring h-9 rounded-md border bg-transparent px-3 text-base shadow-sm outline-none focus-visible:ring-2 md:text-sm"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">Sets your currency ({country.currency}) and tax. You can change these later.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsappNumber">WhatsApp number (optional)</Label>
        <Input id="whatsappNumber" placeholder={`${country.dialCode}...`} {...register("whatsappNumber")} />
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
