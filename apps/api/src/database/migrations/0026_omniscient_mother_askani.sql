CREATE TYPE "public"."label_category" AS ENUM('status', 'priority', 'type', 'quality', 'property_type', 'opportunity', 'custom');--> statement-breakpoint
CREATE TABLE "lead_flags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"verified_email" varchar DEFAULT 'false',
	"verified_phone" varchar DEFAULT 'false',
	"do_not_call" varchar DEFAULT 'false',
	"email_bounced" varchar DEFAULT 'false',
	"hot_lead" varchar DEFAULT 'false',
	"high_value" varchar DEFAULT 'false',
	"quick_close" varchar DEFAULT 'false',
	"has_equity" varchar DEFAULT 'false',
	"high_equity" varchar DEFAULT 'false',
	"free_clear" varchar DEFAULT 'false',
	"is_investor" varchar DEFAULT 'false',
	"is_active_buyer" varchar DEFAULT 'false',
	"distressed" varchar DEFAULT 'false',
	"pre_foreclosure" varchar DEFAULT 'false',
	"vacant" varchar DEFAULT 'false',
	"absentee_owner" varchar DEFAULT 'false',
	"responded" varchar DEFAULT 'false',
	"scheduled" varchar DEFAULT 'false',
	"converted" varchar DEFAULT 'false',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_label_links" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"label_id" varchar(36) NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_labels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"category" "label_category" NOT NULL,
	"color" varchar,
	"icon" varchar,
	"description" varchar,
	"is_system" varchar DEFAULT 'false',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "saved_search_results" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"saved_search_id" varchar(36) NOT NULL,
	"property_id" varchar NOT NULL,
	"external_id" varchar,
	"change_type" varchar,
	"last_update_date" timestamp,
	"first_seen_at" timestamp,
	"last_seen_at" timestamp,
	"times_found" varchar DEFAULT '1',
	"signals" jsonb,
	"signal_history" jsonb,
	"lead_id" varchar(36),
	"lead_created_at" timestamp,
	"property_data" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"search_name" varchar NOT NULL,
	"search_query" jsonb NOT NULL,
	"realestate_search_id" varchar,
	"last_report_date" timestamp,
	"next_report_date" timestamp,
	"total_properties" varchar,
	"added_count" varchar,
	"deleted_count" varchar,
	"updated_count" varchar,
	"batch_job_enabled" varchar DEFAULT 'false',
	"last_batch_job_at" timestamp,
	"batch_job_status" varchar,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "lead_flags" ADD CONSTRAINT "lead_flags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_label_links" ADD CONSTRAINT "lead_label_links_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_label_links" ADD CONSTRAINT "lead_label_links_label_id_lead_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."lead_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_labels" ADD CONSTRAINT "lead_labels_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_results" ADD CONSTRAINT "saved_search_results_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_flags_lead_id_index" ON "lead_flags" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_flags_hot_lead_index" ON "lead_flags" USING btree ("hot_lead");--> statement-breakpoint
CREATE INDEX "lead_flags_high_value_index" ON "lead_flags" USING btree ("high_value");--> statement-breakpoint
CREATE INDEX "lead_flags_is_investor_index" ON "lead_flags" USING btree ("is_investor");--> statement-breakpoint
CREATE INDEX "lead_label_links_lead_id_index" ON "lead_label_links" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_label_links_label_id_index" ON "lead_label_links" USING btree ("label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_label_links_lead_id_label_id_index" ON "lead_label_links" USING btree ("lead_id","label_id");--> statement-breakpoint
CREATE INDEX "lead_labels_team_id_index" ON "lead_labels" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lead_labels_category_index" ON "lead_labels" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_labels_team_id_name_category_index" ON "lead_labels" USING btree ("team_id","name","category");--> statement-breakpoint
CREATE INDEX "saved_search_results_saved_search_id_index" ON "saved_search_results" USING btree ("saved_search_id");--> statement-breakpoint
CREATE INDEX "saved_search_results_property_id_index" ON "saved_search_results" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "saved_search_results_change_type_index" ON "saved_search_results" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "saved_search_results_lead_id_index" ON "saved_search_results" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "saved_searches_team_id_index" ON "saved_searches" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "saved_searches_realestate_search_id_index" ON "saved_searches" USING btree ("realestate_search_id");--> statement-breakpoint
CREATE INDEX "saved_searches_batch_job_enabled_index" ON "saved_searches" USING btree ("batch_job_enabled");