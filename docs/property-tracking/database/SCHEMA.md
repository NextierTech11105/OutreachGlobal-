# Database Schema

## Overview

PostgreSQL database using Drizzle ORM for type-safe queries.

---

## Tables

### saved_searches

Stores saved search criteria for tracking.

```sql
CREATE TABLE saved_searches (
  id VARCHAR PRIMARY KEY,                    -- Format: ss_01abc123
  team_id VARCHAR NOT NULL,                  -- Team that owns this search
  search_name VARCHAR NOT NULL,              -- User-friendly name
  search_query JSONB NOT NULL,               -- Search criteria

  realestate_search_id VARCHAR,             -- External API search ID

  last_report_date TIMESTAMP,               -- Last tracking run
  next_report_date TIMESTAMP,               -- Next scheduled run

  total_properties VARCHAR,                 -- Total matching properties
  added_count VARCHAR,                      -- Properties added since last run
  deleted_count VARCHAR,                    -- Properties removed since last run
  updated_count VARCHAR,                    -- Properties with field changes

  batch_job_enabled VARCHAR DEFAULT 'false', -- Enable daily tracking
  last_batch_job_at TIMESTAMP,              -- Last tracking execution
  batch_job_status VARCHAR,                 -- Status: pending/completed/failed

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_team ON saved_searches(team_id);
CREATE INDEX idx_saved_searches_batch ON saved_searches(batch_job_enabled)
  WHERE batch_job_enabled = 'true';
```

#### search_query JSONB Structure
```json
{
  "state": "NY",
  "county": "Nassau",
  "zipCode": "11530",
  "propertyType": "Multi-Family",
  "absenteeOwner": true,
  "preForeclosure": false,
  "yearsOwned": 5,
  "equityPercentMin": 50,
  "valueMin": 500000,
  "valueMax": 1000000
}
```

---

### saved_search_results

Stores individual property IDs and their tracking history.

```sql
CREATE TABLE saved_search_results (
  id VARCHAR PRIMARY KEY,                    -- Format: ssr_01abc123
  saved_search_id VARCHAR NOT NULL           -- References saved_searches.id
    REFERENCES saved_searches(id) ON DELETE CASCADE,

  property_id VARCHAR NOT NULL,              -- Property identifier
  external_id VARCHAR,                       -- External API property ID
  change_type VARCHAR,                       -- added/updated/deleted
  last_update_date TIMESTAMP,                -- Last field change detected

  first_seen_at TIMESTAMP,                   -- First time property appeared
  last_seen_at TIMESTAMP,                    -- Last time property appeared
  times_found VARCHAR DEFAULT '1',           -- How many times found in searches

  signals JSONB,                             -- Current field values
  signal_history JSONB,                      -- Historical field changes
  property_data JSONB,                       -- Full property payload

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_results_search ON saved_search_results(saved_search_id);
CREATE INDEX idx_search_results_property ON saved_search_results(property_id);
CREATE INDEX idx_search_results_signals ON saved_search_results USING GIN(signals);
CREATE INDEX idx_search_results_history ON saved_search_results USING GIN(signal_history);
```

#### signals JSONB Structure (Current State)
```json
{
  "ownerName": "John Doe",
  "deedType": "estate",
  "lastSaleDate": "2017-03-20",
  "yearsOwned": 8,
  "mlsListed": false,
  "mlsPrice": null,
  "preForeclosure": true,
  "foreclosure": false,
  "lisPendens": false,
  "taxLien": false,
  "bankruptcy": false,
  "vacant": false,
  "absenteeOwner": true,
  "equityPercent": 47,
  "estimatedValue": 850000,
  "propertiesOwned": 4,
  "portfolioPurchasedLast12": 0,
  "auctionStatus": "cancelled"
}
```

#### signal_history JSONB Structure (Change Log)
```json
[
  {
    "date": "2025-01-15T00:00:00Z",
    "events": [],
    "signals": {
      "preForeclosure": false,
      "auctionStatus": null,
      "deedType": "warranty"
    },
    "changeType": "added"
  },
  {
    "date": "2025-01-20T00:00:00Z",
    "events": ["pre_foreclosure"],
    "signals": {
      "preForeclosure": true,
      "auctionStatus": "scheduled",
      "deedType": "warranty"
    },
    "changeType": "updated"
  },
  {
    "date": "2025-01-22T00:00:00Z",
    "events": ["auction_cancelled", "estate_deed"],
    "signals": {
      "preForeclosure": true,
      "auctionStatus": "cancelled",
      "deedType": "estate"
    },
    "changeType": "updated"
  }
]
```

---

## Queries

### Get All Active Saved Searches
```sql
SELECT * FROM saved_searches
WHERE batch_job_enabled = 'true'
  AND team_id = :teamId
ORDER BY last_batch_job_at ASC NULLS FIRST;
```

### Get Properties for Saved Search
```sql
SELECT * FROM saved_search_results
WHERE saved_search_id = :searchId
ORDER BY last_seen_at DESC;
```

### Get Recent Events
```sql
SELECT
  ssr.property_id,
  ssr.signals,
  ssr.signal_history,
  ss.search_name
FROM saved_search_results ssr
JOIN saved_searches ss ON ssr.saved_search_id = ss.id
WHERE ss.team_id = :teamId
  AND ssr.last_update_date >= NOW() - INTERVAL '7 days'
  AND ssr.signal_history IS NOT NULL
ORDER BY ssr.last_update_date DESC;
```

### Get Critical Events
```sql
SELECT
  ssr.property_id,
  ssr.signals->>'deedType' as deed_type,
  ssr.signals->>'preForeclosure' as pre_foreclosure,
  ssr.signals->>'auctionStatus' as auction_status,
  ssr.last_update_date
FROM saved_search_results ssr
WHERE saved_search_id = :searchId
  AND (
    ssr.signals->>'deedType' LIKE '%estate%'
    OR ssr.signals->>'preForeclosure' = 'true'
    OR ssr.signals->>'auctionStatus' = 'cancelled'
  )
ORDER BY ssr.last_update_date DESC;
```

### Update Property Signals
```sql
UPDATE saved_search_results
SET
  signals = :newSignals,
  signal_history = signal_history || :newHistoryEntry,
  last_update_date = NOW(),
  last_seen_at = NOW(),
  times_found = (times_found::int + 1)::varchar,
  updated_at = NOW()
WHERE property_id = :propertyId
  AND saved_search_id = :savedSearchId;
```

---

## Migrations

### Create Tables
```sql
-- Run in order
\i migrations/001_create_saved_searches.sql
\i migrations/002_create_saved_search_results.sql
\i migrations/003_add_indexes.sql
```

### Drizzle Commands
```bash
# Generate migration
pnpm --filter api run db:generate

# Push to database
pnpm --filter api run db:push

# Run migration
pnpm --filter api run db:migrate
```

---

## Data Retention

- **saved_searches:** Keep forever (user data)
- **saved_search_results:** Keep 1 year of history
- **signal_history:** Keep 90 days of changes

### Cleanup Job (Monthly)
```sql
-- Remove old signal history entries
UPDATE saved_search_results
SET signal_history = (
  SELECT jsonb_agg(entry)
  FROM jsonb_array_elements(signal_history) entry
  WHERE (entry->>'date')::timestamp > NOW() - INTERVAL '90 days'
)
WHERE last_update_date < NOW() - INTERVAL '90 days';

-- Archive old results
DELETE FROM saved_search_results
WHERE last_seen_at < NOW() - INTERVAL '1 year';
```
