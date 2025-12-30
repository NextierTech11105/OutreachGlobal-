# PERFORMANCE AND SCALE SAFETY

**Generated:** 2024-12-30
**Database:** PostgreSQL 17
**Current State:** Early stage (~164 rows total)

---

## Executive Summary

| Metric | Current | At Scale Risk |
|--------|---------|---------------|
| Total Rows | ~164 | - |
| Tables with team_id INDEX | 15 | ⚠️ 44 missing |
| Tables with FK INDEX | Partial | ⚠️ Many missing |
| Hot tables identified | 8 | 🔴 Need attention |
| Cross-tenant query risk | HIGH | 🔴 No RLS |

**Opportunity:** Database is nearly empty - ideal time to add indexes before data growth.

---

## Index Analysis

### Tables WITH team_id Index (15) ✅

| Table | Index Name | Unique |
|-------|------------|--------|
| api_keys | idx_api_keys_team | NO |
| content_categories | content_categories_team_id_idx | NO |
| content_items | content_items_team_id_idx | NO |
| integrations | integrations_name_team_id_index | NO |
| lead_labels | lead_labels_team_id_index | NO |
| lead_labels | lead_labels_team_id_name_category_index | NO |
| leads | leads_team_id_index | NO |
| leads | leads_team_id_integration_id_external_id_index | YES |
| saved_searches | saved_searches_team_id_index | NO |
| team_invitations | team_invitations_team_id_index | NO |
| team_invitations | team_invitations_team_id_email_index | NO |
| team_members | team_members_team_id_index | NO |
| team_settings | team_settings_team_id_name_scope_index | NO |
| worker_phone_assignments | worker_phone_assignments_team_id_idx | NO |
| workflows | workflows_team_id_index | NO |

### Tables MISSING team_id Index (44) 🔴

**High Priority (Hot tables):**
```
campaigns, messages, inbox_items, campaign_queue,
scheduled_events, outreach_logs, intelligence_log,
unified_lead_cards
```

**Medium Priority (PII/Tenant data):**
```
personas, persona_phones, persona_emails, persona_addresses,
persona_demographics, persona_socials, persona_merge_history,
business_owners, property_owners, suppression_list
```

**Lower Priority:**
```
ai_sdr_avatars, message_templates, appointments, shared_links,
skiptrace_jobs, skiptrace_results, knowledge_documents,
response_buckets, lead_activities, automation_plays,
initial_messages, leaderboard_snapshots, user_achievements,
user_stats, achievement_notifications, sdr_sessions,
worker_voice_configs, property_searches, cadence_templates,
sdr_campaign_configs, campaign_cadences, campaign_initial_messages,
conversation_labels, intelligence_metrics, prompts,
worker_personalities
```

---

## Hot Tables Analysis

Tables expected to have highest write/read volume at scale:

### Tier 1: Very High Volume

| Table | Expected Ops/Day | Current Rows | Index Status |
|-------|------------------|--------------|--------------|
| messages | 100K+ | 0 | ❌ No team_id idx |
| inbox_items | 50K+ | 0 | ❌ No team_id idx |
| campaign_queue | 50K+ | 0 | ❌ No team_id idx |
| scheduled_events | 50K+ | 0 | ❌ No team_id idx |
| outreach_logs | 100K+ | 0 | ❌ No team_id idx |

### Tier 2: High Volume

| Table | Expected Ops/Day | Current Rows | Index Status |
|-------|------------------|--------------|--------------|
| intelligence_log | 20K+ | 0 | ❌ No team_id idx |
| lead_activities | 20K+ | 0 | ❌ No team_id idx |
| campaign_executions | 50K+ | 0 | Inherited via FK |
| campaign_events | 20K+ | 0 | Inherited via FK |

### Tier 3: Medium Volume

| Table | Expected Ops/Day | Current Rows | Index Status |
|-------|------------------|--------------|--------------|
| leads | 5K+ | 0 | ✅ Has index |
| campaigns | 100+ | 0 | ❌ No team_id idx |
| personas | 5K+ | 0 | ❌ No team_id idx |
| unified_lead_cards | 5K+ | 0 | ❌ No team_id idx |

---

## Required Indexes

### P0: Critical (Add immediately)

