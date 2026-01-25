# NEXTIER AI AGENT ARCHITECTURE - COMPLETE SYSTEM MAP

> **Last Updated:** 2026-01-24
> **Platform:** OutreachGlobal / Nextier
> **Stack:** NestJS + BullMQ + Drizzle ORM + SignalHouse SMS + Multi-Provider AI

---

## QUICK CONTEXT FOR AI ASSISTANTS

This document describes a multi-agent SMS outreach platform with:
- **5 AI Agents**: GIANNA (opener), CATHY (nurture), SABRINA (closer), NEVA (research), LUCI (enrichment)
- **Human-in-the-loop** at critical decision points
- **Template-based responses** with AI fallback
- **BullMQ queues** for async processing
- **Multi-provider AI** (OpenAI, Anthropic, Perplexity) with fallback chains

---

## AGENT REGISTRY

| Agent | Role | Location | Lines | AI Model | Human-in-Loop |
|-------|------|----------|-------|----------|---------------|
| **GIANNA** | SMS Opener | `apps/api/src/app/gianna/gianna.service.ts` | 751 | Template + GPT-4o-mini fallback | Yes (<70% confidence) |
| **CATHY** | Nurture Agent | `apps/api/src/app/cathy/cathy.service.ts` | 385 | Template + GPT-4o-mini optional | No (template fallback) |
| **SABRINA** | Closer/Scheduler | `apps/api/src/app/inbox/services/sabrina-sdr.service.ts` | ~200 | None (slot generation) | Yes (100% approval) |
| **NEVA** | Research Copilot | `apps/api/src/app/neva/neva.service.ts` | 664 | Perplexity sonar-small-128k | Yes (risk flags) |
| **LUCI** | Enrichment Agent | `apps/api/src/app/luci/luci.service.ts` | ~300 | None (API integrations) | Yes (compliance) |

---

## COMPLETE WORKFLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  CSV Upload → JSON Import → API Ingest → Skip Trace → Apollo B2B            │
│                              ↓                                               │
│                       RAW DATA LAKE                                          │
│                    (raw-data-lake.service)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENRICHMENT PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LUCI (Research Agent)                                                │   │
│  │ • Phone validation (Twilio Lookup)                                   │   │
│  │ • Business enrichment (RealEstate API)                               │   │
│  │ • Identity graph building                                            │   │
│  │ • DNC/Compliance checking                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NEVA (Research Copilot) - ADVISORY ONLY                              │   │
│  │ • Perplexity deep research (llama-3.1-sonar-small-128k-online)      │   │
│  │ • Company intel gathering                                            │   │
│  │ • Risk flags (reputation, legal, financial)                          │   │
│  │ • Personalization hooks for outreach                                 │   │
│  │ • 24hr Redis + DB caching                                            │   │
│  │ ⚠️ Cannot override LUCI compliance decisions                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                               │
│                       ENRICHED LEADS                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAMPAIGN ORCHESTRATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Campaign Builder → Execution Engine → Scheduling (Cron) → Sagas (Events)   │
│                              ↓                                               │
│              SELECT LEADS FOR OUTREACH BATCH (10-2000)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OUTBOUND SMS EXECUTION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ GIANNA (SMS Opener) - First Contact Specialist                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │ PERSONALITY PRESETS:        OPENER TEMPLATES:                        │   │
│  │ • balanced (default)        • property_direct                        │   │
│  │ • cold_outreach             • property_investor                      │   │
│  │ • warm_lead                 • business_direct                        │   │
│  │ • ghost_revival             • business_owner                         │   │
│  │                             • general                                │   │
│  │                                                                      │   │
│  │ OBJECTION HANDLERS:                                                  │   │
│  │ • not_interested  → "Most folks say that at first..."               │   │
│  │ • too_busy        → "I'll keep it super quick..."                   │   │
│  │ • send_email      → "Happy to. Best email for you?"                 │   │
│  │ • how_got_number  → "Public business records..."                    │   │
│  │ • scam_accusation → "Totally fair. You can Google us..."            │   │
│  │                                                                      │   │
│  │ MODE: Template-based (NO AI) with optional GPT-4o-mini fallback     │   │
│  │ HUMAN-IN-LOOP: Required when confidence < 70%                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                               │
│            GIANNA QUEUE (BullMQ) → GIANNA CONSUMER → SignalHouse API        │
│                              ↓                                               │
│                      SMS SENT TO LEAD                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                               ↓
                        Lead replies...
                               ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INBOUND SMS PROCESSING                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    INBOUND SMS (SignalHouse Webhook)                         │
