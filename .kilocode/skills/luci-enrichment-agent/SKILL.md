# LUCI Research & Enrichment Agent

> **Status**: PRODUCTION-READY
> **Location**: `apps/api/src/app/luci/`
> **Primary Function**: Data enrichment pipeline orchestration

## Overview

LUCI (Lead Utility & Contact Intelligence) is NEXTIER's core data enrichment engine. Unlike other agents that handle conversations, LUCI operates as a **batch processing pipeline** that transforms raw lead lists into campaign-ready contact data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LUCI ORCHESTRATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────┐    │
│  │   RAW    │───▶│   TRACERFY   │───▶│ TRESTLE REAL   │───▶│  READY   │    │
│  │  Import  │    │  FIRST ($0.02)│    │ CONTACT ($0.03)│    │ Campaign │    │
│  └──────────┘    └──────────────┘    └────────────────┘    └──────────┘    │
│       │                 │                    │                   │          │
│       ▼                 ▼                    ▼                   ▼          │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────┐    │
│  │USBizData │    │ Skip Trace   │    │ Name Verify    │    │SignalHouse│   │
│  │ Apollo.io│    │ Get Phones   │    │ Activity Score │    │   SMS     │   │
│  │ CSV/API  │    │ Find Mobiles │    │ SMS-Ready Flag │    │ Outreach  │   │
│  └──────────┘    └──────────────┘    └────────────────┘    └──────────┘    │
│                         │                                                   │
│                         ▼                                                   │
│               ┌──────────────────┐                                          │
│               │ HAS MOBILE?      │                                          │
│               │ Yes → Skip       │                                          │
│               │ No  → Tracerfy   │                                          │
│               └──────────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Smart Enrichment Flow

```
Lead Arrives
     │
     ▼
┌─────────────────────┐
│ Has Mobile Already? │
└─────────────────────┘
     │
     ├── YES ──▶ CHOOSE YOUR LEVEL:
     │              │
     │              ├── BASIC: Phone Validation ($0.015)
     │              │          └── Scoring + Line Type
     │              │
     │              └── PREMIUM: Real Contact ($0.03) ⭐ THE BEST
     │                          └── Name Verify + Activity Score + Full Intel
     │
     └── NO ───▶ Tracerfy FIRST ($0.02)
                        │
                        └── Then Real Contact ($0.03)
                                    │
                                    └── Total: $0.05 All-In
```

### Pricing Tiers — $0.05 NET COST

| Scenario | Service | Net Cost | What You Get |
| -------- | ------- | -------- | ------------ |
| **No mobile** | Tracerfy + Real Contact | **$0.05** | Full discovery + verification |
| **Has mobile (basic)** | Phone Validation only | $0.015 | Line type, scoring, carrier |
| **Has mobile (premium)** | Real Contact | $0.03 | Name match, activity score, SMS-ready |

**$0.05 is our NET COST** for full premium enrichment (Tracerfy $0.02 + Trestle Real Contact $0.03).

### Business Model — Markup Potential

| Cost Type | Amount | Notes |
| --------- | ------ | ----- |
| **Net Cost** | $0.05 | Our wholesale cost |
| **Customer Price** | $0.15 - $0.30 | Retail markup |
| **Margin** | 200% - 500% | Per enriched lead |

```text
Example: 10,000 leads enriched
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Net Cost:     10,000 × $0.05 = $500
Revenue:      10,000 × $0.20 = $2,000  (at $0.20/lead)
Gross Profit: $1,500 (300% margin)
```

### Strategic Use Cases

| Strategy | Description | Value |
| -------- | ----------- | ----- |
| **Markup** | Charge $0.15-$0.30/lead | 200-500% margin |
| **Leverage** | Give away as value-add | Customer acquisition |
| **Bundled** | Include in subscription | Increase perceived value |

**Low cost = Strategic flexibility.** Use enrichment as a profit center OR as leverage to attract/retain customers.

## Data Sources

### US BizData Import
Primary B2B lead source for business data:
- **Location**: `apps/front/src/lib/data/usbizdata-registry.ts`
- **API Routes**: `apps/front/src/app/api/enrichment/usbiz-skip-trace/route.ts`
- **Fields**: Company name, address, SIC codes, employee count, revenue
- **Import**: CSV upload or API batch import

