# Outreach Global ID System
## Non-Technical Overview

---

## What Is This?

Every record in Outreach Global gets a unique identifier (ID) that tells you exactly what it is and when it was created - just by looking at it.

**Example:** `persona_01HX7KDEF123456789ABCDEF`

This ID tells you:
- It's a **persona** (qualified contact)
- It was created at a specific time (encoded in the numbers)
- It's globally unique - no duplicates possible

---

## The Core Rule

> **"An ID is earned when you spend money on a record."**

| Status | Has ID? | Why |
|--------|---------|-----|
| Raw data from upload | NO | Unverified, could be garbage |
| Skip traced with full info | YES | You paid for enrichment |
| Added to campaign | YES | Strategic decision made |
| Message sent | YES | SMS credits spent |

---

## How It Works (Simple)

```
Step 1: Upload raw business list
        → No IDs yet (just rows in a spreadsheet)

Step 2: Skip trace the list
        → Records with FULL NAME + ADDRESS + MOBILE
        → Get "persona_" ID (now they're real people)

Step 3: Create campaign
        → Gets "camp_" ID

Step 4: Add people to campaign
        → Each assignment tracked

Step 5: Send messages
        → Each send gets "tch_" ID (touch)

Step 6: Someone replies
        → Gets "res_" ID (response)
```

---

## What Each ID Type Means

### People & Organizations
| ID Starts With | What It Is | Plain English |
|----------------|------------|---------------|
| `user_` | Platform user | Someone who logs into Outreach Global |
| `team_` | Team/company | The organization using the platform |
| `persona_` | Qualified contact | A real person you can reach |

### Campaigns
| ID Starts With | What It Is | Plain English |
|----------------|------------|---------------|
| `camp_` | Campaign | A marketing initiative |
| `cal_` | Calendar campaign | Phone calling campaign |
| `seq_` | Sequence | Scheduled SMS drip campaign |
| `blt_` | Blast | One-time instant SMS blast |
| `rt_` | Retarget | Follow-up for non-responders |

### Communication
| ID Starts With | What It Is | Plain English |
|----------------|------------|---------------|
| `tch_` | Touch | One outreach attempt (call/SMS) |
| `res_` | Response | Reply from a contact |
| `msg_` | Message | The actual content sent |
| `tpl_` | Template | Reusable message template |
| `lane_` | Lane | Phone number used for sending |

### Data & Enrichment
| ID Starts With | What It Is | Plain English |
|----------------|------------|---------------|
| `stj_` | Skip trace job | Batch enrichment request |
| `ph_` | Phone | Verified phone number |
| `em_` | Email | Verified email address |

---

## Why This Matters To You

### 1. Know Exactly Where Money Went
Every ID = money spent. You can audit:
- How many personas created (skip trace cost)
- How many touches sent (SMS cost)
- Which campaigns are performing

### 2. Track Everything
If someone responds, you can trace back:
- Which message triggered the response
- Which campaign they were in
- When they were first contacted
- How many times they were touched

### 3. Never Lose Data
- IDs are permanent and unique
- Even deleted records keep their ID history
- Full audit trail for compliance

---

## Real Example

**Scenario:** John Smith responds "Yeah, interested"

```
What we can instantly see:

Response ID: res_01HX7KCCC...
    ↳ From persona: persona_01HX7KDEF... (John Smith)
    ↳ Responding to touch: tch_01HX7KBBB...
    ↳ Which was blast: blt_01HX7KAAA...
    ↳ In campaign: camp_01HX7KMNO... (Q1 HVAC Texas)
    ↳ Using lane: lane_01HX7KPQR... (+1-214-555-9999)
    ↳ Template: tpl_01HX7KXYZ... ("Hey {firstName}...")
    ↳ Skip traced via: stj_01HX7KGHI... (Batch 47)
    ↳ Team: team_01HX7KABC... (Acme Brokers)
```

One click → full history.

---

## Summary

| Question | Answer |
|----------|--------|
| What gets an ID? | Anything you've invested money/effort into |
| What doesn't get an ID? | Raw, unverified data |
| Can IDs change? | No, they're permanent |
| Can IDs duplicate? | No, mathematically impossible |
| Can I tell what an ID is? | Yes, the prefix tells you instantly |

---

## Quick Reference Card

```
PEOPLE:     user_  team_  persona_
CAMPAIGNS:  camp_  cal_  seq_  blt_  rt_
EXECUTION:  tch_  res_  conv_  ndg_
COMMS:      msg_  tpl_  lane_
AI:         sdr_  prmt_  act_
DATA:       stj_  str_  ph_  em_  prop_  bkt_
```
