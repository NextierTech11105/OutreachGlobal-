# SignalHouse: The Foundation of Intentional Outreach

## Philosophy

> *"The best channel is the one your prospect actually reads."*

SignalHouse isn't just an SMS API—it's the **nervous system** of modern B2B outreach. In a world drowning in cold emails and LinkedIn spam, SMS cuts through with 98% open rates and 45-second average response times.

But raw power without precision is noise. SignalHouse provides the **infrastructure for intentional communication**—reaching the right person, with the right message, at the right moment, through the channel they actually use.

---

## The Core Insight

```
Every prospect has a PHONE in their POCKET.
Not checking email. Not on LinkedIn.
But their phone? Always within reach.

SMS is the most INTIMATE channel in business.
Use it with INTENTION.
```

---

## NEXTIER + SignalHouse: The Architecture

### The Hierarchy (How SignalHouse Thinks)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SIGNALHOUSE                              │
│                    (Your Communication HQ)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────────────────────────────────────────────────────┐      │
│    │                    GROUP                             │      │
│    │              (NEXTIER Platform)                      │      │
│    │                                                      │      │
│    │   • 1 Group per Organization                        │      │
│    │   • Your "HQ" - everything flows from here          │      │
│    │   • Group ID: GM7CEB                                │      │
│    └─────────────────────────────────────────────────────┘      │
│                            │                                     │
│           ┌────────────────┼────────────────┐                   │
│           ▼                ▼                ▼                   │
│    ┌───────────┐    ┌───────────┐    ┌───────────┐             │
│    │ SUB-GROUP │    │ SUB-GROUP │    │ SUB-GROUP │             │
│    │ Agency A  │    │ Agency B  │    │ Agency C  │             │
│    │ (SYEZRQ)  │    │ (S2HMCU)  │    │ (future)  │             │
│    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘             │
│          │                │                │                    │
│    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐             │
│    │• Brands   │    │• Brands   │    │• Brands   │             │
│    │• Campaigns│    │• Campaigns│    │• Campaigns│             │
│    │• Numbers  │    │• Numbers  │    │• Numbers  │             │
│    │• Workers  │    │• Workers  │    │• Workers  │             │
│    └───────────┘    └───────────┘    └───────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why Sub-Groups Matter

Each Sub-Group is a **hermetically sealed tenant**:

| Isolation | Benefit |
|-----------|---------|
| **Numbers** | Agency A's numbers can't send from Agency B's account |
| **Brands** | Each agency has its own 10DLC brand registration |
| **Campaigns** | Compliance tracking per client, not mixed |
| **Analytics** | Clear attribution: which agency drove which results |
| **Billing** | Per-tenant cost tracking for profitability analysis |

---

## The Execution Pipeline

SignalHouse is the **SMS channel** in NEXTIER's multi-channel execution engine:

