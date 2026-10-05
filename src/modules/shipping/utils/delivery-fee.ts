// Shared by the checkout form (display) and order-service (authoritative
// pricing) so the two can never disagree. No "server-only" — the client
// imports it too.

export interface DeliveryOption {
  id: string; // the shipping_zones id
  name: string;
  amount: number;
  freeAboveAmount: number | null;
}

/** The fee for one option given the order's post-discount subtotal. */
export function calculateDeliveryFee(option: DeliveryOption, orderAmount: number): number {
  if (option.freeAboveAmount !== null && orderAmount >= option.freeAboveAmount) {
    return 0;
  }
  return option.amount;
}