```sql
-- Hot communication tables
CREATE INDEX CONCURRENTLY idx_messages_team_id
ON messages(team_id);

CREATE INDEX CONCURRENTLY idx_inbox_items_team_id
ON inbox_items(team_id);

CREATE INDEX CONCURRENTLY idx_campaign_queue_team_id
ON campaign_queue(team_id);

CREATE INDEX CONCURRENTLY idx_scheduled_events_team_id
ON scheduled_events(team_id);

CREATE INDEX CONCURRENTLY idx_outreach_logs_team_id
ON outreach_logs(team_id);

-- Hot intelligence tables
CREATE INDEX CONCURRENTLY idx_intelligence_log_team_id
ON intelligence_log(team_id);

CREATE INDEX CONCURRENTLY idx_lead_activities_team_id
ON lead_activities(team_id);
```

### P1: Important (Add before production)

```sql
-- Campaign management
CREATE INDEX CONCURRENTLY idx_campaigns_team_id
ON campaigns(team_id);

CREATE INDEX CONCURRENTLY idx_unified_lead_cards_team_id
ON unified_lead_cards(team_id);

-- PII tables (security + performance)
CREATE INDEX CONCURRENTLY idx_personas_team_id
ON personas(team_id);

CREATE INDEX CONCURRENTLY idx_persona_phones_team_id
ON persona_phones(team_id);

CREATE INDEX CONCURRENTLY idx_persona_emails_team_id
ON persona_emails(team_id);

CREATE INDEX CONCURRENTLY idx_persona_addresses_team_id
ON persona_addresses(team_id);

CREATE INDEX CONCURRENTLY idx_suppression_list_team_id
ON suppression_list(team_id);
```

### P2: Recommended (Add for optimization)

```sql
-- Remaining tenant tables
CREATE INDEX CONCURRENTLY idx_ai_sdr_avatars_team_id ON ai_sdr_avatars(team_id);
CREATE INDEX CONCURRENTLY idx_message_templates_team_id ON message_templates(team_id);
CREATE INDEX CONCURRENTLY idx_appointments_team_id ON appointments(team_id);
CREATE INDEX CONCURRENTLY idx_shared_links_team_id ON shared_links(team_id);
CREATE INDEX CONCURRENTLY idx_skiptrace_jobs_team_id ON skiptrace_jobs(team_id);
CREATE INDEX CONCURRENTLY idx_skiptrace_results_team_id ON skiptrace_results(team_id);
CREATE INDEX CONCURRENTLY idx_knowledge_documents_team_id ON knowledge_documents(team_id);
CREATE INDEX CONCURRENTLY idx_response_buckets_team_id ON response_buckets(team_id);
CREATE INDEX CONCURRENTLY idx_automation_plays_team_id ON automation_plays(team_id);
CREATE INDEX CONCURRENTLY idx_cadence_templates_team_id ON cadence_templates(team_id);
CREATE INDEX CONCURRENTLY idx_sdr_campaign_configs_team_id ON sdr_campaign_configs(team_id);
CREATE INDEX CONCURRENTLY idx_worker_personalities_team_id ON worker_personalities(team_id);
CREATE INDEX CONCURRENTLY idx_prompts_team_id ON prompts(team_id);
CREATE INDEX CONCURRENTLY idx_persona_demographics_team_id ON persona_demographics(team_id);
CREATE INDEX CONCURRENTLY idx_persona_socials_team_id ON persona_socials(team_id);
CREATE INDEX CONCURRENTLY idx_business_owners_team_id ON business_owners(team_id);
CREATE INDEX CONCURRENTLY idx_property_owners_team_id ON property_owners(team_id);
CREATE INDEX CONCURRENTLY idx_intelligence_metrics_team_id ON intelligence_metrics(team_id);
CREATE INDEX CONCURRENTLY idx_conversation_labels_team_id ON conversation_labels(team_id);
CREATE INDEX CONCURRENTLY idx_sdr_sessions_team_id ON sdr_sessions(team_id);
```

---

## Composite Index Recommendations

For frequently filtered queries, add composite indexes:

