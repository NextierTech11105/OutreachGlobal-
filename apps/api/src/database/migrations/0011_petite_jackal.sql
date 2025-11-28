CREATE TABLE "properties" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"external_id" varchar,
	"source" varchar,
	"owner_first_name" varchar,
	"owner_last_name" varchar,
	"use_code" varchar,
	"owner_occupied" boolean DEFAULT false,
	"lot_square_feet" numeric(12, 2),
	"building_square_feet" numeric(12, 2),
	"auction_date" timestamp,
	"assessed_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"estimated_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"year_built" integer,
	"address" jsonb,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_settings" (
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"value" text,
	"masked_value" text,
	"is_masked" boolean DEFAULT false,
	"type" varchar DEFAULT 'TEXT' NOT NULL,
	"metadata" jsonb,
	"scope" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "team_settings" ADD CONSTRAINT "team_settings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "properties_external_id_source_index" ON "properties" USING btree ("external_id","source");--> statement-breakpoint
CREATE UNIQUE INDEX "team_settings_team_id_name_scope_index" ON "team_settings" USING btree ("team_id","name","scope");