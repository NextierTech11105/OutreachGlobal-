# OutreachGlobal Platform Engineering Audit

**Date:** December 16, 2025
**Auditor:** Claude Code (Principal Platform Engineer Assessment)
**Platform:** Multi-tenant B2B Sales Automation SaaS
**Infrastructure:** DigitalOcean (App Platform, Managed Postgres, Spaces, Redis)

---

## Executive Summary

OutreachGlobal is a multi-tenant outreach automation platform with AI agents (LUCI, Gianna, Sabrina), campaign execution, data enrichment pipelines, and human-in-the-loop approval workflows. This audit evaluates production readiness across 10 critical dimensions.

### Overall Assessment: **HIGH RISK - Requires Remediation Before Scale**

| Dimension | Score | Risk Level |
|-----------|-------|------------|
| Repo Structure | 7/10 | Medium |
| Tenant Isolation | 4/10 | **CRITICAL** |
| Queue Architecture | 5/10 | High |
| Enrichment Layer | 4/10 | **CRITICAL** |
| Campaign Execution | 7/10 | Medium |
| Observability | 3/10 | **CRITICAL** |
| Security | 7/10 | Medium |
| White-Label | 7/10 | Medium |
| Object Storage | 4/10 | **CRITICAL** |

---

## 1. REPO & MONOREPO STRUCTURE

### Structure Overview
```
outreach-monorepo/
├── apps/
│   ├── api/              # NestJS Backend (22 modules)
│   ├── front/            # Next.js Frontend (17 domains)
│   └── fdaily-pro/       # Dormant secondary app
├── packages/
│   ├── common/           # Shared utilities (@nextier/common)
│   ├── dto/              # Validation schemas (@nextier/dto)
│   ├── tsconfig/         # Base TypeScript config
│   └── mcp-realestate/   # Empty stub
├── airflow_dags/         # ETL orchestration
└── docs/                 # 43 documentation files
```

### Strengths
- Clear separation between apps and packages
- NestJS modular architecture with 22 feature modules
- Shared packages for common utilities and DTOs
- No circular dependencies detected

### Critical Issues

#### GOD MODULE: Enrichment
**Location:** `apps/api/src/app/enrichment/enrichment.module.ts`
- 9 services bundled: B2B, Apollo, SkipTrace, RealEstate, Twilio, IdentityGraph, LeadCard, CsvImport, CampaignTrigger
- 3 consumers, 3 repositories, 1 controller
- **Recommendation:** Split into sub-domains (data-enrichment, property-enrichment, identity-matching)

#### Apollo Centralization
- All 22 modules depend on apollo module for GraphQL types
- 474 cross-module imports using `@/app/` path
- High coupling point for all resolvers

#### Database Schema Organization
- 28 schema files unorganized in flat `/database/schema/`
- No domain grouping
- **Recommendation:** Group by domain (lead/, campaign/, property/)

---

## 2. DATABASE SCHEMA & TENANT ISOLATION

### Assessment: **CRITICAL RISK**

### Tenant Isolation Strategy
- Uses `teamId` as tenant identifier (application-layer enforcement)
- **NO Row-Level Security (RLS)** policies implemented
- Direct Drizzle ORM queries with explicit `teamId` filters

### CRITICAL: Cross-Tenant Data Leakage Vulnerabilities

#### Vulnerability #1: Unscoped Property Tables
```sql
-- These tables have NO teamId field:
properties           -- Shared across ALL tenants
propertyDistressScores
propertySearches     -- Cached queries shared globally
propertySearchBlocks
```

**Impact:** Team A's property search results cached and visible to Team B

#### Vulnerability #2: Property Search Cache
```typescript
// apps/api/src/app/property/services/real-estate-search.service.ts
// Queries propertySearches WITHOUT teamId filter
const existingResults = await this.db
  .select()
  .from(propertySearchesTable)
  .where(
    and(
      eq(propertySearchesTable.endpoint, endpoint),
      eq(propertySearchesTable.filterHash, filterHash),
      // ✗ NO teamId check!
    ),
  );
```

