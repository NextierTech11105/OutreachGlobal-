# Nextier Engine - Complete Architecture

> **The 5-Machine AI-Powered Growth Engine**
>
> This is the same architecture used by HubSpot, Outreach.io, Apollo, Palantir, and Snowflake — but specifically tuned for real estate + business origination.

---

## High-Level Overview

```mermaid
flowchart TB
    subgraph Machines["🔄 5-MACHINE PIPELINE (Lead Lifecycle)"]
        direction TB
        M1["📱 1. INITIAL SMS MACHINE<br/>First Touch • Intent Test"]
        M2["📥 2. RESPONSE MACHINE<br/>Reply Routing • Signal Detection"]
        M3["💬 3. CONVERSATION MACHINE<br/>Qualifying • Nurturing • Education"]
        M4["📅 4. APPOINTMENT MACHINE<br/>Booking • Calendar • Handoff"]
        M5["💼 5. DEAL MACHINE<br/>Closing • Monetization • Exit"]

        M1 --> M2
        M2 --> M3
        M3 --> M4
        M4 --> M5
    end

    subgraph DataEngine["🔵 DATA ENGINE (ETL + Enrichment)"]
        DE1[Datalake - IDs Only]
        DE2[Warehouse - Full Records]
        DE3[Business ↔ Property Cross-Enrichment]
        DE4[Apollo B2B Enrich]
        DE5[REAPI Property Enrich]
        DE6[Skiptrace + Phone Validation]
        DE7[Signal Polling + Delta Detection]
        DE8[Unified Lead Card]
    end

    subgraph CampaignEngine["🟠 CAMPAIGN ENGINE (AI SDR + Execution)"]
        CE1[Gianna - Nextier Voice AI]
        CE2[Sabrina/Emily/Nitsa - HAOS SDRs]
        CE3[SMS via SignalHouse]
        CE4[Email via SendGrid]
        CE5[Content Drip Logic]
        CE6[Human-in-Loop Overrides]
    end

    DataEngine --> M1
    DataEngine --> M2
    DataEngine --> M3
    DataEngine --> M4
    DataEngine --> M5

    CampaignEngine --> M1
    CampaignEngine --> M2
    CampaignEngine --> M3
    CampaignEngine --> M4
    CampaignEngine --> M5
```

---

## 📱 MACHINE 1: Initial SMS Campaign Machine

**Purpose**: Start the conversation. Test for intent.

```mermaid
flowchart LR
    subgraph Inputs["Inputs"]
        I1[2K Block Pushes]
        I2[Skiptraced Leads]
        I3[Event-Signal Leads]
        I4[Business IDs]
        I5[Property IDs]
        I6[Segmented Batches]
    end

    subgraph Processing["AI SDR Outreach"]
        P1[Gianna - Nextier]
        P2[Sabrina - HAOS]
        P3[Emily - HAOS]
        P4[Nitsa - HAOS]
    end

    subgraph Actions["First Touch Actions"]
        A1[Compliant SMS]
        A2[Personalized Hook]
        A3[Intent Test Message]
    end

    Inputs --> Processing
    Processing --> Actions
    Actions --> R[Response Machine]
```

**What it does**:
- Sends first compliant outreach
- Tests for intent signals
- Handles 2K block compliance
- Routes to appropriate AI SDR persona

**Existing Code**:
- `apps/api/src/app/initial-messages/`
- `apps/front/src/app/api/signalhouse/`
- `apps/front/src/app/api/sms/queue/`

---

## 📥 MACHINE 2: Response Machine

**Purpose**: Route replies. Detect signals. Filter noise.

```mermaid
flowchart TD
    subgraph Inputs["Inbound Responses"]
        R1[Replies]
        R2[Questions]
        R3[Objections]
        R4[Soft Interest]
        R5[Wrong Number]
        R6[STOP Requests]
        R7[Calendar Interest]
    end

    subgraph AI["AI Classification"]
        A1{Real Interest<br/>or Noise?}
    end

    subgraph Actions["Routing Actions"]
        F1[Flag]
        F2[Tag]
        F3[Label]
        F4[Route to Conversation]
        F5[Suppress]
        F6[Escalate to Human]
    end

    Inputs --> AI
    AI -->|Interest| F1
    AI -->|Interest| F2
    AI -->|Interest| F3
    AI -->|Qualified| F4
    AI -->|STOP/DNC| F5
    AI -->|Complex| F6
```

**What it does**:
- Classifies incoming responses
- Flags, tags, labels for routing
- Handles STOP compliance
- Detects calendar interest signals
- Filters noise from real interest

**Existing Code**:
- `apps/api/src/app/inbox/`
- `apps/front/src/app/api/webhook/sms/`
- `apps/front/src/app/api/inbox/`

---

## 💬 MACHINE 3: Conversation Machine

**Purpose**: Qualify. Educate. Nurture. Build trust.

