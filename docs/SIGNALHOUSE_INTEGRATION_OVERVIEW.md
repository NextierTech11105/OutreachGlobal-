# Nextier × SignalHouse Integration Overview

## Executive Summary

Nextier is a B2B outreach platform that leverages SignalHouse's Tier 2 SMS infrastructure for all messaging operations. We handle the AI/ML, lead management, and campaign logic — SignalHouse provides the phones, delivery, and 10DLC compliance.

**Our Stack:** Next.js + PostgreSQL + Redis
**Your Stack:** MERN (MongoDB, Express, React, Node)
**Integration:** REST API + Webhooks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NEXTIER PLATFORM                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  CSV Import  │  │  Skip Trace  │  │  AI Workers (GIANNA,     │  │
│  │  (USBizData) │→ │  (RealEstate │→ │  CATHY, SABRINA, NEVA)   │  │
│  │              │  │   API)       │  │  Message Generation      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│         ↓                  ↓                      ↓                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CAMPAIGN ORCHESTRATION                    │   │
│  │   • Lead Scoring (0-100)    • Template Personalization      │   │
│  │   • Business Hours Queue    • Multi-tenant Brand Routing    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓ API
┌─────────────────────────────────────────────────────────────────────┐
│                      SIGNALHOUSE INFRASTRUCTURE                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   10DLC      │  │   Phone      │  │   Message Delivery       │  │
│  │   Brands &   │  │   Numbers    │  │   <1 sec, 99%            │  │
│  │   Campaigns  │  │   Inventory  │  │   Deliverability         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│         ↓                  ↓                      ↓                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      WEBHOOK EVENTS                          │   │
│  │   • Inbound SMS/MMS         • Delivery Status               │   │
│  │   • Opt-out Detection       • Click Tracking (Short Links)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current Integration Status

### SignalHouse Resources (LIVE)

| Resource | ID | Status |
|----------|-----|--------|
| Sub Group | S7ZI7S | Active |
| Brand | BZOYPIH (NEXTIER) | Registered |
| Campaign | Temp-C21390 | Under Review |
| Phone | 15164079249 | Pending |
| Balance | $94.50 | Active |

### Nextier API Integration

We've built a comprehensive SignalHouse client (`/lib/signalhouse/client.ts`) with **100+ functions** covering:

```typescript
// Brand Operations
createBrand(), getBrand(), updateBrand(), deleteBrand()

// Campaign Operations
createCampaign(), getCampaign(), updateCampaign(), getCampaignBasicDetails()

// Phone Number Operations
getAvailableNumbers(), buyPhoneNumber(), releasePhoneNumber()
configurePhoneNumber(), attachNumberToCampaign()

// Messaging
sendMessage(), bulkSendMessages(), getConversationList()
createTemplate(), getTemplates(), editTemplate()

// Analytics
getEventLogs(), getShortLinkAnalytics(), getMessageLogsByNumber()

// Opt-out Management
getOptOutList(), addToOptOutList(), removeFromOptOutList()
```

---

## Data Flow: CSV → Skip Trace → Campaign → SMS

### Step 1: Import (2,000 leads per batch)
```
USBizData CSV → Nextier Import UI
├── Owner/CEO title filtering
├── Address validation
├── Campaign assignment (SignalHouse campaign ID)
└── Status: pending_enrichment
```

### Step 2: Skip Trace (RealEstateAPI)
```
Lead (Name + Address) → RealEstateAPI → Phone + Email
├── 2,000/day limit
├── Rejects LLC/Trust/Corporate names
└── Status: enriched or no_data_found
```

### Step 3: Send via SignalHouse
```
Enriched Lead → Nextier Template Engine → SignalHouse API
├── POST /api/v1/message/send
├── Variables: {{firstName}}, {{companyName}}, {{city}}
├── From: 15164079249 (tagged "INITIAL SMS GIANNA")
└── To: Lead's mobile phone
```

### Step 4: Inbound Webhook (Responses)
```
Lead Reply → SignalHouse Webhook → Nextier /api/webhook/signalhouse
├── Route by phone tag → AI Worker (GIANNA/CATHY/SABRINA)
├── Classify: interested / email_capture / opt_out
├── Auto-respond or escalate
└── Update lead: GOLD LABEL if email captured
```

---

## SignalHouse APIs We Leverage

### Campaigns (Per 2K Batch)
```javascript
POST /api/v1/campaign/storeForReview
{
  brandId: "BZOYPIH",
  usecase: "MARKETING",
  description: "NY Plumbers Opener Campaign - Batch 1",
  sampleMessages: ["Hi {{firstName}}, I noticed you own..."],
  subGroupId: "S7ZI7S"
}
```

### Templates (Reusable Messages)
```javascript
POST /api/v1/message/createTemplate
{
  name: "opener-owner-plumber",
  content: "Hi {{firstName}}, I noticed you own {{companyName}} in {{city}}. Quick question - are you the best person to speak with about business financing?",
  variables: ["firstName", "companyName", "city"]
}
```