│                              ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AGENT ROUTER                                                         │   │
│  │ apps/api/src/app/inbox/services/agent-router.service.ts              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │ ROUTING RULES:                                                       │   │
│  │ 1. Check which phone number lead replied TO                          │   │
│  │    → Route to agent who owns that number (conversation continuity)   │   │
│  │                                                                      │   │
│  │ 2. If new conversation, analyze:                                     │   │
│  │    • Message count: 0-2 → GIANNA, 3-10 → CATHY, 10+ → SABRINA       │   │
│  │    • Scheduling keywords → SABRINA                                   │   │
│  │    • Lead pipeline stage (high_intent → SABRINA)                     │   │
│  │    • Default: last agent used or GIANNA                              │   │
│  │                                                                      │   │
│  │ PHONE ASSIGNMENTS (per team):                                        │   │
│  │ • GIANNA_PHONE_NUMBER  = +1-xxx-xxx-xxxx                            │   │
│  │ • CATHY_PHONE_NUMBER   = +1-xxx-xxx-xxxx                            │   │
│  │ • SABRINA_PHONE_NUMBER = +1-xxx-xxx-xxxx                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                               │
│          ┌───────────────────┼───────────────────┐                          │
│          ↓                   ↓                   ↓                          │
│      GIANNA              CATHY              SABRINA                          │
│     (Opener)           (Nurture)           (Closer)                          │
│          ↓                   ↓                   ↓                          │
│    [See detail]        [See detail]        [See detail]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AGENT DETAIL: GIANNA (SMS Opener)

**Trigger:** First contact / Early conversation (messages 1-2)

### Intent Classification

| Intent | Confidence | Action |
|--------|------------|--------|
| `opt_out` | 100% | IMMEDIATE DNC - "Done - you're off the list" |
| `interested` | 85% | → SABRINA - "Perfect! What's the best number?" |
| `wants_call` | 90% | → SABRINA - Schedule immediately |
| `question` | 75% | Answer briefly, redirect to call |
| `soft_no` | 80% | "Mind if I check back in a few months?" |
| `hard_no` | 90% | Exit gracefully, mark cold |
| `objection` | 80% | Handle with objection templates |
| `neutral` | 50% | → CATHY after 3 messages |
| `anger` | 95% | Human review required |

### Human-in-Loop Triggers
- Confidence < 70%
- First 3 objections
- AI-generated responses (always reviewed initially)
- Anger/upset detection

### Escalation Rules
- High intent detected → SABRINA
- Needs nurturing (3+ messages, neutral) → CATHY

---

## AGENT DETAIL: CATHY (Nurture Agent)

**Trigger:** Lead needs relationship building, not ready to close (messages 3-10)

### 5-Stage Nurture Pipeline

| Stage | Follow-up | Example Message |
|-------|-----------|-----------------|
| `initial_followup` | 2 days | "Just circling back - did you get a chance to think?" |
| `value_building` | 4 days | "I was helping another {industry} business. Reminded me!" |
| `objection_handling` | 5 days | "Totally get it. What would need to change?" |
| `re_engagement` | 7 days | "It's been a minute - hope all is well!" |
| `final_attempt` | 14 days | "I'll stop reaching out, but I'm always here to help!" |

### Humor Additions (30% chance)
- "(Promise I'm not a robot, just persistent!)"
- "(My coffee hasn't kicked in yet, so apologies if this is too early!)"

