# AUDITABILITY REPORT

**Generated:** 2024-12-30
**System:** OutreachGlobal / Nextier Platform
**Compliance Focus:** TCPA, Data Privacy, AI Decision Traceability

---

## Executive Summary

| Metric | Status |
|--------|--------|
| Tables with `created_at` | ✅ Most have |
| Tables with `updated_at` | ⚠️ Partial coverage |
| Tables with creator tracking | ⚠️ Limited |
| Audit log tables | ✅ Exist but incomplete |
| AI decision logging | ✅ intelligence_log |
| Correlation ID support | ❌ Not implemented |

---

## Audit Trail Analysis

### Existing Audit Tables

| Table | Purpose | Coverage |
|-------|---------|----------|
| `lead_activities` | Lead-level activity log | ✅ Good |
| `campaign_events` | Campaign milestone tracking | ✅ Good |
| `campaign_executions` | Individual send tracking | ✅ Good |
| `intelligence_log` | AI decision audit | ✅ Good |
| `content_usage_logs` | Template usage tracking | ✅ Good |
| `outreach_logs` | Communication audit | ✅ Good |
| `bucket_movements` | Inbox routing history | ✅ Good |

### Missing Audit Capabilities

| Gap | Impact | Priority |
|-----|--------|----------|
| No `updated_at` triggers | Can't track modification times | P1 |
| No `updated_by` column | Can't track who modified | P2 |
| No correlation_id | Can't trace request chains | P1 |
| No schema change audit | Can't track DDL changes | P3 |

---

## Table-by-Table Audit Compliance

### Core Business Tables

| Table | created_at | updated_at | created_by | Audit Log |
|-------|------------|------------|------------|-----------|
| leads | ✅ | ✅ | ❌ | lead_activities |
| campaigns | ✅ | ✅ | ❌ | campaign_events |
| messages | ✅ | ❌ | ❌ | outreach_logs |
| personas | ✅ | ✅ | ❌ | ❌ Missing |
| businesses | ✅ | ✅ | ❌ | ❌ Missing |
| unified_lead_cards | ✅ | ✅ | ❌ | ❌ Missing |

### PII Tables (Require Full Audit)

| Table | created_at | updated_at | Audit Status |
|-------|------------|------------|--------------|
| persona_phones | ✅ | ✅ | ⚠️ No audit log |
| persona_emails | ✅ | ✅ | ⚠️ No audit log |
| persona_addresses | ✅ | ✅ | ⚠️ No audit log |
| persona_demographics | ✅ | ✅ | ⚠️ No audit log |
| suppression_list | ✅ | ❌ | ⚠️ Critical for TCPA |

### Communication Tables

| Table | created_at | updated_at | Delivery Tracking |
|-------|------------|------------|-------------------|
| messages | ✅ | ❌ | ✅ status, sent_at, delivered_at |
| sms_messages | ✅ | ❌ | ✅ provider_message_id |
| inbox_items | ✅ | ✅ | ✅ classification timestamps |
| scheduled_events | ✅ | ✅ | ✅ executed_at, completed_at |

### AI & Intelligence Tables

| Table | created_at | Decision Logged | Confidence |
|-------|------------|-----------------|------------|
| intelligence_log | ✅ | ✅ | ✅ |
| intelligence_metrics | ✅ | ✅ | ✅ |
| ai_sdr_avatars | ✅ | N/A | N/A |
| worker_personalities | ✅ | N/A | N/A |

---

## TCPA Compliance Audit

### Required Tracking Points

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Opt-out timestamp | suppression_list.created_at | ✅ |
| Consent record | Not explicitly tracked | ⚠️ Needs work |
| Do-not-call list | suppression_list table | ✅ |
| Message delivery proof | messages.delivered_at + provider_id | ✅ |
| Attempt counting | campaign_executions | ✅ |
| Time-of-day compliance | scheduled_events.scheduled_at | ✅ |

### TCPA Audit Query

```sql
-- Get all outreach attempts for compliance
SELECT
  l.id as lead_id,
  l.phone,
  m.sent_at,
  m.status,
  m.provider_message_id,
  ce.status as execution_status,
  CASE WHEN sl.id IS NOT NULL THEN 'SUPPRESSED' ELSE 'ACTIVE' END as dnc_status
FROM leads l
LEFT JOIN messages m ON m.lead_id = l.id
LEFT JOIN campaign_executions ce ON ce.lead_id = l.id
LEFT JOIN suppression_list sl ON sl.phone = l.phone
WHERE l.team_id = 'team_xxx'
ORDER BY m.sent_at DESC;
```

---

## AI Decision Auditability

### intelligence_log Schema

```sql
-- Current schema captures:
- team_id         -- Tenant isolation
- lead_id         -- Associated lead
- campaign_id     -- Campaign context
- event_type      -- Type of AI decision
- worker_id       -- Which AI worker
- input_message   -- What triggered the decision
- output_message  -- AI's response
- outcome         -- Result (sent, rejected, etc.)
- was_successful  -- Success flag
- patterns        -- Detected patterns (JSONB)
- human_feedback  -- Post-hoc human review
- edited_response -- If human modified AI output
- created_at      -- Timestamp
```

### AI Audit Requirements

