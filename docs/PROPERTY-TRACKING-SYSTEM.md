# Property Tracking System - Complete Architecture

## Overview

The property tracking system is a **machine learning-based lead generation engine** that:
1. Saves property IDs from searches to DigitalOcean Spaces (10k block storage)
2. Enriches properties with full detail payload in batches of 250
3. Tracks daily changes and detects 25+ property events
4. Triggers automated SMS/email campaigns based on event signals
5. Pushes real-time notifications to dashboard

## Architecture

### Phase 1: SAVE Property IDs
```
User Search (State → County → Zip → Property Type)
    ↓
Execute RealEstateAPI PropertySearch
    ↓
Save Property IDs to DigitalOcean Spaces
    ↓
Folder Structure: {teamId}/{YYYY-MM-DD}/{searchName}/block_{n}.csv
    ↓
10k Blocks (block_1.csv, block_2.csv, etc.)
```

### Phase 2: ENRICH in Batches of 250
```
Get Saved Property IDs from Spaces
    ↓
Chunk into batches of 250
    ↓
For each batch:
    - Call PropertyDetail API (full payload)
    - Call SkipTrace API (owner phones)
    - Store enriched data
    ↓
Save Enriched Data: {searchName}_enriched/
```

### Phase 3: TRACK Daily Changes
```
Daily Cron Job (Midnight)
    ↓
Execute Saved Search Query
    ↓
Compare Today's IDs vs Yesterday's IDs
    ↓
Detect: Added, Deleted, Updated Properties
    ↓
For Updated Properties:
    - Compare field values (old vs new)
    - Detect Events (25+ event types)
    - Flag/Label/Tag based on events
    ↓
Store Event History in Database
```

### Phase 4: CAMPAIGN Triggers
```
Event Detection
    ↓
Filter: Critical Events + Campaign-Triggerable
    ↓
Get Owner Phones (Skip Trace)
    ↓
Create SMS/Email Campaign
    ↓
Execute via Twilio Studio + SignalHouse.io
```

### Phase 5: PING Dashboard
```
Events Detected
    ↓
Push Notifications via WebSocket/SSE
    ↓
Dashboard Activity Feed
    ↓
Critical Events Highlighted
```

## Event Matrix (25+ Events)

### Ownership Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `property_sold` | CRITICAL | No | Property sold to new owner |
| `ownership_change` | HIGH | Yes (SMS) | Ownership changed (non-sale transfer) |
| `deed_transfer` | HIGH | Yes (SMS) | Deed transferred |
| `estate_deed` | CRITICAL | Yes (SMS) | Estate/probate deed - HIGHLY MOTIVATED SELLER |

### Listing Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `mls_listed` | CRITICAL | Yes (SMS) | Property listed on MLS - ACTIVE SELLER |
| `mls_delisted` | HIGH | Yes (SMS) | Property delisted from MLS - FAILED LISTING |
| `price_reduction` | CRITICAL | Yes (SMS) | MLS price reduced - MOTIVATED SELLER |
| `price_increase` | LOW | No | MLS price increased |

### Distress Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `pre_foreclosure` | CRITICAL | Yes (SMS) | Pre-foreclosure notice filed - URGENT DISTRESS |
| `foreclosure_started` | CRITICAL | Yes (SMS) | Foreclosure proceedings started |
| `foreclosure_cleared` | MEDIUM | No | Foreclosure cleared/resolved |
| `lis_pendens_filed` | HIGH | Yes (SMS) | Lis Pendens filed - Legal action pending |
| `tax_lien_filed` | HIGH | Yes (SMS) | Tax lien filed - Financial distress |
| `bankruptcy_filed` | CRITICAL | Yes (SMS) | Bankruptcy filed - URGENT OPPORTUNITY |

### Occupancy Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `became_vacant` | HIGH | Yes (SMS) | Property became vacant |
| `became_occupied` | LOW | No | Property became occupied |
| `became_absentee` | MEDIUM | Yes (Email) | Owner became absentee |

### Value Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `equity_increase` | MEDIUM | No | Equity increased by 10%+ |
| `equity_decrease` | HIGH | Yes (SMS) | Equity decreased by 10%+ - Potential distress |
| `high_equity_reached` | HIGH | Yes (Email) | High equity reached (60%+) |
| `value_increase` | LOW | No | Property value increased |
| `value_decrease` | MEDIUM | No | Property value decreased |

### Portfolio Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `investor_buying` | HIGH | Yes (Email) | Investor actively buying - Portfolio buyer |
| `investor_selling` | CRITICAL | Yes (SMS) | Investor actively selling - Portfolio liquidation |
| `portfolio_expanded` | MEDIUM | No | Investor portfolio expanded |
| `portfolio_shrunk` | HIGH | Yes (SMS) | Investor portfolio shrinking - Liquidating |

