# Shopper

A multi-tenant ecommerce CMS — the easiest way for a business to start
selling online. See `docs/master-instruction.md` for the full product spec
and phased roadmap this project follows.

**This is Phase 1 — Foundation.** It gives you: project setup, the data
model, authentication, tenant isolation, and a working (if mostly empty)
merchant dashboard. Products, storefront, checkout, and payments are later
phases (see the roadmap in the docs).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** + a hand-built shadcn/ui-style component set (`src/components/ui`)
- **Drizzle ORM** + Postgres (`postgres` driver) — chosen over Prisma because
  Prisma's engine binaries are fetched from a CDN that's blocked on some
  networks; Drizzle is pure TypeScript with no native binary download.
- **Auth.js (NextAuth v5)**, credentials (email/password) provider, JWT sessions

## Getting started

1. **Install dependencies** (already done if you're reading this from the scaffold):
   ```bash
   npm install
   ```

2. **Get a Postgres database.** Any of these work:
   - Local Postgres (`brew install postgresql` / Postgres.app on Mac, or Docker)
   - A free hosted instance — [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all have generous free tiers and take under 2 minutes to set up

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL` with your connection string, and generate an
   `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. **Create the database tables:**
   ```bash
   npm run db:push
   ```
   (This pushes the schema directly — fine for development. Once you have
   real data, switch to `db:generate` + `db:migrate` for versioned migrations.)

5. **Seed the built-in storefront themes:**
   ```bash
   npm run db:seed
   ```

6. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign up, create a
   store, and you'll land in the dashboard.

## Project structure

```
src/
  app/                  Routes (App Router)
    (auth)/login, /signup    Public auth pages
    onboarding/               First store creation
    dashboard/                Merchant dashboard (protected)
    api/                      Route handlers
  auth.ts, auth.config.ts     NextAuth setup (config split for Edge/proxy compatibility)
  proxy.ts                    Route protection (Next's renamed "middleware")
  db/
    schema/                   Drizzle table definitions, one file per domain
    index.ts                  DB client
    seed.ts                   Seeds built-in themes
  lib/
    tenant.ts                 getCurrentStore() — the ONLY sanctioned way to
                               resolve "what store am I acting on" server-side.
                               Every tenant-owned query should go through it.
  modules/                    One folder per business domain (services/validation/types).
                               Only `auth` and `stores` are implemented in Phase 1 —
                               the rest are scaffolded folders for later phases.
  components/
    ui/                       Design system primitives (button, input, card, etc.)
    dashboard/, auth/, onboarding/   Feature components
docs/
  master-instruction.md       The full product spec and roadmap
```

## Tenant isolation

Every tenant-owned table carries a `storeId` (see `src/db/schema/`). Never
query one of these tables using a `storeId` taken directly from a request —
always resolve it through `getCurrentStore()` in `src/lib/tenant.ts`, which
verifies the signed-in user actually belongs to that store before returning
it. See `src/app/api/stores/current/route.ts` for the pattern.

## What's next (Phase 3 onward)

Per the roadmap in `docs/master-instruction.md`, section 70:

- **Phase 3 — Products**: build out the `products` module (create/edit UI,
  image upload, variants, categories) on top of the schema that's already here.
- **Phase 4 — Storefront**: the public `/store/[slug]` pages customers browse.
- **Phase 5 — Checkout**: cart, WhatsApp order-message generation, orders.
- **Phase 6 — Online payments**: wire a real provider into `paymentProviders`.

Each later phase should extend the existing modules rather than restructure
them — the folder layout, schema, and tenant-isolation pattern are designed
to carry through to the end.
