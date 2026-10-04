import "server-only";
import { eq, and, desc, count, inArray, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import {
  stores,
  customers,
  orders,
  orderItems,
  payments,
  paymentProviders,
  products,
  productVariants,
  addresses,
  discounts,
  discountUsages,
  fulfillmentStatusEnum,
  paymentStatusEnum,
} from "@/db/schema";

type FulfillmentStatus = (typeof fulfillmentStatusEnum.enumValues)[number];
type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
import {
  createOrderSchema,
  updateOrderStatusSchema,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
} from "../validation/schemas";
import { buildCartWhatsAppUrl } from "@/modules/storefront/utils/whatsapp";

export class OrderServiceError extends Error {}

/**
 * Creates an order from a customer storefront checkout.
 * Enforces server-side price calculation and inventory validation.
 */
export async function createStorefrontOrder(input: CreateOrderInput) {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    throw new OrderServiceError(
      parsed.error.issues[0]?.message ?? "Invalid checkout details"
    );
  }

  const data = parsed.data;

  // 1. Resolve store
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.slug, data.storeSlug))
    .limit(1);

  if (!store) {
    throw new OrderServiceError("Store not found");
  }

  // 2. Fetch authoritative products and variants from DB
  const productIds = data.items.map((i) => i.productId);
  const dbProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, store.id), inArray(products.id, productIds)));

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const variantIds = data.items
    .map((i) => i.variantId)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const dbVariants =
    variantIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.id, variantIds))
      : [];

  const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

  // 3. Validate items & calculate authoritative line totals
  const validatedItems: {
    productId: string;
    variantId?: string | null;
    productName: string;
    variantName?: string | null;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
    numPrice: number;
    trackInventory: boolean;
    allowBackorder: boolean;
    inventoryQuantity: number;
  }[] = [];

  let calculatedSubtotal = 0;

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== "ACTIVE") {
      throw new OrderServiceError(`Product "${item.productId}" is not available`);
    }

    let unitPrice = parseFloat(product.price);
    let variantName: string | null = null;
    let availableStock = product.inventoryQuantity;

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.productId !== product.id) {
        throw new OrderServiceError(`Selected option is invalid for ${product.name}`);
      }
      if (variant.price) {
        unitPrice = parseFloat(variant.price);
      }
      variantName = variant.name;
      availableStock = variant.inventoryQuantity;
    }

    // Check inventory
    if (product.trackInventory && !product.allowBackorder) {
      if (availableStock < item.quantity) {
        throw new OrderServiceError(
          `Insufficient stock for "${product.name}${variantName ? ` (${variantName})` : ""}". Available: ${availableStock}`
        );
      }
    }

    const lineTotalNum = unitPrice * item.quantity;
    calculatedSubtotal += lineTotalNum;

    validatedItems.push({
      productId: product.id,
      variantId: item.variantId || null,
      productName: product.name,
      variantName,
      unitPrice: String(unitPrice),
      quantity: item.quantity,
      lineTotal: String(lineTotalNum),
      numPrice: unitPrice,
      trackInventory: product.trackInventory,
      allowBackorder: product.allowBackorder,
      inventoryQuantity: availableStock,
    });
  }

  // 3b. Validate discount code if provided
  let calculatedDiscount = 0;
  let activeDiscountRecord: typeof discounts.$inferSelect | null = null;

  if (data.discountCode && data.discountCode.trim()) {
    const [disc] = await db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.storeId, store.id),
          eq(discounts.code, data.discountCode.toUpperCase().trim()),
          eq(discounts.isActive, true)
        )
      )
      .limit(1);

    if (disc) {
      const isExpired = disc.expiresAt && new Date(disc.expiresAt) < new Date();
      const reachedLimit =
        disc.usageLimit !== null && disc.usageCount >= disc.usageLimit;
      const belowMin =
        disc.minOrderAmount && calculatedSubtotal < parseFloat(disc.minOrderAmount);

      if (!isExpired && !reachedLimit && !belowMin) {
        activeDiscountRecord = disc;
        const val = parseFloat(disc.value);
        if (disc.type === "PERCENTAGE") {
          calculatedDiscount = (calculatedSubtotal * val) / 100;
        } else {
          calculatedDiscount = Math.min(val, calculatedSubtotal);
        }
      }
    }
  }

  const subtotalStr = String(calculatedSubtotal);
  const discountStr = String(Math.round(calculatedDiscount * 100) / 100);
  const finalTotalNum = Math.max(0, calculatedSubtotal - calculatedDiscount);
  const totalStr = String(finalTotalNum);

  // 4. Execute atomic transaction
  return db.transaction(async (tx) => {
    // 4a. Upsert or find customer
    let [customer] = await tx
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.storeId, store.id),
          eq(customers.phone, data.customerPhone.trim())
        )
      )
      .limit(1);

    if (customer) {
      const [updated] = await tx
        .update(customers)
        .set({
          name: data.customerName.trim(),
          email: data.customerEmail?.trim() || customer.email,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))
        .returning();
      customer = updated;
    } else {
      const [newCust] = await tx
        .insert(customers)
        .values({
          storeId: store.id,
          name: data.customerName.trim(),
          phone: data.customerPhone.trim(),
          email: data.customerEmail?.trim() || null,
        })
        .returning();
      customer = newCust;
    }

    // Save customer address
    await tx.insert(addresses).values({
      customerId: customer.id,
      line1: data.deliveryAddress.trim(),
      city: data.city.trim(),
      state: data.state?.trim() || null,
      country: "Nigeria",
      isDefault: true,
    });

    // 4b. Generate sequential human-readable order number
    const [orderCountRow] = await tx
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.storeId, store.id));
    const nextNum = (orderCountRow?.value ?? 0) + 1;
    const orderNumber = `QS-${1000 + nextNum}`;

    // 4c. Format WhatsApp message
    const fullDeliveryAddress = `${data.deliveryAddress.trim()}, ${data.city.trim()}${data.state ? `, ${data.state.trim()}` : ""}`;
    const whatsappOrderMsg = buildCartWhatsAppUrl({
      whatsappNumber: store.whatsappNumber || "",
      storeName: store.name,
      currencySymbol: store.currencySymbol,
      items: validatedItems.map((v) => ({
        name: v.productName,
        variantName: v.variantName,
        price: v.numPrice,
        quantity: v.quantity,
      })),
      customerName: data.customerName.trim(),
      deliveryAddress: fullDeliveryAddress,
    });

    // Determine payment method label
    const paymentLabel =
      data.paymentMethodType === "CASH_ON_DELIVERY"
        ? "Cash on Delivery"
        : data.paymentMethodType === "WHATSAPP"
        ? "WhatsApp Order"
        : data.paymentMethodType === "PAYSTACK"
        ? "Paystack Online Payment"
        : data.paymentMethodType === "PAYDUNYA"
        ? "Online Payment (PayDunya)"
        : "Bank Transfer";

    // 4d. Insert order
    const [order] = await tx
      .insert(orders)
      .values({
        storeId: store.id,
        orderNumber,
        customerId: customer.id,
        fulfillmentStatus: "NEW",
        paymentStatus: "PENDING",
        checkoutChannel: data.checkoutChannel,
        subtotal: subtotalStr,
        discountAmount: discountStr,
        shippingAmount: "0",
        taxAmount: "0",
        total: totalStr,
        paymentMethod: paymentLabel,
        deliveryAddressText: fullDeliveryAddress,
        customerNotes: data.customerNotes?.trim() || null,
        whatsappMessage: whatsappOrderMsg,
      })
      .returning();

    // Log discount usage if applied
    if (activeDiscountRecord) {
      await tx.insert(discountUsages).values({
        discountId: activeDiscountRecord.id,
        orderId: order.id,
        customerId: customer.id,
      });

      await tx
        .update(discounts)
        .set({
          usageCount: activeDiscountRecord.usageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(discounts.id, activeDiscountRecord.id));
    }

    // 4e. Insert order items
    await tx.insert(orderItems).values(
      validatedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      }))
    );

    // 4f. Decrement inventory
    for (const item of validatedItems) {
      if (item.trackInventory) {
        if (item.variantId) {
          const v = variantMap.get(item.variantId);
          if (v) {
            await tx
              .update(productVariants)
              .set({
                inventoryQuantity: Math.max(0, v.inventoryQuantity - item.quantity),
                updatedAt: new Date(),
              })
              .where(eq(productVariants.id, item.variantId));
          }
        } else {
          const p = productMap.get(item.productId);
          if (p) {
            await tx
              .update(products)
              .set({
                inventoryQuantity: Math.max(0, p.inventoryQuantity - item.quantity),
                updatedAt: new Date(),
              })
              .where(eq(products.id, item.productId));
          }
        }
      }
    }

    // 4g. Create payment transaction record
    await tx.insert(payments).values({
      orderId: order.id,
      storeId: store.id,
      amount: totalStr,
      currency: store.currency,
      status: "PENDING",
      transactionReference: `${orderNumber}-TX`,
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      currencySymbol: store.currencySymbol,
      whatsappMessageUrl: whatsappOrderMsg,
      paymentMethod: paymentLabel,
    };
  });
}

