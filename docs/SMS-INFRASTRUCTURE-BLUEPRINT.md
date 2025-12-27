# OutreachGlobal SMS Infrastructure Blueprint

## Complete End-to-End Multi-Tenant SMS System with SignalHouse.io

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Multi-Tenant Model](#2-multi-tenant-model)
3. [SignalHouse Integration](#3-signalhouse-integration)
4. [Phone Number Lifecycle](#4-phone-number-lifecycle)
5. [10DLC Compliance Flow](#5-10dlc-compliance-flow)
6. [Message Flow - End to End](#6-message-flow---end-to-end)
7. [Webhook Architecture](#7-webhook-architecture)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Super Admin Operations](#10-super-admin-operations)
11. [Security Model](#11-security-model)
12. [Operational SOPs](#12-operational-sops)
13. [Error Handling](#13-error-handling)
14. [Monitoring & Alerts](#14-monitoring--alerts)

---

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTREACHGLOBAL PLATFORM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Company   │    │   Company   │    │   Company   │    │   Company   │  │
│  │      A      │    │      B      │    │      C      │    │     ...     │  │
│  │  (Tenant)   │    │  (Tenant)   │    │  (Tenant)   │    │  (Tenant)   │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │         │
│         └──────────────────┼──────────────────┼──────────────────┘         │
│                            │                  │                            │
│                            ▼                  ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SHARED INFRASTRUCTURE                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  Next.js    │  │  PostgreSQL │  │   Redis     │  │  Workers   │  │   │
│  │  │  API Layer  │  │  (Neon)     │  │  (Cache)    │  │  (Jobs)    │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └────────────┘  │   │
│  └─────────┼────────────────┼──────────────────────────────────────────┘   │
│            │                │                                              │
└────────────┼────────────────┼──────────────────────────────────────────────┘
             │                │
             ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SIGNALHOUSE.IO                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Phone     │  │    SMS      │  │   10DLC     │  │     Webhooks        │ │
│  │   Numbers   │  │   Gateway   │  │  Registry   │  │  (Delivery/Inbound) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CARRIER NETWORKS                                  │
│            AT&T  ·  Verizon  ·  T-Mobile  ·  Other Carriers                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Frontend | User dashboard, admin panel | Next.js 15, React, TailwindCSS |
| API Layer | REST endpoints, auth | Next.js App Router API Routes |
| Database | Multi-tenant data storage | PostgreSQL (Neon), Drizzle ORM |
| SMS Provider | Phone numbers, messaging | SignalHouse.io |
| Auth | User authentication | Better-Auth |
| Cache | Session, rate limiting | Redis (optional) |

---

## 2. MULTI-TENANT MODEL

### Tenant Hierarchy

```
SUPER_ADMIN (Platform Owner)
    │
    ├── Company A (Team/Tenant)
    │   ├── Owner (OWNER role)
    │   ├── Admin (ADMIN role)
    │   ├── Member (MEMBER role)
    │   └── Viewer (VIEWER role)
    │
    ├── Company B (Team/Tenant)
    │   ├── Owner
    │   └── Members...
    │
    └── Company C...
```

### Data Isolation

Every piece of data is scoped to a `teamId`:

```typescript
// All queries MUST include teamId filter
const contacts = await db
  .select()
  .from(contacts)
  .where(eq(contacts.teamId, currentTeamId));

// Phone numbers belong to teams
const numbers = await db
  .select()
  .from(teamPhoneNumbers)
  .where(eq(teamPhoneNumbers.teamId, currentTeamId));

// Messages are team-scoped
const messages = await db
  .select()
  .from(smsMessages)
  .where(eq(smsMessages.teamId, currentTeamId));
```

### Team Membership States

| Status | Description |
|--------|-------------|
| PENDING | Invited but not yet accepted |
| APPROVED | Active member with access |
| REJECTED | Invitation declined |
| SUSPENDED | Temporarily disabled |

### Role Permissions

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|------------|-------|-------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Send Messages | ✅ | ✅ | ✅ | ❌ |
| Manage Contacts | ✅ | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |
| Manage Team Members | ✅ | ✅ | ❌ | ❌ |
| Manage Phone Numbers | ✅ | ✅ | ❌ | ❌ |
| Billing & Settings | ✅ | ❌ | ❌ | ❌ |
| Delete Team | ✅ | ❌ | ❌ | ❌ |

---

## 3. SIGNALHOUSE INTEGRATION

### Configuration

```env
# .env.local
SIGNALHOUSE_API_KEY=your_api_key
SIGNALHOUSE_API_URL=https://api.signalhouse.io
SIGNALHOUSE_WEBHOOK_SECRET=your_webhook_secret
```

### Client Architecture

```typescript
// lib/signalhouse/client.ts

const BASE_URL = process.env.SIGNALHOUSE_API_URL;
const API_KEY = process.env.SIGNALHOUSE_API_KEY;

// Core API wrapper
async function signalhouseRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new SignalHouseError(response.status, await response.text());
  }

  return response.json();
}
```

### Available Operations

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| Search Numbers | GET | /v1/numbers/available | Find available numbers |
| Purchase Number | POST | /v1/numbers/purchase | Buy a phone number |
| Release Number | DELETE | /v1/numbers/{id} | Release a number |
| Get Owned Numbers | GET | /v1/numbers | List your numbers |
| Send SMS | POST | /v1/messages/sms | Send outbound SMS |
| Send MMS | POST | /v1/messages/mms | Send outbound MMS |
| Create Brand | POST | /v1/10dlc/brands | Register 10DLC brand |
| Create Campaign | POST | /v1/10dlc/campaigns | Create messaging campaign |
| Attach Number | POST | /v1/10dlc/campaigns/{id}/numbers | Link number to campaign |

---

## 4. PHONE NUMBER LIFECYCLE

### State Machine

```
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    ▼                                                                 │
┌────────┐    ┌───────────┐    ┌──────────┐    ┌────────┐    ┌───────┴───┐
│AVAILABLE│───▶│PROVISIONED│───▶│CONFIGURING│───▶│ ACTIVE │───▶│ RELEASED  │
└────────┘    └───────────┘    └──────────┘    └────────┘    └───────────┘
    │              │                │               │
    │              │                │               │
    │              ▼                ▼               ▼
    │         ┌─────────┐     ┌─────────┐     ┌─────────┐
    │         │ FAILED  │     │ FAILED  │     │SUSPENDED│
    │         └─────────┘     └─────────┘     └─────────┘
    │
    └── (Still in SignalHouse inventory)
```

### Provisioning Flow

```typescript
// Step 1: Search for available numbers
const available = await searchNumbers({
  areaCode: '512',     // Austin, TX
  state: 'TX',
  numberType: 'local',
  limit: 20
});

// Step 2: Purchase from SignalHouse
const purchased = await purchaseNumber('+15125551234');

// Step 3: Store in local DB with team mapping
await db.insert(teamPhoneNumbers).values({
  id: crypto.randomUUID(),
  teamId: 'team_xxx',
  phoneNumber: '+15125551234',
  signalhouseId: purchased.numberId,
  numberType: 'local',
  status: 'provisioned',
  provisionedAt: new Date(),
});

// Step 4: Configure webhooks on SignalHouse
await configureNumber(purchased.numberId, {
  smsWebhookUrl: 'https://app.outreachglobal.io/api/webhook/signalhouse',
  voiceWebhookUrl: null,
});

// Step 5: Update status to active
await db.update(teamPhoneNumbers)
  .set({ status: 'active' })
  .where(eq(teamPhoneNumbers.id, numberDbId));
```

### Phone Number Database Schema

```sql
CREATE TABLE team_phone_numbers (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  formatted_number VARCHAR(30),
  area_code VARCHAR(10),
  signalhouse_id VARCHAR(100),
  order_id VARCHAR(100),
  number_type VARCHAR(20) DEFAULT 'local',  -- local, tollfree
  status VARCHAR(20) DEFAULT 'provisioned', -- provisioned, active, suspended, released

  -- 10DLC linking
  brand_id VARCHAR(100),
  campaign_id VARCHAR(100),
  ten_dlc_status VARCHAR(20),  -- PENDING, APPROVED, REJECTED

  -- Capabilities
  capabilities JSONB DEFAULT '{"sms": true, "mms": false, "voice": false}',

  -- Assignment
  assigned_to UUID REFERENCES team_members(id),
  is_primary BOOLEAN DEFAULT false,

  -- Usage tracking
  sms_count INTEGER DEFAULT 0,
  mms_count INTEGER DEFAULT 0,
  voice_minutes INTEGER DEFAULT 0,

  -- Timestamps
  provisioned_at TIMESTAMP,
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. 10DLC COMPLIANCE FLOW

### What is 10DLC?

10DLC (10-Digit Long Code) is a US carrier requirement for A2P (Application-to-Person) messaging. All business SMS must be registered.

### Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          10DLC REGISTRATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: BRAND REGISTRATION                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Company submits:                                                    │   │
│  │  • Legal business name                                               │   │
│  │  • EIN (Tax ID)                                                      │   │
│  │  • Business address                                                  │   │
│  │  • Website                                                           │   │
│  │  • Contact info                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  Step 2: BRAND VETTING (1-7 days)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TCR (The Campaign Registry) verifies:                               │   │
│  │  • Business legitimacy                                               │   │
│  │  • Tax ID validity                                                   │   │
│  │  • Website content                                                   │   │
│  │  Result: Trust Score (LOW / MEDIUM / HIGH)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  Step 3: CAMPAIGN CREATION                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Define messaging use case:                                          │   │
│  │  • Use case type (Marketing, Notifications, etc.)                    │   │
│  │  • Sample messages (2-5 examples)                                    │   │
│  │  • Opt-in description                                                │   │
│  │  • Opt-out keywords (STOP, CANCEL, etc.)                             │   │
│  │  • Help keywords (HELP, INFO)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  Step 4: CAMPAIGN APPROVAL (1-3 days)                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Carriers review:                                                    │   │
│  │  • Content compliance                                                │   │
│  │  • Consent mechanisms                                                │   │
│  │  Result: APPROVED or REJECTED with reason                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  Step 5: NUMBER ATTACHMENT                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Link phone numbers to approved campaign                             │   │
│  │  Numbers inherit campaign's throughput limits                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trust Score Throughput Limits

| Trust Score | Daily SMS Limit | SMS per Second |
|-------------|-----------------|----------------|
| LOW | 2,000 | 0.2 |
| MEDIUM | 10,000 | 1 |
| HIGH | 200,000+ | 10+ |

### Database Schema for 10DLC

```sql
-- Brand registration
CREATE TABLE signalhouse_brands (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id),
  signalhouse_brand_id VARCHAR(100),

  -- Business info
  legal_name VARCHAR(255) NOT NULL,
  dba_name VARCHAR(255),
  ein VARCHAR(20),

  -- Contact
  address JSONB,
  website VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),

  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  trust_score VARCHAR(20),                -- LOW, MEDIUM, HIGH
  vetting_score INTEGER,

  -- Timestamps
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Campaign registration
CREATE TABLE signalhouse_campaigns (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id),
  brand_id UUID REFERENCES signalhouse_brands(id),
  signalhouse_campaign_id VARCHAR(100),

  -- Campaign details
  name VARCHAR(255) NOT NULL,
  use_case VARCHAR(50) NOT NULL,        -- MARKETING, NOTIFICATIONS, etc.
  description TEXT,
  sample_messages JSONB,                 -- Array of sample messages

  -- Compliance
  opt_in_description TEXT,
  opt_out_keywords TEXT[] DEFAULT ARRAY['STOP', 'CANCEL', 'UNSUBSCRIBE'],
  help_keywords TEXT[] DEFAULT ARRAY['HELP', 'INFO'],

  -- Status & limits
  status VARCHAR(20) DEFAULT 'PENDING',
  daily_limit INTEGER,
  throughput DECIMAL(5,2),

  -- Timestamps
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. MESSAGE FLOW - END TO END

### Outbound SMS Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTBOUND SMS FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Action                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  User clicks "Send" in UI                                           │   │
│  │  Message: "Hi John, your appointment is tomorrow at 2pm"            │   │
│  │  To: +15125559876                                                    │   │
│  │  From: +15125551234 (team's number)                                  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  API Layer                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/messages/send                                             │   │
│  │                                                                      │   │
│  │  1. Validate auth & team membership                                  │   │
│  │  2. Verify phone number belongs to team                              │   │
│  │  3. Check 10DLC campaign status                                      │   │
│  │  4. Rate limit check                                                 │   │
│  │  5. Validate recipient (not opted out)                               │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Database Insert                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  INSERT INTO sms_messages (                                          │   │
│  │    id, team_id, from_number, to_number, body, direction, status      │   │
│  │  ) VALUES (                                                          │   │
│  │    'msg_xxx', 'team_xxx', '+15125551234', '+15125559876',            │   │
│  │    'Hi John...', 'outbound', 'queued'                                │   │
│  │  );                                                                  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  SignalHouse API Call                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST https://api.signalhouse.io/v1/messages/sms                     │   │
│  │  {                                                                   │   │
│  │    "from": "+15125551234",                                           │   │
│  │    "to": "+15125559876",                                             │   │
│  │    "body": "Hi John, your appointment is tomorrow at 2pm"           │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  │  Response: { "messageId": "sh_msg_xxx", "status": "queued" }        │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Update Message Record                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  UPDATE sms_messages SET                                             │   │
│  │    signalhouse_message_id = 'sh_msg_xxx',                            │   │
│  │    status = 'sent',                                                  │   │
│  │    sent_at = NOW()                                                   │   │
│  │  WHERE id = 'msg_xxx';                                               │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Async: Delivery Webhook                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SignalHouse sends webhook when carrier confirms delivery            │   │
│  │  POST /api/webhook/signalhouse                                       │   │
│  │  {                                                                   │   │
│  │    "event": "message.delivered",                                     │   │
│  │    "messageId": "sh_msg_xxx",                                        │   │
│  │    "status": "delivered",                                            │   │
│  │    "deliveredAt": "2025-01-15T14:30:00Z"                            │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  │  UPDATE sms_messages SET status = 'delivered' WHERE...              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Inbound SMS Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INBOUND SMS FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Contact sends SMS to your number                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  From: +15125559876 (Contact's phone)                                │   │
│  │  To: +15125551234 (Your team's number)                               │   │
│  │  Message: "Yes, I'll be there!"                                      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Carrier → SignalHouse                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Carrier network delivers to SignalHouse                             │   │
│  │  SignalHouse looks up webhook URL for +15125551234                   │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Webhook Received                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/webhook/signalhouse                                       │   │
│  │  Headers:                                                            │   │
│  │    X-SignalHouse-Signature: sha256=xxx                               │   │
│  │  Body:                                                               │   │
│  │  {                                                                   │   │
│  │    "event": "message.received",                                      │   │
│  │    "from": "+15125559876",                                           │   │
│  │    "to": "+15125551234",                                             │   │
│  │    "body": "Yes, I'll be there!",                                    │   │
│  │    "receivedAt": "2025-01-15T14:32:00Z"                             │   │
│  │  }                                                                   │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Webhook Processing                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Verify webhook signature (security)                              │   │
│  │  2. Look up phone number → get teamId                                │   │
│  │  3. Look up or create contact by phone number                        │   │
│  │  4. Check for opt-out keywords (STOP, CANCEL)                        │   │
│  │  5. Store message in database                                        │   │
│  │  6. Trigger any automation/AI response                               │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Database Insert                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  INSERT INTO sms_messages (                                          │   │
│  │    id, team_id, contact_id, from_number, to_number,                  │   │
│  │    body, direction, status                                           │   │
│  │  ) VALUES (                                                          │   │
│  │    'msg_yyy', 'team_xxx', 'contact_xxx', '+15125559876',            │   │
│  │    '+15125551234', 'Yes, I''ll be there!', 'inbound', 'received'    │   │
│  │  );                                                                  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  Optional: AI Response                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  If AI SDR mode is enabled for this contact:                         │   │
│  │  1. Send message to AI for response generation                       │   │
│  │  2. Queue AI-generated response                                      │   │
│  │  3. Human review (if configured)                                     │   │
│  │  4. Send response                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Message Status Lifecycle

```
Outbound:
  queued → sending → sent → delivered
                       └──→ failed (with error code)
                       └──→ undelivered

Inbound:
  received → processed
         └──→ opted_out (if STOP keyword)
```

---

## 7. WEBHOOK ARCHITECTURE

### Webhook Endpoint

```typescript
// app/api/webhook/signalhouse/route.ts

export async function POST(request: NextRequest) {
  // 1. Verify webhook signature
  const signature = request.headers.get('x-signalhouse-signature');
  const body = await request.text();

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // 2. Route by event type
  switch (payload.event) {
    case 'message.received':
      await handleInboundMessage(payload);
      break;

    case 'message.delivered':
    case 'message.failed':
    case 'message.undelivered':
      await handleDeliveryStatus(payload);
      break;

    case 'number.status_changed':
      await handleNumberStatusChange(payload);
      break;

    case 'campaign.status_changed':
      await handle10DLCStatusChange(payload);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Webhook Events Reference

| Event | Description | Action |
|-------|-------------|--------|
| `message.received` | Inbound SMS received | Store message, trigger automations |
| `message.delivered` | Outbound confirmed delivered | Update status to 'delivered' |
| `message.failed` | Carrier rejected message | Update status, log error |
| `message.undelivered` | Could not be delivered | Update status, maybe retry |
| `number.status_changed` | Phone number status update | Sync local status |
| `campaign.approved` | 10DLC campaign approved | Enable messaging |
| `campaign.rejected` | 10DLC campaign rejected | Notify admin |

### Signature Verification

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', process.env.SIGNALHOUSE_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

---

## 8. DATABASE SCHEMA

### Core Tables

```sql
-- Users (handled by Better-Auth)
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  role VARCHAR(20) DEFAULT 'USER',  -- USER, SUPER_ADMIN
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams (Tenants/Companies)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id VARCHAR(50) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team Membership
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',  -- OWNER, ADMIN, MEMBER, VIEWER
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, SUSPENDED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team Settings (key-value store)
CREATE TABLE team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, name)
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),

  -- Consent tracking
  sms_opt_in BOOLEAN DEFAULT true,
  sms_opt_in_at TIMESTAMP,
  sms_opt_out_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, opted_out, invalid

  -- Custom fields
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, phone)
);

-- SMS Messages
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  contact_id UUID REFERENCES contacts(id),

  -- Message details
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,

  -- Direction & status
  direction VARCHAR(10) NOT NULL,  -- inbound, outbound
  status VARCHAR(20) NOT NULL DEFAULT 'queued',

  -- SignalHouse reference
  signalhouse_message_id VARCHAR(100),

  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,

  -- Segments (for billing)
  segment_count INTEGER DEFAULT 1,

  -- Timestamps
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Phone Numbers (already defined above)
-- 10DLC Brands (already defined above)
-- 10DLC Campaigns (already defined above)

-- Admin Audit Logs
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR(50) NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL,
  target_type VARCHAR(20),
  target_id VARCHAR(100),
  target_name VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_contacts_team_id ON contacts(team_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_sms_messages_team_id ON sms_messages(team_id);
CREATE INDEX idx_sms_messages_contact_id ON sms_messages(contact_id);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at);
CREATE INDEX idx_team_phone_numbers_team_id ON team_phone_numbers(team_id);
CREATE INDEX idx_team_phone_numbers_phone ON team_phone_numbers(phone_number);
```

---

## 9. API ENDPOINTS

### Public Team APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/send` | POST | Send SMS/MMS |
| `/api/messages` | GET | List messages (paginated) |
| `/api/messages/[id]` | GET | Get single message |
| `/api/contacts` | GET/POST | List/Create contacts |
| `/api/contacts/[id]` | GET/PATCH/DELETE | Manage contact |
| `/api/contacts/import` | POST | Bulk import contacts |
| `/api/phone-numbers` | GET | List team's phone numbers |
| `/api/conversations` | GET | List conversations |
| `/api/conversations/[id]` | GET | Get conversation thread |

### Admin APIs (SUPER_ADMIN only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/companies` | GET/POST | List/Create companies |
| `/api/admin/companies/[id]` | GET/PATCH/DELETE | Manage company |
| `/api/admin/users` | GET/POST/PATCH/DELETE | Manage all users |
| `/api/admin/phone-numbers` | GET/POST/DELETE | Manage all numbers |
| `/api/admin/impersonate` | GET/POST/DELETE | Impersonation |
| `/api/admin/audit-logs` | GET | View audit trail |

### Webhook Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook/signalhouse` | POST | SignalHouse webhooks |

---

## 10. SUPER ADMIN OPERATIONS

### Impersonation Flow

```typescript
// Start impersonation
POST /api/admin/impersonate
{
  "targetUserId": "user_xxx",
  "targetTeamId": "team_xxx"
}

// Response sets cookies:
// - nextier_impersonation (context, readable by client)
// - nextier_original_session (original token, httpOnly)

// While impersonating:
// - UI shows warning banner
// - All actions logged to audit trail
// - Auto-expires after 4 hours

// Exit impersonation
DELETE /api/admin/impersonate
// Restores original session
```

### Audit Logging

All super admin actions are logged:

```typescript
await logAdminAction({
  adminId: admin.userId,
  adminEmail: admin.email,
  action: 'company.create',
  category: 'company',
  targetType: 'team',
  targetId: newTeamId,
  targetName: 'Acme Corp',
  details: { slug: 'acme-corp', ownerId: 'user_xxx' },
  request  // For IP and user agent
});
```

### Audit Action Types

| Category | Actions |
|----------|---------|
| company | create, update, delete |
| user | add_to_team, remove_from_team, change_role, promote_super_admin, demote_super_admin |
| impersonate | start, end |
| settings | update |
| data | clear, export, import |

---

## 11. SECURITY MODEL

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User signs in via Better-Auth (OAuth or email/password)    │
│  2. Session token stored in httpOnly cookie                     │
│  3. Each API request:                                           │
│     a. Validate session token                                   │
│     b. Load user from database                                  │
│     c. Check team membership for requested team                 │
│     d. Verify role permissions                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Authorization Layers

```typescript
// Layer 1: Authentication
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user) {
  return unauthorized();
}

// Layer 2: Team Membership
const membership = await db.query.teamMembers.findFirst({
  where: and(
    eq(teamMembers.teamId, teamId),
    eq(teamMembers.userId, session.user.id),
    eq(teamMembers.status, 'APPROVED')
  )
});
if (!membership) {
  return forbidden();
}

// Layer 3: Role Check
if (!hasPermission(membership.role, 'manage_team')) {
  return forbidden();
}

// Layer 4: Super Admin Check (for admin routes)
if (session.user.role !== 'SUPER_ADMIN') {
  return forbidden();
}
```

### Data Isolation

```typescript
// EVERY query MUST include team filter
// Bad:
const contacts = await db.select().from(contacts);  // ❌ NEVER

// Good:
const contacts = await db.select().from(contacts)
  .where(eq(contacts.teamId, currentTeamId));  // ✅ ALWAYS
```

### Webhook Security

```typescript
// Always verify webhook signatures
if (!verifyWebhookSignature(rawBody, signatureHeader)) {
  console.error('[Webhook] Invalid signature - possible attack');
  return new Response('Invalid signature', { status: 401 });
}
```

---

## 12. OPERATIONAL SOPs

### SOP-1: Adding a New Company

```
PROCEDURE: Create New Company/Tenant

PRE-REQUISITES:
- Super admin access
- Company owner's email (must have existing user account)

STEPS:
1. Navigate to Admin → Companies
2. Click "Add Company"
3. Enter:
   - Company Name: e.g., "Acme Corporation"
   - Slug: e.g., "acme-corp" (URL-safe, unique)
   - Owner Email: e.g., "owner@acme.com"
4. Click "Create"
5. System automatically:
   - Creates team record
   - Adds owner as team member with OWNER role
   - Creates default team settings
6. Verify in audit log

POST-ACTIONS:
- Notify owner via email
- Provide onboarding guide
- Schedule 10DLC registration
```

### SOP-2: Provisioning Phone Numbers

```
PROCEDURE: Provision Phone Number for Team

PRE-REQUISITES:
- Active team
- 10DLC campaign approved (or toll-free)
- Payment method on file

STEPS:
1. Navigate to Admin → Phone Numbers
2. Click "Search Available Numbers"
3. Enter search criteria:
   - Area Code: e.g., "512"
   - State: e.g., "TX"
   - Type: Local or Toll-Free
4. Select desired number from results
5. Choose target team
6. Click "Purchase & Assign"
7. System automatically:
   - Purchases from SignalHouse
   - Configures webhook URLs
   - Links to team's 10DLC campaign
   - Stores in database
8. Wait for status = "active"

VERIFICATION:
- Send test message to personal phone
- Verify inbound delivery
```

### SOP-3: 10DLC Registration

```
PROCEDURE: Register Company for 10DLC

PRE-REQUISITES:
- Active team
- Company legal information:
  - Legal business name
  - EIN (Tax ID)
  - Business address
  - Website URL
  - Contact information

STEPS:
1. Navigate to Team Settings → 10DLC
2. Click "Register Brand"
3. Enter business information
4. Submit for vetting (1-7 days)
5. Once brand approved:
   - Click "Create Campaign"
   - Select use case type
   - Provide sample messages (2-5)
   - Describe opt-in process
   - Submit for carrier approval
6. Once campaign approved:
   - Link phone numbers to campaign
   - Verify throughput limits
   - Begin messaging

NOTES:
- Higher trust scores = higher throughput
- Political/cannabis require special registration
- Keep sample messages updated
```

### SOP-4: Handling Opt-Outs

```
PROCEDURE: Process Opt-Out Request

AUTOMATIC HANDLING (Webhook):
1. Contact texts "STOP" to team number
2. Webhook receives message
3. System detects opt-out keyword
4. Automatic actions:
   - Set contact.sms_opt_in = false
   - Set contact.sms_opt_out_at = NOW()
   - Send confirmation: "You have been unsubscribed..."
   - Block future outbound messages

MANUAL HANDLING:
1. If contact requests opt-out via other channel:
   - Navigate to contact record
   - Click "Opt Out"
   - Select reason
   - Confirm

COMPLIANCE NOTE:
- TCPA requires honoring opt-outs within 10 business days
- We process immediately (best practice)
- Never send messages to opted-out contacts
```

### SOP-5: Troubleshooting Failed Messages

```
PROCEDURE: Diagnose Message Delivery Failure

COMMON ERROR CODES:
| Code | Meaning | Resolution |
|------|---------|------------|
| 30001 | Queue overflow | Rate limit, retry later |
| 30003 | Unreachable | Invalid number, remove contact |
| 30004 | Message blocked | Content filtered, revise |
| 30005 | Unknown destination | Invalid format, verify number |
| 30006 | Landline | Number is landline, use voice |
| 30007 | Carrier violation | TCPA/spam, check content |
| 30008 | Unknown error | Contact support |

DIAGNOSIS STEPS:
1. Check message status in database
2. Review error_code and error_message
3. Check SignalHouse dashboard for details
4. Verify:
   - Phone number format (+1XXXXXXXXXX)
   - 10DLC campaign status
   - Contact opt-in status
   - Message content compliance
5. If pattern of failures:
   - Check carrier block lists
   - Review message content
   - Verify 10DLC registration
```

---

## 13. ERROR HANDLING

### Error Response Format

```typescript
// Consistent error response structure
interface ErrorResponse {
  error: string;           // Human-readable message
  code?: string;           // Machine-readable code
  details?: any;           // Additional context
  requestId?: string;      // For support reference
}

// Example responses:
{ "error": "Phone number not found", "code": "NUMBER_NOT_FOUND" }
{ "error": "Rate limit exceeded", "code": "RATE_LIMITED", "details": { "retryAfter": 60 } }
{ "error": "Invalid message content", "code": "CONTENT_VIOLATION", "details": { "keyword": "free" } }
```

### Retry Strategy

```typescript
// For transient failures, implement exponential backoff
async function sendWithRetry(message: Message, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await sendMessage(message);
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(Math.pow(2, attempt) * 1000);  // 2s, 4s, 8s
    }
  }
}

function isRetryable(error: Error): boolean {
  const retryableCodes = ['30001', 'RATE_LIMITED', 'TIMEOUT'];
  return retryableCodes.includes(error.code);
}
```

---

## 14. MONITORING & ALERTS

### Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Message delivery rate | < 95% | Critical |
| Webhook processing time | > 5s | Warning |
| Failed messages (hourly) | > 100 | Warning |
| Opt-out rate | > 5% | Review |
| API error rate | > 1% | Warning |
| 10DLC campaign rejections | Any | Immediate |

### Logging Best Practices

```typescript
// Structured logging for observability
console.log(JSON.stringify({
  level: 'info',
  event: 'message.sent',
  teamId: 'team_xxx',
  messageId: 'msg_xxx',
  to: '+1512555****',  // Masked for privacy
  segments: 1,
  duration: 234  // ms
}));

// Error logging with context
console.error(JSON.stringify({
  level: 'error',
  event: 'message.failed',
  teamId: 'team_xxx',
  messageId: 'msg_xxx',
  errorCode: '30007',
  errorMessage: 'Carrier blocked',
  stack: error.stack
}));
```

### Health Check Endpoint

```typescript
// GET /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    signalhouse: await checkSignalHouse(),
    redis: await checkRedis(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }, { status: healthy ? 200 : 503 });
}
```

---

## QUICK REFERENCE

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://app.outreachglobal.io

# SignalHouse
SIGNALHOUSE_API_KEY=...
SIGNALHOUSE_API_URL=https://api.signalhouse.io
SIGNALHOUSE_WEBHOOK_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://app.outreachglobal.io
```

### Common Commands

```bash
# Database
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
pnpm db:migrate       # Run migrations

# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # Run linter

# Deployment
git push origin main  # Triggers DigitalOcean deploy
```

### Support Contacts

- SignalHouse Support: support@signalhouse.io
- Platform Admin: admin@outreachglobal.io

---

## 15. WHITE-LABEL ARCHITECTURE

### Why This Model is Perfect for White-Labeling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WHITE-LABEL ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR PLATFORM (OutreachGlobal)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SUPER ADMIN (You)                                │   │
│  │           Controls everything, sees all tenants                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│        ┌─────────────────────┼─────────────────────┐                       │
│        │                     │                     │                       │
│        ▼                     ▼                     ▼                       │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│  │  RESELLER A   │    │  RESELLER B   │    │ DIRECT CLIENT │              │
│  │  "BrandX SMS" │    │ "AcmeComm.io" │    │ "MyCompany"   │              │
│  │               │    │               │    │               │              │
│  │  ┌─────────┐  │    │  ┌─────────┐  │    │  (No sub-    │              │
│  │  │Client 1 │  │    │  │Client 1 │  │    │   tenants)   │              │
│  │  │Client 2 │  │    │  │Client 2 │  │    │               │              │
│  │  │Client 3 │  │    │  │...      │  │    │               │              │
│  │  └─────────┘  │    │  └─────────┘  │    │               │              │
│  └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                             │
│  Each reseller can have:                                                    │
│  • Custom domain (brandx.io, acmecomm.io)                                  │
│  • Custom branding (logo, colors, fonts)                                   │
│  • Hidden features they don't pay for                                      │
│  • Their own sub-clients (if enabled)                                      │
│  • Custom pricing for their clients                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Per-Tenant Customization Options

```sql
-- Team settings for white-label customization
INSERT INTO team_settings (team_id, name, value) VALUES
  -- Branding
  ('team_xxx', 'brand_name', 'AcmeComm'),
  ('team_xxx', 'brand_logo_url', 'https://...'),
  ('team_xxx', 'brand_favicon', 'https://...'),
  ('team_xxx', 'brand_primary_color', '#FF5722'),
  ('team_xxx', 'brand_secondary_color', '#2196F3'),

  -- Custom Domain
  ('team_xxx', 'custom_domain', 'app.acmecomm.io'),
  ('team_xxx', 'custom_domain_verified', 'true'),

  -- Feature Flags (hide/show features)
  ('team_xxx', 'feature_ai_sdr', 'true'),
  ('team_xxx', 'feature_voice_calls', 'false'),
  ('team_xxx', 'feature_mms', 'true'),
  ('team_xxx', 'feature_analytics_advanced', 'false'),
  ('team_xxx', 'feature_api_access', 'true'),
  ('team_xxx', 'feature_white_label_sub_accounts', 'true'),

  -- Limits
  ('team_xxx', 'limit_phone_numbers', '10'),
  ('team_xxx', 'limit_contacts', '50000'),
  ('team_xxx', 'limit_messages_monthly', '100000'),
  ('team_xxx', 'limit_team_members', '25'),

  -- White-label tier
  ('team_xxx', 'plan_tier', 'reseller'),  -- basic, pro, reseller, enterprise
  ('team_xxx', 'can_create_sub_accounts', 'true'),
  ('team_xxx', 'hide_powered_by', 'true');
```

### Feature Flag System

```typescript
// lib/features.ts

export type FeatureFlag =
  | 'ai_sdr'
  | 'voice_calls'
  | 'mms'
  | 'analytics_advanced'
  | 'api_access'
  | 'white_label_sub_accounts'
  | 'custom_domain'
  | 'remove_branding';

export async function hasFeature(
  teamId: string,
  feature: FeatureFlag
): Promise<boolean> {
  const setting = await db.query.teamSettings.findFirst({
    where: and(
      eq(teamSettings.teamId, teamId),
      eq(teamSettings.name, `feature_${feature}`)
    )
  });

  return setting?.value === 'true';
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const { teamId } = await getAuthContext();

  // Check feature access before allowing operation
  if (!(await hasFeature(teamId, 'ai_sdr'))) {
    return NextResponse.json(
      { error: 'AI SDR is not enabled for your plan' },
      { status: 403 }
    );
  }

  // Proceed with AI SDR logic...
}
```

### UI Component Feature Gating

```tsx
// components/FeatureGate.tsx

interface FeatureGateProps {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { features } = useTeamContext();

  if (!features[feature]) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Usage in pages
export function Dashboard() {
  return (
    <div>
      <StandardMetrics />

      <FeatureGate feature="analytics_advanced">
        <AdvancedAnalyticsPanel />
      </FeatureGate>

      <FeatureGate feature="ai_sdr">
        <AiSdrDashboard />
      </FeatureGate>

      <FeatureGate feature="voice_calls">
        <VoiceCallsWidget />
      </FeatureGate>
    </div>
  );
}
```

### Custom Domain Support

```typescript
// middleware.ts - Route by custom domain

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Skip for main domain
  if (hostname === 'app.outreachglobal.io') {
    return NextResponse.next();
  }

  // Look up custom domain
  const team = await getTeamByCustomDomain(hostname);

  if (team) {
    // Inject team context into headers
    const response = NextResponse.next();
    response.headers.set('x-team-id', team.id);
    response.headers.set('x-team-slug', team.slug);
    response.headers.set('x-brand-name', team.settings.brand_name);
    return response;
  }

  // Unknown domain
  return NextResponse.redirect('https://outreachglobal.io');
}
```

### Dynamic Branding

```tsx
// components/BrandProvider.tsx

interface BrandContext {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  hidePoweredBy: boolean;
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { team } = useTeamContext();

  const brand: BrandContext = {
    name: team.settings.brand_name || 'OutreachGlobal',
    logo: team.settings.brand_logo_url || '/logo.svg',
    primaryColor: team.settings.brand_primary_color || '#6366f1',
    secondaryColor: team.settings.brand_secondary_color || '#8b5cf6',
    hidePoweredBy: team.settings.hide_powered_by === 'true',
  };

  // Inject CSS variables for dynamic theming
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', brand.primaryColor);
    document.documentElement.style.setProperty('--secondary', brand.secondaryColor);
  }, [brand]);

  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  );
}

// Footer component respects white-label settings
export function Footer() {
  const { hidePoweredBy } = useBrand();

  return (
    <footer>
      {!hidePoweredBy && (
        <p className="text-xs text-muted">
          Powered by OutreachGlobal
        </p>
      )}
    </footer>
  );
}
```

### Reseller Hierarchy (Sub-Accounts)

```
SUPER_ADMIN (Platform Owner - OutreachGlobal)
    │
    ├── RESELLER (Agency/Partner)
    │   │   role: OWNER
    │   │   plan: reseller
    │   │   can_create_sub_accounts: true
    │   │
    │   ├── Sub-Account 1 (Reseller's Client)
    │   │   parent_team_id: reseller_team_id
    │   │   billing: through reseller
    │   │
    │   ├── Sub-Account 2
    │   └── Sub-Account 3
    │
    └── DIRECT CLIENT
        role: OWNER
        plan: pro
        can_create_sub_accounts: false
```

```sql
-- Add parent relationship for reseller hierarchy
ALTER TABLE teams ADD COLUMN parent_team_id UUID REFERENCES teams(id);
ALTER TABLE teams ADD COLUMN is_reseller BOOLEAN DEFAULT false;

-- Sub-accounts inherit some settings from parent
CREATE VIEW team_effective_settings AS
SELECT
  t.id as team_id,
  COALESCE(ts.value, pts.value) as value,
  ts.name
FROM teams t
LEFT JOIN team_settings ts ON ts.team_id = t.id
LEFT JOIN team_settings pts ON pts.team_id = t.parent_team_id
  AND pts.name = ts.name;
```

### White-Label Pricing Tiers

| Feature | Basic | Pro | Reseller | Enterprise |
|---------|-------|-----|----------|------------|
| Custom Branding | ❌ | ✅ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ✅ | ✅ |
| Remove "Powered By" | ❌ | ❌ | ✅ | ✅ |
| Sub-Accounts | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ |
| AI SDR | ❌ | ✅ | ✅ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ | ✅ |
| Phone Numbers | 2 | 10 | 50 | Unlimited |
| Contacts | 1,000 | 25,000 | 100,000 | Unlimited |
| Team Members | 3 | 10 | 50 | Unlimited |
| Monthly Messages | 5,000 | 50,000 | 500,000 | Unlimited |

### Complete White-Label Checklist

```
□ Custom domain configured (DNS CNAME → app.outreachglobal.io)
□ SSL certificate provisioned (via DigitalOcean/Cloudflare)
□ Brand logo uploaded (SVG recommended)
□ Brand colors configured
□ Favicon set
□ "Powered by" removed (reseller+ tier)
□ Email templates customized
□ Help docs URL set (or hidden)
□ Support email configured
□ Feature flags configured per plan
□ Usage limits set
□ Sub-account creation enabled (if reseller)
```

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Author:** OutreachGlobal Engineering
