-- Migration: Expand plan id columns to accommodate ULID with prefix
-- Purpose: Increase length of plans.id and subscriptions.plan_id to match generated IDs (e.g., plan_<ULID>)
-- Important: Run only after taking a full DB snapshot. Test in staging first.

BEGIN;

-- Expand plans.id to 36 chars (was 26 in earlier SQL creation)
ALTER TABLE IF EXISTS plans
  ALTER COLUMN id TYPE varchar(36);

-- Expand subscriptions.plan_id (referencing plans.id) to match
ALTER TABLE IF EXISTS subscriptions
  ALTER COLUMN plan_id TYPE varchar(36);

COMMIT;

-- Verification queries (run after migration):
-- SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='plans' AND column_name='id';
-- SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_id';
-- SELECT max(length(id)) AS max_id_len FROM plans;
-- SELECT max(length(plan_id)) AS max_plan_id_len FROM subscriptions;