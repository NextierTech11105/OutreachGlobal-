# System Architecture

## Overview

The Property Tracking System is a multi-layered data intelligence platform that connects property search to automated campaigns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Search UI  │  │  Workflow UI │  │ Campaign UI  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           RealEstateAPIController                        │   │
│  │  • property-search    • property-detail                  │   │
│  │  • property-count     • skip-trace                       │   │
│  │  • import-to-campaign                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           RealEstateService                              │   │
│  │  • Search execution    • Detail fetching                 │   │
│  │  • Skip tracing        • Campaign creation               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL APIS                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ RealEstateAPI.com│  │ Skip Trace API   │                     │
│  │ • PropertySearch │  │ • Owner Phones   │                     │
│  │ • PropertyDetail │  │ • Owner Emails   │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                       │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ saved_searches   │  │saved_search_     │                     │
│  │ • Search criteria│  │  results         │                     │
│  │ • Total count    │  │ • Property IDs   │                     │
│  └──────────────────┘  │ • Field snapshots│                     │
│                        │ • Event history  │                     │
│                        └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 CAMPAIGN SYSTEM (Nextier)                        │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ Leads            │  │ Campaigns        │                     │
│  │ • Owner info     │  │ • AI SDR         │                     │
│  │ • Property data  │  │ • Hyper-personal │                     │
│  │ • Full payload   │  │ • Human-in-loop  │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Search Layer
- **Input:** State, County, Property Type, Filters
- **Output:** Property IDs matching criteria
- **Function:** Russian doll layered filtering

### 2. Storage Layer
- **Input:** Search criteria + Property IDs
- **Output:** Saved search record
- **Function:** Persist search for tracking

### 3. Tracking Layer
- **Input:** Saved property IDs
- **Output:** Detected events (field changes)
- **Function:** Daily comparison, event detection

### 4. Campaign Layer
- **Input:** Property IDs + Events
- **Output:** Leads + Campaigns
- **Function:** Batch detail + skip trace + AI messaging

## Data Flow

### Initial Search Flow
```
User Input
  ↓
State → County → Property Type → Filters
  ↓
RealEstateAPI PropertySearch
  ↓
Property IDs (100s or 1000s)
  ↓
Save to Database
  ↓
Ready for Tracking + Campaigns
```

### Daily Tracking Flow
```
Cron Job (Midnight)
  ↓
Get Saved Searches (batch_job_enabled = true)
  ↓
For Each Search:
  ├─ Execute Search Query
  ├─ Compare Today's IDs vs Yesterday's IDs
  ├─ Detect Field Changes (estate deed, pre-foreclosure, etc.)
  ├─ Store Events in saved_search_results
  └─ Trigger Follow-up Campaigns
```

### Campaign Execution Flow
```
User Selects Property IDs
  ↓
Batch 1 (250 properties)
  ├─ Get Property Detail (parallel)
  ├─ Skip Trace Owners (parallel)
  └─ Create Leads with Full Payload
  ↓
Batch 2 (250 properties)
  ├─ Get Property Detail
  ├─ Skip Trace
  └─ Create Leads
  ↓
...continue for all batches
  ↓
Launch AI SDR Campaign
  ├─ Hyper-personalized messaging
  ├─ Property context in every message
  └─ Human-in-the-loop oversight
```

## Parallel Execution

The system runs two processes simultaneously:

### Process 1: Campaign Execution (Immediate)
```
propertyIds[0-249]   → Detail + Skip Trace → SMS (Batch 1)
propertyIds[250-499] → Detail + Skip Trace → SMS (Batch 2)
propertyIds[500-749] → Detail + Skip Trace → SMS (Batch 3)
propertyIds[750-999] → Detail + Skip Trace → SMS (Batch 4)
```

### Process 2: Event Tracking (Daily)
```
ALL propertyIds → Daily Check → Detect Changes → Follow-up SMS
```

## Scaling Considerations

### Batch Sizes
- **Property Detail:** 250 per batch (API rate limits)
- **Skip Trace:** 250 per batch (cost optimization)
- **SMS Send:** 250 per batch (Twilio limits)

### Rate Limits
- RealEstateAPI: ~1000 requests/hour
- Skip Trace: ~500 requests/hour
- Twilio: ~100 SMS/second

### Database Optimization
- Index on `saved_search_id`
- Index on `property_id`
- JSONB GIN indexes on `signals` and `signal_history`

## Security

### API Keys
- Stored in environment variables
- Never committed to git
- Rotated quarterly

### Data Privacy
- Property data: Public record (OK to store)
- Owner contact: Encrypted at rest
- Skip trace results: 90-day retention

## Monitoring

### Key Metrics
- Search execution time
- Property detail API success rate
- Skip trace match rate
- Campaign conversion rate
- Event detection accuracy

### Alerts
- API failures (> 5% error rate)
- Tracking job failures
- Database connection issues
- Campaign send failures