```
┌─────────────────────────────────────────────────────────────────┐
│                  NEXTIER EXECUTION ENGINE                        │
│            "Data → Discovery → Deal in 10 Steps"                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1-2: DATA PREP                                            │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  USBiz Data → Skip Trace → Phone Validation → DNC   │        │
│  │                                                      │        │
│  │  2,000 raw leads → 1,400 with valid mobile          │        │
│  └─────────────────────────────────────────────────────┘        │
│                            │                                     │
│                            ▼                                     │
│  STEP 3-4: CAMPAIGN PREP + APPROVAL                             │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Template Selection → Personalization → Human Sign-off│       │
│  │                                                      │        │
│  │  "Hi {{firstName}}, saw {{companyName}}..."         │        │
│  └─────────────────────────────────────────────────────┘        │
│                            │                                     │
│                            ▼                                     │
│  STEP 5-6: SIGNALHOUSE EXECUTION  ◄── THIS IS WHERE WE ARE      │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                                                      │        │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐        │        │
│  │   │ Phone 1 │    │ Phone 2 │    │ Phone 3 │        │        │
│  │   │ 949-xxx │    │ 231-xxx │    │ 430-xxx │        │        │
│  │   └────┬────┘    └────┬────┘    └────┬────┘        │        │
│  │        │              │              │              │        │
│  │        └──────────────┼──────────────┘              │        │
│  │                       ▼                             │        │
│  │              ROUND-ROBIN ROTATION                   │        │
│  │           (Distribute load, avoid limits)           │        │
│  │                       │                             │        │
│  │                       ▼                             │        │
│  │    ┌─────────────────────────────────────┐         │        │
│  │    │     SIGNALHOUSE API (10DLC)         │         │        │
│  │    │  • Brand: verified                  │         │        │
│  │    │  • Campaign: CF5Z4BU (approved)     │         │        │
│  │    │  • Sub-Group: SYEZRQ               │         │        │
│  │    └─────────────────────────────────────┘         │        │
│  │                                                      │        │
│  └─────────────────────────────────────────────────────┘        │
│                            │                                     │
│                            ▼                                     │
│  STEP 7: DELIVERY TRACKING (Webhooks)                           │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  message.sent → message.delivered → or failed       │        │
│  │                                                      │        │
│  │  94% delivery rate (industry: 85%)                  │        │
│  └─────────────────────────────────────────────────────┘        │
│                            │                                     │
│                            ▼                                     │
│  STEP 8-9: INBOUND + AI CLASSIFICATION                          │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Webhook: message.received                          │        │
│  │                       │                             │        │
│  │                       ▼                             │        │
│  │              ┌─────────────┐                        │        │
│  │              │ AI COPILOT  │                        │        │
│  │              │  (GIANNA)   │                        │        │
│  │              └──────┬──────┘                        │        │
│  │                     │                               │        │
│  │     ┌───────────────┼───────────────┐              │        │
│  │     ▼               ▼               ▼              │        │
│  │  ┌──────┐      ┌──────┐       ┌──────┐            │        │
│  │  │ GOLD │      │GREEN │       │ RED  │            │        │
│  │  │ HOT! │      │Nurture│      │ DNC  │            │        │
│  │  └──┬───┘      └──────┘       └──────┘            │        │
│  │     │                                              │        │
│  │     ▼                                              │        │
│  │  HOT CALL QUEUE                                    │        │
│  └─────────────────────────────────────────────────────┘        │
│                            │                                     │
│                            ▼                                     │
│  STEP 10: VOICE (Twilio) → 15-MIN DISCOVERY → DEAL              │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Call Center dials GOLD leads within 5 minutes      │        │
│  │                                                      │        │
│  │  "Speed to lead" = 80% higher conversion            │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## SignalHouse ID Mapping

Every entity in SignalHouse has an ID. Here's how they map to NEXTIER:

| SignalHouse ID | Example | NEXTIER Table | Column |
|----------------|---------|---------------|--------|
| **Group ID** | `GM7CEB` | `teams` | `signalhouseGroupId` |
| **Sub-Group ID** | `SYEZRQ` | `teams` | `signalhouseSubGroupId` |
| **Brand ID** | `B4O89BW` | `signalhouse_campaigns` | `shBrandId` |
| **Campaign ID** | `CF5Z4BU` | `signalhouse_campaigns` | `shCampaignId` |
| **Number** | `19494702229` | `sms_phone_pool` | `phoneNumber` |
| **Message ID** | `msg_xxx` | `signalhouse_message_status` | `shMessageId` |

---

## The 10DLC Compliance Layer

SignalHouse handles 10DLC (10-digit long code) compliance:

```
┌─────────────────────────────────────────────────────────────────┐
│                    10DLC REGISTRATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. BRAND REGISTRATION                                          │
│     └─► Company name, EIN, website, vertical                    │
│         └─► Status: Pending → Approved                          │
│                                                                  │
│  2. CAMPAIGN REGISTRATION                                        │
│     └─► Use case, sample messages, opt-in flow                  │
│         └─► DCA Review: Pending → Approved                      │
│         └─► Use cases: Marketing, Customer Care, Emergency      │
│                                                                  │
│  3. NUMBER ASSIGNMENT                                            │
│     └─► Numbers assigned to approved campaigns                  │
│         └─► Each number → one campaign at a time                │
│                                                                  │
│  4. THROUGHPUT LIMITS (per campaign type)                       │
│     └─► Marketing: 2,000 msg/day/number                         │
│     └─► Low Volume: 200 msg/day                                 │
│     └─► This is WHY we rotate through multiple numbers          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why SignalHouse as Foundation

