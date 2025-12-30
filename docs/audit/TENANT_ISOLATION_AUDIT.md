# TENANT ISOLATION AUDIT

**Generated:** 2024-12-30
**Database:** OutreachGlobal PostgreSQL
**Audit Status:** CRITICAL ISSUES FOUND

---

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total Tables | 95 | - |
| Tables with `team_id` | 59 | ✅ |
| Tables without `team_id` | 36 | ⚠️ Needs Review |
| RLS Policies Enabled | 0 | 🚨 CRITICAL |
| Tables with team_id INDEX | 15 | ⚠️ 44 Missing |

**CRITICAL FINDING:** Zero Row-Level Security (RLS) policies exist. All tenant isolation relies on application-layer filtering only.

---

## Table Classification

### Category Definitions

| Category | Description | team_id Required |
|----------|-------------|------------------|
| **TENANT_SERVED** | Tenant-specific operational data | YES (enforced) |
| **SHARED_GLOBAL** | Read-only reference data shared across tenants | NO |
| **INHERITED** | Isolation inherited via FK to tenant-scoped parent | NO (via parent) |
| **SYSTEM** | Infrastructure/platform tables | NO |
| **ROOT** | Tenant/user identity tables | N/A |
| **🚨 NEEDS FIX** | Missing required tenant isolation | MUST ADD |

---

## TENANT_SERVED Tables (59 tables with team_id)

These tables contain tenant-specific data and MUST be isolated.

### Core Business Data

| Table | team_id | FK Enforced | Index on team_id | Risk |
|-------|---------|-------------|------------------|------|
| leads | ✅ YES | ✅ YES | ✅ YES | LOW |
| campaigns | ✅ YES | ✅ YES | ❌ NO | MEDIUM |
| messages | ✅ YES | ✅ YES | ❌ NO | MEDIUM |
| personas | ✅ YES | ❌ NO | ❌ NO | HIGH |
| businesses | ❌ NO | - | - | 🚨 CRITICAL |
| unified_lead_cards | ✅ YES | ❌ NO | ❌ NO | HIGH |

### Communication & Messaging

| Table | team_id | FK Enforced | Index on team_id | Risk |
|-------|---------|-------------|------------------|------|
| inbox_items | ✅ YES | ❌ NO | ❌ NO | HIGH |
| outreach_logs | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| scheduled_events | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| message_templates | ✅ YES | ✅ YES | ❌ NO | LOW |
| conversation_labels | ✅ YES | ❌ NO | ❌ NO | MEDIUM |

### AI & Intelligence

| Table | team_id | FK Enforced | Index on team_id | Risk |
|-------|---------|-------------|------------------|------|
| ai_sdr_avatars | ✅ YES | ✅ YES | ❌ NO | LOW |
| intelligence_log | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| intelligence_metrics | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| worker_personalities | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| prompts | ✅ YES | ✅ YES | ❌ NO | LOW |

### Persona & Contact Data

| Table | team_id | FK Enforced | Index on team_id | Risk |
|-------|---------|-------------|------------------|------|
| personas | ✅ YES | ❌ NO | ❌ NO | 🚨 HIGH |
| persona_phones | ✅ YES | ❌ NO | ❌ NO | HIGH |
| persona_emails | ✅ YES | ❌ NO | ❌ NO | HIGH |
| persona_addresses | ✅ YES | ❌ NO | ❌ NO | HIGH |
| persona_demographics | ✅ YES | ❌ NO | ❌ NO | HIGH |
| persona_socials | ✅ YES | ❌ NO | ❌ NO | HIGH |
| persona_merge_history | ✅ YES | ❌ NO | ❌ NO | MEDIUM |

### Campaign Management

| Table | team_id | FK Enforced | Index on team_id | Risk |
|-------|---------|-------------|------------------|------|
| campaigns | ✅ YES | ✅ YES | ❌ NO | MEDIUM |
| campaign_queue | ✅ YES | ❌ NO | ❌ NO | HIGH |
| campaign_initial_messages | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| campaign_cadences | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| cadence_templates | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| sdr_campaign_configs | ✅ YES | ❌ NO | ❌ NO | MEDIUM |

### Other Tenant Tables