```mermaid
flowchart TD
    subgraph Qualifying["Qualification Flow"]
        Q1[Discovery Questions]
        Q2[Needs Analysis]
        Q3[Pain Point Detection]
        Q4[Timeline Assessment]
    end

    subgraph Content["Content Delivery"]
        C1[Micro-Value Content]
        C2[Macro-Value Content]
        C3[Medium Articles]
        C4[AI Blueprints]
        C5[Valuation Reports]
        C6[Market Newsletters]
    end

    subgraph Nurture["Nurture Sequences"]
        N1[Weekly Drips]
        N2[Monthly Roundups]
        N3[Blueprint Invitations]
        N4[Newsletter Subscriptions]
    end

    Qualifying --> Content
    Content --> Nurture
    Nurture --> AP[Appointment Machine]
```

**What it does**:
- Runs qualifying conversations
- Delivers educational content
- Pulls from Research Library
- Sends property/business insights
- Moves leads into content universe

**Existing Code**:
- `apps/api/src/app/message/`
- `apps/front/src/app/api/ai/suggest-reply/`
- `apps/front/src/app/api/content-library/`
- `apps/front/src/app/api/research-library/`

---

## 📅 MACHINE 4: Appointment Machine

**Purpose**: Bridge AI → Human. Book meetings.

```mermaid
flowchart LR
    subgraph Booking["Booking Flow"]
        B1[Calendar Availability]
        B2[Timezone Handling]
        B3[Appointment Type Selection]
        B4[Confirmation]
    end

    subgraph Coordination["Coordination"]
        C1[Callback Scheduling]
        C2[Reminder Sequences]
        C3[Reschedule Handling]
        C4[No-Show Recovery]
    end

    subgraph Handoff["Human Handoff"]
        H1[Context Package]
        H2[Lead History]
        H3[Property/Business Data]
        H4[Conversation Summary]
        H5[Recommended Approach]
    end

    Booking --> Coordination
    Coordination --> Handoff
    Handoff --> DM[Deal Machine]
```

**What it does**:
- Books meetings with proper context
- Handles timezone coordination
- Creates appointment reminders
- Syncs with Calendar module
- Pushes to Gianna for human-in-loop
- Packages full context for handoff

**Existing Code**:
- `apps/front/src/app/api/calendar/`
- `apps/front/src/app/t/[team]/calendar/`
- `apps/api/src/app/power-dialer/` (partial)

**Missing**: Deal linking, context packaging

---

## 💼 MACHINE 5: Deal Machine

**Purpose**: CLOSE and MONETIZE. This is the core of Nextier.

```mermaid
flowchart TD
    subgraph Inputs["Deal Inputs"]
        I1[Property Data]
        I2[Business Data]
        I3[Valuations]
        I4[Needs Assessment]
        I5[Pain Points]
        I6[Buyer/Seller Psychology]
        I7[Deal Timeline]
        I8[Exit Options]
    end

    subgraph Processing["Deal Processing"]
        P1[Package Business/Property]
        P2[Research Library Docs]
        P3[Strategy Session Prep]
        P4[Deal Structuring]
    end

    subgraph DealTypes["Deal Types"]
        D1[B2B Business Exits]
        D2[Commercial Off-Market]
        D3[Assemblage]
        D4[Blue-Collar Business Exits]
        D5[Development Opportunities]
        D6[Residential HAOS Deals]
    end

    subgraph Outcomes["Monetization"]
        O1[Commission]
        O2[Advisory Fee]
        O3[Referral Fee]
        O4[Equity Participation]
    end

    Inputs --> Processing
    Processing --> DealTypes
    DealTypes --> Outcomes
```

**What it does**:
- Consolidates all intelligence
- Packages deals for closing
- Supports multiple deal types
- Enables monetization paths

**Existing Code**: **MISSING** - Need to build `apps/front/src/app/api/deals/`

---

## 🔵 DATA ENGINE (Foundation Layer 1)

**Purpose**: Power everything. The brain of the system.

```mermaid
flowchart TD
    subgraph Extract["Extract (IDs Only)"]
        E1[Property IDs from REAPI]
        E2[Business IDs from Apollo]
        E3[People IDs from Skiptrace]
    end

    subgraph Transform["Transform"]
        T1[Flags]
        T2[Tags]
        T3[Labels]
        T4[Scores]
        T5[Signals]
    end

    subgraph Load["Load"]
        L1[(Datalake - IDs)]
        L2[(Warehouse - Full)]
        L3[(Spaces - Objects)]
    end

    subgraph Enrich["Cross-Enrichment"]
        EN1[Business ↔ Property Link]
        EN2[Property → Owner]
        EN3[Owner → Business]
        EN4[Phone Validation]
        EN5[Delta Detection]
    end

    subgraph Output["Unified Output"]
        O1[Unified Lead Card]
    end

    Extract --> Transform
    Transform --> Load
    Load --> Enrich
    Enrich --> Output
```