### Apollo.io Integration
Executive and company enrichment:
- **Service**: `apps/api/src/app/enrichment/services/apollo-enrichment.service.ts`
- **API Routes**: `apps/front/src/app/api/apollo/` (search, enrich, bulk-enrich)
- **Features**:
  - Company enrichment (website, revenue, employees, SIC/NAICS)
  - Executive search (owners, founders, C-suite, VPs, directors)
  - Persona creation with emails and phone numbers
  - Auto-queues to SkipTrace for additional data

```typescript
// Apollo enrichment flow
const result = await apolloEnrichmentService.enrichBusiness({
  teamId: 'team_xxx',
  businessId: 'business_yyy',
  domain: 'example.com',
});
// Returns: { executivesFound: 5, personasCreated: 5 }
```

## Core Components

### 1. LuciService (`luci.service.ts`)
Main orchestration service (1,960 lines) handling:
- Pipeline state management
- Block creation and tracking
- Progress monitoring
- Error recovery

### 2. TracerfyClient (`clients/tracerfy.client.ts`)
Skip tracing integration:
- **Cost**: $0.02/lead (person), $0.15/lead (company)
- **Returns**: Phone numbers, emails, addresses
- **Batch size**: Up to 1,000 records per request

```typescript
interface TracerfyPersonRequest {
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface TracerfyCompanyRequest {
  companyName: string;
  address?: string;
  city?: string;
  state?: string;
}
```

### 3. TrestleClient (`clients/trestle.client.ts`) — THE BEST FOR ENRICHMENT

Trestle Real Contact API is **the premier enrichment endpoint** for deep contact intelligence:

#### Real Contact Endpoint (Recommended)
- **Cost**: $0.03/contact
- **What You Get**:
  - ✅ **Name Verification** — Confirms contact identity
  - ✅ **All Phone Numbers** — Mobile, landline, VoIP with line types
  - ✅ **Mobile Prioritization** — SMS-ready numbers flagged first
  - ✅ **Activity Score** — 0-100 contactability rating (100 = highly active)
  - ✅ **Contact Grade** — A-F quality tier for prioritization
  - ✅ **SMS-Ready Flag** — Instant mobile qualification

```typescript
interface TrestleRealContactResult {
  // Identity Verification
  nameMatch: boolean;           // Does name match phone owner?

  // Phone Intelligence
  phones: Array<{
    number: string;
    lineType: 'mobile' | 'landline' | 'voip';
    carrier: string;
    isSmsCapable: boolean;      // Can receive SMS?
  }>;

  // Contactability Scoring
  activityScore: number;        // 0-100 (100 = most contactable)
  contactGrade: 'A' | 'B' | 'C' | 'D' | 'F';

  // SMS Qualification
  bestMobile: string | null;    // Top mobile number for outreach
  smsReady: boolean;            // Has verified mobile + good score
}
```

#### Why Real Contact is THE BEST
| Feature | Basic Phone Validation | Real Contact |
|---------|------------------------|--------------|
| Phone valid? | ✅ | ✅ |
| Line type | ✅ | ✅ |
| Name verification | ❌ | ✅ |
| Activity scoring | ❌ | ✅ (0-100) |
| Multiple phones | ❌ | ✅ |
| SMS-ready flag | ❌ | ✅ |
| Contact grading | Basic | A-F with scoring |

#### Usage Pattern
```typescript
// Deep enrichment with Real Contact
const result = await trestleClient.scoreContact({
  firstName: lead.firstName,
  lastName: lead.lastName,
  phone: lead.phone,
  address: lead.address,
});

// Prioritize by activity score
if (result.activityScore >= 70 && result.smsReady) {
  // TIER 1: Immediate SMS outreach
  await pushToCampaign(lead, result.bestMobile);
} else if (result.contactGrade <= 'B') {
  // TIER 2: Same-day outreach
  await queueForOutreach(lead);
}
```

### 4. BlockManagerService (`services/block-manager.service.ts`)
Manages 10k lead blocks:
- DO Spaces storage integration
- Block state transitions
- Batch processing coordination

