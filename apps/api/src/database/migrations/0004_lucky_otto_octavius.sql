ALTER TABLE "campaigns" ADD COLUMN "ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "resumed_at" timestamp;