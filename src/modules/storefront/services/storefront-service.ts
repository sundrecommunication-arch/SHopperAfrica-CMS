import "server-only";
import { eq, and, desc, asc, inArray, ilike, or, ne, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  stores,
  categories,
  products,
  productImages,
  productVariants,
  productCategories,
  blogPosts,
  storePolicies,
  storeNavItems,
  faqs,
  orders,
  addresses,
} from "@/db/schema";
import { DEFAULT_NAV_ITEMS } from "@/modules/nav/constants";

export type PublicStore = NonNullable<Awaited<ReturnType<typeof getPublicStoreBySlug>>>;

/** A logged-in customer's own order history (/store/[slug]/account) -- newest first. */
export async function getCustomerOrders(customerId: string) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      fulfillmentStatus: orders.fulfillmentStatus,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));
}

/** A logged-in customer's saved delivery addresses (/store/[slug]/account, checkout) -- default first, then newest. */
export async function getCustomerAddresses(customerId: string) {
  return db
    .select({
      id: addresses.id,
      label: addresses.label,
      line1: addresses.line1,
      city: addresses.city,
      state: addresses.state,
      isDefault: addresses.isDefault,
    })
    .from(addresses)
    .where(eq(addresses.customerId, customerId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export type PublicProductListItem = Awaited<ReturnType<typeof getPublicStoreProducts>>[number];
export type PublicProductDetail = NonNullable<Awaited<ReturnType<typeof getPublicProductBySlug>>>;

/**
 * Resolves a store publicly by its slug.
 */
export async function getPublicStoreBySlug(slug: string) {
  const [store] = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      description: stores.description,
      logoUrl: stores.logoUrl,
      heroImages: stores.heroImages,
      heroShowText: stores.heroShowText,
      heroTextPosition: stores.heroTextPosition,
      contactEmail: stores.contactEmail,
      contactPhone: stores.contactPhone,
      addressText: stores.addressText,
      currency: stores.currency,
      currencySymbol: stores.currencySymbol,
      whatsappNumber: stores.whatsappNumber,
      whatsappEnabled: stores.whatsappEnabled,
      whatsappOrderBehavior: stores.whatsappOrderBehavior,
      themeKey: stores.themeKey,
      primaryColor: stores.primaryColor,
      secondaryColor: stores.secondaryColor,
      isPublished: stores.isPublished,
      poweredByHidden: stores.poweredByHidden,
      customDomain: stores.customDomain,
      domainVerified: stores.domainVerified,
      locale: stores.locale,
      metaTitle: stores.metaTitle,
      metaDescription: stores.metaDescription,
      searchConsoleVerification: stores.searchConsoleVerification,
      llmsTxt: stores.llmsTxt,
    })
    .from(stores)
    .where(eq(stores.slug, slug))
    .limit(1);

  return store ?? null;
}

/**
 * Lists public categories for a store, including active product counts.
 */
export async function getPublicStoreCategories(storeId: string) {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      imageUrl: categories.imageUrl,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.name));

  if (rows.length === 0) return [];

  // Count active products per category
  const activeProductLinks = await db
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .innerJoin(products, eq(products.id, productCategories.productId))
    .where(and(eq(products.storeId, storeId), eq(products.status, "ACTIVE")));

  const countMap = new Map<string, number>();
  for (const link of activeProductLinks) {
    countMap.set(link.categoryId, (countMap.get(link.categoryId) ?? 0) + 1);
  }

  return rows.map((category) => ({
    ...category,
    productCount: countMap.get(category.id) ?? 0,
  }));
}

/**
 * Lists active products for a store with filtering, search, and sorting.
 */