| Requirement | Tracked In | Status |
|-------------|------------|--------|
| Which AI made decision | worker_id | ✅ |
| What input triggered it | input_message | ✅ |
| What output was generated | output_message | ✅ |
| Was it successful | was_successful | ✅ |
| Human override | human_feedback, edited_response | ✅ |
| Confidence score | patterns.confidence | ⚠️ In JSONB |
| Approval chain | Not tracked | ❌ Missing |

---

## Recommendations

### P0: Critical Audit Gaps

#### 1. Add Correlation ID System

```sql
-- Add to all major tables
ALTER TABLE messages ADD COLUMN correlation_id VARCHAR(64);
ALTER TABLE campaign_executions ADD COLUMN correlation_id VARCHAR(64);
ALTER TABLE intelligence_log ADD COLUMN correlation_id VARCHAR(64);

CREATE INDEX idx_messages_correlation ON messages(correlation_id);
CREATE INDEX idx_campaign_exec_correlation ON campaign_executions(correlation_id);
CREATE INDEX idx_intelligence_correlation ON intelligence_log(correlation_id);
```

```typescript
// Generate and propagate in application
const correlationId = `corr_${ulid()}`;
await db.insert(messages).values({
  ...messageData,
  correlationId
});
```

#### 2. Add Consent Tracking Table

```sql
CREATE TABLE consent_records (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL REFERENCES teams(id),
  lead_id VARCHAR(36) REFERENCES leads(id),
  phone VARCHAR(20),
  email VARCHAR(255),
  consent_type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'voice'
  consent_given BOOLEAN NOT NULL,
  consent_method VARCHAR(50), -- 'web_form', 'verbal', 'written'
  consent_text TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  consented_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT consent_records_team_fk
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_consent_team ON consent_records(team_id);
CREATE INDEX idx_consent_phone ON consent_records(phone);
CREATE INDEX idx_consent_lead ON consent_records(lead_id);
```

### P1: Add Missing Timestamps

```sql
-- Add updated_at to tables missing it
ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE suppression_list ADD COLUMN updated_at TIMESTAMP;
-- ... (see SAFE_MIGRATIONS.sql for complete list)

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### P2: Add User Attribution

```sql
-- Add created_by/updated_by to key tables
ALTER TABLE leads ADD COLUMN created_by_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE leads ADD COLUMN updated_by_id VARCHAR(36) REFERENCES users(id);

ALTER TABLE campaigns ADD COLUMN created_by_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE campaigns ADD COLUMN updated_by_id VARCHAR(36) REFERENCES users(id);
```

---

## Audit Queries

### Compliance Report Query

```sql
-- Full audit trail for a lead
SELECT
  'LEAD_CREATED' as event,
  l.created_at as timestamp,
  NULL as details
FROM leads l
WHERE l.id = 'lead_xxx'

UNION ALL

SELECT
  'ACTIVITY' as event,
  la.created_at,
  la.activity_type || ': ' || la.subject
FROM lead_activities la
WHERE la.lead_card_id = 'lead_xxx'

UNION ALL

SELECT
  'MESSAGE_SENT' as event,
  m.sent_at,
  'To: ' || m.to_number || ' Status: ' || m.status
FROM messages m
WHERE m.lead_id = 'lead_xxx'

UNION ALL

SELECT
  'AI_DECISION' as event,
  il.created_at,
  il.event_type || ' by ' || il.worker_id
FROM intelligence_log il
WHERE il.lead_id = 'lead_xxx'

ORDER BY timestamp;
```

### AI Decision Audit Query

```sql
-- All AI decisions for compliance review
SELECT
  il.created_at,
  il.team_id,
  il.lead_id,
  il.worker_id,
  il.event_type,
  il.input_message,
  il.output_message,
  il.was_successful,
  il.human_feedback,
  il.edited_response IS NOT NULL as was_edited
FROM intelligence_log il
WHERE il.team_id = 'team_xxx'
AND il.created_at > NOW() - INTERVAL '30 days'
ORDER BY il.created_at DESC;
```

### Opt-Out Compliance Query

```sql
-- Verify opt-out processing
SELECT
  sl.phone,
  sl.created_at as opted_out_at,
  (
    SELECT COUNT(*)
    FROM messages m
    JOIN leads l ON l.id = m.lead_id
    WHERE l.phone = sl.phone
    AND m.sent_at > sl.created_at
  ) as messages_after_optout
FROM suppression_list sl
WHERE sl.team_id = 'team_xxx'
AND (
  SELECT COUNT(*)
  FROM messages m
  JOIN leads l ON l.id = m.lead_id
  WHERE l.phone = sl.phone
  AND m.sent_at > sl.created_at
) > 0;  -- Find violations
```

---

## Audit Checklist

### Per-Table Compliance

- [ ] Has `created_at` column
- [ ] Has `updated_at` column with trigger
- [ ] Has creator attribution (created_by_id)
- [ ] Has modifier attribution (updated_by_id)
- [ ] Linked to audit log table
- [ ] Supports correlation_id queries

### System-Wide Compliance

- [ ] All mutations logged to audit tables
- [ ] AI decisions have full context captured
- [ ] Opt-outs are immediately effective
- [ ] Consent records maintained
- [ ] Request correlation supported
- [ ] Retention policies defined
- [ ] Data export capability (GDPR)
- [ ] Data deletion capability (GDPR)