**Components**:
| Component | Purpose | Code Location |
|-----------|---------|---------------|
| Datalake | Store IDs only (cheap) | `api/datalake/` |
| Warehouse | Full enriched records | PostgreSQL + Drizzle |
| Apollo Enrich | B2B data | `api/apollo/enrich/` |
| REAPI Enrich | Property data | `api/property/` |
| Skiptrace | Phone/contact data | `api/skip-trace/`, `api/enrichment/skip-trace/` |
| Phone Validation | Line type, validity | Trestle integration |
| Signal Polling | Event detection | `api/property-search/monitor/` |
| Delta Detection | Change tracking | Needs building |
| Unified Lead Card | Combined view | `packages/common/src/unified-lead/` |

---

## 🟠 CAMPAIGN ENGINE (Foundation Layer 2)

**Purpose**: Execute outreach. AI SDR orchestration.

```mermaid
flowchart TD
    subgraph SDRs["AI SDR Personas"]
        S1[Gianna - Nextier Voice]
        S2[Sabrina - HAOS Primary]
        S3[Emily - HAOS Secondary]
        S4[Nitsa - HAOS Tertiary]
    end

    subgraph Channels["Channels"]
        C1[SMS - SignalHouse]
        C2[Email - SendGrid]
        C3[Voice - Twilio/Gianna]
        C4[Calendar - Native]
    end

    subgraph Logic["Execution Logic"]
        L1[Content Drip Sequences]
        L2[Reply Routing]
        L3[Escalation Rules]
        L4[Human-in-Loop Triggers]
        L5[A/B Testing]
    end

    subgraph Compliance["Compliance"]
        CO1[TCPA/10DLC]
        CO2[STOP Handling]
        CO3[DNC Lists]
        CO4[Quiet Hours]
    end

    SDRs --> Channels
    Channels --> Logic
    Logic --> Compliance
```

**Components**:
| Component | Purpose | Code Location |
|-----------|---------|---------------|
| Gianna | Voice AI SDR | `api/gianna/` |
| Sabrina SDR | Text AI SDR | `apps/api/src/app/inbox/services/sabrina-sdr.service.ts` |
| SignalHouse | SMS delivery | `api/signalhouse/` |
| SendGrid | Email delivery | `api/email/` |
| Campaign Push | Batch sends | `api/campaign/push/` |
| Automation Rules | Triggers | `api/automation/` |

---

## Code Location Summary

```
MACHINE 1 - Initial SMS
├── apps/api/src/app/initial-messages/     ✅ EXISTS
├── apps/front/src/app/api/signalhouse/    ✅ EXISTS
└── apps/front/src/app/api/sms/queue/      ✅ EXISTS

MACHINE 2 - Response
├── apps/api/src/app/inbox/                ✅ EXISTS
├── apps/front/src/app/api/webhook/sms/    ✅ EXISTS
└── apps/front/src/app/api/inbox/          ✅ EXISTS

MACHINE 3 - Conversation
├── apps/api/src/app/message/              ✅ EXISTS
├── apps/front/src/app/api/ai/             ✅ EXISTS
└── apps/front/src/app/api/content-library/ ✅ EXISTS

MACHINE 4 - Appointment
├── apps/front/src/app/api/calendar/       ✅ EXISTS
├── apps/front/src/app/t/[team]/calendar/  ✅ EXISTS
└── Context packaging for handoff          ❌ MISSING

MACHINE 5 - Deal
├── apps/front/src/app/api/deals/          ❌ MISSING
├── Deal pipeline stages                   ❌ MISSING
└── Deal packaging & monetization          ❌ MISSING

DATA ENGINE
├── apps/front/src/app/api/datalake/       ✅ EXISTS
├── apps/front/src/app/api/enrichment/     ✅ EXISTS
├── apps/front/src/app/api/apollo/         ✅ EXISTS
├── apps/front/src/app/api/property/       ✅ EXISTS
├── apps/front/src/app/api/skip-trace/     ✅ EXISTS
├── packages/common/src/unified-lead/      ✅ EXISTS
└── Delta detection system                 ❌ MISSING

CAMPAIGN ENGINE
├── apps/api/src/app/campaign/             ✅ EXISTS
├── apps/api/src/app/inbox/services/sabrina-sdr.service.ts ✅ EXISTS
├── apps/front/src/app/api/gianna/         ✅ EXISTS
├── apps/front/src/app/api/signalhouse/    ✅ EXISTS
└── apps/front/src/app/api/email/          ✅ EXISTS
```

---

## What Needs Building

| Priority | Component | Description |
|----------|-----------|-------------|
| 🔴 HIGH | Deal Machine | `/api/deals/` - Pipeline, stages, monetization |
| 🔴 HIGH | Appointment Context | Package lead history for human handoff |
| 🟡 MED | Delta Detection | Track changes in property/business data |
| 🟡 MED | Deal Types | B2B exits, commercial, assemblage, HAOS |
| 🟢 LOW | A/B Testing | Campaign variant testing |

---

## Next Steps

1. **Build Deal Machine** - The monetization core
2. **Complete Appointment Handoff** - Context packaging
3. **Add Delta Detection** - Change tracking for signals
4. **Connect All Machines** - Full pipeline flow

Ready to start building?
