# ROW LEVEL SECURITY (RLS) RECOMMENDATIONS

**Generated:** 2024-12-30
**Database:** PostgreSQL 17
**Current RLS Status:** ❌ NO POLICIES EXIST

---

## Executive Summary

**CRITICAL FINDING:** Zero RLS policies exist in the database. All tenant isolation relies solely on application-layer filtering, which is vulnerable to:
- Developer errors (forgetting WHERE clause)
- SQL injection attacks
- Direct database access
- ORM bypasses

**RECOMMENDATION:** Implement PostgreSQL RLS as defense-in-depth.

---

## RLS Architecture

### Session Context Pattern

All RLS policies will use a session variable to identify the current tenant:

```sql
-- Set at connection/transaction start
SET app.team_id = 'team_xxx';

-- Policy reads this value
CREATE POLICY tenant_isolation ON table_name
FOR ALL
USING (team_id = current_setting('app.team_id', true));
```

### Application Integration

```typescript
// In database connection middleware
async function setTenantContext(teamId: string) {
  await db.execute(sql`SET app.team_id = ${teamId}`);
}

// In NestJS guard or Next.js middleware
@Injectable()
export class TenantContextMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const teamId = req.teamId; // From JWT or API key
    await this.db.execute(sql`SET app.team_id = ${teamId}`);
    next();
  }
}
```

---

## Policy Categories

### Category 1: TENANT_ISOLATED (Full RLS)

Tables that contain tenant-specific data requiring full isolation.

```sql
-- Standard tenant isolation policy
CREATE POLICY {table}_tenant_policy ON {table}
FOR ALL
USING (team_id = current_setting('app.team_id', true));
```

### Category 2: SHARED_READ (Read-only for all)

Tables that contain shared reference data.

```sql
-- Allow read for all, no writes
CREATE POLICY {table}_read_policy ON {table}
FOR SELECT
USING (true);

CREATE POLICY {table}_write_policy ON {table}
FOR INSERT
USING (false);
```

### Category 3: INHERITED (Via parent FK)

Tables that inherit isolation through foreign key relationships.

```sql
-- Isolation through parent table join
CREATE POLICY {table}_inherited_policy ON {table}
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM {parent_table} p
    WHERE p.id = {table}.{parent_fk}
    AND p.team_id = current_setting('app.team_id', true)
  )
);
```

### Category 4: SERVICE_BYPASS (For system operations)

Allow service accounts to bypass RLS for admin operations.

```sql
-- Create bypass role
CREATE ROLE service_admin;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
GRANT BYPASS RLS TO service_admin;
```

---

## Table-by-Table Policies

### Core Tenant Tables (TENANT_ISOLATED)

```sql
-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY leads_tenant_policy ON leads
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
CREATE POLICY campaigns_tenant_policy ON campaigns
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY messages_tenant_policy ON messages
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- personas
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas FORCE ROW LEVEL SECURITY;
CREATE POLICY personas_tenant_policy ON personas
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- inbox_items
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items FORCE ROW LEVEL SECURITY;
CREATE POLICY inbox_items_tenant_policy ON inbox_items
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- unified_lead_cards
ALTER TABLE unified_lead_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_lead_cards FORCE ROW LEVEL SECURITY;
CREATE POLICY unified_lead_cards_tenant_policy ON unified_lead_cards
FOR ALL USING (team_id = current_setting('app.team_id', true));
```

### PII Tables (TENANT_ISOLATED - HIGH PRIORITY)

```sql
-- persona_phones (Contains PII)
ALTER TABLE persona_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_phones FORCE ROW LEVEL SECURITY;
CREATE POLICY persona_phones_tenant_policy ON persona_phones
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- persona_emails (Contains PII)
ALTER TABLE persona_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_emails FORCE ROW LEVEL SECURITY;
CREATE POLICY persona_emails_tenant_policy ON persona_emails
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- persona_addresses (Contains PII)
ALTER TABLE persona_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_addresses FORCE ROW LEVEL SECURITY;
CREATE POLICY persona_addresses_tenant_policy ON persona_addresses
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- persona_demographics (Contains PII)
ALTER TABLE persona_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_demographics FORCE ROW LEVEL SECURITY;
CREATE POLICY persona_demographics_tenant_policy ON persona_demographics
FOR ALL USING (team_id = current_setting('app.team_id', true));
```

