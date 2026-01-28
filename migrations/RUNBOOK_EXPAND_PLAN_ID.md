Runbook: Expand `plans.id` and `subscriptions.plan_id` to varchar(36)

Purpose
- Fix startup failure caused by application-generated IDs like `plan_<ULID>` being longer than the existing `VARCHAR(26)` column.
- This is a schema-only change (no data modifications).

Preconditions
1. Take a full DB snapshot / backup (DigitalOcean Managed DB snapshot or pg_dump). Do not proceed without this.
2. Test in staging with an identical snapshot and perform the same steps there first.
3. Ensure migrations are applied during a maintenance window and that app traffic is paused or you are ready for a brief restart.

Migration SQL file
- migrations/2026-01-28_expand_plan_id.sql

Steps (production)
1. Snapshot the DB (required): create a DB snapshot via your cloud provider.
2. Connect to the production DB (read-only verification before applying):
   - psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='plans' ORDER BY ordinal_position;"
   - psql "$DATABASE_URL" -c "SELECT max(length(id)) AS max_id_len FROM plans;"
3. Run migration (as a DBA or via CI runbook):
   - psql "$DATABASE_URL" -f migrations/2026-01-28_expand_plan_id.sql
4. Verify schema and lengths:
   - psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='plans' AND column_name='id';"
   - psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_id';"
   - psql "$DATABASE_URL" -c "SELECT max(length(id)) AS max_id_len FROM plans;"
   - psql "$DATABASE_URL" -c "SELECT max(length(plan_id)) AS max_plan_id_len FROM subscriptions;"
5. Redeploy application or restart service to verify startup completes and inbound/outbound functionality returns to normal.
6. Monitor logs for 30 minutes for regressions: look for startup errors and any occurrences of `Error ensuring starter plan`.

Rollback (if needed)
- If something goes wrong, restore from the snapshot taken in step 1.

Notes & Safety
- This change only expands VARCHAR length, which is metadata-only and typically instantaneous.
- No row-level data is modified by these ALTERs.
- Always test this procedure in staging and have a snapshot before applying in production.

Contact
- If you'd like, I can prepare a PR adding the migration and an automated check to run it in your deployment pipeline; confirm and I will prepare the PR.