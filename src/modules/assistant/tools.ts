import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { stores, products, productImages } from "@/db/schema";
import { LOCALES } from "@/i18n/config";
import { createStoreForUser, updateStoreGeneral, StoreServiceError } from "@/modules/stores/services/store-service";
import { slugify } from "@/modules/stores/validation/schemas";
import {
  importProducts,
  getProductForEdit,
  updateProduct,
  listProducts,
  ProductServiceError,
} from "@/modules/products/services/product-service";
import { createCategory, listCategories, CategoryServiceError } from "@/modules/categories/services/category-service";
import { slugify as slugifyProduct } from "@/modules/products/validation/schemas";
import { createDeliveryOption, listDeliveryOptions, ShippingServiceError } from "@/modules/shipping/services/shipping-service";
import { createDiscount, listStoreDiscounts, DiscountServiceError } from "@/modules/discounts/services/discount-service";
import { upsertPolicy, listPolicies, PolicyServiceError } from "@/modules/policies/services/policy-service";
import { saveFaqs, listFaqs, FaqServiceError } from "@/modules/faqs/services/faq-service";
import {
  upsertPaymentProvider,
  listStorePaymentProviders,
  PaymentServiceError,
} from "@/modules/payments/services/payment-service";
import { getStorePlan, SubscriptionServiceError } from "@/modules/subscriptions/services/subscription-service";
import { PLANS } from "@/modules/subscriptions/plans";
import { policyTypes } from "@/modules/policies/validation/schemas";
import { COUNTRIES, COUNTRY_CODES, getCountry } from "@/modules/regions/countries";

// Tools the AI setup assistant can call. Every write goes through the same
// service functions (and validation, plan limits, slug rules) as the
// dashboard -- the assistant never writes to the database on its own terms.
// Secret keys (Paystack etc.) are deliberately out of reach.

export interface AssistantContext {
  userId: string;
  store: { id: string; slug: string; name: string; currency: string; currencySymbol: string } | null;
  role: "OWNER" | "MANAGER" | "STAFF" | null;
}

/** A failure Claude should read and explain to the merchant (validation, plan limits...). */
export class ToolUserError extends Error {}

const KNOWN_ERRORS = [
  StoreServiceError,
  ProductServiceError,
  CategoryServiceError,
  ShippingServiceError,
  DiscountServiceError,
  PolicyServiceError,
  FaqServiceError,
  PaymentServiceError,
  SubscriptionServiceError,
  ToolUserError,
];
export const isKnownToolError = (e: unknown): e is Error => KNOWN_ERRORS.some((C) => e instanceof C);

function requireStore(ctx: AssistantContext) {
  if (!ctx.store) throw new ToolUserError("There's no store yet. Create the store first (create_store).");
  if (ctx.role === "STAFF") throw new ToolUserError("Only the store owner or a manager can change the store.");
  return ctx.store;
}

const optStr = (max: number) => z.string().trim().max(max).optional();

interface AssistantTool<S extends z.ZodTypeAny> {
  definition: Anthropic.Beta.BetaTool;
  schema: S;
  /** Short present-tense label for the chat's activity chip. */
  label: (input: z.infer<S>) => string;
  run: (input: z.infer<S>, ctx: AssistantContext) => Promise<unknown>;
}

function tool<S extends z.ZodTypeAny>(t: AssistantTool<S>) {
  return t;
}

const linkTo = (path: string) => path; // paths are rendered as links in the chat

// --- Read ----------------------------------------------------------------------------