### The Natural Channel Hierarchy

```
                    ATTENTION HIERARCHY

    ┌─────────────────────────────────────────┐
    │              SMS (SignalHouse)          │  ← 98% open rate
    │           "Hey, read this NOW"          │    45-sec response
    ├─────────────────────────────────────────┤
    │              VOICE (Twilio)             │  ← Direct human
    │          "Let's talk right now"         │    connection
    ├─────────────────────────────────────────┤
    │               EMAIL                     │  ← 20% open rate
    │         "Read this eventually"          │    Hours to days
    ├─────────────────────────────────────────┤
    │              LINKEDIN                   │  ← 10% acceptance
    │        "Maybe connect someday"          │    Days to weeks
    └─────────────────────────────────────────┘
```

### The NEXTIER Insight

**SMS is the ENTRY POINT**, not the destination.

```
SMS opens the door → AI qualifies → Voice closes

  "Hey John, quick question about
   ABC Plumbing's growth plans..."
                │
                ▼
         [REPLY RECEIVED]
       "Yeah, what's up?"
                │
                ▼
         [AI: GOLD LABEL]
         Hot lead detected
                │
                ▼
         [HOT CALL QUEUE]
         Call within 5 min
                │
                ▼
         [15-MIN DISCOVERY]
         "Let's explore fit..."
                │
                ▼
         [DEAL CLOSED]
         $15,000 contract
```

---

## Production Flow: 15-Minute Meetings

The entire architecture exists to produce ONE outcome:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│         2,000 LEADS → 200 RESPONSES → 20 MEETINGS               │
│                                                                  │
│    ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│    │   DATA   │     │   SMS    │     │  VOICE   │              │
│    │  2,000   │────▶│   200    │────▶│   20     │              │
│    │  leads   │     │ replies  │     │ meetings │              │
│    └──────────┘     └──────────┘     └──────────┘              │
│                                                                  │
│    VISIBLE:     Track every lead through every stage            │
│    MANAGEABLE:  Approve, pause, throttle batches                │
│    PREDICTABLE: Know expected delivery and response rates       │
│    REPEATABLE:  Template successful campaigns                   │
│                                                                  │
│    HIGH IMPACT: 1% of leads → meetings → revenue                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Summary

| Table | Purpose |
|-------|---------|
| `sms_phone_pool` | Phone numbers with rotation state |
| `signalhouse_campaigns` | 10DLC campaign registrations |
| `signalhouse_message_status` | Per-message delivery tracking |
| `signalhouse_webhook_log` | Webhook audit trail |
| `sms_send_batches` | Batch-level campaign tracking |
| `sms_batch_leads` | Per-lead status within batches |

---

## Key Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| **Delivery Rate** | delivered / sent | >94% |
| **Response Rate** | replied / delivered | >10% |
| **Positive Rate** | positive / replied | >40% |
| **Meeting Rate** | meetings / positive | >25% |
| **Cost per Meeting** | total_cost / meetings | <$50 |

---

## TL;DR

> **SignalHouse is the nervous system.**
>
> It carries the signal from NEXTIER to your prospect's pocket.
> The AI brain (GIANNA) interprets the response.
> The voice channel (Twilio) closes the deal.
>
> SMS → AI → Voice → Close
>
> That's the pipeline.
> SignalHouse is step one.
> Everything else builds on it.

---

*Document generated: 2026-01-13*
*Architecture: NEXTIER Multi-Tenant Execution Platform*
