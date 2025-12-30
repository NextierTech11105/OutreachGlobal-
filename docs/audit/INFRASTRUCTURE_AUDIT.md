# Nextier Infrastructure Audit

**Date**: 2025-12-30
**Auditor**: Staff/Principal Backend Engineer Review
**Scope**: Full system architecture audit against ideal backend model

---

## TASK 1: OBSERVED ARCHITECTURE

### Summary Statistics

| Component | Count |
|-----------|-------|
| Next.js API Routes | 381 |
| NestJS Controllers | 13 |
| GraphQL Resolvers | 36 |
| Database Tables | 92 |
| BullMQ Queues | 8 |
| Cron Jobs | 4 |

---

### 1.1 API Surface

**Architecture Pattern:**
- **Next.js Frontend**: 381 REST API endpoints for client operations
- **NestJS Backend**: 13 REST controllers for server-only operations and webhooks
- **GraphQL Layer**: 36 resolvers for data querying and mutations

**Key API Groups:**
| Domain | Routes | Purpose |
|--------|--------|---------|
| Admin | ~30 | User/company/tenant management |
| Lead/CRM | ~45 | Lead CRUD, tagging, scoring |
| Integrations | ~80 | Apollo, SignalHouse, Twilio, Zoho |
| AI Workers | ~60 | LUCI, GIANNA, CATHY, NEVA, SABRINA |
| Enrichment | ~35 | Skip trace, Apollo enrichment |
| Webhooks | ~25 | Inbound SMS/Voice, status updates |
| Property | ~25 | Real estate search, valuation |
| Workflow | ~20 | Automation, cadences |

---

### 1.2 Database Schema (92 Tables)

**Core Entity Groups:**

| Group | Tables | Purpose |
|-------|--------|---------|
| Identity | users, teams, team_members, team_invitations | Multi-tenant auth |
| Personas | personas, persona_phones, persona_emails, persona_addresses, persona_demographics, persona_socials | Unified contact identity |
| Businesses | businesses, business_owners | B2B entity data |
| Properties | properties, property_owners, property_distress_scores | Real estate data |
| Leads | leads, lead_phone_numbers, unified_lead_cards, lead_activities | CRM lead management |
| Campaigns | campaigns, campaign_sequences, campaign_leads, campaign_executions, campaign_events | Campaign orchestration |
| Messages | messages, message_templates, initial_messages, sms_messages | Communication tracking |
| Inbox | inbox_items, response_buckets, bucket_movements, suppression_list | Response management |
| Workflows | automation_plays, scheduled_events, campaign_cadences | Automation engine |
| AI Workers | ai_sdr_avatars, worker_voice_configs, worker_phone_assignments | AI persona config |
| Call Center | call_queue, call_histories, call_recordings, power_dialers | Phone operations |
| Integrations | integrations, integration_fields, integration_tasks | External system sync |

**Key Indexes (Performance Critical):**
- `leads_phone_idx` - Phone lookup for inbound matching
- `inbox_items_processing_hot_idx` - Partial index for unprocessed items
- `campaign_executions_hot_idx` - Campaign status queries
- `scheduled_events_hot_idx` - Scheduled action queries

---

### 1.3 Queue/Async Mechanisms

**BullMQ Queues (8 total):**

| Queue | Purpose | Consumer | Concurrency |
|-------|---------|----------|-------------|
| `campaign` | Sync leads with campaigns | CampaignConsumer | default |
| `campaign-sequence` | Execute SMS/Email/Voice sequences | CampaignSequenceConsumer | 10 |
| `lead` | Import business lists | LeadConsumer | default |
| `integration-task` | Zoho CRM sync | IntegrationTaskConsumer | 5 |
| `mail` | SendGrid email delivery | MailConsumer | 5 |
| `skiptrace` | Persona enrichment | SkipTraceConsumer | default |
| `b2b-ingestion` | Sector CSV ingestion | B2BIngestionConsumer | default |
| `lead-card` | Unified lead card updates | LeadCardConsumer | default |

**Cron Jobs (4 total):**