const getOverview = tool({
  definition: {
    name: "get_store_overview",
    description:
      "Get the merchant's current store setup: profile, plan and limits, products (first 30), categories, delivery options, payment methods, discount codes, policies, FAQs and a setup checklist. Call this at the start of a conversation and whenever you need fresh facts. Returns has_store=false if they haven't created a store yet.",
    input_schema: { type: "object", properties: {} },
  },
  schema: z.object({}),
  label: () => "Checking your store",
  run: async (_input, ctx) => {
    if (!ctx.store) return { has_store: false };
    const storeId = ctx.store.id;
    const [[store], plan, productRows, categories, delivery, payments, discounts, policies, faqRows, [withPhotos]] = await Promise.all([
      db.select().from(stores).where(eq(stores.id, storeId)).limit(1),
      getStorePlan(storeId),
      listProducts(storeId),
      listCategories(storeId),
      listDeliveryOptions(storeId),
      listStorePaymentProviders(storeId),
      listStoreDiscounts(storeId),
      listPolicies(storeId),
      listFaqs(storeId, null),
      db
        .select({ n: count() })
        .from(products)
        .where(and(eq(products.storeId, storeId), sql`exists (select 1 from ${productImages} where ${productImages.productId} = ${products.id})`)),
    ]);
    const enabledPayments = payments.filter((p) => p.isEnabled).map((p) => p.type);
    const publishedPolicies = policies.filter((p) => p.isPublished).map((p) => p.type);
    return {
      has_store: true,
      store: {
        name: store.name,
        link: `/store/${store.slug}`,
        description: store.description,
        published: store.isPublished,
        currency: store.currency,
        country: getCountry(store.country).name,
        tax: Number(store.taxRate) > 0
          ? { label: store.taxLabel, rate_percent: Number(store.taxRate), prices_include_tax: store.pricesIncludeTax }
          : "none",
        card_payments_via: {
          STRIPE: "Stripe (merchant pastes their own Stripe key at /dashboard/payments)",
          PAYDUNYA: "PayDunya: mobile money and cards (merchant adds PayDunya keys at /dashboard/payments)",
          PAYSTACK: "Paystack (merchant adds keys at /dashboard/payments)",
        }[getCountry(store.country).cardProvider],
        whatsapp_number: store.whatsappNumber,
        whatsapp_orders_on: store.whatsappEnabled,
        contact_email: store.contactEmail,
        contact_phone: store.contactPhone,
        address: store.addressText,
        brand_color: store.primaryColor,
        language: store.locale,
        has_logo: Boolean(store.logoUrl),
        banner_images: store.heroImages?.length ?? 0,
      },
      plan: {
        name: PLANS[plan.plan].name,
        max_products: plan.limits.maxProducts ?? "unlimited",
        online_card_payments_allowed: plan.limits.onlinePayments,
      },
      products: {
        total: productRows.length,
        with_photos: withPhotos.n,
        first_30: productRows.slice(0, 30).map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          stock: p.inventoryQuantity,
          status: p.status,
          has_photo: Boolean(p.primaryImageUrl),
        })),
      },
      categories: categories.map((c) => c.name),
      delivery_options: delivery.map((d) => ({ name: d.name, fee: d.amount, free_above: d.freeAboveAmount })),
      payment_methods_enabled: enabledPayments,
      discount_codes: discounts.map((d) => ({ code: d.code, type: d.type, value: Number(d.value), active: d.isActive })),
      policies_published: publishedPolicies,
      store_faqs: faqRows.map((f) => ({ question: f.question, answer: f.answer })),
      checklist: {
        has_products: productRows.length > 0,
        all_products_have_photos: productRows.length > 0 && withPhotos.n === productRows.length,
        has_delivery_options: delivery.length > 0,
        has_payment_method: enabledPayments.length > 0,
        has_return_policy: publishedPolicies.includes("RETURN_POLICY"),
        whatsapp_set: Boolean(store.whatsappNumber),
        published: store.isPublished,
      },
    };
  },
});

const listProductsTool = tool({
  definition: {
    name: "list_products",
    description: "List the store's products (id, name, price, stock, status), optionally filtered by a search word. Use it to find a product id before update_product.",
    input_schema: {
      type: "object",
      properties: { search: { type: "string", description: "Optional word to filter product names" } },
    },
  },
  schema: z.object({ search: optStr(100) }),
  label: () => "Looking at your products",
  run: async ({ search }, ctx) => {
    const store = requireStore(ctx);
    const rows = await listProducts(store.id);
    const term = search?.toLowerCase();
    return rows
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .slice(0, 100)
      .map((p) => ({ id: p.id, name: p.name, price: Number(p.price), stock: p.inventoryQuantity, status: p.status, has_photo: Boolean(p.primaryImageUrl) }));
  },
});

