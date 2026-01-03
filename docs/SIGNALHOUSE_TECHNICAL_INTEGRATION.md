# SignalHouse API Integration - Technical Specification

## Client: NEXTIER (Brand ID: BZOYPIH)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXTIER PLATFORM                                  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │     GIANNA      │  │     CATHY       │  │    SABRINA      │             │
│  │  (Cold Opener)  │  │   (Nudger)      │  │   (Closer)      │             │
│  │                 │  │                 │  │                 │             │
│  │ Lane: A         │  │ Lane: A/B       │  │ Lane: B         │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                    ┌───────────▼───────────┐                               │
│                    │   SMS QUEUE SERVICE   │                               │
│                    │                       │                               │
│                    │  • Rate limiting      │                               │
│                    │  • Batch processing   │                               │
│                    │  • Retry logic        │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
│                    ┌───────────▼───────────┐                               │
│                    │  COMPLIANCE LAYER     │                               │
│                    │                       │                               │
│                    │  phone → campaign     │                               │
│                    │  template validation  │                               │
│                    │  worker permissions   │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 │
┌────────────────────────────────▼────────────────────────────────────────────┐
│                         SIGNALHOUSE API                                     │
│                                                                             │
│  POST /message/sendSMS                                                      │
│  {                                                                          │
│    "to": "+1234567890",                                                     │
│    "from": "+15164079249",      // Phone determines campaign                │
│    "message": "...",                                                        │
│    "tags": ["lane:cold_outreach", "worker:gianna", "batch:abc123"]         │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Outbound SMS

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐     ┌─────────────┐
│  Worker  │────>│  Queue Svc   │────>│  Compliance    │────>│ SignalHouse │
│  (AI)    │     │              │     │  Check         │     │ sendSMS     │
└──────────┘     └──────────────┘     └────────────────┘     └─────────────┘
     │                  │                     │                     │
     │ Template +       │ Add to batch        │ Validate:           │ HTTP POST
     │ Lead data        │ with campaignId     │ • Phone → Lane      │ /message/sendSMS
     │                  │                     │ • Worker allowed?   │
     │                  │                     │ • Template valid?   │
     │                  │                     │                     │
     │                  │                     │ PASS → Forward      │
     │                  │                     │ FAIL → Block + Log  │
```

---

## Data Flow: Inbound SMS (Webhook)

```
┌─────────────┐     ┌────────────────────┐     ┌─────────────────────────────┐
│ SignalHouse │────>│ Webhook Handler    │────>│ Response Classifier         │
│ SMS_RECEIVED│     │ POST /api/webhook/ │     │                             │
└─────────────┘     │ signalhouse        │     │ • Opt-out? → Remove lead    │
                    └────────────────────┘     │ • Positive? → Move to Lane B│
                                               │ • Email? → Capture + queue  │
                                               │ • Question? → AI response   │
                                               └─────────────────────────────┘
```

---

## Campaign Configuration

```typescript
// Our internal mapping that mirrors SignalHouse campaigns

interface PhoneCampaignConfig {
  phoneNumber: string;           // E.164 format
  campaignId: string;            // SignalHouse campaign ID
  brandId: string;               // SignalHouse brand ID
  lane: 'cold_outreach' | 'engaged_leads';
  useCase: 'LOW_VOLUME_MIXED' | 'CONVERSATIONAL';
  allowedWorkers: ('GIANNA' | 'CATHY' | 'SABRINA' | 'NEVA')[];
  tpmLimit: number;              // Transactions per minute
  dailyLimit: number;            // Max messages per day
}

// Example configuration
const PHONE_CAMPAIGN_MAP = {
  "15164079249": {
    phoneNumber: "15164079249",
    campaignId: "NEW_CAMPAIGN_ID",    // Will be assigned after approval
    brandId: "BZOYPIH",
    lane: "cold_outreach",
    useCase: "LOW_VOLUME_MIXED",
    allowedWorkers: ["GIANNA"],
    tpmLimit: 75,                      // AT&T limit for Low Volume
    dailyLimit: 2000
  }
};
```

---

## API Endpoints We Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/message/sendSMS` | POST | Send single SMS |
| `/message/sendBatchSMS` | POST | Send batch SMS |
| `/phoneNumber/myPhoneNumbers` | GET | List owned numbers |
| `/phoneNumber/configurePhoneNumber` | POST | Assign number to campaign |
| `/campaign/{campaignId}` | GET | Get campaign details |
| `/analytics/analyticsOutbound` | GET | Track delivery metrics |

---

## Webhook Events We Handle

```typescript
// Webhook URL: https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse

type WebhookEvent =
  | 'SMS_SENT'           // Outbound message sent
  | 'SMS_RECEIVED'       // Inbound message received
  | 'MMS_SENT'           // Outbound MMS sent
  | 'MMS_RECEIVED'       // Inbound MMS received
  | 'CAMPAIGN_ADD'       // New campaign created
  | 'CAMPAIGN_UPDATE'    // Campaign updated
  | 'CAMPAIGN_EXPIRED'   // Campaign expired
  | 'NUMBER_PURCHASED'   // New number purchased
  | 'NUMBER_PORTED';     // Number ported in

// Webhook payload structure
interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: {
    from?: string;       // Sender phone
    to?: string;         // Recipient phone
    body?: string;       // Message content
    messageSid?: string; // Message ID
    status?: string;     // Delivery status
    campaignId?: string; // Associated campaign
    // ... additional fields per event type
  };
}
```

---

## Template Validation Rules

```typescript
// Pre-send validation for 10DLC compliance

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateForLane(message: string, lane: CampaignLane): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Character limit (single segment)
  if (message.length > 160) {
    errors.push(`Exceeds 160 chars: ${message.length}`);
  }

  // Rule 2: No promotional language (10DLC requirement)
  const blockedWords = ['FREE', 'ACT NOW', 'LIMITED TIME', 'OFFER', 'DISCOUNT', 'SALE'];
  for (const word of blockedWords) {
    if (message.toUpperCase().includes(word)) {
      errors.push(`Contains promotional language: "${word}"`);
    }
  }

  // Rule 3: Sender identification (cold outreach requirement)
  if (lane === 'cold_outreach') {
    const hasSenderID = message.includes('Gianna') ||
                        message.includes('Nextier') ||
                        message.match(/it's \w+ from/i);
    if (!hasSenderID) {
      warnings.push('Missing sender identification');
    }
  }

  // Rule 4: Permission-based phrasing (for cold outreach)
  if (lane === 'cold_outreach') {
    const hasQuestion = message.includes('?');
    if (!hasQuestion) {
      warnings.push('Cold outreach should ask a question');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## Rate Limiting Strategy

```typescript
// We implement our own rate limiting before hitting SignalHouse API

interface RateLimits {
  perMinute: number;      // TPM from SignalHouse campaign
  perHour: number;        // Our internal limit
  perDay: number;         // Our internal limit
}

const LANE_RATE_LIMITS: Record<CampaignLane, RateLimits> = {
  cold_outreach: {
    perMinute: 75,        // AT&T TPM for Low Volume Mixed
    perHour: 500,         // Internal hourly cap
    perDay: 2000          // Internal daily cap
  },
  engaged_leads: {
    perMinute: 75,        // Same TPM
    perHour: 1000,        // Higher for active conversations
    perDay: 5000          // Higher for engaged leads
  }
};
```

---

## Error Handling

```typescript
// SignalHouse error response handling

interface SignalHouseError {
  status: number;
  message: string;
  code?: string;
}

const ERROR_HANDLERS: Record<number, (err: SignalHouseError) => void> = {
  400: (err) => {
    // Bad request - log and skip
    console.error(`[SignalHouse] Bad request: ${err.message}`);
  },
  401: (err) => {
    // Auth failed - alert immediately
    console.error(`[SignalHouse] AUTH FAILED - Check API key`);
  },
  429: (err) => {
    // Rate limited - backoff and retry
    const retryAfter = parseInt(err.message.match(/\d+/)?.[0] || '60');
    console.warn(`[SignalHouse] Rate limited, retry after ${retryAfter}s`);
  },
  500: (err) => {
    // Server error - retry with exponential backoff
    console.error(`[SignalHouse] Server error, will retry`);
  }
};
```

---

## Request: New Campaign Configuration

### Campaign 1: Low Volume Mixed (Cold Outreach)

```json
{
  "brandId": "BZOYPIH",
  "useCase": "LOW_VOLUME_MIXED",
  "description": "NEXTIER initiates one-to-one conversational outreach to business owners identified through professional directories and public business records. Initial messages are permission-based questions, not promotional content. All messaging is advisory in nature. Subsequent messages are only sent after recipient response. No automated marketing broadcasts.",
  "sampleMessages": [
    "{firstName} - Gianna from Nextier. Honest question: does the business run clean, or because you're everywhere all the time?",
    "{firstName}, Gianna here. One question: how much of your week goes to doing the work vs. chasing it?",
    "{firstName} - Gianna with Nextier. Got something I think you'd find interesting. Worth 2 mins of your time?",
    "Great to hear from you {firstName}. I can share more via email if you want - just drop your best address.",
    "{firstName}, Gianna here. If now's not a good time, just let me know and I'll back off. No pressure."
  ],
  "messageFlow": "Consumers provide consent through professional directories, business listings, and opt-in forms on nextier.signalhouse.io. The initial message asks a permission-based question or requests consent to continue. Subsequent messages are only sent after the consumer responds. This is one-to-one conversational outreach, not marketing broadcasts. Reply HELP for assistance, STOP to opt out at any time.",
  "optInKeywords": ["START", "SUBSCRIBE", "YES"],
  "optOutKeywords": ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
  "helpKeywords": ["HELP", "INFO"],
  "helpResponse": "NEXTIER provides advisory services for business owners. Reply STOP to opt out. Questions? Email tb@outreachglobal.io or call +1 (718) 717-5127.",
  "optOutResponse": "You've been unsubscribed from NEXTIER messages. Reply START to resubscribe.",
  "attributes": {
    "subscriberOptIn": true,
    "subscriberOptOut": true,
    "subscriberHelp": true,
    "numberPooling": false,
    "embeddedLink": false,
    "embeddedPhone": false,
    "ageGated": false,
    "directLending": false,
    "affiliateMarketing": false
  }
}
```

---

## Phone Number Assignment Request

After campaign approval, assign number to campaign:

```bash
# POST /phoneNumber/configurePhoneNumber
curl -X POST "https://api.signalhouse.io/phoneNumber/configurePhoneNumber" \
  -H "Authorization: apiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "15164079249",
    "campaignId": "NEW_CAMPAIGN_ID",
    "subGroupId": "S7ZI7S"
  }'
```

---

## Questions for SignalHouse Team

1. Can we create campaigns via API (`POST /campaign/storeForReview`) or must we use the dashboard?
2. Is there a way to get real-time campaign status updates via webhook?
3. What's the typical approval time for Low Volume Mixed campaigns?
4. Can we have multiple campaigns under the same brand with different use cases?

---

## Contact

**Technical Contact**: tb@outreachglobal.io
**Brand ID**: BZOYPIH
**Current Phone**: 15164079249
**Webhook ID**: a722540b-ef8b-4769-9ee1-c16a6555513e
