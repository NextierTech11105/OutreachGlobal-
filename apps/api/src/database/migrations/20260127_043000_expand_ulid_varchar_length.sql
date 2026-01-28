-- Migration: Expand ULID varchar columns from 26 to 36 characters
-- Issue: Generated ULID IDs exceed VARCHAR(26) limit (e.g., plan_<ULID>)
-- Affected: plans.id, subscriptions.id, subscriptions.plan_id
-- Safe: VARCHAR expansion is metadata-only, no row modifications are performed
-- Date: 2026-01-27

-- IMPORTANT PRE-FLIGHT (run read-only checks before applying):
-- 1) Take a full DB snapshot/back-up (required).
-- 2) Run the following checks to confirm current state:
--    SELECT column_name, data_type, character_maximum_length
--    FROM information_schema.columns
--    WHERE table_name IN ('plans', 'subscriptions') AND column_name IN ('id','plan_id')
--    ORDER BY table_name, ordinal_position;
--
--    SELECT max(length(id)) AS max_id_len FROM plans;
--    SELECT max(length(id)) AS max_sub_id_len FROM subscriptions;
--    SELECT max(length(plan_id)) AS max_plan_id_len FROM subscriptions;
--
-- If max lengths are already >= 36, this migration is a no-op.

-- Migration logic (idempotent):
BEGIN;

-- Expand plans.id only if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'id' AND
      (character_maximum_length IS NULL OR character_maximum_length < 36)
  ) THEN
    RAISE NOTICE 'Altering plans.id to varchar(36)';
    EXECUTE 'ALTER TABLE plans ALTER COLUMN id TYPE varchar(36)';
  ELSE
    RAISE NOTICE 'plans.id already has max length >= 36; skipping';
  END IF;
END$$;

-- Expand subscriptions.id only if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'id' AND
      (character_maximum_length IS NULL OR character_maximum_length < 36)
  ) THEN
    RAISE NOTICE 'Altering subscriptions.id to varchar(36)';
    EXECUTE 'ALTER TABLE subscriptions ALTER COLUMN id TYPE varchar(36)';
  ELSE
    RAISE NOTICE 'subscriptions.id already has max length >= 36; skipping';
  END IF;
END$$;

-- Expand subscriptions.plan_id only if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan_id' AND
      (character_maximum_length IS NULL OR character_maximum_length < 36)
  ) THEN
    RAISE NOTICE 'Altering subscriptions.plan_id to varchar(36)';
    EXECUTE 'ALTER TABLE subscriptions ALTER COLUMN plan_id TYPE varchar(36)';
  ELSE
    RAISE NOTICE 'subscriptions.plan_id already has max length >= 36; skipping';
  END IF;
END$$;

COMMIT;

-- Post-migration verification (run after the migration completes):
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name IN ('plans','subscriptions') AND column_name IN ('id','plan_id')
-- ORDER BY table_name, ordinal_position;
-- SELECT max(length(id)) AS max_id_len FROM plans;
-- SELECT max(length(id)) AS max_sub_id_len FROM subscriptions;
-- SELECT max(length(plan_id)) AS max_plan_id_len FROM subscriptions;

-- Rollback instructions (manual & cautious):
-- If you must revert, restore the DB snapshot taken before running this migration.
-- A conditional rollback SQL (only safe if all ids fit within 26 chars) is:
-- BEGIN;
--   -- only run these if the following check shows max lengths <= 26
--   ALTER TABLE subscriptions ALTER COLUMN plan_id TYPE varchar(26);
--   ALTER TABLE subscriptions ALTER COLUMN id TYPE varchar(26);
--   ALTER TABLE plans ALTER COLUMN id TYPE varchar(26);
-- COMMIT;
-- However, DO NOT run the above unless you've confirmed no id length > 26.

-- Notes:
-- - This migration is intentionally conservative and idempotent.
-- - Test in staging and take a snapshot before running in production.
-- - After running, restart the application and monitor startup logs for the previous "Error ensuring starter plan" message to stop occurring.
