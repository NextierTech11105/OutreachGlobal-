# 🎯 NEXTIER DEAL ORIGINATION MACHINE
## Visual End-to-End Flow Guide

**For**: Business Stakeholders, Sales Team, Non-Technical Users  
**Version**: 1.0 | December 2025

---

## 🌊 THE BIG PICTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│    📊 DATA IN          🤖 AI PROCESSES         📱 OUTREACH         💰 DEAL  │
│    ─────────           ──────────────          ─────────          ─────     │
│                                                                              │
│    USBizData     →     LUCI Scores      →     GIANNA Texts   →   Meeting   │
│    CSV Files           & Enriches              Prospects          Booked    │
│                                                                              │
│         ↓                   ↓                      ↓                 ↓      │
│                                                                              │
│    Skip Trace    →     Lead Created     →     Response       →   Proposal  │
│    Find Owner          with ID                 Handled           Sent       │
│                                                                              │
│         ↓                   ↓                      ↓                 ↓      │
│                                                                              │
│    Phone         →     Campaign         →     CATHY/SABRINA  →   CLOSED    │
│    Verified            Queued                 Follow Up          WON! 🎉    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 MEET THE AI TEAM

| Agent | Role | What They Do | Icon |
|-------|------|--------------|------|
| **LUCI** | Data Specialist | Finds the best leads, verifies phone numbers, scores quality | 📊 |
| **GIANNA** | First Contact | Sends initial texts, handles all incoming replies | 💬 |
| **CATHY** | Follow-Up Expert | Re-engages people who went quiet | 🔄 |
| **SABRINA** | Closer | Books meetings, handles objections aggressively | 📅 |

---

## 📁 WHERE EVERYTHING LIVES

### Stage 1: DATA COMES IN

```
📂 apps/front/src/
   └── 📂 app/api/
       └── 📂 ecbb/
           ├── 📄 sectors/route.ts      ← Upload CSV files by industry
           ├── 📄 pipeline/route.ts     ← Process & enrich data
           └── 📄 campaign/route.ts     ← Launch SMS campaigns
```

**What happens here:**
- Upload USBizData CSV files (plumbers, HVAC, bakeries, etc.)
- System finds owner mobile phone numbers
- Verifies phones are real and connected

---

### Stage 2: LUCI PREPARES CAMPAIGNS

```
📂 apps/front/src/
   └── 📂 app/api/
       └── 📂 luci/
           ├── 📄 pipeline/route.ts     ← Full data processing
           ├── 📄 batch/route.ts        ← Process 250 at a time
           ├── 📄 campaigns/route.ts    ← Create campaign batches
           └── 📄 push-to-sms/route.ts  ← Queue for sending
```

**What happens here:**
- LUCI scores each lead (0-100 quality score)
- Tags leads by industry, size, location
- Creates campaign batches (max 2,000 per campaign)
- Human reviews before sending

---

### Stage 3: GIANNA SENDS MESSAGES

```
📂 apps/front/src/
   └── 📂 lib/
       └── 📂 signalhouse/
           └── 📄 client.ts             ← Sends SMS via SignalHouse

   └── 📂 app/api/
       └── 📂 signalhouse/
           ├── 📄 bulk-send/route.ts    ← Send to many people
           └── 📄 campaign/route.ts     ← Campaign management
```

**What happens here:**
- Approved messages get sent via SignalHouse
- Up to 2,000 texts per day
- Each message is tracked with a unique ID

---

### Stage 4: HANDLING RESPONSES

```
📂 apps/front/src/
   └── 📂 app/api/
       └── 📂 webhook/
           └── 📄 signalhouse/route.ts  ← Receives all replies

   └── 📂 lib/
       └── 📂 gianna/
           ├── 📄 gianna-service.ts     ← Main AI brain
           ├── 📄 personality-dna.ts    ← How she talks
           └── 📂 knowledge-base/
               └── 📄 message-library.ts ← 160+ response templates
```

**What happens here:**
- Every reply comes to one place (webhook)
- GIANNA reads and understands the message
- AI generates appropriate response
- Conversation continues automatically

---

### Stage 5: FOLLOW-UP & CLOSING

```
📂 apps/front/src/
   └── 📂 config/
       └── 📂 workers/
           └── 📄 index.ts              ← All AI agent definitions

   └── 📂 lib/
       └── 📂 orchestration/
           ├── 📄 events.ts             ← Tracks every action
           └── 📄 pipeline.ts           ← Manages the flow
```

**What happens here:**
- CATHY re-engages people who stopped responding
- SABRINA pushes for meeting bookings
- Every interaction is logged

---

## 🔄 THE COMPLETE FLOW (Visual)

