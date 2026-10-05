# shipping module

Merchant "delivery options" (Dashboard → Delivery): a name, a flat fee, and an
optional free-above threshold. Each option is one `shipping_zones` row with one
`shipping_rates` row. `utils/delivery-fee.ts` is shared by checkout (display)
and `order-service` (authoritative server-side pricing).
