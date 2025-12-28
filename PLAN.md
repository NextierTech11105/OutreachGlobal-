# NEXTIER Platform - Infrastructure Gap Analysis

## FastAPI Backend Spec vs Existing Infrastructure

### Executive Summary

The existing Nextier codebase is **comprehensive** with 241+ API routes covering most functionality in the FastAPI spec. The primary gaps are in **workflow orchestration** and **explicit Gold Label tracking**.

---

## THE VALUE PROPOSITION

### Consultative Technology = Increased Company Value

NEXTIER is **consultative around technology** - this by design increases the value of a company by providing:

1. **Built-to-Suit Foundational Databases**
   - Custom databases per client
   - Millions of records available (USBizData, Apollo, etc.)
   - Curated, cleaned, role/title prioritized

2. **Controlled Execution**
   - Access to millions → Draw 2,000 campaign blocks
   - Low-volume, compliant, sustainable
   - 10-20% net positive rate target

3. **The Machine**
   - Universal framework for any vertical
   - Same structure, different audiences
   - Plug and play for partners (East Coast Business Brokers, etc.)

```
MILLIONS OF RECORDS (USBizData, Apollo, Property)
              ↓
    BUILT-TO-SUIT FOUNDATION (50K+ per client)
              ↓
    2,000 CAMPAIGN BLOCKS (Initial SMS)
              ↓
    INBOUND RESPONSE GENERATION MACHINE
              ↓
    15-MINUTE DISCOVERY MEETING
```

---

## TWO NEXTIER CAMPAIGNS

### Campaign 1: Real Estate Agents/Brokers
- **Brand:** BZOYPIH - NEXTIER
- **Campaign ID:** Temp-C21390
- **Phone:** 15164079249
- **Audience:** Real estate agents & brokers
- **Pitch:** "Stop renting lead gen, own the system"
- **Goal:** Demo Nextier platform
- **Use-Case:** LOW_VOLUME (≤2,000 SMS/day)

### Campaign 2: Business Owners (Exit/Expansion)
- **Brand:** BZOYPIH - NEXTIER
- **Campaign ID:** [TBD - Create in SignalHouse]
- **Phone:** [Different number needed]
- **Audience:** Business owners considering exit/expansion
- **Pitch:** "Know what your business could sell for"
- **Goal:** Feed qualified leads to East Coast Business Brokers
- **Use-Case:** LOW_VOLUME (≤2,000 SMS/day)

---

## LEAD JOURNEY - Required Steps

```
RAW CSV
    ↓
DATA HUB (Clean & Sort)
    ↓
SKIP TRACE (2,000 block → LEAD ID assigned)
    ↓
CAMPAIGNS (Assign to SignalHouse campaign)
    ↓
SMS QUEUE (250 batches until 2K complete)
    ↓
AI INBOUND RESPONSE CENTER (Classify → GOLD LABEL)
    ↓
CALL CENTER (Hot leads to queue)
    ↓
CALENDAR (15-min discovery meeting)
```

---

## GAP ANALYSIS

### 1. DATA HUB / FILE UPLOAD

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `POST /api/data-hub/upload` | `/api/datalake/upload`, `/api/datalake/import` | ✅ EXISTS |
| `GET /api/data-hub/files` | `/api/datalake/list` | ✅ EXISTS |
| `GET /api/data-hub/files/{id}` | `/api/buckets/[id]` | ✅ EXISTS |
| Auto-dedupe on upload | Manual via `/api/buckets/[id]/enrich` | ⚠️ PARTIAL |
| Role/Title prioritization | Not explicit - uses `roleScore` in UnifiedLeadCards | ⚠️ PARTIAL |

**Suggestion:** Add role/title scoring during CSV import. The `UnifiedLeadCards.roleValueScore` exists but needs explicit scoring logic on upload.

---

### 2. SKIP TRACE

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `POST /api/skip-trace/start` | `/api/skip-trace` (POST), `/api/enrichment/bulk-skip-trace` | ✅ EXISTS |
| `GET /api/skip-trace/status/{job_id}` | `/api/enrichment/job/[jobId]`, `/api/enrichment/status` | ✅ EXISTS |
| `GET /api/leads/enriched` | `/api/leads` with status filter | ✅ EXISTS |
| 2,000/day limit | Implemented in skip-trace service (RealEstateAPI limit) | ✅ EXISTS |
| LEAD ID assignment | `unifiedLeadCards.id` assigned on enrichment | ✅ EXISTS |
| Reject LLC/Trust/Corp | Not explicit | ❌ GAP |