// --- Store ---------------------------------------------------------------------------

const createStoreTool = tool({
  definition: {
    name: "create_store",
    description:
      "Create the merchant's store. Only when get_store_overview says has_store=false, and after the merchant has agreed on the store name. The store link is generated from the name unless you pass a slug.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Store name, e.g. \"Adunni Fashion House\"" },
        slug: { type: "string", description: "Optional store link name: lowercase letters, numbers, hyphens" },
        whatsapp_number: { type: "string", description: "Optional WhatsApp number for orders, e.g. 08012345678" },
        country: {
          type: "string",
          enum: COUNTRY_CODES,
          description: `Where the business is (sets currency and tax defaults): ${COUNTRIES.map((c) => `${c.code}=${c.name}`).join(", ")}. Default NG.`,
        },
      },
      required: ["name"],
    },
  },
  schema: z.object({
    name: z.string().trim().min(2).max(100),
    slug: optStr(60),
    whatsapp_number: optStr(30),
    country: z.enum(COUNTRY_CODES).optional(),
  }),
  label: (i) => `Creating "${i.name}"`,
  run: async (input, ctx) => {
    if (ctx.store) throw new ToolUserError("This merchant already has a store; update it instead.");
    const base = slugify(input.slug || input.name) || "my-store";
    let slug = base;
    for (let n = 2; ; n++) {
      const [taken] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1);
      if (!taken) break;
      slug = `${base}-${n}`;
    }
    const store = await createStoreForUser(ctx.userId, {
      name: input.name,
      slug,
      whatsappNumber: input.whatsapp_number ?? "",
      country: input.country,
    });
    ctx.store = { id: store.id, slug: store.slug, name: store.name, currency: store.currency, currencySymbol: store.currencySymbol };
    ctx.role = "OWNER";
    return { created: true, name: store.name, link: `/store/${store.slug}`, dashboard: linkTo("/dashboard") };
  },
});

const updateProfile = tool({
  definition: {
    name: "update_store_profile",
    description: "Update the store's name, description (shown on the storefront), contact email/phone, WhatsApp number (and whether customers can order on WhatsApp) and address. Only pass fields that change.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string", description: "1-3 sentences, max 500 characters" },
        contact_email: { type: "string" },
        contact_phone: { type: "string" },
        whatsapp_number: { type: "string" },
        whatsapp_orders_on: { type: "boolean", description: "Let customers send orders to WhatsApp" },
        address: { type: "string", description: "Business address or area" },
      },
    },
  },
  schema: z.object({
    name: optStr(100),
    description: optStr(500),
    contact_email: optStr(200),
    contact_phone: optStr(30),
    whatsapp_number: optStr(30),
    whatsapp_orders_on: z.boolean().optional(),
    address: optStr(300),
  }),
  label: () => "Updating your store details",
  run: async (input, ctx) => {
    const { id } = requireStore(ctx);
    const [s] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
    const whatsappNumber = input.whatsapp_number ?? s.whatsappNumber ?? "";
    await updateStoreGeneral(id, {
      name: input.name ?? s.name,
      description: input.description ?? s.description ?? "",
      contactEmail: input.contact_email ?? s.contactEmail ?? "",
      contactPhone: input.contact_phone ?? s.contactPhone ?? "",
      whatsappNumber,
      whatsappEnabled: input.whatsapp_orders_on ?? (input.whatsapp_number ? true : s.whatsappEnabled),
    });
    if (input.address !== undefined) {
      await db.update(stores).set({ addressText: input.address || null, updatedAt: new Date() }).where(eq(stores.id, id));
    }
    return { updated: Object.keys(input) };
  },
});

