# Data Flow

## Overview

Complete data flow through the Property Tracking System from user input to campaign execution.

---

## Flow 1: Initial Property Search

```
USER INPUT
  ↓
┌─────────────────────────────────────┐
│ 1. STATIC ANCHORS (Required)       │
│  • State (NY, NJ, FL, CT)          │
│  • County (Nassau, Miami-Dade)     │
│  • Property Type (SFR, MFH, etc.)  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 2. TIME & OCCUPANCY (Required)     │
│  • Years Owned (5+ minimum)        │
│  • Absentee Owner / Owner Occupied │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 3. EXECUTE COUNT                    │
│  POST /realestate-api/property-count│
│  Returns: Total properties + blocks │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 4. DYNAMIC EVENT FILTERS (Optional) │
│  • Pre-Foreclosure                  │
│  • Lis Pendens                      │
│  • Tax Liens                        │
│  • MLS Status                       │
│  • Vacancy                          │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 5. EXECUTE SEARCH                   │
│  POST /realestate-api/property-search│
│  Returns: Property IDs (100-10000)  │
└─────────────────────────────────────┘
```

**Output:** Array of property IDs ready for save

---

## Flow 2: Save Search

```
PROPERTY IDs FROM SEARCH
  ↓
┌─────────────────────────────────────┐
│ USER: Create Saved Search           │
│  • Enter Search Name                │
│  • Enable/Disable Daily Tracking    │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ BACKEND: Create Database Records    │
│  saved_searches table:              │
│   - id: ss_01abc123                 │
│   - searchName: "MFH-Nassau"        │
│   - searchQuery: {state, county...} │
│   - totalProperties: 1543           │
│   - batchJobEnabled: "true"         │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ BACKEND: Create Result Placeholders │
│  saved_search_results table:        │
│   FOR EACH property ID:             │
│   - savedSearchId: ss_01abc123      │
│   - propertyId: prop_123            │
│   - firstSeenAt: NOW()              │
│   - lastSeenAt: NOW()               │
│   - signals: NULL (not enriched)    │
└─────────────────────────────────────┘
```

**Output:** Saved search ready for enrichment and tracking

---

## Flow 3: Batch Enrichment (250 Properties Per Batch)

```
SAVED SEARCH IDs
  ↓
┌─────────────────────────────────────────────────────┐
│ BATCH 1 (Property IDs 0-249)                        │
│   ┌─────────────────────────────────────────┐      │
│   │ Parallel Property Detail API Calls      │      │
│   │  • GET /property/:id (250 parallel)     │      │
│   │  • Returns: Full property payload       │      │
│   │    - Owner info                          │      │
│   │    - Property details                    │      │
│   │    - Tax info                            │      │
│   │    - Mortgage info                       │      │
│   │    - Lender info                         │      │
│   │    - Estimated value                     │      │
│   │    - Equity percent                      │      │
│   └─────────────────────────────────────────┘      │
│   ↓                                                  │
│   ┌─────────────────────────────────────────┐      │
│   │ Store Full Payload in Database          │      │
│   │  UPDATE saved_search_results            │      │
│   │  SET propertyData = {...}               │      │
│   │      signals = {extracted fields}       │      │
│   └─────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ BATCH 2 (Property IDs 250-499)                      │
│  [Same process as Batch 1]                          │
└─────────────────────────────────────────────────────┘
  ↓
... (Continue for all batches)
```

**Output:** Database populated with full property details and signals

---

## Flow 4: Skip Trace (Owner Contact Info)

```
ENRICHED PROPERTY IDs
  ↓
┌─────────────────────────────────────────────────────┐
│ BATCH 1 (Property IDs 0-249)                        │
│   ┌─────────────────────────────────────────┐      │
│   │ Parallel Skip Trace API Calls           │      │
│   │  • POST /skip-trace (250 parallel)      │      │
│   │  • Input: Owner name + property address │      │
│   │  • Returns:                              │      │
│   │    - Phone numbers (mobile + home)      │      │
│   │    - Email addresses                     │      │
│   │    - Current address                     │      │
│   │    - Match confidence                    │      │
│   └─────────────────────────────────────────┘      │
│   ↓                                                  │
│   ┌─────────────────────────────────────────┐      │
│   │ Update Property Data with Contacts      │      │
│   │  UPDATE saved_search_results            │      │
│   │  SET propertyData = propertyData ||     │      │
│   │    {skipTrace: {...}}                    │      │
│   └─────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
  ↓
... (Continue for all batches)
```

**Output:** Properties with owner contact info ready for campaigns

---

## Flow 5: Campaign Import

```
SKIP TRACED PROPERTY IDs
  ↓
┌─────────────────────────────────────┐
│ USER: Select Properties for Campaign│
│  • Select property IDs              │
│  • Enter campaign name              │
│  • Choose message template          │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ BACKEND: Transform to Nextier Leads │
│  FOR EACH property:                 │
│   {                                 │
│     name: "John Doe",               │
│     email: "john@...",              │
│     phone: "+1-555-123-4567",       │
│     address: "123 Main St",         │
│     propertyValue: 850000,          │
│     equityPercent: 47,              │
│     metadata: {                     │
│       propertyId: "prop_123",       │
│       preForeclosure: true,         │
│       deedType: "estate",           │
│       yearsOwned: 8,                │
│       lenderName: "Wells Fargo"     │
│     }                               │
│   }                                 │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ NEXTIER: Create Leads + Campaign    │
│  • Create lead records              │
│  • Attach full metadata             │
│  • Launch AI SDR campaign           │
│  • Generate hyper-personalized msgs │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ SMS SEND (Batch 250)                │
│  • Twilio Studio flow               │
│  • SignalHouse.io messaging         │
│  • Human-in-the-loop oversight      │
└─────────────────────────────────────┘
```