export async function getPublicStoreProducts(
  storeId: string,
  options?: {
    categorySlug?: string;
    search?: string;
    sort?: "newest" | "price_asc" | "price_desc" | "name";
    limit?: number;
  }
) {
  let matchedProductIds: string[] | undefined;

  // Filter by category if slug is provided
  if (options?.categorySlug) {
    const [targetCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.storeId, storeId), eq(categories.slug, options.categorySlug)))
      .limit(1);

    if (!targetCategory) return [];

    const productLinks = await db
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, targetCategory.id));

    matchedProductIds = productLinks.map((p) => p.productId);
    if (matchedProductIds.length === 0) return [];
  }

  const conditions = [
    eq(products.storeId, storeId),
    eq(products.status, "ACTIVE"),
  ];

  if (matchedProductIds) {
    conditions.push(inArray(products.id, matchedProductIds));
  }

  if (options?.search && options.search.trim() !== "") {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.description, term),
        ilike(products.brand, term)
      )!
    );
  }

  const orderClause =
    options?.sort === "price_asc"
      ? asc(products.price)
      : options?.sort === "price_desc"
      ? desc(products.price)
      : options?.sort === "name"
      ? asc(products.name)
      : desc(products.createdAt);

  const query = db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      trackInventory: products.trackInventory,
      inventoryQuantity: products.inventoryQuantity,
      allowBackorder: products.allowBackorder,
      lowStockThreshold: products.lowStockThreshold,
      productType: products.productType,
      brand: products.brand,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(orderClause);

  const productRows = options?.limit ? await query.limit(options.limit) : await query;
  if (productRows.length === 0) return [];

  const ids = productRows.map((p) => p.id);

  // Fetch images for these products
  const images = await db
    .select({
      id: productImages.id,
      productId: productImages.productId,
      url: productImages.url,
      position: productImages.position,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(inArray(productImages.productId, ids));

  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images) {
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }

  return productRows.map((product) => {
    const productImgs = (imagesByProduct.get(product.id) ?? []).sort(
      (a, b) => a.position - b.position
    );
    const primary = productImgs.find((i) => i.isPrimary) ?? productImgs[0];

    return {
      ...product,
      primaryImageUrl: primary?.url ?? null,
      images: productImgs,
    };
  });
}

/**
 * Fetches full details for an active product by slug.
 */
export async function getPublicProductBySlug(storeId: string, slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        eq(products.slug, slug),
        eq(products.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!product) return null;

  const [images, variants, categoryLinks] = await Promise.all([
    db
      .select({
        id: productImages.id,
        url: productImages.url,
        position: productImages.position,
        isPrimary: productImages.isPrimary,
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.position)),
    db
      .select({
        id: productVariants.id,
        name: productVariants.name,
        options: productVariants.options,
        sku: productVariants.sku,
        price: productVariants.price,
        compareAtPrice: productVariants.compareAtPrice,
        inventoryQuantity: productVariants.inventoryQuantity,
        imageUrl: productVariants.imageUrl,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
      .orderBy(asc(productVariants.createdAt)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(eq(productCategories.productId, product.id)),
  ]);

  return {
    ...product,
    images,
    variants,
    categories: categoryLinks,
  };
}

/**
 * Returns related active products in the same store.
 */
export async function getPublicRelatedProducts(
  storeId: string,
  currentProductId: string,
  categoryIds: string[],
  limit = 4
) {
  if (categoryIds.length === 0) {
    return getPublicStoreProducts(storeId, { limit });
  }

  const relatedLinks = await db
    .select({ productId: productCategories.productId })
    .from(productCategories)
    .where(
      and(
        inArray(productCategories.categoryId, categoryIds),
        ne(productCategories.productId, currentProductId)
      )
    )
    .limit(limit * 2);

  const candidateIds = Array.from(new Set(relatedLinks.map((r) => r.productId))).slice(0, limit);

  if (candidateIds.length === 0) {
    const fallback = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.status, "ACTIVE"),
          ne(products.id, currentProductId)
        )
      )
      .limit(limit);
    if (fallback.length === 0) return [];
    candidateIds.push(...fallback.map((f) => f.id));
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      trackInventory: products.trackInventory,
      inventoryQuantity: products.inventoryQuantity,
      allowBackorder: products.allowBackorder,
      lowStockThreshold: products.lowStockThreshold,
      productType: products.productType,
      brand: products.brand,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(and(inArray(products.id, candidateIds), eq(products.status, "ACTIVE")));

  const images = await db
    .select({
      id: productImages.id,
      productId: productImages.productId,
      url: productImages.url,
      position: productImages.position,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(inArray(productImages.productId, candidateIds));

  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images) {
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }

  return productRows.map((product) => {
    const productImgs = (imagesByProduct.get(product.id) ?? []).sort(
      (a, b) => a.position - b.position
    );
    const primary = productImgs.find((i) => i.isPrimary) ?? productImgs[0];
    return {
      ...product,
      primaryImageUrl: primary?.url ?? null,
      images: productImgs,
    };
  });
}

// --- Blog ---------------------------------------------------------------

/**
 * Lists published blog posts for a store, newest first.
 */
export async function getPublicBlogPosts(storeId: string, options?: { limit?: number }) {
  const query = db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.storeId, storeId), eq(blogPosts.status, "PUBLISHED")))
    .orderBy(desc(blogPosts.publishedAt));

  return options?.limit ? query.limit(options.limit) : query;
}