### Escalation
- Scheduling intent detected (schedule|book|calendar|meet) → SABRINA
- Positive response + ready → SABRINA

### Human-in-Loop
- No (template fallback on AI failure)

---

## AGENT DETAIL: SABRINA (Closer)

**Trigger:** Lead is ready to schedule or shows high buying intent

### Capabilities
- Calendar slot generation
- Meeting scheduling (Calendly integration)
- Appointment confirmation
- Follow-up on no-shows

### Human-in-Loop
- 100% approval required before booking

### Triggers From
- GIANNA: `interested`, `wants_call` intents
- CATHY: scheduling intent detected
- Agent Router: `lead.pipelineStatus = 'high_intent'` or `'qualified'`
- Message count > 10

---

## AGENT DETAIL: NEVA (Research Copilot)

**Role:** Business intelligence and context for outreach

### Capabilities
- Perplexity deep research (`llama-3.1-sonar-small-128k-online`)
- Company intel: size, years in business, employee count
- Risk flags: reputation, legal, financial distress
- Personalization: opening hooks, industry language
- Discovery prep: questions, objection handlers, value props
- 24hr caching (Redis + DB)

### Confidence Levels

| Level | Score | Use Personalization | Requires Review |
|-------|-------|---------------------|-----------------|
| HIGH | >= 0.8 | Yes | No |
| MEDIUM | >= 0.5 | Yes | No |
| LOW | >= 0.3 | No | Yes |
| NONE | < 0.3 | No | Yes |

### Human-in-Loop
- Risk flags detected (reputation/legal)
- Confidence < 30%

**CRITICAL:** NEVA is ADVISORY ONLY. Cannot override LUCI compliance decisions.

---

## AI ORCHESTRATOR

**Location:** `apps/api/src/app/ai-orchestrator/ai-orchestrator.service.ts`

### Provider Routing

| Task | Primary Provider | Model | Fallback |
|------|-----------------|-------|----------|
| `sms_classify` | OpenAI | gpt-4o-mini | Anthropic claude-3-haiku |
| `sms_generate` | OpenAI | gpt-4o-mini | Anthropic claude-3-haiku |
| `research_verify` | Perplexity | sonar-small-128k | OpenAI gpt-4o-mini |
| `research_deep` | Perplexity | sonar-small-128k | OpenAI gpt-4o-mini |
| `meeting_brief` | OpenAI | gpt-4o-mini | Anthropic claude-3-haiku |

### Hardening Features
- Circuit breaker per provider
- Usage metering & limits per team
- Research caching (1hr TTL)
- Prompt versioning from DB
- Degraded mode flag when on fallback

---

## HUMAN-IN-THE-LOOP MATRIX

| Agent | When Human Required | Review Location |
|-------|---------------------|-----------------|
| **GIANNA** | Confidence < 70%, First 3 objections, AI responses, Anger detection | Inbox → Review Queue |
| **CATHY** | Never (template fallback) | N/A |
| **SABRINA** | 100% of scheduling confirmations, All booking actions | Inbox → Approval Queue |
| **NEVA** | Risk flags detected, Confidence < 30% | Research Dashboard |
| **LUCI** | DNC check failures, Identity graph conflicts | Compliance Dashboard |

---

## QUEUE ARCHITECTURE (BullMQ)

| Queue | Jobs | Consumer Status |
|-------|------|-----------------|
| `GIANNA_QUEUE` | send-sms, escalate-sabrina, escalate-cathy | ⚠️ NEEDS IMPLEMENTATION |
| `DEMO_QUEUE` | send-sms, process-response | ✅ Has Consumer |
| `ENRICHMENT_QUEUE` | b2b-ingest, skiptrace, lead-card | ✅ Has Consumer |
| `INTEGRATION_QUEUE` | sync-task, oauth-flow | ✅ Has Consumer |
| `DLQ` | retry logic, 3 attempts, exp backoff | ✅ Has Consumer |

