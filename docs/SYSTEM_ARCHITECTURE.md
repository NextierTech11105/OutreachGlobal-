# NEXTIER System Architecture

> **Version**: 2.0.0
> **Date**: January 16, 2026
> **Status**: Production Ready

---

## Platform Overview

NEXTIER is an enterprise B2B outreach platform that orchestrates AI-powered conversations across SMS, email, and voice channels. The platform leverages best-in-class infrastructure partners for carrier-grade reliability while focusing on intelligent automation and compliance.

```mermaid
flowchart TB
    subgraph "NEXTIER Platform"
        direction TB
        UI[Next.js 14<br/>App Router]
        API[NestJS<br/>GraphQL API]
        DB[(PostgreSQL<br/>Drizzle ORM)]
        WORKERS[AI Workers<br/>GIANNA, CATHY, SABRINA]
    end

    subgraph "Infrastructure Partners"
        SH[SignalHouse<br/>10DLC SMS]
        TRESTLE[Trestle<br/>Real Contact API]
        SKIP[Skip Trace<br/>Mobile Discovery]
        OPENAI[OpenAI<br/>GPT-4o-mini]
        PERPLEXITY[Perplexity<br/>Research]
    end

    subgraph "Channels"
        SMS[SMS<br/>10DLC Compliant]
        EMAIL[Email<br/>SendGrid]
        VOICE[Voice<br/>Twilio]
    end

    UI --> API
    API --> DB
    API --> WORKERS
    WORKERS --> SH
    WORKERS --> TRESTLE
    WORKERS --> SKIP
    WORKERS --> OPENAI
    SH --> SMS
```

---

## Infrastructure Partners (Enterprise Lifting)

### SignalHouse - 10DLC SMS Infrastructure

**What they provide:**
- Carrier-grade 10DLC registration
- Multi-carrier delivery (AT&T, T-Mobile, Verizon, US Cellular)
- Real-time delivery webhooks
- Opt-out management
- Compliance tooling

**Our configuration:**
| Setting | Value |
|---------|-------|
| Brand ID | BZOYPIH - NEXTIER |
| Campaigns | CJRCU60, CW7I6X5 (LOW_VOLUME) |
| Phone | +1 516-407-9249 |
| AT&T TPM | 75 SMS/min |
| Webhook | `/api/webhook/signalhouse` |

```mermaid
flowchart LR
    NEXTIER[NEXTIER App] --> SH[SignalHouse API]
    SH --> CARRIERS[Carrier Network]
    CARRIERS --> RECIPIENT[Business Owner]
    RECIPIENT --> WEBHOOK[Inbound Webhook]
    WEBHOOK --> NEXTIER
```

---

### Trestle - Real Contact API (Contactability Engine)

**What they provide:**
- Phone validation and activity scoring (0-100)
- Contact grading (A-F)
- TCPA litigator risk detection
- Email deliverability checks
- Address verification

**Our usage:**
| API | Purpose | Cost |
|-----|---------|------|
| Real Contact | Phone + email validation | $0.03/query |
| Litigator Checks | TCPA compliance | Included |
| Email Checks | Deliverability + age | Included |
| Phone Feedback | Improve model accuracy | Free |

```mermaid
flowchart TB
    subgraph "Contactability Scoring"
        LEAD[Lead Data]
        TRESTLE[Trestle API]
        SCORE[Scoring Engine]
    end

    subgraph "Risk Tiers"
        SAFE[SAFE<br/>70+ Score]
        ELEVATED[ELEVATED<br/>30-69 Score]
        HIGH[HIGH<br/>1-29 Score]
        BLOCK[BLOCK<br/>Litigator/DNC]
    end

    LEAD --> TRESTLE
    TRESTLE --> SCORE
    SCORE --> SAFE
    SCORE --> ELEVATED
    SCORE --> HIGH
    SCORE --> BLOCK
```

---

### Skip Trace - Mobile Discovery

