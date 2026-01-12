# Nextier Platform - Software Design Document (SDD)

## System Overview

Nextier is a Next.js 14 monorepo application deployed on DigitalOcean App Platform with PostgreSQL (Neon), Redis (Upstash), and S3-compatible storage (DO Spaces).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEXTIER ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────┐
                                 │   USERS     │
                                 │  (Browser)  │
                                 └──────┬──────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DIGITALOCEAN APP PLATFORM                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         NEXT.JS APPLICATION                          │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   PAGES      │  │  API ROUTES  │  │  WEBHOOKS    │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ • Dashboard  │  │ • /api/leads │  │ • SignalHouse│               │   │
│  │  │ • Campaigns  │  │ • /api/sms   │  │ • Stripe     │               │   │
│  │  │ • Inbox      │  │ • /api/luci  │  │ • Zoho       │               │   │
│  │  │ • Settings   │  │ • /api/neva  │  │              │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                      SERVICE LAYER                            │   │   │
│  │  │                                                               │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │   │
│  │  │  │SignalHse│ │ LUCI    │ │ Workers │ │Workflows│ │ Queue   │ │   │   │
│  │  │  │ Client  │ │ Engine  │ │ Router  │ │ Engine  │ │ Service │ │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   NEON      │      │   UPSTASH   │      │  DO SPACES  │
│ PostgreSQL  │      │    Redis    │      │  (S3)       │
│             │      │             │      │             │
│ • Leads     │      │ • Sessions  │      │ • CSV files │
│ • Messages  │      │ • Queue     │      │ • Reports   │
│ • Campaigns │      │ • Cache     │      │ • Skip data │
│ • Teams     │      │ • Rate limit│      │ • Research  │
└─────────────┘      └─────────────┘      └─────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ SIGNALHOUSE │  │ REALESTATE  │  │ PERPLEXITY  │  │   OPENAI    │        │
│  │ SMS API     │  │ API         │  │ AI          │  │   API       │        │
│  │             │  │             │  │             │  │             │        │
│  │ • Send SMS  │  │ • Skip Trace│  │ • Research  │  │ • AI Worker │        │
│  │ • Receive   │  │ • Property  │  │ • Market    │  │ • Responses │        │
│  │ • 10DLC     │  │ • Ownership │  │ • Intel     │  │ • Templates │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React 18, TypeScript | UI & SSR |
| **Styling** | Tailwind CSS, shadcn/ui | Component library |
| **State** | React Context, SWR | Client state |
| **Database** | PostgreSQL (Neon) | Primary data store |
| **ORM** | Drizzle ORM | Type-safe queries |
| **Cache** | Redis (Upstash) | Sessions, queue, rate limit |
| **Storage** | DO Spaces (S3) | Files, CSV, reports |
| **Auth** | Clerk | Authentication |
| **SMS** | SignalHouse | 10DLC messaging |
| **AI** | OpenAI, Perplexity | Response generation |
| **Hosting** | DigitalOcean App Platform | Deployment |

---

## Database Schema

### Core Tables

```sql
-- Teams (multi-tenant)
teams
├── id (uuid, PK)
├── name (varchar)
├── slug (varchar, unique)
├── ownerId (varchar)
├── settings (jsonb)
└── createdAt (timestamp)

-- Leads (contacts)
leads
├── id (uuid, PK)
├── teamId (uuid, FK → teams)
├── firstName (varchar)
├── lastName (varchar)
├── phone (varchar)
├── email (varchar)
├── company (varchar)
├── address, city, state, zipCode
├── status (enum: new, contacted, qualified, converted, lost)
├── pipelineStatus (enum: raw, ready, queued, sent, replied, booked)
├── score (int, 0-100)
├── source (varchar)
├── customFields (jsonb)
└── createdAt, updatedAt

-- Messages (SMS history)
messages
├── id (uuid, PK)
├── leadId (uuid, FK → leads)
├── teamId (uuid, FK → teams)
├── direction (enum: inbound, outbound)
├── body (text)
├── status (enum: pending, sent, delivered, failed)
├── fromNumber, toNumber (varchar)
├── signalhouseId (varchar)
├── worker (enum: gianna, cathy, sabrina)
├── sentiment (enum: positive, negative, neutral)
└── createdAt

-- Campaigns
campaigns
├── id (uuid, PK)
├── teamId (uuid, FK → teams)
├── name (varchar)
├── status (enum: draft, active, paused, completed)
├── worker (enum: gianna, cathy, sabrina)
├── templateId (varchar)
├── settings (jsonb)
├── stats (jsonb: sent, delivered, replied, positive)
└── createdAt, updatedAt
```

---

## API Structure

### Route Organization

```
apps/front/src/app/api/
├── auth/                    # Authentication
├── buckets/                 # Data lake management
│   ├── [id]/
│   │   ├── campaign/        # Push to campaign
│   │   ├── enrich/          # Skip trace
│   │   ├── leads/           # Get leads
│   │   └── push-to-leads/   # Import to leads table
│   ├── init/                # Initialize buckets
│   ├── sectors/             # Industry sectors
│   └── upload-csv/          # CSV upload
├── campaigns/               # Campaign CRUD
├── leads/                   # Lead management
├── luci/                    # LUCI data engine
│   ├── batch/               # Batch processing
│   ├── campaigns/           # Campaign generation
│   ├── orchestrate/         # Pipeline orchestration
│   ├── pipeline/            # Main pipeline (scan, enrich)
│   ├── push-to-dialer/      # Voice queue
│   └── push-to-sms/         # SMS queue
├── neva/                    # NEVA research
│   ├── research/            # Perplexity queries
│   └── validate/            # Business validation
├── sequences/               # Multi-step sequences
├── sms/                     # SMS operations
│   ├── analytics/           # Metrics
│   ├── batch/               # Batch send
│   ├── blast/               # Mass send
│   ├── conversations/       # Thread view
│   ├── queue/               # Queue management
│   └── send-template/       # Template send
├── webhook/                 # External webhooks
│   ├── signalhouse/         # SMS inbound
│   ├── stripe/              # Payments
│   └── zoho/                # CRM sync
└── workflows/               # Workflow automation
    └── execute/             # Trigger execution
```