### Phone Numbers (Per Campaign)
```javascript
POST /api/v1/phoneNumber/buyPhoneNumber
{ phoneNumber: "+15164079249", friendlyName: "GIANNA Opener Line" }

POST /api/v1/phoneNumber/configurePhoneNumber
{
  phoneNumber: "+15164079249",
  campaignId: "Temp-C21390",
  smsWebhookUrl: "https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse"
}
```

### Short Links (Click Tracking)
```javascript
POST /api/v1/message/shortLink
{ originalUrl: "https://nextier.com/content/value-proposition", friendlyName: "Q1-2024-Plumbers" }

// Returns: { shortUrl: "https://sh.link/abc123" }
// Embed in messages for click tracking
```

### Analytics (ROI Tracking)
```javascript
GET /api/v1/message/getEventLogs?startDate=2024-01-01
// Returns: delivery rates, response rates, opt-outs

GET /api/v1/message/shortLink/analytics/abc123
// Returns: clicks, unique visitors, by date
```

---

## Webhook Integration

### Nextier Webhook Endpoint
```
POST https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse
```

### Events We Handle
| Event | Action |
|-------|--------|
| `inbound_message` | Route to AI worker, classify, respond |
| `delivery_status` | Update message status in DB |
| `mms_received` | Process media attachments |
| `opt_out` | Add to suppression list |
| `short_link_click` | Track content engagement |

### Phone Number Tags for Routing
```
"INITIAL SMS GIANNA" → Opener campaigns, first contact
"FOLLOWUP CATHY"     → Email capture, nurture sequences
"CLOSER SABRINA"     → Hot leads, deal closing
"REACTIVATION NEVA"  → Cold lead re-engagement
```

---

## Multi-Tenant Architecture

### Nextier Holdings (Parent Brand)
```
├── Nextier Consulting    → Sub Group 1 → Own phone numbers
├── Nextier Technologies  → Sub Group 2 → Own phone numbers
└── Nextier System Design → Sub Group 3 → Own phone numbers
```

### SignalHouse Mapping
| Nextier Concept | SignalHouse Resource |
|-----------------|---------------------|
| Sub-brand | Sub Group |
| Campaign Type | Campaign usecase |
| Initial Message | Template |
| 2K Lead Batch | Campaign + Phone |
| AI Worker | Webhook routing |

---

## Enterprise Features We Use

### Retry Logic
```typescript
// Built into our client
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}
```

### Correlation IDs
```typescript
// Cross-platform tracing
headers["x-correlation-id"] = `nxt_${Date.now()}_${randomId}`;
headers["x-client"] = "nextier-platform";
```

### Rate Limiting
- Respect `429` responses with `Retry-After` header
- Batch sends: 100 messages/min, 2,000/day per campaign

---

## SMS → Call Queue Interoperability

All SMS conversations can be pushed into call queues for voice follow-up:

```
SMS Response (Interested) → Nextier Classification → Call Queue
├── Hot Lead (GOLD LABEL) → Immediate call queue
├── Warm Lead (email captured) → Scheduled callback
└── Cold Lead (no response) → Nurture sequence
```

**Flow:**
1. Lead replies to SMS
2. AI classifies intent
3. If qualified → Push to call center queue
4. Dialer picks up lead with full SMS context

---

## Inbound Response Center Architecture

**All inboxes mapped and maintained with SignalHouse:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SIGNALHOUSE INBOXES (SOURCE OF TRUTH)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Inbox 1     │  │  Inbox 2     │  │  Inbox 3                 │  │
│  │  (GIANNA)    │  │  (CATHY)     │  │  (SABRINA)               │  │
│  │  Openers     │  │  Follow-ups  │  │  Closers                 │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↑ Sync
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXTIER UI (WRAPPER)                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Unified Dashboard          • AI-Powered Responses        │   │
│  │  • Lead Context Integration   • Team Assignment             │   │
│  │  • Analytics Overlay          • Bulk Actions                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### UI Wrapping Strategy

Nextier UI wraps SignalHouse functionality:

| SignalHouse Feature | Nextier UI Enhancement |
|---------------------|------------------------|
| Message Logs | + Lead scoring, AI classification |
| Conversations | + CRM context, property data |
| Analytics | + ROI attribution, heatmaps |
| Number Management | + Campaign assignment workflow |
| Templates | + Variable injection from lead data |

**Benefits:**
- SignalHouse handles all messaging infrastructure
- Nextier adds business logic, AI, and context
- Single source of truth for message state
- Real-time sync via webhooks

---

## Future Enhancements

1. **Click-to-SMS** - Embed links that open SMS app pre-filled
2. **RCS Support** - Rich messages when available
3. **MMS Campaigns** - Property images, video content
4. **Voice Integration** - AI voice calls via SignalHouse
5. **Real-time Dashboard** - Live delivery metrics via WebSocket
6. **Unified Inbox Embedding** - SignalHouse inbox components in Nextier UI

---

## Contact

**Nextier Development Team**
Platform: https://monkfish-app-mb7h3.ondigitalocean.app
GitHub: NextierTech11105/OutreachGlobal-

**SignalHouse Account**
Brand: BZOYPIH (NEXTIER)
Sub Group: S7ZI7S
Primary Number: 15164079249
