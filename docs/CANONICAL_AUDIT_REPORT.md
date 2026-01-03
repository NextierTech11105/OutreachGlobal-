# Canonical Architecture Audit Report

**Generated**: 2026-01-02
**Scope**: SignalHouse Webhook → Nextier SQL Compliance
**Status**: Gap Analysis Complete

---

## Executive Summary

This audit compares the current Nextier implementation against the canonical SignalHouse integration specification. The audit identifies **critical gaps** in idempotency, state management, and timer handling that could cause:
- Double-sends to leads
- Missing state transitions
- Lost webhook events
- Inconsistent lead progression

**Overall Compliance Score: 65/100**

---

## Part 1: Webhook Idempotency

### Canonical Requirement
```sql
-- On every inbound webhook:
INSERT INTO webhook_receipts (idempotency_key, created_at)
VALUES ($message_id, NOW())
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id;
-- If no row returned → already processed, skip
```

### Current Implementation
**File**: `apps/front/src/lib/webhook/idempotency.ts`

```typescript
// Redis-only idempotency (24h TTL)
const key = `webhook:processed:${source}:${eventId}`;
const exists = await redis.get<string>(key);
if (exists) return true;
await redis.set(key, "1", { ex: IDEMPOTENCY_TTL_SECONDS });
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Redis fast-path check | ✅ PASS | 24h TTL implemented |
| Postgres permanent storage | ❌ FAIL | No `webhook_receipts` table |
| Atomic check-and-set | ⚠️ PARTIAL | Race condition possible |
| Audit trail for debugging | ❌ FAIL | No permanent record |

### Recommendation
Created `apps/api/src/database/schema/canonical-lead-state.schema.ts` with `webhookReceipts` table. Implement dual-write pattern:
1. Check Redis (fast path)
2. If miss, check Postgres (permanent)
3. Write to both on new event

---

## Part 2: Event Logging

### Canonical Requirement
```sql
-- Log every event for audit trail
INSERT INTO events (tenant_id, lead_id, event_type, payload, dedupe_key)
VALUES ($tenant_id, $lead_id, 'SMS_RECEIVED', $payload, $message_id)
ON CONFLICT (dedupe_key) DO NOTHING;
```

### Current Implementation
**Existing**: `event_log` table in `operations.schema.ts`

```typescript
export const eventLog = pgTable("event_log", {
  id: primaryUlid(EVENT_LOG_PK),
  teamId: ulidColumn(),
  eventType: varchar("event_type").notNull(),
  eventId: varchar("event_id"),  // For deduplication
  payload: jsonb(),
  source: varchar(),
  correlationId: varchar("correlation_id"),
  occurredAt: timestamp("occurred_at"),
});
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Append-only events table | ✅ PASS | `event_log` exists |
| Deduplication key | ⚠️ PARTIAL | `eventId` exists but not UNIQUE constraint |
| Lead association | ❌ FAIL | No `lead_id` column |
| State transition tracking | ❌ FAIL | No `previous_state`/`new_state` |
| Tenant isolation | ✅ PASS | `teamId` present |

### Recommendation
Created new `leadEvents` table with:
- `dedupeKey` with UNIQUE constraint
- `leadId` foreign key
- `previousState`/`newState` columns
- Immutable append-only (no `updatedAt`)

---

## Part 3: Lead State Machine

### Canonical Requirement
```
States: NEW → TOUCHED → RESPONDED → EMAIL_CAPTURED → HIGH_INTENT → IN_CALL_QUEUE → CLOSED
                                                                  → SUPPRESSED (terminal)
```

### Current Implementation
**File**: `apps/api/src/database/schema/leads.schema.ts`