**Suggestion:** Add entity type filter in skip-trace to reject LLC, Trust, Corp names before enrichment.

---

### 3. CAMPAIGNS

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `POST /api/campaigns/create` | `/api/campaigns` (POST), `/api/signalhouse/campaign` | ✅ EXISTS |
| `GET /api/campaigns` | `/api/campaigns` (GET) | ✅ EXISTS |
| `GET /api/campaigns/{id}` | `/api/campaigns` with ID filter | ✅ EXISTS |
| Assign SignalHouse campaign ID | `/api/signalhouse/campaign` | ✅ EXISTS |
| Assign phone number | `/api/signalhouse/subgroups` | ✅ EXISTS |
| Assign AI worker | `campaigns.sdrId` references `aiSdrAvatars` | ✅ EXISTS |
| 2,000 lead blocks | Not explicit - manual batch creation | ⚠️ PARTIAL |
| 250 batch auto-assignment | Not explicit | ❌ GAP |

**Suggestion:** Add explicit 2K block + 250 batch auto-assignment logic in campaign creation.

---

### 4. SMS QUEUE

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| Batch sending | `/api/signalhouse/bulk-send`, `/api/sms/batch` | ✅ EXISTS |
| 250 per batch | Not explicit - configurable | ⚠️ PARTIAL |
| Delay between batches | Not explicit | ❌ GAP |
| Track sent status | `campaignExecutions`, `campaignQueue` | ✅ EXISTS |
| Store initial_message_id on lead | `leadActivities.externalId` | ✅ EXISTS |

**Suggestion:** Add explicit batch throttling (250/batch, 5s delay) in SMS queue worker.

---

### 5. SMS RESPONSE HANDLING

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `POST /api/webhooks/sms-response` | `/api/webhook/signalhouse`, `/api/webhook/sms/inbound` | ✅ EXISTS |
| Classify response | `inboxItems.classification`, `ResponseClassification` enum | ✅ EXISTS |
| Extract email | Not explicit in webhook | ⚠️ PARTIAL |
| GOLD LABEL flag | Not explicit - uses `priorityScore`, `classification` | ❌ GAP |
| Route to call queue | Not explicit auto-routing | ⚠️ PARTIAL |

**Suggestion:** Add explicit GOLD LABEL detection in SMS webhook:
- Email regex match → `isGoldLabel = true`
- Auto-create `callQueue` entry for gold labels
- Add `goldLabeledAt` timestamp to lead

---

### 6. GOLD LABEL TRACKING

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `GoldLabel` model | NOT EXPLICIT | ❌ GAP |
| `GET /api/responses/gold-labels` | Filtered via `inboxItems` | ⚠️ PARTIAL |
| Email captured field | `personaEmails` table exists | ✅ EXISTS |
| Phone verified field | `personaPhones` table exists | ✅ EXISTS |

**Suggestion:** Either:
1. Add explicit `gold_labels` table (cleaner), OR
2. Use existing `inboxItems` with `classification = 'GOLD_LABEL'` and `priorityScore = 100`

Recommend Option 2 - use existing infrastructure with explicit classification value.

---

### 7. CALL QUEUE

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `GET /api/call-queue` | Partial - `callQueue` table exists in schema | ✅ EXISTS |
| `PUT /api/call-queue/{id}/assign` | Not explicit endpoint | ❌ GAP |
| `PUT /api/call-queue/{id}/complete` | Not explicit endpoint | ❌ GAP |
| Priority ordering | `callQueue.priority` field exists | ✅ EXISTS |
| Agent assignment | `callQueue.assignedWorker` field exists | ✅ EXISTS |

**Suggestion:** Add REST endpoints for call queue management:
- `GET /api/call-queue` - List queue with filters
- `PUT /api/call-queue/[id]/assign` - Assign to agent
- `PUT /api/call-queue/[id]/complete` - Log completion

---