/**
 * Fetches a single published blog post by slug.
 */
export async function getPublicBlogPostBySlug(storeId: string, slug: string) {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.storeId, storeId),
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, "PUBLISHED")
      )
    )
    .limit(1);
  return post ?? null;
}

// --- Store policies (legal pages) ----------------------------------------

/**
 * Lists published store policies — used to decide which legal links to show
 * in the storefront footer/nav (docs: policies are opt-in per store, a
 * merchant must explicitly publish a policy before customers see it).
 */
export async function getPublicStorePolicies(storeId: string) {
  return db
    .select({
      type: storePolicies.type,
      title: storePolicies.title,
    })
    .from(storePolicies)
    .where(and(eq(storePolicies.storeId, storeId), eq(storePolicies.isPublished, true)));
}

/**
 * Fetches a single published policy by type.
 */
export async function getPublicPolicyByType(
  storeId: string,
  type: (typeof storePolicies.$inferSelect)["type"]
) {
  const [policy] = await db
    .select()
    .from(storePolicies)
    .where(
      and(
        eq(storePolicies.storeId, storeId),
        eq(storePolicies.type, type),
        eq(storePolicies.isPublished, true)
      )
    )
    .limit(1);
  return policy ?? null;
}

// --- Storefront navigation ------------------------------------------------

/**
 * Lists the visible nav items for a store's public header/footer, in menu
 * order. A store that has never customized its nav has no rows at all —
 * that gets the default four-item menu. A store that HAS customized but
 * chosen to hide every item gets an empty menu back, deliberately: hiding
 * everything is a valid (if unusual) choice and shouldn't be silently
 * overridden by the default.
 */
export async function getPublicNavItems(storeId: string) {
  const rows = await db
    .select({
      kind: storeNavItems.kind,
      label: storeNavItems.label,
      url: storeNavItems.url,
    })
    .from(storeNavItems)
    .where(and(eq(storeNavItems.storeId, storeId), eq(storeNavItems.isVisible, true)))
    .orderBy(asc(storeNavItems.sortOrder));

  if (rows.length > 0) return rows;

  const [anyRow] = await db
    .select({ id: storeNavItems.id })
    .from(storeNavItems)
    .where(eq(storeNavItems.storeId, storeId))
    .limit(1);

  if (anyRow) return []; // customized, and everything is hidden — respect it

  return DEFAULT_NAV_ITEMS.map(({ kind, label, url }) => ({ kind, label, url }));
}

// --- FAQs ---------------------------------------------------------------

/**
 * The store-wide default FAQ list (no product association) — shown on the
 * storefront home page, and as the fallback on any product page whose
 * product has no FAQs of its own.
 */
export async function getPublicStoreDefaultFaqs(storeId: string) {
  return db
    .select({ id: faqs.id, question: faqs.question, answer: faqs.answer })
    .from(faqs)
    .where(and(eq(faqs.storeId, storeId), isNull(faqs.productId)))
    .orderBy(asc(faqs.sortOrder));
}

/**
 * FAQs for one product's page: that product's own list if it has any,
 * otherwise the store-wide default list. A product's own FAQs replace the
 * default rather than being appended to it.
 */
export async function getPublicFaqsForProduct(storeId: string, productId: string) {
  const productFaqs = await db
    .select({ id: faqs.id, question: faqs.question, answer: faqs.answer })
    .from(faqs)
    .where(and(eq(faqs.storeId, storeId), eq(faqs.productId, productId)))
    .orderBy(asc(faqs.sortOrder));

  if (productFaqs.length > 0) return productFaqs;

  return getPublicStoreDefaultFaqs(storeId);
}