| Schedule | Handler | Purpose |
|----------|---------|---------|
| EVERY_MINUTE | CampaignSchedule.handleSequences() | Poll pending sequences |
| EVERY_MINUTE | CampaignSchedule.handleCampaignSchedules() | Activate scheduled campaigns |
| EVERY_5_MINUTES | IntegrationSchedule.checkExpires() | Refresh Zoho tokens |
| EVERY_DAY_AT_MIDNIGHT | LeadSchedule.handle() | Property search matching |

**Redis Usage:**
- BullMQ job storage (prefix: `nextier_jobs`)
- Enrichment queue management (`enrichment:queue`)
- Daily usage limits (`enrichment:daily:{date}`)
- Job discovery sorted sets (`enrichment:jobs`)

---

### 1.4 Webhook Handlers

| Webhook | File | Events Handled |
|---------|------|----------------|
| SignalHouse SMS | `/api/webhook/signalhouse` | SMS_SENT, SMS_RECEIVED, delivery status |
| Twilio Voice | `/api/webhook/twilio/*` | Inbound calls, status, voicemail |
| Skip Trace | `/api/webhook/skip-trace` | Enrichment completion |
| Campaign | `/webhook/campaign` (NestJS) | Campaign events |
| Voice | `/webhook/voice` (NestJS) | Voice status updates |

---

### 1.5 Auth & Tenant Isolation

**Authentication:**
- Next.js: JWT via `apiAuth()` middleware
- NestJS: `@UseGuards(AdminGuard)` for admin routes
- GraphQL: `@UseAuthGuard()` decorator

**Multi-Tenant Model:**
- `teams` table = tenant boundary
- All data tables have `teamId` foreign key
- RLS not currently enforced at DB level (application-level filtering)

---

### 1.6 Conversation/Inbox Data Model

**Inbox Flow:**
```
Inbound SMS → inbox_items (classification, priority) → response_buckets (kanban)
                     ↓
              bucket_movements (audit trail)
                     ↓
              suppression_list (opt-outs)
```

**Classification System:**
- `ResponseClassification` enum: POSITIVE, NEGATIVE, QUESTION, OPT_OUT, etc.
- `InboxPriority` enum: HOT, WARM, COLD
- `BucketType` enum: UNIVERSAL_INBOX, HOT_LEADS, QUESTIONS, PROCESSED

---

### 1.7 Campaign Orchestration Logic

**Campaign Lifecycle:**
```
DRAFT → STAGED → (approval) → RUNNING → PAUSED → COMPLETED
                     ↓
            campaign_sequences (multi-step)
                     ↓
            campaign_executions (per-lead tracking)
```

**Sequence Types:** EMAIL, SMS, VOICE
**Execution:** BullMQ `campaign-sequence` queue processes sequences with concurrency 10

---

### 1.8 Human-in-Loop Enforcement Points

| Control Point | Implementation |
|---------------|----------------|
| Campaign Approval | `approvedBy`, `approvedAt` columns (added Phase B) |
| Inbox Review | `requiresReview` flag on inbox_items |
| AI Suggestions | AI generates, human approves via UI |
| Suppression | Manual DNC management via suppression_list |

**GAP:** No explicit approval audit trail for AI-generated responses.

---

### 1.9 Observability

**Current State:**
- Console logging throughout codebase
- No structured logging (JSON format)
- No centralized log aggregation
- Sentry DSN configured (optional)
- No metrics/traces

**Event Logging:**
- `event_log` table exists (eventType, level, payload, correlationId)
- `intelligence_log` table for AI decisions
- `bucket_movements` for inbox audit trail

---

## TASK 2: COMPARATIVE ALIGNMENT CHECK

Comparing against the IDEAL BACKEND MODEL:

| Domain | Alignment | Notes |
|--------|-----------|-------|
| **1. Ingestion & Enrichment** | **ALIGNED** | BullMQ queues, batch processing, DO Spaces storage |
| **2. Campaign Execution** | **PARTIALLY ALIGNED** | Queue-based but missing strict state machine |
| **3. Inbound Handling** | **ALIGNED** | SignalHouse webhook → classify → route → persist |
| **4. Auto-labeling Logic** | **ALIGNED** | Just implemented (Phase C) - detectLabels() + CANONICAL_LABELS |
| **5. Phone Queue Push Logic** | **ALIGNED** | Config-driven priorities, eligibility check |
| **6. Data Modeling** | **PARTIALLY ALIGNED** | Lead-centric but persona/lead duality creates confusion |
| **7. Async Processing** | **ALIGNED** | BullMQ with concurrency control, Redis backing |
| **8. Compliance & Guardrails** | **PARTIALLY ALIGNED** | Opt-out handling exists, but no SLA enforcement |
| **9. Observability** | **MISALIGNED** | Console logs only, no structured telemetry |
| **10. Scalability Under Load** | **PARTIALLY ALIGNED** | Queues good, but no rate limiting on API layer |

---

## FRAMEWORK MAPPING

User's framework diagram mapped to Nextier components:

```
┌──────────────────────────────┐
│        DATA INGESTION         │  ← apps/front/src/app/api/datalake/upload/
│  (CSV / USbizdata / Uploads)  │  ← apps/api/src/app/enrichment/b2b-ingestion
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          POSTGRES             │  ← 92 tables across apps/api/src/database/schema
│   (Leads + State + Memory)    │
│                              │
│ lead_id ✓                    │  ← leads.id, unified_lead_cards.id
│ tenant_id ✓                  │  ← teams.id (teamId FK everywhere)
│ campaign_id ✓                │  ← campaigns.id
│ state ✓                      │  ← leads.status, campaigns.status
│ priority ✓                   │  ← leads.score, inbox_items.priorityScore
│ last_action ✓                │  ← lead_activities, outreach_logs
│ next_action ⚠️               │  ← scheduled_events (partial)
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      NEXTIER BACKEND          │  ← apps/api (NestJS) + apps/front/api (Next.js)
│  (Rules + Orchestration)      │
│                              │
│ - reads state ✓              │  ← GraphQL resolvers, REST endpoints
│ - validates action ✓         │  ← campaign approval gate
│ - triggers outbound ✓        │  ← push-to-sms, campaign-sequence queue
│ - waits for inbound ✓        │  ← signalhouse webhook
└───────┬─────────────┬────────┘
        │             │
        │             │
        ▼             ▼
┌──────────────┐   ┌──────────────────┐
│  FRONTEND     │   │   SIGNALHOUSE     │  ← SignalHouse API integration
│  (Cockpit)    │   │  (SMS Transport)  │
│               │   │                  │
│ Buttons ✓     │   │ Outbound SMS ✓   │  ← /api/signalhouse/send
│ Inbox ✓       │   │ Inbound Replies ✓│  ← /api/webhook/signalhouse
│ Call Queue ✓  │   │ Status Events ✓  │  ← delivery status handling
└───────┬──────┘   └─────────┬────────┘
        │                    │
        │                    ▼
        │        ┌────────────────────────┐
        │        │   WEBHOOKS (INBOUND)    │  ← /api/webhook/signalhouse
        │        │                        │  ← /api/webhook/twilio/*
        │        │ inbound-sms ✓          │
        │        │ status-update ✓        │
        │        └─────────┬──────────────┘
        │                  │
        ▼                  ▼
┌────────────────────────────────────────┐
│        INBOUND INTELLIGENCE             │  ← Just implemented (Phase C)
│   (Rules + AI Copilot Assist)           │
│                                        │
│ classify response ✓                    │  ← detectLabels(), ResponseClassification
│ update state ✓                         │  ← applyLabelsWithScore()
│ suggest next action ⚠️                 │  ← AI workers suggest, partial
└──────────────┬─────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│       NEXT ACTION UNLOCKED    │  ← evaluateCallQueueEligibility()
│  (Call / Reply / Nurture)     │  ← pushToCallQueue()
└──────────────────────────────┘
```

**Legend:**
- ✓ = Implemented and aligned
- ⚠️ = Partial implementation

---

## TASK 3: GAP ANALYSIS

### GAP 1: Persona vs Lead Duality (Data Modeling)

**What's Happening:**
- `personas` table = unified identity (from skip trace, Apollo)
- `leads` table = campaign-focused records
- `unified_lead_cards` table = attempted bridge