### 8. MEETINGS / CALENDAR

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `POST /api/meetings/book` | `/api/sabrina/book` exists | ✅ EXISTS |
| `GET /api/meetings` | `/api/calendar/leads` | ✅ EXISTS |
| `appointments` table | EXISTS in schema | ✅ EXISTS |
| Confirmation SMS | Not explicit auto-trigger | ⚠️ PARTIAL |
| Reminder sequence | Not explicit | ❌ GAP |

**Suggestion:** Add appointment reminder automation:
- 24h before → Reminder SMS
- 1h before → Reminder SMS
- 15min before → Link SMS

---

### 9. DASHBOARD / METRICS

| FastAPI Spec | Existing | Status |
|--------------|----------|--------|
| `GET /api/dashboard/overview` | `/api/admin/dashboard`, `/api/analytics/pipeline-stats` | ✅ EXISTS |
| `WS /ws/dashboard` | Not explicit WebSocket | ⚠️ PARTIAL |
| Conversion funnel | Calculable from existing data | ✅ EXISTS |

---

## PRIORITY GAPS TO FILL

### HIGH PRIORITY (Required for Machine to Work)

1. **GOLD LABEL Classification**
   - Add `GOLD_LABEL` to `ResponseClassification` enum
   - Add email extraction in SMS webhook
   - Auto-flag when email detected in response

2. **Call Queue Endpoints**
   - `GET /api/call-queue`
   - `PUT /api/call-queue/[id]/assign`
   - `PUT /api/call-queue/[id]/complete`

3. **250 Batch Throttling**
   - Add batch size config (default: 250)
   - Add delay between batches (default: 5 seconds)
   - Track batch progress in campaign

### MEDIUM PRIORITY (Improves Operation)

4. **Entity Type Filter in Skip Trace**
   - Reject LLC, Trust, Inc, Corp in owner name
   - Only enrich individual persons

5. **Role/Title Scoring on Import**
   - Owner = 100
   - CEO = 90
   - President = 85
   - VP = 75
   - Manager = 50

6. **Appointment Reminders**
   - 24h, 1h, 15min before meeting
   - Auto-send via SignalHouse

### LOW PRIORITY (Nice to Have)

7. **WebSocket Dashboard**
   - Real-time metrics push
   - Live response notifications

8. **2K Block Auto-Assignment**
   - Auto-create campaign blocks of 2,000
   - Auto-assign to batch numbers

---

## EXISTING STRENGTHS

The codebase already has:

1. **Complete SignalHouse Integration**
   - Campaign CRUD
   - Subgroup management
   - Template sync
   - SMS send/receive

2. **Robust Lead Management**
   - UnifiedLeadCards with scoring
   - Persona identity graph
   - Multi-source enrichment

3. **AI SDR Framework**
   - GIANNA, SABRINA, CATHY workers
   - Response classification
   - Auto-reply capability

4. **Campaign Execution**
   - Sequences
   - Lead assignment
   - Execution tracking

5. **Inbox Management**
   - Response buckets
   - Classification
   - Priority scoring

---

## RECOMMENDED ACTIONS

### Immediate (This Session)

1. Add `GOLD_LABEL` to response classification
2. Add email extraction in inbound SMS webhook
3. Create call queue REST endpoints

### Next Session

4. Add 250 batch throttling logic
5. Add entity type filter in skip trace
6. Add role/title scoring on CSV import

### Future

7. Appointment reminder automation
8. WebSocket dashboard
9. 2K block auto-assignment

---

## SIGNALHOUSE CAMPAIGN CONFIG

### Current: Temp-C21390 (Real Estate Agents)
- Brand: BZOYPIH - NEXTIER
- Phone: 15164079249
- Status: Pending TCR approval
- Use-Case: LOW_VOLUME (≤2,000/day)

### Needed: Business Owners Campaign
- Brand: BZOYPIH - NEXTIER (same brand)
- Phone: [Need new number]
- Campaign: [Create in SignalHouse]
- Use-Case: LOW_VOLUME (≤2,000/day)

---

## CONCLUSION

The existing Nextier infrastructure covers **~85%** of the FastAPI spec requirements. The main gaps are:

1. **Explicit GOLD LABEL tracking** (highest priority)
2. **Call queue REST endpoints** (high priority)
3. **Batch throttling for SMS** (medium priority)

The machine framework is solid. Fill these gaps and both campaigns (Agents + Business Owners) can run on the same infrastructure.
