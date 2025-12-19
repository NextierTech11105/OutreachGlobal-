# Schema Sync Incident - December 2024

## What Happened

The application was returning 401/404 errors and deployments were failing with health check errors. Users could not log in or access team dashboards.

## Root Cause

**Schema/Database Mismatch**: The Drizzle ORM schema and GraphQL models defined columns (`description`, `branding`) that **did not exist in the actual database**.

### The Chain of Failures

1. **Drizzle schema** defined `description` and `branding` columns on `teams` table
2. **GraphQL Team model** exposed these fields
3. **Frontend queries** requested these fields (e.g., `TEAM_QUERY` asked for `description`)
4. **API startup** failed because Drizzle tried to query non-existent columns
5. **Health checks failed** → Deployment rolled back
6. **Frontend 404s** because GraphQL queries returned errors

## Files Affected

| File | Issue |
|------|-------|
| `apps/api/src/database/schema/teams.schema.ts` | Had `description` and `branding` columns that don't exist in DB |
| `apps/api/src/app/team/models/team.model.ts` | Exposed `description` and `branding` in GraphQL |
| `apps/front/src/features/team/queries/team.queries.ts` | `TEAM_QUERY` requested `description` field |
| `apps/front/src/graphql/types/graphql-object.ts` | TypeScript types included `description` |

## The Fix

1. Removed `description` and `branding` from Drizzle schema (temporarily)
2. Removed fields from GraphQL Team model
3. Removed `description` from frontend `TEAM_QUERY`
4. Updated TypeScript types

## Prevention Rules

### NEVER DO THIS

1. **Never add columns to Drizzle schema without running migrations first**
   ```bash
   # WRONG: Add column to schema, deploy, hope it works
   # RIGHT:
   pnpm db:push  # Generate and run migration FIRST
   ```

2. **Never add GraphQL fields for database columns that don't exist**
   - The GraphQL schema must match what's actually in the database
   - If you add a field, the column MUST exist

3. **Never request fields in frontend queries without verifying they exist in the API**
   - Run `pnpm codegen` after API changes
   - Check that types match

### ALWAYS DO THIS

1. **Database-first approach**:
   ```
   1. Add column to database (migration)
   2. Add to Drizzle schema
   3. Add to GraphQL model
   4. Add to frontend queries
   5. Run codegen
   ```

2. **Test locally before deploying**:
   ```bash
   pnpm build  # Must pass locally
   ```

3. **Check deployment health**:
   - Watch DigitalOcean deployment logs
   - Verify API `/health` endpoint responds

4. **Keep schema in sync**:
   ```bash
   # Before any schema changes
   pnpm --filter api db:generate
   pnpm --filter api db:migrate
   ```

## Quick Diagnostic Commands

```bash
# Check if API is healthy
curl https://your-app.ondigitalocean.app/health

# Test GraphQL
curl -X POST https://your-app.ondigitalocean.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Check deployment status (DigitalOcean)
doctl apps list-deployments <app-id>
```

## Lesson Learned

**The Drizzle schema is a contract with the database, not a wishlist.**

If you define a column in the schema, Drizzle will try to SELECT it. If it doesn't exist, everything breaks.

---

*Incident resolved: December 17, 2024*
