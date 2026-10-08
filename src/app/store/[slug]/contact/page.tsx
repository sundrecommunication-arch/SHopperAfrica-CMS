import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefrontI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import {
  getPublicStoreBySlug,
  getPublicStorePolicies,
} from "@/modules/storefront/services/storefront-service";
import { formatWhatsAppPhone } from "@/modules/storefront/utils/whatsapp";
import { POLICY_TYPE_TO_SLUG as POLICY_URL_SLUGS } from "@/modules/storefront/utils/policy-slugs";

interface ContactPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };
  const { t } = await getStorefrontI18n(store.locale);
  return {
    title: t("contact.title"),
    description: t("contact.metaDescription", { store: store.name }),
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const [policies, { t }] = await Promise.all([
    getPublicStorePolicies(store.id),
    getStorefrontI18n(store.locale),
  ]);
  const whatsappPhone = store.whatsappNumber ? formatWhatsAppPhone(store.whatsappNumber) : null;

  const hasContactInfo = store.contactEmail || store.contactPhone || store.addressText;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("contact.title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("contact.intro", { store: store.name })}</p>

      {hasContactInfo ? (
        <div className="mb-10 flex flex-col gap-4 rounded-lg border p-6">
          {store.contactEmail && (
            <a
              href={`mailto:${store.contactEmail}`}
              className="flex items-center gap-3 text-sm hover:text-foreground"
            >
              <Mail className="size-5 shrink-0 text-muted-foreground" />
              {store.contactEmail}
            </a>
          )}
          {store.contactPhone && (
            <a
              href={`tel:${store.contactPhone}`}
              className="flex items-center gap-3 text-sm hover:text-foreground"
            >
              <Phone className="size-5 shrink-0 text-muted-foreground" />
              {store.contactPhone}
            </a>
          )}
          {store.addressText && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="size-5 shrink-0 text-muted-foreground" />
              <span>{store.addressText}</span>
            </div>
          )}
          {store.whatsappEnabled && whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--store-primary)] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:brightness-90 transition-all"
            >
              <MessageCircle className="size-4" />
              {t("contact.chat")}
            </a>
          )}
        </div>
      ) : (
        <p className="mb-10 text-sm text-muted-foreground">
          {t("contact.noDetails")}
        </p>
      )}

      {policies.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("contact.policies")}
          </h2>
          <ul className="flex flex-col gap-2">
            {policies.map((policy) => (
              <li key={policy.type}>
                <Link
                  href={`/store/${slug}/policies/${POLICY_URL_SLUGS[policy.type]}`}
                  className="text-sm hover:underline"
                >
                  {policy.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