**Why It Breaks:**
- No clear source of truth for contact data
- Updates to persona don't automatically sync to leads
- Same person can exist as multiple leads across campaigns

**Failure Modes:**
- Duplicate outreach to same person in different campaigns
- Inconsistent contact info between persona and lead records
- Opt-out on lead doesn't propagate to persona

**Operator Pain:**
- "Which record do I update?"
- "Why does this contact show different info in different views?"

**Compliance Risk:** MEDIUM - Opt-out could be missed if checking wrong entity

---

### GAP 2: No Strict State Machine for Campaigns

**What's Happening:**
- Campaign status is a string enum, not a state machine
- State transitions not enforced at DB level
- No audit log of state changes

**Why It Breaks:**
- Campaign can jump from DRAFT directly to COMPLETED
- No prevention of invalid transitions
- Race conditions possible with concurrent updates

**Failure Modes:**
- Campaign stuck in limbo state
- Accidental re-activation of completed campaigns

**Operator Pain:**
- Confusion about "why is this campaign in PAUSED?"
- No visibility into who changed state

**Compliance Risk:** LOW

---

### GAP 3: No SLA Enforcement

**What's Happening:**
- Inbox items have priority scores but no response deadlines
- No alerting when items age past threshold
- No escalation rules

**Why It Breaks:**
- Hot leads can sit in inbox for hours without notice
- No accountability for response times

**Failure Modes:**
- Lost leads due to delayed follow-up
- Inconsistent response times across operators

**Operator Pain:**
- "How do I know what's urgent?"
- Manual triage required

**Compliance Risk:** LOW (but business risk HIGH)

---

### GAP 4: Observability is Console Logs Only

**What's Happening:**
- `console.log` throughout codebase
- No structured logging format
- No log aggregation
- No metrics/traces

**Why It Breaks:**
- Cannot debug production issues effectively
- No visibility into queue depths, processing times
- Cannot measure system health

**Failure Modes:**
- Silent failures go unnoticed
- Performance degradation not detected

**Operator Pain:**
- "The system seems slow, but I can't prove it"
- Debugging requires SSH to servers

**Compliance Risk:** LOW (but operational risk HIGH)

---

### GAP 5: No Rate Limiting on API Layer

**What's Happening:**
- No rate limiting middleware
- No per-tenant throttling
- Carrier TPM limits (75 SMS/min AT&T) not enforced in code

**Why It Breaks:**
- One tenant can consume all resources
- Carrier rate limits cause message failures
- No backpressure mechanism

**Failure Modes:**
- Messages rejected by carrier
- System overwhelm during bulk operations

**Operator Pain:**
- "Why did my campaign stop sending?"
- Manual pacing required

**Compliance Risk:** MEDIUM - Carrier violations possible

---

### GAP 6: AI Response Approval Audit Trail

**What's Happening:**
- AI workers generate responses
- Responses sent with `approval_method` metadata but not persisted to audit table
- No tracking of "AI suggested X, human approved/edited to Y"

**Why It Breaks:**
- Cannot analyze AI performance
- Cannot demonstrate human oversight for compliance
- No learning loop for AI improvement

**Failure Modes:**
- Cannot prove human was in loop
- Cannot identify poor AI suggestions

**Operator Pain:**
- "Did I approve this or did the AI send it?"

**Compliance Risk:** MEDIUM - May need to demonstrate human oversight

---

## TASK 4: SURGICAL RECOMMENDATIONS

### IMMEDIATE (Must Fix)

#### Fix 1: Add Response SLA Fields
**What:** Add `dueAt` and `escalatedAt` columns to `inbox_items`
**Why:** Enable time-based prioritization and escalation
**Files:** `apps/api/src/database/schema/inbox.schema.ts`
**Required:** YES
**Migration Risk:** LOW

#### Fix 2: Add Rate Limiting for SMS
**What:** Implement rate limiter respecting carrier TPM limits (75/min AT&T)
**Why:** Prevent carrier rejections and compliance issues
**Files:** `apps/front/src/app/api/signalhouse/send/route.ts`, new `sms-rate-limiter.ts`
**Required:** YES
**Migration Risk:** LOW