### Tenant-Scoped Tables (35/40)
- ✓ leads, campaigns, workflows, integrations
- ✓ personas, personaPhones, personaEmails
- ✓ businesses, businessOwners
- ✓ aiSdrAvatars, inboxItems

### Missing Audit Trail
- No comprehensive audit log table
- No change history for sensitive operations
- No access audit log

### Immediate Actions Required
1. Add `teamId` to properties, propertySearches, propertyDistressScores
2. Implement PostgreSQL RLS policies as defense-in-depth
3. Create `audit_logs` table for compliance

---

## 3. QUEUE/WORKER ARCHITECTURE

### Queue Configuration (BullMQ + Redis)
| Queue | Concurrency | Retry | Backoff |
|-------|-------------|-------|---------|
| campaign-sequence | 10 | None | None |
| campaign | default | None | None |
| skiptrace | default | 3 | exponential 10s |
| lead-card | default | 2 | exponential 5s |
| b2b-ingestion | default | 3 | exponential 5s |
| integration-task | 5 | None | None |
| mail | 5 | None | None |

### Critical Issues

#### No Dead Letter Queue
- Failed jobs logged but not routed to DLQ
- No recovery mechanism for failed processing

#### Missing Idempotency
```typescript
// apps/api/src/app/campaign/commands/handlers/sync-lead-campaign.handler.ts
async execute(command: SyncLeadCampaign) {
  await this.queue.add(CampaignJobs.SYNC_LEAD_CAMPAIGN, command);
  // ✗ No deduplication ID - same lead can be queued multiple times
}
```

#### Race Condition in Integration Sync
```typescript
// Only checks PENDING status, not IN_PROGRESS
const existingTask = await this.db.query.integrationTasks.findFirst({
  where: (t) => and(
    eq(t.status, "PENDING"),  // ⚠️ Race condition
  ),
});
```

#### Console.log Anti-Pattern
Files using `console.log` instead of Logger:
- `campaign/consumers/campaign.consumer.ts`
- `mail/mail.consumer.ts`
- `integration/consumers/integration-task.consumer.ts`
- `lead/consumers/lead.consumer.ts`

### Cron Jobs
| Schedule | Purpose | Issues |
|----------|---------|--------|
| EVERY_MINUTE | Campaign sequence | Only 100 leads/minute (bottleneck) |
| EVERY_MINUTE | Campaign activation | ✓ Good |
| EVERY_DAY_AT_MIDNIGHT | Property matching | No error isolation |
| EVERY_5_MINUTES | Zoho token refresh | ✓ Good |

---

## 4. ENRICHMENT & EXTERNAL API SAFETY

### Assessment: **CRITICAL RISK**

### External API Integrations
| Vendor | Auth | Rate Limit | Credit Tracking |
|--------|------|------------|-----------------|
| Apollo.io | API Key | None | ✗ NO |
| RealEstateAPI | API Key | None | ✗ NO |
| Twilio | Basic Auth | None | ✗ NO |
| DO Spaces | AWS SDK | None | N/A |

### CRITICAL: No Credit Protection
```typescript
// apps/api/src/app/enrichment/services/apollo-enrichment.service.ts
// Calls made WITHOUT credit check
const companyData = await this.enrichCompany(domain, companyName);  // No check
const people = await this.findExecutives(organizationId);  // No check
// If call 3 fails after calls 1-2 succeed, credits already spent
```

**Missing:**
- No pre-flight credit validation
- No quota checking against team limits
- No credit deduction logic
- No billing accumulation system

### Partial Failure Handling
```typescript
// apps/api/src/app/enrichment/consumers/b2b-ingestion.consumer.ts
for (const filePath of files) {
  try {
    await this.b2bIngestionService.processRecords(...);
  } catch (error) {
    totalErrors++;
    // ⚠️ Job returns success even with errors!
  }
}
return { filesProcessed: files.length, totalRecords, ... };
```

### No Vendor Abstraction
- Each service directly calls vendor APIs
- No `IEnrichmentProvider` interface
- Cannot A/B test vendors or implement fallbacks
- Vendor lock-in to RealEstateAPI

