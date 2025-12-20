# OutreachGlobal Quick Start Guide

## Get Running in 15 Minutes

---

## Step 1: Import Your First Leads (3 min)

1. Go to **Data → Data Hub**
2. Click **Upload CSV** or **Import from USBizData**
3. Map your columns (Name, Phone, Email, Company)
4. Check "Skip Trace on Import" for phone enrichment
5. Click **Import**

Your leads are now in the system.

---

## Step 2: Create Your First Campaign (3 min)

1. Go to **Outreach → Campaigns**
2. Click **Create Campaign**
3. Select **2-Bracket SMS** type
4. Choose your value offer (e.g., "Free Valuation")
5. Select leads from your import
6. Activate campaign

Messages will start sending at your scheduled time.

---

## Step 3: Run Your First Dialing Session (5 min)

1. Go to **Outreach → Call Center → Power Dialer**
2. **Setup Tab**:
   - Select your contact list
   - Choose campaign type
   - Set call window (e.g., 9 AM - 5 PM)
3. Click **Launch Campaign**
4. **Dialer Tab**:
   - System shows first lead
   - Click **Call** to dial
   - Use **Notes** tab during call
   - Select **Disposition** when done
5. **Copilot** suggests next action
   - Click **Execute Now** or **Queue**

---

## Step 4: Check Your Pipeline (2 min)

1. Go to **Analytics → Pipeline Heat Map**
2. See your deal machine:
   ```
   Ingestion → Campaigns → Value Conv → Proposals → Deals
   ```
3. Green = healthy, Yellow = watch, Red = fix
4. Click any stage for details

---

## Step 5: Work the AI Workspaces (2 min)

### For New Leads:
**Workspaces → Initial Message** (GIANNA)
- See queue of uncontacted leads
- Send AI-suggested openers

### For Cold Leads:
**Workspaces → Retarget** (SABRINA)
- Re-engage with new angles
- Wait 14-30 days between attempts

### For Warm Follow-ups:
**Workspaces → Nudger** (CATHY)
- Humor-based, human feeling
- Best sent during peak hours (9-11 AM)

---

## Daily Workflow Checklist

```
□ Check Pipeline Heat Map (1 min)
  └ Any stages cold/red?

□ Review Inbound Responses (3 min)
  └ AI → Gianna AI → Inbound Responses

□ Work Initial Message Queue (15 min)
  └ Send openers to new leads

□ Run Dialing Session (1-2 hours)
  └ Use Copilot for next steps

□ Process Retarget Queue (15 min)
  └ Re-engage cold leads

□ Check Nudger Queue (10 min)
  └ Send warm follow-ups
```

---

## Key Concepts

### AI Workers

| Worker | What They Do |
|--------|--------------|
| **GIANNA** | First touch, value delivery |
| **SABRINA** | Re-engage cold leads |
| **CATHY** | Warm, humor-based nudges |

### Copilot Next Step

After every call:
1. Select disposition
2. Copilot suggests action
3. Execute or queue

### 2-Bracket Flow

```
"Would you like X? YES/NO"
       ↓
   [YES] → Deliver value + capture email
   [NO]  → Queue for retarget
```

---

## Navigation Shortcuts

| Section | Path |
|---------|------|
| Dashboard | Home → Dashboard |
| Pipeline Heat Map | Analytics → Pipeline Heat Map |
| Power Dialer | Outreach → Call Center → Power Dialer |
| SMS Queue | Outreach → SMS Queue |
| Initial Message | Workspaces → Initial Message |
| Retarget | Workspaces → Retarget |
| Nudger | Workspaces → Nudger |
| Content Library | AI → Content Library |

---

## Need Help?

- **Full Manual**: `/docs/USER-MANUAL.md`
- **In-App Help**: Type `/help`
- **Issues**: GitHub repository

---

*You're ready to go!*
