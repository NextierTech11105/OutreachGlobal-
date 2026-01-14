# NEXTIER SMS Integration Map

## CRITICAL: All SMS Routes Through SignalHouse

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMS INTEGRATION MAP                                │
│                    Every SMS touchpoint → SignalHouse                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      OUTBOUND SMS FLOW                              │     │
│  │                                                                     │     │
│  │   UI COMPONENT          API ROUTE              SIGNALHOUSE          │     │
│  │   ───────────────────────────────────────────────────────────────  │     │
│  │                                                                     │     │
│  │   Campaign Pages ──────► /api/sms/send-template ──► ExecutionRouter │     │
│  │   SMS Command Center ──► /api/sms/blast ──────────► ExecutionRouter │     │
│  │   Drip Automation ─────► /api/signalhouse/send ───► SignalHouse API │     │
│  │   Sequences ───────────► /api/signalhouse/bulk-send► SignalHouse API│     │
│  │   Click-to-SMS ────────► /api/sms/send-template ──► ExecutionRouter │     │
│  │   AI Workers ──────────► /api/sms/send-template ──► ExecutionRouter │     │
│  │                                                                     │     │
│  │   ALL ROUTES ──────────► ExecutionRouter.ts ──────► SignalHouse     │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      INBOUND SMS FLOW                               │     │
│  │                                                                     │     │
│  │   SIGNALHOUSE           WEBHOOK                  PROCESSING         │     │
│  │   ───────────────────────────────────────────────────────────────  │     │
│  │                                                                     │     │
│  │   SignalHouse ─────────► /api/webhook/signalhouse ──► Webhook Ctrl  │     │
│  │                                │                                    │     │
│  │                                ▼                                    │     │
│  │                          AI Classification                          │     │
│  │                          (GOLD/GREEN/RED)                          │     │
│  │                                │                                    │     │
│  │                    ┌───────────┼───────────┐                       │     │
│  │                    ▼           ▼           ▼                       │     │
│  │               Hot Call     Nurture      DNC List                   │     │
│  │                Queue       Sequence     (Opt-out)                  │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## OUTBOUND SMS - Complete Mapping

### 1. Campaign Pages (AI Workers)

| Page | File | SMS Trigger | Route | Status |
|------|------|-------------|-------|--------|
| **GIANNA** | `/t/[team]/campaigns/gianna/page.tsx` | Initial SMS | `/api/sms/send-template` | ✅ |
| **CATHY** | `/t/[team]/campaigns/cathy/page.tsx` | Nudger SMS | `/api/sms/send-template` | ✅ |
| **SABRINA** | `/t/[team]/campaigns/sabrina/page.tsx` | Closer SMS | `/api/sms/send-template` | ✅ |
| **Initial Message** | `/t/[team]/workspaces/initial-message` | First touch | `/api/sms/send-template` | ✅ |
| **Nudger** | `/t/[team]/workspaces/nudger` | Follow-up | `/api/sms/send-template` | ✅ |
| **Retarget** | `/t/[team]/workspaces/retarget` | NC Retarget | `/api/sms/send-template` | ✅ |

### 2. SMS Components

| Component | File | Purpose | Route | Status |
|-----------|------|---------|-------|--------|
| **Campaign SMS Configurator** | `campaign-sms-configurator.tsx` | AI message generation | `/api/ai/generate-campaign-sms` | ✅ |
| **SMS Campaign Setup** | `sms-campaign-setup.tsx` | Batch campaign setup | `/api/sms/blast` | ✅ |
| **SMS Drip Automation** | `sms-drip-automation.tsx` | Automated sequences | `/api/signalhouse/bulk-send` | ✅ |
| **SMS Command Center** | `sms-command-center.tsx` | Manual send | `/api/sms/send-template` | ✅ |
| **Template Library** | `template-library.tsx` | Template selection | N/A (UI only) | ✅ |

### 3. Leads Pages - Click-to-SMS

| Page | File | Needs SMS | Status |
|------|------|-----------|--------|
| **Leads Table** | `/t/[team]/leads/page.tsx` | Click-to-SMS button | ⚠️ VERIFY |
| **Lead Detail** | `/t/[team]/leads/[id]/page.tsx` | Send SMS action | ⚠️ VERIFY |
| **Hot Leads** | `/t/[team]/hot-leads/page.tsx` | Quick SMS | ⚠️ VERIFY |
| **Inbox** | `/t/[team]/inbox/page.tsx` | Reply SMS | ✅ |

