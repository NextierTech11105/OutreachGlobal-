# RUNBOOK: Expand ULID VARCHAR length for `plans.id` and `subscriptions.id/plan_id`

**Goal:** Fix startup failure caused by application-generated ULIDs (e.g., `plan_<ULID>`) that exceed the existing `VARCHAR(26)` column size. This runbook expands those columns to `VARCHAR(36)` safely.

> IMPORTANT: This is a schema-only migration (metadata-only change). **Do not** run any destructive SQL. Take a full DB snapshot prior to executing.

---

## 1) Overview ✅
- What this fixes: The app generates IDs longer than 26 chars (prefixed ULIDs like `plan_01KG1A...`). Postgres was rejecting starter-plan insertion. Expanding the column to `varchar(36)` resolves the insertion error.
- Affected columns:
  - `plans.id`
  - `subscriptions.id`
  - `subscriptions.plan_id`

---

## 2) Prerequisites (must complete before starting) ☑️
- [ ] Ensure you have a recent DB snapshot / backup. (Do not proceed without this.)
- [ ] Test the migration in a staging environment using a recent snapshot of production.
- [ ] Schedule a short maintenance window and notify stakeholders (app restart may be required).
- [ ] Have psql access to the production DB and a user with ALTER privileges.
- [ ] Ensure CI is ready to redeploy the app after migration (if needed).

---

## 3) Pre-Migration Checks (read-only) 🔎
Run the following and confirm outputs before proceeding.

1) Show column definitions and lengths:
```bash
psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length, column_default FROM information_schema.columns WHERE table_name IN ('plans','subscriptions') AND column_name IN ('id','plan_id') ORDER BY table_name, ordinal_position;"
```
- Expected before fix: `plans.id` or `subscriptions.plan_id` may show `character_maximum_length = 26`.

2) Check longest existing IDs (sanity):
```bash
psql "$DATABASE_URL" -c "SELECT max(length(id)) AS max_id_len FROM plans;"
psql "$DATABASE_URL" -c "SELECT max(length(id)) AS max_sub_id_len, max(length(plan_id)) AS max_plan_id_len FROM subscriptions;"
```
- If `max_id_len` >= 27, migration is needed.

3) Check for active locks (optional):
```bash
psql "$DATABASE_URL" -c "SELECT pid,query,state,wait_event_type,wait_event FROM pg_stat_activity WHERE datname=current_database() LIMIT 10;"
```

---

## 4) Migration Steps (exact commands) ▶️
**DO NOT RUN** on production without snapshot, staging test, and maintenance window.

1) (Optional) Export a snapshot (provider-specific). Example for DigitalOcean: create a Managed DB snapshot in the control panel.

2) Run the migration SQL file (this repo contains `apps/api/src/database/migrations/20260127_043000_expand_ulid_varchar_length.sql`):
```bash
# From the machine with DB access
psql "$DATABASE_URL" -f "apps/api/src/database/migrations/20260127_043000_expand_ulid_varchar_length.sql"
```
- The migration is idempotent; it checks column lengths and only alters if necessary.

**Expected console output fragments:**
- `NOTICE:  Altering plans.id to varchar(36)` (or `plans.id already... skipping`)
- `COMMIT` at the end of the script

---

## 5) Post-Migration Verification ✅
Run these queries to confirm changes applied:
```bash
# Column types and lengths
psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name IN ('plans','subscriptions') AND column_name IN ('id','plan_id') ORDER BY table_name, ordinal_position;"

# Max id lengths in tables
psql "$DATABASE_URL" -c "SELECT max(length(id)) AS max_id_len FROM plans;"
psql "$DATABASE_URL" -c "SELECT max(length(id)) AS max_sub_id_len, max(length(plan_id)) AS max_plan_id_len FROM subscriptions;"
```
- Expected results: `character_maximum_length` = 36 for these columns; `max_id_len` ≤ 36.

**Check application logs for resolution:**
```bash
# Tail the API logs and search for previous error
# DigitalOcean example:
doctl apps logs <APP_ID> api --type run --tail 200 --no-prefix | grep "Error ensuring starter plan" || echo "No startup error found"
```
- Expected: no recurring `Error ensuring starter plan` log entries.

---

## 6) Application Deployment
- Redeploy or restart the API service after migration (if not automatically picked up):
  - Redeploy via your standard CD pipeline or directly in the App Platform control panel.
- Verify app starts without the previous error and health endpoints are OK:
```bash
curl -sS https://<your-app-domain>/api/health | jq '.'
curl -sS https://<your-app-domain>/api/health/ready || echo "Readiness check failed"
```

---

## 7) Rollback Procedure (If needed) ⚠️
- Preferred rollback: restore DB from the snapshot you took before migration.
- Manual conditional rollback (only if you confirm all id lengths ≤ 26 and have tested in staging):
```sql
BEGIN;
ALTER TABLE subscriptions ALTER COLUMN plan_id TYPE varchar(26);
ALTER TABLE subscriptions ALTER COLUMN id TYPE varchar(26);
ALTER TABLE plans ALTER COLUMN id TYPE varchar(26);
COMMIT;
```
- DO NOT run the manual rollback unless you have confirmed it's safe (no id length > 26).

---

## 8) Troubleshooting 🛠
- Problem: `ALTER TABLE` is blocked by long-running transactions or locks.
  - Action: identify the blocking pid via `SELECT * FROM pg_stat_activity WHERE state <> 'idle';` and coordinate to stop the blocking session (or schedule maintenance when load is low).
- Problem: permission denied for ALTER TABLE.
  - Action: run migration as a DB superuser or grant `ALTER` privileges to the migration role.
- Problem: migration completes but app still logs the previous error.
  - Action: check for cached connections or an older deployment using a different DB; redeploy and check logs again.

---

## 9) Post-Deployment Checks (after 30 min monitoring)
- Confirm `Error ensuring starter plan` no longer appears in logs.
- Confirm key features: onboarding, new team creation, SMS send, list upload, skip-trace run.
- Check that `plans` table contains expected rows and that IDs look like `plan_<...>` and are stored intact.

---

## 10) Notes & Contact
- If you'd like, I can prepare a PR that adds this migration to your normal migration pipeline and a small test to verify `character_maximum_length >= 36` post-deploy.
- Contact the platform maintainer or DBA if you want me to remotely apply and verify the migration (I will not run it without explicit, written go-ahead and confirmation that a snapshot exists).

---

**End of runbook**