**What they provide:**
- Mobile phone number discovery from name + address
- Carrier lookup
- Line type identification (mobile vs landline)

**Our usage:**
| Service | Purpose | Cost |
|---------|---------|------|
| Skip Trace | Find mobile numbers | $0.02/lead |

---

### OpenAI - AI Classification & Response

**What they provide:**
- GPT-4o-mini for message classification
- Response generation with guardrails
- Intent detection

**Our usage:**
| Task | Model | Cost |
|------|-------|------|
| SMS Classification | gpt-4o-mini | $0.00015/1K tokens |
| Response Suggestions | gpt-4o-mini | $0.00015/1K tokens |

---

### Perplexity - Business Research

**What they provide:**
- Real-time business verification
- Owner research
- Competitive intelligence

**Our usage:**
| Task | Model | Purpose |
|------|-------|---------|
| Business Verification | llama-3.1-sonar-small | Verify leads |
| Deep Research | llama-3.1-sonar-small | Company intel |

---

## Data Flow Architecture

### Lead Lifecycle

```mermaid
flowchart TB
    subgraph "1. Acquisition"
        CSV[CSV Import]
        B2B[B2B Search]
        API[API Ingestion]
    end

    subgraph "2. Enrichment (LUCI)"
        SKIP[Skip Trace<br/>Find Mobile]
        VERIFY[Trestle<br/>Validate & Score]
        GRADE[Grade A-F]
    end

    subgraph "3. Routing"
        SAFE_Q[SAFE Queue]
        REVIEW_Q[Review Queue]
        BLOCK_Q[Suppression]
    end

    subgraph "4. Outreach"
        GIANNA[GIANNA<br/>SMS Opener]
        CATHY[CATHY<br/>Nurture]
        SABRINA[SABRINA<br/>Closer]
    end

    subgraph "5. Conversion"
        REPLY[Reply Handler]
        BOOK[Book Meeting]
        DEAL[Create Deal]
    end

    CSV --> SKIP
    B2B --> SKIP
    API --> SKIP
    SKIP --> VERIFY
    VERIFY --> GRADE
    GRADE -->|A-B| SAFE_Q
    GRADE -->|C-D| REVIEW_Q
    GRADE -->|F| BLOCK_Q
    SAFE_Q --> GIANNA
    REVIEW_Q --> CATHY
    GIANNA --> REPLY
    CATHY --> REPLY
    REPLY -->|Interested| SABRINA
    SABRINA --> BOOK
    BOOK --> DEAL
```

---

## AI Worker Architecture

### Agent Registry

```mermaid
flowchart TB
    subgraph "COPILOT (Central Brain)"
        CLASSIFY[Classify Intent]
        ROUTE[Route to Agent]
        MONITOR[Monitor & Override]
    end

    subgraph "Agents"
        GIANNA[GIANNA<br/>Opener]
        CATHY[CATHY<br/>Nurturer]
        SABRINA[SABRINA<br/>Closer]
        LUCI[LUCI<br/>Enrichment]
    end

    subgraph "Channels"
        SMS[SMS via SignalHouse]
        EMAIL[Email via SendGrid]
        CAL[Calendar via Calendly]
    end

    CLASSIFY --> ROUTE
    ROUTE --> GIANNA
    ROUTE --> CATHY
    ROUTE --> SABRINA
    GIANNA --> SMS
    CATHY --> SMS
    CATHY --> EMAIL
    SABRINA --> CAL
    MONITOR --> GIANNA
    MONITOR --> CATHY
    MONITOR --> SABRINA
```

### Agent Responsibilities

| Agent | Purpose | Trigger | Channel | Human Oversight |
|-------|---------|---------|---------|-----------------|
| **GIANNA** | Initial outreach | New lead in queue | SMS | <70% confidence |
| **CATHY** | Follow-up & nurture | No response 48h | SMS, Email | Template fallback |
| **SABRINA** | Close & schedule | "Interested" reply | SMS, Calendly | 100% approval |
| **LUCI** | Data enrichment | Import, API call | Internal | No |
| **COPILOT** | Central routing | All inbound | Internal | Confidence-based |

