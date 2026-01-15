# B2B Intelligence & Engagement Ecosystem

## The Compounding Pipeline: Discovery → Enrichment → Engagement

This document outlines the strategic architecture of our three-layer B2B intelligence ecosystem, demonstrating how data flows from discovery through engagement to achieve compounding lead quality and conversion momentum.

---

## Executive Summary

The ecosystem operates as a **three-layer intelligence funnel** where each layer compounds the value of the previous:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   USBIZDATA                    TRACERFIY                 SIGNALHOUSE     │
│   ══════════                   ═════════                 ═══════════     │
│                                                                          │
│   8M+ verified            →    Mobile/Email         →    98% open rate   │
│   business records             extraction                45-sec response │
│                                                                          │
│   $0.01/lead                   $0.02/lead                Variable        │
│                                                                          │
│   ────────────────────────────────────────────────────────────────────   │
│                                                                          │
│   DISCOVERY                    ENRICHMENT                ENGAGEMENT      │
│   Raw business data            Contactable leads         Live responses  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

TOTAL COST: $0.03/lead → $4.67/meeting (12 meetings per 2,000 leads)
```

**The Core Insight**: Each layer transforms data quality exponentially. Raw records become verified contacts. Verified contacts become real-time conversations. Conversations become booked meetings.

---

## Layer 1: UsBizData — The Universal Schema

### Strategic Role

UsBizData serves as the **source of truth** — a structured, query-ready foundation containing verified U.S. business information organized by industry vertical.

Think of it as the bedrock layer: without accurate, organized business data, enrichment and engagement have nothing to build upon.

### What It Provides

```text
UNIVERSAL CSV SCHEMA
════════════════════

├── COMPANY IDENTITY
│   ├── Company Name
│   ├── DBA (Doing Business As)
│   ├── Legal Entity Type
│   └── Website URL
│
├── CONTACT INFORMATION
│   ├── First Name, Last Name
│   ├── Title
│   ├── Email Address
│   └── Phone Number
│
├── LOCATION DATA
│   ├── Street Address
│   ├── City, State, ZIP
│   └── County
│
├── INDUSTRY CLASSIFICATION
│   ├── SIC Code + Description
│   └── NAICS Code
│
└── FIRMOGRAPHICS
    ├── Employee Count / Range
    ├── Annual Revenue / Range
    └── Year Established
```

### Available Databases

| Industry | SIC Code | Total Records | Verification Status |
| --- | --- | --- | --- |
| Realtors | 6531 | 2,184,726 | Verified |
| Plumbers | 1711 | 338,605 | Verified |
| Electricians | 1731 | 245,000 | Verified |
| Trucking | 4212-4214 | 306,647 | Verified |
| Roofing | 1761 | 180,000 | Verified |
| HVAC | 1711 | 156,000 | Verified |
| Dentists | 8021 | 198,000 | Verified |
| Insurance Agents | 6411 | 425,000 | Verified |
| Accountants | 8721 | 312,000 | Verified |
| Attorneys | 8111 | 467,000 | Verified |

**Total Available**: 27+ verified databases with 8M+ records

### Value Proposition

| Attribute | Value |
| --- | --- |
| Cost per lead | $0.01 |
| Data freshness | Updated quarterly |
| Match rate | 95%+ address accuracy |
| Query speed | Instant (pre-indexed) |

### Key Implementation Files

- `apps/front/src/lib/data/usbizdata-registry.ts` — Database registry and query interface
- `apps/front/src/config/lead-sources.ts` — Folder hierarchy and batch configuration
- `apps/front/src/config/industries.ts` — 30+ industry definitions with targeting criteria

---

## Layer 2: Tracerfiy — Deep Business Tracing

### Strategic Role

Tracerfiy transforms static business records into **actionable contact intelligence**. It bridges the gap between "I have a company name and address" to "I have the owner's mobile phone and email."

This is the enrichment layer that makes engagement possible.

### Enrichment Capabilities

#### Normal Trace ($0.02/lead)

```text
INPUT                              OUTPUT
═════                              ══════

