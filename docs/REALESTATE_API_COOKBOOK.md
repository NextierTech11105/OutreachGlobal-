# RealEstateAPI Cookbook - Complete Guide

## Overview

RealEstateAPI is your **all-in-one** property data and skip tracing solution. One API key gives you access to:
- 150M+ property records
- Property owner information
- Skip tracing (phones, emails)
- Demographics data

**Base URL:** `https://api.realestateapi.com`
**Your API Key:** Set in `REALESTATE_API_KEY` environment variable

---

## The Complete Flow (Story)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXTIER LEAD GENERATION FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: PROPERTY SEARCH
━━━━━━━━━━━━━━━━━━━━━━━
User enters: "Find pre-foreclosure properties in Miami with 50%+ equity"
    │
    ▼
POST /v2/PropertySearch
{
  "state": "FL",
  "city": "Miami",
  "pre_foreclosure": true,
  "equity_percent_min": 50,
  "size": 100
}
    │
    ▼
Returns: 100 properties with owner names, addresses, equity info
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 2: SKIP TRACE
━━━━━━━━━━━━━━━━━━
User clicks "Skip Trace" on selected properties
    │
    ▼
POST /v1/SkipTrace
{
  "first_name": "John",
  "last_name": "Smith",
  "address": "123 Main St",
  "city": "Miami",
  "state": "FL",
  "zip": "33101"
}
    │
    ▼
Returns: Phone numbers, emails, address history, demographics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 3: CREATE LEADS
━━━━━━━━━━━━━━━━━━━━
User clicks "Create Leads" (max 5,000 per campaign)
    │
    ▼
GraphQL Mutation: createLead
{
  name: "John Smith",
  phone: "+13055551234",
  email: "john@email.com",
  address: "123 Main St, Miami, FL",
  propertyValue: 450000,
  equity: 225000
}
    │
    ▼
Leads stored in PostgreSQL database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 4: LAUNCH CAMPAIGN
━━━━━━━━━━━━━━━━━━━━━━━
User clicks "Launch Campaign"
    │
    ▼
SMS sent via Twilio/SignalHouse:
"Hi John, I noticed your property at 123 Main St.
 Are you considering selling? Reply YES for a cash offer."
    │
    ▼
Responses tracked, leads updated, deals closed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## API Endpoints Reference

### 1. Property Search (v2)

**Endpoint:** `POST https://api.realestateapi.com/v2/PropertySearch`

**Headers:**
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "state": "FL",
  "city": "Miami",
  "zip": "33101",
  "county": "Miami-Dade",

  "property_type": ["SFR", "CONDO", "MFR"],
  "beds_min": 2,
  "beds_max": 5,
  "baths_min": 1,
  "building_size_min": 1000,
  "building_size_max": 5000,
  "lot_size_min": 5000,
  "year_built_min": 1980,
  "year_built_max": 2020,

  "estimated_value_min": 100000,
  "estimated_value_max": 500000,
  "estimated_equity_min": 50000,
  "equity_percent_min": 30,

  "absentee_owner": true,
  "owner_occupied": false,
  "high_equity": true,
  "pre_foreclosure": true,
  "foreclosure": false,
  "auction": false,
  "tax_lien": true,
  "vacant": true,
  "inherited": true,
  "death": true,
  "corporate_owned": false,
  "cash_buyer": false,
  "investor_buyer": true,
  "free_clear": true,

  "mls_active": false,
  "mls_pending": false,
  "mls_sold": false,

  "size": 100,
  "from": 0,
  "sort": { "equity_percent": "desc" }
}
```

**Response:**
```json
{
  "live": true,
  "resultCount": 1542,
  "data": [
    {
      "id": "12345678",
      "propertyId": "REI-12345678",
      "address": {
        "address": "123 Main St, Miami, FL 33101",
        "street": "123 Main St",
        "city": "Miami",
        "state": "FL",
        "zip": "33101",
        "county": "Miami-Dade"
      },
      "propertyType": "SFR",
      "bedrooms": 3,
      "bathrooms": 2,
      "squareFeet": 1850,
      "yearBuilt": 1995,
      "estimatedValue": 450000,
      "estimatedEquity": 275000,
      "equityPercent": 61,
      "owner1FirstName": "John",
      "owner1LastName": "Smith",
      "ownerOccupied": false,
      "absenteeOwner": true,
      "preForeclosure": true,
      "latitude": 25.7617,
      "longitude": -80.1918
    }
  ]
}
```

---

### 2. Property Detail (v2)

**Endpoint:** `POST https://api.realestateapi.com/v2/PropertyDetail`

**Request:**
```json
{
  "id": "12345678"
}
```

**Response:** Full property details including:
- Sale history
- Mortgage history
- School ratings
- Demographics
- Linked properties (portfolio)

---

### 3. Skip Trace (v1)