const updateAppearance = tool({
  definition: {
    name: "update_store_appearance",
    description:
      "Set the store's brand colour (hex like #16a34a), storefront language, whether the store name/description card shows on the banner, and the Google search title/description. Only pass fields that change.",
    input_schema: {
      type: "object",
      properties: {
        brand_color: { type: "string", description: "Hex colour, e.g. #c2185b" },
        language: { type: "string", enum: [...LOCALES], description: "en, fr, pt, sw, ha (Hausa), yo (Yoruba), ig (Igbo), ar" },
        show_name_on_banner: { type: "boolean" },
        seo_title: { type: "string", description: "Max 70 characters" },
        seo_description: { type: "string", description: "Max 160 characters" },
      },
    },
  },
  schema: z.object({
    brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #16a34a").optional(),
    language: z.enum(LOCALES).optional(),
    show_name_on_banner: z.boolean().optional(),
    seo_title: optStr(70),
    seo_description: optStr(160),
  }),
  label: () => "Styling your store",
  run: async (input, ctx) => {
    const { id } = requireStore(ctx);
    await db
      .update(stores)
      .set({
        ...(input.brand_color && { primaryColor: input.brand_color }),
        ...(input.language && { locale: input.language }),
        ...(input.show_name_on_banner !== undefined && { heroShowText: input.show_name_on_banner }),
        ...(input.seo_title !== undefined && { metaTitle: input.seo_title || null }),
        ...(input.seo_description !== undefined && { metaDescription: input.seo_description || null }),
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id));
    return { updated: Object.keys(input) };
  },
});

const publishStore = tool({
  definition: {
    name: "set_store_published",
    description: "Make the store visible to customers (published=true) or hide it. Only publish after the merchant agrees.",
    input_schema: { type: "object", properties: { published: { type: "boolean" } }, required: ["published"] },
  },
  schema: z.object({ published: z.boolean() }),
  label: (i) => (i.published ? "Publishing your store" : "Hiding your store"),
  run: async ({ published }, ctx) => {
    const store = requireStore(ctx);
    await db.update(stores).set({ isPublished: published, updatedAt: new Date() }).where(eq(stores.id, store.id));
    return { published, link: `/store/${store.slug}` };
  },
});

// --- Catalog -------------------------------------------------------------------------

const addProducts = tool({
  definition: {
    name: "add_products",
    description:
      "Add one or more products (up to 50 per call). Write a short, appealing description for each if the merchant didn't give one. Categories named here are created automatically. Photos can't be added in chat: afterwards, point the merchant to /dashboard/products/photos.",
    input_schema: {
      type: "object",
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "number", description: "Selling price in the store's currency, e.g. 15000" },
              description: { type: "string" },
              compare_at_price: { type: "number", description: "Optional old price shown crossed out (must be higher)" },
              stock: { type: "integer", description: "How many are available (default 0)" },
              category: { type: "string", description: "Optional category name, e.g. Dresses" },
              visible: { type: "boolean", description: "Show in the store now (default true)" },
            },
            required: ["name", "price"],
          },
        },
      },
      required: ["products"],
    },
  },
  schema: z.object({
    products: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(200),
          price: z.number().min(0),
          description: z.string().max(5000).optional(),
          compare_at_price: z.number().min(0).nullable().optional(),
          stock: z.number().int().min(0).optional(),
          category: optStr(100),
          visible: z.boolean().optional(),
        })
      )
      .min(1)
      .max(50),
  }),
  label: (i) => `Adding ${i.products.length} product${i.products.length === 1 ? "" : "s"}`,
  run: async ({ products: items }, ctx) => {
    const store = requireStore(ctx);
    const result = await importProducts(
      store.id,
      items.map((p, i) => ({
        line: i + 1,
        name: p.name,
        price: p.price,
        description: p.description ?? "",
        compareAtPrice: p.compare_at_price && p.compare_at_price > p.price ? p.compare_at_price : null,
        stock: p.stock ?? 0,
        sku: "",
        categories: p.category ? [p.category] : [],
        status: p.visible === false ? "DRAFT" : "ACTIVE",
        brand: "",
        tags: [],
      })),
      true
    );
    return {
      added: result.products.map((p) => ({ id: p.id, name: p.name, status: p.status })),
      new_categories: result.createdCategories,
      add_photos_at: "/dashboard/products/photos",
    };
  },
});