### Shared Reference Tables (SHARED_READ)

```sql
-- properties (Shared real estate data)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY properties_read_policy ON properties
FOR SELECT USING (true);
-- Note: Writes should go through property_owners which IS tenant-scoped

-- property_distress_scores
ALTER TABLE property_distress_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY property_distress_read_policy ON property_distress_scores
FOR SELECT USING (true);

-- workflow_tasks (System configuration)
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_tasks_read_policy ON workflow_tasks
FOR SELECT USING (true);

-- workflow_fields (System configuration)
ALTER TABLE workflow_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_fields_read_policy ON workflow_fields
FOR SELECT USING (true);

-- achievement_definitions (Gamification config)
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY achievement_definitions_read_policy ON achievement_definitions
FOR SELECT USING (true);
```

### Inherited Tables (INHERITED via FK)

```sql
-- campaign_sequences (inherits from campaigns)
ALTER TABLE campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sequences FORCE ROW LEVEL SECURITY;
CREATE POLICY campaign_sequences_inherited_policy ON campaign_sequences
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_sequences.campaign_id
    AND c.team_id = current_setting('app.team_id', true)
  )
);

-- campaign_leads (inherits from campaigns)
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads FORCE ROW LEVEL SECURITY;
CREATE POLICY campaign_leads_inherited_policy ON campaign_leads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = campaign_leads.campaign_id
    AND c.team_id = current_setting('app.team_id', true)
  )
);

-- lead_phone_numbers (inherits from leads)
ALTER TABLE lead_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_phone_numbers FORCE ROW LEVEL SECURITY;
CREATE POLICY lead_phone_numbers_inherited_policy ON lead_phone_numbers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_phone_numbers.lead_id
    AND l.team_id = current_setting('app.team_id', true)
  )
);

-- integration_fields (inherits from integrations)
ALTER TABLE integration_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_fields FORCE ROW LEVEL SECURITY;
CREATE POLICY integration_fields_inherited_policy ON integration_fields
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = integration_fields.integration_id
    AND i.team_id = current_setting('app.team_id', true)
  )
);
```

---

## Complete Policy List

### High Priority (P0) - 20 tables

| Table | Policy Type | Status |
|-------|-------------|--------|
| leads | TENANT_ISOLATED | 🔴 Needs RLS |
| campaigns | TENANT_ISOLATED | 🔴 Needs RLS |
| messages | TENANT_ISOLATED | 🔴 Needs RLS |
| personas | TENANT_ISOLATED | 🔴 Needs RLS |
| persona_phones | TENANT_ISOLATED | 🔴 Needs RLS |
| persona_emails | TENANT_ISOLATED | 🔴 Needs RLS |
| persona_addresses | TENANT_ISOLATED | 🔴 Needs RLS |
| persona_demographics | TENANT_ISOLATED | 🔴 Needs RLS |
| inbox_items | TENANT_ISOLATED | 🔴 Needs RLS |
| unified_lead_cards | TENANT_ISOLATED | 🔴 Needs RLS |
| campaign_queue | TENANT_ISOLATED | 🔴 Needs RLS |
| suppression_list | TENANT_ISOLATED | 🔴 Needs RLS |
| integrations | TENANT_ISOLATED | 🔴 Needs RLS |
| api_keys | TENANT_ISOLATED | 🔴 Needs RLS |
| intelligence_log | TENANT_ISOLATED | 🔴 Needs RLS |
| outreach_logs | TENANT_ISOLATED | 🔴 Needs RLS |
| scheduled_events | TENANT_ISOLATED | 🔴 Needs RLS |
| skiptrace_results | TENANT_ISOLATED | 🔴 Needs RLS |
| knowledge_documents | TENANT_ISOLATED | 🔴 Needs RLS |
| business_owners | TENANT_ISOLATED | 🔴 Needs RLS |