firstName ──────────┐
lastName ───────────┤              ┌── Primary Phone + Type
address ────────────┼─► TRACERFIY ─┼── Mobile 1-5
city ───────────────┤              ├── Landline 1-3
state ──────────────┘              ├── Email 1-5
                                   ├── Mailing Address
                                   └── Line Type Verification
```

#### Enhanced Trace ($0.15/lead)

All normal trace data, plus:

```text
ADDITIONAL INTELLIGENCE
═══════════════════════

├── Demographics: Age
├── Identity: Alias 1-5 (name variations)
├── History: Past Address 1-5
├── Network: Relative 1-8 with contact info
└── Business: Associated businesses 1-5
```

### The 3-Step Enrichment Pipeline

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: BUSINESS VERIFICATION                                           │
│ Provider: Perplexity AI                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Question: "Is [Company Name] at [Address] still operating?"           │
│                                                                         │
│  Output:                                                                │
│  ├── isBusinessActive: boolean                                         │
│  ├── verifiedOwnerName: string (if found)                             │
│  └── confidenceScore: 0-100%                                          │
│                                                                         │
│  Purpose: Filter out defunct businesses before spending on skip trace  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: OWNER RESEARCH                                                  │
│ Provider: Perplexity AI                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Question: "Who owns/operates [Company Name]? What is their title?"    │
│                                                                         │
│  Output:                                                                │
│  ├── ownerName: string                                                 │
│  ├── ownerTitle: string                                                │
│  └── Update firstName/lastName if better match found                   │
│                                                                         │
│  Purpose: Improve skip trace accuracy with correct owner name          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: SKIP TRACE                                                      │
│ Provider: Tracerfiy API                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Input: firstName + lastName + address + city + state                  │
│                                                                         │
│  Processing:                                                           │
│  ├── Execute trace against national consumer database                  │
│  ├── Extract and deduplicate phone numbers                            │
│  ├── Identify primary mobile (prefer "Mobile" line type)              │
│  └── Validate email addresses                                         │
│                                                                         │
│  Output:                                                                │
│  ├── phones[]: Array with type labels (Mobile/Landline)               │
│  ├── primaryMobile: Best mobile for SMS                               │
│  ├── emails[]: Verified email addresses                               │
│  └── mailingAddress: Current mailing address                          │
│                                                                         │
│  Cost: $0.02 per record                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Entity Filtering

Before enrichment, 53 regex patterns automatically filter non-individual entities:

```text
FILTERED ENTITY TYPES (No Skip Trace)
═════════════════════════════════════

├── Business Entities: LLC, Inc, Corp, LP, LLP
├── Trusts: Trust, Living Trust, Family Trust
├── Financial: Bank, Credit Union, Mortgage Co
├── Estates: Estate of, Deceased
├── Organizations: HOA, Association, Foundation
├── Government: County, City of, State of
└── Religious: Church, Ministry, Temple
```

**Why filter?** Skip tracing an "ABC Properties LLC" returns no useful contact data — it's a business entity, not a person. Filtering saves $0.02 per filtered record.

### Enrichment Metrics

| Metric | Rate |
| --- | --- |
| Overall match rate | ~85% |
| Mobile phone found | 70-85% of individuals |
| Email found | 60-75% of individuals |
| Entity filter rate | ~10% of raw records |
| Processing time | 15-30 seconds per record |

### Key Implementation Files

- `apps/front/src/lib/tracerfy.ts` — API client (706 lines)
- `apps/front/src/lib/services/skip-trace-service.ts` — Business logic layer (523 lines)
- `apps/front/src/lib/services/enrichment-pipeline.ts` — Full 3-step pipeline (558 lines)
- `apps/front/src/app/api/skip-trace/tracerfy/route.ts` — Direct API endpoint
- `apps/front/src/app/api/enrich/route.ts` — Lead enrichment endpoint

---

## Layer 3: SignalHouse.io — Engagement Engine

### Strategic Role

SignalHouse operates as the **activation layer** — converting enriched contact data into real-time conversations. It's the nervous system of the engagement platform.

Where email gets 20% open rates, SMS achieves **98% open rates** with **45-second average response times**. This channel efficiency is what makes the compounding model work.

### Multi-Tenant Architecture

```text
SIGNALHOUSE HIERARCHY
═════════════════════

