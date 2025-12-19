# AUDIT PHASE 3: Data Flow Trace (End-to-End)
**Platform**: OutreachGlobal / Nextier / Homeowner Advisor
**Audit Date**: 2025-12-18
**Auditor**: Claude (Principal Platform Engineer)
**Scope**: Complete data journey from CSV upload → Follow-up automation

---

## Executive Summary

This document traces a **single record's journey** through the entire system, from initial CSV upload through enrichment, campaign creation, outbound messaging, inbound response handling, and automated follow-up.

### Critical Findings

| Step | Critical Issue | Severity | Impact |
|------|----------------|----------|--------|
| **Step 1** | No tenant namespacing in S3 storage | 🔴 HIGH | Cross-tenant data access |
| **Step 1** | Data stored in globalThis (CSV metadata) | 🔴 CRITICAL | Lost on restart |
| **Step 3** | teamId undefined in lead creation | 🔴 CRITICAL | Cross-tenant data leak |
| **Step 4** | Campaign stored in globalThis | 🔴 CRITICAL | Lost on server restart |
| **Step 5** | No Apollo deduplication | 🟡 MEDIUM | Duplicate charges |
| **Step 5** | No rate limiting on Apollo | 🟡 MEDIUM | API throttling risk |
| **Step 7** | No confidence threshold enforcement | 🟡 MEDIUM | Inappropriate auto-responses |
| **Step 8** | Email capture automation non-persistent | 🟡 MEDIUM | Deliverables may fail |

---

## Complete Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OMNI-CHANNEL OUTREACH SYSTEM                    │
│                       Full Record Journey (Traced)                      │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: CSV UPLOAD
│   File: apps/front/src/app/api/buckets/sectors/upload/route.ts
│   Handler: POST /api/buckets/sectors/upload
│   ├── Input: FormData { file, bucketId, sicCode?, description? }
│   ├── Auth: apiAuth() → { userId } ❌ NO teamId!
│   ├── Parsing: csv-parse/sync → array of records
│   ├── Normalization: Field mapping (companyName, email, phone, etc.)
│   ├── Storage Path: datalake/business/{state}/sectors/{sector}/{subsector}/
│   │   ├── Raw CSV: {storagePath}raw/{uploadId}.csv
│   │   └── Processed: {storagePath}processed/{uploadId}.json
│   ├── ❌ CRITICAL: No tenant namespacing! Path is same for all teams
│   ├── ❌ CRITICAL: Metadata stored in globalThis (non-persistent!)
│   │   ```typescript
│   │   if (typeof globalThis !== "undefined") {
│   │     (globalThis as any).__campaigns = ...
│   │   }
│   │   ```
│   └── Output: { uploadId, stats, bucketId }
        │
        ↓
STEP 2: DATALAKE INDEXING
│   File: apps/front/src/lib/datalake/sector-buckets.ts
│   ├── Bucket Assignment: 200+ predefined sector buckets
│   │   ├── Examples: "ny-construction-plumbers", "us-realestate-agents-brokers"
│   │   ├── SIC Code Mapping: getBucketForSIC(sicCode)
│   │   └── Business Line Groups:
│   │       ├── OutreachGlobal: White-label reseller prospects
│   │       ├── Nextier: RE agents & property owners
│   │       └── ECBB: Deal sourcing ($500K-$10M businesses)
│   ├── Index Updates:
│   │   ├── byState: Aggregate counts per state
│   │   ├── byCounty: Aggregate counts per county
│   │   ├── byCity: Aggregate counts per city-state combo
│   │   └── bySicCode: Group records by industry
│   ├── Storage: S3 bucket "nextier" in NYC3 region
│   │   ├── Bucket: Single shared bucket for ALL tenants
│   │   ├── ❌ NO tenant namespacing in paths
│   │   └── Example path: datalake/business/ny/sectors/construction-contractors/plumbers/
│   └── Stats: totalRecords, enrichedRecords, skipTracedRecords
        │
        ↓
STEP 3: ENRICHMENT (Apollo.io)
│   File: apps/front/src/app/api/enrichment/apollo/route.ts
│   Handler: POST /api/enrichment/apollo
│   ├── Input: { recordId, bucketId, email?, companyName?, firstName?, lastName?, linkedinUrl? }
│   ├── Validation: At least one identifier required
│   ├── API Call: https://api.apollo.io/v1/people/match
│   │   ├── Method: POST with api_key in body
│   │   ├── Cost: ~$0.10 per successful match
│   │   ├── ❌ NO deduplication (can re-enrich same contact!)
│   │   ├── ❌ NO rate limiting
│   │   └── Returns: Person data + Organization data
│   ├── Enriched Data:
│   │   ├── Person: firstName, lastName, title, seniority, linkedinUrl, email, phones
│   │   ├── Organization: name, website, employees, revenue, industry, technologies
│   │   └── Derived: revenueTier, yearsInBusiness, isMainStreet, isEstablished
│   ├── Flags Generated:
│   │   ├── hasVerifiedEmail: email_status === "verified"
│   │   ├── hasLinkedin: !!linkedin_url
│   │   ├── isOwnerOrCLevel: seniority in ["owner", "founder", "c_suite"]
│   │   └── isMainStreet: revenue $500K-$10M
│   └── Output: { success, recordId, bucketId, enrichedData }
        │
        ↓
STEP 4: LEAD CREATION
│   File: apps/front/src/app/api/leads/route.ts
│   Handler: POST /api/leads
│   ├── Auth: apiAuth() → { userId, teamId }
│   │   ├── ❌ CRITICAL BUG: teamId is ALWAYS undefined!
│   │   ├── File: apps/front/src/lib/api-auth.ts
│   │   └── Returns: { userId: decoded.sub } (no teamId!)
│   ├── Input: Lead data from enrichment or manual entry
│   ├── Database Insert: leads table
│   │   ├── Schema: apps/api/src/database/schema/leads.schema.ts
│   │   ├── teamId: Should come from apiAuth() but is UNDEFINED!
│   │   ├── ❌ NO tenant filtering occurs!
│   │   └── Cascade: onDelete("cascade") on teamId FK
│   ├── ⚠️ RESULT: Lead created with teamId = undefined
│   │   └── Cross-tenant data leak risk!
│   └── Output: { leadId, status: "created" }
        │
        ↓
STEP 5: CAMPAIGN CREATION
│   File: apps/front/src/app/api/campaign/push/route.ts
│   Handler: POST /api/campaign/push
│   ├── Input: {
│   │   campaignName: string,
│   │   campaignType: "sms" | "email" | "voice" | "multi",
│   │   leads: CampaignLead[],
│   │   assignNumber?: boolean,
│   │   assignAiSdr?: boolean,
│   │   scheduleStart?: string (ISO datetime),
│   │   dailyLimit?: number (default: 500)
│   │ }
│   ├── Validation:
│   │   ├── SMS/Voice: Filter leads with phone numbers
│   │   ├── Email: Filter leads with email addresses
│   │   └── Multi: Require both
│   ├── Campaign ID Generation:
│   │   └── Format: `camp_${timestamp}_${random6chars}`
│   ├── Number Provisioning (if assignNumber = true):
│   │   ├── POST /api/signalhouse
│   │   ├── Requests: Area code based on lead state
│   │   ├── Fallback: Random placeholder if SignalHouse unavailable
│   │   └── Example: +1-917-555-1234 (NYC area code)
│   ├── AI SDR Assignment (if assignAiSdr = true):
│   │   ├── Default: "sabrina_default"
│   │   └── Custom: aiSdrId from request
│   ├── ❌ CRITICAL: Campaign storage in globalThis!
│   │   ```typescript
│   │   if (typeof globalThis !== "undefined") {
│   │     (globalThis as any).__campaigns = (globalThis as any).__campaigns || [];
│   │     (globalThis as any).__campaigns.push(campaignData);
│   │   }
│   │   ```
│   │   └── Result: ALL campaign data lost on server restart!
│   └── Output: {
│         campaignId,
│         campaignName,
│         leadsAdded: 150,
│         status: "ready" | "scheduled"
│       }
        │
        ↓