### Medium Priority (P1) - 25 tables

| Table | Policy Type |
|-------|-------------|
| ai_sdr_avatars | TENANT_ISOLATED |
| message_templates | TENANT_ISOLATED |
| workflows | TENANT_ISOLATED |
| power_dialers | TENANT_ISOLATED |
| appointments | TENANT_ISOLATED |
| saved_searches | TENANT_ISOLATED |
| response_buckets | TENANT_ISOLATED |
| lead_labels | TENANT_ISOLATED |
| message_labels | TENANT_ISOLATED |
| lead_activities | TENANT_ISOLATED |
| worker_personalities | TENANT_ISOLATED |
| prompts | TENANT_ISOLATED |
| content_items | TENANT_ISOLATED |
| content_categories | TENANT_ISOLATED |
| cadence_templates | TENANT_ISOLATED |
| sdr_campaign_configs | TENANT_ISOLATED |
| automation_plays | TENANT_ISOLATED |
| initial_messages | TENANT_ISOLATED |
| campaign_cadences | TENANT_ISOLATED |
| campaign_initial_messages | TENANT_ISOLATED |
| persona_socials | TENANT_ISOLATED |
| persona_merge_history | TENANT_ISOLATED |
| sdr_sessions | TENANT_ISOLATED |
| worker_voice_configs | TENANT_ISOLATED |
| shared_links | TENANT_ISOLATED |

### Shared/Inherited (P2) - 20 tables

| Table | Policy Type |
|-------|-------------|
| properties | SHARED_READ |
| property_distress_scores | SHARED_READ |
| property_search_blocks | SHARED_READ |
| workflow_tasks | SHARED_READ |
| workflow_fields | SHARED_READ |
| workflow_task_fields | SHARED_READ |
| achievement_definitions | SHARED_READ |
| campaign_sequences | INHERITED |
| campaign_leads | INHERITED |
| campaign_executions | INHERITED |
| campaign_events | INHERITED |
| lead_phone_numbers | INHERITED |
| lead_flags | INHERITED |
| lead_label_links | INHERITED |
| integration_fields | INHERITED |
| integration_tasks | INHERITED |
| message_label_links | INHERITED |
| dialer_contacts | INHERITED |
| call_histories | INHERITED |
| call_recordings | INHERITED |

---

## Implementation Steps

### Step 1: Create Session Context Function

```sql
-- Create function to safely get tenant context
CREATE OR REPLACE FUNCTION get_current_team_id()
RETURNS VARCHAR(36) AS $$
BEGIN
  RETURN current_setting('app.team_id', true);
END;
$$ LANGUAGE plpgsql STABLE;
```

### Step 2: Create Service Bypass Role

```sql
-- Create role for service accounts
CREATE ROLE nextier_service;
GRANT ALL ON ALL TABLES IN SCHEMA public TO nextier_service;

-- Allow bypass for admin operations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO nextier_service;
```

### Step 3: Apply Policies (Use migration script)

```sql
-- See SAFE_MIGRATIONS.sql for complete script
```

### Step 4: Update Application Connection

```typescript
// Drizzle ORM middleware
const db = drizzle(client, {
  beforeQuery: async (query) => {
    if (currentTeamId) {
      await client.query(`SET app.team_id = $1`, [currentTeamId]);
    }
  }
});
```

### Step 5: Test Policies

```sql
-- Test: Verify isolation
SET app.team_id = 'team_123';
SELECT * FROM leads; -- Should only return team_123 leads

SET app.team_id = 'team_456';
SELECT * FROM leads; -- Should only return team_456 leads

-- Test: Verify service bypass
SET ROLE nextier_service;
SELECT * FROM leads; -- Should return all leads
```

---

## Rollback Plan

If RLS causes issues, policies can be disabled without data loss:

```sql
-- Disable RLS on specific table
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- Or drop specific policy
DROP POLICY leads_tenant_policy ON leads;

-- Or disable for all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
```

---

## Monitoring

### Query to check RLS status

```sql
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
AND relkind = 'r'
ORDER BY relname;
```

### Query to list all policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