### Time-Based Events
| Event | Priority | Trigger Campaign | Description |
|-------|----------|------------------|-------------|
| `long_term_owner` | MEDIUM | Yes (Direct Mail) | Owner held property 5+ years |
| `very_long_term_owner` | HIGH | Yes (Direct Mail) | Owner held property 10+ years - Retirement opportunity |
| `recent_purchase` | LOW | No | Property recently purchased (< 1 year) |

## Business Rules

### 5-Year Ownership Minimum
```typescript
if (property.yearsOwned < 5) {
  // Skip event detection
  // Don't pursue or campaign
  return [];
}
```

**Reason:** Recently sold properties are not good leads. Focus on long-term owners who are more likely to sell.

### Sequential Validation
```
1. State (required first)
2. County
3. Zip Codes
4. Property Type
↓
THEN apply filters:
- Years Owned
- Occupancy (Absentee/Owner Occupied)
- Equity %
- Distress signals
```

### IF/THEN Campaign Logic
```
IF property.preForeclosure === true
THEN flag = "distress"
  AND trigger = SMS campaign
  AND priority = CRITICAL

IF property.equityPercent > 60%
THEN label = "high_equity"
  AND tag = "motivated_seller"
  AND trigger = Email campaign
```

## API Endpoints

### Search & Count
```bash
POST /rest/:teamId/realestate-api/property-search
POST /rest/:teamId/realestate-api/property-count
```

### Saved Searches
```bash
POST /rest/:teamId/realestate-api/saved-search/create
POST /rest/:teamId/realestate-api/saved-search/list
POST /rest/:teamId/realestate-api/saved-search/delete
```

### Enrichment
```bash
POST /rest/:teamId/realestate-api/enrich-saved-search
Body: {
  searchName: "MFH-Queens-Absentee",
  includeSkipTrace: true,
  maxProperties: 1000
}
```

```bash
POST /rest/:teamId/realestate-api/enrichment-status
Body: { searchName: "MFH-Queens-Absentee" }
```

### Tracking
```bash
POST /rest/:teamId/realestate-api/track-saved-search
Body: { searchId: "ss_01..." }
```

## Example Workflow

### Example: "MFH Queens Absentee" Saved Search

**Step 1: COUNT Query**
```bash
POST /property-count
{
  "state": "NY",
  "county": "Queens",
  "propertyType": "Multi-Family",
  "absenteeOwner": true
}

Response: { count: 15234, estimatedBlocks: 2 }
```

**Step 2: SAVE Search**
```bash
POST /saved-search/create
{
  "searchName": "MFH-Queens-Absentee",
  "searchQuery": { ... }
}

→ Saves 15,234 property IDs to Spaces
→ block_1.csv (10,000 IDs)
→ block_2.csv (5,234 IDs)
```

**Step 3: ENRICH (Batch 250)**
```bash
POST /enrich-saved-search
{
  "searchName": "MFH-Queens-Absentee",
  "includeSkipTrace": true,
  "maxProperties": 1000
}

→ Processes 1,000 IDs in 4 batches of 250
→ Calls PropertyDetail API
→ Calls SkipTrace API (owner phones)
→ Saves enriched data
```

**Step 4: TRACK Daily (Automated)**
```
Cron job runs at midnight:

1. Execute search query
2. Get 15,234 current property IDs
3. Compare with yesterday's 15,234 IDs
4. Detect changes:
   - 12 properties became vacant
   - 3 properties entered pre-foreclosure
   - 8 properties listed on MLS
   - 2 properties had owner changes

5. Flag events:
   - CRITICAL: 3 pre-foreclosure (trigger SMS)
   - CRITICAL: 8 MLS listed (trigger SMS)
   - HIGH: 12 became vacant (trigger SMS)
   - HIGH: 2 ownership changes (trigger SMS)

6. Create campaigns for 25 properties
7. Push 25 notifications to dashboard
```

**Step 5: Query Subsets**
```bash
# How many pre-foreclosures in this saved search?
GET /saved-search/:id/query?filter=preForeclosure

# How many MLS listed?
GET /saved-search/:id/query?filter=mlsListed

# How many 5+ years owned with high equity?
GET /saved-search/:id/query?filter=yearsOwned>5&equityPercent>60
```

## Database Schema

### saved_searches
```sql
CREATE TABLE saved_searches (
  id VARCHAR PRIMARY KEY,
  team_id VARCHAR NOT NULL,
  search_name VARCHAR NOT NULL,
  search_query JSONB NOT NULL,

  -- Tracking
  last_report_date TIMESTAMP,
  next_report_date TIMESTAMP,

  -- Stats
  total_properties VARCHAR,
  added_count VARCHAR,
  deleted_count VARCHAR,
  updated_count VARCHAR,

  -- Batch Job
  batch_job_enabled VARCHAR DEFAULT 'false',
  last_batch_job_at TIMESTAMP,
  batch_job_status VARCHAR
);
```