**Output:** Active campaigns with property context in every message

---

## Flow 6: Daily Tracking (Automated)

```
CRON JOB (Midnight Daily)
  ↓
┌─────────────────────────────────────┐
│ Get Active Saved Searches           │
│  SELECT * FROM saved_searches       │
│  WHERE batch_job_enabled = 'true'   │
└─────────────────────────────────────┘
  ↓
FOR EACH SAVED SEARCH:
  ↓
┌─────────────────────────────────────┐
│ Re-Execute Original Search Query    │
│  POST /realestate-api/property-search│
│  WITH original filters              │
│  Returns: TODAY's property IDs      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Compare Today vs Yesterday          │
│  ADDED: IDs in today, not yesterday │
│  DELETED: IDs in yesterday, not today│
│  UNCHANGED: IDs in both             │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ For UNCHANGED Properties:           │
│  Get Property Detail (batch 250)    │
│  Compare signals with stored values │
│  Detect field changes:              │
│   - deedType (estate?)              │
│   - preForeclosure (true?)          │
│   - auctionStatus (cancelled?)      │
│   - mlsListed (true?)               │
│   - vacant (true?)                  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ IF CRITICAL EVENT DETECTED:         │
│  • estate_deed                      │
│  • pre_foreclosure                  │
│  • auction_cancelled                │
│  • mls_listed                       │
│                                     │
│  THEN:                              │
│   1. Update signal_history          │
│   2. Trigger follow-up campaign     │
│   3. Send priority SMS              │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Update Saved Search Stats           │
│  UPDATE saved_searches              │
│  SET addedCount = X                 │
│      deletedCount = Y               │
│      updatedCount = Z               │
│      lastBatchJobAt = NOW()         │
└─────────────────────────────────────┘
```

**Output:** Event-driven follow-up campaigns triggered automatically

---

## Data Transformations

### RealEstateAPI → Database

```typescript
// RealEstateAPI Property Response
{
  id: "prop_123",
  address: { streetAddress: "123 Main St", ... },
  ownerInfo: { owner1FullName: "John Doe", ... },
  propertyInfo: { propertyType: "Multi-Family", ... },
  estimatedValue: 850000,
  equityPercent: 47,
  preForeclosure: true,
  deedType: "estate"
}

// Transform to saved_search_results.signals
{
  ownerName: "John Doe",
  deedType: "estate",
  yearsOwned: 8,
  preForeclosure: true,
  mlsListed: false,
  vacant: false,
  absenteeOwner: true,
  equityPercent: 47,
  estimatedValue: 850000
}

// Store full payload in saved_search_results.propertyData
{
  ...entireAPIResponse,
  skipTrace: { phones: [...], emails: [...] }
}
```

### Database → Nextier Lead

```typescript
// saved_search_results record
{
  propertyId: "prop_123",
  signals: { ownerName: "John Doe", preForeclosure: true, ... },
  propertyData: { address: {...}, ownerInfo: {...}, ... }
}

// Transform to Nextier lead
{
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1-555-123-4567",
  address: "123 Main St",
  city: "Garden City",
  state: "NY",
  zipCode: "11530",
  propertyValue: 850000,
  equityPercent: 47,
  metadata: {
    propertyId: "prop_123",
    preForeclosure: true,
    deedType: "estate",
    yearsOwned: 8,
    lenderName: "Wells Fargo",
    mlsListed: false,
    skipTraceMatch: true
  }
}
```

---

## Parallel Execution Model

The system runs TWO processes simultaneously on the same property IDs:

### Process A: Immediate Campaign (User-Initiated)
```
User clicks "Import to Campaign"
  ↓
Batch enrich 250 properties
  ↓
Batch skip trace 250 properties
  ↓
Send initial SMS (batch 250)
  ↓
[Campaign running with AI SDR]
```

### Process B: Daily Tracking (Automated)
```
Cron job runs at midnight
  ↓
Re-execute search query
  ↓
Compare property IDs
  ↓
Detect field changes
  ↓
Send follow-up SMS on events
  ↓
[Continuous monitoring]
```

**Key Insight:** The SAME property IDs are both in active campaigns AND being monitored for events. This creates a feedback loop where event detection triggers timely follow-ups during active campaigns.

---

## Error Handling Flow

```
API CALL FAILS
  ↓
┌─────────────────────────────────────┐
│ Retry Logic (3 attempts)            │
│  • Exponential backoff              │
│  • 2s, 4s, 8s delays                │
└─────────────────────────────────────┘
  ↓
IF STILL FAILS:
  ↓
┌─────────────────────────────────────┐
│ Log Error                           │
│  • Property ID                      │
│  • Error message                    │
│  • Timestamp                        │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Continue with Next Property         │
│  • Don't block entire batch         │
│  • User can retry failed properties │
└─────────────────────────────────────┘
```
