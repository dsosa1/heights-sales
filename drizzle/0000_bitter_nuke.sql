CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaflink_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"city" text,
	"state" text,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_leaflink_id_unique" UNIQUE("leaflink_id")
);
--> statement-breakpoint
CREATE TABLE "line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaflink_id" text,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"unit_price" double precision DEFAULT 0 NOT NULL,
	"line_total" double precision DEFAULT 0 NOT NULL,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "order_reps" (
	"order_id" integer NOT NULL,
	"rep_id" integer NOT NULL,
	CONSTRAINT "order_reps_order_id_rep_id_pk" PRIMARY KEY("order_id","rep_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaflink_id" text NOT NULL,
	"order_number" text,
	"status" text NOT NULL,
	"order_date" timestamp NOT NULL,
	"modified_at" timestamp NOT NULL,
	"customer_id" integer,
	"total" double precision DEFAULT 0 NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_leaflink_id_unique" UNIQUE("leaflink_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaflink_id" text NOT NULL,
	"sku" text,
	"name" text NOT NULL,
	"category" text,
	"sub_category" text,
	"brand" text,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_leaflink_id_unique" UNIQUE("leaflink_id")
);
--> statement-breakpoint
CREATE TABLE "reps" (
	"id" serial PRIMARY KEY NOT NULL,
	"leaflink_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reps_leaflink_id_unique" UNIQUE("leaflink_id")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"records_synced" integer DEFAULT 0 NOT NULL,
	"cursor" text,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_reps" ADD CONSTRAINT "order_reps_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_reps" ADD CONSTRAINT "order_reps_rep_id_reps_id_fk" FOREIGN KEY ("rep_id") REFERENCES "public"."reps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_items_order_id_idx" ON "line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_order_date_idx" ON "orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");