/**
 * Public order receipt query for customer confirmation screen.
 */
export async function getPublicOrderReceipt(storeSlug: string, orderNumber: string) {
  const [store] = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      currencySymbol: stores.currencySymbol,
      whatsappNumber: stores.whatsappNumber,
      whatsappEnabled: stores.whatsappEnabled,
    })
    .from(stores)
    .where(eq(stores.slug, storeSlug))
    .limit(1);

  if (!store) return null;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, store.id), eq(orders.orderNumber, orderNumber)))
    .limit(1);

  if (!order) return null;

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
    .limit(1);

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  // Get active manual bank transfer config if applicable
  const [bankProvider] = await db
    .select()
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.storeId, store.id),
        eq(paymentProviders.type, "MANUAL"),
        eq(paymentProviders.isEnabled, true)
      )
    )
    .limit(1);

  return {
    store,
    order,
    customer,
    items,
    bankDetails: bankProvider?.config as Record<string, string> | undefined,
  };
}

/**
 * Lists orders for the merchant dashboard.
 */
export async function listStoreOrders(
  storeId: string,
  filters?: {
    fulfillmentStatus?: string;
    paymentStatus?: string;
    search?: string;
    from?: Date | null;
    to?: Date | null;
  }
) {
  const conditions = [eq(orders.storeId, storeId)];

  if (filters?.fulfillmentStatus) {
    conditions.push(eq(orders.fulfillmentStatus, filters.fulfillmentStatus as FulfillmentStatus));
  }
  if (filters?.paymentStatus) {
    conditions.push(eq(orders.paymentStatus, filters.paymentStatus as PaymentStatus));
  }
  if (filters?.from) {
    conditions.push(gte(orders.createdAt, filters.from));
  }
  if (filters?.to) {
    conditions.push(lte(orders.createdAt, filters.to));
  }

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      fulfillmentStatus: orders.fulfillmentStatus,
      paymentStatus: orders.paymentStatus,
      checkoutChannel: orders.checkoutChannel,
      paymentMethod: orders.paymentMethod,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));

  if (filters?.search && filters.search.trim()) {
    const term = filters.search.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.orderNumber.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term) ||
        r.customerPhone.includes(term)
    );
  }

  return rows;
}

