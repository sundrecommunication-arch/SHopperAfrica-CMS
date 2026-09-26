import "server-only";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { storePolicies } from "@/db/schema";
import { policySchema, policyTypes, type PolicyInput, type PolicyType } from "../validation/schemas";

export class PolicyServiceError extends Error {}

/**
 * Starter templates for each policy type — generic, clearly-editable
 * placeholder text, NOT a finished legal document. Every policy is stored
 * with isPublished defaulting to false (see schema), so a merchant must
 * open, review/edit, and deliberately publish before customers ever see it.
 * We are not a law firm — this is scaffolding to save merchants from a
 * blank page, the same way site-builders ship editable policy templates.
 */
const STARTER_TEMPLATES: Record<PolicyType, { title: string; content: string }> = {
  PRIVACY_POLICY: {
    title: "Privacy Policy",
    content: `This Privacy Policy explains how [Store Name] ("we", "us") collects, uses, and protects your information when you visit or shop with us.

Information we collect
We collect information you provide directly, such as your name, email address, shipping address, phone number, and payment details when you place an order or contact us. We also collect basic usage data, such as pages visited, to help us improve the store.

How we use your information
We use your information to process and fulfill orders, communicate with you about your order or account, respond to inquiries, and improve our products and services. We do not sell your personal information to third parties.

Sharing your information
We share information with service providers who help us run our store — for example, payment processors and delivery partners — only to the extent needed to provide their service to us.

Data retention and security
We retain order and account information for as long as needed to provide our services and meet legal obligations, and we take reasonable measures to protect your information from unauthorized access.

Your rights
You may contact us at any time to ask what information we hold about you, to request a correction, or to request deletion, subject to any records we are required to keep by law.

Contact us
If you have questions about this Privacy Policy, contact us at [contact email].

Last updated: [date]`,
  },
  RETURN_POLICY: {
    title: "Return Policy",
    content: `We want you to be happy with your purchase. If something isn't right, here's how returns work at [Store Name].

Return window
You may request a return within [14] days of receiving your order. Items must be unused, in their original packaging, and in the same condition you received them.

How to start a return
Contact us at [contact email] or [contact phone] with your order number and the reason for the return. We'll confirm whether the item is eligible and let you know the next steps.

Refunds
Once we receive and inspect the returned item, we'll notify you of the approval status. Approved refunds are issued to your original payment method within [5-10] business days.

Non-returnable items
Some items may not be eligible for return, such as final sale items, perishable goods, or personalized products. Any such exclusions will be noted on the product page.

Damaged or incorrect items
If your order arrives damaged or you received the wrong item, contact us right away and we'll arrange a replacement or refund at no extra cost to you.

Last updated: [date]`,
  },
  SHIPPING_POLICY: {
    title: "Shipping / Delivery Information",
    content: `Here's what to expect when you order from [Store Name].

Processing time
Orders are typically processed within [1-3] business days. You'll receive a confirmation email once your order has shipped.

Shipping methods and rates
We offer the following shipping options: [list shipping methods and rates, e.g. Standard Delivery — 3-5 business days]. Exact rates are calculated at checkout based on your delivery address.

Delivery estimates
Estimated delivery times are [3-7] business days from the ship date, depending on your location. These are estimates, not guarantees, and can vary due to factors outside our control.

Order tracking
Once your order ships, we'll send you a tracking number so you can follow its progress.

International shipping
[We currently ship within (country/region) only. / We ship internationally to select countries — see checkout for availability.] Customers are responsible for any customs duties or import taxes charged by their country.

Lost or delayed packages
If your order hasn't arrived within the estimated window, contact us at [contact email] and we'll help track it down.

Last updated: [date]`,
  },
  TERMS_OF_SERVICE: {
    title: "Terms of Service",
    content: `These Terms of Service ("Terms") govern your use of [Store Name] and any purchases you make with us. By placing an order, you agree to these Terms.

Orders and payment
All orders are subject to acceptance and availability. Prices are listed in [currency] and may change without notice, though changes won't affect orders already placed. Payment is required in full at the time of order unless otherwise stated.

Product descriptions
We do our best to describe and display our products accurately, but we don't guarantee that descriptions, images, or other content are error-free, complete, or current.

Use of this site
You agree to use this site for lawful purposes only and not to misuse it in any way that could damage, disable, or impair the site or interfere with anyone else's use of it.

Limitation of liability
To the fullest extent permitted by law, [Store Name] is not liable for any indirect, incidental, or consequential damages arising from your use of the site or products purchased through it.

Changes to these terms
We may update these Terms from time to time. Continued use of the site after changes are posted means you accept the updated Terms.

Contact us
Questions about these Terms can be sent to [contact email].

Last updated: [date]`,
  },
};

export function getStarterTemplate(type: PolicyType) {
  return STARTER_TEMPLATES[type];
}

/**
 * Lists all four policy types for a store, merging saved rows with the
 * starter template for any type that hasn't been created yet — so the
 * dashboard always shows all four editable slots, none of them published
 * until a merchant explicitly saves them that way.
 */
export async function listPolicies(storeId: string) {
  const rows = await db.select().from(storePolicies).where(eq(storePolicies.storeId, storeId));
  const byType = new Map(rows.map((r) => [r.type, r]));

  return policyTypes.map((type) => {
    const existing = byType.get(type);
    if (existing) return existing;
    const template = STARTER_TEMPLATES[type];
    return {
      id: null,
      storeId,
      type,
      title: template.title,
      content: template.content,
      isPublished: false,
      updatedAt: null,
    };
  });
}

export async function upsertPolicy(storeId: string, type: PolicyType, input: PolicyInput) {
  const parsed = policySchema.safeParse(input);
  if (!parsed.success) {
    throw new PolicyServiceError(parsed.error.issues[0]?.message ?? "Invalid policy data");
  }
  const data = parsed.data;

  const [existing] = await db
    .select({ id: storePolicies.id })
    .from(storePolicies)
    .where(and(eq(storePolicies.storeId, storeId), eq(storePolicies.type, type)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(storePolicies)
      .set({
        title: data.title,
        content: data.content,
        isPublished: data.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(storePolicies.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(storePolicies)
    .values({
      storeId,
      type,
      title: data.title,
      content: data.content,
      isPublished: data.isPublished,
    })
    .returning();
  return created;
}
