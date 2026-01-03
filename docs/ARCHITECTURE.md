# Nextier Agency Platform - Architecture

## Executive Summary

Nextier is an **agency platform** that piggybacks on **SignalHouse.io** for all messaging infrastructure. We don't build CPaaS - we orchestrate campaigns on top of SignalHouse's multi-tenant SubGroup system.

> **Philosophy**: Like Perplexity/Lovable did with OpenAI - build amazing UX on existing infrastructure.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  NEXTIER (Agency Platform / PaaS)                           │
│  ═══════════════════════════════════════════════════════════│
│  - Campaign orchestration                                   │
│  - 10K execution blocks (2000 leads × 5 touches)           │
│  - Lead state machine                                       │
│  - ML advisory layer (human-in-loop)                        │
│  - AI Workers (Gianna, Cathy, Sabrina, NEVA)               │
│  - UI/UX wrapper                                            │
├─────────────────────────────────────────────────────────────┤
│  SIGNALHOUSE.IO (CPaaS Backend)                            │
│  ═══════════════════════════════════════════════════════════│
│  - SubGroups = Nextier Teams (multi-tenant 1:1)            │
│  - Brands = 10DLC registration                              │
│  - Campaigns = Use case compliance                          │
│  - Phone Numbers = Sending pool                             │
│  - Webhooks = Inbound/delivery events                       │
│  - Analytics = Delivery metrics                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Hierarchy

### Nextier Team = SignalHouse SubGroup (1:1 Mapping)

Every Nextier Team maps directly to a SignalHouse SubGroup for complete isolation:

```
Nextier Team Created
        ↓
signalhouse.createSubGroup({ name: team.name })
        ↓
Store subGroupId on teams table
        ↓
Team can now:
  - Create Brands (10DLC registration)
  - Create Campaigns (use case compliance)
  - Buy Phone Numbers (isolated pool)
  - Send Messages (through their SubGroup)
```

### Database Schema (teams.schema.ts)

```typescript
// SignalHouse multi-tenant mapping fields
signalhouseSubGroupId: varchar("signalhouse_subgroup_id"),
signalhouseBrandId: varchar("signalhouse_brand_id"),
signalhouseCampaignIds: jsonb("signalhouse_campaign_ids").$type<string[]>(),
signalhousePhonePool: jsonb("signalhouse_phone_pool").$type<string[]>(),
```

### Sync Operations

| Nextier Action    | SignalHouse API Call            |
|-------------------|--------------------------------|
| Create Team       | `createSubGroup()`             |
| Register Brand    | `createBrand()` with subGroupId|
| Create Campaign   | `createCampaign()` with subGroupId|
| Buy Phone         | `buyPhoneNumber()` + assign   |
| Send SMS          | `sendSMS()` from SubGroup pool|

---

## Core Execution Pattern: 10K Blocks

### The Numbers Game

```
┌─────────────────────────────────────────────────────────────┐
│  CAMPAIGN BLOCK                                              │
│  ═══════════════                                             │
│  2,000 leads × 5 touches = 10,000 sends                     │
├─────────────────────────────────────────────────────────────┤
│  Touch 1: All 2000 leads → Measure responses                │
│  Touch 2: Non-responders → Measure responses                │
│  Touch 3: Non-responders → Measure responses                │
│  Touch 4: Non-responders → Measure responses                │
│  Touch 5: Non-responders → PIVOT (call/email/archive)       │
├─────────────────────────────────────────────────────────────┤
│  BLOCK COMPLETE → Capture metrics → Start next block        │
└─────────────────────────────────────────────────────────────┘
```

### Lead Exhaustion Rule

> **After 5 touches with NO CONTACT → Auto-pivot that lead**

Pivot options:
1. **Call Queue** (Gianna) - Push to AI-assisted calling
2. **Email Sequence** - Pivot to email channel
3. **Archive** - Move to cold bucket

### Campaign Block Service

```typescript
// Create block
const block = await campaignBlockService.createBlock({
  teamId: "team_xxx",
  campaignId: "campaign_yyy",
  maxLeads: 2000,
  maxTouchesPerLead: 5,
});

// Add leads
await campaignBlockService.addLeadsToBlock(block.id, leadIds);

// Start execution
await campaignBlockService.startBlock(block.id);

// Track touches
await campaignBlockService.recordTouchSent({
  blockId: block.id,
  leadId: "lead_zzz",
  touchNumber: 1,
  messageId: "msg_abc",
});

// Get leads for next touch
const eligible = await campaignBlockService.getLeadsForNextTouch(block.id);

// Get leads to pivot (exhausted or replied)
const toPivot = await campaignBlockService.getLeadsToPivot(block.id);
```

---

## ML Support Layer (Advisory Only)

### Critical Principle

```
ML is SUPPORTING, not authoritative.
Human-in-loop at EVERY decision point.
Predictions are ADVISORY, never autonomous.
```

### Architecture

```
[Lead Event]
    ↓
[Feature Extraction]
    ↓
[ML Prediction]
    ↓
[Human Queue] ← ML NEVER skips this step
    ↓
[Human Decision]
    ↓
[Action]
```

### Lead Scoring Service

