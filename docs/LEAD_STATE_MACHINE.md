# Lead State Machine - Nextier Platform

## Canonical Model vs Current Implementation

### Required States

| Canonical State | Current Implementation | Storage | Status |
|-----------------|----------------------|---------|--------|
| `NEW` | `leads.status = 'active'` (default) | Column | IMPLICIT |
| `TOUCHED` | `campaign_attempts.status = 'sent'` | Related table | SCATTERED |
| `RESPONDED` | `leads.tags.includes('responded')` | JSONB array | TAG-BASED |
| `EMAIL_CAPTURED` | `leads.tags.includes('email_captured')` | JSONB array | TAG-BASED |
| `HIGH_INTENT` | `leads.tags.includes('hot_lead')` | JSONB array | TAG-BASED |
| `IN_CALL_QUEUE` | `call_queue` table entry | Related table | EXPLICIT |
| `CLOSED` | `deals.status = 'closed'` | Related table | EXPLICIT |
| `SUPPRESSED` | `leads.optOut = true` | Column | EXPLICIT |

### Gap Analysis

| Issue | Severity | Impact |
|-------|----------|--------|
| States stored as tags (not enum) | HIGH | No validation, typos possible |
| Multiple sources of truth | HIGH | Inconsistent queries |
| No state transition logging | HIGH | No audit trail |
| Implicit NEW state | MEDIUM | Hard to query "untouched leads" |
| TOUCHED state scattered | MEDIUM | Requires JOIN to determine |

---

## State Transition Diagram

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌─────────┐    SMS_SENT    ┌─────────┐    SMS_RECEIVED   ┌─────────────┐
│   NEW   │ ─────────────► │ TOUCHED │ ───────────────► │  RESPONDED  │
└─────────┘                └─────────┘                   └─────────────┘
                                │                              │
                                │ TIMER_7D                     │
                                ▼                              │
                          ┌───────────┐                        │
                          │ RETARGET  │◄───────────────────────┤
                          │  READY    │                        │
                          └───────────┘                        │
                                │                              │
                                │ TIMER_14D                    │ EMAIL in body
                                ▼                              ▼
                          ┌───────────┐                 ┌──────────────┐
                          │  PIVOTED  │                 │EMAIL_CAPTURED│
                          │(new angle)│                 └──────────────┘
                          └───────────┘                        │
                                                               │ "call me"
                                                               ▼
                                                        ┌─────────────┐
                                                        │ HIGH_INTENT │
                                                        └─────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │IN_CALL_QUEUE │
                                                        └──────────────┘
                                                               │
                                                               │ CALL_COMPLETED
                                                               ▼
                                                        ┌─────────────┐
                                                        │   CLOSED    │
                                                        └─────────────┘

        ┌──────────────────────────────────────────────────────────────┐
        │                        ANY STATE                              │
        │                            │                                  │
        │                            │ OPT_OUT (STOP)                   │
        │                            ▼                                  │
        │                     ┌─────────────┐                           │
        │                     │ SUPPRESSED  │ ◄─ TERMINAL (no exit)     │
        │                     └─────────────┘                           │
        └──────────────────────────────────────────────────────────────┘
