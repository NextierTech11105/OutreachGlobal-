# SignalHouse SMS Core

> Production-ready SMS infrastructure for the OutreachGlobal platform, powered by SignalHouse.io

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OUTREACH GLOBAL PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│   │  AI Workers  │    │   Campaigns  │    │ Multi-Tenant │    │  Analytics   │ │
│   │   GIANNA     │    │   (10DLC)    │    │  (Sub-groups)│    │  (Heatmaps)  │ │
│   │   CATHY      │    │              │    │              │    │              │ │
│   │   SABRINA    │    │              │    │              │    │              │ │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│          │                   │                   │                   │          │
│          └───────────────────┴───────────────────┴───────────────────┘          │
│                                      │                                           │
│                        ┌─────────────▼─────────────┐                            │
│                        │   SignalHouse SMS Core    │                            │
│                        │   lib/signalhouse/        │                            │
│                        └─────────────┬─────────────┘                            │
│                                      │                                           │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SIGNALHOUSE.IO API                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Brands & 10DLC Registration      • Phone Number Provisioning                 │
│  • Sub-Groups (Multi-Tenant)        • SMS/MMS Messaging                         │
│  • Campaign Management              • Webhook Delivery                           │
│  • Opt-Out Compliance               • Analytics & Reporting                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Configuration

Set environment variables:

```env
# Required - One of these must be set
SIGNALHOUSE_API_KEY=your_api_key
SIGNALHOUSE_AUTH_TOKEN=your_auth_token

# Optional - Webhook security
SIGNALHOUSE_WEBHOOK_TOKEN=shared_secret_for_webhooks

# Optional - Default sender
SIGNALHOUSE_FROM_NUMBER=+15551234567
NEXT_PUBLIC_API_URL=https://yourapp.com
```

### 2. Import & Use

```typescript
// Import everything from the unified index
import {
  sendSMS,
  isConfigured,
  healthCheck,
  quickSend,
  SIGNALHOUSE_SMS_CORE,
} from "@/lib/signalhouse";

// Quick health check
const status = await healthCheck();
console.log(`SignalHouse: ${status.connected ? "Connected" : "Disconnected"}`);
console.log(`Balance: $${status.balance}`);

// Quick send (uses default from number)
const result = await quickSend("+15559876543", "Hello from OutreachGlobal!");
console.log(`Message ID: ${result.messageId}`);
```

### 3. Full Send Example

```typescript
import { sendSMS, sendMMS } from "@/lib/signalhouse";

// Send SMS
const smsResult = await sendSMS({
  to: "+15559876543",
  from: "+15551234567",
  message: "Your property valuation is ready!",
});

// Send MMS with image
const mmsResult = await sendMMS({
  to: "+15559876543",
  from: "+15551234567",
  message: "See the attached report",
  mediaUrl: "https://cdn.example.com/report.pdf",
});
```

---

## Module Structure

```
lib/signalhouse/
├── index.ts              # Unified exports (import from here)
├── client.ts             # Direct SignalHouse API client
├── signalhouse-service.ts # Service layer with business logic
├── admin-service.ts      # Super-admin operations
└── tenant-mapping.ts     # Multi-tenant brand hierarchy
```

### Core Modules

| Module | Purpose |
|--------|---------|
| `client.ts` | Low-level API wrapper with retry, rate limiting, correlation IDs |
| `signalhouse-service.ts` | Singleton service with batch sending, templates, sub-groups |
| `admin-service.ts` | Dashboard data, team campaigns, phone provisioning |
| `tenant-mapping.ts` | Nextier teams ↔ SignalHouse brands/sub-groups |

---

## API Endpoints

### Send SMS/MMS

```
POST /api/signalhouse/send
```

```json
{
  "to": "+15559876543",
  "from": "+15551234567",
  "message": "Hello!",
  "mediaUrl": "https://...",       // Optional - makes it MMS
  "validateNumber": true,           // Optional - check number validity
  "skipLandlineValidation": false   // Optional - allow landlines
}
```

### Campaigns (10DLC)

```
GET  /api/signalhouse/campaign              # List all campaigns
GET  /api/signalhouse/campaign?campaignId=X # Get specific campaign
GET  /api/signalhouse/campaign?action=qualify&brandId=X # Get use cases
POST /api/signalhouse/campaign              # Create campaign
PUT  /api/signalhouse/campaign              # Update campaign
DELETE /api/signalhouse/campaign?campaignId=X # Delete campaign
```

### Admin Campaigns (Super Admin)

```
GET  /api/admin/campaigns                   # List grouped by sub-group
POST /api/admin/campaigns                   # Create for team
PATCH /api/admin/campaigns                  # Update campaign
DELETE /api/admin/campaigns?campaignId=X    # Delete campaign
```