| Table | team_id | FK Enforced | Index on team_id | Risk |
|-------|---------|-------------|------------------|------|
| integrations | ✅ YES | ✅ YES | ✅ YES | LOW |
| api_keys | ✅ YES | ✅ YES | ✅ YES | LOW |
| workflows | ✅ YES | ✅ YES | ✅ YES | LOW |
| power_dialers | ✅ YES | ✅ YES | ❌ NO | LOW |
| appointments | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| saved_searches | ✅ YES | ✅ YES | ✅ YES | LOW |
| shared_links | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| suppression_list | ✅ YES | ❌ NO | ❌ NO | HIGH |
| skiptrace_jobs | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| skiptrace_results | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| knowledge_documents | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| content_items | ✅ YES | ✅ YES | ✅ YES | LOW |
| content_categories | ✅ YES | ✅ YES | ✅ YES | LOW |
| response_buckets | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| lead_labels | ✅ YES | ✅ YES | ✅ YES | LOW |
| message_labels | ✅ YES | ✅ YES | ❌ NO | LOW |
| lead_activities | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| import_lead_presets | ✅ YES | ✅ YES | ❌ NO | LOW |
| automation_plays | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| initial_messages | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| leaderboard_snapshots | ✅ YES | ❌ NO | ❌ NO | LOW |
| user_achievements | ✅ YES | ❌ NO | ❌ NO | LOW |
| user_stats | ✅ YES | ❌ NO | ❌ NO | LOW |
| achievement_notifications | ✅ YES | ❌ NO | ❌ NO | LOW |
| sdr_sessions | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| worker_phone_assignments | ✅ YES | ❌ NO | ✅ YES | LOW |
| worker_voice_configs | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| property_owners | ✅ YES | ❌ NO | ❌ NO | MEDIUM |
| business_owners | ✅ YES | ❌ NO | ❌ NO | HIGH |
| property_searches | ✅ YES | ❌ NO | ❌ NO | MEDIUM |

---

## SHARED_GLOBAL Tables (Read-Only Reference Data)

These tables are intentionally shared across all tenants.

| Table | Purpose | Access Pattern |
|-------|---------|----------------|
| properties | Real estate reference data from RealEstateAPI | Read via property_owners JOIN |
| property_distress_scores | Property risk scoring data | Read-only reference |
| property_search_blocks | Cached property search results | Read-only reference |
| workflow_tasks | Global workflow task definitions | Read-only system config |
| workflow_fields | Global field definitions | Read-only system config |
| workflow_task_fields | Task-field mappings | Read-only system config |
| achievement_definitions | Gamification definitions | Read-only system config |

**Important:** Even shared tables should have RLS policies allowing read-only access.

---

## INHERITED Tables (Isolation via Parent FK)

These tables inherit tenant isolation through their parent foreign key relationships.

| Table | Parent Table | FK Column | Cascade Delete |
|-------|--------------|-----------|----------------|
| campaign_sequences | campaigns | campaign_id | YES |
| campaign_leads | campaigns, leads | campaign_id, lead_id | YES |
| campaign_executions | campaigns, leads | campaign_id, lead_id | YES |
| campaign_events | campaigns | campaign_id | YES |
| lead_phone_numbers | leads | lead_id | YES |
| lead_flags | leads | lead_id | YES |
| lead_label_links | leads, lead_labels | lead_id, label_id | YES |
| dialer_contacts | power_dialers, leads | power_dialer_id, lead_id | YES |
| call_histories | power_dialers | power_dialer_id | YES |
| call_recordings | call_histories | call_history_id | YES |
| integration_fields | integrations | integration_id | YES |
| integration_tasks | integrations | integration_id | YES |
| message_label_links | messages, message_labels | message_id, label_id | YES |
| saved_search_results | saved_searches | saved_search_id | YES |
| shared_link_views | shared_links | shared_link_id | YES |
| bucket_movements | - | inbox_item_id | - |
| content_usage_logs | content_items | content_item_id | - |
| workflow_links | workflows | workflow_id | YES |
| workflow_steps | workflows | workflow_id | YES |
| workflow_step_fields | workflow_steps | step_id | YES |
| workflow_runs | workflows | workflow_id | YES |
| workflow_step_runs | workflow_runs | run_id | YES |

---