const updateProductTool = tool({
  definition: {
    name: "update_product",
    description: "Change an existing product's name, price, old price, description, stock or visibility. Get the id from list_products or get_store_overview. Only pass fields that change.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        name: { type: "string" },
        price: { type: "number" },
        compare_at_price: { type: ["number", "null"], description: "Old price shown crossed out, or null to remove" },
        description: { type: "string" },
        stock: { type: "integer" },
        visible: { type: "boolean" },
      },
      required: ["product_id"],
    },
  },
  schema: z.object({
    product_id: z.string().min(1),
    name: optStr(200),
    price: z.number().min(0).optional(),
    compare_at_price: z.number().min(0).nullable().optional(),
    description: z.string().max(5000).optional(),
    stock: z.number().int().min(0).optional(),
    visible: z.boolean().optional(),
  }),
  label: (i) => `Updating ${i.name ? `"${i.name}"` : "a product"}`,
  run: async (input, ctx) => {
    const store = requireStore(ctx);
    const current = await getProductForEdit(store.id, input.product_id);
    if (!current) throw new ToolUserError("Product not found. Use list_products to get the right id.");
    const { product, images, variants, categoryIds } = current;
    const name = input.name ?? product.name;
    await updateProduct(store.id, product.id, {
      name,
      slug: product.slug,
      description: input.description ?? product.description ?? "",
      status: input.visible === undefined ? product.status : input.visible ? "ACTIVE" : "DRAFT",
      productType: product.productType ?? "",
      brand: product.brand ?? "",
      tags: product.tags ?? [],
      price: input.price ?? Number(product.price),
      compareAtPrice: input.compare_at_price !== undefined ? input.compare_at_price : product.compareAtPrice ? Number(product.compareAtPrice) : null,
      sku: product.sku ?? "",
      weight: product.weight ? Number(product.weight) : null,
      trackInventory: product.trackInventory,
      inventoryQuantity: input.stock ?? product.inventoryQuantity,
      allowBackorder: product.allowBackorder,
      lowStockThreshold: product.lowStockThreshold,
      seoTitle: product.seoTitle ?? "",
      seoDescription: product.seoDescription ?? "",
      categoryIds,
      images: images.map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary })),
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        options: v.options,
        sku: v.sku ?? "",
        price: v.price ? Number(v.price) : null,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        inventoryQuantity: v.inventoryQuantity,
        imageUrl: v.imageUrl ?? "",
      })),
    });
    return { updated: product.id, name };
  },
});

const createCategoryTool = tool({
  definition: {
    name: "create_category",
    description: "Create a product category (collection), e.g. \"New arrivals\". Not needed for categories passed to add_products.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" }, description: { type: "string" } },
      required: ["name"],
    },
  },
  schema: z.object({ name: z.string().trim().min(1).max(100), description: optStr(500) }),
  label: (i) => `Creating category "${i.name}"`,
  run: async ({ name, description }, ctx) => {
    const store = requireStore(ctx);
    const existing = await listCategories(store.id);
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { exists: true, name };
    let slug = slugifyProduct(name) || "category";
    for (let n = 2; existing.some((c) => c.slug === slug); n++) slug = `${slugifyProduct(name)}-${n}`;
    const category = await createCategory(store.id, { name, slug, description: description ?? "", parentId: null, imageUrl: "" });
    return { created: category.name };
  },
});

// --- Selling -----------------------------------------------------------------------------

const addDelivery = tool({
  definition: {
    name: "add_delivery_option",
    description: "Add a delivery option customers choose at checkout: a name (area or method, e.g. \"Lagos Mainland\", \"Outside Lagos\", \"Pickup\"), a fee, and optionally free delivery above an order amount.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        fee: { type: "number", description: "Delivery fee, 0 for free (e.g. pickup)" },
        free_above: { type: "number", description: "Optional: free delivery when the order is at least this amount" },
      },
      required: ["name", "fee"],
    },
  },
  schema: z.object({ name: z.string().trim().min(2).max(100), fee: z.number().min(0), free_above: z.number().positive().nullable().optional() }),
  label: (i) => `Adding delivery "${i.name}"`,
  run: async ({ name, fee, free_above }, ctx) => {
    const store = requireStore(ctx);
    await createDeliveryOption(store.id, { name, amount: fee, freeAboveAmount: free_above ?? null });
    return { added: name, fee };
  },
});

