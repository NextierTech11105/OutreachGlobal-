# SMS Campaign Architecture - Nextier Platform

## Overview

Nextier's SMS campaign system is an event-driven orchestration engine that manages lead outreach through SignalHouse.io. The system supports two outreach styles:

1. **SMS Blast** - One-time push to multiple leads
2. **Scheduled Sequence** - Timed follow-ups with delays

## System Flow

```
LEADS ENTER SYSTEM
        │
        ▼
┌─────────────────────────────────────┐
│     CHOOSE OUTREACH STYLE           │
├──────────────────┬──────────────────┤
│   SMS BLAST      │ SCHEDULED SEQ    │
│   (One-time)     │ (Timed delays)   │
│                  │                  │
│ • Announcements  │ • Nurture        │
│ • Promotions     │ • Follow-ups     │
│ • Re-engagement  │ • Multi-touch    │
└──────────────────┴──────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│   MONTHLY CAMPAIGN CYCLE            │
│   (Message Angle + Phone Number)    │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│   SIGNALHOUSE DELIVERY              │
│   (Rate Limited: 75 TPM AT&T, etc)  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│   INBOUND RESPONSE HANDLING         │
│   (Webhook → Classification → Tag)  │
└─────────────────────────────────────┘
```

## Campaign Stages

The system uses 7 campaign stages with dedicated AI personalities:

| Stage | AI Agent | Purpose | Delay |
|-------|----------|---------|-------|
| **Initial** | GIANNA | First touch, capture attention | Day 0 |
| **Retarget** | GIANNA | Re-engage non-responders | Day 3-5 |
| **Nudge** | CATHY | Pattern break with humor | Day 14+ |
| **Nurture** | GIANNA | Content drip, intel sharing | Ongoing |
| **Book** | SABRINA | Schedule discovery meetings | On response |
| **Reminder** | APPOINTMENT_BOT | Appointment confirmations | Pre-meeting |
| **Deal** | SABRINA | Post-appointment tracking | Post-meeting |

**File:** `apps/front/src/lib/campaign/contexts.ts`

## Core Components

### 1. Lead Entry

**Endpoint:** `POST /api/leads/bulk-create`
**File:** `apps/front/src/app/api/leads/bulk-create/route.ts`

- Accepts: propertyIds, filters (state, county, city)
- Batch size: 100 leads per GraphQL mutation
- Auto-tags leads with source and filters

### 2. SMS Queue Service

**File:** `apps/front/src/lib/services/sms-queue-service.ts`

Queue lifecycle: `draft → approved → pending → processing → sent`

| Setting | Value |
|---------|-------|
| Batch Size | 250 messages |
| Daily Limit | 2,000 messages |
| Delay Between Messages | 100ms |
| Delay Between Batches | 30 seconds |
| Operating Hours | Mon-Fri, 9 AM - 5 PM EST |

**Key Functions:**
- `addToQueue()` - Single message
- `addBatchToQueue()` - Bulk messages
- `approveMessages()` - Draft → Approved
- `deployApproved()` - Approved → Pending
- `processBatch()` - Pending → Sent

### 3. SignalHouse Integration

**File:** `apps/front/src/lib/signalhouse/client.ts`

```typescript
// Send SMS
sendSMS({ to, from, message }) → { messageId, status, segments }

// Send MMS
sendMMS({ to, from, message, mediaUrl }) → { messageId, status }
```

**Rate Limits (10DLC Compliance):**
| Carrier | TPM (Transactions/Minute) |
|---------|---------------------------|
| AT&T | 75 |
| T-Mobile | 60 |
| Verizon | 60 |
| Other | 60 (default) |

**File:** `apps/front/src/lib/sms/rate-limiter.ts`

### 4. Inbound Webhook Handler

**Endpoint:** `POST /api/webhook/signalhouse?token=xxx`
**File:** `apps/front/src/app/api/webhook/signalhouse/route.ts`

**Processing Flow:**
1. Token verification (timing-safe comparison)
2. Idempotency check (Redis, 24h TTL)
3. Message classification:
   - Email extraction (regex)
   - Intent detection (positive, question, negative, opt-out)
4. Lead tag assignment
5. Response routing by AI worker phone number

### 5. Campaign Scheduler

**File:** `apps/front/src/lib/schedulers/gianna-loop-scheduler.ts`

| Setting | Value |
|---------|-------|
| Check Interval | 60 minutes |
| Batch Size | 100 leads |
| Min Delay | 24 hours between messages |
| Max Steps | 10 per lead |

### 6. Template System

**File:** `apps/front/src/lib/sms/campaign-templates.ts`

**Available Variables:**
- Contact: `{{firstName}}`, `{{lastName}}`, `{{fullName}}`
- Property: `{{propertyAddress}}`, `{{city}}`, `{{state}}`
- Business: `{{companyName}}`, `{{industry}}`, `{{revenue}}`
- Valuation: `{{estimatedValue}}`, `{{equity}}`