### Phone Numbers

```
GET  /api/signalhouse/numbers               # List owned numbers
POST /api/signalhouse/numbers               # Purchase number
POST /api/signalhouse/numbers/configure     # Configure number
DELETE /api/signalhouse/numbers             # Release number
```

### Webhooks

```
POST /api/webhook/signalhouse?token=SECRET  # Receive SignalHouse events
GET  /api/webhook/signalhouse               # List recent inbound messages
```

---

## Multi-Tenant Architecture

### Brand Hierarchy

```
├── Nextier Holdings (Parent Brand - 10DLC registered)
│   ├── Nextier Consulting (Sub-group → Team A, Team B)
│   ├── Nextier Technologies (Sub-group → Team C)
│   └── Nextier System Design (Sub-group → Team D, Team E)
```

### Mapping Teams to SignalHouse

```typescript
import {
  mapTeamToSubBrand,
  getSignalHouseContextForTeam,
  fullTenantSync,
} from "@/lib/signalhouse";

// Map a team to a sub-brand
mapTeamToSubBrand("team-123", "nextier_consulting");

// Get SignalHouse context for sending
const context = await getSignalHouseContextForTeam("team-123");
// Returns: { brandId, brandName, subGroupId, subGroupName, fromNumber }

// Sync all brands/sub-brands to SignalHouse
const syncResult = await fullTenantSync();
```

---

## AI Worker Integration

Each AI worker has dedicated phone number routing:

| Worker | Role | Specialization |
|--------|------|----------------|
| GIANNA | Opener | Initial contact, email capture |
| CATHY | Nudger | Follow-ups, ghost re-engagement |
| SABRINA | Closer | Booking calls, strategy sessions |

### Inbound Routing

Incoming SMS automatically routes to the correct worker based on the receiving phone number:

```typescript
import { routeByPhoneNumber, formatWorkerResponse } from "@/lib/ai-workers/worker-router";

// Get worker for incoming message
const { worker, matchedBy } = routeByPhoneNumber(toNumber);

// Generate worker-specific response
const response = formatWorkerResponse(worker, "emailCaptured", {
  firstName: "John",
  email: "john@email.com",
});
```

---

## 2-Bracket SMS Flows

### Flow A: Email Capture

```
1. Outbound: "Best email to send valuation report for {address}?"
2. Inbound:  "john@email.com"  ← Email extracted
3. Outbound: "John sure! Will have that sent out shortly - Gianna"
→ Lead gets GOLD label (email + mobile = 100% score)
→ Value X delivered via EMAIL
→ 24h SABRINA follow-up scheduled
```

### Flow B: Content Link Permission

```
1. Outbound: "Can I send you a link to the Medium article I wrote?"
2. Inbound:  "Yes" / "Sure" / "Send it"  ← Permission detected
3. Outbound: "Great! Here it is: {contentUrl} - Gianna"
→ Content delivered via SMS
→ 24h follow-up to pivot to email capture
```

---

## Lead Scoring

| Label | Criteria | Score | Priority |
|-------|----------|-------|----------|
| GREEN | Responded to SMS | 3x | Highest - Call immediately |
| GOLD | Email + Mobile captured | 100% | High - Both contact methods |
| Standard | Initial contact | 1x | Normal |

---

## Webhook Events

The webhook handler processes these SignalHouse events:

| Event | Description |
|-------|-------------|
| `message.received` | Inbound SMS/MMS |
| `message.sent` | Outbound message queued |
| `message.delivered` | Message delivered |
| `message.failed` | Message failed |
| `brand.add` | 10DLC brand registered |
| `brand.delete` | Brand removed |
| `campaign.add` | Campaign approved |
| `campaign.update` | Campaign status changed |
| `campaign.expired` | Campaign needs renewal |
| `number.provisioned` | Phone number purchased |
| `mms.received` | Inbound MMS with media |

### Webhook Security

Configure webhook URL with token:
```
https://yourapp.com/api/webhook/signalhouse?token=YOUR_SECRET
```

Set `SIGNALHOUSE_WEBHOOK_TOKEN` environment variable to match.

---

## Analytics & Heatmaps

### Dashboard Analytics

```typescript
import { getDashboardAnalytics, buildWorkflowHeatmap } from "@/lib/signalhouse";

// Get overall stats
const analytics = await getDashboardAnalytics();
// { totalSent, totalDelivered, totalFailed, deliveryRate, uniqueClicks, balance }

// Build workflow heatmap
const heatmap = await buildWorkflowHeatmap([
  { campaignId: "camp-1", name: "Cold Outreach", context: "real_estate" },
  { campaignId: "camp-2", name: "Follow-up", context: "warm_leads" },
]);
// Returns ranked workflows with heat scores (0-100)
```

