-- Add missing id column to team_settings table
-- The frontend code expects an id column but the table was created without one

-- First, add the id column (nullable initially)
ALTER TABLE "team_settings" ADD COLUMN IF NOT EXISTS "id" text;

-- Update existing rows with generated IDs based on team_id + name + scope
UPDATE "team_settings" SET "id" = 'tset_' || encode(sha256((team_id || '_' || name || '_' || COALESCE(scope, ''))::bytea), 'hex')::text WHERE "id" IS NULL;

-- Make id not null and set as primary key
ALTER TABLE "team_settings" ALTER COLUMN "id" SET NOT NULL;

-- Add primary key constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_settings_pkey') THEN
    ALTER TABLE "team_settings" ADD CONSTRAINT "team_settings_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

-- Create index on id for faster lookups
CREATE INDEX IF NOT EXISTS "team_settings_id_idx" ON "team_settings" ("id");
