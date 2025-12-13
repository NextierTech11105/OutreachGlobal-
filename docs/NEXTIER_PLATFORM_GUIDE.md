# NEXTIER OUTREACH PLATFORM
## Complete End-to-End Deal Origination System

---

```
    ╔═══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                               ║
    ║     ███╗   ██╗███████╗██╗  ██╗████████╗██╗███████╗██████╗                     ║
    ║     ████╗  ██║██╔════╝╚██╗██╔╝╚══██╔══╝██║██╔════╝██╔══██╗                    ║
    ║     ██╔██╗ ██║█████╗   ╚███╔╝    ██║   ██║█████╗  ██████╔╝                    ║
    ║     ██║╚██╗██║██╔══╝   ██╔██╗    ██║   ██║██╔══╝  ██╔══██╗                    ║
    ║     ██║ ╚████║███████╗██╔╝ ██╗   ██║   ██║███████╗██║  ██║                    ║
    ║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚══════╝╚═╝  ╚═╝                    ║
    ║                                                                               ║
    ║            10X OUTREACH VELOCITY · AI-POWERED DEAL ORIGINATION                ║
    ║                                                                               ║
    ╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA ORCHESTRATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│    │   DATALAKE   │────▶│  WAREHOUSE   │────▶│  ENRICHMENT  │────▶│   CAMPAIGN   │ │
│    │   5.5M+ B2B  │     │  15 SECTORS  │     │    ENGINE    │     │   DISPATCH   │ │
│    │   Records    │     │  100+ Subs   │     │   9 Phases   │     │  Omni-Chan   │ │
│    └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘ │
│           │                    │                    │                    │          │
│           ▼                    ▼                    ▼                    ▼          │
│    ┌──────────────────────────────────────────────────────────────────────────────┐ │
│    │                        AI ORCHESTRATION BUS                                  │ │
│    │   Gianna (SMS/B2B)  ·  Sabrina (Email/Residential)  ·  Signal Processing    │ │
│    └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

# CHAPTER 1: THE DATALAKE

## What Lives in the Datalake

The Nextier Datalake is the foundation of all outreach operations. Think of it as a massive reservoir of business intelligence that feeds every campaign you run.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATALAKE CONTENTS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   📊 5.5 MILLION+ NY BUSINESS RECORDS                               │
│   ├── Business Name, DBA, Trade Names                              │
│   ├── SIC Codes (Industry Classification)                          │
│   ├── Physical & Mailing Addresses                                 │
│   ├── Phone Numbers (Primary, Secondary)                           │
│   ├── Owner Names & Registered Agents                              │
│   └── Filing Dates, Status, Entity Type                            │
│                                                                     │
│   🏠 REAL ESTATE PROPERTY DATA                                      │
│   ├── 150M+ Property Records (RealEstateAPI)                       │
│   ├── Owner Information & Mailing Addresses                        │
│   ├── Property Valuations (AVM)                                    │
│   ├── Mortgage & Lien Information                                  │
│   ├── Equity Calculations                                          │
│   └── Motivated Seller Flags (19 Types)                            │
│                                                                     │
│   👤 APOLLO B2B INTELLIGENCE                                        │
│   ├── 270M+ Contact Profiles                                       │
│   ├── Company Technographics                                       │
│   ├── Decision Maker Identification                                │
│   ├── Intent Signals                                               │
│   └── Email Verification Status                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# CHAPTER 2: THE DATA WAREHOUSE

## Sector-Based Organization

The warehouse organizes raw datalake records into **15 business sectors** with **100+ subsectors**, each mapped to SIC codes for precise targeting.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              B2B SECTOR WAREHOUSE                                   │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   🏗️  CONSTRUCTION           │   🏭 MANUFACTURING        │   🚛 TRANSPORTATION      │
│   ├── General Contractors    │   ├── Food Processing    │   ├── Trucking          │
│   ├── Specialty Trades       │   ├── Metal Fabrication  │   ├── Warehousing       │
│   ├── Heavy Civil            │   ├── Machinery          │   └── Logistics         │
│   └── Demolition             │   └── Electronics        │                          │
│                              │                          │                          │
│   🍽️  FOOD & BEVERAGE        │   💼 PROFESSIONAL SVCS   │   🏥 HEALTHCARE          │
│   ├── Restaurants            │   ├── Legal              │   ├── Medical Practices │
│   ├── Bars & Nightclubs      │   ├── Accounting         │   ├── Dental            │
│   ├── Catering               │   ├── Consulting         │   └── Home Health       │
│   └── Food Trucks            │   └── Marketing          │                          │
│                              │                          │                          │
│   🏠 REAL ESTATE             │   💰 FINANCIAL SERVICES  │   🎓 EDUCATION           │
│   ├── Brokerages             │   ├── Investment         │   ├── Private Schools   │
│   ├── Property Management    │   ├── Insurance          │   ├── Tutoring          │
│   └── Development            │   └── Lending            │   └── Training          │
│                              │                          │                          │
│   🛒 RETAIL                  │   🔧 AUTO & REPAIR       │   💇 PERSONAL SERVICES   │
│   ├── Clothing               │   ├── Dealerships        │   ├── Salons            │
│   ├── Electronics            │   ├── Auto Repair        │   ├── Fitness           │
│   ├── Home Goods             │   └── Parts              │   └── Spas              │
│                              │                          │                          │
│   💻 TECHNOLOGY              │   🌿 AGRICULTURE         │   ⚡ ENERGY              │
│   ├── Software               │   ├── Farms              │   ├── Oil & Gas         │
│   ├── IT Services            │   ├── Nurseries          │   ├── Solar             │
│   └── Hardware               │   └── Equipment          │   └── Utilities         │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

# CHAPTER 3: THE ENRICHMENT ENGINE

## 9-Phase Identity & Signal Processing Pipeline

Every record passes through a sophisticated 9-phase enrichment pipeline that transforms raw data into actionable intelligence.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                     NEXTIER DATA ENRICHMENT ENGINE                                    ║
║                        9-Phase Processing Pipeline                                    ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   PHASE 1: SIGNAL CAPTURE                                                            ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Raw data enters → Source tagged → Timestamp applied → Queue assigned           │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 2: IDENTITY RESOLUTION                                                       ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Name normalization → Fuzzy matching → Duplicate detection → Master record     │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 3: CONTACT VERIFICATION                                                      ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Phone validation → Email verification → Address standardization → DNC check   │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 4: SKIP TRACE ENRICHMENT                                                     ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Missing phones found → Mobile prioritized → Emails discovered → Score ranked  │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 5: ROLE CLASSIFICATION                                                       ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Decision maker? → Owner/CEO/Partner → Sales lead? → Influence level scored    │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 6: PROPERTY LINKING                                                          ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Real estate holdings → Equity analysis → Portfolio value → Investor flags     │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 7: INTENT SIGNALS                                                            ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Recent activity → Buying signals → Selling indicators → Timing score          │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 8: CAMPAIGN ROUTING                                                          ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Agent assignment → Channel selection → Template match → Priority queue        │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                        ▼                                             ║
║   PHASE 9: LEAD CARD GENERATION                                                      ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Full profile built → Score calculated → Actionable intel → Ready for outreach │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# CHAPTER 4: AI AGENTS

## Gianna & Sabrina - Your AI Outreach Team

The platform employs two specialized AI agents, each optimized for specific channels and use cases.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                               AI AGENT ROUTING                                      │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   ┌─────────────────────────────────┐    ┌─────────────────────────────────────┐   │
│   │           GIANNA                │    │           SABRINA                   │   │
│   │     📱 SMS SPECIALIST           │    │     📧 EMAIL SPECIALIST             │   │
│   ├─────────────────────────────────┤    ├─────────────────────────────────────┤   │
│   │                                 │    │                                     │   │
│   │  FOCUS:                         │    │  FOCUS:                             │   │
│   │  • Commercial Real Estate       │    │  • Residential Real Estate          │   │
│   │  • B2B Deal Sourcing            │    │  • Consumer Outreach                │   │
│   │  • Business Broker Deals        │    │  • Follow-up Sequences              │   │
│   │                                 │    │                                     │   │
│   │  TARGETS:                       │    │  TARGETS:                           │   │
│   │  • Decision Makers              │    │  • Homeowners                       │   │
│   │  • Business Owners              │    │  • Property Sellers                 │   │
│   │  • CEOs & Partners              │    │  • Investment Inquiries             │   │
│   │  • Investors                    │    │                                     │   │
│   │                                 │    │                                     │   │
│   │  CHANNEL: SMS (Primary)         │    │  CHANNEL: Email (Primary)           │   │
│   │  PERSONALITY: Brooklyn Bestie   │    │  PERSONALITY: Professional          │   │
│   │  RESPONSE: Conversational       │    │  RESPONSE: Detailed                 │   │
│   │                                 │    │                                     │   │
│   └─────────────────────────────────┘    └─────────────────────────────────────┘   │
│                                                                                    │
│                        AUTOMATIC ROUTING LOGIC                                     │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                            │   │
│   │   IF (role = owner | CEO | partner | investor) → GIANNA (SMS)              │   │
│   │   IF (role = sales_manager | executive) → SABRINA (Email)                  │   │
│   │   IF (property_type = commercial) → GIANNA (SMS)                           │   │
│   │   IF (property_type = residential) → SABRINA (Email)                       │   │
│   │   DEFAULT → SABRINA (Email)                                                │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

# CHAPTER 5: BATCH PROCESSING

## High-Volume Outreach at Scale

The platform is built for volume. Process up to **2,000 records per day** in intelligent batches of 250.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                           BATCH PROCESSING SYSTEM                                     ║
║                      250 Per Batch · 2,000 Per Day · 10X Velocity                    ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │                          DAILY CAPACITY                                        │ ║
║   ├────────────────────────────────────────────────────────────────────────────────┤ ║
║   │                                                                                │ ║
║   │    SKIP TRACE:     █████████████████████████████████████████  2,000/day        │ ║
║   │    SMS QUEUE:      █████████████████████████████████████████  2,000/day        │ ║
║   │    BATCH SIZE:     ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  250/batch         │ ║
║   │    BATCHES/DAY:    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  8 batches         │ ║
║   │                                                                                │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                      ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │                        BATCH JOB LIFECYCLE                                     │ ║
║   ├────────────────────────────────────────────────────────────────────────────────┤ ║
║   │                                                                                │ ║
║   │    ○ PENDING ──▶ ◐ PROCESSING ──▶ ⬤ COMPLETED                                  │ ║
║   │         │              │                │                                      │ ║
║   │         │              ▼                ▼                                      │ ║
║   │         │         ◐ PAUSED         ⬤ RESULTS                                   │ ║
║   │         │              │                │                                      │ ║
║   │         ▼              ▼                ▼                                      │ ║
║   │    ⏰ SCHEDULED    ✗ FAILED        📊 STATS                                    │ ║
║   │                                                                                │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                      ║
║   SCHEDULED BATCH RUNS:                                                              ║
║   ┌────────────────────────────────────────────────────────────────────────────────┐ ║
║   │  • Schedule jobs for specific dates/times                                      │ ║
║   │  • Auto-run at optimal send times                                              │ ║
║   │  • Respect daily limits automatically                                          │ ║
║   │  • Queue overflow to next day                                                  │ ║
║   └────────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# CHAPTER 6: HUMAN-IN-LOOP SMS WORKFLOW

## Review, Edit, Approve, Deploy

Every SMS goes through a human-in-loop process before sending. This ensures quality, compliance, and personalization.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        HUMAN-IN-LOOP SMS WORKFLOW                                   │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   STEP 1: DRAFT QUEUE                                                              │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                            │   │
│   │   📝 AI generates initial messages using templates                          │   │
│   │   📝 Variables populated (first_name, property_address, etc.)               │   │
│   │   📝 Personality applied (Brooklyn Bestie, Professional, etc.)              │   │
│   │   📝 Messages queued for human review                                       │   │
│   │                                                                            │   │
│   │   STATUS: DRAFT                                                            │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                        ▼                                           │
│   STEP 2: PREVIEW & EDIT                                                           │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                            │   │
│   │   👁️ Human reviews each message                                            │   │
│   │   ✏️ Edit for personalization                                               │   │
│   │   ✏️ Adjust tone if needed                                                  │   │
│   │   ✏️ Fix any AI errors                                                      │   │
│   │                                                                            │   │
│   │   ACTIONS: Edit | Skip | Flag for Review                                   │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                        ▼                                           │
│   STEP 3: APPROVE                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                            │   │
│   │   ✅ Approve individual messages                                           │   │
│   │   ✅ Bulk approve entire campaign                                          │   │
│   │   ❌ Reject problematic messages                                           │   │
│   │                                                                            │   │
│   │   STATUS: APPROVED                                                         │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                        ▼                                           │
│   STEP 4: DEPLOY                                                                   │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                            │   │
│   │   🚀 Deploy approved messages to send queue                                 │   │
│   │   ⏰ Optional: Schedule for specific time                                   │   │
│   │   📊 Messages move to PENDING status                                        │   │
│   │   📤 Auto-send within scheduled hours                                       │   │
│   │                                                                            │   │
│   │   STATUS: PENDING → PROCESSING → SENT                                      │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Message Status Flow

```
     ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
     │  DRAFT   │───▶│ APPROVED │───▶│ PENDING  │───▶│PROCESSING│───▶│   SENT   │
     └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
           │                                                               │
           ▼                                                               │
     ┌──────────┐                                                          │
     │ REJECTED │◀─────────────────────────────────────────────────────────┘
     └──────────┘                                         (if failed)
