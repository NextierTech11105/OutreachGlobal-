---
name: cost-guardian
description: Subscription, trial, and usage limit enforcement for teams.
---

# Cost Guardian

> **Status**: BETA
> **Location**: `apps/api/src/app/billing/`
> **Primary Function**: Track plan limits, trials, and usage counters.

## Overview
Cost Guardian is implemented as the SubscriptionService. It seeds plans, manages trials, and exposes helpers to check and increment usage limits.

## Verified Code References
- `apps/api/src/app/billing/services/subscription.service.ts`
- `apps/api/src/app/billing/billing.module.ts`
- `apps/api/src/database/schema-alias.ts` (plansTable, subscriptionsTable, creditsTable)

## Current State

### What Already Exists
- Auto-creation of billing tables and starter plan
- Trial subscription provisioning with credits
- Usage limit checks and usage increment helpers
- Trial expiration queries and status helpers

### What Still Needs to be Built
- Stripe webhook handling for billing events
- Unified cost dashboard across AI and enrichment usage
- Plan-based enforcement for all paid operations

## Nextier-Specific Example
```typescript
// apps/api/src/app/billing/services/subscription.service.ts
const limits = subscription.plan.limits;
const usage = (subscription as any).usageThisPeriod || {};
const current = usage[usageType] || 0;
const limit = limits[usageType] || 0;

return {
  allowed: current + quantity <= limit,
  current,
  limit,
};
```

## Integration Points
| Skill | Integration Point |
| --- | --- |
| `workflow-orchestration-engine` | AI usage checks via usage meter | 
| `luci-enrichment-agent` | Enrichment spend should be gated by plan limits |
| `data-lake-orchestration-agent` | Block size estimation informs spend | 
| `campaign-optimizer` | Campaign volume should respect plan limits |

## Cost Information
- Plan pricing and limits are stored in `plans` table; usage is tracked per period.
- Credits are tracked in `credits` table but not yet linked to all paid actions.

## Multi-Tenant Considerations
- Subscription and credits are keyed by `teamId`.
- All usage counters are scoped per tenant.