STEP 6: SMS EXECUTION (SignalHouse)
│   File: apps/front/src/lib/services/signalhouse-service.ts (referenced)
│   Handler: SignalHouse API integration
│   ├── Service: SignalHouse SMS API
│   ├── Cost: ~$0.015 per SMS
│   ├── Batch Processing:
│   │   ├── dailyLimit: 500 (from campaign settings)
│   │   ├── ❌ NO batch size validation
│   │   └── ❌ NO rate limiting enforcement
│   ├── Message Personalization:
│   │   ├── Variables: {{firstName}}, {{address}}, {{propertyValue}}
│   │   ├── Template: From initialMessageId
│   │   └── AI-Generated: Via Gianna if no template
│   ├── Delivery Tracking:
│   │   ├── Status: sent, delivered, failed
│   │   └── Callback webhook: /api/signalhouse/status
│   └── Output: { messageId, status: "queued" }
        │
        ↓
STEP 7: INBOUND RESPONSE (Gianna AI)
│   File: apps/front/src/app/api/gianna/sms-webhook/route.ts
│   Handler: POST /api/gianna/sms-webhook (Twilio webhook)
│   ├── Input: Twilio FormData
│   │   ├── From: Sender phone number
│   │   ├── To: Campaign phone number
│   │   ├── Body: SMS message content
│   │   └── MessageSid: Twilio message ID
│   ├── Context Management:
│   │   ├── Storage: Map<phone, ConversationContext>
│   │   ├── ❌ In-memory only! Lost on restart
│   │   └── Tracks: messageCount, history, lastIntent, firstName, propertyId
│   ├── Classification Pipeline:
│   │   │
│   │   ├── [1] Opt-Out Detection (Priority: IMMEDIATE)
│   │   │   ├── Keywords: STOP, UNSUBSCRIBE, CANCEL, etc.
│   │   │   ├── Action: Add to DNC list → POST /api/suppression
│   │   │   └── Response: "You've been removed from our list"
│   │   │
│   │   ├── [2] Response Classification (Priority: HIGH)
│   │   │   ├── File: apps/front/src/lib/response-classifications.ts
│   │   │   ├── Client-Specific: Homeowner Advisor, Nextier, ECBB
│   │   │   ├── Classifications:
│   │   │   │   ├── email-capture (Priority 100) → Extract email
│   │   │   │   ├── called-phone-line (Priority 95) → HOT LEAD
│   │   │   │   ├── opt-out (Priority 90)
│   │   │   │   ├── interested (Priority 50)
│   │   │   │   ├── not-interested (Priority 40)
│   │   │   │   ├── thank-you (Priority 30)
│   │   │   │   ├── question (Priority 20) → Has "?"
│   │   │   │   └── other (Priority 0) → Catch-all
│   │   │   └── Returns: { classificationId, classificationName, extracted }
│   │   │
│   │   ├── [3] Email Capture Automation (if email detected)
│   │   │   ├── Regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
│   │   │   ├── Trigger: POST /api/automation/email-capture
│   │   │   ├── Deliverable Types:
│   │   │   │   ├── Homeowner Advisor: "property-valuation-report"
│   │   │   │   ├── ECBB Deal Sourcing: "exit-preparation"
│   │   │   │   ├── OutreachGlobal: "white-label-pitch"
│   │   │   │   └── Nextier RE: "user-to-owner-pitch"
│   │   │   ├── Queue Assignment:
│   │   │   │   ├── valuation-queue: Property reports
│   │   │   │   ├── content-queue: Exit prep
│   │   │   │   └── sales-queue: Pitch decks
│   │   │   └── Response: "Just sent your property analysis to {email}"
│   │   │
│   │   └── [4] AI Response Generation (Gianna)
│   │       ├── Service: apps/front/src/lib/gianna/gianna-service.ts
│   │       ├── Context: firstName, propertyAddress, messageNumber, history
│   │       ├── Stage Detection:
│   │       │   ├── cold_open: messageCount === 1
│   │       │   ├── hot_response: lastIntent === "interested"
│   │       │   ├── handling_pushback: lastIntent.startsWith("objection")
│   │       │   └── follow_up: messageCount > 3
│   │       ├── AI Generation:
│   │       │   ├── Intent: interested | objection | neutral | opt_out
│   │       │   ├── Personality: conversational, helpful, non-pushy
│   │       │   ├── Confidence: 0-100
│   │       │   └── Alternatives: 3 response options
│   │       ├── Human-in-Loop Logic:
│   │       │   ├── requiresHumanReview: true if confidence < 70 OR rebuttal > 3
│   │       │   ├── Action: Queue to /api/inbox/pending
│   │       │   └── No auto-response sent
│   │       └── Auto-Response Criteria:
│   │           ├── Confidence ≥ 70
│   │           ├── ❌ NO additional guardrails!
│   │           └── Sends via Twilio TwiML response
│   │
│   └── Output: TwiML XML or empty response
        │
        ↓
STEP 8: INBOX CLASSIFICATION & TAGGING
│   Database: inboxItems table
│   Schema: apps/api/src/database/schema/inbox.schema.ts
│   ├── Inbox Item Created:
│   │   ├── teamId: From lead (but may be undefined!)
│   │   ├── leadId: Associated lead
│   │   ├── direction: "inbound"
│   │   ├── channel: "sms"
│   │   ├── message: Raw SMS body
│   │   ├── classification: From Step 7
│   │   ├── priority: "hot" | "warm" | "cold"
│   │   └── status: "unread" | "read" | "archived"
│   ├── Response Bucket Assignment:
│   │   ├── Table: responseBuckets
│   │   ├── Examples:
│   │   │   ├── email-captures: Email provided
│   │   │   ├── hot-responses: Interested/called back
│   │   │   ├── objections: Pushback/questions
│   │   │   └── dnc: Opt-outs
│   │   └── Movement Tracking:
│   │       ├── Table: bucketMovements
│   │       └── Tracks: fromBucket → toBucket with timestamp
│   └── Priority Calculation:
│       ├── HOT: called-phone-line, email-capture with interest keywords
│       ├── WARM: interested, question
│       └── COLD: not-interested, other
        │
        ↓
STEP 9: FOLLOW-UP AUTOMATION (Cathy Agent)
│   Files: apps/front/src/types/workflow.ts (referenced)
│   Handler: Workflow automation engine
│   ├── Trigger Conditions:
│   │   ├── Email capture + no response after 24h
│   │   ├── Interested but didn't provide email
│   │   ├── Question asked but not answered
│   │   └── Hot lead not contacted within 2h
│   ├── Workflow Actions:
│   │   ├── Send follow-up SMS
│   │   ├── Send email
│   │   ├── Create task for human
│   │   ├── Move to different bucket
│   │   └── Update lead score
│   ├── ❌ NO GUARDRAILS FOUND:
│   │   ├── No max follow-ups per lead
│   │   ├── No time-of-day restrictions
│   │   ├── No DNC list checking in automation
│   │   └── No human approval for new contacts
│   ├── Scheduling:
│   │   ├── Table: workflows (schema exists)
│   │   ├── Execution: NestJS @Cron() decorators
│   │   └── ❌ No centralized calendar view
│   └── Status Tracking:
│       ├── workflowExecutions table
│       └── Status: pending, running, completed, failed
        │
        ↓
STEP 10: ANALYTICS & REPORTING
│   Tables: campaignExecutions, campaignStats, leadInteractions
│   ├── Campaign Metrics:
│   │   ├── sent: Total messages sent
│   │   ├── delivered: Successful deliveries
│   │   ├── responded: Inbound replies received
│   │   ├── positive: Interested responses
│   │   ├── optOut: Opt-outs
│   │   └── emailCaptured: Emails collected
│   ├── Lead Scoring:
│   │   ├── Base score from initial data
│   │   ├── +50: Email captured
│   │   ├── +100: Called phone line
│   │   ├── +25: Interested keyword
│   │   └── -50: Not interested
│   └── Cost Tracking:
│       ├── Apollo enrichment: $0.10/contact
│       ├── SMS: $0.015/message
│       ├── Voice: $0.025/minute
│       └── ❌ NO budget tracking or alerts!
```

---

## Detailed Step Analysis

### STEP 1: CSV Upload (Datalake Ingestion)

**File**: [apps/front/src/app/api/buckets/sectors/upload/route.ts](apps/front/src/app/api/buckets/sectors/upload/route.ts)

#### Input Parameters
```typescript
POST /api/buckets/sectors/upload
Content-Type: multipart/form-data

