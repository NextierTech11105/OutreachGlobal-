---
name: campaign-optimizer
description: Campaign creation, sequencing, and activation logic for outreach.
---

# Campaign Optimizer

> **Status**: BETA
> **Location**: `apps/api/src/app/campaign/`
> **Primary Function**: Create and manage SMS campaigns and sequences.

## Overview
Campaign optimization in code is primarily campaign CRUD with sequence setup and approval gating. ML scheduling and A/B testing are not implemented yet.

## Verified Code References
- `apps/api/src/app/campaign/services/campaign.service.ts`
- `apps/api/src/app/campaign/repositories/campaign.repository.ts`
- `apps/api/src/app/campaign/campaign.module.ts`
- `apps/api/src/database/schema-alias.ts` (campaignsTable, campaignSequencesTable)

## Current State

### What Already Exists
- Campaign creation with sequences and lead eligibility by score range
- Approval gating before activation
- Pause/resume toggling
- Estimated lead counts derived from lead scores

### What Still Needs to be Built
- ML-based send-time optimization
- A/B testing for message templates
- Dynamic throttling based on response rates

## Nextier-Specific Example
```typescript
// apps/api/src/app/campaign/services/campaign.service.ts
const campaign = await this.repository.create(
  {
    ...input,
    teamId,
    estimatedLeadsCount,
    status: CampaignStatus.SCHEDULED,
    startsAt: new Date(),
  },
  sessionOptions,
);
```

## Integration Points
| Skill | Integration Point |
| --- | --- |
| `list-management-handler` | Lead filters determine campaign targeting |
| `luci-enrichment-agent` | Enriched leads feed campaign pools |
| `signalhouse-integration` | Outbound delivery for campaign execution |
| `lead-journey-tracker` | Campaign messages contribute to journey history |

## Cost Information
- No direct API costs in this module; SMS costs apply via SignalHouse.

## Multi-Tenant Considerations
- All campaign queries require `teamId` and enforce tenant scope.
