CREATE TYPE "public"."plan" AS ENUM('FREE', 'STARTER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."store_role" AS ENUM('OWNER', 'MANAGER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_order_behavior" AS ENUM('SEND_EVERY_ORDER', 'CUSTOMER_CHOICE', 'CONTACT_BUTTON_ONLY');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."checkout_channel" AS ENUM('WEBSITE', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('NEW', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider_type" AS ENUM('MANUAL', 'CASH_ON_DELIVERY', 'WHATSAPP', 'PAYSTACK', 'FLUTTERWAVE', 'STRIPE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('NEW_ORDER', 'PAYMENT_RECEIVED', 'LOW_STOCK', 'PAYMENT_FAILED', 'ORDER_CANCELLED', 'ORDER_STATUS_UPDATE');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'CANCELED', 'PAST_DUE');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"password_hash" text,
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "store_members" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "store_role" DEFAULT 'STAFF' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_members_store_user_unique" UNIQUE("store_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"contact_email" text,
	"contact_phone" text,
	"address_text" text,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"currency_symbol" text DEFAULT '₦' NOT NULL,
	"whatsapp_number" text,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_order_behavior" "whatsapp_order_behavior" DEFAULT 'CUSTOMER_CHOICE' NOT NULL,
	"theme_key" text DEFAULT 'minimal' NOT NULL,
	"primary_color" text DEFAULT '#16a34a' NOT NULL,
	"secondary_color" text DEFAULT '#111827' NOT NULL,
	"custom_domain" text,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"powered_by_hidden" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug"),
	CONSTRAINT "stores_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sku" text,
	"price" numeric(12, 2),
	"compare_at_price" numeric(12, 2),
	"inventory_quantity" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"product_type" text,
	"brand" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"price" numeric(12, 2) NOT NULL,
	"compare_at_price" numeric(12, 2),
	"sku" text,
	"weight" numeric(10, 3),
	"track_inventory" boolean DEFAULT true NOT NULL,
	"inventory_quantity" integer DEFAULT 0 NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"label" text,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text,
	"country" text DEFAULT 'Nigeria' NOT NULL,
	"postal_code" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_store_phone_unique" UNIQUE("store_id","phone")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"product_name" text NOT NULL,
	"variant_name" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"fulfillment_status" "fulfillment_status" DEFAULT 'NEW' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"checkout_channel" "checkout_channel" DEFAULT 'WEBSITE' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_method" text,
	"delivery_address_text" text,
	"customer_notes" text,
	"whatsapp_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"type" "payment_provider_type" NOT NULL,
	"label" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"store_id" text NOT NULL,
	"provider_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'PENDING' NOT NULL,
	"transaction_reference" text,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"discount_id" text NOT NULL,
	"order_id" text NOT NULL,
	"customer_id" text,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"code" text NOT NULL,
	"type" "discount_type" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"min_order_amount" numeric(12, 2),
	"starts_at" timestamp,
	"expires_at" timestamp,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"product_ids" jsonb DEFAULT '[]'::jsonb,
	"category_ids" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discounts_store_code_unique" UNIQUE("store_id","code")
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"free_above_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_entitlements" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"limit_value" text,
	CONSTRAINT "feature_entitlements_store_key_unique" UNIQUE("store_id","key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"user_id" text,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"related_order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"order_notifications_enabled" boolean DEFAULT true NOT NULL,
	"customer_notifications_enabled" boolean DEFAULT true NOT NULL,
	"tax_enabled" boolean DEFAULT false NOT NULL,
	"tax_rate_percent" text,
	"tax_included_in_price" boolean DEFAULT false NOT NULL,
	"seo_meta_title" text,
	"seo_meta_description" text,
	"social_share_image_url" text,
	"homepage_layout" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"preview_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "themes_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_id_payment_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_entitlements" ADD CONSTRAINT "feature_entitlements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_order_id_orders_id_fk" FOREIGN KEY ("related_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;