---

## Campaign Vertical Isolation

```mermaid
flowchart LR
    subgraph "Brand: NEXTIER"
        direction TB
        P[Plumbing]
        T[Trucking]
        C[CPAs]
        CO[Consultants]
        AB[Agents/Brokers]
        SP[Sales Pros]
        SO[Solopreneurs]
        PE[PE Boutiques]
    end

    subgraph "Shared Infrastructure"
        TPL[Template Library]
        OPT[Opt-Out Registry]
        ANL[Analytics Engine]
        SH[SignalHouse]
    end

    P --> TPL
    T --> TPL
    C --> TPL
    CO --> TPL
    AB --> TPL
    SP --> TPL
    SO --> TPL
    PE --> TPL
    TPL --> SH
```

Each vertical operates as an isolated campaign block with:
- Dedicated KPIs (delivery, response, conversion rates)
- Industry-specific templates
- Separate micro-dashboards
- Independent A/B testing

---

## Database Schema (Core Tables)

```mermaid
erDiagram
    USERS ||--o{ TEAMS : "belongs_to"
    TEAMS ||--o{ LEADS : "owns"
    LEADS ||--o{ CONVERSATIONS : "has"
    LEADS ||--o{ SMS_MESSAGES : "receives"
    CAMPAIGNS ||--o{ SMS_MESSAGES : "sends"
    CAMPAIGNS }|--|| VERTICALS : "targets"

    USERS {
        uuid id PK
        string email
        string password_hash
        string role
        timestamp created_at
    }

    LEADS {
        uuid id PK
        string first_name
        string last_name
        string phone
        string email
        string company_name
        string vertical
        int contact_score
        string contact_grade
        string risk_tier
        timestamp enriched_at
    }

    CAMPAIGNS {
        uuid id PK
        string name
        string vertical
        string status
        int sent_count
        int reply_count
        timestamp created_at
    }

    SMS_MESSAGES {
        uuid id PK
        uuid lead_id FK
        uuid campaign_id FK
        string direction
        string body
        string status
        timestamp sent_at
    }
```

---

## API Architecture

### GraphQL API (NestJS)

```
/graphql
├── Queries
│   ├── me - Current user
│   ├── leads - Lead management
│   ├── campaigns - Campaign CRUD
│   ├── conversations - SMS threads
│   └── analytics - KPI aggregations
│
└── Mutations
    ├── login - Authentication
    ├── createLead - Lead creation
    ├── sendSMS - Queue message
    ├── createCampaign - Campaign setup
    └── updateCampaignStatus - Start/pause
```

### REST Endpoints (Next.js API Routes)

```
/api
├── /auth
│   ├── /google - OAuth initiation
│   └── /google/callback - OAuth callback
│
├── /webhook
│   └── /signalhouse - Inbound SMS
│
├── /datalake
│   └── /import - CSV upload
│
├── /lead-lab
│   ├── /analyze - Batch contactability
│   └── /export - Profile export
│
└── /billing
    └── /usage - Credit tracking
```

---

## Security & Compliance

### Authentication

```mermaid
flowchart LR
    subgraph "Auth Methods"
        EMAIL[Email/Password]
        GOOGLE[Google OAuth]
    end

    subgraph "Session"
        JWT[JWT Token<br/>10 month expiry]
        COOKIE[HTTP-Only Cookie]
    end

    subgraph "Authorization"
        RBAC[Role-Based Access]
        TEAM[Team Isolation]
    end

    EMAIL --> JWT
    GOOGLE --> JWT
    JWT --> COOKIE
    COOKIE --> RBAC
    RBAC --> TEAM
```

### Data Security

| Layer | Protection |
|-------|------------|
| Transport | TLS 1.3 for all API calls |
| At Rest | AES-256 encryption (PostgreSQL) |
| API Keys | Environment variables, rotated quarterly |
| PII | Hashed in logs, encrypted in DB |
| Webhooks | Signature verification |