### Heat Score Calculation

```typescript
import { calculateHeatScore, getHeatColor } from "@/lib/signalhouse";

const metrics = {
  totalSent: 1000,
  delivered: 950,
  responses: 120,
  emailCaptures: 45,
  optOuts: 8,
  interested: 30,
  questions: 25,
};

const score = calculateHeatScore(metrics); // 0-100
const color = getHeatColor(score); // CSS color for visualization
```

---

## Error Handling

The client implements production-grade error handling:

```typescript
const result = await sendSMS({ to, from, message });

if (!result.success) {
  console.error(`Failed: ${result.error}`);
  console.error(`Status: ${result.status}`);
  console.error(`Correlation ID: ${result.correlationId}`);
}
```

### Retry Logic

- **Retryable errors**: 408, 429, 500, 502, 503, 504
- **Max retries**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Rate limit**: Honors `Retry-After` header

### Correlation IDs

Every request includes a correlation ID for tracing:
```
nxt_1735228800000_abc123def
```

---

## Batch Sending

```typescript
import { signalHouseService } from "@/lib/signalhouse";

const job = await signalHouseService.sendBatchSMS(
  [
    { to: "+15551111111", message: "Hello {{firstName}}!", variables: { firstName: "John" } },
    { to: "+15552222222", message: "Hello {{firstName}}!", variables: { firstName: "Jane" } },
  ],
  {
    batchSize: 250,      // Messages per batch
    maxPerDay: 2000,     // Daily limit
    delayBetweenBatches: 5000, // 5 second pause
    fromNumber: "+15551234567",
  }
);

console.log(`Sent: ${job.sentMessages}/${job.totalMessages}`);
console.log(`Failed: ${job.failedMessages}`);
```

---

## 10DLC Compliance

### Brand Registration

```typescript
import { createBrand, qualifyBrandForUsecases } from "@/lib/signalhouse";

// Register brand
const brand = await createBrand({
  legalCompanyName: "Nextier Holdings LLC",
  brandName: "Nextier",
  ein: "12-3456789",
  website: "https://nextier.io",
  vertical: "TECHNOLOGY",
  entityType: "PRIVATE_PROFIT",
});

// Check available use cases
const usecases = await qualifyBrandForUsecases(brand.data.brandId);
// ["MARKETING", "LOW_VOLUME", "MIXED", ...]
```

### Campaign Registration

```typescript
import { createCampaign, attachNumberToCampaign } from "@/lib/signalhouse";

// Create campaign
const campaign = await createCampaign({
  brandId: "brand-123",
  usecase: "MARKETING",
  description: "Real estate lead nurturing",
  sampleMessages: [
    "Hi {{firstName}}, interested in a free property valuation?",
    "Thanks for your interest! What's the best email to send details?",
  ],
  messageFlow: "User opts in via web form. System sends value-first content.",
  helpMessage: "Reply HELP for assistance",
  optoutMessage: "Reply STOP to unsubscribe",
});

// Attach phone numbers
await attachNumberToCampaign("+15551234567", campaign.data.campaignId);
```

---

## Version & Metadata

```typescript
import { SIGNALHOUSE_SMS_CORE } from "@/lib/signalhouse";

console.log(SIGNALHOUSE_SMS_CORE);
// {
//   version: "1.0.0",
//   name: "SignalHouse SMS Core",
//   features: [...],
//   docsUrl: "https://app.signalhouse.io/apidoc"
// }
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SIGNALHOUSE_API_KEY` | Yes* | API key from SignalHouse |
| `SIGNALHOUSE_AUTH_TOKEN` | Yes* | Auth token (alternative) |
| `SIGNALHOUSE_WEBHOOK_TOKEN` | No | Webhook security token |
| `SIGNALHOUSE_FROM_NUMBER` | No | Default sender number |
| `NEXT_PUBLIC_API_URL` | No | Base URL for webhooks |
| `GIANNA_PHONE_NUMBER` | No | GIANNA worker's number |
| `CATHY_PHONE_NUMBER` | No | CATHY worker's number |
| `SABRINA_PHONE_NUMBER` | No | SABRINA worker's number |
| `HOT_LEAD_CAMPAIGN_ID` | No | Campaign for hot leads |

*At least one authentication method required.

---

## Related Documentation

- [SMS Infrastructure Blueprint](./SMS-INFRASTRUCTURE-BLUEPRINT.md) - Full technical deep-dive
- [Platform Overview](./PLATFORM-OVERVIEW.md) - Non-technical system overview
- [SignalHouse API Docs](https://app.signalhouse.io/apidoc) - Official API reference
