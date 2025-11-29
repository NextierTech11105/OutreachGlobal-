CREATE TABLE "property_searches" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"source" varchar NOT NULL,
	"endpoint" varchar NOT NULL,
	"filters" jsonb,
	"filter_hash" varchar(64) NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"block_keys" text[],
	"status" varchar DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "property_searches_filter_hash_idx" ON "property_searches" ("source","endpoint","filter_hash");
--> statement-breakpoint
CREATE INDEX "property_searches_created_at_idx" ON "property_searches" ("created_at");
--> statement-breakpoint
CREATE TABLE "property_search_blocks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"search_id" varchar(36) NOT NULL,
	"block_index" integer NOT NULL,
	"key" varchar NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"checksum" varchar,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "property_search_blocks" ADD CONSTRAINT "property_search_blocks_search_id_property_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."property_searches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "property_search_blocks_idx" ON "property_search_blocks" ("search_id","block_index");
--> statement-breakpoint
CREATE INDEX "property_search_blocks_search_id_idx" ON "property_search_blocks" ("search_id");
