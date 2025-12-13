# USBizData Data Lake Architecture
## Nextier Pipeline Integration Guide

---

## Overview

USBizData provides the foundational data layer for Nextier's multi-channel outreach pipeline. The NY Database Bundle ($47) contains **33.7M total records** across 4 complementary databases that, when cross-referenced, create a unified "Golden Record" for each contact.

---

## The 4 Core Data Lakes

### 1. NY Business Database (5,514,091 Records)
**Source:** USBizData Q4 2025
**Format:** CSV with Software
**Price:** $27.00 USD (or included in $47 bundle)

| Field | Type | Description | Nextier Mapping |
|-------|------|-------------|-----------------|
| Company Name | String | Legal business name | `company_name` |
| Contact Name | String | Decision maker name | `contact_name` → split to `first_name`, `last_name` |
| Email Address | String | Business email | `email` |
| Street Address | String | Physical location | `address` |
| City | String | City | `city` |
| State | String | State (NY) | `state` |
| Zip Code | String | 5-digit ZIP | `zip` |
| County | String | NY County | `county` → maps to `sector` |
| Area Code | String | Phone area code | Combined with `phone` |
| Phone Number | String | Business phone | `phone` |
| Website URL | String | Company website | `website` → used for Apollo enrichment |
| Number of Employees | Integer | Employee count | `employee_count` → revenue tier |
| Annual Revenue | String | Revenue range | `revenue` → priority scoring |
| SIC Code | String | Industry code | `sic_code` → `industry` mapping |
| SIC Description | String | Industry name | `industry` |

**Primary Use Cases:**
- B2B cold outreach
- Decision maker identification
- Industry-targeted campaigns
- Revenue-based lead scoring

---

### 2. NY Residential Database (15,809,647 Records)
**Source:** USBizData Q4 2025
**Format:** CSV with Software

| Field | Type | Description | Nextier Mapping |
|-------|------|-------------|-----------------|
| First Name | String | Owner first name | `first_name` |
| Last Name | String | Owner last name | `last_name` |
| Address | String | Property address | `address` |
| City | String | City | `city` |
| State | String | State (NY) | `state` |
| Zip Code | String | 5-digit ZIP | `zip` |
| County | String | NY County | `county` → `sector` |
| Phone Number | String | Home phone (if available) | `phone` |
| Age | Integer | Estimated age | `age` → demographic targeting |
| Income | String | Estimated income range | `income` → priority scoring |
| Home Value | String | Property value estimate | `property_value` |
| Home Owner | Boolean | Owner vs renter | `is_owner` |
| Length of Residence | Integer | Years at address | `years_at_address` |

**Primary Use Cases:**
- Property owner outreach
- Absentee owner identification (cross-ref with property DB)
- Homeowner marketing
- Geographic targeting by county/zip

---

### 3. NY Cell Phone Database (5,100,000+ Records)
**Source:** USBizData Q4 2025
**Format:** CSV with Software

| Field | Type | Description | Nextier Mapping |
|-------|------|-------------|-----------------|
| First Name | String | Contact first name | `first_name` |
| Last Name | String | Contact last name | `last_name` |
| Cell Phone | String | Mobile number | `cell_phone` (PRIMARY) |
| Address | String | Associated address | `address` |
| City | String | City | `city` |
| State | String | State | `state` |
| Zip | String | ZIP code | `zip` |

**Primary Use Cases:**
- SMS campaign targeting
- Power dialer campaigns
- Skip trace cost reduction (already have cell)
- Mobile-first outreach

---

### 4. NY Opt-In Email Database (7,300,000+ Records)
**Source:** USBizData Q4 2025
**Format:** CSV with Software

| Field | Type | Description | Nextier Mapping |
|-------|------|-------------|-----------------|
| Email | String | Opt-in email address | `email` |
| First Name | String | First name | `first_name` |
| Last Name | String | Last name | `last_name` |
| Address | String | Mailing address | `address` |
| City | String | City | `city` |
| State | String | State | `state` |
| Zip | String | ZIP code | `zip` |
| IP Address | String | Registration IP | Used for geo-verification |
| Opt-in Date | Date | When they opted in | `opt_in_date` → recency scoring |
| Opt-in Source | String | Where they opted in | `source` → interest categorization |

