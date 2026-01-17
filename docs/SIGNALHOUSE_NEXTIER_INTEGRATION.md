# NEXTIER × SignalHouse Integration Blueprint

> **Version**: 1.0.0
> **Date**: January 16, 2026
> **Status**: Production Ready
> **Brand ID**: BZOYPIH - NEXTIER
> **Campaign IDs**: CJRCU60, CW7I6X5

---

## Executive Summary

NEXTIER is an AI-powered B2B outreach platform that leverages SignalHouse's 10DLC infrastructure to deliver compliant, personalized SMS campaigns at scale. Our integration transforms raw business data into intelligent conversations through **GIANNA**, our AI worker with human oversight.

### Key Differentiators

| Feature | Traditional SMS | NEXTIER + SignalHouse |
|---------|-----------------|----------------------|
| Personalization | Static templates | Dynamic {firstName}, {companyName}, {industry} variables |
| Compliance | Manual opt-out handling | Automated TCPA/10DLC compliance built-in |
| Intelligence | Blast campaigns | AI-classified responses with routing |
| Scale | Single campaign | Isolated vertical campaigns (8+ industries) |
| Visibility | Basic delivery stats | Real-time micro-dashboards per vertical |

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph "Data Layer"
        CSV[("CSV Import<br/>Leads by Vertical")]
        DB[(PostgreSQL<br/>Lead Records)]
        ENRICH[Enrichment Pipeline]
    end

    subgraph "NEXTIER Platform"
        GIANNA["GIANNA<br/>AI Opener"]
        CATHY["CATHY<br/>Nurture Agent"]
        SABRINA["SABRINA<br/>Closer"]
        COPILOT["COPILOT<br/>Central Brain"]
    end

    subgraph "SignalHouse 10DLC"
        BRAND[("Brand: BZOYPIH<br/>NEXTIER")]
        CAMP1["Campaign: CJRCU60<br/>Low Volume"]
        CAMP2["Campaign: CW7I6X5<br/>Low Volume"]
        PHONE["+1 516-407-9249"]
        WEBHOOK["Webhook Endpoint"]
    end

    subgraph "Recipient"
        LEAD["Business Owner"]
        REPLY["SMS Reply"]
    end

    CSV --> DB
    DB --> ENRICH
    ENRICH --> GIANNA
    GIANNA --> COPILOT
    COPILOT --> BRAND
    BRAND --> CAMP1
    BRAND --> CAMP2
    CAMP1 --> PHONE
    CAMP2 --> PHONE
    PHONE --> LEAD
    LEAD --> REPLY
    REPLY --> WEBHOOK
    WEBHOOK --> COPILOT
    COPILOT --> CATHY
    COPILOT --> SABRINA
```

---

## Campaign Vertical Isolation

Each industry vertical operates as an isolated campaign block with dedicated KPIs:

```mermaid
flowchart LR
    subgraph "Brand: BZOYPIH"
        direction TB

        subgraph "Vertical Campaigns"
            P["🔧 Plumbing"]
            T["🚛 Trucking"]
            C["📊 CPAs"]
            CO["💼 Consultants"]
            AB["🏠 Agents/Brokers"]
            SP["📈 Sales Pros"]
            SO["🚀 Solopreneurs"]
            PE["💎 PE Boutiques"]
        end

        subgraph "Shared Infrastructure"
            TPL["Template Library"]
            OPT["Opt-Out Registry"]
            ANL["Analytics Engine"]
        end
    end

    P --> TPL
    T --> TPL
    C --> TPL
    CO --> TPL
    AB --> TPL
    SP --> TPL
    SO --> TPL
    PE --> TPL
```

---

## User Personas & Experience Flows

### Persona 1: Marketing Agency

**Profile**: Full-service digital agency managing 10+ client accounts

```mermaid
journey
    title Agency Owner Experience
    section Onboarding
        Connect SignalHouse API: 5: Agency
        Import client CSV files: 4: Agency
        Map verticals to campaigns: 5: Agency
    section Daily Operations
        Review micro-dashboards: 5: Agency
        Monitor response rates: 4: Agency
        Approve GIANNA suggestions: 5: Agency
    section Client Reporting
        Export KPIs by vertical: 5: Agency
        Generate ROI reports: 5: Agency
        Schedule calls via SABRINA: 4: Agency