### saved_search_results
```sql
CREATE TABLE saved_search_results (
  id VARCHAR PRIMARY KEY,
  saved_search_id VARCHAR REFERENCES saved_searches(id),

  -- Property
  property_id VARCHAR NOT NULL,
  external_id VARCHAR,

  -- Change Tracking
  change_type VARCHAR, -- 'added', 'updated', 'deleted'
  last_update_date TIMESTAMP,

  -- Stats
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  times_found VARCHAR DEFAULT '1',

  -- Signals (current state)
  signals JSONB,

  -- Signal History (track changes over time)
  signal_history JSONB, -- Array of { date, signals, changeType }

  -- Full Property Data
  property_data JSONB
);
```

### signal_history Example
```json
[
  {
    "date": "2025-01-15",
    "signals": {
      "vacant": false,
      "preForeclosure": false,
      "equityPercent": 45
    },
    "changeType": "added"
  },
  {
    "date": "2025-01-20",
    "signals": {
      "vacant": true,
      "preForeclosure": false,
      "equityPercent": 45
    },
    "changeType": "updated",
    "events": ["became_vacant"]
  },
  {
    "date": "2025-01-25",
    "signals": {
      "vacant": true,
      "preForeclosure": true,
      "equityPercent": 42
    },
    "changeType": "updated",
    "events": ["pre_foreclosure", "equity_decrease"]
  }
]
```

## DigitalOcean Spaces Configuration

### Environment Variables (Production)
```bash
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_ACCESS_KEY=<your_access_key>
DO_SPACES_SECRET_KEY=<your_secret_key>
DO_SPACES_BUCKET=nextier-property-tracking
```

### Folder Structure
```
nextier-property-tracking/
├── team_01abc123/
│   ├── 2025-01-15/
│   │   ├── MFH-Queens-Absentee/
│   │   │   ├── block_1.csv (10,000 IDs)
│   │   │   ├── block_2.csv (5,234 IDs)
│   │   ├── MFH-Queens-Absentee_enriched/
│   │   │   ├── block_1.csv (10,000 full payloads)
│   │   │   ├── block_2.csv (5,234 full payloads)
│   ├── 2025-01-16/
│   │   ├── MFH-Queens-Absentee/
│   │   │   ├── block_1.csv
│   │   │   ├── block_2.csv
```

## Services Architecture

### SpacesStorageService
**Purpose:** Save/retrieve property IDs from DigitalOcean Spaces
**Methods:**
- `savePropertyIDs()`: Save property IDs in 10k blocks
- `getPreviousPropertyIDs()`: Get saved IDs from N days ago
- `comparePropertySets()`: Compare current vs previous IDs

### EventDetectionService
**Purpose:** Detect events by comparing old vs new property data
**Methods:**
- `detectEvents()`: Compare snapshots and return detected events
- `getEventMetadata()`: Get priority/category for an event
- `getTriggeredEvents()`: Filter events that trigger campaigns
- `getCriticalEvents()`: Get high-priority events

### PropertyTrackingService
**Purpose:** Orchestrate daily tracking workflow
**Methods:**
- `runDailyTracking()`: Cron job at midnight
- `trackSavedSearch()`: Track single saved search
- `trackSearchManually()`: Manual trigger for testing

### BatchEnrichmentService
**Purpose:** Enrich property IDs in batches of 250
**Methods:**
- `enrichSavedSearch()`: Process saved IDs with full detail
- `getEnrichmentStatus()`: Get progress stats

## Lead Generation = ML with Flags/Labels/Tags

The system creates a **machine learning dataset** where:

### FLAGS (Event-driven)
```
pre_foreclosure_flag = true
mls_listed_flag = true
vacant_flag = true
high_equity_flag = true
```

### LABELS (Category)
```
label = "distressed_seller"
label = "motivated_seller"
label = "portfolio_liquidation"
label = "retirement_opportunity"
```

### TAGS (Multi-dimensional)
```
tags = ["5yr_owner", "absentee", "high_equity", "vacant"]
tags = ["investor", "selling", "portfolio_shrinking"]
tags = ["estate_deed", "probate", "urgent"]
```

### ML Scoring
```python
# Example scoring algorithm
distress_score = (
  (pre_foreclosure ? 100 : 0) +
  (tax_lien ? 80 : 0) +
  (vacant ? 60 : 0) +
  (equity_decrease ? 40 : 0)
)

motivation_score = (
  (mls_listed ? 100 : 0) +
  (price_reduction ? 80 : 0) +
  (mls_delisted ? 90 : 0) +
  (years_owned > 10 ? 70 : 0)
)

lead_score = distress_score + motivation_score + deal_score
```

## 🐺 AWOOOOOOOOOO - Property Tracking System is LIVE!

Built with:
- NestJS (Backend)
- DigitalOcean Spaces (S3-compatible storage)
- PostgreSQL + Drizzle ORM (Database)
- RealEstateAPI (Property data + Skip trace)
- Twilio Studio + SignalHouse.io (SMS campaigns)