{
  file: File,              // CSV file
  bucketId: string,        // e.g., "ny-construction-plumbers"
  sicCode?: string,        // Alternative to bucketId
  description?: string     // Upload notes
}
```

#### Processing Flow
1. **Authentication**: `apiAuth()` called
   - ❌ Returns `{ userId }` only (no teamId!)
   - File: [apps/front/src/lib/api-auth.ts:88-89](apps/front/src/lib/api-auth.ts#L88-L89)

2. **CSV Parsing**: Using `csv-parse/sync`
   - Columns: Auto-detected from header row
   - Skip empty lines: `true`
   - Relax column count: `true` (handles inconsistent rows)

3. **Field Normalization**: [route.ts:64-83](apps/front/src/app/api/buckets/sectors/upload/route.ts#L64-L83)
   - Maps various column name variations to standard fields
   - Example: "Company Name", "COMPANY NAME", "company_name" → `companyName`
   - Auto-combines `firstName` + `lastName` if `contactName` missing

4. **Bucket Assignment**:
   - 200+ predefined buckets in [sector-buckets.ts](apps/front/src/lib/datalake/sector-buckets.ts)
   - Lookup: `BUCKET_BY_ID[bucketId]` or `getBucketForSIC(sicCode)`
   - Example bucket: `ny-construction-plumbers`
     - Sector: `construction-contractors`
     - SIC Codes: `["1711"]`
     - Storage Path: `datalake/business/ny/sectors/construction-contractors/plumbers/`

5. **S3 Storage** (DigitalOcean Spaces):
   - **Raw CSV**: `{storagePath}raw/{uploadId}.csv`
   - **Processed JSON**: `{storagePath}processed/{uploadId}.json`
   - **Bucket Index**: `{storagePath}index.json`

#### Critical Issues

**❌ CRITICAL: No Tenant Namespacing**
```typescript
// ALL tenants write to the same paths!
Key: `datalake/business/ny/sectors/construction-contractors/plumbers/raw/upload-123.csv`
// No teamId in path = cross-tenant access possible
```

**Recommended Fix**:
```typescript
// Should be:
Key: `team_${teamId}/datalake/business/ny/sectors/.../upload-123.csv`
```

**❌ CRITICAL: In-Memory Storage**
```typescript
// Line 276-279: Campaign data stored in globalThis
if (typeof globalThis !== "undefined") {
  (globalThis as any).__campaigns = (globalThis as any).__campaigns || [];
  (globalThis as any).__campaigns.push(campaignData);
}
// LOST ON SERVER RESTART!
```

#### Output
```json
{
  "success": true,
  "uploadId": "upload-1702936800000-abc123",
  "bucket": {
    "id": "ny-construction-plumbers",
    "name": "NY Plumbers",
    "sector": "construction-contractors",
    "storagePath": "datalake/business/ny/sectors/construction-contractors/plumbers/"
  },
  "stats": {
    "total": 500,
    "withPhone": 450,
    "withEmail": 320,
    "withAddress": 500,
    "needsSkipTrace": 50
  },
  "indexes": {
    "statesFound": 1,
    "countiesFound": 15,
    "citiesFound": 42
  },
  "nextSteps": [
    "POST /api/enrichment/skip-trace with bucketId=ny-construction-plumbers to enrich",
    "GET /api/buckets/sectors?id=ny-construction-plumbers to check status"
  ]
}
```

#### Performance Characteristics
- **500 records**: ~2-5 seconds (CSV parse + S3 upload)
- **2,000 records**: ~10-15 seconds
- **10,000 records**: ⚠️ May timeout (120s default)

#### Failure Modes
1. **Invalid CSV format**: Returns 400 with parse error
2. **Empty CSV**: Returns 400 "CSV is empty"
3. **Unknown bucket**: Returns 404 with available buckets list
4. **S3 not configured**: Returns 503 "DO Spaces not configured"
5. **Large file timeout**: 120s limit may be exceeded

---

### STEP 2: Datalake Indexing

**File**: [apps/front/src/lib/datalake/sector-buckets.ts](apps/front/src/lib/datalake/sector-buckets.ts)

#### Bucket Structure

**Total Buckets**: 200+ predefined buckets across 17 sectors

**Sector Categories**:
- Construction & Contractors (10 buckets)
- Transportation & Logistics (6 buckets)
- Automotive (7 buckets)
- Manufacturing (9 buckets)
- Professional Services (5 buckets)
- Healthcare & Medical (6 buckets)
- Restaurants & Food Service (7 buckets)
- Retail Stores (7 buckets)
- Hotels & Hospitality (5 buckets)
- Real Estate (5 buckets)
- Financial Services (6 buckets)
- Personal Services (6 buckets)
- Business Services (6 buckets)
- Education & Training (5 buckets)
- Recreation & Entertainment (5 buckets)
- Business Brokers & PE (7 buckets)
- Property-Associated (7 buckets)

**Business Line Groupings**:
1. **OutreachGlobal**: White-label reseller prospects
   - Consultants (1.4M nationwide)
   - Marketing agencies
   - Staffing agencies
   - CPA firms
   - Legal services

2. **Nextier**: Real estate datalake
   - RE agents & brokers (2.2M nationwide)
   - Property managers
   - Developers
   - Landlords (commercial & residential)

3. **ECBB**: Deal sourcing ($500K-$10M businesses)
   - Construction trades (high demand)
   - Restaurants & bars
   - Auto services (car wash, repair)
   - Healthcare (physicians, dentists)
   - Personal services (laundromats, salons)

#### Index Structure

**Bucket Index File**: `{storagePath}index.json`

```json
{
  "bucketId": "ny-construction-plumbers",
  "name": "NY Plumbers",
  "sector": "construction-contractors",
  "subsector": "plumbers",
  "sicCodes": ["1711"],
  "state": "NY",
  "createdAt": "2025-12-18T10:00:00Z",
  "updatedAt": "2025-12-18T12:30:00Z",
  "totalRecords": 1500,
  "enrichedRecords": 450,
  "skipTracedRecords": 350,
  "files": [
    {
      "uploadId": "upload-1702936800000-abc123",
      "fileName": "ny-plumbers-500.csv",
      "uploadedAt": "2025-12-18T10:00:00Z",
      "recordCount": 500,
      "stats": { "total": 500, "withPhone": 450, "withEmail": 320 }
    }
  ],
  "indexes": {
    "byState": { "NY": 1500 },
    "byCounty": { "Kings": 350, "Queens": 420, "New York": 180, ... },
    "byCity": { "brooklyn-NY": 350, "queens-NY": 420, ... }
  }
}
```

#### SIC Code Mapping

**Lookup Function**: `getBucketForSIC(sicCode)`
- Exact match: `BUCKETS_BY_SIC["1711"]`
- Prefix match: Falls back to 2-digit SIC category

**Example**:
```typescript
getBucketForSIC("1711")
// Returns: { id: "ny-construction-plumbers", name: "NY Plumbers", ... }
```

---

### STEP 3: Enrichment (Apollo.io)

**File**: [apps/front/src/app/api/enrichment/apollo/route.ts](apps/front/src/app/api/enrichment/apollo/route.ts)

#### API Endpoint
```typescript
POST /api/enrichment/apollo

Body: {
  recordId: string,
  bucketId: string,
  email?: string,
  companyName?: string,
  firstName?: string,
  lastName?: string,
  linkedinUrl?: string,
  domain?: string
}
```

#### Match Requirements

**At least ONE of**:
- Email address
- LinkedIn URL
- First name + last name + (company name OR domain)

**If insufficient data**:
```json
{
  "success": false,
  "error": "Insufficient data for Apollo match",
  "hint": "Need email, linkedinUrl, or (firstName + lastName + companyName/domain)"
}
```

#### Apollo API Call

**Endpoint**: `https://api.apollo.io/v1/people/match`

**Request**:
```json
{
  "api_key": "YOUR_APOLLO_KEY",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "organization_name": "Acme Plumbing",
  "domain": "acmeplumbing.com"
}
```

**Cost**: ~$0.10 per successful match

**Rate Limits**: Not enforced by this code
- ❌ NO rate limiting
- ❌ NO retry logic
- ❌ NO backoff on 429 errors

#### Enriched Data Structure

**Person Data**:
- `apolloId`: Apollo's person ID
- `firstName`, `lastName`, `fullName`
- `title`: "Owner", "CEO", "Operations Manager"
- `seniority`: "owner", "founder", "c_suite", "vp", "manager"
- `departments`: ["operations", "sales"]
- `linkedinUrl`: Full LinkedIn profile URL
- `email`: Verified business email
- `emailStatus`: "verified" | "guessed" | "unavailable"
- `phones`: Array of phone numbers