### 5. CampaignExecutorService (`services/campaign-executor.service.ts`)
Pushes enriched leads to campaigns:
- SignalHouse SMS integration
- Rate limiting (2,000 SMS/day default)
- Campaign assignment logic

## Pipeline Stages

### Stage 1: RAW
- CSV import or API ingestion
- Basic deduplication
- Field normalization

### Stage 2: TRACED (Skip Trace)
- Person lookup via Tracerfy
- Company lookup for business leads
- Phone/email discovery

### Stage 3: SCORED (Validation)
- Phone validation via Trestle
- Contact scoring (A-F grades)
- Priority tier assignment

### Stage 4: READY (Campaign-Ready)
- Final filtering
- Campaign assignment
- SMS queue population

## 6-Tier Lead Prioritization

```typescript
const PRIORITY_TIERS = {
  TIER_1: { // Highest Priority
    criteria: 'Mobile phone, Grade A, email verified',
    action: 'Immediate outreach',
  },
  TIER_2: {
    criteria: 'Mobile phone, Grade B, any email',
    action: 'Same-day outreach',
  },
  TIER_3: {
    criteria: 'Any phone, Grade A-B, contact name',
    action: 'Next-day outreach',
  },
  TIER_4: {
    criteria: 'Landline/VoIP, Grade C, business name',
    action: 'Batch outreach',
  },
  TIER_5: {
    criteria: 'Grade D or incomplete data',
    action: 'Re-enrichment queue',
  },
  TIER_6: { // Lowest Priority
    criteria: 'Grade F or invalid',
    action: 'Archive/delete',
  },
};
```

## API Endpoints

### POST /luci/blocks
Create a new enrichment block from raw leads.

```typescript
// Request
{
  teamId: string;
  name: string;
  leadIds: string[];  // Up to 10,000
  options?: {
    skipTrace: boolean;
    validatePhones: boolean;
    assignToCampaign?: string;
  }
}

// Response
{
  blockId: string;
  status: 'created';
  leadCount: number;
  estimatedCost: {
    skipTrace: number;
    validation: number;
    total: number;
  }
}
```

### POST /luci/blocks/:id/process
Start processing an enrichment block.

### GET /luci/blocks/:id/status
Get current processing status and progress.

### POST /luci/blocks/:id/execute-campaign
Push ready leads to a campaign.

## BullMQ Jobs

LUCI uses BullMQ for async processing:

| Job Type | Purpose | Concurrency |
|----------|---------|-------------|
| `luci:full_pipeline` | Complete enrichment flow | 1 |
| `luci:skip_trace` | Tracerfy batch processing | 3 |
| `luci:score_contacts` | Trestle phone validation | 5 |
| `luci:enrich_selected` | Selective re-enrichment | 2 |

## Cost Calculations — $0.05 All-In Premium Enrichment

NextTier has **FLEXIBLE AND VERY HIGH STANDARDS** for enrichment when it comes to **CONTACTABILITY** and **VERIFICATION**. Trestle enables this at scale.

### Premium Enrichment Stack Pricing

| Service | Cost | What You Get |
|---------|------|--------------|
| **Tracerfy Skip Trace** | $0.02/lead | Phone numbers, emails, addresses |
| **Trestle Real Contact** | $0.03/contact | Name verification, activity scoring, SMS-ready qualification |
| **Total "All-In"** | **$0.05/lead** | Complete contactability verification |
| **Apollo.io** | Per-plan | Executive search, company enrichment |

### Cost Calculator

```typescript
function calculateEnrichmentCost(block: Block): CostEstimate {
  const personLeads = block.leads.filter(l => l.firstName);
  const companyLeads = block.leads.filter(l => !l.firstName && l.company);

  return {
    // Step 1: Skip Trace (Tracerfy)
    skipTrace: {
      person: personLeads.length * 0.02,      // $0.02/person
      company: companyLeads.length * 0.15,    // $0.15/company
    },

    // Step 2: Real Contact Verification (Trestle) - THE BEST
    realContact: block.leads.length * 0.03,   // $0.03/contact

    // All-In Total
    allInPerLead: 0.05,  // Tracerfy ($0.02) + Trestle ($0.03)

    total: (personLeads.length * 0.02) +
           (companyLeads.length * 0.15) +
           (block.leads.length * 0.03),
  };
}

// Example: 10,000 person leads
// Skip Trace: 10,000 × $0.02 = $200
// Real Contact: 10,000 × $0.03 = $300
// Total: $500 for fully verified, SMS-ready leads
```

