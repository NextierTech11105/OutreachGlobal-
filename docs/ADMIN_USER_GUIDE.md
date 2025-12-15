# OutreachGlobal Admin Guide
## Complete Step-by-Step Instructions

---

## THE BIG PICTURE

```
YOUR DATA (Datalake)
      |
      v
LUCI searches your data, finds decision makers, skip traces them
      |
      v
Push enriched leads into CAMPAIGNS
      |
      v
GIANNA handles all inbound messages from campaigns
      |
      v
CATHY nudges anyone who doesn't respond
```

---

## STEP 1: DATALAKE (Your Data Source)

**Where:** Admin > Lead Generation > Property Pipeline > Step 1 (Datalake)

**What it does:** This is where all your uploaded business lists live. You can search them by keyword, sector, or location.

**How to use it:**
1. Type a natural language query like:
   - "Get me 50 hotel owners in Florida"
   - "Find trucking companies in New Jersey"
   - "Show auto dealers in Texas"
2. The system searches your uploaded data
3. Results show company name, contact, phone, email, address
4. Click leads to select them
5. Export to CSV or push to next step

**What data is in here:**
- USBizData (Hotels, Auto Dealers, Trucking, Campgrounds, Aircraft, etc.)
- NY Business Database (5.5M records)
- Any CSV files you've uploaded

---

## INTEGRATIONS

### Apollo Enrichment
**Where:** Admin > Lead Generation > Apollo Enrichment

**What it does:** Connects to Apollo.io to enrich business leads with contact information.

### Property Lookup
**Where:** Admin > Lead Generation > Property Lookup

**What it does:** Connects to real estate data providers to lookup property details and owners.

---

## STEP 2: LUCI (Search, Enrich, Push to Campaigns)

**Where:** Admin > Lead Generation > Property Pipeline > Step 2 (LUCI)

**What it does:** LUCI is your data engineer. She:
1. Searches your datalake by keywords/lists
2. Finds decision makers (Owner, CEO, President, VP)
3. Skip traces to get phone numbers and emails
4. Pushes enriched leads into campaigns

**How to use it:**

### Sources Tab
- Shows all your connected data sources
- Click "Sync" to refresh data from a source
- Green = connected, Yellow = syncing, Red = error

### Pipelines Tab
- Shows automated data flows (ETL jobs)
- Example: "USBizData → Datalake" runs daily at 2AM
- Click Play to run a pipeline manually

### Quality Tab
- Shows data quality scores
- Green = healthy, Yellow = needs attention, Red = problem
- Check which fields have missing data

### Cross-Ref Tab
- Matches records across different sources
- Example: Match Hotels with Skip Trace results by address
- Click "Run" to find new matches

### Engine Tab (Chess Board)
- Shows AI recommendations for what to do next
- "Best Moves" = suggested actions ranked by impact
- Daily Mission = your target for the day
- Threat Detection = data problems to fix

**The Flow:**
1. LUCI searches your keywords in the datalake
2. Filters for decision maker titles (Owner, CEO, etc.)
3. Sends addresses to skip trace for phone/email
4. Enriched leads get pushed to campaigns

---

## STEP 3: GIANNA (Inbox Manager)

**Where:** Admin > Lead Generation > Property Pipeline > Step 3 (Gianna)

**What it does:** Gianna manages ALL inbound messages from your campaign phone numbers. When someone texts back, Gianna:
1. Receives the message
2. Auto-replies intelligently
3. Books appointments
4. Confirms calls
5. Routes hot leads to you

**How to use it:**

### Stats Row
- Total Leads = everyone in the system
- No Contact = haven't reached yet
- Contacted = reached but no response
- Responded = replied to us
- Conversion = response rate %

### Sector Matrix
- Click sectors to select them for a campaign
- Each box shows:
  - Total leads in that sector
  - Progress bar (gray=pending, yellow=attempted, blue=contacted, green=responded, purple=converted)
  - Average priority score

### Launch Campaign
1. Click sectors you want to target
2. Click "Launch Omni Campaign"
3. Campaign runs in batches of 2,000
4. Watch progress in "Active Campaigns" section

