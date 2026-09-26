import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getPublicStoreBySlug,
  getPublicPolicyByType,
} from "@/modules/storefront/services/storefront-service";
import { POLICY_SLUG_TO_TYPE as POLICY_SLUGS } from "@/modules/storefront/utils/policy-slugs";

interface PolicyPageProps {
  params: Promise<{ slug: string; policyType: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; policyType: string }>;
}): Promise<Metadata> {
  const { slug, policyType } = await params;
  const type = POLICY_SLUGS[policyType];
  if (!type) return { title: "Not Found" };

  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };

  const policy = await getPublicPolicyByType(store.id, type);
  return { title: policy?.title ?? "Policy" };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { slug, policyType } = await params;
  const type = POLICY_SLUGS[policyType];
  if (!type) {
    notFound();
  }

  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const policy = await getPublicPolicyByType(store.id, type);
  if (!policy) {
    notFound();
  }

  const paragraphs = policy.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{policy.title}</h1>
      <div className="flex flex-col gap-4 text-base leading-relaxed">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