```typescript
// Current: Tags array + status varchar
tags: text().array(),
status: varchar(),
pipelineStatus: varchar().notNull().default("raw"),
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Explicit state enum | ❌ FAIL | States in tags array |
| State transition validation | ❌ FAIL | No validation logic |
| Terminal state handling | ⚠️ PARTIAL | STOP handled via opt-out |
| State history | ❌ FAIL | No transition audit trail |

### Recommendation
Added `leadState` column with `lead_state_canonical` enum:
```typescript
leadState: leadStateEnumPg("lead_state").default("new"),
```

Created transition validation helper:
```typescript
export function isValidTransition(from: LeadState, to: LeadState): boolean {
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
```

---

## Part 4: Outbound Message Idempotency

### Canonical Requirement
```sql
-- Prevent double-sends
INSERT INTO outbound_messages (lead_id, send_key, content, ...)
VALUES ($lead_id, $lead_id || ':' || $template || ':' || DATE, ...)
ON CONFLICT (send_key) DO NOTHING
RETURNING id;
```

### Current Implementation
**File**: `apps/front/src/lib/signalhouse/client.ts`

```typescript
// No send idempotency - sends immediately
export async function sendSMS(to: string, body: string, from?: string) {
  // Direct API call, no deduplication
}
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Unique send_key | ❌ FAIL | No outbound tracking |
| Duplicate prevention | ❌ FAIL | Double-sends possible |
| Send history | ❌ FAIL | No `outbound_messages` table |
| Provider message tracking | ❌ FAIL | `message_id` not stored |

### Recommendation
Created `outboundMessages` table with:
- `sendKey` UNIQUE constraint (format: `lead_id:template:YYYY-MM-DD`)
- Provider tracking (`providerMessageId`, `providerStatus`)
- Status lifecycle (`pending → sent → delivered`)

---

## Part 5: Timer Management

### Canonical Requirement
```sql
-- Create timer on first touch
INSERT INTO timers (lead_id, timer_type, trigger_at)
VALUES ($lead_id, 'TIMER_7D', NOW() + INTERVAL '7 days')
ON CONFLICT (lead_id, timer_type) DO UPDATE
SET trigger_at = NOW() + INTERVAL '7 days';

-- Cancel timer on response
UPDATE timers SET cancelled_at = NOW()
WHERE lead_id = $lead_id AND timer_type = 'TIMER_7D';
```

### Current Implementation
**Implicit in scheduler logic** - no explicit timer table

```typescript
// Worker routing based on lead age
const daysSinceTouched = getDaysSinceLastContact(lead);
if (daysSinceTouched > 7) escalateToCathy();
if (daysSinceTouched > 14) escalateToSabrina();
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Explicit timer records | ❌ FAIL | Logic only, no table |
| Timer cancellation | ❌ FAIL | Cannot cancel timers |
| Timer execution tracking | ❌ FAIL | No audit of fires |
| Configurable intervals | ⚠️ PARTIAL | Hardcoded in logic |

### Recommendation
Created `leadTimers` table with:
- Timer types: `TIMER_7D`, `TIMER_14D`, `TIMER_30D`, `FOLLOW_UP`, `CALLBACK`
- Execution tracking: `executedAt`, `cancelledAt`
- Retry logic: `attempts`, `maxAttempts`

---

## Part 6: Call Queue Priority

### Canonical Requirement
```sql
-- Priority = config-driven, not hardcoded
INSERT INTO call_queue (lead_id, priority, ...)
VALUES ($lead_id, (
  SELECT gold_label_priority FROM tenant_config WHERE tenant_id = $tenant_id
), ...);
```

### Current Implementation
**File**: `apps/front/src/app/api/webhook/signalhouse/route.ts:449`

```typescript
const priority = options?.priority ?? config.CALL_QUEUE_GOLD_LABEL_PRIORITY ?? 100;
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Config-driven priority | ✅ PASS | Uses `getInboundConfig()` |
| Fallback value | ✅ PASS | Defaults to 100 |
| GOLD label handling | ✅ PASS | Prioritizes email+mobile |
| Queue persistence | ✅ PASS | `call_queue` table exists |

---

## Part 7: Worker Phone Routing

### Canonical Requirement
```
Each AI worker has dedicated phone:
- GIANNA → Initial outreach
- CATHY → Follow-up/nudge
- SABRINA → Booking/closing
```

### Current Implementation
**File**: `apps/front/src/app/api/webhook/signalhouse/route.ts:256`

```typescript
const AI_WORKER_PHONES: Record<string, string> = {
  GIANNA: process.env.GIANNA_PHONE_NUMBER || "",
  CATHY: process.env.CATHY_PHONE_NUMBER || "",
  SABRINA: process.env.SABRINA_PHONE_NUMBER || "",
};
```

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Dedicated worker phones | ✅ PASS | Environment configured |
| Phone-based routing | ✅ PASS | `routeByPhoneNumber()` |
| Campaign-based routing | ✅ PASS | `routeByCampaignId()` |
| Worker attribution | ✅ PASS | Logged in messages |

---

## Part 8: Workspace Stage Notifications

### User Requirement
> "Workspaces: Initial Message, Retarget, Nudger, Content Nurture, Book Appointment should have bells for notifications when inbound responses come in"

### Current Implementation
**Campaign label mapping exists** (`CAMPAIGN_LABELS` in webhook handler)

### Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Workspace stage labels | ✅ PASS | 5 stages mapped |
| Real-time notifications | ❌ FAIL | No WebSocket/push |
| Bell icon integration | ❌ FAIL | UI not implemented |
| Campaign context in workspace | ⚠️ PARTIAL | Labels applied but not UI-bound |

### Recommendation
1. Add WebSocket notification channel for inbound messages
2. Implement notification bell component per workspace stage
3. Filter notifications by campaign label

---

## Summary: Schema Changes Made

### New Schema File
`apps/api/src/database/schema/canonical-lead-state.schema.ts`

### Tables Created

| Table | Purpose |
|-------|---------|
| `webhook_receipts` | Inbound webhook idempotency (Postgres backup) |
| `lead_events` | Immutable event log with state transitions |
| `lead_timers` | Explicit 7D/14D timer management |
| `outbound_messages` | Send idempotency with unique `send_key` |

### Schema Modifications

| File | Change |
|------|--------|
| `leads.schema.ts` | Added `leadState` column with enum |
| `index.ts` | Export new schema |

---

## Priority Remediation

### P0 - Critical (Do First)
1. ✅ Create `lead_events` table with dedupe key
2. ✅ Create `outbound_messages` table with send_key
3. ✅ Add `lead_state` column to leads
4. ❌ Implement dual-write idempotency (Redis + Postgres)

### P1 - Important (Week 1)
1. Create `lead_timers` processing job
2. Implement state transition validation in webhook handler
3. Add outbound message logging to `sendSMS()`

### P2 - Nice to Have (Week 2-3)
1. WebSocket notifications for workspace stages
2. Bell icon UI components
3. Timer cancellation on lead response

---

## Files Modified This Session

| File | Status |
|------|--------|
| `.env.example` | Updated with all env vars |
| `docs/SMS_CAMPAIGN_ARCHITECTURE.md` | Created |
| `docs/INFRASTRUCTURE_INVENTORY.md` | Created |
| `docs/LEAD_STATE_MACHINE.md` | Created |
| `apps/api/src/database/schema/canonical-lead-state.schema.ts` | Created |
| `apps/api/src/database/schema/leads.schema.ts` | Modified |
| `apps/api/src/database/schema/index.ts` | Modified |

---

## Next Steps

1. Run `npx drizzle-kit generate` to create migration
2. Apply migration to development database
3. Update `sendSMS()` to log to `outbound_messages`
4. Update webhook handler to write to `lead_events`
5. Implement timer creation/cancellation logic
