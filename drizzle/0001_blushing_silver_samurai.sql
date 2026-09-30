CREATE TYPE "public"."hero_text_position" AS ENUM('center', 'bottom-left', 'bottom-center', 'bottom-right');--> statement-breakpoint
CREATE TYPE "public"."ad_connection_status" AS ENUM('CONNECTED', 'NEEDS_REAUTH', 'ERROR', 'DISCONNECTED');--> statement-breakpoint
CREATE TYPE "public"."ad_platform" AS ENUM('GOOGLE_ADS', 'META', 'TIKTOK');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."nav_item_kind" AS ENUM('HOME', 'PRODUCTS', 'BLOG', 'CONTACT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."policy_type" AS ENUM('PRIVACY_POLICY', 'RETURN_POLICY', 'SHIPPING_POLICY', 'TERMS_OF_SERVICE');--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "abandoned_cart_nudges" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"store_id" text NOT NULL,
	"sent_by_user_id" text,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_account_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"platform" "ad_platform" NOT NULL,
	"external_account_id" text NOT NULL,
	"account_name" text,
	"currency" text,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp,
	"status" "ad_connection_status" DEFAULT 'CONNECTED' NOT NULL,
	"last_error" text,
	"last_synced_at" timestamp,
	"connected_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ad_account_connections_store_platform_unique" UNIQUE("store_id","platform")
);
--> statement-breakpoint
CREATE TABLE "ad_metrics_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"date" date NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"spend" numeric(12, 2) DEFAULT '0' NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ad_metrics_daily_connection_date_unique" UNIQUE("connection_id","date")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image_url" text,
	"status" "blog_post_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_store_slug_unique" UNIQUE("store_id","slug")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"product_id" text,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_nav_items" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"kind" "nav_item_kind" NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"type" "policy_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_policies_store_type_unique" UNIQUE("store_id","type")
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "hero_images" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "hero_show_text" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "hero_text_position" "hero_text_position" DEFAULT 'bottom-center' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "search_console_verification" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "llms_txt" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "domain_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "domain_verification_token" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "abandoned_cart_threshold_hours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_cart_nudges" ADD CONSTRAINT "abandoned_cart_nudges_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_cart_nudges" ADD CONSTRAINT "abandoned_cart_nudges_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_cart_nudges" ADD CONSTRAINT "abandoned_cart_nudges_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_account_connections" ADD CONSTRAINT "ad_account_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_metrics_daily" ADD CONSTRAINT "ad_metrics_daily_connection_id_ad_account_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."ad_account_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_nav_items" ADD CONSTRAINT "store_nav_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_policies" ADD CONSTRAINT "store_policies_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;