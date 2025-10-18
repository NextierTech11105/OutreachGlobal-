CREATE TABLE "lead_phone_numbers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"phone" varchar NOT NULL,
	"label" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "lead_phone_numbers" ADD CONSTRAINT "lead_phone_numbers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_phone_numbers_lead_id_index" ON "lead_phone_numbers" USING btree ("lead_id");