#### Fix 3: Structured Logging
**What:** Replace console.log with structured logger (pino or similar)
**Why:** Enable log aggregation and debugging
**Files:** New `apps/shared/src/logger.ts`, update all files
**Required:** YES (but can be incremental)
**Migration Risk:** LOW

### SHORT-TERM

#### Fix 4: Campaign State Machine
**What:** Implement state machine with valid transitions
**Why:** Prevent invalid states, add audit trail
**Files:** `apps/api/src/app/campaign/services/campaign.service.ts`
**Required:** OPTIONAL (recommended)
**Migration Risk:** MEDIUM

#### Fix 5: AI Approval Audit Table
**What:** New `ai_approval_log` table tracking suggestions and outcomes
**Why:** Demonstrate human oversight, improve AI
**Files:** New schema, update webhook and AI worker code
**Required:** OPTIONAL (compliance dependent)
**Migration Risk:** LOW

#### Fix 6: Lead-Persona Sync
**What:** Event-driven sync from persona updates to associated leads
**Why:** Maintain data consistency
**Files:** Saga in `apps/api/src/app/enrichment/sagas/`
**Required:** OPTIONAL (but prevents data drift)
**Migration Risk:** MEDIUM

### LONG-TERM

#### Fix 7: Unified Contact Model
**What:** Deprecate lead/persona duality, single contact entity
**Why:** Eliminate confusion, single source of truth
**Files:** Major schema refactor
**Required:** OPTIONAL (significant effort)
**Migration Risk:** HIGH

#### Fix 8: Real-Time Metrics Dashboard
**What:** Prometheus/Grafana or similar for system metrics
**Why:** Proactive monitoring, capacity planning
**Files:** New infrastructure
**Required:** OPTIONAL
**Migration Risk:** LOW (additive)

---

## TASK 5: EXECUTION-READY CHECKLIST

### Schema Changes
- [ ] Add `dueAt` (timestamp) to `inbox_items`
- [ ] Add `escalatedAt` (timestamp) to `inbox_items`
- [ ] Add `slaMinutes` (integer) to `response_buckets`
- [ ] Create `ai_approval_log` table (optional)

### Queue Changes
- [ ] Add SMS rate limiter (per-tenant, per-carrier)
- [ ] Add backpressure mechanism for campaign-sequence queue

### API Changes
- [ ] Add rate limiting middleware to `/api/signalhouse/send`
- [ ] Add SLA calculation to inbox item creation
- [ ] Add escalation endpoint `/api/inbox/escalate`

### Event Additions
- [ ] PersonaUpdated event → sync to leads
- [ ] InboxItemSLABreached event → notification
- [ ] CampaignStateChanged event → audit log

### Guardrail Enforcement
- [ ] Campaign state transitions validated
- [ ] SMS rate limits enforced before send
- [ ] Opt-out check before ANY outbound

### Observability Additions
- [ ] Replace console.log with structured logger
- [ ] Add request correlation IDs
- [ ] Add queue depth metrics
- [ ] Add latency histograms for key operations

---

## WHAT'S EXCELLENT (No Changes Needed)

1. **BullMQ Queue Architecture** - Properly separated concerns, good concurrency control
2. **Multi-Tenant Isolation** - Consistent teamId pattern throughout
3. **Webhook Handler** - Comprehensive, handles edge cases well
4. **Auto-Labeling System** - Just implemented, config-driven, well-designed
5. **Inbox Classification** - Clear buckets, priority scoring, audit trail
6. **Campaign Sequence System** - Flexible multi-step campaigns
7. **Integration Pattern** - Clean Zoho integration with retry logic
8. **CQRS Pattern** - Events trigger sagas, good separation

---

## CONCLUSION

Nextier's architecture is **fundamentally sound** for a high-volume messaging platform. The recent Phase C additions (auto-labeling, config-driven thresholds) significantly improve the inbound processing flow.

**Priority Actions:**
1. SLA fields (immediate business value)
2. SMS rate limiting (compliance requirement)
3. Structured logging (operational necessity)

The persona/lead duality is the biggest architectural debt, but can be addressed incrementally without blocking current operations.