## ROOT Tables (Identity)

| Table | Purpose |
|-------|---------|
| users | Global user accounts |
| teams | Tenant definitions |
| team_members | User-team membership |
| team_invitations | Pending team invites |
| team_settings | Team configuration |
| personal_access_tokens | User auth tokens |

---

## 🚨 CRITICAL: Tables Requiring Immediate Fix

### Missing team_id (MUST ADD)

| Table | Current Row Count | Risk | Fix Priority |
|-------|-------------------|------|--------------|
| businesses | 0 | 🚨 CRITICAL | P0 |
| buckets | 0 | 🚨 CRITICAL | P0 |
| data_sources | 0 | 🚨 HIGH | P1 |
| sms_messages | 0 | 🚨 HIGH | P1 |

### Has team_id but NO Foreign Key Constraint

| Table | Current Row Count | Risk |
|-------|-------------------|------|
| personas | 0 | 🚨 HIGH - PII data |
| persona_phones | 0 | 🚨 HIGH - PII data |
| persona_emails | 0 | 🚨 HIGH - PII data |
| persona_addresses | 0 | 🚨 HIGH - PII data |
| persona_demographics | 0 | 🚨 HIGH - PII data |
| persona_socials | 0 | HIGH |
| business_owners | 0 | HIGH |
| property_owners | 0 | HIGH |
| unified_lead_cards | 0 | HIGH |
| inbox_items | 0 | HIGH |
| campaign_queue | 0 | MEDIUM |
| suppression_list | 0 | HIGH - Compliance |

---

## Missing Indexes on team_id

**44 tables** have `team_id` column but NO index, causing performance degradation at scale.

Tables requiring `CREATE INDEX CONCURRENTLY`:

```
personas, persona_phones, persona_emails, persona_addresses,
persona_demographics, persona_socials, persona_merge_history,
business_owners, property_owners, unified_lead_cards,
campaigns, messages, inbox_items, outreach_logs,
scheduled_events, campaign_queue, campaign_initial_messages,
campaign_cadences, cadence_templates, sdr_campaign_configs,
ai_sdr_avatars, intelligence_log, intelligence_metrics,
worker_personalities, prompts, appointments, shared_links,
suppression_list, skiptrace_jobs, skiptrace_results,
knowledge_documents, response_buckets, lead_activities,
automation_plays, initial_messages, leaderboard_snapshots,
user_achievements, user_stats, achievement_notifications,
sdr_sessions, worker_voice_configs, property_searches
```

---

## Risk Matrix

| Risk Level | Definition | Table Count |
|------------|------------|-------------|
| 🚨 CRITICAL | Missing team_id on tenant data | 4 |
| 🚨 HIGH | Has team_id but no FK enforcement on PII | 12 |
| MEDIUM | Has team_id, has FK, but no index | 32 |
| LOW | Properly isolated with FK and index | 15 |
| N/A | Shared/System/Root tables | 32 |

---

## Recommendations

### Immediate (P0)

1. Add `team_id` column to: `businesses`, `buckets`, `data_sources`, `sms_messages`
2. Enable RLS on ALL tenant tables
3. Add FK constraints on persona_* tables

### Short-term (P1)

4. Create indexes on all team_id columns (use CONCURRENTLY)
5. Implement RLS bypass for service accounts
6. Add updated_at triggers

### Medium-term (P2)

7. Implement request correlation IDs
8. Add audit logging triggers
9. Consider table partitioning for high-volume tables

---

## Verification Queries

### Check tables without team_id
```sql
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_name = t.table_name
  AND c.column_name = 'team_id'
);
```

### Check tables without team_id index
```sql
SELECT DISTINCT t.relname as table_name
FROM pg_class t
JOIN pg_attribute a ON a.attrelid = t.oid
WHERE t.relnamespace = 'public'::regnamespace
AND t.relkind = 'r'
AND a.attname = 'team_id'
AND NOT EXISTS (
  SELECT 1 FROM pg_index ix
  JOIN pg_attribute ia ON ia.attrelid = t.oid AND ia.attnum = ANY(ix.indkey)
  WHERE ix.indrelid = t.oid AND ia.attname = 'team_id'
);
```

### Check RLS status
```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
AND relkind = 'r';
```