```

---

## Event Model

### Required Events vs Current Implementation

| Canonical Event | Triggers | Current Implementation | Status |
|-----------------|----------|----------------------|--------|
| `SMS_SENT` | Outbound SMS | `sms_messages` INSERT | EXISTS |
| `SMS_RECEIVED` | Inbound SMS webhook | `sms_messages` INSERT | EXISTS |
| `CALL_INBOUND` | Twilio webhook | `call_histories` INSERT | EXISTS |
| `EMAIL_CAPTURED` | Email regex match | Inline tag update | NOT EVENT |
| `TIMER_7D` | 7 days no response | GiannaLoopScheduler | IMPLICIT |
| `TIMER_14D` | 14 days in retarget | Stage delay config | IMPLICIT |
| `OPT_OUT` | STOP message | `optOutList` + lead update | EXISTS |
| `DELIVERED` | Delivery receipt | Not captured | MISSING |

### Event Storage Gap

**Current:** Events scattered across tables:
- `sms_messages` - SMS events
- `call_histories` - Call events
- `campaign_attempts` - Send attempts
- `webhook_events` - Raw webhooks

**Required:** Unified `lead_events` table for audit trail:
```sql
CREATE TABLE lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  event_type TEXT NOT NULL,  -- SMS_SENT, SMS_RECEIVED, etc.
  event_source TEXT NOT NULL, -- signalhouse, twilio, system
  payload JSONB,
  dedupe_key TEXT UNIQUE,  -- For idempotency
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX idx_lead_events_type ON lead_events(event_type);
CREATE INDEX idx_lead_events_time ON lead_events(created_at);
```

---

## Intent Classification Rules

### Deterministic Rules (First Priority)

| Pattern | Action | Implementation |
|---------|--------|----------------|
| Contains STOP/UNSUBSCRIBE | → SUPPRESSED | `apps/front/src/app/api/webhook/signalhouse/route.ts` |
| Contains @ (email) | → EMAIL_CAPTURED | Same file, regex match |
| Contains "call me"/"today"/"now" | → HIGH_INTENT | `response-classifications.ts` |

### Pattern Scoring (Second Priority)

| Signal | Weight | File |
|--------|--------|------|
| Urgency words | +0.4 | `response-classifications.ts` |
| Questions | +0.3 | Same |
| Pricing inquiry | +0.5 | Same |

### AI Classification (Last, Recommend Only)

- AI outputs `{ label, confidence, recommended_state }`
- System decides based on rules first
- AI is advisory, not authoritative

---

## Timer Implementation

### 7-Day Review Timer

**Condition:**
- State = TOUCHED
- No inbound SMS
- No inbound call
- 7 days elapsed

**Action:** Move to RETARGET_READY

**Current Implementation:**
- File: `apps/front/src/lib/schedulers/gianna-loop-scheduler.ts`
- Uses 24-hour delay between messages
- NOT a true 7-day timer

**Gap:** Timer logic is stage-based, not explicit timer table

### 14-Day Pivot Timer

**Condition:**
- State = RETARGET_READY
- 14 days elapsed

**Action:**
- Rotate phone number
- Rotate message angle
- Reassign campaign

**Current Implementation:**
- Stage config: `nudge: 14 days` in `contexts.ts`
- No explicit timer table

**Required:**
```sql
CREATE TABLE lead_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(id),
  timer_type TEXT NOT NULL,  -- '7_day', '14_day', 'follow_up'
  trigger_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(lead_id, timer_type)  -- One timer per type per lead
);

CREATE INDEX idx_lead_timers_trigger ON lead_timers(trigger_at)
  WHERE executed_at IS NULL AND cancelled_at IS NULL;
```

---

## Call Queue Logic

### Priority Calculation

```
priority =
    intent_score * 0.5
  + recency_score * 0.3
  + channel_weight * 0.2
```

### Current Implementation

**File:** `apps/front/src/app/api/webhook/signalhouse/route.ts`

```typescript
// pushToCallQueue when GOLD label (email + mobile captured)
await db.insert(callQueue).values({
  leadId: lead.id,
  priority: 100,  // Fixed, not calculated
  assignedTo: 'SABRINA',
  reason: 'gold_label'
});
```

**Gap:** Priority is hardcoded, not calculated from scoring

### Required Implementation

```typescript
function calculatePriority(lead: Lead, intent: IntentResult): number {
  const intentScore = intent.confidence * 100;  // 0-100
  const recencyScore = getRecencyScore(lead.lastContactAt);  // 0-100
  const channelWeight = lead.hasEmail && lead.hasMobile ? 100 : 50;

  return Math.round(
    intentScore * 0.5 +
    recencyScore * 0.3 +
    channelWeight * 0.2
  );
}
```

---

## Idempotency

### Webhook Idempotency (Exists)

**File:** `apps/front/src/lib/webhook/idempotency.ts`

```typescript
// Uses Redis with 24-hour TTL
const key = `webhook:processed:${source}:${eventId}`;
await redis.set(key, '1', { ex: 86400 });
```

**Status:** IMPLEMENTED

### Outbound Send Idempotency (Gap)

**Required:**
```sql
CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  channel TEXT NOT NULL,  -- 'sms', 'mms', 'email'
  template_id TEXT,
  send_key TEXT UNIQUE,  -- 'sms:{lead_id}:{campaign_id}:{block}:{attempt}'
  sent_at TIMESTAMPTZ,
  external_id TEXT,  -- SignalHouse message_sid
  status TEXT DEFAULT 'pending'
);
```

**Logic:**
```typescript
// Before sending
const sendKey = `sms:${leadId}:${campaignId}:${block}:${attempt}`;
const result = await db.insert(outboundMessages)
  .values({ leadId, sendKey, ... })
  .onConflictDoNothing();

if (result.rowCount === 0) {
  // Already sent, skip
  return;
}

