# Property ID Bucket System

## Overview

Buckets are the **central data lake** for the platform. They store property IDs economically and enable on-demand enrichment for campaign deployment.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BUCKET WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   SEARCH ──► SAVE IDs ──► BUCKET ──► ENRICH ──► DEPLOY             │
│   (free)     (free)       (store)    (on-demand)  (campaigns)      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Why Buckets?

| Without Buckets | With Buckets |
|-----------------|--------------|
| Search 800K properties = 800K API credits | Search 800K = **0 credits** (IDs only) |
| Enrich all upfront = expensive | Enrich 2K at a time = **controlled spend** |
| No tracking of changes | Track field changes over time |
| One-time use | Reusable data asset |

## Bucket Lifecycle

### 1. Create Bucket (Free)
```
POST /api/property/bucket
{
  "name": "FL Pre-Foreclosure High Equity",
  "propertyIds": ["123", "456", ...],  // Up to 800K+ IDs
  "filters": { "state": "FL", "leadTypes": ["pre_foreclosure", "high_equity"] },
  "signals": { "preForeclosure": 1200, "highEquity": 3400, ... }
}
```
- Stores property IDs only (no detail data yet)
- Captures search filters and distress signal counts
- Zero API credits consumed

### 2. Process Bucket (On-Demand)
```
POST /api/property/bucket/process
{
  "bucketId": "xxx",
  "limit": 2000,      // 2K per campaign block
  "skipTrace": true   // Include phone lookup
}
```
- Fetches PropertyDetail for each ID
- Runs SkipTrace for phone numbers
- Updates leads with full data
- Consumes credits only for processed leads

### 3. Apollo Enrich (Optional)
```
POST /api/apollo/enrich
{
  "leadIds": ["lead1", "lead2", ...],
  "type": "people",
  "revealEmails": true,
  "revealPhones": true
}
```
- Enriches with business data (title, company, LinkedIn)
- Reveals personal emails and phone numbers
- 10 per API request (auto-batched)

### 4. Deploy to Campaigns
Enriched leads flow to:
- **SMS Campaigns** - High volume outreach
- **Calendar/Dialer** - Phone call scheduling
- **Email Sequences** - Drip campaigns
- **Phone Center** - Manual calling queues

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   SEARCH     │     │   BUCKET     │     │    LEADS     │
│              │     │              │     │              │
│ RealEstateAPI├────►│ Property IDs ├────►│ Full Detail  │
│ (IDs only)   │     │ + Filters    │     │ + SkipTrace  │
│              │     │ + Signals    │     │ + Apollo     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                    │
                            │                    ▼
                            │            ┌──────────────┐
                            │            │  CAMPAIGNS   │
                            │            │              │
                            └───────────►│ SMS / Phone  │
                                         │ Email / Dial │
                                         └──────────────┘
```

## Database Schema

### `buckets` table
| Field | Purpose |
|-------|---------|
| `id` | Unique bucket identifier |
| `name` | User-friendly name |
| `filters` | Original search criteria (JSON) |
| `totalLeads` | Count of property IDs stored |
| `enrichedLeads` | Count of fully enriched leads |
| `enrichmentStatus` | pending / processing / completed |

### `leads` table
| Field | Purpose |
|-------|---------|
| `bucketId` | Link to parent bucket |
| `propertyId` | RealEstateAPI property ID |
| `enrichmentStatus` | pending / completed / partial |
| `phone`, `email` | Contact info from SkipTrace |
| `apolloEnrichedAt` | When Apollo enrichment ran |
| `apolloData` | Full Apollo response (JSON) |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/property/bucket` | POST | Create bucket with IDs |
| `/api/property/bucket` | GET | List buckets or get one |
| `/api/property/bucket` | PUT | Add more IDs to bucket |
| `/api/property/bucket` | DELETE | Remove bucket + leads |
| `/api/property/bucket/leads` | GET | Get leads needing enrichment |
| `/api/property/bucket/process` | POST | Batch enrich leads |
| `/api/apollo/enrich` | POST | Apollo bulk enrichment |

## UI Components

### Properties Page (`/t/[team]/properties`)

1. **Save IDs Button** - After search, save results to new bucket
2. **Buckets Button** - Open bucket management panel
3. **Bucket Card** - Shows:
   - Name and description
   - Total vs enriched count
   - Progress bar
   - Action buttons:
     - `250` - Quick test batch
     - `2K Block` - Campaign-sized batch
     - `Apollo` - Business enrichment
     - `X` - Delete bucket

## Enrichment Tiers

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Property IDs Only (Free)                           │
│ - Property ID, APN, FIPS                                   │
│ - No contact info, no detail                               │
├─────────────────────────────────────────────────────────────┤
│ TIER 2: Property Detail ($)                                │
│ - Address, beds, baths, sqft, value                        │
│ - Owner name, equity, mortgage info                        │
│ - Distress flags (foreclosure, tax lien, etc)              │
├─────────────────────────────────────────────────────────────┤
│ TIER 3: Skip Trace ($$)                                    │
│ - Phone numbers (mobile, landline)                         │
│ - Email addresses                                          │
│ - Mailing address                                          │
├─────────────────────────────────────────────────────────────┤
│ TIER 4: Apollo Enrichment ($$$)                            │
│ - Personal emails revealed                                 │
│ - Additional phone numbers                                 │
│ - Job title, company, LinkedIn                             │
│ - Industry, employee count                                 │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Save big, enrich small** - Store 800K IDs, process 2K at a time
2. **Filter before enriching** - Use distress signals to prioritize
3. **Track changes** - Re-run searches to detect field changes
4. **Batch appropriately**:
   - 250 for testing
   - 2,000 for campaign blocks
   - 5,000 daily limit recommended

## Example Workflow

```bash
# 1. Search for motivated sellers (free)
POST /api/property/search
{ "state": "FL", "leadTypes": ["pre_foreclosure"], "mode": "ids" }
# Returns: 45,000 property IDs

# 2. Save to bucket (free)
POST /api/property/bucket
{ "name": "FL Pre-Foreclosure Q4", "propertyIds": [...45000 IDs...] }

# 3. Process first campaign block ($)
POST /api/property/bucket/process
{ "bucketId": "xxx", "limit": 2000, "skipTrace": true }
# Returns: 2000 leads with phones

# 4. Apollo enrich high-value leads ($$$)
POST /api/apollo/enrich
{ "leadIds": [...top 100 leads...], "revealEmails": true }

# 5. Deploy to SMS campaign
POST /api/sms/campaign
{ "bucketId": "xxx", "message": "Hi {{firstName}}..." }
```
