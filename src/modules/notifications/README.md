# notifications module

Order emails via Resend (`src/lib/email.ts`), run inside `after()` so they never
block or break checkout. New-order emails go to store OWNERs + the customer at
placement (offline payments) or on first confirmed payment (Paystack/PayDunya).
Customer status emails fire on CONFIRMED/READY/SHIPPED/DELIVERED/CANCELLED and
on a manual "PAID". Respects the `store_settings` notification toggles.
