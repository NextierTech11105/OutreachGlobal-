# OutreachGlobal: Software Design Document

> *"The fortune is in the follow-up."* — Every successful deal-maker since the Phoenician traders of 1500 BC

---

## Executive Summary: The Art of the Chase

For millennia, from the bazaars of ancient Mesopotamia to the trading floors of Wall Street, the fundamental challenge of commerce has remained unchanged: **finding the right person, at the right time, with the right message.**

OutreachGlobal is the modern answer to humanity's oldest business challenge. It's a **unified intelligence platform** that transforms scattered leads into closed deals through multi-channel automation, AI-driven personalization, and relentless follow-up orchestration.

---

# Table of Contents

1. [Non-Technical Overview](#non-technical-overview)
2. [System Architecture](#system-architecture)
3. [Core Modules](#core-modules)
4. [Role-Based Value Propositions](#role-based-value-propositions)
5. [Data Flow & Workflows](#data-flow--workflows)
6. [Integration Ecosystem](#integration-ecosystem)
7. [Deployment Architecture](#deployment-architecture)
8. [Historical Parallels](#historical-parallels)

---

# Non-Technical Overview

## What is OutreachGlobal?

Think of OutreachGlobal as your **24/7 deal-making command center**:

- **A tireless research team** finding property owners, business decision-makers, and motivated sellers
- **A brilliant assistant** remembering every conversation and knowing exactly when to follow up
- **A phone bank** dialing hundreds of prospects while you focus on closing
- **An AI copywriter** crafting personalized messages that actually get responses

## The Three Pillars

```mermaid
mindmap
  root((OutreachGlobal))
    DISCOVER
      Property Search
      Skip Tracing
      B2B Lead Gen
      Business Intelligence
    ENGAGE
      AI SDR Avatars
      Power Dialer
      SMS Campaigns
      Email Sequences
    CONVERT
      Unified Inbox
      Response Scoring
      Deal Tracking
      Analytics
```

---

# System Architecture

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["User Interface"]
        UI[Next.js 15 Frontend]
        Mobile[Mobile Responsive]
    end

    subgraph Gateway["API Gateway"]
        NextAPI[Next.js API Routes]
        Auth[JWT Authentication]
    end

    subgraph Core["Core Engine"]
        NestJS[NestJS Backend]
        GraphQL[GraphQL API]
        REST[REST Endpoints]
        Queue[BullMQ Job Queue]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        Redis[(Redis Cache)]
        S3[(AWS S3 Storage)]
    end

    subgraph External["External Services"]
        Twilio[Twilio Voice/SMS]
        RealEstate[RealEstateAPI]
        Apollo[Apollo.io B2B]
        SignalHouse[SignalHouse SMS]
        AI[OpenAI / Claude AI]
    end

    UI --> NextAPI
    Mobile --> NextAPI
    NextAPI --> Auth
    Auth --> NestJS
    NestJS --> GraphQL
    NestJS --> REST
    NestJS --> Queue
    NestJS --> PG
    Queue --> Redis
    NestJS --> External
    NestJS --> S3
```

## Database Entity Relationship

```mermaid
erDiagram
    TEAMS ||--o{ USERS : "has members"
    TEAMS ||--o{ LEADS : "owns"
    TEAMS ||--o{ CAMPAIGNS : "runs"
    TEAMS ||--o{ AI_SDR_AVATARS : "creates"

    LEADS ||--o{ LEAD_PHONE_NUMBERS : "has"
    LEADS ||--o{ MESSAGES : "receives"
    LEADS ||--o{ CALL_HISTORIES : "involved in"

    CAMPAIGNS ||--o{ CAMPAIGN_SEQUENCES : "contains"
    CAMPAIGNS ||--o{ CAMPAIGN_LEADS : "targets"
    CAMPAIGNS ||--o{ CAMPAIGN_EVENTS : "tracks"

    AI_SDR_AVATARS ||--o{ CAMPAIGNS : "assigned to"
    PROPERTIES ||--o{ PROPERTY_DISTRESS_SCORES : "has"

    LEADS {
        uuid id PK
        string name
        string email
        int score
        jsonb customFields
        uuid teamId FK
    }

    CAMPAIGNS {
        uuid id PK
        string name
        string status
        uuid teamId FK
        uuid avatarId FK
    }

    AI_SDR_AVATARS {
        uuid id PK
        string name
        string personality
        string voiceType
        uuid teamId FK
    }

    PROPERTIES {
        uuid id PK
        string address
        decimal valuation
        string ownerName
        jsonb distressSignals
    }
```

---

# Core Modules

## Module Overview

```mermaid
graph TB
    subgraph Discovery["DISCOVERY ENGINE"]
        PS[Property Search]
        ST[Skip Trace]
        AP[Apollo B2B Search]
        EN[Data Enrichment]
    end

    subgraph Outreach["OUTREACH ENGINE"]
        PD[Power Dialer]
        SM[SMS Campaigns]
        EM[Email Sequences]
        AI[AI SDR Avatars]
    end

    subgraph Response["RESPONSE ENGINE"]
        IN[Unified Inbox]
        CL[Classification AI]
        BK[Bucket System]
        SC[Response Scoring]
    end

    subgraph Analytics["ANALYTICS ENGINE"]
        CA[Campaign Analytics]
        CLA[Call Analytics]
        RA[Response Analytics]
        DA[Deal Tracking]
    end

    Discovery --> Outreach
    Outreach --> Response
    Response --> Analytics
    Analytics --> Discovery
```

## Campaign State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create Campaign
    DRAFT --> SCHEDULED: Schedule
    DRAFT --> ACTIVE: Launch Immediately
    SCHEDULED --> ACTIVE: Time Reached
    ACTIVE --> PAUSED: Pause
    PAUSED --> ACTIVE: Resume
    ACTIVE --> COMPLETED: All Sequences Done
    ACTIVE --> CANCELLED: Cancel
    PAUSED --> CANCELLED: Cancel
    COMPLETED --> [*]
    CANCELLED --> [*]
```

## Message Routing Flow

```mermaid
sequenceDiagram
    participant U as User/AI SDR
    participant C as Campaign Engine
    participant R as Message Router
    participant T as Twilio/SignalHouse
    participant L as Lead

    U->>C: Trigger Campaign
    C->>R: Send Message Request
    R->>R: Select Channel
    R->>R: Personalize Content
    R->>T: Deliver Message
    T->>L: Message Delivered
    L->>T: Response Received
    T->>R: Webhook Callback
    R->>C: Update Campaign Status
    R->>U: Notify of Response
```

---

# Role-Based Value Propositions

---

## For Real Estate Investors & Wholesalers

> *"In 1626, Peter Minuit purchased Manhattan for $24 worth of goods. Today's best real estate deals aren't found—they're hunted with precision."*

### The Deal Flow

```mermaid
graph LR
    A[Property Search] --> B[Skip Trace Owners]
    B --> C[Multi-Touch Campaign]
    C --> D[Closed Deal]

    style A fill:#e1f5fe
    style B fill:#b3e5fc
    style C fill:#81d4fa
    style D fill:#4fc3f7
```

### Your Unfair Advantage

| Challenge | Old Way | OutreachGlobal Way |
|-----------|---------|-------------------|
| Finding distressed properties | Drive for dollars, random MLS | AI-powered distress scoring with pre-foreclosure, tax lien, high-equity filters |
| Getting owner contact info | Pay $1-5 per skip trace, wait days | Instant skip tracing - 5,000 traces/day |
| Initial outreach | Generic "We Buy Houses" postcards | Personalized SMS/voice referencing specific property details |
| Follow-up | Sticky notes, forgotten spreadsheets | Automated 12-touch sequences with intelligent timing |
| Response handling | Check 5 different inboxes | Unified inbox with AI scoring (COLD/WARM/HOT) |

### Property Acquisition Workflow

```mermaid
flowchart TD
    A[Define Target Market] --> B[Property Search Filters]
    B --> C{Distress Signals}
    C -->|Pre-Foreclosure| D[High Priority Queue]
    C -->|Tax Liens| D
    C -->|High Equity| E[Standard Queue]
    C -->|Reverse Mortgage| D
    D --> F[Skip Trace Batch]
    E --> F
    F --> G[AI-Personalized Campaign]
    G --> H{Response?}
    H -->|Interested| I[Hot Lead Bucket]
    H -->|Maybe| J[Warm Lead Nurture]
    H -->|No Response| K[Auto Re-engage]
    I --> L[Deal Negotiation]
    J --> G
    K --> G
    L --> M[Assignment or Close]
```

---

## For Business Brokers & M&A Advisors

> *"J.P. Morgan didn't wait for deals to come to him. In 1901, he orchestrated the creation of U.S. Steel by systematically approaching every stakeholder. Your deal flow deserves the same intentionality."*

### Deal Sourcing Pipeline

```mermaid
graph TB
    A[Business Intelligence] --> B[Decision Maker ID]
    B --> C[Multi-Channel Outreach]
    C --> D[Relationship Building]
    D --> E[Mandate Secured]
```

### The Modern Rainmaker's Week

```mermaid
journey
    title Business Broker Weekly Workflow
    section Monday
      Define target criteria: 5: Broker
      Launch Apollo search: 5: System
    section Tuesday
      Review enriched leads: 4: Broker
      Assign to AI SDR avatar: 5: System
    section Wednesday
      Personalized outreach begins: 5: System
      Monitor response inbox: 4: Broker
    section Thursday
      Hot leads flagged: 5: System
      Personal follow-up calls: 5: Broker
    section Friday
      Discovery meetings: 5: Broker
      New mandates signed: 5: Both
```

### Target Acquisition Matrix

| Owner Profile | Search Criteria | Outreach Strategy |
|--------------|-----------------|-------------------|
| **Tired Entrepreneur** | 15+ years ownership, declining revenue | Empathy-focused messaging about legacy and retirement |
| **Growth-Stage Exit** | 50-200 employees, recent funding | Strategic buyer match positioning |
| **Distressed Seller** | Negative cash flow, aging receivables | Urgent but respectful outreach |
| **Roll-up Target** | $1-5M EBITDA, fragmented industry | Platform acquisition narrative |

---

## For Solopreneurs & Independent Deal Makers

> *"Marco Polo traveled the Silk Road with a small team and changed global trade. You don't need a sales army—you need a force multiplier."*

### Time Transformation

```mermaid
pie title Before OutreachGlobal
    "Finding Leads" : 30
    "Research & Enrichment" : 20
    "Outreach & Follow-up" : 25
    "Admin & Data Entry" : 15
    "Closing Deals" : 10
```

```mermaid
pie title After OutreachGlobal
    "Strategic Planning" : 15
    "High-Value Conversations" : 40
    "Relationship Building" : 30
    "Closing Deals" : 15
```

### Your AI-Powered Team of One

| Virtual Team Member | What They Do | OutreachGlobal Feature |
|--------------------|--------------|----------------------|
| **Research Analyst** | Finds and qualifies prospects | Property Search + Apollo B2B |
| **Skip Tracer** | Gets contact information | Skip Trace API (5K/day) |
| **SDR** | Initial outreach & follow-up | AI SDR Avatars |
| **Call Center Agent** | Phone outreach at scale | Power Dialer |
| **Executive Assistant** | Organizes responses | Unified Inbox + Buckets |

### Daily Success Flow

```mermaid
flowchart LR
    A[Morning: Review Hot Leads] --> B[10am: Personal Calls]
    B --> C[Afternoon: AI Handles Outreach]
    C --> D[Evening: Review Analytics]
    D --> E[Close Deals]
    E --> A
```

---

## For Private Equity & Enterprise Sales

> *"The House of Medici didn't build their empire through chance. They built systematic relationship networks across Europe. Your deal sourcing should be equally methodical."*

### Enterprise Deal Funnel

```mermaid
graph TB
    A[Total Addressable Market] --> B[Targeted Companies]
    B --> C[Qualified Opportunities]
    C --> D[Active Conversations]
    D --> E[LOIs Issued]
    E --> F[Deals Closed]

    A -->|Apollo Search| B
    B -->|AI Scoring| C
    C -->|Multi-Channel| D
    D -->|Response Analytics| E
    E -->|Deal Tracking| F
```

### Portfolio Company Sourcing

```mermaid
gantt
    title PE Deal Sourcing Campaign
    dateFormat  YYYY-MM-DD
    section Discovery
    Market Mapping           :a1, 2024-01-01, 7d
    Company Identification   :a2, after a1, 5d
    section Outreach
    Initial Campaign Launch  :b1, after a2, 14d
    Follow-up Sequences      :b2, after b1, 21d
    section Engagement
    Hot Lead Calls           :c1, after a2, 35d
    Management Meetings      :c2, after b1, 28d
    section Closing
    LOI Negotiation          :d1, after c2, 14d
```

---

## For Note Buyers & Commercial Lenders

> *"The Rothschilds built a banking dynasty by knowing before others where opportunity lay. In note buying, information velocity is everything."*

### Intelligence Stack

```mermaid
flowchart TD
    subgraph "Data Sources"
        A[Pre-Foreclosure Lists]
        B[Tax Lien Records]
        C[Probate Filings]
        D[Divorce Proceedings]
    end

    subgraph "Processing"
        E[Property Enrichment]
        F[Owner Skip Trace]
        G[Equity Calculation]
        H[Priority Scoring]
    end

    subgraph "Campaigns"
        I[Urgent Situations]
        J[Standard Pipeline]
        K[Long-Term Nurture]
    end

    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    G --> H
    H -->|Score > 80| I
    H -->|Score 50-80| J
    H -->|Score < 50| K
```

---

## For Franchise Brokers

> *"Ray Kroc didn't just sell hamburgers—he sold the American Dream. Every franchise inquiry is someone's dream waiting to be realized."*

### Lead Nurturing Sequence

```mermaid
sequenceDiagram
    participant L as Lead
    participant AI as AI SDR Avatar
    participant F as Franchise Broker
    participant C as CRM

    L->>C: Inquiry Submitted
    C->>AI: Trigger Welcome Sequence
    AI->>L: Day 1: Welcome + FDD Link
    AI->>L: Day 3: Success Story Video
    AI->>L: Day 5: ROI Calculator
    AI->>L: Day 7: Discovery Call Invite
    L->>AI: Books Call
    AI->>F: Hot Lead Alert
    F->>L: Personal Discovery Call
    F->>C: Update Lead Stage
```

---

# Data Flow & Workflows

## Complete Lead Lifecycle

```mermaid
flowchart TB
    subgraph DISCOVERY["DISCOVERY"]
        A1[Property Search] --> A2[Skip Trace]
        A3[Apollo Search] --> A4[Enrich Contacts]
        A5[CSV Import] --> A6[Data Mapping]
    end

    subgraph ENRICHMENT["ENRICHMENT"]
        A2 --> B1[Lead Created]
        A4 --> B1
        A6 --> B1
        B1 --> B2[Score Calculated]
        B2 --> B3[Tags Applied]
        B3 --> B4[Campaign Assigned]
    end

    subgraph OUTREACH["OUTREACH"]
        B4 --> C1{Channel}
        C1 -->|SMS| C2[SignalHouse]
        C1 -->|Email| C3[SendGrid]
        C1 -->|Voice| C4[Twilio]
        C2 --> C5[Delivery Tracking]
        C3 --> C5
        C4 --> C5
    end

    subgraph RESPONSE["RESPONSE"]
        C5 --> D1[Response Received]
        D1 --> D2[AI Classification]
        D2 -->|Interested| D3[Hot Bucket]
        D2 -->|Maybe| D4[Warm Bucket]
        D2 -->|No| D5[Archive]
        D2 -->|Bad Number| D6[Suppression]
    end

    subgraph CONVERSION["CONVERSION"]
        D3 --> E1[Personal Follow-up]
        D4 --> E2[Auto Nurture]
        E1 --> E3[Meeting]
        E2 --> D1
        E3 --> E4[Negotiation]
        E4 --> E5[CLOSED]
    end
```

## AI SDR Avatar Flow

```mermaid
flowchart LR
    subgraph Config["Configuration"]
        A1[Name & Personality]
        A2[Voice Type]
        A3[Industry Focus]
        A4[Communication Style]
    end

    subgraph Generation["Message Gen"]
        B1[Lead Context]
        B2[Property/Company Data]
        B3[Previous Interactions]
        B4[AI Prompt Engine]
    end

    subgraph Execution["Execution"]
        C1[Personalized SMS]
        C2[Custom Email]
        C3[Voice Script]
    end

    A1 --> B4
    A2 --> B4
    A3 --> B4
    A4 --> B4
    B1 --> B4
    B2 --> B4
    B3 --> B4
    B4 --> C1
    B4 --> C2
    B4 --> C3
```

---

# Integration Ecosystem

```mermaid
graph TB
    subgraph Core["OutreachGlobal Core"]
        OG[Platform Engine]
    end

    subgraph Data["Data Providers"]
        RE[RealEstateAPI]
        AP[Apollo.io]
    end

    subgraph Comms["Communication"]
        TW[Twilio]
        SH[SignalHouse]
        SG[SendGrid]
    end

    subgraph AI["AI Services"]
        OA[OpenAI]
        CL[Anthropic Claude]
    end

    subgraph Infra["Infrastructure"]
        S3[AWS S3]
        GM[Google Maps]
    end

    RE <--> OG
    AP <--> OG
    TW <--> OG
    SH <--> OG
    SG <--> OG
    OA <--> OG
    CL <--> OG
    S3 <--> OG
    GM <--> OG
```

---

# Deployment Architecture

```mermaid
graph TB
    subgraph DO["DigitalOcean App Platform"]
        subgraph Apps["App Services"]
            FE[Next.js Frontend - Port 3000]
            BE[NestJS Backend - Port 3001]
        end

        subgraph Managed["Managed Services"]
            DB[(PostgreSQL)]
            RD[(Redis)]
        end

        subgraph Net["Networking"]
            LB[Load Balancer]
            DNS[DNS / SSL]
        end
    end

    subgraph Ext["External"]
        CDN[DO Spaces CDN]
        API[External APIs]
    end

    DNS --> LB
    LB --> FE
    LB --> BE
    FE --> BE
    BE --> DB
    BE --> RD
    BE --> CDN
    BE --> API
```

---

# Historical Parallels: Deal-Making Through the Ages

| Era | Deal Maker | Their "Tech Stack" | OutreachGlobal Equivalent |
|-----|-----------|-------------------|--------------------------|
| **1500 BC** | Phoenician Traders | Ship routes, trade agreements, messenger networks | Multi-channel campaigns, automated sequences |
| **1400s** | Medici Bankers | Coded letters, trusted couriers, relationship ledgers | Encrypted messaging, CRM, lead scoring |
| **1800s** | Robber Barons | Telegraph, rail networks, newspaper influence | Real-time communication, power dialer, analytics |
| **1950s** | Door-to-Door Sales | Rolodex, maps, call sheets | Contact database, territory management |
| **2024** | Modern Deal Makers | OutreachGlobal | The integrated command center |

> *"The only difference between then and now is velocity. A Medici banker might wait weeks for a response. You'll know in minutes."*

---

# Quick Reference

```
+------------------------------------------------------------------+
|                    OUTREACH GLOBAL CHEAT SHEET                    |
+------------------------------------------------------------------+
|                                                                   |
|  FIND LEADS                                                       |
|     -> Property Search: Filter by distress, equity, location      |
|     -> Apollo Search: B2B by revenue, industry, employees         |
|     -> Skip Trace: Get phones & emails (5K/day)                   |
|                                                                   |
|  REACH OUT                                                        |
|     -> AI SDR Avatars: Personalized at scale                      |
|     -> Power Dialer: 3x your call volume                          |
|     -> SMS Campaigns: 98% open rates                              |
|                                                                   |
|  MANAGE RESPONSES                                                 |
|     -> Unified Inbox: One place for everything                    |
|     -> AI Scoring: COLD -> WARM -> HOT                            |
|     -> Bucket System: Kanban for responses                        |
|                                                                   |
|  TRACK RESULTS                                                    |
|     -> Campaign Analytics: What's working                         |
|     -> Response Rates: By channel, time, message                  |
|     -> Deal Pipeline: From lead to close                          |
|                                                                   |
+------------------------------------------------------------------+
```

---

# Glossary

| Term | Definition |
|------|------------|
| **AI SDR** | AI Sales Development Representative - automated outreach avatar |
| **Skip Trace** | Finding contact information for property owners |
| **Power Dialer** | Automated phone dialing system for high-volume calling |
| **Campaign Sequence** | Multi-step automated outreach with timed delays |
| **Response Bucket** | Categorized containers for organizing lead responses |
| **Distress Score** | Numerical indicator of property owner motivation to sell |
| **Hot Lead** | Highly engaged prospect ready for personal contact |
| **Unified Inbox** | Single view of all responses across channels |

---

*Document Version: 1.0 | December 2024 | OutreachGlobal v2.0*

> *"Fortune favors the prepared mind, but fortune favors even more the prepared mind with automated follow-up sequences."*
> — Adapted from Louis Pasteur