// Safe to send
await signalhouse.send({ ... });
```

**Current Status:** NOT IMPLEMENTED - double sends possible

---

## Gaps Summary

### Critical Gaps

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| No `lead_events` table | No audit trail | Add table + migration |
| No `lead_timers` table | Timers not reliable | Add table + scheduler |
| No outbound idempotency | Double sends possible | Add `outbound_messages` |
| States as tags not enum | No validation | Add `lead_state` column |

### Moderate Gaps

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| Priority hardcoded | Suboptimal queue order | Implement scoring |
| No DELIVERED event | Incomplete metrics | Capture delivery receipts |
| Timer logic implicit | Hard to debug | Make timers explicit |

### Low Priority

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| Multiple event tables | Query complexity | Consolidate (future) |
| No event replay | Can't reprocess | Add replay capability (future) |

---

## Recommended Schema Changes

### Migration 0028: Lead State Machine

```sql
-- 1. Add explicit lead_state column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS
  lead_state TEXT DEFAULT 'new';

-- 2. Create lead_events table
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  payload JSONB,
  dedupe_key TEXT UNIQUE,
  previous_state TEXT,
  new_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX idx_lead_events_type ON lead_events(event_type);
CREATE INDEX idx_lead_events_dedupe ON lead_events(dedupe_key);

-- 3. Create lead_timers table
CREATE TABLE IF NOT EXISTS lead_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  timer_type TEXT NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB,
  UNIQUE(lead_id, timer_type)
);

CREATE INDEX idx_lead_timers_pending ON lead_timers(trigger_at)
  WHERE executed_at IS NULL AND cancelled_at IS NULL;

-- 4. Create outbound_messages table
CREATE TABLE IF NOT EXISTS outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  campaign_id TEXT,
  channel TEXT NOT NULL,
  template_id TEXT,
  send_key TEXT UNIQUE,
  external_id TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outbound_send_key ON outbound_messages(send_key);
CREATE INDEX idx_outbound_lead ON outbound_messages(lead_id);

-- 5. Backfill lead_state from tags (data migration)
UPDATE leads SET lead_state = 'suppressed' WHERE opt_out = true;
UPDATE leads SET lead_state = 'responded'
  WHERE tags::jsonb ? 'responded' AND lead_state = 'new';
UPDATE leads SET lead_state = 'email_captured'
  WHERE tags::jsonb ? 'email_captured' AND lead_state IN ('new', 'responded');
UPDATE leads SET lead_state = 'high_intent'
  WHERE tags::jsonb ? 'hot_lead' AND lead_state NOT IN ('suppressed');
```

---

## SignalHouse Webhook Contract

### Inbound SMS Payload

```json
{
  "event": "SMS_RECEIVED",
  "message_sid": "SM123",
  "from": "+15164079249",
  "to": "+1XXXXXXXXXX",
  "text": "call me today",
  "timestamp": "2026-01-02T21:03:11Z"
}
```

### Required Processing

```sql
-- 1. Webhook idempotency (EXISTS)
-- Via Redis: webhook:processed:signalhouse:SMS_RECEIVED:SM123

-- 2. Event logging (NEEDED)
INSERT INTO lead_events (tenant_id, lead_id, event_type, payload, dedupe_key)
VALUES (:tenant_id, :lead_id, 'SMS_RECEIVED', :payload, 'signalhouse:SMS_RECEIVED:SM123')
ON CONFLICT DO NOTHING;

-- 3. State transition (via orchestrator)
-- Classify intent → Update lead_state → Queue if high_intent
```

### STOP/OPT-OUT (Terminal)

```sql
UPDATE leads
SET lead_state = 'suppressed', opt_out = true, updated_at = NOW()
WHERE id = :lead_id;

-- Cancel all timers
UPDATE lead_timers
SET cancelled_at = NOW()
WHERE lead_id = :lead_id AND cancelled_at IS NULL;

-- Remove from queues
DELETE FROM call_queue WHERE lead_id = :lead_id;
```

---

## Responsibilities Matrix

| Concern | Owner | NOT Owner |
|---------|-------|-----------|
| SMS delivery | SignalHouse | Nextier |
| 10DLC compliance | SignalHouse | Nextier |
| Phone number management | SignalHouse | Nextier |
| STOP/HELP compliance | SignalHouse | Nextier |
| Lead state | Nextier | SignalHouse |
| Intent classification | Nextier | SignalHouse |
| Timer logic | Nextier | SignalHouse |
| Call queue | Nextier | SignalHouse |
| Business decisions | Nextier | SignalHouse |