### Enrichment State Resumption
- ✓ CAN resume: If Apollo/SkipTrace fails, retries 3x
- ✗ CANNOT resume: Bulk ingestion mid-file (no checkpoint)
- ✗ CANNOT resume: CSV import chunks not tracked
- ✗ CANNOT resume: SkipTrace bulk jobs timeout after 5 min

---

## 5. CAMPAIGN EXECUTION & HUMAN-IN-LOOP

### Campaign States
`DRAFT` → `SCHEDULED` → `ACTIVE` ↔ `PAUSED` → `COMPLETED`

### Message Sending Flow
1. Lead retrieval + campaign sequence lookup
2. Template variable substitution
3. Channel dispatch (Email/SMS/Voice)
4. Execution audit trail (`campaignExecutions`, `campaignEvents`)
5. Lead progress update (`currentSequencePosition`, `nextSequenceRunAt`)

### Human-in-Loop (Gianna)
```
Draft → Preview → Approved → Pending → Processing → Sent
         ↓           ↓
       Reject     Edit
```

**Tracked Metadata:**
- `approvedAt`, `approvedBy`
- `editedAt`, `editedBy`
- `originalMessage` (audit trail)

### TCPA/DNC Compliance
- ✓ Suppression list management (`DNC_REQUEST`, `LEGAL_DNC`, `WRONG_NUMBER`)
- ✓ Automatic opt-out detection in Gianna
- ✓ Immediate DNC compliance (no human approval needed)
- ⚠️ No explicit TCPA consent logging before send

### Strengths
- Comprehensive state tracking
- Multi-level audit trail
- Human approval workflow with identity tracking
- Batching prevents carrier blocking (2K max)

### Gaps
- No explicit "STOPPED" state
- Campaign pause doesn't automatically pause pending sends
- Gianna decision logs not persisted for training

---

## 6. OBSERVABILITY & OPERABILITY

### Assessment: **CRITICAL RISK**

### Current State
| Component | Status |
|-----------|--------|
| Structured Logging | ✗ Not implemented |
| Correlation IDs | ✗ Not implemented |
| Health Checks | ✗ Missing `/health`, `/readiness` |
| Metrics | ✗ No Prometheus/StatsD |
| Distributed Tracing | ✗ Not implemented |
| Error Monitoring | ✗ No Sentry/Datadog |

### Logging Issues
```typescript
// Inconsistent patterns found:
this.logger.log(`Starting...`);     // NestJS Logger (some files)
console.log("Job failed");          // Console (anti-pattern)
console.error("Error:", error);     // No structured context
```

**Files with console.log:**
- `campaign/consumers/campaign.consumer.ts`
- `mail/mail.consumer.ts`
- `integration/consumers/integration-task.consumer.ts`
- `campaign/schedules/campaign.schedule.ts`
- `main.ts`

### Missing Health Check
```typescript
// Current app.controller.ts only returns version
@Get()
version() {
  return { version: "0.1.0" };
}
// ✗ No database ping, no Redis check, no queue health
```

### Queue Visibility
- No monitoring dashboard
- No job backlog alerts
- No dead letter queue handling
- `removeOnComplete: true` deletes audit trail

### Immediate Actions
1. Implement pino/winston for structured logging
2. Add correlation ID middleware
3. Create health check endpoints with @nestjs/terminus
4. Implement Prometheus metrics
5. Add error monitoring (Sentry)

---

## 7. SECURITY & COMPLIANCE

### Authentication
- ✓ JWT with fast-jwt library
- ✓ JTI-based token revocation
- ✓ Argon2 password hashing
- ✓ Personal Access Token system

### Authorization
- ✓ Role-based access (OWNER, ADMIN, MEMBER)
- ✓ Team policies with membership validation
- ✓ Guard composition (AuthGuard, RolesGuard, ThrottlerGuard)

### Input Validation
- ✓ Zod schema validation on all inputs
- ✓ Detailed error messages with field paths
- ✓ Type coercion with fallbacks

### SQL Injection Prevention
- ✓ Drizzle ORM parameterized queries
- ✓ No raw SQL detected in application code

### Critical Security Issues