### 4. Sequences/Workflows

| Feature | File | SMS Integration | Status |
|---------|------|-----------------|--------|
| **Workflows** | `/t/[team]/workflows/page.tsx` | SMS step type | ⚠️ VERIFY |
| **Sequences** | `sms-drip-automation.tsx` | Drip sequences | ✅ |
| **Auto-triggers** | `auto-triggers.schema.ts` | Trigger-based SMS | ⚠️ VERIFY |

---

## INBOUND SMS - Complete Mapping

### Webhook Configuration

```
SignalHouse Webhook URL:
https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse?token=b63df419c4c90433467694ef755f015cc1d10ddd3b76ac6a7cf56bfc3681c6d2
```

### Webhook Handler Flow

```typescript
// File: apps/front/src/app/api/webhook/signalhouse/route.ts
// AND: apps/api/src/app/lead/controllers/signalhouse-webhook.controller.ts

POST /api/webhook/signalhouse
  │
  ├── Validate token
  │
  ├── Parse event type:
  │   ├── SMS_RECEIVED (inbound) ──► AI Classification
  │   ├── SMS_SENT ────────────────► Update message status
  │   ├── SMS_DELIVERED ───────────► Update delivery status
  │   ├── SMS_FAILED ──────────────► Log error, retry logic
  │   └── SMS_OPTED_OUT ───────────► Add to DNC list
  │
  └── Route to appropriate handler
```

### Inbound Response Processing

| Event | Handler | Action | Status |
|-------|---------|--------|--------|
| `SMS_RECEIVED` | `signalhouse-webhook.controller.ts:168-292` | Classify + route to inbox | ✅ |
| `message.delivered` | `signalhouse-tracking.schema.ts` | Update `signalhouse_message_status` | ✅ |
| `message.failed` | `signalhouse-tracking.schema.ts` | Log error code | ✅ |
| `message.opted_out` | Webhook handler | Add to DNC | ✅ |

---

## API ROUTES - Complete List

### Frontend (Next.js)

| Route | Method | Purpose | SignalHouse? |
|-------|--------|---------|--------------|
| `/api/sms/send-template` | POST | Send templated SMS | ✅ via ExecutionRouter |
| `/api/sms/blast` | POST | Batch SMS send | ✅ via ExecutionRouter |
| `/api/signalhouse/send` | POST | Direct SignalHouse send | ✅ Direct |
| `/api/signalhouse/bulk-send` | POST | Bulk SignalHouse send | ✅ Direct |
| `/api/signalhouse/message` | GET | Message history | ✅ Direct |
| `/api/signalhouse/numbers` | GET | Phone numbers | ✅ Direct |
| `/api/signalhouse/analytics` | GET | SMS analytics | ✅ Direct |
| `/api/signalhouse/stats` | GET | Account stats | ✅ Direct |
| `/api/signalhouse/brand` | POST | 10DLC brand mgmt | ✅ Direct |
| `/api/signalhouse/campaign` | POST | 10DLC campaign mgmt | ✅ Direct |
| `/api/signalhouse/test` | POST | Test connection | ✅ Direct |
| `/api/webhook/signalhouse` | POST | Inbound webhooks | ✅ Receiver |
| `/api/ai/generate-campaign-sms` | POST | AI message gen | N/A (AI only) |

### Backend (NestJS)

| Route | Method | Purpose | SignalHouse? |
|-------|--------|---------|--------------|
| `/signalhouse/send` | POST | Send SMS/MMS | ✅ Direct |
| `/signalhouse/configure` | POST | API key setup | ✅ Config |
| `/signalhouse/stats` | GET | Wallet/stats | ✅ Direct |
| `/signalhouse/test` | POST | Test connection | ✅ Direct |
| `/api/webhook/signalhouse` | POST | Webhook handler | ✅ Receiver |

---

## EXECUTION ROUTER - The Canonical Path