**Primary Use Cases:**
- Email marketing campaigns
- Newsletter outreach
- CAN-SPAM compliant cold email
- Warm lead identification

---

## Cross-Reference Architecture

### The Golden Record Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GOLDEN RECORD                                      │
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  BUSINESS   │   │ RESIDENTIAL │   │  CELL PHONE │   │  OPT-IN     │     │
│  │  DATABASE   │   │  DATABASE   │   │  DATABASE   │   │  EMAIL DB   │     │
│  │  5.5M       │   │  15.8M      │   │  5.1M       │   │  7.3M       │     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │             │
│         └────────────┬────┴────────────┬────┴────────────┬────┘             │
│                      │                 │                 │                   │
│                      ▼                 ▼                 ▼                   │
│              ┌───────────────────────────────────────────────┐              │
│              │            MATCHING ENGINE                     │              │
│              │                                                │              │
│              │  Key 1: address + last_name (strongest)       │              │
│              │  Key 2: phone_number (if exists)              │              │
│              │  Key 3: email_domain + last_name              │              │
│              │  Key 4: name_soundex + zip (fuzzy)            │              │
│              └───────────────────────────────────────────────┘              │
│                                    │                                         │
│                                    ▼                                         │
│              ┌───────────────────────────────────────────────┐              │
│              │            UNIFIED CONTACT                     │              │
│              │                                                │              │
│              │  first_name: "John"                           │              │
│              │  last_name: "Smith"                           │              │
│              │  company: "Smith Real Estate LLC"             │              │
│              │  address: "123 Main St, Brooklyn, NY 11201"   │              │
│              │  cell_phone: "917-555-1234" (from Cell DB)    │              │
│              │  business_phone: "718-555-5678" (from Biz DB) │              │
│              │  email: "john@smithre.com" (from Opt-in DB)   │              │
│              │  annual_revenue: "$1M-$5M"                    │              │
│              │  sic_code: "6531" (Real Estate)               │              │
│              │  property_value: "$750,000"                   │              │
│              │  is_absentee: true                            │              │
│              │                                                │              │
│              │  ENRICHMENT STATUS:                           │              │
│              │  ✅ Has Cell (from Cell DB - no skip trace)   │              │
│              │  ✅ Has Email (from Opt-in DB)                │              │
│              │  ⏳ Needs Apollo (LinkedIn, title)            │              │
│              └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Matching Key Priority

| Priority | Match Key | Confidence | Use Case |
|----------|-----------|------------|----------|
| 1 | `normalized_address` + `last_name` | 95%+ | Most reliable for property owners |
| 2 | `phone_number` (exact) | 99% | When cell phone exists |
| 3 | `email` (exact) | 99% | When email exists |
| 4 | `company_name` + `zip` | 85% | Business matching |
| 5 | `last_name_soundex` + `zip` + `first_initial` | 70% | Fuzzy matching |

### Address Normalization Rules

```javascript
function normalizeAddress(address) {
  return address
    .toUpperCase()
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bBOULEVARD\b/g, 'BLVD')
    .replace(/\bAPARTMENT\b/g, 'APT')
    .replace(/\bSUITE\b/g, 'STE')
    .replace(/\bUNIT\b/g, 'UNIT')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

---

## Nextier Pipeline Integration

### Stage 1: CSV Import to Sectors

```
USBizData CSV
     │
     ▼