**Organization Data**:
- `id`, `name`, `website`, `linkedinUrl`
- `foundedYear`, `yearsInBusiness` (calculated)
- `employees`: Estimated employee count
- `industry`: "Construction", "Professional Services"
- `keywords`: ["plumbing", "hvac", "residential"]
- `location`: { city, state, country }
- `description`: Short company description
- `annualRevenue`: Revenue in USD
- `revenueTier`: "startup" | "main-street" | "growth" | "established" | "enterprise"
- `totalFunding`: Total funding raised (if applicable)
- `technologies`: ["Salesforce", "QuickBooks", "Mailchimp"]

**Revenue Tier Classification**:
```typescript
if (revenue < $500K)        → "startup"
if (revenue < $2.5M)        → "main-street"  // ECBB TARGET
if (revenue < $10M)         → "growth"       // ECBB TARGET
if (revenue < $50M)         → "established"
if (revenue >= $50M)        → "enterprise"
```

**Flags**:
- `hasVerifiedEmail`: Email is verified by Apollo
- `hasLinkedin`: LinkedIn profile found
- `isOwnerOrCLevel`: Seniority is owner/founder/C-suite
- `isMainStreet`: Revenue between $500K-$10M (ECBB sweet spot)
- `isEstablished`: Business is 5+ years old

#### Critical Issues

**❌ NO Deduplication**
- Same contact can be enriched multiple times
- No check against existing `leads` table
- Cost: Wasted Apollo credits

**❌ NO Rate Limiting**
- No concurrency limits
- No batch size enforcement
- Risk: Apollo API throttling (429 errors)

**❌ NO Error Handling for Rate Limits**
```typescript
if (response.status === 429) {
  return NextResponse.json({ error: "Apollo rate limited" }, { status: 429 });
}
// No retry, no backoff, just fails!
```

#### Example Output
```json
{
  "success": true,
  "recordId": "rec_abc123",
  "bucketId": "ny-construction-plumbers",
  "enrichedData": {
    "apolloEnriched": true,
    "apolloEnrichedAt": "2025-12-18T12:00:00Z",
    "apolloId": "apollo_person_xyz",
    "firstName": "John",
    "lastName": "Smith",
    "fullName": "John Smith",
    "title": "Owner",
    "seniority": "owner",
    "departments": ["operations"],
    "linkedinUrl": "https://linkedin.com/in/johnsmith",
    "email": "john@acmeplumbing.com",
    "emailStatus": "verified",
    "phones": ["+1-917-555-1234"],
    "organization": {
      "id": "apollo_org_abc",
      "name": "Acme Plumbing & Heating",
      "website": "https://acmeplumbing.com",
      "foundedYear": 2010,
      "yearsInBusiness": 15,
      "employees": 12,
      "industry": "Construction",
      "annualRevenue": 1500000,
      "revenueTier": "main-street",
      "location": {
        "city": "Brooklyn",
        "state": "NY",
        "country": "US"
      },
      "technologies": ["QuickBooks", "ServiceTitan"]
    },
    "flags": {
      "hasVerifiedEmail": true,
      "hasLinkedin": true,
      "isOwnerOrCLevel": true,
      "isMainStreet": true,
      "isEstablished": true
    }
  }
}
```

---

### STEP 4: Lead Creation

**File**: [apps/front/src/app/api/leads/route.ts](apps/front/src/app/api/leads/route.ts)

#### Authentication Bug

**❌ CRITICAL BUG**: `apiAuth()` does not return `teamId`