ORGANIZATION (Top Level)
│
└── GROUP (Master Account)
    │
    └── SUB-GROUP (Hermetically Sealed Tenant)
        │
        ├── BRAND (10DLC Registration)
        │   └── Carrier-approved sender identity
        │
        ├── CAMPAIGN (Approved Message Template)
        │   └── Pre-approved use case
        │
        └── PHONE NUMBERS (Rotating Pool)
            └── Campaign-assigned sending numbers
```

**Why This Structure Matters:**

- **Tenant Isolation**: Each sub-group is hermetically sealed — no cross-tenant data bleeding
- **Compliance Tracking**: Per-tenant 10DLC registration and carrier approval
- **Cost Attribution**: Separate billing per tenant
- **Number Rotation**: Prevents rate limiting through phone pool rotation

### THE LOOP: 30-Day Engagement Cadence

```text
THE LOOP SCHEDULE
═════════════════

DAY   WORKER    TOUCH TYPE    PURPOSE
───   ──────    ──────────    ───────
 1    GIANNA    Opener        Initial contact, spark curiosity
 3    GIANNA    Nudge         Follow-up if no response
 5    GIANNA    Value         Share insight, build rapport
 7    CATHY     Nudge         Personalized engagement
10    CATHY     Value         Deeper value demonstration
14    SABRINA   Close         Booking focus, call to action
21    SABRINA   Call          Direct phone contact attempt
28    SABRINA   SMS           Final SMS touchpoint
30    SABRINA   Call          Final call attempt

═════════════════════════════════════════════════════════════

WORKER ROLES:

  GIANNA (Opener)
  ├── Email capture specialist
  ├── Question answering
  └── Initial response handling

  CATHY (Nurturer)
  ├── Objection handling
  ├── Value demonstration
  └── Relationship building

  SABRINA (Closer)
  ├── Booking calls
  ├── Strategy sessions
  └── Call queue routing
```

### Response Classification → Priority Routing

When a lead responds to an SMS, AI classification determines the next action:

```text
INBOUND SMS CLASSIFICATION
══════════════════════════

RESPONSE TYPE        LABEL      ROUTED TO     PRIORITY
─────────────        ─────      ─────────     ────────

Email captured   →   GOLD   →   SABRINA   →   10 (Highest)
Called back      →   GOLD   →   SABRINA   →   10
Interested       →   HOT    →   SABRINA   →   9
Question asked   →   WARM   →   GIANNA    →   8
Needs help       →   WARM   →   GIANNA    →   8
Thank you        →   WARM   →   GIANNA    →   5
Objection        →   COLD   →   CATHY     →   4
Opt-out (STOP)   →   DNC    →   (Remove)  →   N/A


