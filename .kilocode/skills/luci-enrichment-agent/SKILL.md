# LUCI Research & Enrichment Agent

> **Status**: PRODUCTION-READY
> **Location**: `apps/api/src/app/luci/`
> **Primary Function**: Data enrichment pipeline orchestration

## Overview

LUCI (Lead Utility & Contact Intelligence) is NEXTIER's core data enrichment engine. Unlike other agents that handle conversations, LUCI operates as a **batch processing pipeline** that transforms raw lead lists into campaign-ready contact data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LUCI ORCHESTRATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │   RAW    │───▶│  TRACED  │───▶│  SCORED  │───▶│  READY   │     │
│  │  Import  │    │ SkipTrace│    │  Trestle │    │ Campaign │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │               │               │               │            │
│       ▼               ▼               ▼               ▼            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ CSV/API  │    │ Tracerfy │    │  Phone   │    │ SignalHouse   │
│  │  Ingest  │    │   API    │    │ Scoring  │    │   SMS    │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
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

### 3. TrestleClient (`clients/trestle.client.ts`)
Phone validation and scoring:
- **Cost**: $0.03/phone
- **Returns**: Grade A-F, line type, carrier info
- **Grades**: A (best) → F (invalid)

```typescript
interface TrestleScoreResult {
  phone: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lineType: 'mobile' | 'landline' | 'voip' | 'unknown';
  carrier: string;
  valid: boolean;
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

## Cost Calculations

```typescript
function calculateEnrichmentCost(block: Block): CostEstimate {
  const personLeads = block.leads.filter(l => l.firstName);
  const companyLeads = block.leads.filter(l => !l.firstName && l.company);

  return {
    skipTrace: {
      person: personLeads.length * 0.02,
      company: companyLeads.length * 0.15,
    },
    validation: block.leads.length * 0.03,
    total: (personLeads.length * 0.02) +
           (companyLeads.length * 0.15) +
           (block.leads.length * 0.03),
  };
}
```

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