---

## LEAD STATE MACHINE

```
RAW ──(LUCI enrichment)──► ENRICHED ──(Added to campaign)──► QUEUED
                                                                │
                                                                ↓
                                                           CONTACTED
                                                         (GIANNA opener)
                                                                │
                    ┌───────────────┬───────────────┬───────────┴───────────┐
                    ↓               ↓               ↓                       ↓
                 GHOST          ENGAGED        HIGH_INTENT                 DNC
              (no reply)       (replied)                               (opted out)
                    │               │               │
                    ↓               ↓               ↓
                NURTURE ────► QUALIFIED ────► SCHEDULED
                (CATHY)        (CATHY)        (SABRINA)
                                                   │
                                                   ↓
                                                 MET ────► CLOSED
```

---

## IMPLEMENTATION STATUS

### ✅ Fully Implemented
- GIANNA service (751 lines)
- CATHY service (385 lines)
- NEVA service (664 lines)
- Agent Router (376 lines)
- AI Orchestrator (522 lines)
- Demo Service (675 lines)
- Demo Consumer
- BullMQ queues
- SignalHouse integration
- Circuit breaker
- Usage metering

### ⚠️ Partial
- SABRINA service (scheduling logic only)
- Calendly integration
- LUCI module (needs audit)

### ❌ Missing
- GIANNA consumer (queue processor)
- Phone provisioning UI
- Usage dashboard UI
- nevaEnrichments DB migration

---

## KEY FILES

```
apps/api/src/app/
├── gianna/
│   ├── gianna.module.ts
│   └── gianna.service.ts          # 751 lines - SMS opener
├── cathy/
│   ├── cathy.module.ts
│   └── cathy.service.ts           # 385 lines - Nurture agent
├── neva/
│   ├── neva.module.ts
│   └── neva.service.ts            # 664 lines - Research copilot
├── inbox/
│   └── services/
│       ├── agent-router.service.ts # 376 lines - Routes messages
│       └── sabrina-sdr.service.ts  # Closer/scheduler
├── ai-orchestrator/
│   ├── ai-orchestrator.module.ts
│   ├── ai-orchestrator.service.ts  # 522 lines - Multi-provider AI
│   ├── providers/                  # OpenAI, Anthropic, Perplexity clients
│   └── usage/
│       └── usage-meter.service.ts  # Token tracking
├── luci/
│   └── luci.service.ts             # Enrichment agent
├── demo/
│   ├── demo.module.ts
│   ├── demo.service.ts             # 675 lines - Demo platform
│   └── demo.consumer.ts            # Queue processor
└── campaign/
    ├── campaign.service.ts
    ├── campaign.saga.ts
    └── campaign.schedule.ts
```

---

## ENVIRONMENT VARIABLES NEEDED

```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# SignalHouse SMS
SIGNALHOUSE_API_KEY=...
SIGNALHOUSE_DEFAULT_NUMBER=+1xxxxxxxxxx

# Agent Phone Numbers (per-agent identity)
GIANNA_PHONE_NUMBER=+1xxxxxxxxxx
CATHY_PHONE_NUMBER=+1xxxxxxxxxx
SABRINA_PHONE_NUMBER=+1xxxxxxxxxx

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgres://...
```

---

## USAGE NOTES FOR AI ASSISTANTS

1. **When modifying agents:** Each agent has distinct personality and escalation rules. Maintain separation of concerns.

2. **Template vs AI:** Always prefer templates. AI is fallback only. This keeps costs low and responses predictable.

3. **Human-in-loop:** Never remove human checkpoints for SABRINA (scheduling) or low-confidence GIANNA responses.

4. **Queue architecture:** GIANNA needs a consumer implementation. Use demo.consumer.ts as reference.

5. **NEVA is advisory:** Research can inform but never override compliance (LUCI) decisions.

6. **Multi-tenant:** All services are tenant-isolated via `teamId`. Never cross tenant boundaries.