---

## Core Services

### 1. SignalHouse Client
**Location:** `apps/front/src/lib/signalhouse/client.ts`

```typescript
interface SignalHouseClient {
  sendSMS(to: string, message: string, from?: string): Promise<SendResult>;
  getMessageStatus(messageId: string): Promise<MessageStatus>;
  listPhoneNumbers(): Promise<PhoneNumber[]>;
  getUsage(): Promise<UsageStats>;
}
```

### 2. LUCI Pipeline Engine
**Location:** `apps/front/src/app/api/luci/pipeline/route.ts`

```typescript
// Actions
POST /api/luci/pipeline { action: "scan" }     // Auto-tag businesses
POST /api/luci/pipeline { action: "enrich" }   // Skip trace owners
POST /api/luci/pipeline { action: "generate-campaigns" } // Create campaigns
```

### 3. AI Worker Router
**Location:** `apps/front/src/lib/ai-workers/worker-router.ts`

```typescript
interface WorkerRouter {
  route(lead: Lead, context: MessageContext): Worker;
  generateResponse(worker: Worker, lead: Lead, inbound: string): string;
}

// Workers
GIANNA - Initial outreach, email capture
CATHY  - Re-engagement with humor
SABRINA - Appointment booking, closing
NEVA   - Deep research (internal only)
```

### 4. Workflow Execution Engine
**Location:** `apps/front/src/app/api/workflows/execute/route.ts`

```typescript
// Triggers
"message.received" | "lead.created" | "lead.updated" | "campaign.started"

// Actions
"add_tag" | "remove_tag" | "update_status" | "send_sms" | "push_to_call_queue"
```

---

## Data Flow

### SMS Send Flow

```
1. User creates campaign
   └─▶ POST /api/campaigns

2. Leads added to queue
   └─▶ POST /api/sms/queue

3. Human reviews (pre-queue)
   └─▶ GET /api/sms/queue?status=pending

4. Approved messages sent
   └─▶ POST /api/sms/send
   └─▶ SignalHouse API
   └─▶ Lead.pipelineStatus = "sent"

5. Delivery status received
   └─▶ POST /api/webhook/signalhouse (delivery)
   └─▶ Message.status = "delivered"
```

### Inbound Response Flow

```
1. Lead replies to SMS
   └─▶ SignalHouse receives

2. Webhook triggered
   └─▶ POST /api/webhook/signalhouse

3. Message parsed
   └─▶ Extract email, phone
   └─▶ Detect sentiment
   └─▶ Lead.pipelineStatus = "replied"

4. AI Worker selected
   └─▶ WorkerRouter.route(lead, context)

5. Response generated
   └─▶ Worker.generateResponse()
   └─▶ Human review (optional)

6. Workflows triggered
   └─▶ POST /api/workflows/execute
   └─▶ { trigger: "message.received" }

7. Hot leads routed
   └─▶ If positive → Call Queue
   └─▶ Lead.pipelineStatus = "booked"
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...@neon.tech/nextier

# Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Storage
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=nextier
DO_SPACES_REGION=nyc3

# Auth
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# SMS
SIGNALHOUSE_API_KEY=...
SIGNALHOUSE_DEFAULT_FROM=+1...

# AI
OPENAI_API_KEY=...
PERPLEXITY_API_KEY=...

# Enrichment
REAL_ESTATE_API_KEY=...
```

---

## Security Model

### Authentication
- **Clerk** for user auth
- JWT tokens for API calls
- Session stored in Redis

### Authorization
- **Team-based isolation** - All queries scoped by teamId
- **Role hierarchy** - admin > member > viewer
- Middleware enforces tenant context

### Data Security
- All PII encrypted at rest (Neon)
- HTTPS only (enforced by DO)
- API rate limiting (Redis)
- TCPA compliance (opt-out handling)

---

## Deployment

### DigitalOcean App Platform

```yaml
# do-app-spec.yaml
name: nextier
services:
  - name: web
    source:
      repo: nextier/OutreachGlobal
      branch: main
    build_command: pnpm build
    run_command: pnpm start
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
    instance_size_slug: professional-xs
    instance_count: 2

databases:
  - name: db
    engine: PG
    production: true
```

### CI/CD Pipeline
1. Push to `main`
2. DigitalOcean auto-deploys
3. Build: `pnpm build`
4. Health check: `/api/admin/health`
5. Rollback on failure

---

## Monitoring

| Tool | Purpose |
|------|---------|
| DO App Platform Logs | Application logs |
| Sentry | Error tracking |
| Upstash Console | Redis metrics |
| Neon Dashboard | Database metrics |
| SignalHouse Dashboard | SMS delivery stats |

---

## Scaling Considerations

### Current Limits
- 2,000 SMS/day (10DLC default)
- 250 messages/batch
- 100 messages/minute rate limit

### Horizontal Scaling
- Stateless Next.js (scale instances)
- Redis for distributed queue
- Neon auto-scales reads

### Bottlenecks to Address
1. Skip trace API rate limits
2. AI response generation latency
3. Webhook processing spikes