#### CORS Configuration
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: "*",  // ⚠️ ACCEPTS ALL ORIGINS
});
```
**Fix:** Restrict to `process.env.FRONTEND_URL`

#### Encryption Mode
```typescript
// apps/api/src/common/utils/encryption.ts
// Uses AES-256-CTR without authentication
// ⚠️ Should use AES-256-GCM
```

#### Token Expiration
- 1-year token expiration may be too long
- Consider 24-hour access tokens with refresh

#### Missing
- Helmet security headers not activated
- GraphQL introspection not disabled in production
- No audit trail for sensitive operations

---

## 8. WHITE-LABEL READINESS

### Current Capabilities
- ✓ Environment-driven branding (APP_NAME, LOGO_URL, etc.)
- ✓ Flexible team settings (key-value with scopes)
- ✓ Role-based access control
- ✓ Theme provider with system detection

### Branding Configuration
```typescript
// apps/front/src/config/branding.ts
NEXT_PUBLIC_APP_NAME || "Nextier"
NEXT_PUBLIC_COMPANY_NAME || "Nextier"
NEXT_PUBLIC_AI_ASSISTANT_NAME || "Gianna"
NEXT_PUBLIC_LOGO_URL || ""
```

### Gaps
| Feature | Status | Effort |
|---------|--------|--------|
| Feature Flags | ✗ Not implemented | Medium |
| Per-tenant Branding | ✗ Env vars only | Medium |
| Custom Domains | ✗ Not supported | High |
| Usage Quotas | ✗ Global throttler only | Medium |
| Theme Customization | ✗ System theme only | Low |

### Team Settings Architecture
```typescript
// Supports typed settings with scopes
{
  team_id, name, value, masked_value, is_masked,
  type: 'TEXT' | 'ARRAY' | 'BOOLEAN' | 'NUMBER',
  scope, metadata
}
```

### Deployment Readiness: 7/10
**Ready with minor enhancements for complete white-label**

---

## 9. DATA LAKE & OBJECT STORAGE

### Assessment: **CRITICAL RISK**

### Configuration
- **Provider:** DigitalOcean Spaces (S3-compatible)
- **Region:** nyc3
- **Bucket:** `nextier` (hardcoded)
- **SDK:** AWS SDK v3 (@aws-sdk/client-s3)

### Storage Structure
```
buckets/
├── {id}.json           # Full bucket data
├── {id}.meta.json      # Metadata sidecar
└── _index.json         # Cached index (1min TTL)

