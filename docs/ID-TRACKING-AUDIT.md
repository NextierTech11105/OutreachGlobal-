# ID-Tracking System Audit & Refactor Plan

**Date:** 2024-12-23
**Scope:** leads.schema.ts, properties.schema.ts, integrations.schema.ts, inbox.schema.ts, skiptrace-result.schema.ts, unified-lead-card.schema.ts, business-owner.schema.ts, persona.schema.ts, phone.schema.ts, messages.schema.ts, campaigns.schema.ts

---

## 1. High-Level Audit Summary

1. **ULID Primary Keys Well-Implemented**: All tables use `primaryUlid(prefix)` generating prefixed ULIDs (e.g., `lead_01ARZ3NDEKTSV4RRFFQ69G5FAV`). This is a strong pattern for distributed ID generation and debugging.

2. **External ID Deduplication Gaps**: Several tables accept external system IDs (`externalId`, `sourceRecordId`, `jobId`) without unique constraints, risking duplicate imports from CRM syncs, bulk uploads, and webhook deliveries.

3. **Cross-Table Linkage Risks**: The `unifiedLeadCards` and `campaignQueue` tables lack composite uniqueness constraints, allowing duplicate lead cards for the same persona and duplicate queue entries for the same lead+agent+channel.

4. **Message Tracking Vulnerability**: The `messages.externalId` (SignalHouse SID, email ID) has no unique index, making idempotent webhook processing impossible and risking duplicate message records.

5. **Missing Business Deduplication**: The `businesses` table has no unique constraint on `sourceRecordId + sourceFile`, meaning the same business can be imported multiple times from the same CSV.

---

## 2. Concrete Refactor Goals

| # | Goal | Rationale |
|---|------|-----------|
| 1 | **Add unique constraint on `messages.externalId`** | Prevent duplicate message records from webhook retries. Essential for SignalHouse delivery receipts. |
| 2 | **Add composite unique on `businesses(teamId, sourceRecordId, sourceFile)`** | Prevent duplicate business imports from the same source file. |
| 3 | **Add composite unique on `unifiedLeadCards(teamId, personaId)`** | One lead card per persona per team - prevents campaign assignment collisions. |
| 4 | **Add composite unique on `campaignQueue(teamId, leadCardId, agent, channel)`** | Prevent duplicate queue entries for the same lead/agent/channel combo. |
| 5 | **Add unique constraint on `skiptraceResults(teamId, personaId, provider)`** | One skip trace result per persona per provider - enables upsert pattern. |
| 6 | **Add partial unique index on `leadActivities.externalId WHERE externalId IS NOT NULL`** | Idempotent activity logging for webhook-sourced events. |

---

## 3. Schema/Index Changes with SQL Migrations

### Migration 001: Messages External ID Uniqueness

```sql
-- Migration: 001_messages_external_id_unique.sql
-- Purpose: Prevent duplicate message records from webhook retries

-- First, clean up any existing duplicates (keep oldest)
DELETE FROM messages m1
USING messages m2
WHERE m1.external_id = m2.external_id
  AND m1.external_id IS NOT NULL
  AND m1.id > m2.id;

-- Add unique index (partial - only where external_id is not null)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  messages_external_id_unique_idx
  ON messages (external_id)
  WHERE external_id IS NOT NULL;

-- Drizzle schema update:
-- In messages.schema.ts, add to table definition:
-- (t) => [
--   uniqueIndex("messages_external_id_unique_idx").on(t.externalId).where(sql`${t.externalId} IS NOT NULL`),
-- ]
```

### Migration 002: Business Deduplication

```sql
-- Migration: 002_businesses_source_unique.sql
-- Purpose: Prevent duplicate business imports from same source

-- Add composite unique index
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  businesses_source_dedup_idx
  ON businesses (team_id, source_record_id, source_file)
  WHERE source_record_id IS NOT NULL AND source_file IS NOT NULL;

-- Drizzle schema update:
-- In business-owner.schema.ts, add to businesses table:
-- uniqueIndex("businesses_source_dedup_idx")
--   .on(t.teamId, t.sourceRecordId, t.sourceFile)
--   .where(sql`${t.sourceRecordId} IS NOT NULL AND ${t.sourceFile} IS NOT NULL`),
```

