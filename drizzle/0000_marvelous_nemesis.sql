CREATE TABLE "skus" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(64) NOT NULL,
	"thumbnail_url" varchar(2048),
	"name" varchar(256) NOT NULL,
	"min_threshold" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "skus_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"type" varchar(32) NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "skus_sku_idx" ON "skus" USING btree ("sku");
--> statement-breakpoint
-- Backfill quantity from existing transactions
UPDATE "skus" SET "quantity" = COALESCE((
  SELECT SUM(CASE WHEN "type" = 'addition' THEN "quantity" WHEN "type" = 'removal' THEN -"quantity" ELSE 0 END)
  FROM "transactions" WHERE "transactions"."sku_id" = "skus"."id"
), 0);
