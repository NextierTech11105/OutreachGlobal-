-- Add signalhouse_campaign_id to campaigns table for 10DLC tracking
ALTER TABLE "campaigns" ADD COLUMN "signalhouse_campaign_id" varchar;

-- Index for inbound SMS attribution lookup
CREATE INDEX "campaigns_sh_campaign_idx" ON "campaigns" ("signalhouse_campaign_id");