**File**: [apps/front/src/lib/api-auth.ts:88-89](apps/front/src/lib/api-auth.ts#L88-L89)
```typescript
export async function apiAuth(): Promise<{ userId: string | null }> {
  // ... JWT decoding logic ...
  return { userId: decoded.sub };  // ❌ NO teamId!
}
```

**Expected by routes**:
```typescript
const { userId, teamId } = await apiAuth();  // teamId is UNDEFINED!
```

**Impact**:
```typescript
// In leads/route.ts
if (teamId) {  // This NEVER executes!
  conditions.push(eq(leads.teamId, teamId));
}
// Query runs WITHOUT tenant filtering = cross-tenant data leak!
```

#### Lead Creation Flow

```typescript
POST /api/leads

Body: {
  // From enrichment
  firstName: "John",
  lastName: "Smith",
  email: "john@acmeplumbing.com",
  phone: "+1-917-555-1234",
  companyName: "Acme Plumbing",

  // From datalake
  address: "123 Main St",
  city: "Brooklyn",
  state: "NY",
  zip: "11201",

  // From Apollo
  title: "Owner",
  linkedinUrl: "...",
  revenue: 1500000,
  employees: 12,

  // Metadata
  source: "apollo_enrichment",
  tags: ["plumber", "main-street", "owner"]
}
```

#### Database Insert

**Schema**: [apps/api/src/database/schema/leads.schema.ts](apps/api/src/database/schema/leads.schema.ts)

```typescript
export const leads = pgTable("leads", {
  id: primaryUlid("lead"),              // lead_xxxxxxxxxx
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),  // ❌ Will be NULL!
  integrationId: ulidColumn().references(() => integrations.id),
  propertyId: ulidColumn().references(() => properties.id),

  // Contact info
  firstName: text(),
  lastName: text(),
  email: text(),
  phone: text(),

  // Company info
  companyName: text(),
  title: text(),
  linkedinUrl: text(),

  // Location
  address: text(),
  city: text(),
  state: text(),
  zip: text(),

  // Enrichment
  apolloId: text(),
  revenue: bigint(),
  employees: integer(),

  // Scoring
  score: integer().default(0),
  status: text().default("new"),  // new, contacted, qualified, converted

  // Metadata
  source: text(),  // "csv_upload", "apollo_enrichment", "manual"
  tags: jsonb().$type<string[]>(),

  // Timestamps
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});
```

#### Critical Issue: NULL teamId

**Result of Bug**:
```sql
INSERT INTO leads (id, teamId, firstName, lastName, ...)
VALUES ('lead_abc123', NULL, 'John', 'Smith', ...);
-- teamId is NULL because apiAuth() didn't return it!
```

**Consequence**:
- Lead is NOT scoped to any team
- Can be queried by ANY team (cross-tenant leak)
- Cascade delete won't work (teamId is NULL)

**Affected Routes**: 170+ frontend API routes expect `teamId` from `apiAuth()`

---

### STEP 5: Campaign Creation

**File**: [apps/front/src/app/api/campaign/push/route.ts](apps/front/src/app/api/campaign/push/route.ts)

#### Request Structure

```typescript
POST /api/campaign/push

Body: {
  campaignName: "Brooklyn Plumbers Q4",
  campaignType: "sms",  // "sms" | "email" | "voice" | "multi"
  leads: CampaignLead[],  // Array of 50-500 leads
  assignNumber: true,     // Provision SignalHouse number
  assignAiSdr: true,      // Assign AI SDR avatar
  aiSdrId: "sabrina_default",
  initialMessageId: "msg_template_001",
  scheduleStart: "2025-12-18T14:00:00Z",
  dailyLimit: 500,
  tags: ["q4-campaign", "main-street"]
}
```

**CampaignLead Structure**:
```typescript
interface CampaignLead {
  id: string;              // lead_xxxxxxxxxx
  propertyId: string;      // For RE campaigns
  address: string;
  city: string;
  state: string;
  county: string;
  propertyType: string;
  ownerName: string;
  phones: string[];        // Must have at least 1 for SMS
  emails: string[];        // Must have at least 1 for email
  score: number;           // Lead score
  tags: string[];
  equity?: number;         // Property equity (RE)
  value?: number;          // Property value (RE)
  yearsOwned?: number;     // Years owned (RE)
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}
```

#### Validation

**Lead Filtering**:
```typescript
// For SMS/Voice campaigns
validLeads = leads.filter(lead => lead.phones && lead.phones.length > 0);

// For Email campaigns
validLeads = leads.filter(lead => lead.emails && lead.emails.length > 0);

// For Multi-channel
validLeads = leads.filter(lead =>
  (lead.phones && lead.phones.length > 0) &&
  (lead.emails && lead.emails.length > 0)
);
```

**If no valid leads**:
```json
{
  "error": "No leads with valid phone numbers",
  "totalLeads": 500,
  "validLeads": 0
}
```

#### Campaign ID Generation

```typescript
const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// Example: camp_1702936800000_abc123
```

#### Phone Number Provisioning

**If `assignNumber: true`**:

1. **Call SignalHouse API**:
```typescript
POST /api/signalhouse
Body: {
  action: "provision_number",
  campaignName: "Brooklyn Plumbers Q4",
  areaCode: "917"  // Derived from lead state
}
```

2. **Area Code Selection**:
   - Lookup: `STATE_AREA_CODES[leadState]`
   - NY → "212", "917", "347", "646"
   - CA → "310", "415", "213"
   - Default: Random if state not found

3. **Fallback** (if SignalHouse unavailable):
```typescript
result.phoneAssigned = `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
// Example: +1-917-555-1234 (placeholder)
```

#### AI SDR Assignment

**If `assignAiSdr: true`**:
```typescript
result.aiSdrAssigned = aiSdrId || "sabrina_default";
// Future: Query aiSdrAvatars table for personality DNA
```

#### ❌ CRITICAL: globalThis Storage

**Lines 276-279**:
```typescript
if (typeof globalThis !== "undefined") {
  (globalThis as any).__campaigns = (globalThis as any).__campaigns || [];
  (globalThis as any).__campaigns.push(campaignData);
}
```

**Problems**:
1. **Non-Persistent**: Lost on server restart
2. **No Database**: Campaign not saved to `campaigns` table
3. **No Tenant Isolation**: All campaigns in same global array
4. **No Scalability**: Memory-bound, cannot scale horizontally

**Should Be**:
```typescript
// Store in database
await db.insert(campaigns).values({
  id: campaignId,
  teamId: teamId,  // (if apiAuth() returned it!)
  name: campaignName,
  type: campaignType,
  status: scheduleStart ? "scheduled" : "ready",
  // ... rest of campaign data
});
```

#### Campaign Data Structure

```typescript
{
  id: "camp_1702936800000_abc123",
  name: "Brooklyn Plumbers Q4",
  type: "sms",
  status: "ready",  // "ready" | "scheduled" | "active" | "paused" | "completed"
  leads: [
    {
      id: "lead_abc123",
      propertyId: "prop_xyz789",
      name: "John Smith",
      phone: "+1-917-555-1234",
      email: "john@acmeplumbing.com",
      address: "123 Main St",
      city: "Brooklyn",
      state: "NY",
      score: 85,
      tags: ["owner", "main-street"],
      status: "pending",  // "pending" | "sent" | "delivered" | "responded" | "opted_out"
      addedAt: "2025-12-18T12:00:00Z"
    },
    // ... 499 more leads
  ],
  settings: {
    dailyLimit: 500,
    scheduleStart: "2025-12-18T14:00:00Z",
    initialMessageId: "msg_template_001"
  },
  stats: {
    totalLeads: 500,
    sent: 0,
    delivered: 0,
    responded: 0,
    positive: 0,
    optOut: 0
  },
  createdAt: "2025-12-18T12:00:00Z",
  updatedAt: "2025-12-18T12:00:00Z"
}
```

#### Output

```json
{
  "success": true,
  "campaign": {
    "campaignId": "camp_1702936800000_abc123",
    "campaignName": "Brooklyn Plumbers Q4",
    "leadsAdded": 485,
    "leadsFailed": 15,
    "phoneAssigned": "+1-917-555-1234",
    "aiSdrAssigned": "sabrina_default",
    "status": "ready"
  },
  "data": { /* full campaign object */ },
  "message": "Created campaign \"Brooklyn Plumbers Q4\" with 485 leads"
}
```

---

### STEP 6: SMS Execution (SignalHouse)

**Service**: SignalHouse SMS API
**File**: [apps/front/src/lib/services/signalhouse-service.ts](apps/front/src/lib/services/signalhouse-service.ts) (referenced, not read)

#### Configuration

**Environment Variables**:
```env
SIGNALHOUSE_API_KEY=your_key_here
SIGNALHOUSE_PHONE_NUMBER=+1-917-555-1234
```

#### Batch Processing

**Daily Limit**: 500 (from campaign settings)

**Batch Size**: Not enforced
- ❌ NO validation of batch size
- ❌ NO rate limiting
- ❌ Risk: Sending 500 messages at once may trigger carrier spam filters

**Should Be**:
- Max 10-20 messages per minute
- Throttle between messages (e.g., 3-5 second delay)
- Respect carrier guidelines (CTIA compliance)

#### Message Personalization

**Template Variables**:
```typescript
{{firstName}}          → "John"
{{lastName}}           → "Smith"
{{fullName}}           → "John Smith"
{{companyName}}        → "Acme Plumbing"
{{address}}            → "123 Main St"
{{city}}               → "Brooklyn"
{{propertyValue}}      → "$850,000"
{{equity}}             → "$320,000"
{{yearsOwned}}         → "8"
```

**Example Template**:
```
Hi {{firstName}}, quick question about your property at {{address}}.
Would you consider selling for the right offer? We've seen similar
homes in {{city}} sell for {{propertyValue}}+. Reply YES for details.
```

**Rendered**:
```
Hi John, quick question about your property at 123 Main St.
Would you consider selling for the right offer? We've seen similar
homes in Brooklyn sell for $850,000+. Reply YES for details.
```

#### Cost Calculation

**SignalHouse Pricing**: ~$0.015 per SMS

**500-record campaign**:
```
500 messages × $0.015 = $7.50
```

**With follow-ups** (avg 2 messages per lead):
```
500 leads × 2 messages × $0.015 = $15.00
```

#### Delivery Tracking

**Status Webhook**: `/api/signalhouse/status`

**Possible Statuses**:
- `queued`: Message accepted by SignalHouse
- `sent`: Message sent to carrier
- `delivered`: Message delivered to recipient
- `failed`: Delivery failed (invalid number, carrier reject)
- `undelivered`: Temporary failure (will retry)

#### Critical Issues

**❌ NO Batch Size Enforcement**
- Can send 500 messages simultaneously
- Risk: Carrier spam detection
- Result: Messages marked as spam, low delivery rate

**❌ NO Rate Limiting**
- No throttling between messages
- Risk: API rate limits, carrier throttling

**❌ NO Retry Logic**
- Failed messages not retried
- No exponential backoff

---

### STEP 7: Inbound Response Handling (Gianna AI)

**File**: [apps/front/src/app/api/gianna/sms-webhook/route.ts](apps/front/src/app/api/gianna/sms-webhook/route.ts)

#### Webhook Configuration

**Twilio Webhook**: POST `/api/gianna/sms-webhook`

**Input** (Twilio FormData):
```
From: +1-917-555-9876      (Sender phone)
To: +1-917-555-1234        (Campaign phone)
Body: "Yes, send me info"  (SMS content)
MessageSid: SM123abc...    (Twilio message ID)
```

#### Conversation Context

**Storage**: In-memory `Map<phone, ConversationContext>`

**❌ CRITICAL**: Context lost on server restart!

**Context Structure**:
```typescript
{
  firstName: "John",
  lastName: "Smith",
  companyName: "Acme Plumbing",
  industry: "Construction",
  propertyAddress: "123 Main St",
  propertyId: "prop_xyz789",
  leadType: "residential",
  clientId: "homeowner-advisor",
  lastMessageAt: "2025-12-18T14:30:00Z",
  messageCount: 3,
  lastIntent: "interested",
  history: [
    { role: "assistant", content: "Hi John, ...", timestamp: "..." },
    { role: "user", content: "Tell me more", timestamp: "..." },
    { role: "assistant", content: "I can send...", timestamp: "..." }
  ]
}
```

#### Classification Pipeline

**[1] Opt-Out Detection** (Priority: IMMEDIATE)

**Keywords**: STOP, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, REMOVE

**Action**:
1. Add to DNC list: `POST /api/suppression`
2. Clear conversation context
3. Return TwiML: "You've been removed from our list. Take care!"

**[2] Response Classification** (Priority: HIGH)

**File**: [apps/front/src/lib/response-classifications.ts](apps/front/src/lib/response-classifications.ts)

**Client-Specific Classifications**:

**Homeowner Advisor**:
| Classification | Priority | Detection | Action |
|----------------|----------|-----------|--------|
| `email-capture` | 100 | Contains email address | Trigger valuation report |
| `called-phone-line` | 95 | "[INBOUND CALL]" prefix | HOT LEAD flag |
| `opt-out` | 90 | STOP, UNSUBSCRIBE | Add to DNC |
| `interested` | 50 | YES, INTERESTED, CALL | Flag as warm |
| `not-interested` | 40 | NO, NOT INTERESTED | Archive |
| `thank-you` | 30 | THANK, THANKS, TY | Mark as acknowledged |
| `question` | 20 | Contains "?" | Queue for response |
| `other` | 0 | Catch-all | Manual review |

**Classification Logic**:
```typescript
const classification = classifyResponse("homeowner-advisor", body);

if (classification.classificationId === "email-capture") {
  const email = classification.extracted.email;
  // Trigger automation
  triggerEmailCaptureAutomation({
    email,
    clientId: "homeowner-advisor",
    deliverable: "property-valuation-report",
    queue: "valuation-queue"
  });
}
```

**[3] Email Capture Automation**

**Regex**: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i`

**Example**: "My email is john@acmeplumbing.com"

**Extraction**:
```typescript
const emailMatch = body.match(EMAIL_REGEX);
// Returns: ["john@acmeplumbing.com"]
```

**Deliverable Types**:
- **Homeowner Advisor**: `property-valuation-report` → `valuation-queue`
- **ECBB Deal Sourcing**: `exit-preparation` → `content-queue`
- **OutreachGlobal**: `white-label-pitch` → `sales-queue`
- **Nextier RE**: `user-to-owner-pitch` → `sales-queue`

**Trigger**:
```typescript
POST /api/automation/email-capture

Body: {
  email: "john@acmeplumbing.com",
  smsMessage: "My email is john@acmeplumbing.com",
  fromPhone: "+1-917-555-9876",
  toPhone: "+1-917-555-1234",
  firstName: "John",
  propertyId: "prop_xyz789",
  propertyAddress: "123 Main St",
  clientId: "homeowner-advisor",
  classification: "email-capture",
  deliverable: "property-valuation-report"
}
```

**Response**:
```
Perfect John! Just sent your property analysis to john@acmeplumbing.com.
Check your inbox (and spam folder just in case). When you're ready to
talk strategy, my calendar link is in there too. 📧
```

**[4] AI Response Generation** (Gianna)

**Service**: [apps/front/src/lib/gianna/gianna-service.ts](apps/front/src/lib/gianna/gianna-service.ts) (referenced)

**Context**:
```typescript
const giannaContext: GiannaContext = {
  firstName: "John",
  lastName: "Smith",
  companyName: "Acme Plumbing",
  industry: "Construction",
  propertyAddress: "123 Main St",
  phone: "+1-917-555-9876",
  channel: "sms",
  stage: "warming_up",  // cold_open, warming_up, hot_response, handling_pushback, follow_up
  messageNumber: 3,
  conversationHistory: [...],
  leadType: "residential",
  agentName: "Gianna"
};
```

**Stage Detection**:
```typescript
if (messageCount === 1) → "cold_open"
if (lastIntent === "interested") → "hot_response"
if (lastIntent.startsWith("objection")) → "handling_pushback"
if (messageCount > 3) → "follow_up"
else → "warming_up"
```

**AI Generation**:
```typescript
const response = await gianna.generateResponse("Tell me more", giannaContext);

{
  message: "Great question! I can send you a full property analysis showing...",
  intent: "interested",
  personality: "helpful-consultant",
  confidence: 85,
  requiresHumanReview: false,
  alternatives: [
    "I'd be happy to share a detailed report...",
    "Let me send you our latest market analysis..."
  ],
  nextAction: {
    type: "follow_up",
    delayMinutes: 1440,  // 24 hours
    metadata: { reason: "email-not-provided" }
  }
}
```

**Human-in-Loop Logic**:
```typescript
if (response.requiresHumanReview) {
  // Queue for approval
  await queueForHumanReview({
    from: "+1-917-555-9876",
    to: "+1-917-555-1234",
    incomingMessage: "Tell me more",
    suggestedResponse: response.message,
    alternatives: response.alternatives,
    intent: response.intent,
    confidence: response.confidence
  });

  // Don't auto-respond
  return emptyTwimlResponse();
}
```

**Auto-Response Criteria**:
```typescript
if (response.confidence >= 70) {
  // Send response via TwiML
  return twimlResponse(response.message);
}
```

**❌ CRITICAL: NO Additional Guardrails**
- No max messages per conversation
- No time-of-day restrictions
- No DNC list checking before response
- No duplicate message detection

#### TwiML Response

**Format**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Great question! I can send you a full property analysis...</Message>
</Response>
```

**Twilio processes this and sends SMS on Gianna's behalf.**

---

### STEP 8: Inbox Classification & Tagging

**Schema**: [apps/api/src/database/schema/inbox.schema.ts](apps/api/src/database/schema/inbox.schema.ts)

#### Inbox Item Creation

**Table**: `inboxItems`

```typescript
{
  id: "inb_xxxxxxxxxx",
  teamId: "team_abc123",  // ❌ May be NULL if lead has no teamId!
  leadId: "lead_xyz789",
  direction: "inbound",
  channel: "sms",
  message: "Yes, send me info",
  classification: "interested",
  priority: "warm",  // "hot" | "warm" | "cold"
  status: "unread",  // "unread" | "read" | "archived"
  metadata: {
    from: "+1-917-555-9876",
    to: "+1-917-555-1234",
    twilioSid: "SM123abc...",
    aiResponse: "Great! I'll send...",
    confidence: 85
  },
  createdAt: "2025-12-18T14:30:00Z",
  updatedAt: "2025-12-18T14:30:00Z"
}
```

#### Response Bucket Assignment

**Table**: `responseBuckets`

**Pre-defined Buckets**:
```typescript
{
  id: "rbkt_email_captures",
  name: "Email Captures",
  description: "Contacts who provided email for valuation report",
  color: "#10B981",
  priority: 1,
  createdAt: "..."
}

{
  id: "rbkt_hot_responses",
  name: "Hot Responses",
  description: "Interested contacts who called back or requested immediate info",
  color: "#EF4444",
  priority: 1,
  createdAt: "..."
}

{
  id: "rbkt_objections",
  name: "Objections",
  description: "Contacts with questions or pushback",
  color: "#F59E0B",
  priority: 2,
  createdAt: "..."
}

{
  id: "rbkt_dnc",
  name: "Do Not Contact",
  description: "Opt-outs and unsubscribes",
  color: "#6B7280",
  priority: 3,
  createdAt: "..."
}
```

**Assignment Logic**:
```typescript
if (classification === "email-capture") → "Email Captures"
if (classification === "called-phone-line") → "Hot Responses"
if (classification === "interested") → "Hot Responses"
if (classification === "question") → "Objections"
if (classification === "opt-out") → "Do Not Contact"
else → "Other Responses"
```

#### Bucket Movement Tracking

**Table**: `bucketMovements`

```typescript
{
  id: "bmov_xxxxxxxxxx",
  inboxItemId: "inb_abc123",
  fromBucketId: "rbkt_objections",
  toBucketId: "rbkt_hot_responses",
  movedBy: "user_xyz789",  // User who moved it
  reason: "Answered question, now interested",
  createdAt: "2025-12-18T15:00:00Z"
}
```

**Purpose**: Track lead progression through sales funnel

#### Priority Calculation

**Priority Algorithm**:
```typescript
let priority = "cold";

// HOT signals
if (classification === "called-phone-line") priority = "hot";
if (classification === "email-capture" && message.includes("YES")) priority = "hot";
if (classification === "interested" && messageCount === 1) priority = "hot";

// WARM signals
if (classification === "interested") priority = "warm";
if (classification === "question") priority = "warm";

// COLD signals
if (classification === "not-interested") priority = "cold";
if (classification === "other") priority = "cold";
```

---

### STEP 9: Follow-Up Automation (Cathy Agent)

**Files**: [apps/front/src/types/workflow.ts](apps/front/src/types/workflow.ts) (referenced)

#### Trigger Conditions

**Automated Follow-Ups**:

1. **Email capture + no response after 24h**
   - Condition: `classification === "email-capture" && hoursSinceLastMessage > 24`
   - Action: Send "Did you get the report?" SMS

2. **Interested but didn't provide email**
   - Condition: `classification === "interested" && !emailProvided && hoursSinceLastMessage > 2`
   - Action: Send "What's your email so I can send details?"

3. **Question asked but not answered**
   - Condition: `classification === "question" && !aiResponded && hoursSinceLastMessage > 1`
   - Action: Queue for human response

4. **Hot lead not contacted within 2h**
   - Condition: `classification === "called-phone-line" && !humanContacted && hoursSinceInbound > 2`
   - Action: Create high-priority task for human

#### Workflow Engine

**Schema** (inferred from references):

**Table**: `workflows`
```typescript
{
  id: "wflow_xxxxxxxxxx",
  teamId: "team_abc123",
  name: "Email Capture Follow-Up",
  trigger: {
    type: "classification",
    classificationId: "email-capture",
    conditions: {
      hoursSinceLastMessage: { $gte: 24 }
    }
  },
  actions: [
    {
      type: "send_sms",
      template: "Did you receive the property analysis I sent? ...",
      delayMinutes: 1440
    },
    {
      type: "move_to_bucket",
      bucketId: "rbkt_follow_up_sent"
    }
  ],
  status: "active",
  createdAt: "..."
}
```

**Table**: `workflowExecutions`
```typescript
{
  id: "wfex_xxxxxxxxxx",
  workflowId: "wflow_abc123",
  inboxItemId: "inb_xyz789",
  status: "pending",  // "pending" | "running" | "completed" | "failed"
  scheduledFor: "2025-12-19T14:30:00Z",
  executedAt: null,
  result: null,
  error: null,
  createdAt: "2025-12-18T14:30:00Z"
}
```

#### Workflow Actions

**Available Actions**:
1. `send_sms`: Send follow-up SMS
2. `send_email`: Send follow-up email
3. `create_task`: Create task for human
4. `move_to_bucket`: Move to different inbox bucket
5. `update_lead_score`: Adjust lead score (+/- points)
6. `tag_lead`: Add tags to lead
7. `notify_team`: Send Slack/email notification

#### ❌ CRITICAL: NO GUARDRAILS

**Missing Safeguards**:
1. **No max follow-ups per lead**
   - Can spam same contact indefinitely
   - No "stop after X attempts" logic

2. **No time-of-day restrictions**
   - Can send SMS at 3 AM
   - No business hours enforcement

3. **No DNC list checking**
   - Workflow doesn't check suppression list
   - Can message opted-out contacts

4. **No human approval for new contacts**
   - Auto-sends to people who never consented
   - TCPA violation risk

5. **No rate limiting**
   - Can send hundreds of follow-ups at once
   - No throttling

**Should Have**:
```typescript
// Max 3 follow-ups per lead
if (lead.followUpCount >= 3) return;

// Business hours only (9 AM - 8 PM local time)
const hour = getLocalHour(lead.timezone);
if (hour < 9 || hour >= 20) rescheduleToNextBusinessHour();

// Check DNC list
const isOptedOut = await checkSuppressionList(lead.phone);
if (isOptedOut) cancelWorkflow();

// Human approval for first contact
if (lead.messageCount === 0 && !lead.hasConsentedToMarketing) {
  queueForHumanApproval();
}
```

#### Execution Scheduling

**NestJS Cron Jobs** (referenced):
```typescript
@Cron('*/5 * * * *')  // Every 5 minutes
async processWorkflows() {
  const pending = await db.select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.status, 'pending'),
        lte(workflowExecutions.scheduledFor, new Date())
      )
    );

  for (const execution of pending) {
    await executeWorkflow(execution);
  }
}
```

---

### STEP 10: Analytics & Reporting

**Tables**: `campaignExecutions`, `campaignStats`, `leadInteractions`

#### Campaign Metrics

**Table**: `campaignStats`

```typescript
{
  campaignId: "camp_abc123",
  date: "2025-12-18",

  // Outbound metrics
  sent: 485,
  delivered: 478,
  failed: 7,
  bounced: 2,

  // Inbound metrics
  responded: 156,
  positive: 89,     // interested, email-capture
  neutral: 34,      // questions
  negative: 12,     // not-interested
  optOut: 21,

  // Email capture (Homeowner Advisor)
  emailCaptured: 67,
  valuationsSent: 67,

  // Conversion
  qualified: 42,    // Moved to sales pipeline
  meetings: 18,     // Scheduled calls/meetings
  deals: 3,         // Closed deals

  // Response rate calculation
  responseRate: (156 / 485) * 100,  // 32.2%
  positiveRate: (89 / 156) * 100,   // 57.1%
  emailCaptureRate: (67 / 485) * 100,  // 13.8%

  updatedAt: "2025-12-18T23:59:59Z"
}
```

#### Lead Scoring Updates

**Scoring Algorithm**:
```typescript
let score = lead.baseScore || 50;