datalake/
├── residential/ny/raw/
├── phones/ny/raw/
├── emails/ny/raw/
├── business/ny/raw/
└── business/ny/sectors/
```

### CRITICAL: Ingestion NOT Safely Replayable

#### No Idempotency Keys
```typescript
// Same CSV uploaded twice = duplicated records
const id = `csv-${Date.now()}-${randomUUID()}`;
// No content hashing or deduplication
```

#### No Atomic Index Updates
- Read-modify-write pattern without locking
- Race conditions on concurrent updates
- Index corruption possible on crash

#### No Retention Policies
- No lifecycle rules configured
- Files stored indefinitely
- Unbounded storage growth

#### Overwrite Pattern
```typescript
// Direct overwrites without versioning
await client.send(new PutObjectCommand({
  Key: `buckets/${bucket.id}.json`,
  Body: JSON.stringify(bucket),  // OVERWRITES
}));
// No ETag validation, no version IDs
```

### Data Volumes
- NY Residential: 15.8M records
- NY Cell Phones: 5.1M records
- NY Opt-in Emails: 7.3M records
- NY Businesses: 5.5M records
- **Total: ~33.7M records**

---

## 10. PRIORITIZED RISK LIST

### CRITICAL (Fix Immediately)

| # | Risk | Impact | Location |
|---|------|--------|----------|
| 1 | **Cross-tenant property data leakage** | Data breach, compliance violation | `properties`, `propertySearches` tables |
| 2 | **No credit protection on enrichment APIs** | Unlimited spend, billing disputes | All enrichment services |
| 3 | **No observability infrastructure** | Cannot diagnose production issues | Platform-wide |
| 4 | **Object storage not replay-safe** | Data loss, corruption | Datalake ingestion |
| 5 | **CORS accepts all origins** | XSS, CSRF attacks | `main.ts` |

### HIGH (Next Sprint)

| # | Risk | Impact | Location |
|---|------|--------|----------|
| 6 | Race condition in integration sync | Duplicate data, API waste | `integration-task.service.ts` |
| 7 | No dead letter queue | Lost jobs, silent failures | All queues |
| 8 | Missing idempotency keys | Duplicate processing | Campaign sync, mail queue |
| 9 | Console.log instead of Logger | No structured logs | Multiple consumers |
| 10 | No health check endpoints | K8s probe failures | `app.controller.ts` |

### MEDIUM (This Quarter)

| # | Risk | Impact | Location |
|---|------|--------|----------|
| 11 | Enrichment module is God module | Hard to maintain/test | `enrichment.module.ts` |
| 12 | No feature flag system | Can't do gradual rollouts | Platform-wide |
| 13 | Token expiration too long (1 year) | Security risk | `auth.service.ts` |
| 14 | Gianna decisions not persisted | Can't train/improve AI | Gianna service |
| 15 | No audit logging | Compliance risk | Platform-wide |

---

## 11. WHAT BREAKS FIRST AT SCALE

### At 10K Leads/Day
1. **Campaign sequence bottleneck** - Only 100 leads/minute processed
2. **Property search cache collision** - Same queries shared across tenants
3. **Queue backlog** - No backpressure handling

### At 100K Leads/Day
4. **Credit exhaustion** - No quota protection, runaway API spend
5. **Object storage corruption** - Concurrent index updates
6. **Database connection pool** - No explicit pooling config

### At 1M Leads/Day
7. **Enrichment pipeline collapse** - No circuit breaker, cascading failures
8. **Index JSON files** - Unbounded growth, parse timeouts
9. **Redis memory** - Job data not cleaned up

---

## 12. EXECUTION ROADMAP

### Phase 1: Immediate Fixes (Week 1-2)

#### Day 1-2: Security & Isolation
- [ ] Add `teamId` to properties, propertySearches tables
- [ ] Fix CORS to restrict origins
- [ ] Add health check endpoints

#### Day 3-5: Observability
- [ ] Implement pino structured logging
- [ ] Add correlation ID middleware
- [ ] Replace all console.log with Logger

#### Day 6-10: Queue Safety
- [ ] Add idempotency keys to critical queues
- [ ] Implement dead letter queue
- [ ] Fix integration sync race condition

### Phase 2: Near-Term Refactors (Week 3-6)

#### Credit Protection
- [ ] Implement credit pre-flight validation
- [ ] Add quota tracking per team
- [ ] Create enrichment audit trail

#### Enrichment Module Split
- [ ] Extract data-enrichment sub-module
- [ ] Extract property-enrichment sub-module
- [ ] Extract identity-matching sub-module

#### Object Storage Hardening
- [ ] Implement content hashing for deduplication
- [ ] Add atomic markers for ingestion state
- [ ] Create retention lifecycle policies

### Phase 3: Long-Term Upgrades (Quarter)

#### Database
- [ ] Implement PostgreSQL RLS policies
- [ ] Add comprehensive audit logging
- [ ] Reorganize schemas by domain

#### White-Label
- [ ] Implement feature flag system
- [ ] Add per-tenant branding in database
- [ ] Support custom domains

#### Observability
- [ ] Deploy Prometheus metrics
- [ ] Integrate error monitoring (Sentry)
- [ ] Implement distributed tracing

---

## Appendix: File Reference

### Critical Files to Review
```
apps/api/src/app/enrichment/enrichment.module.ts    # God module
apps/api/src/database/schema/properties.schema.ts   # Missing teamId
apps/api/src/main.ts                                # CORS config
apps/api/src/app/inbox/services/inbox.service.ts    # DNC compliance
apps/front/src/app/api/buckets/upload-csv/route.ts  # Object storage
apps/api/src/app/campaign/services/campaign.service.ts # Batching
```

### Schema Files Needing teamId
```
apps/api/src/database/schema/properties.schema.ts
apps/api/src/database/schema/property-searches.schema.ts
apps/api/src/database/schema/property-distress-scores.schema.ts
```

---

**Report Generated:** December 16, 2025
**Next Review:** After Phase 1 completion