┌─────────────────────────────────────────┐
│           SECTOR IMPORT                  │
│                                          │
│  POST /api/sectors/import                │
│  {                                       │
│    "file": "ny_business_2025.csv",      │
│    "mapping": {                          │
│      "Company Name": "company_name",     │
│      "Contact Name": "contact_name",     │
│      "Email Address": "email",           │
│      "Phone Number": "phone",            │
│      ...                                 │
│    },                                    │
│    "sector_assignment": "county",        │
│    "dedupe_key": "address+last_name"     │
│  }                                       │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│           SECTORS CREATED                │
│                                          │
│  - Kings County (Brooklyn): 892,341      │
│  - Queens County: 756,233                │
│  - New York County (Manhattan): 634,892  │
│  - Bronx County: 423,891                 │
│  - Nassau County: 387,234                │
│  - Suffolk County: 412,567               │
│  - Westchester County: 298,432           │
│  - ... (62 NY counties total)            │
└─────────────────────────────────────────┘
```

### Stage 2: Cross-Reference Enrichment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-REFERENCE PIPELINE                                  │
│                                                                              │
│  Step 1: Load Business DB contacts into sector                              │
│          Mark has_email = true, has_biz_phone = true                        │
│                                                                              │
│  Step 2: Match against Cell Phone DB                                         │
│          UPDATE contacts SET cell_phone = cell_db.phone                      │
│          WHERE contacts.address = cell_db.address                            │
│          AND contacts.last_name = cell_db.last_name                          │
│          → ~2.1M matches (38% coverage)                                      │
│                                                                              │
│  Step 3: Match against Opt-in Email DB                                       │
│          UPDATE contacts SET opt_in_email = email_db.email                   │
│          WHERE contacts.last_name = email_db.last_name                       │
│          AND contacts.zip = email_db.zip                                     │
│          → ~1.8M matches (33% coverage)                                      │
│                                                                              │
│  Step 4: Match against Residential DB                                        │
│          UPDATE contacts SET property_value = res_db.home_value,             │
│                             is_homeowner = res_db.home_owner                 │
│          WHERE contacts.address = res_db.address                             │
│          → ~4.2M matches (76% coverage)                                      │
│                                                                              │
│  RESULT: 5.5M business contacts with:                                        │
│          - 2.1M have cell phone (no skip trace needed)                       │
│          - 1.8M have opt-in email                                            │
│          - 4.2M have property data                                           │
│          - 3.4M still need skip trace                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 3: Priority Skip Trace Queue

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SKIP TRACE PRIORITIZATION                                 │
│                                                                              │
│  PRIORITY SCORE = (revenue_score * 0.3) +                                   │
│                   (property_value_score * 0.25) +                           │
│                   (industry_match_score * 0.2) +                            │
│                   (recency_score * 0.15) +                                  │
│                   (completeness_score * 0.1)                                │
│                                                                              │
│  WHERE:                                                                      │
│    revenue_score = 1.0 if revenue > $10M                                    │
│                    0.8 if revenue $5M-$10M                                  │
│                    0.6 if revenue $1M-$5M                                   │
│                    0.4 if revenue $500K-$1M                                 │
│                    0.2 otherwise                                            │
│                                                                              │
│    property_value_score = normalized(home_value / max_home_value)           │
│                                                                              │
│    industry_match_score = 1.0 if SIC in target_industries                   │
│                           0.5 otherwise                                     │
│                                                                              │
│    recency_score = 1.0 if record updated Q4 2025                            │
│                    0.8 if Q3 2025                                           │
│                    0.5 otherwise                                            │
│                                                                              │
│    completeness_score = (fields_filled / total_fields)                      │
│                                                                              │
│  DAILY QUEUE (5,000/day):                                                   │
│    SELECT * FROM contacts                                                    │
│    WHERE needs_skip_trace = true                                            │
│    AND cell_phone IS NULL                                                    │
│    ORDER BY priority_score DESC                                              │
│    LIMIT 5000                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4: Apollo Enrichment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APOLLO ENRICHMENT LAYER                                   │
│                                                                              │
│  TRIGGER: After skip trace OR for B2B decision maker lookup                 │
│                                                                              │
│  INPUT (from Business DB):                                                   │
│    - company_name                                                            │
│    - contact_name (or first_name + last_name)                               │
│    - website_url (for company matching)                                      │
│    - email (for person matching)                                             │
│                                                                              │
│  APOLLO RETURNS:                                                             │
│    - linkedin_url                                                            │
│    - title (CEO, Owner, VP Sales, etc.)                                     │
│    - direct_dial (work cell)                                                 │
│    - verified_email                                                          │
│    - company_linkedin                                                        │
│    - company_size (more accurate than SIC)                                  │
│    - technologies_used                                                       │
│    - funding_info                                                            │
│    - intent_signals                                                          │
│                                                                              │
│  PRIORITY FOR APOLLO:                                                        │
│    1. Business owners with website_url (company match)                       │
│    2. Contacts with email (person match)                                     │
│    3. High revenue businesses (decision maker lookup)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: End-to-End Pipeline

```
                           USBIZDATA DATA LAKES
                                   │
    ┌──────────────┬───────────────┼───────────────┬──────────────┐
    │              │               │               │              │
    ▼              ▼               ▼               ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│Business│   │Residential│   │Cell Phone│   │ Opt-in   │   │ Property │