### TCPA Compliance

- Litigator check on every phone via Trestle
- Automatic DNC list sync
- Opt-out processing within 10 seconds
- All messages include opt-out language
- Full audit trail for compliance

---

## Deployment Architecture

### DigitalOcean App Platform

```mermaid
flowchart TB
    subgraph "DigitalOcean"
        subgraph "App Platform"
            FRONT[Next.js Frontend<br/>Web Service]
            API[NestJS API<br/>Web Service]
        end

        subgraph "Managed Services"
            DB[(PostgreSQL<br/>Managed DB)]
            REDIS[(Redis<br/>Caching)]
        end
    end

    subgraph "External Services"
        SH[SignalHouse API]
        TRESTLE[Trestle API]
        OPENAI[OpenAI API]
    end

    FRONT --> API
    API --> DB
    API --> REDIS
    API --> SH
    API --> TRESTLE
    API --> OPENAI
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# SignalHouse
SIGNALHOUSE_API_KEY=...
SIGNALHOUSE_WEBHOOK_SECRET=...

# Trestle
TRESTLE_API_KEY=...

# OpenAI
OPENAI_API_KEY=...

# Perplexity
PERPLEXITY_API_KEY=...
```

---

## Monitoring & Observability

### Health Checks

| Endpoint | Purpose | Frequency |
|----------|---------|-----------|
| `/api/health` | App health | 30s |
| `/api/health/db` | Database | 60s |
| `/api/health/ai` | AI providers | 300s |

### Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  NEXTIER SYSTEM HEALTH                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API Response Time     │  Database Connections             │
│  ████████████ 45ms     │  ████████░░ 80/100               │
│                                                             │
│  SignalHouse Status    │  Trestle Status                  │
│  ✓ Operational         │  ✓ Operational                   │
│                                                             │
│  Messages Sent (24h)   │  Enrichments (24h)               │
│  12,450                │  3,200                            │
│                                                             │
│  Error Rate            │  Queue Depth                      │
│  0.02%                 │  234 pending                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Structure

### Infrastructure Costs (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| DigitalOcean App Platform | 2 services | $50 |
| PostgreSQL Managed | Basic | $15 |
| Redis | Basic | $10 |
| **Subtotal** | | **$75/mo** |

### Pay-As-You-Go Costs (Per Lead)

| Service | Per Unit | 10K Leads |
|---------|----------|-----------|
| Skip Trace | $0.02/lead | $200 |
| Trestle Real Contact | $0.03/query | $300 |
| SignalHouse SMS | $0.02/msg | $200 |
| OpenAI | $0.0002/lead | $2 |
| **Subtotal** | | **~$700** |

### Total Cost per 10K Campaign

```
Infrastructure: $75/mo (amortized)
Enrichment:     $500
SMS Delivery:   $200
AI Processing:  $2
─────────────────────
Total:          ~$777 per 10K leads
Per Lead:       ~$0.08
```

---

## Roadmap

### Current (Q1 2026)

- [x] 10DLC compliant SMS via SignalHouse
- [x] Contactability scoring via Trestle
- [x] Campaign vertical isolation
- [x] GIANNA opener templates
- [x] CSV import with auto-enrichment

### Q2 2026

- [ ] Real-time enrichment on form submit
- [ ] Multi-number rotation per vertical
- [ ] Predictive send-time optimization
- [ ] Voice channel via Twilio

### Q3 2026

- [ ] ML-powered lead scoring
- [ ] Multi-provider SMS failover
- [ ] White-label dashboards
- [ ] API for agency partners

---

## Support

**Technical Lead**: tb@outreachglobal.io
**Platform**: https://nextier.io
**Status**: https://status.nextier.io
**Documentation**: https://docs.nextier.io

---

*NEXTIER - Enterprise B2B Outreach, Powered by Best-in-Class Infrastructure Partners*