### Migration 003: Unified Lead Card Uniqueness

```sql
-- Migration: 003_unified_lead_cards_persona_unique.sql
-- Purpose: One lead card per persona per team

-- Clean duplicates (keep highest scored)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY team_id, persona_id
    ORDER BY total_score DESC, created_at ASC
  ) as rn
  FROM unified_lead_cards
)
DELETE FROM unified_lead_cards
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  unified_lead_cards_persona_unique_idx
  ON unified_lead_cards (team_id, persona_id);

-- Drizzle schema update:
-- In unified-lead-card.schema.ts, add to unifiedLeadCards:
-- uniqueIndex("unified_lead_cards_persona_unique_idx").on(t.teamId, t.personaId),
```

### Migration 004: Campaign Queue Deduplication

```sql
-- Migration: 004_campaign_queue_dedup.sql
-- Purpose: Prevent duplicate queue entries for same lead/agent/channel

-- Clean duplicates (keep pending/oldest)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY team_id, lead_card_id, agent, channel
    ORDER BY
      CASE status WHEN 'pending' THEN 0 ELSE 1 END,
      created_at ASC
  ) as rn
  FROM campaign_queue
)
DELETE FROM campaign_queue
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint for pending items
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  campaign_queue_pending_unique_idx
  ON campaign_queue (team_id, lead_card_id, agent, channel)
  WHERE status = 'pending';

-- Drizzle schema update:
-- In unified-lead-card.schema.ts, add to campaignQueue:
-- uniqueIndex("campaign_queue_pending_unique_idx")
--   .on(t.teamId, t.leadCardId, t.agent, t.channel)
--   .where(sql`${t.status} = 'pending'`),
```

### Migration 005: Skip Trace Result Uniqueness

```sql
-- Migration: 005_skiptrace_results_unique.sql
-- Purpose: One skip trace result per persona per provider (upsert pattern)

-- Clean duplicates (keep most recent successful)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY team_id, persona_id, provider
    ORDER BY
      CASE WHEN success THEN 0 ELSE 1 END,
      created_at DESC
  ) as rn
  FROM skiptrace_results
  WHERE persona_id IS NOT NULL
)
DELETE FROM skiptrace_results
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  skiptrace_results_persona_provider_idx
  ON skiptrace_results (team_id, persona_id, provider)
  WHERE persona_id IS NOT NULL;

-- Drizzle schema update:
-- In skiptrace-result.schema.ts, add to skiptraceResults:
-- uniqueIndex("skiptrace_results_persona_provider_idx")
--   .on(t.teamId, t.personaId, t.provider)
--   .where(sql`${t.personaId} IS NOT NULL`),
```

### Migration 006: Lead Activities External ID

```sql
-- Migration: 006_lead_activities_external_id_unique.sql
-- Purpose: Idempotent activity logging for webhook events

-- Add partial unique index
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  lead_activities_external_id_unique_idx
  ON lead_activities (team_id, external_id)
  WHERE external_id IS NOT NULL;

-- Drizzle schema update:
-- In unified-lead-card.schema.ts, add to leadActivities:
-- uniqueIndex("lead_activities_external_id_unique_idx")
--   .on(t.teamId, t.externalId)
--   .where(sql`${t.externalId} IS NOT NULL`),
```

---

## 4. Drizzle Schema Updates Summary

### messages.schema.ts
```typescript
export const messages = pgTable("messages", {
  // ... existing columns
}, (t) => [
  // ADD:
  uniqueIndex("messages_external_id_unique_idx")
    .on(t.externalId)
    .where(sql`${t.externalId} IS NOT NULL`),
]);
```

### business-owner.schema.ts
```typescript
export const businesses = pgTable("businesses", {
  // ... existing columns
}, (t) => [
  // ... existing indexes
  // ADD:
  uniqueIndex("businesses_source_dedup_idx")
    .on(t.teamId, t.sourceRecordId, t.sourceFile)
    .where(sql`${t.sourceRecordId} IS NOT NULL AND ${t.sourceFile} IS NOT NULL`),
]);
```