│  5.5M  │   │  15.8M   │   │   5.1M   │   │  Email   │   │   API    │
│        │   │          │   │          │   │   7.3M   │   │(RealEst) │
└────┬───┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │            │              │              │              │
     └────────────┴──────────────┴──────────────┴──────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    SECTOR IMPORT        │
                    │    /api/sectors/import  │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   CROSS-REFERENCE       │
                    │   Match + Dedupe        │
                    │   Create Golden Records │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    SKIP TRACE           │
                    │    /api/skip-trace      │
                    │    5K/day limit         │
                    │    Priority: no-phone   │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   APOLLO ENRICHMENT     │
                    │   /api/enrichment/apollo│
                    │   LinkedIn + Title      │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   CAMPAIGN ASSIGNMENT   │
                    │                         │
                    │   has_cell → SMS/Call   │
                    │   has_email → Email     │
                    │   has_both → Multi-ch   │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
     │  SMS BLAST  │   │ POWER DIALER│   │   EMAIL     │
     │  SignalHouse│   │   Twilio    │   │  Campaign   │
     │  Gianna AI  │   │   AI Voce   │   │   Gianna    │
     └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │   GIANNA AI TRAINING    │
                    │   /t/[team]/ai-training │
                    │                         │
                    │   Response handling     │
                    │   Human-in-loop QA      │
                    │   Auto-reply mode       │
                    └─────────────────────────┘
```

---

## API Endpoints for Data Lake Operations

### Import Endpoint
```typescript
POST /api/sectors/import
Content-Type: multipart/form-data

{
  file: File (CSV),
  source: "usbizdata_business" | "usbizdata_residential" | "usbizdata_cell" | "usbizdata_email",
  sector_assignment: "county" | "zip" | "city" | "custom",
  mapping: {
    // CSV column → Nextier field
    "Company Name": "company_name",
    "Contact Name": "contact_name",
    ...
  },
  dedupe: {
    enabled: true,
    key: "address+last_name" | "phone" | "email"
  }
}
```

### Cross-Reference Endpoint
```typescript
POST /api/data/cross-reference
{
  primary_source: "usbizdata_business",
  match_against: ["usbizdata_cell", "usbizdata_email", "usbizdata_residential"],
  match_keys: ["address+last_name", "phone", "email"],
  sector_id: "uuid" // optional, to limit scope
}

Response:
{
  total_records: 5514091,
  matched: {
    cell_phone_db: 2134567,
    email_db: 1823456,
    residential_db: 4234567
  },
  enriched_fields: {
    with_cell: 2134567,
    with_email: 3456789, // business email + opt-in
    with_property_data: 4234567
  },
  needs_skip_trace: 3379524
}
```

### Bulk Skip Trace Endpoint
```typescript
POST /api/skip-trace/bulk
{
  sector_id: "uuid",
  filters: {
    has_cell: false,  // only those without cell
    priority_min: 0.7 // high priority only
  },
  limit: 5000 // daily max
}

