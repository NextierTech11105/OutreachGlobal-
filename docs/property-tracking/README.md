# Property Tracking System - Complete Documentation

## Overview

The Property Tracking System is a data machine for real estate intelligence and automated outreach campaigns.

## System Flow

```
SEARCH → COUNT → SAVE → TRACK → CAMPAIGN
```

## Documentation Index

### Architecture
- [System Architecture](./architecture/SYSTEM-ARCHITECTURE.md) - Complete system design
- [Data Flow](./architecture/DATA-FLOW.md) - How data moves through the system
- [Event Matrix](./architecture/EVENT-MATRIX.md) - All trackable property events

### API
- [Endpoints](./api/ENDPOINTS.md) - All API endpoints
- [Request/Response](./api/REQUEST-RESPONSE.md) - Request and response formats
- [Error Handling](./api/ERROR-HANDLING.md) - Error codes and handling

### Database
- [Schema](./database/SCHEMA.md) - Complete database schema
- [Migrations](./database/MIGRATIONS.md) - Database migrations
- [Queries](./database/QUERIES.md) - Common queries

### Workflows
- [Search Workflow](./workflows/SEARCH.md) - Property search flow
- [Save Workflow](./workflows/SAVE.md) - Saving searches
- [Track Workflow](./workflows/TRACK.md) - Daily tracking
- [Campaign Workflow](./workflows/CAMPAIGN.md) - Campaign execution

### Examples
- [Basic Search](./examples/basic-search.md)
- [Saved Search](./examples/saved-search.md)
- [Event Tracking](./examples/event-tracking.md)
- [Campaign Launch](./examples/campaign-launch.md)

## Quick Start

### 1. Search Properties
```bash
POST /rest/:teamId/realestate-api/property-search
{
  "state": "NY",
  "county": "Nassau",
  "propertyType": "Multi-Family"
}
```

### 2. Count Results
```bash
POST /rest/:teamId/realestate-api/property-count
{
  "state": "NY",
  "county": "Nassau",
  "propertyType": "Multi-Family"
}
```

### 3. Save Search
```bash
POST /rest/:teamId/realestate-api/saved-search/create
{
  "searchName": "MFH-Nassau-Absentee",
  "searchQuery": { ... }
}
```

### 4. Import to Campaign
```bash
POST /rest/:teamId/realestate-api/import-to-campaign
{
  "propertyIds": ["prop_1", "prop_2", ...],
  "campaignName": "Q1 Outreach"
}
```

## Key Concepts

### Russian Doll Layering
Filters applied in optimized order:
1. State (broadest)
2. County
3. Property Type
4. Property Usage
5. Ownership Timeline
6. Last Sale Date
7. Last Mortgage Date
8. Event Flags (pre-foreclosure, etc.)

### Batch Processing
All operations process in batches of 250:
- Property Detail API calls
- Skip Trace API calls
- Campaign SMS sends

### Event-Driven Tracking
Monitor property IDs for field changes:
- Estate deed transfers
- Pre-foreclosure notices
- Auction cancellations
- MLS listings
- Vacancy status

## Environment Variables

```bash
# RealEstate API
REALESTATE_API_KEY=NEXTIER-2906-74a1-8684-d2f63f473b7b
REALESTATE_SKIPTRACE_KEY=<your_skiptrace_key>

# Database
DATABASE_URL=<postgres_connection_string>

# Redis (for tracking jobs)
REDIS_URL=<redis_connection_string>
```

## Technology Stack

- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Frontend:** Next.js 15 + React
- **API:** RealEstateAPI.com
- **Campaigns:** Nextier (internal system)
- **SMS:** Twilio Studio + SignalHouse.io
