# Phase 4 Execution Prompt

**Version:** 1.0
**Date:** December 19, 2025
**Status:** Ready for Implementation

---

## CONTEXT

You are implementing Phase 4 of the OutreachGlobal platform stabilization. The preceding phases have:
- Phase 1: Fixed mock data implementations
- Phase 2: Wired integration pages to real APIs
- Phase 3: Created architecture documentation

This prompt guides the implementation of the data infrastructure layer.

---

## OBJECTIVE

Implement the database schema, bucket naming, and pipeline observability system as specified in the architecture documents:
- `01-DATABASE-SCHEMA-DRAFT.md`
- `02-OBJECT-BUCKET-NAMING-STANDARDS.md`
- `03-PIPELINE-OBSERVABILITY-UI-SPEC.md`

---

## EXECUTION TASKS

### Task 1: Database Schema Implementation

**File:** `apps/front/src/lib/db/schema.ts`

**Actions:**
1. Add missing tables from schema draft:
   - `tenants` - Multi-tenant isolation
   - `actors` - User/service identity
   - `pipelineRuns` - LUCI orchestration tracking
   - `blockExecutions` - Individual block execution logs
   - `artifacts` - Pipeline output references
   - `blueprints` - Reusable pipeline templates
   - `automations` - Scheduled/triggered workflows
   - `webhookEvents` - Inbound webhook audit log
   - `attemptLogs` - SMS/call attempt tracking

2. Create ULID generator with prefixes:
   ```typescript
   // apps/front/src/lib/db/id-generator.ts
   import { ulid } from 'ulid';

   const ID_PREFIXES = {
     tenant: 'tenant_',
     actor: 'actor_',
     lead: 'lead_',
     contact: 'contact_',
     run: 'run_',
     block: 'block_',
     artifact: 'art_',
     blueprint: 'bp_',
     automation: 'auto_',
     webhook: 'wh_',
     attempt: 'att_',
     sector: 'sector_',
     campaign: 'camp_',
     message: 'msg_',
     template: 'tpl_',
   } as const;

   export function generateId(type: keyof typeof ID_PREFIXES): string {
     return `${ID_PREFIXES[type]}${ulid()}`;
   }
   ```

3. Add migration file:
   ```bash
   npx drizzle-kit generate:pg --name add_pipeline_infrastructure
   ```

**Validation:**
- [ ] All tables have `tenantId` column for isolation
- [ ] All tables use ULID with prefix for primary key
- [ ] Foreign keys reference parent tables correctly
- [ ] Indexes exist for common query patterns

---

### Task 2: Bucket Path Utilities

**File:** `apps/front/src/lib/storage/bucket-paths.ts`

**Actions:**
1. Create bucket path builder:
   ```typescript
   export const BUCKET_DOMAINS = [
     'imports',
     'pipelines',
     'sectors',
     'templates',
     'recordings',
     'reports',
     'ai',
     'webhooks',
   ] as const;

   export type BucketDomain = typeof BUCKET_DOMAINS[number];

   export function buildBucketPath(
     tenantId: string,
     domain: BucketDomain,
     ...segments: string[]
   ): string {
     const path = [tenantId, domain, ...segments].join('/');
     validateBucketPath(path);
     return path;
   }
   ```

2. Create presigned URL generators:
   ```typescript
   // apps/front/src/lib/storage/presigned-urls.ts
   export async function generateUploadUrl(
     tenantId: string,
     domain: BucketDomain,
     filename: string,
     options?: { expiresIn?: number; maxSize?: number }
   ): Promise<{ url: string; key: string }>;

   export async function generateDownloadUrl(
     key: string,
     options?: { expiresIn?: number; filename?: string }
   ): Promise<string>;
   ```

3. Update existing upload handlers to use new paths:
   - `/api/datalake/import/route.ts`
   - `/api/property/bucket/route.ts`
   - `/api/buckets/sectors/upload/route.ts`

**Validation:**
- [ ] All new uploads use tenant-prefixed paths
- [ ] Existing uploads continue to work (backward compatible)
- [ ] Presigned URLs include proper expiration

---

### Task 3: Pipeline Run Tracking

**File:** `apps/front/src/app/api/pipelines/route.ts`

**Actions:**
1. Create pipeline CRUD endpoints:
   ```typescript
   // GET /api/pipelines - List runs
   // POST /api/pipelines - Start new run
   // GET /api/pipelines/:runId - Get run detail
   // POST /api/pipelines/:runId/pause - Pause run
   // POST /api/pipelines/:runId/resume - Resume run
   // POST /api/pipelines/:runId/cancel - Cancel run
   // DELETE /api/pipelines/:runId - Delete run
   ```

2. Update LUCI orchestrator to create pipeline runs:
   ```typescript
   // In /api/luci/orchestrate/route.ts
   // At start:
   const run = await db.insert(pipelineRuns).values({
     id: generateId('run'),
     tenantId,
     sectorId,
     status: 'running',
     totalLeads: leads.length,
     startedAt: new Date(),
   }).returning();

   // After each block:
   await db.insert(blockExecutions).values({
     id: generateId('block'),
     runId: run.id,
     blockNumber: i,
     stageName: 'enrichment',
     provider: 'apollo',
     status: 'completed',
     inputCount,
     outputCount,
     // ...
   });

   // At end:
   await db.update(pipelineRuns)
     .set({ status: 'completed', completedAt: new Date() })
     .where(eq(pipelineRuns.id, run.id));
   ```