**Endpoint:** `POST https://api.realestateapi.com/v1/SkipTrace`

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "address": "123 Main St",
  "city": "Miami",
  "state": "FL",
  "zip": "33101"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "owner_names": ["John Smith", "Jane Smith"],
    "phones": [
      { "number": "+13055551234", "type": "mobile", "carrier": "Verizon" },
      { "number": "+13055555678", "type": "landline" }
    ],
    "emails": [
      { "email": "john.smith@gmail.com", "type": "personal" },
      { "email": "jsmith@work.com", "type": "work" }
    ],
    "address_history": [
      { "address": "123 Main St, Miami, FL 33101", "dates": "2015-present" },
      { "address": "456 Oak Ave, Tampa, FL 33602", "dates": "2010-2015" }
    ],
    "age": 45,
    "date_of_birth": "1979-05-15",
    "job_history": [
      { "employer": "ABC Corp", "title": "Manager" }
    ]
  }
}
```

---

## Recipe: Find Motivated Sellers

### Pre-Foreclosure + High Equity

```json
{
  "state": "FL",
  "pre_foreclosure": true,
  "equity_percent_min": 40,
  "size": 500
}
```

**Why:** Owners facing foreclosure WITH equity are motivated to sell before losing their equity.

---

### Absentee Owners + Vacant Properties

```json
{
  "state": "TX",
  "city": "Houston",
  "absentee_owner": true,
  "vacant": true,
  "size": 500
}
```

**Why:** Owners not living there + vacant = likely want to sell.

---

### Inherited Properties (Probate)

```json
{
  "state": "CA",
  "inherited": true,
  "death": true,
  "size": 500
}
```

**Why:** Heirs often want to sell inherited properties quickly.

---

### Free & Clear (No Mortgage)

```json
{
  "state": "AZ",
  "free_clear": true,
  "absentee_owner": true,
  "size": 500
}
```

**Why:** No mortgage = easy sale, no lender approval needed.

---

### Tax Lien Properties

```json
{
  "state": "GA",
  "tax_lien": true,
  "size": 500
}
```

**Why:** Owners behind on taxes may need to sell quickly.

---

## Recipe: Investment Targets

### Cash Buyers (Investors)

```json
{
  "state": "FL",
  "cash_buyer": true,
  "investor_buyer": true,
  "size": 500
}
```

**Why:** Find other investors to wholesale deals to.

---

### Multi-Family Properties

```json
{
  "state": "TX",
  "property_type": ["MFR"],
  "estimated_value_min": 200000,
  "estimated_value_max": 1000000,
  "size": 500
}
```

**Why:** Rental income properties for investors.

---

## Our Nextier Endpoints

All RealEstateAPI calls go through our Next.js API routes:

| Nextier Endpoint | RealEstateAPI Endpoint | Purpose |
|------------------|------------------------|---------|
| `POST /api/property-search` | `/v2/PropertySearch` | Build search results for geos, zoning, MLS, ownership filters, etc. |
| `GET /api/property-detail?id=<id>` | `/v2/PropertyDetail` | Retrieve a single property's valuation, ownership, and skip-trace data. |
| `POST /api/property-detail` | `/v2/PropertyDetail` | Batch detail loads for enrichment or skip-trace payloads. |
| `POST /api/skip-trace` | `/v1/SkipTrace` | Skip-trace owner info (up to 250 per call) to get phones/emails. Uses PropertyDetail first to get owner name/address. |
| `GET /api/skip-trace` | Internal tracker | View the daily limit (5,000 traces) and remaining quota before triggering more batches. |

---

## Usage Limits & Pricing

Check your RealEstateAPI dashboard for:
- Monthly API calls remaining
- Skip trace credits
- Property search credits

**Typical pricing:**
- Property searches: ~$0.01 per record
- Skip traces: ~$0.10-0.25 per person

---

## Error Handling

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Invalid API key | Check `REALESTATE_API_KEY` |
| 403 | No credits | Add credits to your account |
| 429 | Rate limited | Slow down requests |
| 500 | Server error | Retry in a few seconds |

---

## Complete Workflow Diagram

```mermaid
flowchart LR
  User[User / Claude prompt]
  Vercel[Vercel frontend + API routes]
  DigitalOcean[DigitalOcean NestJS & GraphQL + job queues]
  Postgres[PostgreSQL + saved searches]
  RealEstate[RealEstateAPI & Apollo.io]
  SignalHouse[SignalHouse/Twilio SMS campaigns]
  MCP[Claude MCP (Postgres + RealEstateAPI + DigitalOcean)]

  User --> Vercel
  Vercel --> DigitalOcean
  DigitalOcean --> Postgres
  DigitalOcean --> RealEstate
  DigitalOcean --> SignalHouse
  SignalHouse --> User
  MCP --> Postgres
  MCP --> RealEstate
  MCP --> DigitalOcean
  RealEstate --> MCP
  Postgres --> MCP
```

---

## Quick Start Example

```typescript
// 1. Search for properties
const searchResponse = await fetch('/api/property-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    state: 'FL',
    city: 'Miami',
    pre_foreclosure: true,
    equity_percent_min: 50,
    size: 100,
  }),
});

const searchData = await searchResponse.json();
const batchIds = (searchData.data || [])
  .map((p: any) => p.id)
  .filter(Boolean)
  .slice(0, 250);

// 2. Skip trace the batch
const skipTraceResponse = await fetch('/api/skip-trace', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: batchIds }),
});

// 3. Track your daily usage
const usageResponse = await fetch('/api/skip-trace');
const usageData = await usageResponse.json();
```

---

## Support

- **RealEstateAPI Docs:** https://developer.realestateapi.com
- **RealEstateAPI Discord:** Check their website for community link
- **Nextier Issues:** https://github.com/NextierTech11105/OutreachGlobal-

---

*Last Updated: November 29, 2024*