### unified-lead-card.schema.ts
```typescript
export const unifiedLeadCards = pgTable("unified_lead_cards", {
  // ... existing columns
}, (t) => [
  // ... existing indexes
  // ADD:
  uniqueIndex("unified_lead_cards_persona_unique_idx").on(t.teamId, t.personaId),
]);

export const campaignQueue = pgTable("campaign_queue", {
  // ... existing columns
}, (t) => [
  // ... existing indexes
  // ADD:
  uniqueIndex("campaign_queue_pending_unique_idx")
    .on(t.teamId, t.leadCardId, t.agent, t.channel)
    .where(sql`${t.status} = 'pending'`),
]);

export const leadActivities = pgTable("lead_activities", {
  // ... existing columns
}, (t) => [
  // ... existing indexes
  // ADD:
  uniqueIndex("lead_activities_external_id_unique_idx")
    .on(t.teamId, t.externalId)
    .where(sql`${t.externalId} IS NOT NULL`),
]);
```

### skiptrace-result.schema.ts
```typescript
export const skiptraceResults = pgTable("skiptrace_results", {
  // ... existing columns
}, (t) => [
  // ... existing indexes
  // ADD:
  uniqueIndex("skiptrace_results_persona_provider_idx")
    .on(t.teamId, t.personaId, t.provider)
    .where(sql`${t.personaId} IS NOT NULL`),
]);
```

---

## 5. Application Code Impact

### Upsert Patterns Required

After adding unique constraints, the following code patterns need updates:

1. **Message Creation** (webhook handlers):
   ```typescript
   // Before: insert().values(...)
   // After:
   await db.insert(messages)
     .values({ externalId, ... })
     .onConflictDoNothing();  // or .onConflictDoUpdate()
   ```

2. **Business Import** (CSV upload handlers):
   ```typescript
   await db.insert(businesses)
     .values({ teamId, sourceRecordId, sourceFile, ... })
     .onConflictDoUpdate({
       target: [businesses.teamId, businesses.sourceRecordId, businesses.sourceFile],
       set: { updatedAt: new Date(), ... }
     });
   ```

3. **Lead Card Creation** (enrichment pipeline):
   ```typescript
   await db.insert(unifiedLeadCards)
     .values({ teamId, personaId, ... })
     .onConflictDoUpdate({
       target: [unifiedLeadCards.teamId, unifiedLeadCards.personaId],
       set: { totalScore, enrichmentStatus, updatedAt: new Date() }
     });
   ```

4. **Skip Trace Results** (skip trace service):
   ```typescript
   await db.insert(skiptraceResults)
     .values({ teamId, personaId, provider, ... })
     .onConflictDoUpdate({
       target: [skiptraceResults.teamId, skiptraceResults.personaId, skiptraceResults.provider],
       set: { rawResponse, success, processedAt: new Date() }
     });
   ```

---

## 6. Migration Execution Order

1. Run cleanup queries in a maintenance window
2. Apply migrations 001-006 using `CREATE INDEX CONCURRENTLY` (non-blocking)
3. Update Drizzle schema files
4. Run `pnpm drizzle-kit generate` to verify alignment
5. Update application code to use upsert patterns
6. Deploy application changes

---

## 7. Tables Already Well-Constrained (No Action Needed)

| Table | Existing Constraint |
|-------|---------------------|
| `leads` | `uniqueIndex().on(t.teamId, t.integrationId, t.externalId)` |
| `properties` | `uniqueIndex().on(t.externalId, t.source)` |
| `propertyDistressScores` | `uniqueIndex().on(t.provider, t.externalId)` |
| `integrations` | `uniqueIndex().on(t.name, t.teamId)` |
| `integrationFields` | `uniqueIndex().on(t.integrationId, t.moduleName, t.sourceField)` |
| `campaignLeads` | `uniqueIndex().on(t.campaignId, t.leadId)` |
| `personaPhones` | `uniqueIndex().on(t.personaId, t.normalizedNumber)` |
| `businessOwners` | `uniqueIndex().on(t.personaId, t.businessId)` |

---

**NO AUTH CHANGES INCLUDED** - This audit focuses solely on ID tracking and deduplication patterns.