Response:
{
  queued: 5000,
  estimated_cost: "$0.00", // included in RealEstateAPI plan
  estimated_completion: "2025-12-05T23:59:59Z"
}
```

---

## SIC Code to Industry Mapping

```typescript
const SIC_TO_INDUSTRY: Record<string, string> = {
  // Real Estate (PRIMARY TARGET)
  "6531": "Real Estate Agents & Managers",
  "6512": "Operators of Nonresidential Buildings",
  "6519": "Lessors of Real Property",
  "6552": "Land Subdividers & Developers",

  // Construction (HIGH VALUE)
  "1521": "General Contractors - Single-Family Houses",
  "1531": "Operative Builders",
  "1541": "General Contractors - Industrial Buildings",

  // Finance (HIGH VALUE)
  "6021": "National Commercial Banks",
  "6022": "State Commercial Banks",
  "6141": "Personal Credit Institutions",
  "6162": "Mortgage Bankers & Loan Correspondents",

  // Professional Services
  "8111": "Legal Services",
  "8721": "Accounting, Auditing & Bookkeeping",
  "8742": "Management Consulting Services",

  // Healthcare (HIGH VALUE)
  "8011": "Offices & Clinics of Doctors of Medicine",
  "8021": "Offices & Clinics of Dentists",
  "8051": "Skilled Nursing Care Facilities",
};

// Priority industries for Nextier pipeline
const TARGET_INDUSTRIES = [
  "6531", "6512", "6519", "6552", // Real Estate
  "1521", "1531", "1541",         // Construction
  "6162",                          // Mortgage
];
```

---

## Cost Optimization Matrix

| Data Source | Cost | Records | Cost/Record | Nextier Use |
|-------------|------|---------|-------------|-------------|
| USBizData Business | $27 | 5.5M | $0.0000049 | Primary B2B source |
| USBizData Residential | $20 | 15.8M | $0.0000013 | Property owner matching |
| USBizData Cell | $15 | 5.1M | $0.0000029 | Skip trace avoidance |
| USBizData Email | $12 | 7.3M | $0.0000016 | Email campaign ready |
| **Bundle Total** | **$47** | **33.7M** | **$0.0000014** | **Full pipeline** |
| RealEstateAPI Skip | **$0.05/record** | No minimum | Pay-as-you-go | Phone enrichment |
| Apollo Enrichment | Credits | Variable | ~$0.03 | LinkedIn + Title |

**RealEstateAPI Pricing:** $0.05 per skip trace, wholesale pay-as-you-go, NO minimum commitment

### ROI Calculation

```
INVESTMENT:
  USBizData Bundle:           $47.00 (one-time, 33.7M records)

SKIP TRACE COSTS (RealEstateAPI @ $0.05/record):
  Without Cross-Ref: 5.5M × $0.05 = $275,000 (if you skip traced everything)
  With Cross-Ref:    3.4M × $0.05 = $170,000 (saved $105,000!)

  But you don't need all 3.4M - prioritize:
  Top 10% high-value: 340K × $0.05 = $17,000
  Top 1% ultra-high:   34K × $0.05 = $1,700

REALISTIC CAMPAIGN:
  Start with: 10,000 skip traces = $500
  Cross-ref gives you: 2.1M with cell phone FREE
  Total campaign-ready: 2.1M + 10K = 2,110,000 contacts

CONVERSION MATH:
  2,110,000 contacts
  × 0.1% response rate = 2,110 conversations
  × 10% close rate = 211 deals
  × $5,000 avg commission = $1,055,000 revenue

TOTAL INVESTMENT:
  Data: $47 + Skip Trace: $500 = $547

