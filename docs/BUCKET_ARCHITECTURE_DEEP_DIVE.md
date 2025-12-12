wiht nay cnahhel
# Bucket System Architecture - Deep Dive

## Table of Contents
1. [Conceptual Overview](#conceptual-overview)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [Architectural Design](#architectural-design)
4. [Database Schema & Relationships](#database-schema--relationships)
5. [Data Flow & State Transitions](#data-flow--state-transitions)
6. [API Layer](#api-layer)
7. [Enrichment Pipeline](#enrichment-pipeline)
8. [Integration with Platform Components](#integration-with-platform-components)
9. [Code Architecture](#code-architecture)
10. [Performance & Scaling](#performance--scaling)
11. [Error Handling & Recovery](#error-handling--recovery)
12. [Security Considerations](#security-considerations)

---

## Conceptual Overview

### What is a Bucket?

A **Bucket** is a container that holds references (IDs) to properties from external data sources. Think of it as a "shopping cart" for property data that you can fill cheaply and checkout (enrich) selectively.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUCKET CONCEPT MODEL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   BUCKET    │  = Container holding property references                  │
│   │             │                                                           │
│   │  - metadata │  Name, filters, signals, timestamps                       │
│   │  - config   │  Source, enrichment settings                              │
│   │  - stats    │  Total, enriched, contacted counts                        │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          │ 1:N relationship                                                 │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                           │
│   │    LEADS    │  = Individual property records                            │
│   │             │                                                           │
│   │  - propertyId  (reference to external API)                              │
│   │  - enriched data (fetched on demand)                                    │
│   │  - contact info (from skip trace)                                       │
│   │  - apollo data (business enrichment)                                    │
│   │  - activity tracking                                                    │
│   └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Three-Phase Model

```text
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   ACQUISITION    │    │   ENRICHMENT     │    │   ACTIVATION     │
│                  │    │                  │    │                  │
│  Search APIs     │───►│  Property Detail │───►│  SMS Campaigns   │
│  Save IDs        │    │  Skip Trace      │    │  Phone Dialer    │
│  Filter/Sort     │    │  Apollo.io       │    │  Email Sequences │
│                  │    │                  │    │  Calendar Queue  │
│  COST: FREE      │    │  COST: $$        │    │  COST: $$$       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## The Problem We're Solving

### Traditional Approach (Expensive)

```text
User searches → API returns 50,000 full records → User pays for all 50,000
                                                  ↓
                                            Uses maybe 500
                                                  ↓
                                            98% waste
```

### Our Approach (Economical)

```text
User searches → API returns 50,000 IDs only → User pays $0
                         ↓
              Save IDs to bucket (still $0)
                         ↓
              User selects 2,000 for campaign
                         ↓
              Enrich only those 2,000 → User pays for 2,000
                         ↓
                    96% savings
```

### Why This Matters

| Metric | Traditional | Bucket System |
|--------|-------------|---------------|
| 100K property search | $5,000+ | $0 |
| Enrich 5K for campaign | Already paid | $500 |
| Total cost | $5,000+ | $500 |
| Data freshness | Stale (one-time pull) | Fresh (on-demand) |
| Reusability | None | Unlimited |

---

## Architectural Design

### System Context Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  RealEstateAPI  │  │   SignalHouse   │  │    Apollo.io    │             │
│  │                 │  │   (SkipTrace)   │  │  (Business DB)  │             │
│  │  - Property IDs │  │                 │  │                 │             │
│  │  - Detail Data  │  │  - Phone lookup │  │  - Emails       │             │
│  │  - Valuations   │  │  - Email lookup │  │  - Titles       │             │
│  │  - Distress     │  │  - Address      │  │  - Companies    │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
└───────────┼────────────────────┼────────────────────┼───────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             API LAYER (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /api/property/search    →  Search & get IDs                                │
│  /api/property/bucket    →  CRUD operations on buckets                      │
│  /api/property/bucket/leads  →  Query leads within buckets                  │
│  /api/property/bucket/process  →  Batch enrichment processor                │
│  /api/property/detail    →  Single property detail fetch                    │
│  /api/skip-trace         →  Phone/email lookup                              │
│  /api/apollo/enrich      →  Business data enrichment                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE (PostgreSQL)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│  │   buckets   │──1:N─│    leads    │──N:M─│    tags     │                 │
│  └─────────────┘      └─────────────┘      └─────────────┘                 │
│                              │                                              │
│                              │ 1:N                                          │
│                              ▼                                              │
│                       ┌─────────────┐                                       │
│                       │  activities │                                       │
│                       └─────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAMPAIGN SYSTEMS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │     SMS     │  │   Dialer    │  │    Email    │  │  Calendar   │        │
│  │  Campaigns  │  │   Queue     │  │  Sequences  │  │    View     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Key Operations |
|-----------|---------------|----------------|
| **Search API** | Query external property data | Search, filter, count |
| **Bucket API** | Manage bucket lifecycle | Create, read, update, delete |
| **Leads API** | Query leads within buckets | Filter, paginate, export |
| **Process API** | Orchestrate enrichment | Batch, throttle, retry |
| **Detail API** | Fetch single property | Cache, transform |
| **SkipTrace API** | Contact info lookup | Match, validate |
| **Apollo API** | Business enrichment | Bulk match, reveal |

---

## Database Schema & Relationships

### Entity Relationship Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                              BUCKETS                                  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ PK  id              UUID                                              │  │
│  │     userId          TEXT           Owner of bucket                    │  │
│  │     name            TEXT           Display name                       │  │
│  │     description     TEXT           User notes                         │  │
│  │     source          TEXT           'real-estate' | 'apollo' | 'mixed' │  │
│  │     filters         JSONB          Original search criteria           │  │
│  │     totalLeads      INT            Count of all leads                 │  │
│  │     enrichedLeads   INT            Count of enriched leads            │  │
│  │     queuedLeads     INT            Count in processing queue          │  │
│  │     contactedLeads  INT            Count contacted via campaigns      │  │
│  │     enrichmentStatus TEXT          'pending'|'processing'|'completed' │  │
│  │     enrichmentProgress JSONB       {total, processed, successful}     │  │
│  │     createdAt       TIMESTAMP                                         │  │
│  │     updatedAt       TIMESTAMP                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    │ 1:N (CASCADE DELETE)                   │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                               LEADS                                   │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ PK  id              UUID                                              │  │
│  │ FK  bucketId        UUID           Parent bucket                      │  │
│  │     userId          TEXT           Owner (denormalized)               │  │
│  │     source          TEXT           Data source identifier             │  │
│  │     status          TEXT           'new'|'contacted'|'qualified'|...  │  │
│  │                                                                       │  │
│  │     ─── EXTERNAL REFERENCE ───                                        │  │
│  │     propertyId      TEXT           RealEstateAPI ID                   │  │
│  │     apn             TEXT           Assessor Parcel Number             │  │
│  │     fips            TEXT           County FIPS code                   │  │
│  │                                                                       │  │
│  │     ─── CONTACT INFO (from SkipTrace) ───                             │  │
│  │     firstName       TEXT                                              │  │
│  │     lastName        TEXT                                              │  │
│  │     email           TEXT                                              │  │
│  │     phone           TEXT           Primary phone                      │  │
│  │     secondaryPhone  TEXT           Alternate phone                    │  │
│  │                                                                       │  │
│  │     ─── PROPERTY DATA (from Detail API) ───                           │  │
│  │     propertyAddress TEXT                                              │  │
│  │     propertyCity    TEXT                                              │  │
│  │     propertyState   TEXT                                              │  │
│  │     propertyZip     TEXT                                              │  │
│  │     propertyType    TEXT           'SFR'|'MFR'|'Condo'|...            │  │
│  │     bedrooms        INT                                               │  │
│  │     bathrooms       DECIMAL                                           │  │
│  │     sqft            INT                                               │  │
│  │     yearBuilt       INT                                               │  │
│  │     estimatedValue  INT                                               │  │
│  │     estimatedEquity INT                                               │  │
│  │     equityPercent   DECIMAL                                           │  │
│  │                                                                       │  │
│  │     ─── OWNER INFO ───                                                │  │
│  │     owner1FirstName TEXT                                              │  │
│  │     owner1LastName  TEXT                                              │  │
│  │     ownerType       TEXT           'individual'|'trust'|'llc'|...     │  │
│  │     ownerOccupied   BOOLEAN                                           │  │
│  │     absenteeOwner   BOOLEAN                                           │  │
│  │                                                                       │  │
│  │     ─── DISTRESS FLAGS ───                                            │  │
│  │     preForeclosure  BOOLEAN                                           │  │
│  │     foreclosure     BOOLEAN                                           │  │
│  │     taxLien         BOOLEAN                                           │  │
│  │     bankruptcy      BOOLEAN                                           │  │
│  │     vacant          BOOLEAN                                           │  │
│  │     highEquity      BOOLEAN        50%+ equity                        │  │
│  │     freeClear       BOOLEAN        No mortgage                        │  │
│  │                                                                       │  │
│  │     ─── APOLLO.IO DATA ───                                            │  │
│  │     apolloPersonId  TEXT           Apollo person ID                   │  │
│  │     apolloOrgId     TEXT           Apollo organization ID             │  │
│  │     apolloTitle     TEXT           Job title                          │  │
│  │     apolloCompany   TEXT           Company name                       │  │
│  │     apolloIndustry  TEXT           Industry classification            │  │
│  │     apolloLinkedinUrl TEXT         LinkedIn profile                   │  │
│  │     apolloEmployeeCount INT        Company size                       │  │
│  │     apolloEnrichedAt TIMESTAMP     When Apollo ran                    │  │
│  │     apolloData      JSONB          Full Apollo response               │  │
│  │                                                                       │  │
│  │     ─── ENRICHMENT TRACKING ───                                       │  │
│  │     enrichmentStatus TEXT          'pending'|'completed'|'partial'    │  │
│  │     enrichedAt      TIMESTAMP      When detail fetched                │  │
│  │     skipTracedAt    TIMESTAMP      When skip trace ran                │  │
│  │     enrichmentError TEXT           Last error message                 │  │
│  │                                                                       │  │
│  │     ─── TIMESTAMPS ───                                                │  │
│  │     createdAt       TIMESTAMP                                         │  │
│  │     updatedAt       TIMESTAMP                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Indexes

```sql
-- Performance-critical indexes
CREATE INDEX leads_bucket_id_idx ON leads(bucket_id);
CREATE INDEX leads_user_id_idx ON leads(user_id);
CREATE INDEX leads_property_id_idx ON leads(property_id);
CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_property_state_idx ON leads(property_state);
CREATE INDEX leads_enrichment_status_idx ON leads(enrichment_status);
```

### Relationship Rules

1. **Bucket → Leads**: One-to-Many with CASCADE DELETE
   - Deleting a bucket removes all its leads
   - Leads cannot exist without a parent bucket

2. **Lead → PropertyId**: Reference (not FK)
   - PropertyId is an external identifier
   - No referential integrity enforced
   - Allows orphaned references if external data changes

3. **User → Bucket**: Ownership
   - userId on bucket controls access
   - userId denormalized on leads for query performance

---

## Data Flow & State Transitions

### Lead Lifecycle States

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LEAD STATE MACHINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────┐                                    │
│                         │   CREATED    │                                    │
│                         │  (ID only)   │                                    │
│                         └──────┬───────┘                                    │
│                                │                                            │
│                    ┌───────────┴───────────┐                                │
│                    ▼                       ▼                                │
│            ┌──────────────┐       ┌──────────────┐                          │
│            │   PENDING    │       │   SKIPPED    │                          │
│            │ (in queue)   │       │  (filtered)  │                          │
│            └──────┬───────┘       └──────────────┘                          │
│                   │                                                         │
│          ┌────────┼────────┐                                                │
│          ▼        ▼        ▼                                                │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                                   │
│   │ ENRICHED │ │ PARTIAL  │ │  FAILED  │                                   │
│   │ (detail) │ │(no phone)│ │  (error) │                                   │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘                                   │
│        │            │            │                                          │
│        └────────────┼────────────┘                                          │
│                     ▼                                                       │
│            ┌──────────────┐                                                 │
│            │   APOLLO     │                                                 │
│            │  ENRICHED    │                                                 │
│            └──────┬───────┘                                                 │
│                   │                                                         │
│          ┌────────┼────────┐                                                │
│          ▼        ▼        ▼                                                │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                                   │
│   │CONTACTED │ │QUALIFIED │ │   LOST   │                                   │
│   └──────────┘ └──────────┘ └──────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enrichment Status Flow

```text
enrichmentStatus: 'pending' → 'completed' | 'partial' | 'failed'

pending   = Lead has propertyId only, no data fetched
completed = PropertyDetail + SkipTrace successful, has phone
partial   = PropertyDetail OK, but no phone found
failed    = Error during enrichment (stored in enrichmentError)
```

### Data Population Timeline

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DATA POPULATION TIMELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  T0: Bucket Created                                                         │
│  ├── bucketId: generated                                                    │
│  ├── name, filters, signals: from user                                      │
│  └── totalLeads: count of IDs                                               │
│                                                                             │
│  T1: Leads Inserted (bulk)                                                  │
│  ├── id: generated                                                          │
│  ├── bucketId: FK to bucket                                                 │
│  ├── propertyId: from search results                                        │
│  ├── enrichmentStatus: 'pending'                                            │
│  └── ALL OTHER FIELDS: null                                                 │
│                                                                             │
│  T2: Property Detail Enrichment                                             │
│  ├── propertyAddress, city, state, zip: populated                           │
│  ├── beds, baths, sqft, yearBuilt: populated                                │
│  ├── estimatedValue, equity: populated                                      │
│  ├── owner1FirstName, owner1LastName: populated                             │
│  ├── distress flags: populated                                              │
│  └── enrichedAt: timestamp                                                  │
│                                                                             │
│  T3: Skip Trace Enrichment                                                  │
│  ├── phone, secondaryPhone: populated (if found)                            │
│  ├── email: populated (if found)                                            │
│  ├── mailingAddress: populated                                              │
│  ├── enrichmentStatus: 'completed' or 'partial'                             │
│  └── skipTracedAt: timestamp                                                │
│                                                                             │
│  T4: Apollo Enrichment (optional)                                           │
│  ├── apolloPersonId, apolloOrgId: populated                                 │
│  ├── apolloTitle, apolloCompany: populated                                  │
│  ├── apolloLinkedinUrl: populated                                           │
│  ├── apolloData: full JSON response                                         │
│  └── apolloEnrichedAt: timestamp                                            │
│                                                                             │
│  T5+: Campaign Activity                                                     │
│  ├── status: 'contacted' → 'qualified' → 'closed'                           │
│  ├── lastActivityAt: updated                                                │
│  └── activityCount: incremented                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Layer

### Endpoint Architecture

```
/api/property/
├── search/
│   └── route.ts          POST: Search properties (modes: full, ids, count)
├── detail/
│   └── route.ts          GET: Single property detail
├── autocomplete/
│   └── route.ts          POST: County/city suggestions
└── bucket/
    ├── route.ts          CRUD: Bucket management
    ├── leads/
    │   └── route.ts      GET: Query leads with filters
    └── process/
        └── route.ts      POST: Batch enrichment

/api/skip-trace/
└── route.ts              POST: Phone/email lookup

/api/apollo/
└── enrich/
    └── route.ts          POST: Bulk business enrichment, GET: Health check
```

### API Contracts

#### Create Bucket
```typescript
// POST /api/property/bucket
// Request
{
  name: string;                    // Required: Display name
  description?: string;            // Optional: User notes
  propertyIds: string[];           // Required: Array of property IDs
  filters?: {                      // Optional: Search criteria used
    state?: string;
    county?: string;
    leadTypes?: string[];
    // ... other filters
  };
  signals?: {                      // Optional: Distress signal counts
    preForeclosure: number;
    taxLien: number;
    highEquity: number;
    // ...
  };
}

// Response
{
  success: true;
  bucket: {
    id: string;
    name: string;
    totalLeads: number;
    enrichmentStatus: 'pending';
  };
  stats: {
    inserted: number;
    total: number;
  };
}
```

#### Process Bucket (Batch Enrichment)

```typescript
// POST /api/property/bucket/process
// Request
{
  bucketId: string;               // Required: Bucket to process
  limit?: number;                 // Optional: Max leads (default: 2000)
  skipTrace?: boolean;            // Optional: Include phone lookup (default: true)
  startFrom?: string;             // Optional: Resume from lead ID
}

// Response
{
  success: true;
  stats: {
    processed: number;            // Total attempted
    successful: number;           // Enrichment succeeded
    failed: number;               // Enrichment failed
    withPhones: number;           // Found phone numbers
    remaining: number;            // Still pending in bucket
  };
  resumeFrom?: string;            // Lead ID to continue from
}
```

#### Apollo Bulk Enrichment

```typescript
// POST /api/apollo/enrich
// Request
{
  leadIds: string[];              // Required: Array of lead IDs
  type?: 'people' | 'organizations';  // Default: 'people'
  revealEmails?: boolean;         // Default: true
  revealPhones?: boolean;         // Default: true
  updateDb?: boolean;             // Default: true
}

// Response
{
  success: true;
  results: {
    total: number;
    enriched: number;
    withPhones: number;
    withEmails: number;
    failed: number;
    errors: string[];
  };
}
```

#### Query Bucket Leads

```typescript
// GET /api/property/bucket/leads?bucketId=xxx&needsApollo=true&limit=50
// Query Parameters
{
  bucketId: string;               // Required: Bucket to query
  limit?: number;                 // Default: 50, Max: 500
  needsApollo?: boolean;          // Filter: No Apollo data yet
  needsSkipTrace?: boolean;       // Filter: No phone yet
  enrichedOnly?: boolean;         // Filter: Only completed
}

// Response
{
  success: true;
  leads: Lead[];                  // Array of lead objects
  count: number;                  // Returned count
  totalMatching: number;          // Total matching filter
  filters: { ... };               // Echo of applied filters
}
```

---

## Enrichment Pipeline

### Pipeline Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENRICHMENT PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │   INPUT     │  Lead IDs from bucket (pending status)                     │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BATCH CONTROLLER                                  │   │
│  │  - Fetches leads in batches of 250                                   │   │
│  │  - Tracks progress                                                   │   │
│  │  - Handles rate limiting                                             │   │
│  │  - Manages concurrency (10 parallel)                                 │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PROPERTY DETAIL STAGE                             │   │
│  │                                                                      │   │
│  │  Input:  propertyId                                                  │   │
│  │  API:    GET /api/property/detail?id={propertyId}                    │   │
│  │  Output: address, beds, baths, value, owner, distress flags          │   │
│  │                                                                      │   │
│  │  Rate Limit: 100/min                                                 │   │
│  │  Retry: 3 attempts with exponential backoff                          │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SKIP TRACE STAGE                                  │   │
│  │                                                                      │   │
│  │  Input:  firstName, lastName, address, city, state                   │   │
│  │  API:    POST /api/skip-trace                                        │   │
│  │  Output: phone, secondaryPhone, email, mailingAddress                │   │
│  │                                                                      │   │
│  │  Format: Flat fields (first_name, last_name, address, city)          │   │
│  │  Rate Limit: 50/min                                                  │   │
│  │  Match Requirements: { phones: true }                                │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATABASE UPDATE                                   │   │
│  │                                                                      │   │
│  │  - Update lead with enriched data                                    │   │
│  │  - Set enrichmentStatus                                              │   │
│  │  - Update timestamps                                                 │   │
│  │  - Increment bucket.enrichedLeads                                    │   │
│  └──────┬──────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │   OUTPUT    │  Enriched lead ready for campaigns                         │
│  └─────────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Batch Processing Logic

```typescript
// From /api/property/bucket/process/route.ts

import pLimit from 'p-limit';
import chunk from 'lodash/chunk';

const BATCH_SIZE = 250;                  // Leads per database fetch
const MICRO_CAMPAIGN_LIMIT = 2000;       // Default processing limit
const DAILY_LIMIT = 5000;                // Recommended daily cap
const CONCURRENT_REQUESTS = 10;          // Parallel API calls
const RATE_LIMIT_DELAY_MS = 200;         // Back-pressure between batches

interface ProcessOptions {
  skipTrace?: boolean;                   // Allow disabling skip trace per run
  startFrom?: string;                    // Resume token for checkpointing
  guard?: (lead: Lead) => boolean;       // Optional filter hook
}

interface ProcessStats {
  attempted: number;
  enriched: number;
  partial: number;
  failed: number;
  skipped: number;
}

const limiter = pLimit(CONCURRENT_REQUESTS);

async function processBucket(
  bucketId: string,
  limit = MICRO_CAMPAIGN_LIMIT,
  options: ProcessOptions = {}
): Promise<ProcessStats> {
  const cap = Math.min(limit, MICRO_CAMPAIGN_LIMIT, DAILY_LIMIT);
  const leadsToProcess = await fetchPendingLeads(bucketId, cap, options.startFrom);
  const stats: ProcessStats = { attempted: 0, enriched: 0, partial: 0, failed: 0, skipped: 0 };
  const shouldSkipTrace = options.skipTrace === false ? false : true;

  for (const batch of chunk(leadsToProcess, BATCH_SIZE)) {
    await Promise.all(
      batch.map((lead) =>
        limiter(async () => {
          stats.attempted += 1;

          if (options.guard && !options.guard(lead)) {
            stats.skipped += 1;
            return;
          }

          try {
            const detail = await withRetry(() => fetchPropertyDetail(lead.propertyId));
            const contact = shouldSkipTrace
              ? await withRetry(() => runSkipTrace(buildSkipTracePayload(detail)))
              : undefined;

            const status = deriveStatus(contact);
            await persistLead(lead.id, detail, contact, status);
            stats[status === 'completed' ? 'enriched' : 'partial'] += 1;
          } catch (error) {
            await markLeadFailed(lead.id, error);
            stats.failed += 1;
          }
        })
      )
    );

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  await updateBucketStats(bucketId, stats);
  return stats;
}

type ContactInfo = {
  phone?: string | null;
  email?: string | null;
};

type PropertyDetail = {
  owner1FirstName?: string | null;
  owner1LastName?: string | null;
  address: string;
  city: string;
  state: string;
};

function deriveStatus(contact?: ContactInfo) {
  if (!contact) return 'partial';
  if (contact.phone || contact.email) return 'completed';
  return 'partial';
}

function buildSkipTracePayload(detail: PropertyDetail) {
  return {
    firstName: detail.owner1FirstName,
    lastName: detail.owner1LastName,
    address: detail.address,
    city: detail.city,
    state: detail.state
  };
}

async function markLeadFailed(leadId: string, error: unknown) {
  await db.update(leads)
    .set({
      enrichmentStatus: 'failed',
      enrichmentError: error instanceof Error ? error.message : 'Unknown error'
    })
    .where(eq(leads.id, leadId));
}
```

#### Enhancement Notes

- **Readability & Maintainability**: Encapsulates options (`ProcessOptions`), result tracking (`ProcessStats`), and helper utilities so orchestration logic stays declarative and easier to extend.
- **Performance Optimization**: Uses `p-limit` plus deterministic chunking to cap concurrency, while `RATE_LIMIT_DELAY_MS` introduces tunable back-pressure to honor upstream rate limits.
- **Best Practices & Patterns**: Normalizes helper responsibilities (`deriveStatus`, `buildSkipTracePayload`, `markLeadFailed`) and keeps side-effects localized to persistence boundaries.
- **Error Handling & Edge Cases**: Wraps external IO with `withRetry`, surfaces guard/skipTrace overrides, and records failures per lead so partial batches can continue safely.

### Apollo Enrichment Logic

```typescript
// From /api/apollo/enrich/route.ts

const APOLLO_BULK_LIMIT = 10;  // Apollo's API limit per request

async function bulkEnrichPeople(people: PersonMatch[], options: Options) {
  const results: ApolloPersonResult[] = [];

  // Process in chunks of 10 (Apollo's limit)
  for (let i = 0; i < people.length; i += APOLLO_BULK_LIMIT) {
    const chunk = people.slice(i, i + APOLLO_BULK_LIMIT);

    const response = await fetch('https://api.apollo.io/api/v1/people/bulk_match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APOLLO_API_KEY
      },
      body: JSON.stringify({
        details: chunk.map(person => ({
          ...person,
          reveal_personal_emails: options.revealEmails ?? true,
          reveal_phone_number: options.revealPhones ?? true
        }))
      })
    });

    const data = await response.json();
    results.push(...(data.matches || []));

    // Rate limit delay between chunks
    if (i + APOLLO_BULK_LIMIT < people.length) {
      await sleep(200);
    }
  }

  return results;
}
```

---

## Integration with Platform Components

### Campaign System Integration

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BUCKET → CAMPAIGN INTEGRATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BUCKET                           CAMPAIGN TYPES                            │
│  ┌─────────────┐                                                            │
│  │  Enriched   │                                                            │
│  │   Leads     │─────┬──────────────────────────────────────────────────►  │
│  │             │     │           ┌─────────────────────────────────┐       │
│  │ - phone ✓   │     │           │        SMS CAMPAIGN             │       │
│  │ - email ✓   │     │           │                                 │       │
│  │ - name ✓    │     │           │  High volume, automated         │       │
│  │             │     │           │  {{firstName}}, {{address}}     │       │
│  └─────────────┘     │           │  Drip sequences                 │       │
│                      │           └─────────────────────────────────┘       │
│                      │                                                      │
│                      │           ┌─────────────────────────────────┐       │
│                      ├──────────►│       DIALER QUEUE              │       │
│                      │           │                                 │       │
│                      │           │  Click-to-call interface        │       │
│                      │           │  Call disposition tracking      │       │
│                      │           │  Voicemail drop                 │       │
│                      │           └─────────────────────────────────┘       │
│                      │                                                      │
│                      │           ┌─────────────────────────────────┐       │
│                      ├──────────►│      EMAIL SEQUENCE             │       │
│                      │           │                                 │       │
│                      │           │  Multi-touch drip               │       │
│                      │           │  Open/click tracking            │       │
│                      │           │  A/B testing                    │       │
│                      │           └─────────────────────────────────┘       │
│                      │                                                      │
│                      │           ┌─────────────────────────────────┐       │
│                      └──────────►│      CALENDAR VIEW              │       │
│                                  │                                 │       │
│                                  │  Scheduled callbacks            │       │
│                                  │  Follow-up reminders            │       │
│                                  │  Appointment booking            │       │
│                                  └─────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Lead Selection for Campaigns

```typescript
// Query leads ready for SMS campaign
const smsReady = await db.select()
  .from(leads)
  .where(and(
    eq(leads.bucketId, bucketId),
    eq(leads.enrichmentStatus, 'completed'),
    isNotNull(leads.phone),
    eq(leads.status, 'new')  // Not yet contacted
  ))
  .limit(1000);

// Query high-value leads for phone outreach
const highValue = await db.select()
  .from(leads)
  .where(and(
    eq(leads.bucketId, bucketId),
    eq(leads.enrichmentStatus, 'completed'),
    isNotNull(leads.phone),
    gte(leads.estimatedValue, 500000),
    eq(leads.highEquity, true)
  ))
  .orderBy(desc(leads.estimatedEquity))
  .limit(100);
```

---

## Code Architecture

### File Structure

```text
apps/front/src/
├── app/
│   ├── api/
│   │   ├── property/
│   │   │   ├── search/route.ts       # Property search with modes
│   │   │   ├── detail/route.ts       # Single property fetch
│   │   │   ├── autocomplete/route.ts # County/city lookup
│   │   │   └── bucket/
│   │   │       ├── route.ts          # Bucket CRUD
│   │   │       ├── leads/route.ts    # Lead queries
│   │   │       └── process/route.ts  # Batch enrichment
│   │   ├── skip-trace/route.ts       # Phone lookup
│   │   └── apollo/
│   │       └── enrich/route.ts       # Business enrichment
│   └── t/[team]/
│       └── properties/
│           └── page.tsx              # Properties UI with bucket mgmt
├── lib/
│   └── db/
│       └── schema.ts                 # Drizzle schema definitions
└── components/
    └── property-map/                 # Map visualization
```

### UI State Management

```typescript
// From properties/page.tsx

// Bucket state
const [showBucketDialog, setShowBucketDialog] = useState(false);
const [bucketName, setBucketName] = useState("");
const [buckets, setBuckets] = useState<Bucket[]>([]);
const [showBucketList, setShowBucketList] = useState(false);
const [savingToBucket, setSavingToBucket] = useState(false);
const [processingBucket, setProcessingBucket] = useState<string | null>(null);
const [apolloEnriching, setApolloEnriching] = useState<string | null>(null);
const [distressSignals, setDistressSignals] = useState<Signals | null>(null);

// Bucket operations
const saveIdsToBucket = useCallback(async () => { ... }, []);
const processBucket = useCallback(async (id, limit) => { ... }, []);
const apolloEnrichBucket = useCallback(async (id, limit) => { ... }, []);
const deleteBucket = useCallback(async (id) => { ... }, []);
```

---

## Performance & Scaling

### Batch Size Recommendations

| Operation | Batch Size | Rationale |
|-----------|------------|-----------|
| Insert leads | 1,000 | Database bulk insert limit |
| Process enrichment | 250 | Balance parallelism & rate limits |
| Concurrent API calls | 10 | External API limits |
| Apollo bulk | 10 | Apollo's hard limit |
| Campaign deployment | 2,000 | Micro-campaign sweet spot |
| Daily processing | 5,000 | Cost control |

### Rate Limiting Strategy

```typescript
// Tiered rate limiting
const RATE_LIMITS = {
  propertyDetail: { rpm: 100, delay: 600 },   // 100/min
  skipTrace: { rpm: 50, delay: 1200 },        // 50/min
  apollo: { rpm: 100, delay: 600 },           // 100/min (with chunk delays)
};

// Exponential backoff for retries
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
    }
  }
}
```

### Database Optimization

```sql
-- Efficient bucket lead count
SELECT
  bucket_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE enrichment_status = 'completed') as enriched,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as with_phones
FROM leads
WHERE bucket_id = $1
GROUP BY bucket_id;

-- Pending leads with index hint
SELECT * FROM leads
WHERE bucket_id = $1
  AND enrichment_status = 'pending'
ORDER BY created_at ASC
LIMIT 250;
-- Uses: leads_enrichment_status_idx
```

---

## Error Handling & Recovery

### Error Categories

```typescript
type EnrichmentError =
  | 'RATE_LIMITED'      // External API rate limit hit
  | 'NOT_FOUND'         // Property ID doesn't exist
  | 'INVALID_DATA'      // Malformed response
  | 'NETWORK_ERROR'     // Connection failed
  | 'AUTH_ERROR'        // API key invalid
  | 'SKIP_TRACE_EMPTY'; // No contact info found

// Error handling in process
try {
  const detail = await fetchPropertyDetail(propertyId);
} catch (error) {
  await db.update(leads)
    .set({
      enrichmentStatus: 'failed',
      enrichmentError: error.message
    })
    .where(eq(leads.id, leadId));
  stats.failed++;
  continue;  // Don't fail entire batch
}
```

### Recovery Mechanisms

1. **Resume from checkpoint**: `startFrom` parameter in process API
2. **Retry failed leads**: Re-process with `enrichmentStatus = 'failed'`
3. **Partial success**: Continue processing even if some leads fail
4. **Idempotent operations**: Safe to re-run same batch

---

## Security Considerations

### Access Control

```typescript
// All bucket operations should verify ownership
const userId = await getCurrentUserId();  // From auth
const bucket = await db.select()
  .from(buckets)
  .where(and(
    eq(buckets.id, bucketId),
    eq(buckets.userId, userId)  // Ownership check
  ));

if (!bucket) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### API Key Protection

- External API keys stored in environment variables
- Never exposed to client-side code
- Rate limiting prevents abuse
- Audit logging for API usage

### Data Privacy

- Phone/email data is PII - handle accordingly
- Apollo data may contain sensitive business info
- Implement data retention policies
- Support data deletion requests (GDPR)

---

## Summary

The Bucket System is the **economic backbone** of the platform, enabling:

1. **Massive data acquisition** at zero cost (IDs only)
2. **Selective enrichment** on demand (pay for what you use)
3. **Reusable data assets** (buckets persist and can be re-enriched)
4. **Campaign-ready leads** (enriched data flows to all outreach channels)

The architecture separates concerns cleanly:

- **Buckets** = containers with metadata
- **Leads** = individual records with progressive enrichment
- **APIs** = stateless processors for each enrichment tier
- **UI** = state management for user interactions

This design scales from single users testing with 250 leads to enterprise operations processing millions.