### Prioritization Weights
- Controls which leads get contacted first
- Higher weight = higher priority
- Example: "has_phone: 25" means having a phone adds 25 points to priority score

---

## STEP 4: CATHY (Follow-Up Nudger)

**Where:** Admin > Lead Generation > Property Pipeline > Step 4 (Cathy)

**What it does:** Cathy automatically follows up with people who don't respond. She sends nudge messages on a schedule until they respond or hit the max attempts.

**How to use it:**

### Set Nudge Rules
- Days between nudges (e.g., 3 days)
- Max nudge attempts (e.g., 5 attempts)
- Message templates for each nudge

### Monitor Progress
- See who's been nudged
- See who responded after nudge
- See who hit max attempts (move to cold list)

---

## OTHER IMPORTANT ADMIN PAGES

### Apollo Enrichment
**Where:** Admin > Integrations > Apollo Enrichment

**What it does:** Enriches business data with:
- Decision maker names and titles
- Direct phone numbers
- Email addresses
- Company details

**How to use:**
1. Enter a company name or domain
2. Click "Enrich"
3. Get back contact info for key people

### Property Lookup
**Where:** Admin > Integrations > Property Lookup

**What it does:** Gets property ownership data:
- Who owns the property
- Property value
- Owner contact info

### B2B Search
**Where:** Admin > Lead Generation > B2B Search

**What it does:** Search for businesses across all US states using Apollo's database.

### AI SDR Avatars
**Where:** Admin > Outreach > AI SDR Avatars

**What it does:** Create AI personas that handle outreach. Each avatar has:
- Name and personality
- Communication style
- Assigned sectors

---

## THE COMPLETE WORKFLOW (Do This In Order)

### Day 1: Set Up Your Data
1. Go to **Admin > Lead Generation > Property Pipeline**
2. In **Datalake** (Step 1), verify your data sources are connected
3. Run a test query to make sure data is accessible

### Day 2: Configure LUCI
1. Go to **LUCI** (Step 2)
2. Check Sources tab - all sources should be green
3. Check Quality tab - fix any red/yellow issues
4. Set up Cross-References if you have multiple data sources

### Day 3: Launch Your First Campaign
1. Go to **Gianna** (Step 3)
2. Click sectors you want to target
3. Review the lead counts
4. Click "Launch Omni Campaign"
5. Watch progress

### Day 4: Set Up Follow-Ups
1. Go to **Cathy** (Step 4)
2. Configure nudge timing (e.g., every 3 days)
3. Set max attempts (e.g., 5)
4. Write nudge message templates

### Ongoing: Monitor Daily
1. Check Gianna for new responses
2. Check Cathy for nudge results
3. Check LUCI Engine tab for AI recommendations
4. Run new campaigns as needed

---

## QUICK REFERENCE

| Step | Agent | What It Does |
|------|-------|--------------|
| 1 | Datalake | Your data source - search business lists |
| 2 | LUCI | Search, find decision makers, skip trace, push to campaigns |
| 3 | Gianna | Handle all inbound messages from campaigns |
| 4 | Cathy | Auto follow-up with non-responders |

| Integration | What It Does |
|-------------|--------------|
| Apollo | Get contact info for decision makers |
| Property Lookup | Get property ownership data |
| SignalHouse | Send/receive SMS messages |
| Twilio | Voice calls |
| SendGrid | Send emails |

---

## TROUBLESHOOTING

**No data showing in Datalake?**
- Check if data sources are synced (LUCI > Sources tab)
- Run a sync if needed

**Campaign not sending?**
- Check SignalHouse is configured (Admin > Integrations > SMS)
- Check you have phone numbers in your data

**Not getting responses?**
- Check Gianna is active
- Check your message templates
- Verify phone numbers are valid (mobile, not landline)

**LUCI showing errors?**
- Check the Quality tab for data issues
- Run Cross-Reference to match records

---

## SUPPORT

For technical issues, check:
- Admin Dashboard > System Status (shows all integrations)
- Admin > Integrations > API Keys & Status