GOLD = Immediate call queue + priority routing
HOT  = Fast-track to closer
WARM = Continue nurture sequence
COLD = Extended nurture / re-engagement
DNC  = Compliance removal + audit log
```

### Channel Performance Metrics

| Metric | SMS (SignalHouse) | Email (Comparison) |
| --- | --- | --- |
| Open rate | 98% | 20% |
| Response time | 45 seconds avg | 4-24 hours |
| Response rate | 10-15% | 1-3% |
| Positive response | 40% of responses | 20% of responses |
| Cost per message | ~$0.01 | ~$0.001 |

### Key Implementation Files

- `apps/front/src/app/api/webhook/signalhouse/route.ts` — Main webhook handler (1,838 lines)
- `apps/front/src/app/api/gianna/sms-webhook/route.ts` — GIANNA classification (750 lines)
- `apps/front/src/lib/ai/cadence-engine.ts` — THE LOOP automation (477 lines)
- `apps/front/src/lib/execution-flow.ts` — Pipeline orchestration (828 lines)
- `apps/front/src/lib/signalhouse/client.ts` — SignalHouse API client

---

## The Compounding Pipeline: Complete Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 1: DISCOVERY                                                         │
│  ══════════════════                                                         │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  USBizData  │  Select industry + geography                              │
│  │  Registry   │  ────────────────────────────►  CSV Export               │
│  └─────────────┘                                                           │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │    /api/    │  Parse CSV → Validate fields                              │
│  │   leads/    │  ────────────────────────────►  1K batch blocks          │
│  │   import    │                                                           │
│  └─────────────┘                                                           │
│                                                                             │
│  STATUS: RAW → DATA_PREP                                                   │
│  COST: $0.01/lead                                                          │
│  OUTPUT: 2,000 raw business records                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 2: ENRICHMENT                                                        │
│  ═══════════════════                                                        │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │   Entity    │  Apply 53 regex patterns                                  │
│  │   Filter    │  ────────────────────────────►  Remove LLCs, Trusts      │
│  └─────────────┘                                   (~10% filtered)         │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │ Perplexity  │  Verify business active                                   │
│  │ Verification│  ────────────────────────────►  Find owner name          │
│  └─────────────┘                                                           │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  Tracerfiy  │  Skip trace with address                                  │
│  │ Skip Trace  │  ────────────────────────────►  Extract phones/emails    │
│  └─────────────┘                                                           │
│                                                                             │
│  STATUS: ENRICHING → ENRICHED                                              │
│  COST: $0.02/lead                                                          │
│  OUTPUT: 1,260 leads with verified mobile phones (70% of 1,800)           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 3: ENGAGEMENT                                                        │
│  ═══════════════════                                                        │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │Contactability  Has mobile? ──► SMS CAMPAIGN (primary)                  │
│  │   Filter    │  Has landline? ──► CALL QUEUE (secondary)                │
│  └─────────────┘  Email only? ──► EMAIL NURTURE (tertiary)                │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  Template   │  Match industry → stage → variables                       │
│  │  Matching   │  ────────────────────────────►  Personalized message     │
│  └─────────────┘                                                           │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│                                                                             │
│  ┌─────────────┐   Day 1-5                                                 │
│  │  THE LOOP   │   GIANNA: Opener → Nudge → Value                         │
│  │  Deployment │   Day 7-10                                                │
│  │             │   CATHY: Personalized nurture                            │
│  │             │   Day 14-30                                               │
│  │             │   SABRINA: Close → Book → Call                           │
│  └─────────────┘                                                           │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  Response   │  Classify intent                                          │
│  │Classification  ────────────────────────────►  Priority routing         │
│  └─────────────┘                                                           │
│                                                                             │
│  STATUS: DEPLOYED → RESPONDED → BOOKED                                     │
│  OUTPUT: 12 booked meetings from 2,000 initial leads                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Compounding Metrics Framework

### Funnel Economics (Per 2,000 Leads)

| Stage | Description | Count | Conversion Rate |
| --- | --- | --- | --- |
| Discovery | Raw leads imported | 2,000 | 100% (baseline) |
| Filter | After entity removal | 1,800 | 90% of imported |
| Enrichment | With verified mobile | 1,260 | 70% of filtered |
| Deployed | SMS sent | 1,260 | 100% of enriched |
| Delivered | SMS received | 1,184 | 94% delivery rate |
| Responded | Replies received | 118 | 10% response rate |
| Positive | Warm/hot responses | 47 | 40% of responses |
| Booked | Meetings scheduled | 12 | 25% of positive |

### Cost Analysis

| Component | Unit Cost | Volume | Total Cost |
| --- | --- | --- | --- |
| UsBizData | $0.01 | 2,000 | $20 |
| Tracerfiy | $0.02 | 1,800 | $36 |
| SignalHouse SMS | ~$0.01 | 1,260+ | ~$15-30 |
| **Discovery + Enrichment** | | | **$56** |
| **Total with Engagement** | | | **$71-86** |
| **Cost Per Meeting** | | | **~$6-7** |

### Why The Model Compounds

**1. Data Quality Multiplier**

Each layer filters and enhances. Raw records become verified contacts. Verified contacts become real-time conversations.

```text
Raw (2,000) → Filtered (1,800) → Enriched (1,260) → Responsive (118)
```

**2. Channel Efficiency**

SMS achieves 98% open rate vs email's 20%. Same lead, 5x more engagement opportunity.

```text
1,260 SMS sent × 98% opened = 1,235 seen
1,260 emails sent × 20% opened = 252 seen
```

**3. AI Classification**

Real-time intent scoring routes positive responses to closers immediately. No manual lead review bottleneck.

```text
Response → Classification (< 1 sec) → Priority Queue → Closer
```

**4. 30-Day Persistence**

THE LOOP maintains contact over 30 days. Cold leads become warm through consistent, personalized touches.

```text
Day 1: 5% respond
Day 7: Cumulative 8% respond
Day 14: Cumulative 10% respond
Day 30: Cumulative 12-15% respond
```

---

## Growth Scaling Model

### Current Capacity

| Constraint | Limit | Notes |
| --- | --- | --- |
| Daily skip trace | 2,000 leads | API rate limit |
| Batch size | 250 leads | Optimal processing |
| SMS per number/day | 2,000 messages | Carrier limit |
| Monthly active pool | 20,000 leads | Recommended ceiling |

### Scaling Projections

| Scale | Leads/Month | Enrichment Cost | Expected Meetings | Cost/Meeting |
| --- | --- | --- | --- | --- |
| Current | 2,000 | $56 | 12 | $4.67 |
| 10x | 20,000 | $560 | 120 | $4.67 |
| 50x | 100,000 | $2,800 | 600 | $4.67 |
| 100x | 200,000 | $5,600 | 1,200 | $4.67 |

**Key Insight**: Cost per meeting remains constant as you scale because the conversion rates hold across volume. The model is linearly scalable.

### Scaling Considerations

1. **Phone Pool Expansion**: Add sending numbers proportionally (1 number per 2,000 daily SMS)
2. **Worker Capacity**: AI workers scale automatically with API capacity
3. **Webhook Processing**: Current architecture handles 10,000+ events/hour
4. **Database Storage**: Leads table optimized for millions of records

---

## Target Metrics Dashboard

### Primary KPIs

| Metric | Target | Current Benchmark |
| --- | --- | --- |
| Mobile match rate | > 70% | 70-85% |
| SMS delivery rate | > 94% | 94-96% |
| Response rate | > 10% | 10-15% |
| Positive response rate | > 40% | 40-50% |
| Meeting conversion | > 25% | 25-30% |
| Cost per meeting | < $10 | $4-7 |

### Health Indicators

| Indicator | Healthy | Warning | Critical |
| --- | --- | --- | --- |
| Delivery rate | > 94% | 90-94% | < 90% |
| Opt-out rate | < 3% | 3-5% | > 5% |
| Spam reports | < 0.1% | 0.1-0.3% | > 0.3% |
| Response time | < 60s | 60-120s | > 120s |

---

## Summary: The Ecosystem Advantage

```text
THE COMPOUNDING EFFECT
══════════════════════

             ┌─────────────────────────────────────────────────────┐
             │                                                     │
   INPUT     │  $0.03 per lead (discovery + enrichment)           │
             │                                                     │
             └─────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
             ┌─────────────────────────────────────────────────────┐
             │                                                     │
  PROCESS    │  UsBizData → Tracerfiy → SignalHouse               │
             │  (Foundation)  (Intelligence)  (Activation)        │
             │                                                     │
             └─────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
             ┌─────────────────────────────────────────────────────┐
             │                                                     │
   OUTPUT    │  $4-7 per booked meeting                           │
             │  12 meetings per 2,000 leads                       │
             │  Linearly scalable to 200K+ leads/month            │
             │                                                     │
             └─────────────────────────────────────────────────────┘
```

**The ecosystem compounds because each layer adds multiplicative value:**

1. **UsBizData** provides the *right targets* (verified businesses in target industries)
2. **Tracerfiy** provides the *right contact method* (verified mobile phones)
3. **SignalHouse** provides the *right channel* (98% visibility + AI routing)

Together, they create a predictable, scalable pipeline from raw business data to booked meetings.

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Source Files: See individual section references*