**Template Categories:**
- Initial (20 templates)
- Retarget (20 templates)
- Nudge (20 templates)
- Follow-up (20 templates)
- Confirmation (8 templates)

## Database Schema

### Campaign Tables

**File:** `apps/api/src/database/schema/campaigns.schema.ts`

```
campaigns
├── id (ULID)
├── teamId (tenant isolation)
├── sdrId (AI worker assignment)
├── name, description
├── targetMethod (SCORE_BASED)
├── minScore, maxScore
├── status (DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED)
├── startsAt, endsAt
└── approvedBy, approvedAt

campaign_sequences
├── campaignId
├── type (SMS, VOICE, EMAIL)
├── position (order)
├── content
├── delayDays, delayHours
└── metadata

campaign_leads
├── campaignId, leadId (unique)
├── currentSequencePosition
├── currentSequenceStatus (PENDING, SENT, REPLIED)
├── nextSequenceRunAt
└── status (ACTIVE, STOPPED, COMPLETED)

campaign_executions
├── campaignId, leadId, sequenceId
├── status (PENDING, COMPLETED, FAILED)
└── failedReason

campaign_phone_assignments
├── campaignId, phoneNumberId
├── leadId (one lead = one phone = one thread)
└── isPrimary
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leads/bulk-create` | POST | Import leads |
| `/api/signalhouse/send` | POST | Send single SMS |
| `/api/signalhouse/bulk-send` | POST | Send bulk SMS |
| `/api/webhook/signalhouse` | POST | Inbound SMS handler |
| `/api/webhook/signalhouse` | GET | Recent inbound messages |
| `/api/gianna/sms-webhook` | POST | GIANNA AI responses |
| `/api/webhook/twilio` | POST | Voice call handler |
| `/api/luci/push-to-sms` | POST | Push leads to campaign |
| `/api/admin/campaigns` | CRUD | Campaign management |

## Environment Variables

```bash
# SignalHouse (Required)
SIGNALHOUSE_API_KEY=xxx
SIGNALHOUSE_AUTH_TOKEN=xxx
SIGNALHOUSE_API_URL=https://api.signalhouse.io
SIGNALHOUSE_WEBHOOK_TOKEN=xxx  # For inbound verification

# AI Worker Phone Numbers
GIANNA_PHONE_NUMBER=+1xxxxxxxxxx
CATHY_PHONE_NUMBER=+1xxxxxxxxxx
SABRINA_PHONE_NUMBER=+1xxxxxxxxxx
GIANNA_WEBHOOK_TOKEN=xxx

# Rate Limiting
SMS_RATE_LIMIT_ENABLED=true
SMS_RATE_LIMIT_ATT=75
SMS_RATE_LIMIT_TMOBILE=60
SMS_RATE_LIMIT_VERIZON=60

# Redis (for idempotency)
REDIS_URL=rediss://...
# or
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=xxx
```

## Lead Scoring

**File:** `apps/front/src/lib/campaign/contexts.ts`

| Condition | Score Boost |
|-----------|-------------|
| Mobile captured | +100 |
| Email captured | +100 |
| Both captured (GOLD) | +200 |
| Responded | Priority boost |

**GOLD Label Flow:**
```
Email + Mobile captured
        │
        ▼
   hot_lead status (score: 100)
        │
        ▼
   Push to call_queue
        │
        ▼
   SABRINA assigned for callback
```

## Compliance

### Opt-Out Handling
- STOP messages trigger `addOptOut()` in database + Redis
- Normalized to E.164 format
- Blocks all future sends

### TCPA Compliance
- Operating hours enforced (9 AM - 5 PM EST, Mon-Fri)
- Opt-out language included in templates
- DNC list checked before send

### Rate Limiting
- Carrier-specific TPM limits enforced
- Tenant-isolated rate buckets (per teamId)
- Graceful degradation with retry-after headers

## Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| CampaignSmsConfigurator | `components/campaign-sms-configurator.tsx` | Blast config |
| SMSDripAutomation | `components/sms-drip-automation.tsx` | Sequence config |
| SequenceDesigner | `components/sequence-designer.tsx` | Visual builder |
| TemplateLibrary | `components/template-library.tsx` | Template selection |
| CampaignAnalyticsDashboard | `components/campaign-analytics-dashboard.tsx` | Metrics |
| SMSCommandCenter | `components/sms/sms-command-center.tsx` | Queue monitor |

## Monitoring

### Metrics Endpoint
**Path:** `GET /metrics` (Prometheus format)

Tracks:
- `nextier_queue_waiting` - Jobs waiting
- `nextier_queue_active` - Jobs processing
- `nextier_queue_failed` - Failed jobs
- `nextier_dlq_total` - Dead letter queue depth

### Logs
All webhook handlers log with `[Source]` prefix:
- `[SignalHouse Webhook]`
- `[Twilio Webhook]`
- `[Gianna SMS]`