```
                    ┌──────────────────┐
                    │   📊 CSV FILE    │
                    │   (USBizData)    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  📁 DO Spaces    │
                    │  (File Storage)  │
                    │                  │
                    │ /api/ecbb/sectors│
                    └────────┬─────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │         🤖 LUCI              │
              │   (Data Processing)          │
              │                              │
              │  • Skip trace phone          │
              │  • Verify mobile             │
              │  • Score quality             │
              │  • Create LeadID             │
              │                              │
              │  /api/luci/pipeline          │
              │  /api/ecbb/pipeline          │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │      👤 HUMAN REVIEW         │
              │   (Preview & Approve)        │
              │                              │
              │  See draft messages          │
              │  Edit if needed              │
              │  Click "Approve"             │
              │                              │
              │  /api/sms/queue              │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │        💬 GIANNA             │
              │   (Initial Outreach)         │
              │                              │
              │  Sends personalized SMS      │
              │  "Hi {firstName}..."         │
              │                              │
              │  /api/signalhouse/bulk-send  │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │      📱 PROSPECT GETS        │
              │        TEXT MESSAGE          │
              └──────────────┬───────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
         ┌──────────────┐   ┌──────────────────┐
         │  😶 No Reply │   │ 💬 They Reply!   │
         └──────┬───────┘   └────────┬─────────┘
                │                    │
                ▼                    ▼
         ┌──────────────┐   ┌──────────────────┐
         │   🔄 CATHY   │   │    🤖 GIANNA     │
         │  (Nudger)    │   │  (AI Responds)   │
         │              │   │                  │
         │ Sends follow │   │ Analyzes intent  │
         │ up in 3 days │   │ Crafts response  │
         └──────┬───────┘   └────────┬─────────┘
                │                    │
                └────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │      😊 INTERESTED?          │
              └──────────────┬───────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
         ┌──────────────┐   ┌──────────────────┐
         │  ❌ No       │   │    ✅ Yes!       │
         │  (Nurture)   │   │  (Hot Lead)      │
         └──────────────┘   └────────┬─────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │     📅 SABRINA       │
                          │    (The Closer)      │
                          │                      │
                          │  Books the meeting   │
                          │  Sends reminders     │
                          │  Handles objections  │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │    🤝 MEETING        │
                          │      BOOKED!         │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   💰 DEAL CLOSED     │
                          │       🎉🎉🎉         │
                          └──────────────────────┘
```

---

## 🌐 WEB ADDRESSES (URLs)

### Live Production URLs

| What | URL |
|------|-----|
| **Main App** | `https://monkfish-app-mb7h3.ondigitalocean.app` |
| **Webhook (receives texts)** | `https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse` |

### API Endpoints (For Reference)

| Purpose | Endpoint |
|---------|----------|
| Upload sector data | `POST /api/ecbb/sectors` |
| Run enrichment pipeline | `POST /api/ecbb/pipeline` |
| Launch campaign | `POST /api/ecbb/campaign` |
| Preview SMS queue | `GET /api/sms/queue?action=preview` |
| Send bulk SMS | `POST /api/signalhouse/bulk-send` |
| LUCI full pipeline | `POST /api/luci/pipeline` |
| LUCI batch process | `POST /api/luci/batch` |

---

## 📊 DAILY NUMBERS

| Metric | Capacity |
|--------|----------|
| SMS per day | 2,000 |
| Batch size | 250 records |
| Auto-pause at | 2,000 records |
| Response templates | 160+ |
| Sectors supported | 5 (RE Agents, Plumbing, HVAC, Bakeries, RV Parks) |

---

## 🎯 THE 3-STEP DAILY ROUTINE

### Step 1: PREP (Morning)
```
1. LUCI scans new data
2. Skip traces phone numbers
3. Scores and tags leads
4. Creates draft campaign
```

### Step 2: PREVIEW (Before Lunch)
```
1. Human reviews draft messages
2. Edits any that need changes
3. Approves the batch
4. Ready to send
```

### Step 3: EXECUTE (Afternoon)
```
1. Campaign sends via SignalHouse
2. GIANNA handles all replies
3. Hot leads go to SABRINA
4. Meetings get booked
```

---

## 💡 SIMPLE ANALOGY

Think of it like a **factory assembly line**:

| Factory Step | Our System |
|--------------|------------|
| Raw materials arrive | CSV data uploaded |
| Quality check | LUCI verifies phones |
| Packaging | Messages personalized |
| Inspection | Human reviews queue |
| Shipping | SignalHouse sends SMS |
| Customer service | GIANNA handles replies |
| Sales closer | SABRINA books meetings |

---

## ❓ FAQ

**Q: Where does the data come from?**
A: USBizData CSV files uploaded to our system, organized by industry sector.

**Q: How many texts can we send?**
A: Up to 2,000 per day. System auto-pauses at this limit.

**Q: Does a human review before sending?**
A: Yes! Every campaign goes through PREVIEW stage before EXECUTE.

**Q: What happens when someone replies?**
A: GIANNA (AI) reads the message, understands intent, and responds appropriately.

**Q: How do we know it's working?**
A: Every action is logged with a unique ID. Full audit trail available.

---

*Document created for internal training and stakeholder communication.*
