/** Paystack's local card/transfer fee: 1.5% + ₦100 (waived under ₦2,500), capped at ₦2,000. */
export function estimatePaystackFee(amount: number) {
  return Math.min(2000, amount * 0.015 + (amount >= 2500 ? 100 : 0));
}
