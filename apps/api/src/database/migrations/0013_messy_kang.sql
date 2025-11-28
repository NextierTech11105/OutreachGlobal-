ALTER TABLE "leads" ADD COLUMN "property_id" varchar(36);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "type" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "mortgage_info" jsonb;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;