```

**Key Workflows**:
1. **Multi-tenant management** - Each client = separate vertical campaign
2. **White-label dashboards** - Branded micro-dashboards per client
3. **Bulk operations** - Import 10K+ leads across multiple verticals
4. **Human oversight** - Agency team reviews AI-suggested responses

---

### Persona 2: Solopreneur

**Profile**: Independent consultant or coach building their practice

```mermaid
journey
    title Solopreneur Experience
    section Setup
        Upload contact list: 5: Solo
        Choose message templates: 5: Solo
        Set daily send limit: 4: Solo
    section Outreach
        GIANNA sends openers: 5: Solo
        Review replies in inbox: 5: Solo
        Respond personally or use AI: 4: Solo
    section Conversion
        Hot leads flagged by COPILOT: 5: Solo
        Book calls via Calendly: 5: Solo
        Track closed deals: 4: Solo
```

**Key Workflows**:
1. **Simple CSV upload** - No technical setup required
2. **Template selection** - Choose from 20 pre-approved messages
3. **Personal touch** - Review and approve before sending
4. **Calendar integration** - SABRINA books directly to Calendly

---

### Persona 3: Insurance/Real Estate Broker

**Profile**: Licensed professional with compliance requirements

```mermaid
journey
    title Broker Experience
    section Compliance Setup
        Verify 10DLC registration: 5: Broker
        Configure opt-out keywords: 5: Broker
        Set geographic targeting: 4: Broker
    section Prospecting
        Import neighborhood lists: 5: Broker
        Personalize by {county}: 4: Broker
        Track delivery by carrier: 5: Broker
    section Follow-up
        CATHY handles no-response: 5: Broker
        Warm leads escalate to call: 4: Broker
        Compliance audit trail: 5: Broker
```

**Key Workflows**:
1. **Geographic personalization** - {neighborhood}, {county} variables
2. **Compliance-first** - All messages include opt-out, archived for audit
3. **Carrier visibility** - See delivery rates by AT&T, T-Mobile, Verizon
4. **Follow-up automation** - CATHY re-engages after 48 hours

---

## Message Template System

### Variable Interpolation

```mermaid
flowchart LR
    subgraph "Input Variables"
        FN["{firstName}"]
        CN["{companyName}"]
        NB["{neighborhood}"]
        CT["{county}"]
        IN["{industry}"]
    end

    subgraph "Template Engine"
        TPL["Hi {firstName}, Gianna here.<br/>Noticed {companyName} in {county}..."]
    end

    subgraph "Output"
        MSG["Hi John, Gianna here.<br/>Noticed ABC Plumbing in Suffolk County..."]
    end

    FN --> TPL
    CN --> TPL
    NB --> TPL
    CT --> TPL
    IN --> TPL
    TPL --> MSG
```

### Approved Templates (20 variants)

| ID | Intro Style | Sample |
|----|-------------|--------|
| data_001 | "Hi {firstName}, Gianna here." | Data decay happens quietly... |
| data_002 | "{firstName}—Gianna again." | If data health slips... |
| data_003 | "Hey {firstName}, Gianna here." | Most teams scale before... |
| ... | (17 more variants) | ... |

**Character Limit**: 160 max
**Compliance**: All include "Reply STOP to opt out – NEXTIER"

---

## Micro-Dashboard Architecture

Real-time KPI visibility per campaign vertical:

```mermaid
flowchart TB
    subgraph "Micro-Dashboard Grid"
        direction LR

        subgraph "Plumbing"
            P_LEADS["500 Leads"]
            P_SENT["450 Sent"]
            P_REPLY["45 Replies"]
            P_RATE["10% Response"]
        end

        subgraph "Trucking"
            T_LEADS["300 Leads"]
            T_SENT["280 Sent"]
            T_REPLY["32 Replies"]
            T_RATE["12% Response"]
        end

        subgraph "CPAs"
            C_LEADS["200 Leads"]
            C_SENT["180 Sent"]
            C_REPLY["18 Replies"]
            C_RATE["10% Response"]
        end
    end

    subgraph "Aggregate View"
        TOTAL["1,000 Total Leads"]
        SENT["910 Sent"]
        REPLY["95 Replies"]
        BOOK["25 Booked"]
    end

    P_RATE --> TOTAL
    T_RATE --> TOTAL
    C_RATE --> TOTAL
