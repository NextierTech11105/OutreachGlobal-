ALTER TABLE "campaigns" ADD COLUMN "starts_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_executions" DROP COLUMN "starts_at";