**Validation:**
- [ ] Pipeline runs are persisted to database
- [ ] Block executions are logged with metrics
- [ ] Status updates happen in real-time

---

### Task 4: Pipeline Dashboard UI

**Files:**
- `apps/front/src/app/admin/pipelines/page.tsx`
- `apps/front/src/app/admin/pipelines/[runId]/page.tsx`
- `apps/front/src/components/pipeline/*.tsx`

**Actions:**
1. Create pipeline dashboard page:
   ```tsx
   // apps/front/src/app/admin/pipelines/page.tsx
   export default function PipelineDashboard() {
     const { data: runs } = usePipelines();
     return (
       <div>
         <PipelineStats runs={runs} />
         <PipelineList runs={runs} />
       </div>
     );
   }
   ```

2. Create reusable components:
   - `StatusBadge` - Pipeline/block status indicator
   - `ProgressBar` - Visual progress with percentage
   - `FlowVisualization` - Stage flow diagram
   - `BlockLog` - Execution log accordion
   - `MetricsPanel` - Real-time stats

3. Add to admin sidebar navigation:
   ```tsx
   // In admin-sidebar.tsx
   { name: 'Pipelines', href: '/admin/pipelines', icon: Activity }
   ```

**Validation:**
- [ ] Dashboard shows active, completed, failed runs
- [ ] Detail view shows block-by-block progress
- [ ] Metrics update in real-time

---

### Task 5: WebSocket Integration (Optional)

**File:** `apps/front/src/lib/websocket/pipeline-events.ts`

**Actions:**
1. Create WebSocket event types:
   ```typescript
   type PipelineEvent =
     | { type: 'run:started'; runId: string }
     | { type: 'run:progress'; runId: string; progress: number }
     | { type: 'block:completed'; runId: string; blockId: string }
     | { type: 'run:completed'; runId: string }
     | { type: 'run:failed'; runId: string; error: string };
   ```

2. Create React hook for WebSocket:
   ```typescript
   export const usePipelineEvents = (runId?: string) => {
     // WebSocket connection logic
     // Event filtering by runId
     // Reconnection handling
   };
   ```

3. Fallback to polling if WebSocket unavailable:
   ```typescript
   const { data } = useQuery({
     refetchInterval: wsConnected ? false : 5000,
   });
   ```

**Validation:**
- [ ] Real-time updates work with WebSocket
- [ ] Graceful fallback to polling
- [ ] No memory leaks on component unmount

---

## CONSTRAINTS

### MUST NOT:
- Delete any existing tables or columns
- Change auth/login flows
- Modify production API keys or credentials
- Push without verifying build passes

### MUST:
- Use Drizzle ORM for all database operations
- Include `tenantId` on all new tables
- Use ULID with prefix for all new IDs
- Add proper TypeScript types
- Handle errors gracefully

---

## TESTING CHECKLIST

Before pushing changes:

1. **Build Check:**
   ```bash
   npx nx run front:build
   ```

2. **Type Check:**
   ```bash
   npx nx run front:typecheck
   ```

3. **Migration Test:**
   ```bash
   npx drizzle-kit push:pg --dry-run
   ```

4. **Manual Verification:**
   - [ ] Admin panel loads without errors
   - [ ] Existing features still work
   - [ ] New pipeline page renders
   - [ ] Can start a test pipeline

---

## ROLLBACK PLAN

If issues occur:

1. **Immediate:** Revert commit with `git revert HEAD`
2. **Database:** Migrations are additive, no rollback needed
3. **UI:** Hide new menu items, don't delete pages

---

## SUCCESS CRITERIA

Phase 4 is complete when:
- [ ] Database schema includes all pipeline tables
- [ ] Bucket paths use tenant-prefixed format
- [ ] LUCI creates pipeline runs with block logs
- [ ] Admin dashboard shows pipeline status
- [ ] No regressions in existing functionality

---

## EXECUTION ORDER

1. Implement ID generator (no dependencies)
2. Add database tables (no dependencies)
3. Run migration (depends on #2)
4. Implement bucket path utilities (no dependencies)
5. Update LUCI to log runs (depends on #2, #3)
6. Create pipeline API routes (depends on #5)
7. Build UI components (depends on #6)
8. Add dashboard page (depends on #7)
9. Wire up WebSocket (optional, depends on #8)

---

## ESTIMATED EFFORT

| Task | Complexity | Files Changed |
|------|------------|---------------|
| ID Generator | Low | 1 new file |
| Database Tables | Medium | 1 file + migration |
| Bucket Paths | Low | 2 new files |
| LUCI Updates | Medium | 1 file |
| Pipeline API | Medium | 5 new files |
| UI Components | High | 6 new files |
| Dashboard Page | Medium | 2 new files |
| WebSocket | Medium | 2 new files |

**Total:** ~20 files, mix of new and modified

---

## NOTES FOR IMPLEMENTER

- Reference existing patterns in codebase
- Copy component styles from existing admin pages
- Use existing Zustand stores as template
- Test with small dataset first (10 leads)
- Log extensively during development

---

*Execution prompt generated for OutreachGlobal Phase 4*
*PRODUCTION SAFETY MODE: Additive changes only*