const createDiscountTool = tool({
  definition: {
    name: "create_discount_code",
    description: "Create a discount code customers enter at checkout.",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "e.g. WELCOME10" },
        type: { type: "string", enum: ["PERCENTAGE", "FIXED"] },
        value: { type: "number", description: "Percent (e.g. 10) or fixed amount (e.g. 2000)" },
        min_order: { type: "number", description: "Optional minimum order amount" },
        usage_limit: { type: "integer", description: "Optional total number of uses" },
        expires_on: { type: "string", description: "Optional end date, YYYY-MM-DD" },
      },
      required: ["code", "type", "value"],
    },
  },
  schema: z.object({
    code: z.string().trim().min(2).max(40),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().positive(),
    min_order: z.number().min(0).nullable().optional(),
    usage_limit: z.number().int().positive().nullable().optional(),
    expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  }),
  label: (i) => `Creating code ${i.code.toUpperCase()}`,
  run: async (input, ctx) => {
    const store = requireStore(ctx);
    if (input.type === "PERCENTAGE" && input.value > 90) throw new ToolUserError("A percentage discount must be 90% or less.");
    const d = await createDiscount(store.id, {
      code: input.code,
      type: input.type,
      value: input.value,
      minOrderAmount: input.min_order ?? null,
      usageLimit: input.usage_limit ?? null,
      expiresAt: input.expires_on ? new Date(`${input.expires_on}T23:59:59`).toISOString() : null,
      isActive: true,
    });
    return { created: d.code };
  },
});

const savePolicy = tool({
  definition: {
    name: "save_policy",
    description:
      "Write and save a store policy page: RETURN_POLICY, SHIPPING_POLICY, PRIVACY_POLICY or TERMS_OF_SERVICE. Write clear, plain-language content tailored to the merchant's answers (return window, who pays return delivery, delivery times, contact). Not legal advice; keep it simple.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: [...policyTypes] },
        title: { type: "string" },
        content: { type: "string", description: "The full policy text (plain text, short paragraphs)" },
        publish: { type: "boolean", description: "Show it on the storefront (default true)" },
      },
      required: ["type", "title", "content"],
    },
  },
  schema: z.object({
    type: z.enum(policyTypes),
    title: z.string().trim().min(2).max(200),
    content: z.string().trim().min(10).max(20000),
    publish: z.boolean().optional(),
  }),
  label: (i) => `Writing your ${i.title.toLowerCase()}`,
  run: async ({ type, title, content, publish }, ctx) => {
    const store = requireStore(ctx);
    await upsertPolicy(store.id, type, { title, content, isPublished: publish ?? true });
    return { saved: type, published: publish ?? true };
  },
});

const setFaqs = tool({
  definition: {
    name: "set_store_faqs",
    description:
      "Replace the store's FAQ list (shown on the storefront). This REPLACES the whole list: include existing questions (from get_store_overview) you want to keep.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] },
        },
      },
      required: ["items"],
    },
  },
  schema: z.object({
    items: z.array(z.object({ question: z.string().trim().min(1).max(200), answer: z.string().trim().min(1).max(2000) })).max(50),
  }),
  label: (i) => `Saving ${i.items.length} FAQs`,
  run: async ({ items }, ctx) => {
    const store = requireStore(ctx);
    await saveFaqs(store.id, null, items);
    return { saved: items.length };
  },
});