ROI: $1,055,000 / $547 = 1,929x return
```

**The Cross-Reference Saves You $105,000+ in Skip Trace Costs**

---

## End-to-End Upload Flow

### Step 1: Upload CSVs to Data Lakes

Navigate to `/t/[team]/sectors` and click **"Upload CSV"**

```
┌─────────────────────────────────────────────────────────────────┐
│  📁 Upload CSV Database                                         │
│                                                                  │
│  [Select File: ny_business_database.csv]                        │
│                                                                  │
│  Name: NY Business Database                                      │
│  Description: 5.5M NY businesses from USBizData                 │
│  Tags: business, b2b, new-york                                  │
│                                                                  │
│  [Upload & Process]                                              │
│                                                                  │
│  ✅ Auto-Detection Results:                                      │
│  Source Type: USBizData Business                                │
│  Columns Mapped: Company Name, Contact Name, Email, Phone...    │
└─────────────────────────────────────────────────────────────────┘
```

**Auto-Detection Logic:**
- Has `Company Name` + `SIC Code` → **USBizData Business**
- Has `Cell Phone` (no Company) → **USBizData Cell Phone**
- Has `Opt-in Date` or `IP Address` → **USBizData Opt-in Email**
- Has `Home Value` or `Income` → **USBizData Residential**

### Step 2: Data Lakes Appear in Sectors

After upload, your data lakes show in the **Data Lakes** tab:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🗄️ YOUR DATA LAKES                                     Total: 33.7M    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │ NY Business         │  │ NY Residential      │  │ NY Cell Phone   │  │
│  │ 5,514,091 records   │  │ 15,809,647 records  │  │ 5,100,000       │  │
│  │                     │  │                     │  │ records         │  │
│  │ 2.1M phones         │  │ 3.2M phones         │  │                 │  │
│  │ 3.8M emails         │  │ 1.1M emails         │  │ 5.1M cells      │  │
│  │ 3.4M need skip trace│  │ 12.6M need skip     │  │ 0 need skip     │  │
│  │                     │  │                     │  │                 │  │
│  │ [View] [Skip Trace] │  │ [View] [Skip Trace] │  │ [View] [SMS]    │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                          │
│  ┌─────────────────────┐                                                 │
│  │ NY Opt-in Email     │                                                 │
│  │ 7,300,000 records   │                                                 │
│  │                     │                                                 │
│  │ 0 phones            │                                                 │
│  │ 7.3M emails         │                                                 │
│  │ 2.1M need skip      │                                                 │
│  │                     │                                                 │
│  │ [View] [Email]      │                                                 │
│  └─────────────────────┘                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Step 3: View Records & Filter

Click **View** on any data lake to see the leads list:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  NY Business Database                               5,514,091 records    │
├──────────────────────────────────────────────────────────────────────────┤
│  🔍 Filter: [SIC Code ▼] [Revenue ▼] [County ▼] [Has Phone ▼]           │
│                                                                          │
│  Quick Filters:                                                          │
│  [Pizzerias 5812] [Motels 7011] [Cement 3241] [Manufacturing 20-39]     │
│  [Real Estate 6531] [Construction 15xx] [Blue Collar]                   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  □  Company           Contact      Phone         Email        Revenue   │
│  ─────────────────────────────────────────────────────────────────────  │
│  ☑  Sal's Pizza       Sal Romano   917-555-1234  sal@...     $500K-1M  │
│  ☑  Brooklyn Cement   Mike Chen    718-555-5678  mike@...    $1M-5M    │
│  ☑  Queens Motel      John Smith   ────          john@...    $250K-500K│
│  ☑  NY Manufacturing  Bob Wilson   ────          ────         $5M-10M   │
│                                                                          │
│  Selected: 4 records                                                     │
│  [Skip Trace Selected] [Apollo Enrich] [Add to SMS Campaign]            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Step 4: Skip Trace → Leads Ready

Click **Skip Trace Selected** to enrich records without phone:

```
POST /api/skip-trace
{
  "ids": ["record-1", "record-2", "record-3", "record-4"]
}

