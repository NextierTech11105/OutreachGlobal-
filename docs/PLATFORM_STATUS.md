# Outreach Global Platform Documentation
## Current State & Architecture

**Last Updated**: December 2024

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Monorepo Structure](#monorepo-structure)
3. [Apps Architecture](#apps-architecture)
4. [Core System Flow](#core-system-flow)
5. [AI Agents](#ai-agents)
6. [Campaign System](#campaign-system)
7. [ID System](#id-system)
8. [Database Schema](#database-schema)
9. [Integrations](#integrations)
10. [API Routes](#api-routes)
11. [White-Label Branding](#white-label-branding)

---

## Executive Summary

Outreach Global is a **white-label B2B deal sourcing platform** with:

- **AI-powered outreach** via Gianna (SMS) and Sabrina (Email)
- **Omni-channel campaigns** (Calendar/Calling, Sequences/SMS, Blast/Instant)
- **Skip tracing enrichment** pipeline
- **Multi-tenant architecture** with full brand customization
- **Systematic execution** — 1K-2K record campaign blocks

### The Core Flow

```
USBizData (raw lists)
       ↓
    LUCI (skip trace batches of 250)
       ↓
    Build 1K-2K campaign block
       ↓
    Gianna (validate mobile/email → load templates → confirm)
       ↓
    OMNI-CHANNEL CAMPAIGN (single Signalhouse lane):
       • Calendar (calling)
       • Sequences (scheduled SMS)
       • Blast (instant SMS)
       ↓
    Gianna (24/7 inbound handling)
       ↓
    ┌─────────────┴─────────────┐
  Qualified              RETARGET NC
  Pipeline               (contextual nudge)
```

---

## Monorepo Structure

```
OutreachGlobal/
├── apps/
│   ├── api/              # NestJS backend (GraphQL + REST)
│   ├── front/            # Next.js frontend + API routes
│   └── fdaily-pro/       # Secondary Next.js app
├── packages/
│   ├── common/           # @nextier/common (shared types)
│   ├── dto/              # @nextier/dto (data transfer objects)
│   ├── tsconfig/         # Shared TypeScript configs
│   └── mcp-realestate/   # Real estate MCP integration
├── functions/            # DigitalOcean serverless functions
├── docs/                 # Platform documentation
└── scripts/              # Build & deployment scripts
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Package Manager** | pnpm v9.15.4 |
| **Monorepo** | Nx workspaces |
| **Backend** | NestJS 11 + Fastify |
| **Frontend** | Next.js 15 (App Router) |
| **Database** | PostgreSQL + Drizzle ORM |
| **Queue** | BullMQ + Redis |
| **Auth** | Clerk + JWT |
| **AI** | Anthropic Claude, OpenAI, Google Gemini |

---

## Apps Architecture

### API (`apps/api`) — Port 3001

NestJS backend with:
- GraphQL endpoint at `/graphql`
- REST controllers for integrations
- BullMQ job queues
- Drizzle ORM database access

**Key Modules:**
- `campaign/` — Campaign CRUD & execution
- `enrichment/` — Skip trace, Apollo, identity graph
- `inbox/` — Response management
- `sdr/` — AI agent configuration
- `integration/` — CRM connections
- `workflow/` — Automation builder

### Frontend (`apps/front`) — Port 3000

Next.js 15 with:
- App Router pages
- API routes for webhooks & operations
- Clerk authentication
- GraphQL client (Apollo)
- Zustand state management

**Key Directories:**
```
src/
├── app/           # Pages & API routes
├── components/    # UI components (shadcn/ui)
├── features/      # Feature modules
├── lib/           # Utilities & services
│   ├── ids/       # ID system
│   ├── signalhouse/
│   ├── gianna/
│   └── db/        # Drizzle client
├── hooks/         # React hooks
└── stores/        # Zustand stores
```

---

## Core System Flow

### 1. Data Ingestion

```
USBizData Sector Packs ($27/sector, 409K+ records)
    ↓
Upload to DO Spaces (datalake)
    ↓
Import via B2B Ingestion Service
    ↓
Create Persona records (unverified)
```

### 2. Enrichment Pipeline

```
Raw Persona
    ↓
LUCI Skip Trace (batches of 250)
    ├── Phone numbers (mobile/landline)
    ├── Email addresses
    ├── Physical addresses
    └── Social profiles
    ↓
Apollo Enrichment (optional)
    ├── Professional profiles
    ├── LinkedIn data
    └── Company info
    ↓
Twilio Lookup (phone validation)
    ↓
Identity Graph (deduplication)
    ↓
Unified Lead Card (scored, assigned)
```

### 3. Campaign Execution

```
Unified Lead Card (1K-2K block)
    ↓
Gianna validates:
    ├── Mobile fields filled
    ├── Emails verified
    └── Templates loaded
    ↓
User confirms
    ↓
OMNI-CHANNEL (single Signalhouse lane):
    ├── Calendar: Live calling
    ├── Sequences: Scheduled SMS drip
    └── Blast: Instant SMS
    ↓
Responses → Gianna (24/7 inbound)
    ↓
    ├── Qualified → Pipeline
    └── No Contact → RETARGET NC
```

### 4. Retarget (Contextual Nudge)

```
NC Threshold Hit (programmable):
    ├── Touch count (e.g., 5 touches)
    ├── Time elapsed (e.g., 14 days)
    └── All channels attempted
    ↓
Gianna builds contextual nudge:
    ├── Pulls interaction history
    ├── References prior touches
    └── New messaging angle
    ↓
NEW campaign (NEW Signalhouse lane)
```

---

## AI Agents

### LUCI — Enrichment Orchestrator

- **Role**: Skip trace execution, data validation
- **Batching**: 250 records at a time
- **Max per campaign**: 2,000 records

### Gianna — Decision Maker Agent

- **Role**: SMS outreach, inbound handling
- **Targets**: Owners, CEOs, Partners, Investors
- **Channel**: SMS (primary)
- **Priority**: High
- **Features**:
  - Campaign prep & confirmation
  - 24/7 inbound response handling
  - Contextual nudge generation
  - Meeting booking

### Sabrina — Relationship Agent

- **Role**: Email outreach, warm intros
- **Targets**: Managers, sales contacts
- **Channel**: Email (primary)
- **Priority**: Medium/Low

### Agent Assignment Logic

```typescript
Decision Makers (Owner, CEO, Partner, Investor)
  → Gianna + SMS + High Priority

Sales Managers / Sales Leads
  → Sabrina + Email + Medium Priority

Managers / General Contacts
  → Sabrina + Email + Low Priority
```

---

## Campaign System

### Campaign Types

| Type | Prefix | Description |
|------|--------|-------------|
| Parent Campaign | `camp_` | Omni-channel container |
| Calendar | `cal_` | Live calling |
| Sequence | `seq_` | Scheduled SMS drip |
| Blast | `blt_` | Instant SMS |
| Retarget | `rt_` | NC follow-up |

### Campaign Block Rules

- **Minimum**: 1,000 records
- **Maximum**: 2,000 records
- **One lane per campaign** (dedicated Signalhouse number)
- **Omni-channel**: All types in single campaign

### Campaign Lifecycle

```
DRAFT → SCHEDULED → ACTIVE → [PAUSED] → COMPLETED
```

### NC Threshold (Programmable)

| Setting | Example |
|---------|---------|
| Touch threshold | 5 touches with no reply |
| Time threshold | 14 days since first contact |
| Channel threshold | All 3 channels attempted |

---

## ID System

### Format

```
{prefix}_{ulid}

Example: persona_01HX7KDEF9A8B7C6D5E4F3G2H1
         ^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^
         prefix  ulid (26 chars, sortable)
```

### Complete Prefix Registry

```typescript
// Core Identity
user      // Platform users
team      // Organizations
persona   // Unified contact identity

// Campaign Layer
camp      // Parent omni-channel campaign
cal       // Calendar (calling)
seq       // Sequence (scheduled SMS)
blt       // Blast (instant SMS)
rt        // Retarget NC campaign

// Execution Layer
tch       // Touch (outbound attempt)
res       // Response (inbound)
conv      // Conversation thread
ndg       // Nudge (contextual retarget)

// Communication
msg       // Message content
tpl       // Template
lane      // Signalhouse number allocation

// AI/Agent
sdr       // AI SDR config
prmt      // Prompt template
act       // Gianna action

// Enrichment
stj       // Skip trace job
str       // Skip trace result
ph        // Phone
em        // Email

// Data
prop      // Property
bkt       // Bucket/saved search
sec       // Sector

// System
whk       // Webhook event
aud       // Audit log
job       // Background job
```

### Usage

```typescript
import { ids, createId, isValidId } from '@/lib/ids';

// Generate IDs
ids.persona()   // → persona_01HX7K...
ids.campaign()  // → camp_01HX7K...
ids.touch()     // → tch_01HX7K...
ids.response()  // → res_01HX7K...

// Validate
isValidId('persona_01HX7K...')  // → true
```

---

## Database Schema

### Core Tables

| Table | Prefix | Purpose |
|-------|--------|---------|
| `users` | `user_` | Platform users |
| `teams` | `team_` | Organizations |
| `personas` | `persona_` | Unified contacts |
| `campaigns` | `camp_` | Campaign definitions |
| `campaignSequences` | `cseq_` | Sequence steps |
| `messages` | `msg_` | SMS/Email content |
| `inboxItems` | `inb_` | Response inbox |
| `unifiedLeadCards` | `ulc_` | Scored leads |

### Enrichment Tables

| Table | Prefix | Purpose |
|-------|--------|---------|
| `skiptraceResults` | `strace_` | Enrichment results |
| `skiptraceJobs` | `sjob_` | Batch jobs |
| `phones` | `phone_` | Phone numbers |
| `emails` | `email_` | Email addresses |
| `addresses` | `addr_` | Physical addresses |

### Campaign Execution

| Table | Prefix | Purpose |
|-------|--------|---------|
| `campaignLeads` | — | Lead-campaign link |
| `campaignExecutions` | `cexec_` | Execution records |
| `campaignEvents` | `cevt_` | Event tracking |
| `campaignQueue` | `cq_` | Scheduled outreach |

### Multi-Tenant Isolation

All tables scoped by `teamId` — no cross-tenant data access.

---

## Integrations

### Communication

| Service | Purpose | Location |
|---------|---------|----------|
| **SignalHouse** | SMS (10DLC) | `lib/signalhouse/` |
| **Twilio** | Voice, SMS fallback | `lib/twilio/` |
| **SendGrid** | Email | `lib/mail/` |

### Enrichment

| Service | Purpose | Location |
|---------|---------|----------|
| **RealEstateAPI** | Skip trace, property | `enrichment/services/` |
| **Apollo.io** | B2B enrichment | `enrichment/services/` |
| **Twilio Lookup** | Phone validation | `enrichment/services/` |

### Payments

| Service | Purpose | Location |
|---------|---------|----------|
| **Stripe** | Subscriptions | `app/api/stripe/` |

### Admin Integrations Page

```
/admin/integrations/
├── api           # API Keys & Status
├── apollo        # Apollo Enrichment
├── realestate    # Property Lookup
├── signalhouse   # SMS (SignalHouse)
├── twilio        # Voice (Twilio)
├── sendgrid      # Email (SendGrid)
└── stripe        # Payments (Stripe)
```

---

## API Routes

### Next.js API Routes (`apps/front/src/app/api/`)

```
/api/
├── stripe/
│   ├── test/           # Test connection
│   ├── products/       # Manage products
│   └── subscriptions/  # Manage subscriptions
├── signalhouse/
│   ├── webhook/        # Inbound webhooks
│   ├── send/           # Send SMS
│   └── numbers/        # Phone numbers
├── campaigns/          # Campaign operations
├── enrichment/         # Enrichment triggers
├── leads/              # Lead operations
├── messages/           # Message handling
└── webhook/
    ├── sendgrid/       # Email webhooks
    ├── signalhouse/    # SMS webhooks
    └── twilio/         # Voice webhooks
```

### GraphQL (`/graphql`)

Key queries:
- `campaigns`, `campaign`
- `leads`, `lead`
- `messages`
- `inboxItems`
- `aiSdrAvatars`
- `workflows`

---

## White-Label Branding

### Configuration (`lib/branding.ts`)

```typescript
APP_NAME              // "OutreachGlobal"
COMPANY_NAME          // "Outreach Global"
PLATFORM_NAME         // "Outreach Global Platform"
AI_ASSISTANT_NAME     // "Gianna"
AGENTS                // { Gianna, LUCI, Cathy, Datalake }
EMAIL_SENDER_NAME     // Sender name
LOGO_URL              // Logo path
```

### Environment Variables

```bash
# Tenant: Elite Homeowner Advisors
NEXT_PUBLIC_APP_NAME=EliteHomeownerAdvisors
NEXT_PUBLIC_COMPANY_NAME=Elite Homeowner Advisors
NEXT_PUBLIC_AI_ASSISTANT_NAME=Sophia
NEXT_PUBLIC_LOGO_URL=/elite-logo.png

# Tenant: Baseline Outreach
NEXT_PUBLIC_APP_NAME=BaselineOutreach
NEXT_PUBLIC_COMPANY_NAME=Baseline Outreach
NEXT_PUBLIC_AI_ASSISTANT_NAME=Gianna
NEXT_PUBLIC_LOGO_URL=/baseline-logo.png
```

### Multi-Domain Setup

Same DO app, multiple domains:
- `app.outreachglobal.io` (main)
- `nextierglobal.io`
- `baselineoutreach.ai`

---

## Job Queues (BullMQ)

| Queue | Purpose |
|-------|---------|
| `campaign-sequence` | Sequence execution |
| `campaign` | Campaign operations |
| `b2b-ingestion` | Data ingestion |
| `skiptrace` | Enrichment |
| `lead-card` | Lead card generation |
| `integration-task` | CRM sync |

---

## Key Files Reference

### Entry Points
- API: `apps/api/src/main.ts`
- Frontend: `apps/front/src/app/`
- Database: `apps/api/src/database/schema/`

### ID System
- Library: `apps/front/src/lib/ids/index.ts`
- Docs: `docs/ID-SYSTEM-*.md`

### Branding
- Config: `apps/front/src/lib/branding.ts`

### Integrations
- SignalHouse: `apps/front/src/lib/signalhouse/`
- Stripe: `apps/front/src/app/api/stripe/`

---

## Deployment

### DigitalOcean App Platform

- **Frontend**: Next.js on DO App Platform
- **API**: NestJS on DO App Platform
- **Database**: PostgreSQL (managed)
- **Redis**: Managed Redis
- **Storage**: DO Spaces (S3-compatible)
- **Functions**: DO Functions for serverless

### Environment Variables

See `.env.example` for complete list.

---

## Summary

Outreach Global is a **systematic deal sourcing engine** with:

1. **Data Foundation** — USBizData sector packs
2. **Enrichment Pipeline** — LUCI skip trace (250 batches → 1K-2K blocks)
3. **AI Orchestration** — Gianna (prep, confirm, inbound) + Sabrina (email)
4. **Omni-Channel Campaigns** — Calendar + Sequences + Blast (single lane)
5. **Contextual Retargeting** — NC threshold → nudge with history
6. **White-Label** — Full branding customization per tenant

**Intention**: Relentlessly capture emails, send value, have valuable conversations.

---

*Documentation generated December 2024*