const setPayments = tool({
  definition: {
    name: "set_payment_methods",
    description:
      "Turn on payment methods that don't need secret keys: bank transfer (with the account details customers pay into), cash on delivery, and ordering on WhatsApp. Card payments via Paystack need the merchant's secret key, which must never be shared in chat: send them to /dashboard/payments for that.",
    input_schema: {
      type: "object",
      properties: {
        bank_transfer: {
          type: "object",
          properties: {
            bank_name: { type: "string" },
            account_number: { type: "string" },
            account_name: { type: "string" },
          },
          required: ["bank_name", "account_number", "account_name"],
        },
        cash_on_delivery: { type: "boolean" },
        whatsapp_orders: { type: "boolean" },
      },
    },
  },
  schema: z.object({
    bank_transfer: z
      .object({
        bank_name: z.string().trim().min(2).max(100),
        account_number: z.string().trim().regex(/^\d{6,20}$/, "Account number should be digits only"),
        account_name: z.string().trim().min(2).max(150),
      })
      .optional(),
    cash_on_delivery: z.boolean().optional(),
    whatsapp_orders: z.boolean().optional(),
  }),
  label: () => "Setting up payment methods",
  run: async (input, ctx) => {
    const store = requireStore(ctx);
    const done: string[] = [];
    if (input.bank_transfer) {
      await upsertPaymentProvider(store.id, {
        type: "MANUAL",
        label: "Bank Transfer",
        isEnabled: true,
        config: {
          bankName: input.bank_transfer.bank_name,
          accountNumber: input.bank_transfer.account_number,
          accountName: input.bank_transfer.account_name,
        },
      });
      done.push("bank transfer");
    }
    if (input.cash_on_delivery !== undefined) {
      await upsertPaymentProvider(store.id, { type: "CASH_ON_DELIVERY", label: "Cash on Delivery", isEnabled: input.cash_on_delivery, config: {} });
      done.push(`cash on delivery ${input.cash_on_delivery ? "on" : "off"}`);
    }
    if (input.whatsapp_orders !== undefined) {
      await upsertPaymentProvider(store.id, { type: "WHATSAPP", label: "Order on WhatsApp", isEnabled: input.whatsapp_orders, config: {} });
      done.push(`WhatsApp ordering ${input.whatsapp_orders ? "on" : "off"}`);
    }
    return { updated: done };
  },
});

// Fixed order: the tool list is part of the cached prompt prefix.
const setTax = tool({
  definition: {
    name: "set_tax",
    description:
      "Set the sales tax / VAT shown on orders: its name (e.g. VAT, Sales tax, GST/HST), rate in percent (0 = no tax), and whether the store's prices already include it (UK/EU style) or tax is added at checkout (US/Canada style). Only set a rate the merchant has confirmed -- don't guess tax rates for them.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Tax name shown to customers, e.g. VAT" },
        rate_percent: { type: "number", description: "e.g. 20 for 20%. 0 turns tax off." },
        prices_include_tax: { type: "boolean", description: "true if product prices already include the tax" },
      },
      required: ["rate_percent", "prices_include_tax"],
    },
  },
  schema: z.object({
    label: optStr(30),
    rate_percent: z.number().min(0).max(50),
    prices_include_tax: z.boolean(),
  }),
  label: (i) => (i.rate_percent > 0 ? `Setting ${i.label ?? "tax"} to ${i.rate_percent}%` : "Turning tax off"),
  run: async (input, ctx) => {
    const store = requireStore(ctx);
    await db
      .update(stores)
      .set({
        taxRate: input.rate_percent.toFixed(2),
        ...(input.label && { taxLabel: input.label }),
        pricesIncludeTax: input.prices_include_tax,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, store.id));
    return { saved: true, rate_percent: input.rate_percent, prices_include_tax: input.prices_include_tax };
  },
});

const ALL = [
  getOverview,
  listProductsTool,
  createStoreTool,
  updateProfile,
  updateAppearance,
  publishStore,
  addProducts,
  updateProductTool,
  createCategoryTool,
  addDelivery,
  createDiscountTool,
  savePolicy,
  setFaqs,
  setPayments,
  setTax,
] as AssistantTool<z.ZodTypeAny>[];

/** Tool definitions for the API request (streamed inputs: validated with zod before running). */
export const assistantToolDefinitions: Anthropic.Beta.BetaToolUnion[] = ALL.map((t) => ({
  ...t.definition,
  eager_input_streaming: true,
}));

export function findAssistantTool(name: string) {
  return ALL.find((t) => t.definition.name === name);
}