### Why $0.05 All-In is Worth It

| Without Real Contact | With Real Contact ($0.05 All-In) |
|----------------------|----------------------------------|
| Phone might be valid | Phone verified + owner confirmed |
| Unknown contactability | Activity score 0-100 |
| Unknown line type | Mobile/Landline/VoIP identified |
| Wasted SMS on dead numbers | SMS only to verified mobiles |
| Low conversion rates | Higher ROI from quality contacts |

## Integration with Other Agents

### LUCI → GIANNA
After enrichment, contactable leads are passed to GIANNA for SMS outreach:
```
LUCI (enriched) → Campaign Queue → GIANNA (opener)
```

### LUCI → COPILOT
Copilot can invoke LUCI tools for on-demand enrichment:
```typescript
// Copilot tool call
{
  tool: 'skip_trace_person',
  params: { leadId: 'lead_xxx' }
}
```

### LUCI → Data Lake
Raw imports flow through the data lake before LUCI processing:
```
CSV Import → Data Lake → LUCI Blocks → Campaigns
```

## Error Handling

### Retry Strategy
- Tracerfy failures: 3 retries with exponential backoff
- Trestle failures: 3 retries with 5-second delay
- Block failures: Partial progress saved, resume capability

### Error States
```typescript
enum BlockErrorState {
  TRACERFY_TIMEOUT = 'tracerfy_timeout',
  TRESTLE_RATE_LIMIT = 'trestle_rate_limit',
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  INVALID_DATA = 'invalid_data',
}
```

## Multi-Tenant Isolation

All LUCI operations are scoped by `teamId`:
- Blocks are team-specific
- Cost tracking per team
- Separate DO Spaces paths per team

```typescript
const spacesPath = `blocks/${teamId}/${blockId}/${stage}/`;
```

## Skills Integration

LUCI integrates with these skills:

| Skill | Integration Point |
|-------|-------------------|
| `data-lake-orchestration-agent` | Raw data ingestion |
| `lead-state-manager` | Lead status transitions |
| `cost-guardian` | Enrichment budget tracking |
| `campaign-optimizer` | Post-enrichment campaign assignment |
| `workflow-orchestration-engine` | Pipeline job scheduling |

## Usage Example

```typescript
// 1. Create block from raw leads
const block = await luciService.createBlock({
  teamId: 'team_xxx',
  name: 'Florida Realtors Q1',
  leadIds: rawLeadIds, // Up to 10k
});

// 2. Start enrichment
await luciService.processBlock(block.id, {
  skipTrace: true,
  validatePhones: true,
});

// 3. Monitor progress
const status = await luciService.getBlockStatus(block.id);
// { stage: 'scoring', progress: 45, processed: 4500, total: 10000 }

// 4. Execute campaign when ready
await luciService.executeCampaign(block.id, {
  campaignId: 'campaign_yyy',
  minGrade: 'C',
});
```

## Performance Benchmarks

| Operation | Throughput | Latency |
|-----------|------------|---------|
| Skip Trace (batch) | 1,000/minute | 2-5s/batch |
| Phone Validation | 5,000/minute | 1-2s/batch |
| Campaign Push | 10,000/minute | <1s/batch |

## Future Enhancements

1. **Smart Backfill** - Auto-maintain 2,000 contactable leads per block
2. **Quality Scoring** - ML-based lead quality prediction
3. **Cost Optimization** - Route to cheapest provider per field

## Related Documentation

- [Data Lake Orchestration](./../data-lake-orchestration-agent/SKILL.md)
- [Lead State Manager](./../lead-state-manager/SKILL.md)
- [Cost Guardian](./../cost-guardian/SKILL.md)