/**
 * Fetches full order detail for merchant dashboard.
 */
export async function getOrderById(storeId: string, orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) return null;

  const [customer, items, paymentList] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1).then((r) => r[0] ?? null),
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
  ]);

  return {
    order,
    customer,
    items,
    payments: paymentList,
  };
}

/**
 * Updates fulfillment and/or payment status for an order.
 */
export async function updateOrderStatus(
  storeId: string,
  orderId: string,
  input: UpdateOrderStatusInput
) {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new OrderServiceError(parsed.error.issues[0]?.message ?? "Invalid status update");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.fulfillmentStatus) {
    updateData.fulfillmentStatus = parsed.data.fulfillmentStatus;
  }
  if (parsed.data.paymentStatus) {
    updateData.paymentStatus = parsed.data.paymentStatus;
  }

  const [updated] = await db
    .update(orders)
    .set(updateData)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .returning();

  if (!updated) {
    throw new OrderServiceError("Order not found");
  }

  // Update payments record status if payment status changed
  if (parsed.data.paymentStatus) {
    const txStatus =
      parsed.data.paymentStatus === "PAID"
        ? ("SUCCEEDED" as const)
        : parsed.data.paymentStatus === "FAILED"
        ? ("FAILED" as const)
        : parsed.data.paymentStatus === "REFUNDED" || parsed.data.paymentStatus === "PARTIALLY_REFUNDED"
        ? ("REFUNDED" as const)
        : ("PENDING" as const);

    await db
      .update(payments)
      .set({
        status: txStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.orderId, orderId), eq(payments.storeId, storeId)));
  }

  return updated;
}