```

---

# CHAPTER 7: OMNI-CHANNEL CAMPAIGNS

## SMS + Email + Voice - All Coordinated

The platform supports true omni-channel outreach with coordinated messaging across all channels.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                          OMNI-CHANNEL CAMPAIGN SYSTEM                                 ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │                          CHANNEL CAPABILITIES                                │   ║
║   ├──────────────────────────────────────────────────────────────────────────────┤   ║
║   │                                                                              │   ║
║   │   📱 SMS (SignalHouse)                                                       │   ║
║   │   ├── Bulk sending (2,000/day)                                              │   ║
║   │   ├── 2-way conversations                                                   │   ║
║   │   ├── Auto-response handling                                                │   ║
║   │   ├── Opt-out management                                                    │   ║
║   │   └── Delivery tracking                                                     │   ║
║   │                                                                              │   ║
║   │   📧 EMAIL (SendGrid)                                                        │   ║
║   │   ├── Drip sequences                                                        │   ║
║   │   ├── Template library                                                      │   ║
║   │   ├── Open/click tracking                                                   │   ║
║   │   ├── Bounce handling                                                       │   ║
║   │   └── Unsubscribe management                                                │   ║
║   │                                                                              │   ║
║   │   📞 VOICE (Twilio)                                                          │   ║
║   │   ├── Power dialer                                                          │   ║
║   │   ├── Voicemail detection                                                   │   ║
║   │   ├── Call recording                                                        │   ║
║   │   ├── AI transcription                                                      │   ║
║   │   └── Scheduled callbacks                                                   │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │                    COORDINATED SEQUENCE EXAMPLE                              │   ║
║   ├──────────────────────────────────────────────────────────────────────────────┤   ║
║   │                                                                              │   ║
║   │   DAY 1:  📱 Initial SMS (Gianna)                                            │   ║
║   │           "Hi {first_name}! Quick question about your property on..."        │   ║
║   │                                                                              │   ║
║   │   DAY 2:  📧 Follow-up Email (Sabrina)                                       │   ║
║   │           [Professional property inquiry with valuation offer]               │   ║
║   │                                                                              │   ║
║   │   DAY 4:  📱 SMS Nudge (Gianna)                                              │   ║
║   │           "Just checking in - did you see my message about..."               │   ║
║   │                                                                              │   ║
║   │   DAY 7:  📞 Phone Call (Power Dialer)                                       │   ║
║   │           [Personal outreach with talking points]                            │   ║
║   │                                                                              │   ║
║   │   DAY 10: 📧 Value Email (Sabrina)                                           │   ║
║   │           [Market report or comparable sales data]                           │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# CHAPTER 8: AI RESPONSE HANDLING

## Classification, Prioritization, and Automation

When responses come in, AI handles classification, prioritization, and can even auto-respond with high confidence.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                        AI RESPONSE HANDLING SYSTEM                                  │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   INCOMING RESPONSE                                                                │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                            │   │
│   │   📨 Response received → AI Analysis begins                                │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                           │
│                    ┌───────────────────┼───────────────────┐                       │
│                    ▼                   ▼                   ▼                       │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐             │
│   │    CLASSIFY        │ │    PRIORITIZE      │ │      ROUTE         │             │
│   ├────────────────────┤ ├────────────────────┤ ├────────────────────┤             │
│   │                    │ │                    │ │                    │             │
│   │ • Interested       │ │ • HOT (P1)         │ │ • Auto-respond     │             │
│   │ • Not Interested   │ │ • WARM (P2)        │ │ • Human review     │             │
│   │ • Question         │ │ • COLD (P3)        │ │ • Escalate         │             │
│   │ • Appointment      │ │ • DEAD (P4)        │ │ • Archive          │             │
│   │ • Opt-out          │ │                    │ │                    │             │
│   │ • Wrong Number     │ │                    │ │                    │             │
│   │                    │ │                    │ │                    │             │
│   └────────────────────┘ └────────────────────┘ └────────────────────┘             │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │                      CONFIDENCE-BASED AUTOMATION                           │   │
│   ├────────────────────────────────────────────────────────────────────────────┤   │
│   │                                                                            │   │
│   │   HIGH CONFIDENCE (90%+)    → Auto-respond immediately                     │   │
│   │   ├── "STOP" → Auto-opt-out + confirmation                                │   │
│   │   ├── "What's the address?" → Auto-send property details                  │   │
│   │   └── "Call me at 2pm" → Auto-schedule + confirm                          │   │
│   │                                                                            │   │
│   │   MEDIUM CONFIDENCE (70-89%) → Suggest response + human approval          │   │
│   │   ├── AI drafts response                                                  │   │
│   │   ├── Human reviews in 1 click                                            │   │
│   │   └── Edit if needed, send                                                │   │
│   │                                                                            │   │
│   │   LOW CONFIDENCE (<70%)     → Queue for human handling                     │   │
│   │   ├── Flag as needs review                                                │   │
│   │   ├── Assign to team member                                               │   │
│   │   └── Full manual response                                                │   │
│   │                                                                            │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

# CHAPTER 9: THE COMPLETE USER JOURNEY

## Dashboard to Deal - Step by Step

Here's how a user moves through the platform from start to finish.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                         COMPLETE USER JOURNEY                                         ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  1️⃣  DASHBOARD                                                               │   ║
║   │      User lands on dashboard with quick actions                              │   ║
║   │      • Import Leads • Search Properties • Property Valuation • Add Lead      │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  2️⃣  LEAD ACQUISITION                                                        │   ║
║   │      Choose acquisition method:                                              │   ║
║   │      • Import CSV → Leads/Import                                            │   ║
║   │      • Search Apollo → Leads/Import Companies                               │   ║
║   │      • Property Search → Properties page                                    │   ║
║   │      • Manual Entry → Leads/Create                                          │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  3️⃣  PROPERTY SEARCH & FILTERING                                             │   ║
║   │      Apply motivated seller filters:                                         │   ║
║   │      • Pre-Foreclosure • Absentee Owner • High Equity • Vacant              │   ║
║   │      • Tax Lien • Reverse Mortgage • Out of State • Corporate Owned         │   ║
║   │      Select properties → Add to stack                                        │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  4️⃣  SKIP TRACE (250 per batch)                                              │   ║
║   │      • Select properties                                                    │   ║
║   │      • Click "Skip Trace"                                                   │   ║
║   │      • System finds: Phones, Emails, Mailing Addresses                      │   ║
║   │      • Mobile phones prioritized for SMS                                    │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  5️⃣  VALUATION REPORT (Optional)                                             │   ║
║   │      • Generate professional property valuation                             │   ║
║   │      • Include comparable sales                                             │   ║
║   │      • Add partner coupons                                                  │   ║
║   │      • Create shareable report link                                         │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  6️⃣  PUSH TO SMS QUEUE                                                       │   ║
║   │      • Select template or AI generate                                       │   ║
║   │      • Choose personality (Brooklyn Bestie, Professional)                   │   ║
║   │      • Preview messages                                                     │   ║
║   │      • Approve and deploy                                                   │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  7️⃣  CAMPAIGN MANAGEMENT                                                     │   ║
║   │      • Monitor send status                                                  │   ║
║   │      • View delivery rates                                                  │   ║
║   │      • Track responses                                                      │   ║
║   │      • Manage conversations in Inbox                                        │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  8️⃣  AI RESPONSE HANDLING                                                    │   ║
║   │      • Gianna classifies incoming responses                                 │   ║
║   │      • Auto-respond to high-confidence replies                              │   ║
║   │      • Flag hot leads for immediate follow-up                               │   ║
║   │      • Schedule calls for interested prospects                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  9️⃣  CALL CENTER / POWER DIALER                                              │   ║
║   │      • Hot leads queued for calling                                         │   ║
║   │      • Power dialer auto-dials                                              │   ║
║   │      • Call recording & transcription                                       │   ║
║   │      • AI voicemail detection                                               │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                        ▼                                             ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  🔟  DEAL ORIGINATION                                                         │   ║
║   │      • Convert leads to opportunities                                       │   ║
║   │      • Track deal progress                                                  │   ║
║   │      • Analytics & reporting                                                │   ║
║   │      • Partnership referrals                                                │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# CHAPTER 10: MESSAGE TEMPLATES

## Pre-Loaded SMS Templates for Every Scenario

The platform includes pre-loaded templates for initial outreach, optimized for different lead types.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           SMS TEMPLATE LIBRARY                                      │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   📱 INITIAL OUTREACH TEMPLATES                                                    │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │  PROPERTY OWNER (Brooklyn Bestie)                                          │   │
│   │  "Hi {first_name}! Quick Q - is 123 Main St something you'd consider       │   │
│   │   selling if the numbers made sense? No pressure, just checking in! -G"    │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │  ABSENTEE OWNER                                                            │   │
│   │  "Hey {first_name}! Noticed you have a property on Main St but live        │   │
│   │   elsewhere. Ever think about selling? Got buyers looking in the area!"    │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │  HIGH EQUITY OWNER                                                         │   │
│   │  "Hi {first_name}! Your property has built up some serious equity.         │   │
│   │   Curious if you've thought about cashing in? Got some options for you!"   │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │  BUSINESS OWNER (B2B)                                                      │   │
│   │  "Hi {first_name}! Quick question about {company_name} - are you the       │   │
│   │   right person to chat with about [topic]? Just 2 mins if you're open!"    │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │  INVESTOR                                                                  │   │
│   │  "Hey {first_name}! Saw you have {property_count} properties in the area.  │   │
│   │   Got an off-market deal that might interest you. Worth a quick call?"     │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│   TEMPLATE VARIABLES:                                                              │
│   {first_name} {last_name} {company_name} {property_address} {property_count}      │
│   {estimated_value} {equity} {neighborhood} {city} {state}                         │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

# CHAPTER 11: PARTNERSHIPS

## Local Business Integration

The Partnerships module lets you create relationships with local service providers, attaching their offers to valuation reports.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                          PARTNERSHIP CATEGORIES                                     │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│   🔧 HOME SERVICES      │   🚛 MOVING & STORAGE    │   🔍 INSPECTION              │
│   ├── HVAC              │   ├── Moving Companies   │   ├── Home Inspectors       │
│   ├── Plumbing          │   ├── Storage Facilities │   └── Pest Inspection       │
│   ├── Electrical        │   └── Junk Removal       │                              │
│   └── Handyman          │                          │   🏛️ MORTGAGE & LENDING      │
│                          │   🌿 LANDSCAPING         │   ├── Mortgage Brokers      │
│   ✨ CLEANING            │   ├── Lawn Care          │   ├── Hard Money            │
│   ├── House Cleaning    │   ├── Tree Service       │   └── Private Lenders       │
│   ├── Carpet            │   └── Irrigation         │                              │
│   └── Window            │                          │   ⚖️ LEGAL                   │
│                          │   🛡️ INSURANCE           │   ├── Real Estate Attorneys │
│   📋 TITLE & ESCROW      │   ├── Home Insurance    │   ├── Estate Planning       │
│   ├── Title Companies   │   ├── Life Insurance    │   └── Business Law          │
│   └── Escrow Services   │   └── Umbrella          │                              │
│                          │                          │                              │
│   HOW IT WORKS:                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐   │
│   │  1. Add local business partners                                            │   │
│   │  2. Create exclusive offers/coupons                                        │   │
│   │  3. Attach to valuation reports                                            │   │
│   │  4. Track redemptions                                                      │   │
│   │  5. Build referral network                                                 │   │
│   └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

# CAPACITY SUMMARY

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                              PLATFORM CAPACITY                                        ║
║                           10X Volume · 10X Velocity                                  ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   DAILY LIMITS                                                                       ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  Skip Traces:        2,000 / day                                             │   ║
║   │  SMS Messages:       2,000 / day                                             │   ║
║   │  Email Sends:        10,000 / day (SendGrid)                                 │   ║
║   │  Property Searches:  Unlimited                                               │   ║
║   │  Valuation Reports:  Unlimited                                               │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   BATCH PROCESSING                                                                   ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  Batch Size:         250 records                                             │   ║
║   │  Batches Per Day:    8 batches                                               │   ║
║   │  Processing Time:    ~5 min per batch                                        │   ║
║   │  Scheduled Runs:     Unlimited                                               │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   DATA SOURCES                                                                       ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  NY Business Database:     5.5M+ records                                     │   ║
║   │  RealEstateAPI:            150M+ properties                                  │   ║
║   │  Apollo B2B:               270M+ contacts                                    │   ║
║   │  Skip Trace Coverage:      95%+ hit rate                                     │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   AI AGENTS                                                                          ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  Gianna:   SMS / B2B / Commercial                                            │   ║
║   │  Sabrina:  Email / Residential / Consumer                                    │   ║
║   │  Response: Auto-classify + suggest + approve                                 │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# CHAPTER 12: BASELINE AUTOMATIONS

## Built-In Retarget, Drip & Hot Lead Signals

The platform includes pre-configured automation rules that run in the background, ensuring no lead falls through the cracks.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                         BASELINE AUTOMATION RULES                                     ║
║                    Always On · Always Working · Never Miss a Lead                    ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  RULE 1: RETARGET NO-RESPONSE                                                │   ║
║   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   ║
║   │                                                                              │   ║
║   │  TRIGGER: No response after initial SMS                                      │   ║
║   │                                                                              │   ║
║   │  SEQUENCE:                                                                   │   ║
║   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │   ║
║   │  │  DAY 0      │───▶│  DAY 7      │───▶│  DAY 14     │───▶│  DAY 30     │    │   ║
║   │  │  Initial    │    │  Nudge #1   │    │  Nudge #2   │    │  Final Try  │    │   ║
║   │  │  SMS        │    │  SMS        │    │  SMS        │    │  SMS        │    │   ║
║   │  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    │   ║
║   │                                                                              │   ║
║   │  MESSAGES:                                                                   │   ║
║   │  • Day 7:  "Hey {first_name}, just circling back on my last msg..."         │   ║
║   │  • Day 14: "Still interested in chatting about {property}? LMK!"            │   ║
║   │  • Day 30: "Last try! If you ever want to discuss {property}, I'm here"     │   ║
║   │                                                                              │   ║
║   │  IF STILL NO RESPONSE → Move to COLD bucket, retry in 90 days               │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  RULE 2: NURTURE CONFIRMED CONTACT                                           │   ║
║   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   ║
║   │                                                                              │   ║
║   │  TRIGGER: Any response received OR confirmed working number                  │   ║
║   │                                                                              │   ║
║   │  ACTION:                                                                     │   ║
║   │  ✅ Mark phone as VERIFIED                                                   │   ║
║   │  ✅ Add to NURTURE drip sequence                                             │   ║
║   │  ✅ Increase lead score +20 points                                           │   ║
║   │  ✅ Enable multi-channel outreach (SMS + Email + Call)                       │   ║
║   │                                                                              │   ║
║   │  DRIP SEQUENCE:                                                              │   ║
║   │  • Day 3:  Value content email                                              │   ║
║   │  • Day 7:  Market update SMS                                                │   ║
║   │  • Day 14: Check-in call (power dialer queue)                               │   ║
║   │  • Day 21: Success story email                                              │   ║
║   │  • Day 30: Re-engagement SMS                                                │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  RULE 3: HOT LEAD - VALUATION REQUESTED                                      │   ║
║   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   ║
║   │                                                                              │   ║
║   │  TRIGGER: Valuation report or design blueprint generated/sent               │   ║
║   │                                                                              │   ║
║   │                   🔥🔥🔥 MAXIMUM PRIORITY 🔥🔥🔥                               │   ║
║   │                                                                              │   ║
║   │  WHY: Valuations indicate HIGH probability & profitability                   │   ║
║   │       - They're actively evaluating the property                             │   ║
║   │       - They're in decision-making mode                                      │   ║
║   │       - They're a situational target (timing is NOW)                         │   ║
║   │                                                                              │   ║
║   │  ACTION:                                                                     │   ║
║   │  🔥 Flag as HOT LEAD (Priority 1)                                            │   ║
║   │  🔥 Lead score +50 points                                                    │   ║
║   │  🔥 Queue for immediate follow-up call                                       │   ║
║   │  🔥 Send email confirmation with report link                                 │   ║
║   │  🔥 Notify sales team (Slack/SMS alert)                                      │   ║
║   │  🔥 Schedule follow-up for 24 hours if no response                           │   ║
║   │                                                                              │   ║
║   │  FOLLOW-UP SEQUENCE:                                                         │   ║
║   │  • Hour 0:   Report delivered + confirmation                                 │   ║
║   │  • Hour 24:  "Did you get a chance to review the report?"                    │   ║
║   │  • Hour 48:  Phone call attempt                                              │   ║
║   │  • Day 3:    "Any questions about the numbers?"                              │   ║
║   │  • Day 7:    "Still thinking about it? Happy to hop on a call"               │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  RULE 4: EMAIL CAPTURED - AUTO-SEND REPORT                                   │   ║
║   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   ║
║   │                                                                              │   ║
║   │  TRIGGER: Lead replies to SMS with their email address                       │   ║
║   │                                                                              │   ║
║   │  DETECTION PATTERNS:                                                         │   ║
║   │  • "send it to john@email.com"                                              │   ║
║   │  • "my email is john@email.com"                                             │   ║
║   │  • "john@email.com"                                                         │   ║
║   │  • Contains @ and .com/.net/.org/etc                                        │   ║
║   │                                                                              │   ║
║   │  ACTION:                                                                     │   ║
║   │  📧 Extract email from message                                               │   ║
║   │  📧 Validate email format                                                    │   ║
║   │  📧 Add email to lead profile                                                │   ║
║   │  📧 Auto-generate valuation report (if property exists)                      │   ║
║   │  📧 Send report to captured email                                            │   ║
║   │  📧 Reply via SMS: "Just sent it! Check your inbox 📧"                       │   ║
║   │  📧 Flag as HOT LEAD (they're engaged!)                                      │   ║
║   │                                                                              │   ║
║   │  FLOW:                                                                       │   ║
║   │  ┌─────────────────────────────────────────────────────────────────────────┐ │   ║
║   │  │                                                                         │ │   ║
║   │  │   SMS: "Hey want a free valuation report for your property?"            │ │   ║
║   │  │                           ▼                                             │ │   ║
║   │  │   REPLY: "Sure send to mike@gmail.com"                                  │ │   ║
║   │  │                           ▼                                             │ │   ║
║   │  │   AI: Detects email → Extracts → Validates                              │ │   ║
║   │  │                           ▼                                             │ │   ║
║   │  │   SYSTEM: Generates valuation → Sends email → Confirms via SMS          │ │   ║
║   │  │                           ▼                                             │ │   ║
║   │  │   LEAD: Flagged as HOT → Priority follow-up sequence activated          │ │   ║
║   │  │                                                                         │ │   ║
║   │  └─────────────────────────────────────────────────────────────────────────┘ │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  RULE 5: OPT-OUT HANDLING                                                    │   ║
║   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   ║
║   │                                                                              │   ║
║   │  TRIGGER: "STOP", "Unsubscribe", "Remove me", etc.                           │   ║
║   │                                                                              │   ║
║   │  ACTION:                                                                     │   ║
║   │  ❌ Immediately add to opt-out list                                          │   ║
║   │  ❌ Cancel all pending messages                                              │   ║
║   │  ❌ Send confirmation: "You've been unsubscribed. Reply START to re-join"    │   ║
║   │  ❌ Log opt-out for compliance                                               │   ║
║   │  ❌ Block future outreach across all channels                                │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
║   ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║   │  RULE 6: WRONG NUMBER HANDLING                                               │   ║
║   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   ║
║   │                                                                              │   ║
║   │  TRIGGER: "Wrong number", "Who is this", "Don't know that person"            │   ║
║   │                                                                              │   ║
║   │  ACTION:                                                                     │   ║
║   │  ⚠️ Mark phone as INVALID                                                    │   ║
║   │  ⚠️ Stop all SMS to this number                                              │   ║
║   │  ⚠️ Re-queue lead for re-skip-trace (find new number)                        │   ║
║   │  ⚠️ Send apology: "So sorry for the mixup! Have a great day."                │   ║
║   │                                                                              │   ║
║   └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

### Automation Priority Levels

```
   PRIORITY 1 (HOT)                    PRIORITY 2 (WARM)                  PRIORITY 3 (COLD)
   ━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━                  ━━━━━━━━━━━━━━━━

   🔥 Valuation requested              📧 Email captured                   ⏳ No response 30+ days
   🔥 Blueprint delivered              📱 Number confirmed                 ⏳ Soft bounce
   🔥 "Yes, interested" reply          💬 Engaged in conversation          ⏳ Inconclusive response
   🔥 "Call me" response               📅 Meeting scheduled
   🔥 Property inquiry                 🔄 Return visitor

   → Immediate follow-up               → 24-48 hour follow-up              → 90-day re-engagement
   → Phone call priority               → Multi-channel nurture             → Low-touch drip
   → Sales team alert                  → Automated drip                    → List cleanup review