```sql
-- Messages by team and status (common query)
CREATE INDEX CONCURRENTLY idx_messages_team_status
ON messages(team_id, status);

-- Inbox items by team and bucket (filtering)
CREATE INDEX CONCURRENTLY idx_inbox_items_team_bucket
ON inbox_items(team_id, current_bucket);

-- Scheduled events by team and status (queue processing)
CREATE INDEX CONCURRENTLY idx_scheduled_events_team_status
ON scheduled_events(team_id, status);

-- Campaign queue by team and priority (queue ordering)
CREATE INDEX CONCURRENTLY idx_campaign_queue_team_priority
ON campaign_queue(team_id, priority DESC, scheduled_at ASC);

-- Leads by team and status (common filter)
CREATE INDEX CONCURRENTLY idx_leads_team_status
ON leads(team_id, status);

-- Intelligence log by team and type (analytics)
CREATE INDEX CONCURRENTLY idx_intelligence_log_team_type
ON intelligence_log(team_id, event_type);
```

---

## Cross-Tenant Query Risk

### High Risk Queries (Without RLS)

| Query Pattern | Risk | Mitigation |
|---------------|------|------------|
| `SELECT * FROM leads` | All tenants visible | Add RLS + team_id WHERE |
| `SELECT * FROM messages` | All tenants visible | Add RLS + team_id WHERE |
| `SELECT * FROM personas` | PII leakage | Add RLS + team_id WHERE |
| Aggregate queries | Cross-tenant stats | Always GROUP BY team_id |

### Query Patterns to Enforce

```typescript
// ALWAYS include team_id in WHERE clause
const leads = await db.query.leads.findMany({
  where: eq(leads.teamId, currentTeamId)  // REQUIRED
});

// NEVER do this
const allLeads = await db.query.leads.findMany();  // ❌ DANGEROUS
```

---

## Partitioning Recommendations

For tables expected to grow very large, consider partitioning:

### Candidates for Time-Based Partitioning

| Table | Partition Key | Rationale |
|-------|---------------|-----------|
| messages | created_at (monthly) | High volume, time-based queries |
| outreach_logs | created_at (monthly) | Audit data, retention policies |
| intelligence_log | created_at (monthly) | Analytics, archival |
| campaign_executions | created_at (monthly) | Historical queries |

### Candidates for Team-Based Partitioning

| Table | Partition Key | Rationale |
|-------|---------------|-----------|
| leads | team_id | Large tenant isolation |
| personas | team_id | PII isolation |
| unified_lead_cards | team_id | Performance |

### Partitioning Implementation (Future)

```sql
-- Example: Partition messages by month
CREATE TABLE messages_partitioned (
  LIKE messages INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE messages_2024_01 PARTITION OF messages_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_2024_02 PARTITION OF messages_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- etc.
```

---

## Connection Pooling

### Current Setup
- Using `pg` pool via Drizzle ORM
- Connection string from DATABASE_URL

### Recommendations

```typescript
// Recommended pool settings for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,           // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Query Performance Monitoring

### Add pg_stat_statements

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_exec_time / 1000 as total_seconds,
  mean_exec_time / 1000 as mean_seconds,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Query latency p99 | <100ms | >500ms |
| Connection count | <80% pool | >90% pool |
| Index hit ratio | >99% | <95% |
| Table scan ratio | <1% | >5% |
| Dead tuple ratio | <5% | >10% |

---

## Scale Projections

### Assumptions
- 100 tenants
- 10,000 leads per tenant
- 5 messages per lead per month
- 30-day retention for queue tables

### Projected Table Sizes

| Table | Rows (30 days) | Growth/Month |
|-------|----------------|--------------|
| leads | 1,000,000 | 100,000 |
| messages | 5,000,000 | 5,000,000 |
| personas | 1,000,000 | 100,000 |
| inbox_items | 1,000,000 | 1,000,000 |
| campaign_queue | 500,000 | Transient |
| intelligence_log | 5,000,000 | 5,000,000 |

### Index Size Estimates

| Index | Estimated Size |
|-------|----------------|
| messages_team_id_idx | ~200MB |
| leads_team_id_idx | ~40MB |
| personas_team_id_idx | ~40MB |

---

## Checklist

### Before Production

- [ ] All team_id columns have indexes
- [ ] Hot tables have composite indexes
- [ ] RLS policies enabled
- [ ] Connection pooling configured
- [ ] pg_stat_statements enabled
- [ ] Monitoring dashboards set up
- [ ] Backup strategy verified
- [ ] Failover tested

### Ongoing

- [ ] Weekly index usage review
- [ ] Monthly slow query analysis
- [ ] Quarterly partitioning evaluation
- [ ] Vacuum/analyze schedules set
