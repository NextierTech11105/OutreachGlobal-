# LUCI Enrichment Agent

> **Status**: PRODUCTION
> **Location**: `apps/api/src/app/luci/`
> **Primary Function**: Orchestrate enrichment from data lake to campaign-ready leads.

## Overview
LUCI runs the enrichment pipeline: import raw list data, batch leads into blocks, run Tracerfy skip trace, score/validate phones with Trestle, and push SMS-ready leads into campaigns. It is the paid enrichment engine for Nextier.

## Verified Code References
- `apps/api/src/app/luci/luci.service.ts`
- `apps/api/src/app/luci/luci.controller.ts`
- `apps/api/src/app/luci/luci.module.ts`
- `apps/api/src/app/luci/clients/tracerfy.client.ts`
- `apps/api/src/app/luci/clients/trestle.client.ts`
- `apps/api/src/app/luci/services/campaign-executor.service.ts`
- `apps/api/src/app/luci/services/block-manager.service.ts`
- `apps/api/src/app/raw-data-lake/raw-data-lake.service.ts`
- `apps/api/src/database/schema-alias.ts` (enrichmentJobsTable, enrichmentBlocksTable)

## Current State

### What Already Exists
- Endpoints for lake import, block pull, enrichment runs, scoring, and job status
- BullMQ pipeline execution with queue-backed enrichment jobs
- Tracerfy skip trace integration for phones and emails
- Trestle Real Contact scoring and phone validation modes
- Campaign execution support via `CampaignExecutorService`

### What Still Needs to be Built
- Optional integration of Apollo enrichment (exists in `apps/api/src/app/enrichment` but not wired into LUCI flow)
- Automated cost enforcement tied to subscription limits
- Unified enrichment reporting across blocks and campaigns

## Nextier-Specific Example
```typescript
// apps/api/src/app/luci/luci.service.ts
const traceResult = await this.tracerfy.beginTrace({
  csvBuffer,
  columnMapping,
  traceType,
});

await this.tracerfy.waitForQueue(traceResult.queue_id);
const records = await this.tracerfy.getQueue(traceResult.queue_id);
```

## Integration Points
| Skill | Integration Point |
| --- | --- |
| `data-lake-orchestration-agent` | Imports list items and creates blocks for enrichment |
| `signalhouse-integration` | Campaign executor sends SMS to enriched leads |
| `campaign-optimizer` | Enriched leads populate campaigns and sequences |
| `lead-state-manager` | Lead status transitions post-enrichment |
| `workflow-orchestration-engine` | Shared queue and orchestration patterns |

## Cost Information
- Tracerfy skip trace: $0.02 per lead (person) and $0.15 per lead (company) per `ToolRegistry` constants.
- Trestle phone validation: $0.015 per phone; Real Contact scoring: $0.03 per phone.
- Full enrichment path (Tracerfy + Real Contact) is $0.05 per lead; exposed in `luci.controller.ts`.

## Multi-Tenant Considerations
- All enrichment jobs and blocks are scoped by `teamId`.
- Controllers use `TenantContext` to enforce tenant isolation on all pipeline endpoints.
