# SignalHouse Integration Architecture - NEXTIER

## Overview

NEXTIER uses SignalHouse for 10DLC compliant SMS messaging. Our platform has multiple AI workers (digital agents) that send different types of messages. We need **two campaign lanes** to match our message types.

---

## Campaign Architecture

```
                         SIGNALHOUSE 10DLC SYSTEM
    ============================================================

    BRAND: BZOYPIH - NEXTIER
    EIN: 862237370
    Company: Artac Capital LLC

    ============================================================

         LANE A                              LANE B
    ==================                  ==================
    |  LOW VOLUME    |                  | CONVERSATIONAL |
    |    MIXED       |                  |                |
    ==================                  ==================
           |                                    |
           |                                    |
    +------v------+                     +-------v-------+
    | Campaign ID |                     |  Campaign ID  |
    |  (NEW-001)  |                     |   (NEW-002)   |
    +------+------+                     +-------+-------+
           |                                    |
           |                                    |
    +------v------+                     +-------v-------+
    |   Phone     |                     |    Phone      |
    | 15164079249 |                     | (NEW NUMBER)  |
    +-------------+                     +---------------+
           |                                    |
           |                                    |
    =======v====================================v=======

                    MESSAGE TYPES

    ============================================================

    LANE A: First Contact           LANE B: Follow-Up
    (Cold Outreach)                 (Engaged Leads Only)

    - Permission-seeking            - Two-way dialogue
    - Questions only                - Scheduling calls
    - No promotional content        - Gathering emails
    - Sender identified             - Advisory tone

    Worker: GIANNA                  Workers: CATHY, SABRINA

    ============================================================
```

---

## Message Flow

```
    NEW LEAD (Cold)
          |
          v
    +------------------+
    | GIANNA sends     |
    | initial SMS      |
    | (LANE A)         |
    +--------+---------+
             |
             |  Lead responds?
             |
    +--------v---------+     No      +------------------+
    |                  |------------>| CATHY re-engages |
    |  YES = Engaged   |             | (Still LANE A)   |
    |                  |             +------------------+
    +--------+---------+
             |
             | Email captured or positive response
             |
    +--------v---------+
    | Move to LANE B   |
    | (Engaged Lead)   |
    +--------+---------+
             |
             v
    +------------------+
    | SABRINA books    |
    | 15-min call      |
    | (LANE B)         |
    +------------------+
```

---

## Why Two Lanes?

| Aspect | Lane A (Cold) | Lane B (Engaged) |
|--------|---------------|------------------|
| **Use Case** | Low Volume Mixed | Conversational |
| **Who receives** | New leads (no prior contact) | Leads who responded |
| **Message style** | Ask permission/questions | Continue dialogue |
| **TPM needed** | Lower (cold outreach) | Higher (active convos) |
| **10DLC fit** | Permission-seeking | Two-way dialogue |

---

## Sample Messages by Lane

### LANE A: Low Volume Mixed (Cold Outreach)

```
Sample 1:
"{firstName} - Gianna from Nextier. Honest question: does the
business run clean, or because you're everywhere all the time?"

Sample 2:
"{firstName}, Gianna here. One question: how much of your week
goes to doing the work vs. chasing it?"

Sample 3:
"{firstName} - Gianna with Nextier. Got something I think you'd
find interesting. Worth 2 mins of your time?"
```

**Pattern**: Ask a question, identify sender, seek permission. NOT promotional.

---

### LANE B: Conversational (Engaged Leads)

```
Sample 1:
"Great to hear from you {firstName}. I can share more via email
if you want - just drop your best address."

Sample 2:
"{firstName}, appreciate the response. What's the best way to
continue this - call, email, or keep texting?"

Sample 3:
"No worries {firstName}. If you change your mind down the road,
you've got my number. Take care."
```

**Pattern**: Continue the conversation, offer next steps, no cold selling.

---

## Phone Number Assignment

```
    SIGNALHOUSE DASHBOARD
    =====================

    Phone: 15164079249
    Brand: BZOYPIH - NEXTIER
    Campaign: [LANE A CAMPAIGN ID]  <-- Assign to Lane A

    ---

    Phone: [NEW NUMBER]
    Brand: BZOYPIH - NEXTIER
    Campaign: [LANE B CAMPAIGN ID]  <-- Assign to Lane B
```

Each phone number is tied to ONE campaign. We use different numbers for different lanes.

---

## Webhook Integration

```
    SIGNALHOUSE                        NEXTIER PLATFORM
    ===========                        ================

    SMS_RECEIVED  ------------------>  Webhook Handler
                                            |
                                            v
                                      Classify Response
                                            |
                                      +-----+-----+
                                      |           |
                                      v           v
                                   Engaged?    Opt-out?
                                      |           |
                                      v           v
                                   Move to    Remove from
                                   Lane B       list
```

**Webhook URL**:
```
https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse?token=...
```

**Events we handle**:
- SMS_RECEIVED - Process inbound responses
- SMS_SENT - Track delivery
- CAMPAIGN_ADD - Sync new campaigns
- NUMBER_PURCHASED - Register new numbers

---

## What We Need from SignalHouse

1. **Create Campaign 1 (Lane A)**
   - Use Case: `Low Volume Mixed`
   - Description: Permission-based outreach to cold leads
   - Assign Phone: 15164079249

2. **Create Campaign 2 (Lane B)** *(optional, can do later)*
   - Use Case: `Conversational` or `Low Volume Mixed`
   - Description: Two-way dialogue with engaged leads
   - Assign Phone: [New number when ready]

---

## Contact

**Brand**: NEXTIER (BZOYPIH)
**Account Email**: tb@outreachglobal.io
**Tech Contact**: Same

---

*This document can be shared with SignalHouse support to explain our 10DLC campaign architecture.*