```

---

## Quick Reference: Page Navigation

| Page | Purpose |
|------|---------|
| `/t/[team]/` | **Dashboard** - Quick actions, stats |
| `/t/[team]/leads` | **Lead Management** - All leads |
| `/t/[team]/leads/import-companies` | **Apollo Search** - B2B intelligence |
| `/t/[team]/properties` | **Property Search** - Motivated sellers |
| `/t/[team]/valuation` | **Property Valuation** - Reports |
| `/t/[team]/valuation-queue` | **Valuation Queue** - Batch delivery |
| `/t/[team]/campaigns` | **Campaign Director** - All campaigns |
| `/t/[team]/sms-queue` | **SMS Queue** - Message management |
| `/t/[team]/inbox` | **Unified Inbox** - All conversations |
| `/t/[team]/call-center` | **Call Center** - Power dialer |
| `/t/[team]/calendar` | **Calendar** - Scheduling |
| `/t/[team]/sectors` | **B2B Sectors** - Industry targeting |
| `/t/[team]/research-library` | **Research Library** - Saved reports |
| `/t/[team]/partnerships` | **Partnerships** - Local business offers |
| `/t/[team]/analytics` | **Analytics** - Performance metrics |
| `/t/[team]/settings` | **Settings** - Configuration |

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Platform: Nextier Outreach Global*