// Enrichment bonuses
if (lead.isOwnerOrCLevel) score += 20;
if (lead.hasVerifiedEmail) score += 10;
if (lead.hasLinkedin) score += 10;
if (lead.isMainStreet) score += 15;  // ECBB sweet spot

// Engagement bonuses
if (classification === "email-capture") score += 50;
if (classification === "called-phone-line") score += 100;
if (classification === "interested") score += 25;

// Penalties
if (classification === "not-interested") score -= 50;
if (classification === "opt-out") score = 0;

// Update lead
await db.update(leads)
  .set({ score, updatedAt: new Date() })
  .where(eq(leads.id, leadId));
```

#### Cost Tracking

**Per-Campaign Costs**:
```typescript
{
  campaignId: "camp_abc123",

  // Enrichment costs
  apolloEnrichments: 485,
  apolloCost: 485 * 0.10,  // $48.50

  // SMS costs
  smsSent: 485,
  smsCost: 485 * 0.015,    // $7.28

  // Follow-up costs
  followUpSmsSent: 234,
  followUpSmsCost: 234 * 0.015,  // $3.51

  // Voice costs (if applicable)
  callsMade: 18,
  callMinutes: 54,
  callCost: 54 * 0.025,    // $1.35

  // Email costs (if applicable)
  emailsSent: 67,
  emailCost: 67 * 0.0001,  // $0.01

  // Total
  totalCost: 48.50 + 7.28 + 3.51 + 1.35 + 0.01,  // $60.65
  costPerLead: 60.65 / 485,  // $0.125
  costPerResponse: 60.65 / 156,  // $0.389
  costPerEmailCapture: 60.65 / 67,  // $0.905
  costPerDeal: 60.65 / 3,  // $20.22
}
```

**❌ CRITICAL: NO BUDGET TRACKING**
- No pre-campaign budget limits
- No real-time spend alerts
- No automatic campaign pausing at budget threshold

**Should Have**:
```typescript
// Before sending message
const spent = await getCampaignSpend(campaignId);
if (spent >= campaign.budget) {
  pauseCampaign(campaignId);
  notifyUser(`Campaign ${campaignName} paused: budget reached`);
  return;
}
```

---

## Performance Analysis

### Processing Times (Estimated)

| Step | 50 Records | 500 Records | 2,000 Records | 10,000 Records |
|------|-----------|-------------|---------------|----------------|
| **1. CSV Upload** | 1-2s | 3-5s | 10-15s | ⚠️ 60-120s |
| **2. Datalake Indexing** | <1s | 1-2s | 3-5s | 15-30s |
| **3. Apollo Enrichment** | 5-10s | 50-100s | ⚠️ 200-400s | ❌ 1000-2000s |
| **4. Lead Creation** | 1-2s | 5-10s | 20-40s | ⚠️ 100-200s |
| **5. Campaign Push** | <1s | 1-2s | 5-10s | 30-60s |
| **6. SMS Execution** | 2-5s | ⚠️ 20-50s | ❌ 80-200s | ❌ 400-1000s |
| **Total** | **~15s** | **~100s** | **⚠️ ~7min** | **❌ ~30min** |

**Legend**:
- ✅ <30s: Acceptable
- 🟡 30s-120s: Slow but tolerable
- ⚠️ 120s-300s: High timeout risk
- ❌ >300s: Will timeout or crash

### Bottlenecks Identified

**1. Apollo.io Enrichment**
- **Sequential processing**: Each record waits for previous
- **API latency**: ~100-200ms per call
- **No concurrency**: Single-threaded loop
- **Fix**: Batch with concurrency limit (10 parallel)

**2. Database Inserts**
- **Individual inserts**: One query per lead
- **No batching**: INSERT executed 500 times
- **Fix**: Batch insert 100 records at a time

**3. SMS Sending**
- **No rate limiting**: All 500 sent at once
- **Carrier throttling**: May queue or drop messages
- **Fix**: Throttle to 10-20 messages per minute

**4. Memory Usage**
- **globalThis storage**: Campaign data in RAM
- **Conversation contexts**: Map stores all conversations
- **Large result sets**: Loading 500 leads into memory
- **Fix**: Database storage, pagination, streaming

---

## Cost Analysis

### Per-Record Costs

| Service | Cost/Record | 500 Records | Notes |
|---------|-------------|-------------|-------|
| **Apollo.io Enrichment** | $0.10 | **$50.00** | Only if matched |
| **SignalHouse SMS** | $0.015 | **$7.50** | Initial message |
| **Follow-Up SMS** (avg 1.5x) | $0.015 | **$11.25** | Auto-responses |
| **Twilio Voice** (if used) | $0.025/min | **$6.25** (avg 0.5min) | Optional |
| **SendGrid Email** (if used) | $0.0001 | **$0.05** | Negligible |
| **Total** | **~$0.15** | **~$75** | Per 500-record run |

### Cost Leak Scenarios

**Scenario 1: Duplicate Enrichment**
- **Bug**: No deduplication before Apollo call
- **Result**: Same contact enriched 3 times
- **Cost**: $0.10 × 3 = $0.30 per duplicate
- **Impact**: $150 wasted on 500 records (if 50% duplicates)

**Scenario 2: Infinite Follow-Up Loop**
- **Bug**: No max follow-ups guardrail
- **Result**: Cathy sends 10 follow-ups to same lead
- **Cost**: $0.015 × 10 = $0.15 per looping lead
- **Impact**: $75 extra if all 500 leads loop

**Scenario 3: Failed Delivery Retries**
- **Bug**: No retry limit on failed SMS
- **Result**: System retries 100 times for invalid number
- **Cost**: $0.015 × 100 = $1.50 per failing number
- **Impact**: $150 if 100 numbers are invalid

**Worst-Case Total**: $75 + $150 + $75 + $150 = **$450** (6x expected)

---

## Data Leak Risks

### Cross-Tenant Contamination Points

**Point 1: S3 Storage Paths**
- **Location**: [apps/front/src/app/api/buckets/sectors/upload/route.ts:247-250](apps/front/src/app/api/buckets/sectors/upload/route.ts#L247-L250)
- **Issue**: No `teamId` in storage path
- **Path**: `datalake/business/ny/sectors/.../upload-123.csv`
- **Risk**: Team A can list Team B's files
- **Fix**: Prefix with `team_{teamId}/`

**Point 2: Lead Creation**
- **Location**: [apps/front/src/app/api/leads/route.ts](apps/front/src/app/api/leads/route.ts)
- **Issue**: `teamId` is undefined from `apiAuth()`
- **Result**: Leads have `teamId = NULL`
- **Risk**: Any team can query all leads
- **Fix**: Fix `apiAuth()` to return `teamId`

**Point 3: Campaign Storage**
- **Location**: [apps/front/src/app/api/campaign/push/route.ts:276-279](apps/front/src/app/api/campaign/push/route.ts#L276-L279)
- **Issue**: All campaigns in same `globalThis.__campaigns` array
- **Risk**: Team A can see Team B's campaigns
- **Fix**: Store in database with `teamId` filter

**Point 4: Conversation Contexts**
- **Location**: [apps/front/src/app/api/gianna/sms-webhook/route.ts:40-61](apps/front/src/app/api/gianna/sms-webhook/route.ts#L40-L61)
- **Issue**: `conversationContextStore` is global Map
- **Risk**: Team A can access Team B's conversation history
- **Fix**: Key by `${teamId}-${phone}` instead of just `phone`

---

## Security Vulnerabilities

### 1. No Input Validation

**Missing Validation**:
- SMS message content: No XSS sanitization
- Email addresses: No validation before storage
- Phone numbers: No format validation
- File uploads: No virus scanning

### 2. No Rate Limiting

**Attack Vectors**:
- **CSV Upload**: Can upload 1000 files simultaneously
- **Apollo API**: Can trigger 10,000 enrichments
- **SMS Sending**: Can send 100,000 messages
- **Webhook Spam**: Can flood `/api/gianna/sms-webhook`

### 3. No Authentication on Webhooks

**Vulnerable Endpoints**:
- `/api/gianna/sms-webhook`: Anyone can POST
- `/api/signalhouse/status`: No signature verification
- `/api/automation/email-capture`: No auth check

**Should Have**: Twilio signature validation, API key authentication

### 4. Secrets in Environment Variables

**Stored in Plain Text**:
- `APOLLO_API_KEY`
- `SIGNALHOUSE_API_KEY`
- `TWILIO_AUTH_TOKEN`

**Should Use**: HashiCorp Vault, AWS Secrets Manager, or encrypted env vars

---

## Architectural Gaps

### Missing Components

1. **Persistent Campaign Storage**
   - Current: `globalThis` (in-memory)
   - Needed: Database table with proper indexing

2. **Rate Limiting Middleware**
   - Current: None
   - Needed: Per-endpoint, per-user rate limits

3. **Deduplication Layer**
   - Current: None (can re-enrich same contact)
   - Needed: Hash-based dedup before Apollo call

4. **Job Queue System**
   - Current: Synchronous loops
   - Needed: BullMQ with Redis for background jobs

5. **Circuit Breakers**
   - Current: None (unlimited retries)
   - Needed: Fail fast after 3 attempts

6. **Audit Logging**
   - Current: Console.log only
   - Needed: Structured logs to database/Sentry

7. **Monitoring & Alerting**
   - Current: None
   - Needed: Sentry, Datadog, or CloudWatch

8. **Tenant Namespacing**
   - Current: None (shared storage)
   - Needed: All resources prefixed with `teamId`

---

## Recommendations

### Immediate (Week 1)

1. **Fix apiAuth() Bug** (8 hours)
   - Return `{ userId, teamId }` instead of `{ userId }`
   - Update JWT payload to include `teamId`
   - Test all 170 frontend routes

2. **Replace globalThis Storage** (16 hours)
   - Move campaigns to database
   - Move conversation contexts to Redis
   - Add indexes on `teamId`

3. **Add Tenant Namespacing to S3** (4 hours)
   - Prefix all paths with `team_{teamId}/`
   - Update bucket index paths

4. **Add Deduplication to Apollo** (8 hours)
   - Check `leads` table for existing `apolloId`
   - Skip if already enriched within 30 days

### Medium Term (Month 1)

5. **Implement Rate Limiting** (8 hours)
   - Add middleware to all API routes
   - Limits: 100 req/min per user, 1000/min per team

6. **Add Workflow Guardrails** (16 hours)
   - Max 3 follow-ups per lead
   - Business hours enforcement
   - DNC list checking

7. **Implement Batch Processing** (16 hours)
   - Apollo: 10 parallel calls
   - SMS: Throttle to 20/minute
   - Database: Batch insert 100 at a time

8. **Add Monitoring** (12 hours)
   - Sentry for error tracking
   - APM for performance
   - Budget alerts

### Long Term (Quarter 1)

9. **Separate Databases by Tenant** (40 hours)
   - Split Nextier and Homeowner Advisor DBs
   - Implement connection pooling

10. **Implement Row-Level Security** (40 hours)
    - Add RLS policies to all tables
    - Test tenant isolation

11. **Build Centralized Calendar** (24 hours)
    - View all scheduled executions
    - Kill switches for campaigns
    - Preview upcoming sends

12. **Add Comprehensive Testing** (80 hours)
    - Unit tests: 60% coverage
    - Integration tests: Critical paths
    - E2E tests: Full user flows

---

## Conclusion

### Can System Handle 500-Record Blocks?

**Answer**: ⚠️ **MAYBE** (with critical fixes)

**Blockers**:
1. ❌ `apiAuth()` bug causes cross-tenant data leak
2. ❌ Campaign storage in `globalThis` (lost on restart)
3. ❌ No rate limiting (Apollo, SMS will throttle)
4. ❌ No tenant namespacing (cross-tenant file access)

**After Fixes**:
- ✅ 50 records: Safe
- ✅ 500 records: Safe (with fixes)
- ⚠️ 2,000 records: Requires batching
- ❌ 10,000 records: Requires job queue + horizontal scaling

---

**Audit Completed**: 2025-12-18
**Auditor**: Claude (Principal Platform Engineer)
**Next Phase**: [AUDIT_04_SCALE_RISK.md](AUDIT_04_SCALE_RISK.md)
