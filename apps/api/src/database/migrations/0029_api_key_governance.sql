-- ═══════════════════════════════════════════════════════════════════════════
-- API Key Governance Migration
-- Implements the API-key governed SaaS architecture
-- ═══════════════════════════════════════════════════════════════════════════

-- Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" varchar(30) PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "contact_email" varchar(255),
  "contact_name" varchar(200),
  "signalhouse_subgroup_id" varchar(255),
  "signalhouse_brand_id" varchar(255),
  "stripe_customer_id" varchar(255),
  "stripe_subscription_id" varchar(255),
  "product_pack" varchar(30) DEFAULT 'DATA_ENGINE',
  "state" varchar(25) NOT NULL DEFAULT 'DEMO',
  "billing_status" varchar(20) DEFAULT 'trial',
  "trial_ends_at" timestamp,
  "onboarding_completed_at" timestamp,
  "onboarding_completed_by" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for tenants
CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" ("slug");
CREATE INDEX IF NOT EXISTS "tenants_stripe_customer_idx" ON "tenants" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "tenants_signalhouse_idx" ON "tenants" ("signalhouse_subgroup_id");
CREATE INDEX IF NOT EXISTS "tenants_state_idx" ON "tenants" ("state");

-- Update api_keys table to support new architecture
-- Add new columns if they don't exist

DO $$
BEGIN
  -- Add tenant_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'tenant_id') THEN
    ALTER TABLE "api_keys" ADD COLUMN "tenant_id" varchar(30) REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;

  -- Add created_by_user_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'created_by_user_id') THEN
    ALTER TABLE "api_keys" ADD COLUMN "created_by_user_id" varchar(30) REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;

  -- Add parent_key_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'parent_key_id') THEN
    ALTER TABLE "api_keys" ADD COLUMN "parent_key_id" varchar(30);
  END IF;

  -- Add product_pack column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'product_pack') THEN
    ALTER TABLE "api_keys" ADD COLUMN "product_pack" varchar(30);
  END IF;

  -- Add scopes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'scopes') THEN
    ALTER TABLE "api_keys" ADD COLUMN "scopes" jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add usage_caps column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'usage_caps') THEN
    ALTER TABLE "api_keys" ADD COLUMN "usage_caps" jsonb;
  END IF;

  -- Add usage_counters column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'usage_counters') THEN
    ALTER TABLE "api_keys" ADD COLUMN "usage_counters" jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add last_used_from_ip column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'last_used_from_ip') THEN
    ALTER TABLE "api_keys" ADD COLUMN "last_used_from_ip" varchar(45);
  END IF;

  -- Add stripe_subscription_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE "api_keys" ADD COLUMN "stripe_subscription_id" varchar(255);
  END IF;

  -- Add signalhouse_subgroup_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'api_keys' AND column_name = 'signalhouse_subgroup_id') THEN
    ALTER TABLE "api_keys" ADD COLUMN "signalhouse_subgroup_id" varchar(255);
  END IF;

  -- Extend key_prefix length if needed
  ALTER TABLE "api_keys" ALTER COLUMN "key_prefix" TYPE varchar(24);

END $$;

-- Create additional indexes for api_keys
CREATE INDEX IF NOT EXISTS "api_keys_tenant_idx" ON "api_keys" ("tenant_id");
CREATE INDEX IF NOT EXISTS "api_keys_parent_idx" ON "api_keys" ("parent_key_id");
CREATE INDEX IF NOT EXISTS "api_keys_stripe_idx" ON "api_keys" ("stripe_subscription_id");

-- Create api_key_usage_logs table for audit trail
CREATE TABLE IF NOT EXISTS "api_key_usage_logs" (
  "id" varchar(30) PRIMARY KEY NOT NULL,
  "api_key_id" varchar(30) NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "tenant_id" varchar(30) REFERENCES "tenants"("id") ON DELETE CASCADE,
  "action" varchar(100) NOT NULL,
  "endpoint" varchar(200),
  "ip_address" varchar(45),
  "user_agent" varchar(500),
  "status_code" integer,
  "response_time_ms" integer,
  "units_consumed" integer DEFAULT 1,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for usage logs
CREATE INDEX IF NOT EXISTS "api_key_usage_key_idx" ON "api_key_usage_logs" ("api_key_id");
CREATE INDEX IF NOT EXISTS "api_key_usage_tenant_idx" ON "api_key_usage_logs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "api_key_usage_action_idx" ON "api_key_usage_logs" ("action");
CREATE INDEX IF NOT EXISTS "api_key_usage_created_idx" ON "api_key_usage_logs" ("created_at");

-- Update any existing api_keys to have default type if empty
UPDATE "api_keys" SET "type" = 'ADMIN_KEY' WHERE "type" IS NULL OR "type" = '';

-- Grant comment for documentation
COMMENT ON TABLE "tenants" IS 'Multi-tenant organizations for API-key governed access. Maps 1:1 with SignalHouse SubGroup.';
COMMENT ON COLUMN "tenants"."state" IS 'DEMO | PENDING_ONBOARDING | READY_FOR_EXECUTION | LIVE';
COMMENT ON TABLE "api_key_usage_logs" IS 'Audit trail for all API key usage, for billing and analytics.';
