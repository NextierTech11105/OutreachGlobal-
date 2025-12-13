# Data Hub User Guide

## Quick Start

**URL:** `/t/[your-team]/data-hub`

---

## The 3-Step Workflow

### Step 1: Get Data

You have two options:

**Option A: Upload CSV**
1. Click "Upload CSV" button
2. Select your file (USBizData, residential lists, etc.)
3. Data loads into the system

**Option B: Search Apollo**
1. Type a search query (e.g., "hotels NYC", "trucking companies Texas")
2. Click the search button
3. Results appear in the table

---

### Step 2: Enrich (Skip Trace)

This is where you get personal cell phones and emails.

**Cost:** $0.05 per successful match (RealEstateAPI)

**What you get back:**
- Personal cell phone
- Personal email
- Property portfolio
- Address history

**How to enrich:**
- **Single record:** Click the sparkle icon on any row
- **Bulk enrich:** Select multiple records → click "Bulk Enrich"
- **Test first:** Click "Test Skip Trace API" button to verify your API key works

---

### Step 3: Execute

Once records are enriched, you can reach out:

| Action | Icon | What it does |
|--------|------|--------------|
| SMS | Phone icon (blue) | Opens SMS composer with cell number |
| Call | Phone icon (green) | Initiates call via SignalWire |
| Email | Mail icon | Opens email composer (requires SendGrid) |
| Calendar | Calendar icon | Schedule follow-up |

---

## Data Sources

### USBizData (B2B)
- 75 specialty databases at $27 each
- Pre-formatted with: Company Name, Contact Name, Address, City, State, Zip, Phone, Email
- Examples: Hotels (434K), Trucking (307K), Physicians (2.1M), Realtors (2.1M)

### Residential (State Bundles)
- Available by state at $27 each
- Homeowner data with property addresses

### Cell Phone Database
- 90M+ mobile numbers
- $297 for full US or $27 per state

---

## The Math

| Layer | Cost | What You Get |
|-------|------|--------------|
| Raw Data | $27/database | Company + Contact + Address |
| Skip Trace | $0.05/record | Personal Cell + Email + Property Data |
| Execution | Pennies/message | Direct outreach via SMS/Call/Email |

---

## Quick Links

- **Data Hub:** `/t/[team]/data-hub`
- **B2B Search:** `/t/[team]/leads/import-companies`
- **All Leads:** `/t/[team]/leads`
- **SMS Queue:** `/t/[team]/sms-queue`
- **Call Center:** `/t/[team]/call-center`

---

## Troubleshooting

**Skip trace not working?**
- Check that `REALESTATE_API_KEY` is set in environment variables
- Click "Test Skip Trace API" button to verify

**No results from Apollo search?**
- Check that Apollo API key is configured in Admin → Apollo Settings

**CSV upload failing?**
- Ensure file is .csv format
- Check that columns include: name, address, city, state, zip