```
┌─────────────────────────────────────────────────────────────────┐
│                    ExecutionRouter.ts                            │
│             (All SMS MUST route through here)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  executeSMS(request: SMSRequest)                                │
│  ├── Validate templateId (REQUIRED)                             │
│  ├── Resolve template from CARTRIDGE_LIBRARY                    │
│  ├── Personalize with lead data                                 │
│  ├── Check rate limits                                          │
│  ├── Select phone from pool (rotation)                          │
│  └── Call SignalHouse API                                       │
│                                                                  │
│  executeBatchSMS(requests: SMSRequest[])                        │
│  ├── Validate all templateIds                                   │
│  ├── Batch personalization                                      │
│  ├── Distribute across phone pool                               │
│  └── Call SignalHouse bulk API                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**File:** `apps/front/src/lib/sms/ExecutionRouter.ts`

---

## SIGNALHOUSE CONFIGURATION

### Required Settings (per team)

| Setting | Table | Column | Required |
|---------|-------|--------|----------|
| API Key | `team_settings` | `signalhouseApiKey` | ✅ |
| Auth Token | `team_settings` | `signalhouseAuthToken` | ✅ |
| Sub-Group ID | `teams` | `signalhouseSubGroupId` | ✅ |
| Brand ID | `teams` | `signalhouseBrandId` | ✅ |
| Campaign IDs | `signalhouse_campaigns` | `shCampaignId` | ✅ |
| Phone Pool | `sms_phone_pool` | Multiple rows | ✅ |

### Current Production Config

```
Group ID:     GM7CEB
Sub-Group:    S7ZI7S (Default Sub Group)
Brand:        BZOYPIH (NEXTIER)
Campaign:     CJRCU60 (Approved - LOW_VOLUME)
Phone:        15164079249 (Active)
Webhook:      https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse
```

---

## DATABASE TABLES - SMS Related

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sms_phone_pool` | Phone rotation | phoneNumber, rotationIndex, lastUsedAt |
| `sms_send_batches` | Batch tracking | status, sentCount, deliveredCount |
| `sms_batch_leads` | Per-lead tracking | batchId, leadId, shMessageId |
| `signalhouse_message_status` | Delivery tracking | shMessageId, status, errorCode |
| `signalhouse_webhook_log` | Webhook audit | eventType, payload, processed |
| `signalhouse_campaigns` | 10DLC campaigns | shCampaignId, status |
| `messages` | Message history | content, direction, leadId |
| `inbox` | Conversation inbox | threadId, lastMessage |

---

## VERIFICATION CHECKLIST

### Outbound SMS
- [x] Campaign pages use ExecutionRouter
- [x] ExecutionRouter calls SignalHouse API
- [x] Templates enforced (no raw text)
- [x] Phone pool rotation working
- [x] Batch sending supported
- [ ] Click-to-SMS on leads table - VERIFY
- [ ] Workflows SMS step - VERIFY

### Inbound SMS
- [x] Webhook URL configured in SignalHouse
- [x] Webhook handler validates token
- [x] AI classification (GOLD/GREEN/RED)
- [x] Inbox routing
- [x] DNC opt-out handling
- [x] Message status updates

### Tracking
- [x] `signalhouse_message_status` table created
- [x] `signalhouse_webhook_log` table created
- [x] `sms_send_batches` table created
- [x] Error code tracking
- [x] Delivery rate metrics

---

## ITEMS TO VERIFY/FIX

### Priority 1: Click-to-SMS on Leads

Need to verify these pages have SignalHouse-connected SMS buttons:

1. `/t/[team]/leads/page.tsx` - Leads table
2. `/t/[team]/leads/[id]/page.tsx` - Lead detail
3. `/t/[team]/hot-leads/page.tsx` - Hot leads

### Priority 2: Workflows/Sequences

Need to verify SMS steps in workflows use SignalHouse:

1. `/t/[team]/workflows/page.tsx` - Workflow builder
2. `auto-triggers.schema.ts` - Auto-trigger SMS

### Priority 3: Analytics Integration

Ensure all SMS analytics pull from SignalHouse:

1. `/t/[team]/analytics/sms/page.tsx`
2. `sms-analytics-dashboard.tsx`

---

## SIGNALHOUSE API REFERENCE

### Send SMS
```bash
POST https://api.signalhouse.io/message/sendSMS
{
  "from": "15164079249",
  "to": ["17187175127"],
  "body": "Message text",
  "campaignId": "CJRCU60",
  "shortLink": false
}
```

### Webhook Events
- `message.queued` - Message accepted
- `message.sent` - Sent to carrier
- `message.delivered` - Confirmed delivery
- `message.failed` - Send failed
- `message.received` - Inbound SMS
- `message.opted_out` - STOP keyword

---

*Last Updated: 2026-01-13*
*Integration: SignalHouse 10DLC via NEXTIER*
