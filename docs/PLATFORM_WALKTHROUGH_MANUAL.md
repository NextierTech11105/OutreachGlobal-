# Nextier Platform Walkthrough Manual

> A calm, step-by-step guide to mastering your deal sourcing machine.

---

## Welcome

Take a deep breath. This platform was built to make your life easier.

Whether you're sourcing distressed properties, connecting with business owners, or building relationships that lead to deals — everything you need is here. This guide will walk you through each piece, one step at a time.

No rush. Let's begin.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Getting Started](#2-getting-started)
3. [Finding Your Data](#3-finding-your-data)
4. [Enriching Your Leads](#4-enriching-your-leads)
5. [Skip Tracing](#5-skip-tracing)
6. [Crafting Your Message](#6-crafting-your-message)
7. [Launching Campaigns](#7-launching-campaigns)
8. [Training Gianna AI](#8-training-gianna-ai)
9. [Monitoring Your Progress](#9-monitoring-your-progress)
10. [Batch Processing](#10-batch-processing)
11. [Daily Workflow](#11-daily-workflow)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. The Big Picture

### What This Platform Does

Think of it as a pipeline. Data flows in one direction:

```
Data → Enrichment → Contact → Outreach → Response → Deal
```

Each stage builds on the previous one:

| Stage | What Happens | Your Action |
|-------|-------------|-------------|
| **Data** | Properties or businesses enter the system | Import CSVs or search |
| **Enrichment** | We add details (company info, revenue, employee count) | Click "Enrich" |
| **Contact** | We find phone numbers and emails | Click "Skip Trace" |
| **Outreach** | Gianna or you sends the first message | Select template, send |
| **Response** | Lead replies (positive, negative, or silence) | Review in inbox |
| **Deal** | Conversation becomes opportunity | Schedule call with Tommy |

That's it. Simple flow. Everything else is just making each step faster and smarter.

---

## 2. Getting Started

### First Login

1. Open your browser
2. Navigate to: `https://monkfish-app-mb7h3.ondigitalocean.app`
3. Sign in with your credentials
4. You'll land on the **Dashboard**

### Your Dashboard

The dashboard shows you what matters most:

- **Active Campaigns** — How many are running right now
- **Responses Today** — Fresh replies waiting for you
- **Leads in Pipeline** — Your deal funnel at a glance
- **Gianna's Activity** — What she's been up to

Take a moment to look around. No need to click anything yet.

---

## 3. Finding Your Data

### Your Data Architecture

Your platform runs on a powerful data lake stored in DigitalOcean:

```
┌─────────────────────────────────────────────────┐
│         DO DROPLET - 34 MILLION RECORDS          │
│              YOUR MASTER DATA LAKE               │
└─────────────────────────┬───────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ USBizData│     │ Property │     │ Business │
   │ Buckets  │     │   Data   │     │ Sectors  │
   └──────────┘     └──────────┘     └──────────┘
```

### Data Sources

| Source | Location | Purpose |
|--------|----------|---------|
| **DO Droplet** | Your data lake | 34M master records |
| **USBizData** | Buckets (uploading) | Business, Residential, Cell, Email lists |
| **RealEstateAPI.com** | API | Skip tracing (current phone/email) |
| **Apollo** | Admin section | Business enrichment (LinkedIn, title) |

### The Flow

1. **Data Lake** — Your 34M records in DO Droplet
2. **USBizData Upload** — Adds business buckets to the lake
3. **Cross-Enrich** — Match with tracked IDs, dedupe, create unified records
4. **Skip Trace** — RealEstateAPI.com finds current contact info
5. **Apollo Enrich** — Add LinkedIn, title, company context
6. **Leads Panel** — Search and work your enriched data

### Option A: Property Search

For real estate deals, start with property data.

1. Navigate to **Sectors** → **Property Search**
2. Enter your search criteria:
   - **Location**: City, county, or ZIP code
   - **Property Type**: Residential, Commercial, Land
   - **Status**: Pre-foreclosure, Auction, Bank-owned
3. Click **Search**
4. Results appear in a sortable table
5. Select properties you want to work
6. Click **Add to Sector** or **Skip Trace Selected**

**Pro tip**: Start with a small batch (50-100 properties) to test your messaging.

### Option B: Business Search

For M&A and business advisory:

1. Navigate to **Sectors** → **Business Search**
2. Filter by:
   - **Industry**: Manufacturing, SaaS, Healthcare, etc.
   - **Revenue Range**: $1M-$5M, $5M-$20M, etc.
   - **Location**: State or metro area
   - **Employee Count**: 10-50, 50-200, etc.
3. Click **Search**
4. Review results
5. Click **Enrich with Apollo** to add contact details

### Option C: Import Your Own Data

Already have a list? Great.

1. Go to **Data** → **Import**
2. Download the CSV template
3. Fill in your data (at minimum: first_name, last_name, phone or email)
4. Upload your file
5. Map columns if needed
6. Click **Import**

Your data is now in the system, ready for enrichment.

---

## 4. Enriching Your Leads

Enrichment adds valuable context to bare contact info.

### What Enrichment Adds

| Data Point | Source | Why It Matters |
|------------|--------|----------------|
| Company name | Apollo | Personalization |
| Job title | Apollo | Know who you're talking to |
| Revenue | Apollo | Qualify the opportunity |
| Employee count | Apollo | Company size indicator |
| LinkedIn URL | Apollo | Research before calling |
| Property value | RealEstateAPI | Equity calculation |
| Mortgage info | RealEstateAPI | Distress indicators |

### How to Enrich

**Single Lead:**
1. Open a lead's detail page
2. Click **Enrich** button
3. Wait 2-3 seconds
4. New data appears automatically

**Bulk Enrichment:**
1. Go to **Batch Jobs**
2. Click **New Batch Job**
3. Select **Data Enrichment**
4. Upload your CSV or select a sector
5. Click **Start**
6. Monitor progress in the jobs table

The system handles rate limits automatically. Relax — it will complete.

---

## 5. Skip Tracing

Skip tracing finds current phone numbers and emails for property owners.

### The Skip Trace Provider: RealEstateAPI.com

All skip tracing in this platform is powered by **[RealEstateAPI.com](https://www.realestateapi.com)**.

**What RealEstateAPI.com provides:**
- Current phone numbers (landline + cell)
- Current email addresses
- Property ownership verification
- Mailing address confirmation
- Associated persons at address

**API Endpoints:**
- Single skip trace: `/api/realestate/skip-trace`
- Bulk skip trace: `/api/realestate/skip-trace-bulk` (up to 250 per batch)

This is NOT the same as USBizData. USBizData gives you the raw list. RealEstateAPI.com finds the current contact info for those people.

### Understanding Hit Rates

Not every skip trace returns a phone number. Typical results:

- **80-90%** of traces return at least one phone
- **60-70%** return a mobile number
- **40-50%** return an email

This is normal. The platform tracks your hit rates so you can measure quality.

### Single Skip Trace

1. Open a property or lead record
2. Look for the **Skip Trace** button (usually top-right)
3. Click it
4. Results appear in 2-5 seconds
5. Phone numbers and emails are now attached to the record

### Bulk Skip Trace

For larger batches (up to 250 at a time):

1. Go to **Batch Jobs**
2. Click **New Batch Job**
3. Select **Skip Trace Batch**
4. Upload your CSV with property IDs or addresses
5. Click **Start**
6. Watch the progress bar
7. Download results when complete

### Daily Limits

- **5,000 skip traces per day** (resets at midnight UTC)
- Check your remaining quota in **Admin** → **API Monitor** → **Usage**

If you're approaching the limit, prioritize your highest-value leads first.

---

## 6. Crafting Your Message

Your first message matters. The platform gives you proven templates and AI-powered customization.

### Template Library

Access templates at **Campaigns** → **Templates** or via API at `/api/templates`.

**Available Categories:**

| Category | Count | Purpose |
|----------|-------|---------|
| Initial Outreach | 20 | First touch SMS |
| Gianna Loop | 10 | Follow-up escalation |
| Strategy Session | 5 | Meeting invites |
| Cold Call Openers | 20 | Phone scripts |

### Choosing a Template

1. Go to **Campaigns** → **Templates**
2. Browse by category
3. Click **Preview** to see the message with sample data
4. Variables like `{{first_name}}` auto-fill from your lead data

### Using the Communication Style Control

Want to customize the tone? Use the **Style Control**:

1. Go to **Campaigns** → **Message Builder**
2. Find the **Communication Style** panel
3. Adjust the sliders:

| Slider | Left Side | Right Side |
|--------|-----------|------------|
| Humor | Serious | Funny |
| Directness | Conversational | Direct |
| Warmth | Professional | Personal |
| Energy | Calm | High Energy |
| Urgency | Relaxed | Urgent |

4. Choose a **Character Influence**:
   - 👑 **Lori Greiner** — Confident, sees value immediately
   - 🏠 **Barbara Corcoran** — Warm, tells stories
   - ⚡ **Candace Owens** — Bold and articulate
   - 💰 **Mr. Wonderful** — Money-focused, direct
   - 🔥 **Grant Cardone** — 10X aggressive energy
   - 🐺 **Jordan Belfort** — Straight Line closer

5. Click **Preview** to see your customized message
6. Click **Save as Template** if you love it

### Quick Presets

Don't want to fiddle with sliders? Use presets:

- **Shark Tank Ladies** — Balanced confidence + warmth
- **Mr. Wonderful** — Blunt, money-focused
- **10X Energy** — Grant Cardone aggressive style
- **Straight Line Closer** — Jordan Belfort methodology

---

## 7. Launching Campaigns

Now that you have data and messages, let's reach out.

### Campaign Types

| Type | Channel | Best For |
|------|---------|----------|
| SMS Campaign | Text message | Initial outreach, high volume |
| Email Campaign | Email | Professional, documentation |
| Cold Call Campaign | Phone | High-value leads, immediate response |
| Gianna Loop | AI SMS | Automated follow-up sequence |

### Creating an SMS Campaign

1. Go to **Campaigns** → **New Campaign**
2. Give it a name: "Foreclosure Outreach - Dallas - Week 1"
3. Select your **Sector** (the leads you want to contact)
4. Choose a **Template** or write your own
5. Set **Schedule**:
   - **Send Now** — Messages go immediately
   - **Schedule** — Pick date/time
   - **Drip** — Spread over hours/days
6. Review the preview
7. Click **Launch Campaign**

### What Happens Next

- Messages queue up for sending
- SignalHouse delivers them
- Replies come back to your **Inbox**
- The system categorizes responses (positive, negative, neutral)

### Pausing or Canceling

Changed your mind? No problem.

1. Go to **Campaigns** → **Active Campaigns**
2. Find your campaign
3. Click **Pause** or **Cancel**
4. Unsent messages stop immediately

---

## 8. Training Gianna AI

Gianna is your AI assistant. She can handle conversations automatically — but she learns from you.

### The Training Hub

Navigate to **Admin** → **AI Training Hub**

You'll see two modes:

#### Human-in-the-Loop Mode (Recommended for Learning)

1. Gianna drafts a response
2. You review it
3. You can:
   - **Approve** — Send as-is
   - **Edit** — Modify and send
   - **Reject** — Write your own
4. Gianna learns from your choices

This is the safest way to start. Gianna gets smarter with every interaction.

#### Auto-Reply Mode (For Experienced Users)

1. Gianna handles responses automatically
2. She follows your established patterns
3. She escalates complex situations to you
4. You can override at any time

Only enable this after you've trained her on 50+ conversations.

### Teaching Gianna Your Voice

1. Go to the **Training** tab
2. Upload examples of your best conversations
3. Highlight messages you're proud of
4. Mark responses that worked (got meetings, positive replies)
5. Click **Train on Examples**

The more examples, the better she sounds like you.

### Gianna's Escalation Loop

Gianna can follow up automatically when leads go silent:

- **Step 1-3**: Professional, helpful
- **Step 4-6**: Light humor, self-aware persistence
- **Step 7-9**: Absurd humor (Leslie Nielsen style)
- **Step 10**: Graceful exit, door left open

The loop runs on a 24-hour delay between steps. It pauses automatically at step 10 or when the lead responds.

---

## 9. Monitoring Your Progress

### The API Monitor

Navigate to **Admin** → **API Monitor**

This is your command center for system health.

**What You'll See:**

1. **System Health** — Green means everything works
2. **API Calls Today** — Volume across all integrations
3. **Success Rate** — How many calls succeeded
4. **Webhooks** — Incoming events from external services

**Tabs Available:**

| Tab | Shows |
|-----|-------|
| Live Pulse | Real-time activity stream |
| Endpoints | Status of each API integration |
| Webhooks | Incoming events (replies, deliveries) |
| Usage & Limits | Quota consumption |
| Heatmaps | Activity patterns by day/hour |

### Reading the Heatmaps

The heatmaps show activity intensity:

- **Green** — Low activity
- **Yellow** — Moderate activity
- **Orange** — High activity
- **Red** — Peak activity

Use this to understand:
- When your team is most productive
- When leads are most responsive
- If there are unusual spikes or drops

### Signal Dashboard

For quick visibility into what matters:

1. Go to **Admin** → **Batch Jobs**
2. Click the **Signal Dashboard** tab
3. See real-time metrics:
   - API calls
   - Skip traces
   - SMS sent
   - Responses received

---

## 10. Batch Processing

For large operations, use batch jobs.

### Creating a Batch Job

1. Go to **Admin** → **Batch Jobs**
2. Click **New Batch Job**
3. Select job type:
   - **Skip Trace** — Find contact info
   - **SMS Campaign** — Send messages
   - **Email Campaign** — Send emails
   - **Enrichment** — Add Apollo data
   - **Gianna Loop** — Start AI follow-up
4. Upload your data (CSV)
5. Configure options
6. Click **Create Job**

### Monitoring Progress

The jobs table shows:

| Column | Meaning |
|--------|---------|
| Status | Pending, Running, Completed, Failed |
| Progress | Visual bar showing completion |
| Success Rate | % of records that succeeded |
| Created | When the job was queued |

### Controlling Jobs

- **Play** — Start a pending job
- **Pause** — Stop a running job (can resume)
- **Retry** — Restart a failed job
- **Download** — Get results (completed jobs)
- **Delete** — Remove from list

### Best Practices

1. **Start small** — Test with 50-100 records first
2. **Check quality** — Review results before scaling up
3. **Stagger large batches** — Don't overwhelm the system
4. **Monitor limits** — Stay within daily quotas

---

## 11. Daily Workflow

Here's a calm, sustainable daily routine:

### Morning (15 minutes)

1. **Check your Inbox**
   - Review overnight responses
   - Prioritize positives for immediate follow-up
   - Let Gianna handle neutrals

2. **Glance at the Dashboard**
   - Any campaigns need attention?
   - Any system alerts?

3. **Quick look at API Monitor**
   - All systems green?
   - Quotas healthy?

### Midday (30 minutes)

1. **Source new data**
   - Run property or business searches
   - Add promising leads to sectors

2. **Enrich and skip trace**
   - Queue batch jobs for new data
   - Let them run while you work

3. **Review Gianna's drafts**
   - Approve, edit, or reject
   - Train her with your feedback

### Afternoon (20 minutes)

1. **Launch new campaigns**
   - Select enriched, skip-traced leads
   - Choose templates
   - Schedule or send

2. **Check batch job progress**
   - Download completed results
   - Address any failures

3. **Plan tomorrow**
   - What sectors need attention?
   - What campaigns are running low?

### End of Day (5 minutes)

1. **Final inbox check**
   - Any hot leads to call first thing tomorrow?

2. **Review metrics**
   - How many responses today?
   - Any trends in the heatmaps?

3. **Relax**
   - The system works while you rest
   - Gianna handles the overnight

---

## 12. Troubleshooting

### Common Issues and Solutions

#### "My skip trace returned no results"

- **Check the address format** — Use full street address, city, state
- **Verify the property exists** — Some records are outdated
- **Try again tomorrow** — Occasional API hiccups happen

#### "Messages aren't sending"

1. Go to **API Monitor** → **Endpoints**
2. Check SignalHouse status
3. If degraded or down, wait for recovery
4. Check your daily SMS quota

#### "Enrichment is slow"

- Apollo has rate limits
- Large batches take time
- Check batch job progress — it's probably still running

#### "Gianna's responses sound wrong"

1. Go to **AI Training Hub**
2. Switch to **Human-in-the-Loop** mode
3. Provide more training examples
4. Be patient — she learns over time

#### "I'm out of API quota"

- Quotas reset at midnight UTC
- Prioritize highest-value leads
- Check **API Monitor** → **Usage** for details

### Getting Help

If something isn't working:

1. Check the **API Monitor** for errors
2. Look at the browser console for messages
3. Review recent changes in **Activity Log**
4. Reach out to support if needed

---

## Quick Reference

### Key Pages

| Page | URL Path | Purpose |
|------|----------|---------|
| Dashboard | `/dashboard` | Overview |
| Sectors | `/sectors` | Lead organization |
| Campaigns | `/campaigns` | Outreach management |
| Templates | `/campaigns/templates` | Message library |
| Batch Jobs | `/admin/batch-jobs` | Bulk operations |
| API Monitor | `/admin/api-monitor` | System health |
| AI Training | `/admin/ai-training` | Gianna training |
| Inbox | `/inbox` | Response management |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/templates` | GET | Fetch templates |
| `/api/realestate/skip-trace` | POST | Skip trace a property |
| `/api/apollo/enrich` | POST | Enrich a person |
| `/api/signalhouse/send` | POST | Send SMS |
| `/api/gianna/loop` | POST | Manage escalation loop |
| `/api/communication-style` | GET/POST | Style settings |

### Daily Limits

| Service | Daily Limit | Check At |
|---------|-------------|----------|
| Skip Trace | 5,000 | API Monitor → Usage |
| SignalHouse SMS | 50,000 | API Monitor → Usage |
| Apollo Enrichment | 1,000 | API Monitor → Usage |
| OpenAI | 10,000 | API Monitor → Usage |

---

## Final Thoughts

This platform is designed to do one thing exceptionally well: **help you do deals**.

Every feature, every button, every API — it all leads to that singular goal.

Don't try to use everything at once. Start with the basics:

1. Get data
2. Skip trace it
3. Send a message
4. Handle the response

That's the core loop. Everything else amplifies it.

Take your time. Build your rhythm. Trust the system.

The deals will come.

---

*Last updated: December 2024*
