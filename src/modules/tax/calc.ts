// Order tax, shared by the checkout summary (display) and order creation
// (authoritative). The taxable amount is what the customer pays for goods
// after discounts, plus delivery -- UK VAT and most Canadian/US sales taxes
// apply to delivery charges too.

export interface TaxSettings {
  rate: number; // percent, e.g. 20
  inclusive: boolean;
}

export interface TaxResult {
  /** The tax contained in (inclusive) or added to (exclusive) the order. */
  tax: number;
  /** What to add to the order total: 0 when prices already include tax. */
  addToTotal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateTax(taxable: number, settings: TaxSettings): TaxResult {
  if (!(settings.rate > 0) || !(taxable > 0)) return { tax: 0, addToTotal: 0 };
  if (settings.inclusive) {
    return { tax: round2((taxable * settings.rate) / (100 + settings.rate)), addToTotal: 0 };
  }
  const tax = round2((taxable * settings.rate) / 100);
  return { tax, addToTotal: tax };
}

/**
 * How a saved order's tax should be shown. Worked out from the order's own
 * figures (not the store's current setting, which may have changed since):
 * if the total already equals goods + delivery, the tax was included in it.
 */
export function orderTaxLine(order: { subtotal: string; discountAmount: string; shippingAmount: string; taxAmount: string; total: string }) {
  const tax = Number(order.taxAmount);
  if (!(tax > 0)) return null;
  const beforeTax = Number(order.subtotal) - Number(order.discountAmount) + Number(order.shippingAmount);
  return { amount: tax, included: Math.abs(Number(order.total) - beforeTax) < 0.005 };
}