Response:
{
  "success": true,
  "results": [
    { "id": "record-3", "phones": ["718-555-9999"], "emails": ["john@queensmotel.com"] },
    { "id": "record-4", "phones": ["212-555-1111", "917-555-2222"], "emails": [] }
  ],
  "stats": {
    "requested": 4,
    "alreadyHadPhone": 2,
    "enriched": 2,
    "cost": "$0.10"  // 2 × $0.05
  }
}
```

---

## Layered Query: B2B + Real Estate Synergy

### Target Industries for Real Estate Cross-Reference

| SIC Code | Industry | Real Estate Angle |
|----------|----------|-------------------|
| 5812 | Pizzerias/Restaurants | Commercial property owners, strip mall tenants |
| 7011 | Motels/Hotels | Commercial real estate, land investors |
| 3241 | Cement/Concrete | Contractors, developers, property flippers |
| 1521 | Residential Construction | Builder-owners, spec home developers |
| 1541 | Industrial Construction | Commercial property development |
| 6531 | Real Estate Agents | Direct competition/partnership |
| 6162 | Mortgage Brokers | Referral partners, distressed property |
| 20xx-39xx | Manufacturing | Industrial property owners, rust belt |

### Cross-Reference Query Example

```sql
-- Find business owners who also own residential property
SELECT
  b.company_name,
  b.contact_name,
  b.phone AS business_phone,
  b.sic_code,
  b.annual_revenue,
  r.address AS property_address,
  r.home_value,
  COALESCE(c.cell_phone, b.phone) AS best_phone
FROM business_db b
LEFT JOIN residential_db r
  ON LOWER(b.contact_name) = LOWER(CONCAT(r.first_name, ' ', r.last_name))
  AND b.zip = r.zip
LEFT JOIN cell_phone_db c
  ON b.address = c.address AND b.last_name = c.last_name
WHERE b.sic_code IN ('5812', '7011', '3241', '1521', '6531')
  AND b.state = 'NY'
  AND (r.home_value > 500000 OR b.annual_revenue > '$1M')
ORDER BY b.annual_revenue DESC;
```

### The Pipeline for Blue Collar Businesses

```
USBizData Business (NY)
        │
        │ Filter: SIC 5812, 7011, 3241, 15xx, 20xx-39xx
        │ (Pizzerias, Motels, Cement, Construction, Manufacturing)
        ▼
┌─────────────────────────┐
│  FILTERED SUBSET        │
│  ~850K blue collar      │
│  business owners        │
└───────────┬─────────────┘
            │
            │ Cross-Reference with Residential DB
            │ Match: contact_name + zip
            ▼
┌─────────────────────────┐
│  PROPERTY OWNERS        │
│  ~340K also own         │
│  residential property   │
│  (40% match rate)       │
└───────────┬─────────────┘
            │
            │ Cross-Reference with Cell Phone DB
            │ Match: address + last_name
            ▼
┌─────────────────────────┐
│  CAMPAIGN READY         │
│  ~180K have cell phone  │
│  (skip trace avoided!)  │
│                         │
│  ~160K need skip trace  │
│  @ $0.05 = $8,000       │
└───────────┬─────────────┘
            │
            │ Priority Skip Trace
            │ High equity + high revenue first
            ▼
┌─────────────────────────┐
│  ENRICHED LEADS         │
│  340K total with:       │
│  - Business data        │
│  - Property data        │
│  - Cell phone           │
│  - Ready for SMS/Call   │
└─────────────────────────┘
```

---

## Next Steps

1. **Import USBizData CSVs** → `/t/[team]/sectors` → Click "Upload CSV"
2. **Auto-Detection Labels** → System identifies Business vs Residential vs Cell vs Email
3. **View & Filter** → Click into data lake → Filter by SIC, revenue, county
4. **Cross-Reference** → `/admin/data/verification` → "Data Append" tab
5. **Skip Trace** → Select records without phone → "Skip Trace Selected"
6. **Apollo Enrich** → Add LinkedIn, decision maker title
7. **Launch Campaigns** → SMS Templates → Power Dialer → Gianna AI

---

*Documentation Version: 1.0*
*Last Updated: December 2025*
*Data Source: USBizData.com Q4 2025*
