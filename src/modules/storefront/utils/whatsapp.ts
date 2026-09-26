export interface CartItemOrder {
  name: string;
  variantName?: string | null;
  quantity: number;
  price: number;
}

/**
 * Normalizes phone numbers to clean international WhatsApp format (digits only).
 */
export function formatWhatsAppPhone(phone: string): string {
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If local Nigerian number starting with '0' (e.g. 08012345678), convert to 2348012345678
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Builds a direct WhatsApp order message for a single product.
 */
export function buildProductWhatsAppUrl(options: {
  whatsappNumber: string;
  storeName: string;
  productName: string;
  variantName?: string | null;
  price: number;
  quantity: number;
  currencySymbol: string;
  productUrl?: string;
}): string {
  const phone = formatWhatsAppPhone(options.whatsappNumber);
  const total = options.price * options.quantity;

  const lines = [
    `*Hello ${options.storeName}!* 👋`,
    `I'd like to order:`,
    ``,
    `🛍️ *${options.productName}*`,
    options.variantName ? `Option: ${options.variantName}` : null,
    `Quantity: ${options.quantity}`,
    `Price: ${options.currencySymbol}${options.price.toLocaleString()}`,
    `*Total: ${options.currencySymbol}${total.toLocaleString()}*`,
    options.productUrl ? `\nProduct Link: ${options.productUrl}` : null,
    ``,
    `Please let me know how to proceed with payment and delivery. Thank you!`,
  ].filter((line): line is string => line !== null);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Builds a WhatsApp order message for multiple cart items.
 */
export function buildCartWhatsAppUrl(options: {
  whatsappNumber: string;
  storeName: string;
  items: CartItemOrder[];
  currencySymbol: string;
  customerName?: string;
  deliveryAddress?: string;
}): string {
  const phone = formatWhatsAppPhone(options.whatsappNumber);
  const subtotal = options.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const lines: (string | null)[] = [
    `*🛍️ NEW ORDER — ${options.storeName}*`,
    options.customerName ? `Customer: ${options.customerName}` : null,
    ``,
    `*Items:*`,
  ];

  for (const item of options.items) {
    const itemTitle = item.variantName ? `${item.name} (${item.variantName})` : item.name;
    const itemTotal = item.price * item.quantity;
    lines.push(`• ${item.quantity} × ${itemTitle} — ${options.currencySymbol}${itemTotal.toLocaleString()}`);
  }

  lines.push(
    ``,
    `*Subtotal: ${options.currencySymbol}${subtotal.toLocaleString()}*`
  );

  if (options.deliveryAddress) {
    lines.push(`Delivery Address: ${options.deliveryAddress}`);
  }

  lines.push(
    ``,
    `Please confirm item availability and provide payment details.`
  );

  const text = encodeURIComponent(lines.filter((l): l is string => l !== null).join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}

export interface AbandonedCartNudgeItem {
  name: string;
  variantName?: string | null;
  quantity: number;
}

/**
 * Builds a WhatsApp deep link the MERCHANT uses to nudge a customer whose
 * website checkout was never paid for — opens WhatsApp with the message
 * pre-filled to the customer's own number (the reverse direction of
 * buildCartWhatsAppUrl, which messages the merchant).
 */
export function buildAbandonedCartNudgeUrl(options: {
  customerPhone: string;
  customerName: string;
  storeName: string;
  orderNumber: string;
  items: AbandonedCartNudgeItem[];
  total: number;
  currencySymbol: string;
}): string {
  const phone = formatWhatsAppPhone(options.customerPhone);

  const lines: (string | null)[] = [
    `Hi ${options.customerName}! 👋 This is ${options.storeName}.`,
    ``,
    `We noticed your order *${options.orderNumber}* hasn't been completed yet — your items are still reserved for you:`,
    ``,
  ];

  for (const item of options.items) {
    const itemTitle = item.variantName ? `${item.name} (${item.variantName})` : item.name;
    lines.push(`• ${item.quantity} × ${itemTitle}`);
  }

  lines.push(
    ``,
    `*Total: ${options.currencySymbol}${options.total.toLocaleString()}*`,
    ``,
    `Would you like to go ahead and complete your order, or is there anything I can help with? 😊`
  );

  const text = encodeURIComponent(lines.filter((l): l is string => l !== null).join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
