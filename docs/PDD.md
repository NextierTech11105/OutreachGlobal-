# Nextier Platform - Product Design Document (PDD)

## Executive Summary

Nextier is a B2B sales automation platform that transforms raw business data into closed deals through AI-powered SMS outreach. The platform automates the entire sales pipeline from lead acquisition to appointment booking.

---

## Product Vision

**"From Data to Deal in 10 Days"**

Enable small sales teams to achieve enterprise-level outreach by combining:
- 7.3M+ business database access
- AI-powered SMS conversations
- Automated lead qualification
- Hot lead routing to human closers

---

## Target Users

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| **Business Broker** | Buys/sells small businesses | Find owners ready to exit |
| **M&A Advisor** | Facilitates acquisitions | Identify acquisition targets |
| **Insurance Agent** | Sells commercial policies | Reach business owners directly |
| **Commercial Lender** | Provides business loans | Find qualified borrowers |
| **SaaS Sales Rep** | Sells B2B software | Generate qualified meetings |

---

## Core User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                                  │
└─────────────────────────────────────────────────────────────────────┘

 DAY 1                    DAY 2-3                  DAY 4-7
 ─────                    ───────                  ───────
 ┌──────────┐            ┌──────────┐            ┌──────────┐
 │ UPLOAD   │            │ ENRICH   │            │ OUTREACH │
 │          │            │          │            │          │
 │ • CSV    │───────────▶│ • Skip   │───────────▶│ • SMS    │
 │ • Search │            │   Trace  │            │ • AI     │
 │ • Import │            │ • Tags   │            │ • Follow │
 └──────────┘            └──────────┘            └──────────┘
                                                       │
 DAY 10                   DAY 8-9                      │
 ──────                   ───────                      │
 ┌──────────┐            ┌──────────┐                  │
 │ DEAL     │            │ CALL     │                  │
 │          │            │          │◀─────────────────┘
 │ • Close  │◀───────────│ • Hot    │
 │ • Sign   │            │   Leads  │
 │ • Paid   │            │ • Book   │
 └──────────┘            └──────────┘
```

---

## Feature Categories

### 1. Data Acquisition
- **B2B Search**: Access 70M+ US businesses by industry, location, revenue
- **CSV Import**: Upload existing lead lists
- **Skip Trace**: Find owner's personal cell phone (not business line)
- **Property Cross-Reference**: Find owner's real estate holdings

### 2. Campaign Management
- **Sequences**: Multi-step campaigns (Initial → Follow-up → Nudge)
- **Templates**: Pre-built message library by industry
- **Scheduling**: Optimal send times, daily limits
- **A/B Testing**: Test message variants

### 3. AI Workers
- **GIANNA** (Opener): First touch, email capture, qualification
- **CATHY** (Nudger): Humor-based re-engagement for ghosted leads
- **SABRINA** (Closer): Appointment booking, objection handling
- **NEVA** (Researcher): Deep company research via Perplexity

### 4. Inbound Handling
- **Unified Inbox**: All channels in one view
- **AI Response**: Automatic reply generation
- **Sentiment Detection**: Identify hot vs cold responses
- **Email Capture**: Extract emails from replies

### 5. Pipeline Management
- **Lead Stages**: RAW → READY → QUEUED → SENT → REPLIED → BOOKED
- **Workflows**: Trigger-based automation
- **Call Queue**: Priority-sorted hot leads
- **Appointments**: Calendar integration

### 6. Analytics
- **Campaign Performance**: Open, reply, conversion rates
- **Pipeline Heatmap**: Visual deal flow
- **SMS Analytics**: Delivery, response metrics
- **Revenue Attribution**: Track deals to campaigns

---

## Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Response Rate** | 8-12% | % of SMS that get replies |
| **Positive Rate** | 40% | % of replies that are interested |
| **Appointment Rate** | 15% | % of positives that book calls |
| **Close Rate** | 25% | % of appointments that close |
| **Time to Deal** | 10 days | Average days from first touch |

---

## Competitive Positioning

| Feature | Nextier | SmarterContact | Podium | Salesloft |
|---------|---------|----------------|--------|-----------|
| AI Conversations | ✅ | ❌ | ❌ | ❌ |
| Skip Trace Built-in | ✅ | ❌ | ❌ | ❌ |
| Property Data | ✅ | ❌ | ❌ | ❌ |
| 10DLC Compliant | ✅ | ✅ | ✅ | ❌ |
| Multi-Worker AI | ✅ | ❌ | ❌ | ❌ |
| Human-in-Loop | ✅ | ✅ | ✅ | ✅ |

---

## Pricing Tiers (Proposed)

| Tier | Monthly | SMS/mo | Skip Traces | AI Workers |
|------|---------|--------|-------------|------------|
| Starter | $299 | 5,000 | 500 | GIANNA only |
| Growth | $599 | 15,000 | 2,000 | All workers |
| Scale | $1,299 | 50,000 | 10,000 | All + API |
| Enterprise | Custom | Unlimited | Unlimited | Custom AI |

---

## Success Criteria

### Launch (Month 1)
- [ ] 10 paying customers
- [ ] 100,000 SMS sent
- [ ] 95% delivery rate
- [ ] <5 min avg response time

### Growth (Month 3)
- [ ] 50 paying customers
- [ ] $30K MRR
- [ ] 10% response rate average
- [ ] NPS > 40

### Scale (Month 6)
- [ ] 200 paying customers
- [ ] $100K MRR
- [ ] 3 enterprise accounts
- [ ] API partnerships

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Carrier filtering | SMS blocked | 10DLC compliance, warm-up |
| AI hallucination | Bad responses | Human-in-loop review |
| Data quality | Wrong numbers | Multi-source verification |
| Compliance (TCPA) | Legal issues | Opt-out handling, consent |

---

## Roadmap

### Q1 2025 - Foundation
- Core SMS pipeline
- 3 AI workers (GIANNA, CATHY, SABRINA)
- Basic analytics

### Q2 2025 - Scale
- Voice calling (power dialer)
- Email channel
- Advanced workflows

### Q3 2025 - Intelligence
- Predictive lead scoring
- Custom AI training
- API access

### Q4 2025 - Enterprise
- Multi-team support
- White-label option
- Salesforce integration