```

### KPI Metrics Per Vertical

| Metric | Description | Formula |
|--------|-------------|---------|
| Delivery Rate | Messages delivered / sent | delivered ÷ sent × 100 |
| Response Rate | Replies / delivered | replies ÷ delivered × 100 |
| Conversion Rate | Booked / replies | booked ÷ replies × 100 |
| Opt-Out Rate | Opt-outs / delivered | optOuts ÷ delivered × 100 |

---

## SignalHouse API Integration

### Current Configuration

```yaml
Brand:
  id: BZOYPIH
  name: NEXTIER
  legal_entity: Artac Capital LLC
  ein: 862237370
  vertical: PROFESSIONAL

Campaigns:
  - id: CJRCU60
    use_case: LOW_VOLUME
    status: APPROVED
    carriers: [AT&T, T-Mobile, Verizon, US Cellular]

  - id: CW7I6X5
    use_case: LOW_VOLUME
    status: APPROVED
    carriers: [AT&T, T-Mobile, Verizon, US Cellular]

Phone Numbers:
  - number: +15164079249
    campaign: CJRCU60
    webhook: https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse

Group:
  id: GM7CEB
  subgroup: S7ZI7S
```

### API Endpoints Used

| Endpoint | Purpose | Frequency |
|----------|---------|-----------|
| `POST /message/sendSMS` | Outbound messages | ~75/min (AT&T TPM) |
| `GET /analytics/dashboardAnalytics` | KPI aggregation | Every 5 min |
| `POST /webhook` | Inbound message handling | Real-time |
| `GET /phoneNumber/myPhoneNumbers` | Number inventory | On-demand |
| `GET /message/optOutList` | Compliance check | Pre-send |

---

## Data Flow: CSV to Conversation

```mermaid
sequenceDiagram
    participant User as NEXTIER User
    participant Platform as NEXTIER Platform
    participant GIANNA as GIANNA AI
    participant SH as SignalHouse API
    participant Recipient as Business Owner

    User->>Platform: Upload CSV (500 plumbers)
    Platform->>Platform: Parse & validate
    Platform->>Platform: Assign vertical: PLUMBING
    Platform->>Platform: Enrich with {county}, {neighborhood}

    loop For each lead
        Platform->>GIANNA: Generate personalized message
        GIANNA->>Platform: "Hi John, Gianna here..."
        Platform->>SH: POST /message/sendSMS
        SH->>Recipient: SMS delivered
    end

    Recipient->>SH: "Yes, interested"
    SH->>Platform: Webhook: inbound message
    Platform->>GIANNA: Classify response
    GIANNA->>Platform: Classification: INTERESTED
    Platform->>User: Alert: Hot lead!
```

---

## Compliance & Security

### 10DLC Compliance

- ✅ Brand registered with TCR
- ✅ Campaigns approved (LOW_VOLUME use case)
- ✅ All messages include opt-out language
- ✅ Opt-out list checked before every send
- ✅ Message archive for audit trail

### TCPA Compliance

- ✅ Prior express consent via opt-in forms
- ✅ Clear identification: "Reply STOP to opt out – NEXTIER"
- ✅ Immediate opt-out processing
- ✅ No messages to numbers on DNC registry

### Data Security

- ✅ All data encrypted at rest (PostgreSQL)
- ✅ TLS 1.3 for all API communications
- ✅ API keys rotated quarterly
- ✅ Webhook signature verification

---

## Roadmap: Next 30 Days

| Week | Milestone | Impact |
|------|-----------|--------|
| 1 | CSV import with auto-vertical detection | Faster onboarding |
| 2 | 6 additional vertical campaigns | 8 total campaign blocks |
| 3 | Multi-number rotation per vertical | Higher deliverability |
| 4 | Predictive send-time optimization | +15% response rate |

---

## Technical Stack Compatibility

### NEXTIER Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: NestJS GraphQL API
- **Database**: PostgreSQL (Drizzle ORM)
- **Hosting**: DigitalOcean App Platform
- **AI**: OpenAI GPT-4o-mini, Anthropic Claude

### SignalHouse Stack (MERN)
- **MongoDB** ↔ Our PostgreSQL (REST API bridge)
- **Express** ↔ Our NestJS (compatible patterns)
- **React** ↔ Our Next.js (same ecosystem)
- **Node.js** ↔ Our Node.js (identical runtime)

**Integration Pattern**: REST API with JSON payloads, webhook callbacks

---

## Contact

**Technical Lead**: tb@outreachglobal.io
**Platform**: https://monkfish-app-mb7h3.ondigitalocean.app
**Brand Portal**: https://nextier.signalhouse.io/intake/LDZH8OR

---

*This document is intended for SignalHouse technical team review. All diagrams render in GitHub-flavored Markdown with Mermaid support.*