```typescript
// Compute advisory score
const score = leadScoringService.computeScore(
  leadId,
  signals,
  touchCount,
  lastTouchAt,
);

// Returns:
{
  score: 73,           // 0-100
  recommendation: "queue_for_call",  // Advisory only
  confidence: 85,
  factors: {
    recency: 22,       // Recent activity bonus
    engagement: 18,    // Reply rate
    intent: 15,        // HIGH_INTENT signals
    timing: 12,        // Business hours
    touchHistory: 6,   // Touch count adjustment
  },
  reasoning: "Good engagement, has replied, recently active → Add to call queue",
  shouldPivot: true,
}
```

### Feature Snapshot Service

Captures lead features at decision points for offline training:

```typescript
// Pre-send capture
await featureSnapshotService.capturePreSend({
  teamId,
  leadId,
  signals,
  campaignId,
  templateId,
  touchNumber,
});

// Post-reply capture
await featureSnapshotService.capturePostReply({
  teamId,
  leadId,
  signals,
  replyIntent: "positive",
});

// Label outcomes for training
await featureSnapshotService.labelOutcome(leadId, "converted");
```

### ML Boundary Rules

**ML CAN:**
- Compute advisory scores
- Suggest send times
- Recommend templates
- Predict response likelihood
- Store predictions for accuracy tracking

**ML CANNOT:**
- Send messages autonomously
- Change lead states
- Add to call queue without human trigger
- Override opt-out/DNC rules
- Bypass compliance checks
- Delete or modify signals

---

## Signal System

### Append-Only Signal Log

All lead state changes flow through the signal system:

```typescript
type SignalType =
  // Engagement
  | "CONTACTED" | "REPLIED" | "POSITIVE_RESPONSE" | "NEGATIVE_RESPONSE"
  | "QUESTION_ASKED" | "EMAIL_PROVIDED"

  // Interest
  | "INTERESTED" | "HOT_LEAD" | "CALL_REQUESTED" | "MEETING_REQUESTED"

  // Booking
  | "APPOINTMENT_SCHEDULED" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_COMPLETED"

  // Suppression
  | "OPTED_OUT" | "WRONG_NUMBER" | "DO_NOT_CONTACT"

  // Silence (absence is meaningful)
  | "NO_RESPONSE_24H" | "NO_RESPONSE_72H" | "NO_RESPONSE_7D"
```

### Key Properties

1. **Immutable** - Signals are never updated or deleted
2. **Event-sourced** - Each signal links to originating event
3. **AI-classified** - Derived from AI analysis
4. **Human-reviewable** - Confidence scores enable oversight

---

## Human-in-Loop Checkpoints

All critical actions require human approval:

| Checkpoint          | Description                              |
|--------------------|------------------------------------------|
| Draft Review       | All generated messages require approval  |
| Queue Deployment   | "Deploy Approved" requires human click   |
| Call Escalation    | "Add to Call Queue" requires trigger     |
| State Transitions  | HIGH_INTENT requires human confirmation  |

---

## AI Workers

### Gianna (Opener)
- Cold SMS outreach
- B2B focus
- Initial engagement

### Cathy (Nudger)
- Follow-up sequences
- Re-engagement
- Appointment reminders

### Sabrina (Closer)
- Email sequences
- Residential focus
- Deal closing

### NEVA (Researcher)
- Pre-call research
- Lead enrichment
- Company intelligence

---

## Data Model Summary

### Core Schemas

| Schema                    | Purpose                                |
|--------------------------|----------------------------------------|
| `teams.schema.ts`        | Team + SignalHouse SubGroup mapping   |
| `leads.schema.ts`        | Lead records with state tracking      |
| `signals.schema.ts`      | Append-only signal log                |
| `ml-predictions.schema.ts`| Advisory predictions + campaign blocks|
| `ml-feature-snapshots.schema.ts`| Features for ML training      |
| `template-performance.schema.ts`| A/B optimization metrics      |
| `canonical-lead-state.schema.ts`| State machine definitions     |

### Campaign Block Tables

```
campaign_blocks
├── id, team_id, campaign_id
├── max_leads (2000), max_touches_per_lead (5)
├── target_sends (10000)
├── leads_loaded, total_touches, current_touch
├── status (preparing|active|paused|completed|pivoted)
└── metrics (JSONB)

lead_touches
├── id, lead_id, campaign_block_id
├── touch_number (1-5)
├── status, sent_at, delivered_at
├── replied, reply_intent
└── should_pivot
```

---

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind
- **Backend**: Next.js API routes, tRPC
- **Database**: PostgreSQL (DigitalOcean managed)
- **Cache**: Redis (Upstash)
- **ORM**: Drizzle
- **Messaging**: SignalHouse.io (CPaaS)
- **AI**: OpenAI (GPT-4), Anthropic (Claude)
- **Realtime**: Pusher

---

## Deployment

```
DigitalOcean App Platform
├── Frontend (Next.js)
├── API (Next.js API routes)
├── PostgreSQL (Managed)
└── Redis (Upstash)

SignalHouse.io (External)
├── SMS/MMS delivery
├── Phone number management
├── 10DLC compliance
└── Webhooks
```

---

## Key Principles

1. **Piggyback Architecture** - Build amazing UX on proven infrastructure
2. **Multi-Tenant Isolation** - Team = SubGroup (1:1 mapping)
3. **10K Execution Blocks** - Systematic high-volume outreach
4. **Human-in-Loop** - ML advises, humans decide
5. **Signal-Driven** - All state from append-only signals
6. **Compound Contactability** - Multi-channel, multi-touch
