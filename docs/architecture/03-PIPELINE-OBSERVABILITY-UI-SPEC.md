# Pipeline Observability UI Specification

**Version:** 1.0
**Date:** December 19, 2025
**Status:** Draft

---

## Overview

This document specifies the UI components and data flows for the LUCI Pipeline Observability Dashboard. The dashboard provides real-time visibility into batch processing, enrichment, and outreach pipelines.

---

## 1. DASHBOARD LAYOUT

### 1.1 Main Pipeline Dashboard (`/admin/pipelines`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LUCI Pipeline Control Center                              [+ New Run]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   ACTIVE     │  │  COMPLETED   │  │   FAILED     │  │   QUEUED     │ │
│  │      3       │  │     247      │  │      2       │  │      5       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  RUN ID          SECTOR       STATUS    PROGRESS    STARTED   TIME ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │  run_01JEX8A2   NY-Biz       ●RUNNING  ████░░ 67%   2m ago    1:42 ││
│  │  run_01JEX8A1   CA-Solar     ●RUNNING  ███░░░ 45%   5m ago    4:23 ││
│  │  run_01JEX8A0   TX-HVAC      ●RUNNING  █░░░░░ 12%   8m ago    7:58 ││
│  │  run_01JEX7Z9   FL-Roofing   ✓DONE     ██████ 100%  15m ago   6:12 ││
│  │  run_01JEX7Z8   NJ-Plumbing  ✗FAILED   ███░░░ 52%   22m ago   4:41 ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  [Show Completed ▾]  [Show Failed ▾]  [Export Logs]                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Pipeline Run Detail (`/admin/pipelines/[runId]`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    Pipeline Run: run_01JEX8A2B3C4D               [⟳] [⏸] [🗑]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Sector: NY-Biz  •  Started: Dec 19, 2025 2:34 PM  •  Status: RUNNING  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     PIPELINE FLOW VISUALIZATION                     ││
│  │                                                                     ││
│  │  [IMPORT]──►[PARSE]──►[ENRICH]──►[SKIP TRACE]──►[SCORE]──►[PUSH]  ││
│  │     ✓         ✓         ●            ○             ○         ○     ││
│  │   1,247     1,198      892          ---           ---       ---    ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌── BLOCK EXECUTION LOG ───────────────────────────────────────────────┐
│  │                                                                      │
│  │  BLOCK 4/5 • Enrichment • Apollo.io                                 │
│  │  ├─ Input: 250 leads                                                │
│  │  ├─ Processed: 187 (74.8%)                                          │
│  │  ├─ Enriched: 156 (83.4% hit rate)                                  │
│  │  ├─ Failed: 12 (rate limit)                                         │
│  │  └─ Time: 2:34 elapsed                                              │
│  │                                                                      │
│  │  ────────────────────────────────────────────────────────────────── │
│  │                                                                      │
│  │  BLOCK 3/5 • Parse CSV • Internal                          ✓ DONE  │
│  │  ├─ Input: 1,247 rows                                               │
│  │  ├─ Valid: 1,198 (96.1%)                                            │
│  │  ├─ Invalid: 49 (missing required fields)                           │
│  │  └─ Time: 0:12                                                      │
│  │                                                                      │
│  └──────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌── ARTIFACTS ─────────────────────────────────────────────────────────┐
│  │  📄 parsed_1702987200.json (1.2 MB)      [Download] [Preview]       │
│  │  📄 enriched_1702987201.json (892 KB)    [Download] [Preview]       │
│  └──────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPONENT SPECIFICATIONS

### 2.1 Pipeline Status Badge

```tsx
// components/pipeline/status-badge.tsx
type PipelineStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface StatusBadgeProps {
  status: PipelineStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<PipelineStatus, { color: string; icon: string; label: string }> = {
  queued: { color: 'bg-gray-400', icon: '○', label: 'Queued' },
  running: { color: 'bg-blue-500 animate-pulse', icon: '●', label: 'Running' },
  paused: { color: 'bg-yellow-500', icon: '⏸', label: 'Paused' },
  completed: { color: 'bg-green-500', icon: '✓', label: 'Completed' },
  failed: { color: 'bg-red-500', icon: '✗', label: 'Failed' },
  cancelled: { color: 'bg-gray-600', icon: '⊘', label: 'Cancelled' },
};
```

### 2.2 Progress Bar Component

```tsx
// components/pipeline/progress-bar.tsx
interface ProgressBarProps {
  current: number;
  total: number;
  status: PipelineStatus;
  showPercentage?: boolean;
  showCounts?: boolean;
}

// Visual states:
// - Queued: Empty gray bar
// - Running: Animated blue fill with pulse
// - Completed: Solid green fill
// - Failed: Red fill up to failure point + striped pattern
// - Paused: Yellow fill, no animation
```

### 2.3 Pipeline Flow Visualization

```tsx
// components/pipeline/flow-visualization.tsx
interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  inputCount?: number;
  outputCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

interface FlowVisualizationProps {
  stages: PipelineStage[];
  currentStage?: string;
}

// Stages (in order):
// 1. IMPORT - File upload/parsing
// 2. VALIDATE - Data validation
// 3. ENRICH - Apollo.io enrichment
// 4. SKIP_TRACE - RealEstateAPI skip trace
// 5. SCORE - Lead scoring
// 6. ASSIGN - Sector assignment
// 7. PUSH - Push to SMS/Dialer queue
```

### 2.4 Block Execution Log

```tsx
// components/pipeline/block-log.tsx
interface BlockExecution {
  blockId: string;
  blockNumber: number;
  totalBlocks: number;
  stageName: string;
  provider: string;
  status: 'running' | 'completed' | 'failed';
  metrics: {
    inputCount: number;
    processedCount: number;
    successCount: number;
    failedCount: number;
    hitRate?: number;
  };
  duration: number; // seconds
  startedAt: Date;
  completedAt?: Date;
  error?: {
    message: string;
    code?: string;
    retryable: boolean;
  };
}

interface BlockLogProps {
  blocks: BlockExecution[];
  autoScroll?: boolean;
  expandedByDefault?: boolean;
}
```

### 2.5 Real-Time Metrics Panel

```tsx
// components/pipeline/metrics-panel.tsx
interface PipelineMetrics {
  runId: string;

  // Counts
  totalLeads: number;
  processedLeads: number;
  enrichedLeads: number;
  skipTracedLeads: number;
  scoredLeads: number;
  pushedLeads: number;

  // Rates
  enrichmentHitRate: number;  // 0-100%
  skipTraceHitRate: number;   // 0-100%
  averageScore: number;       // 0-100

  // Timing
  startedAt: Date;
  estimatedCompletion?: Date;
  currentThroughput: number;  // leads/minute

  // Costs
  enrichmentCost: number;     // dollars
  skipTraceCost: number;      // dollars
  totalCost: number;          // dollars

  // Errors
  errorCount: number;
  warningCount: number;
}
```

---

## 3. DATA FLOW ARCHITECTURE

### 3.1 Real-Time Updates (WebSocket)

```typescript
// lib/websocket/pipeline-events.ts

type PipelineEvent =
  | { type: 'run:started'; runId: string; sectorId: string }
  | { type: 'run:progress'; runId: string; progress: number; stage: string }
  | { type: 'block:started'; runId: string; blockId: string; stage: string }
  | { type: 'block:progress'; runId: string; blockId: string; processed: number; total: number }
  | { type: 'block:completed'; runId: string; blockId: string; metrics: BlockMetrics }
  | { type: 'block:failed'; runId: string; blockId: string; error: string }
  | { type: 'run:completed'; runId: string; summary: RunSummary }
  | { type: 'run:failed'; runId: string; error: string; lastStage: string };

// WebSocket connection pattern
const usePipelineEvents = (runId?: string) => {
  const [events, setEvents] = useState<PipelineEvent[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`wss://${host}/ws/pipelines`);

    ws.onmessage = (event) => {
      const data: PipelineEvent = JSON.parse(event.data);

      // Filter by runId if specified
      if (runId && 'runId' in data && data.runId !== runId) return;

      setEvents(prev => [...prev, data]);
    };

    return () => ws.close();
  }, [runId]);

  return events;
};
```

### 3.2 API Endpoints

```typescript
// Pipeline List
GET /api/pipelines
Query: { status?: string; sectorId?: string; limit?: number; offset?: number }
Response: { runs: PipelineRun[]; total: number; hasMore: boolean }

// Pipeline Detail
GET /api/pipelines/:runId
Response: PipelineRun & { blocks: BlockExecution[]; artifacts: Artifact[] }

// Pipeline Metrics (Real-time)
GET /api/pipelines/:runId/metrics
Response: PipelineMetrics

// Start New Pipeline
POST /api/pipelines
Body: { sectorId: string; options?: PipelineOptions }
Response: { runId: string; status: 'queued' }

// Pipeline Control
POST /api/pipelines/:runId/pause
POST /api/pipelines/:runId/resume
POST /api/pipelines/:runId/cancel
DELETE /api/pipelines/:runId

// Artifact Download
GET /api/pipelines/:runId/artifacts/:artifactId
Response: Presigned URL or direct download
```

### 3.3 Database Queries

```typescript
// Get active runs with progress
const getActiveRuns = async (tenantId: string) => {
  return db.select({
    runId: pipelineRuns.id,
    sectorId: pipelineRuns.sectorId,
    sectorName: sectors.name,
    status: pipelineRuns.status,
    progress: pipelineRuns.progress,
    currentStage: pipelineRuns.currentStage,
    startedAt: pipelineRuns.startedAt,
    totalLeads: pipelineRuns.totalLeads,
    processedLeads: pipelineRuns.processedLeads,
  })
  .from(pipelineRuns)
  .leftJoin(sectors, eq(sectors.id, pipelineRuns.sectorId))
  .where(and(
    eq(pipelineRuns.tenantId, tenantId),
    inArray(pipelineRuns.status, ['queued', 'running', 'paused'])
  ))
  .orderBy(desc(pipelineRuns.startedAt));
};

// Get block executions for run
const getBlockExecutions = async (runId: string) => {
  return db.select()
    .from(blockExecutions)
    .where(eq(blockExecutions.runId, runId))
    .orderBy(asc(blockExecutions.blockNumber));
};
```

---

## 4. UI STATE MANAGEMENT

### 4.1 Zustand Store

```typescript
// stores/pipeline-store.ts
interface PipelineStore {
  // State
  runs: Map<string, PipelineRun>;
  activeRunIds: string[];
  selectedRunId: string | null;
  filter: PipelineFilter;

  // Actions
  setRuns: (runs: PipelineRun[]) => void;
  updateRunProgress: (runId: string, progress: Partial<PipelineRun>) => void;
  selectRun: (runId: string | null) => void;
  setFilter: (filter: PipelineFilter) => void;

  // Computed
  getRunById: (runId: string) => PipelineRun | undefined;
  getActiveRuns: () => PipelineRun[];
  getCompletedRuns: () => PipelineRun[];
  getFailedRuns: () => PipelineRun[];
}

interface PipelineFilter {
  status?: PipelineStatus[];
  sectorId?: string;
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
}
```

### 4.2 React Query Integration

```typescript
// hooks/use-pipelines.ts
export const usePipelines = (filter?: PipelineFilter) => {
  return useQuery({
    queryKey: ['pipelines', filter],
    queryFn: () => fetchPipelines(filter),
    refetchInterval: 5000, // Poll every 5s for non-WebSocket fallback
    staleTime: 2000,
  });
};

export const usePipelineDetail = (runId: string) => {
  return useQuery({
    queryKey: ['pipeline', runId],
    queryFn: () => fetchPipelineDetail(runId),
    refetchInterval: (data) =>
      data?.status === 'running' ? 2000 : false, // Fast polling when running
  });
};

export const usePipelineMetrics = (runId: string) => {
  return useQuery({
    queryKey: ['pipeline-metrics', runId],
    queryFn: () => fetchPipelineMetrics(runId),
    refetchInterval: 1000, // 1s for real-time feel
    enabled: !!runId,
  });
};
```

---

## 5. ERROR HANDLING UI

### 5.1 Error States Display

```tsx
// components/pipeline/error-display.tsx
interface PipelineError {
  code: string;
  message: string;
  stage: string;
  blockId?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  occurredAt: Date;
}

// Error code categories
const errorCategories = {
  RATE_LIMIT: { icon: '⏱', label: 'Rate Limited', action: 'Retry after delay' },
  API_ERROR: { icon: '🔌', label: 'API Error', action: 'Check provider status' },
  VALIDATION: { icon: '⚠', label: 'Validation', action: 'Review input data' },
  AUTH: { icon: '🔒', label: 'Auth Failed', action: 'Check credentials' },
  TIMEOUT: { icon: '⏰', label: 'Timeout', action: 'Retry with smaller batch' },
  INTERNAL: { icon: '🔥', label: 'Internal Error', action: 'Contact support' },
};
```

### 5.2 Failed Block Recovery

```tsx
// components/pipeline/failed-block-recovery.tsx
interface FailedBlockRecoveryProps {
  runId: string;
  blockId: string;
  error: PipelineError;
  failedLeadIds: string[];
  onRetry: () => void;
  onSkip: () => void;
  onAbort: () => void;
}

// UI Actions:
// [Retry Block] - Re-run just this block
// [Skip & Continue] - Mark as skipped, continue pipeline
// [Abort Pipeline] - Stop entire pipeline
// [Export Failed] - Download failed leads for manual review
```

---

## 6. NOTIFICATIONS

### 6.1 Toast Notifications

```typescript
// Pipeline completion toast
showToast({
  type: 'success',
  title: 'Pipeline Complete',
  message: `${run.sectorName}: ${run.processedLeads} leads processed`,
  action: {
    label: 'View Results',
    onClick: () => router.push(`/admin/pipelines/${run.id}`),
  },
});

// Pipeline failure toast
showToast({
  type: 'error',
  title: 'Pipeline Failed',
  message: `${run.sectorName}: ${error.message}`,
  action: {
    label: 'View Details',
    onClick: () => router.push(`/admin/pipelines/${run.id}`),
  },
  persistent: true, // Don't auto-dismiss
});
```

### 6.2 Browser Push Notifications

```typescript
// Enable for long-running pipelines
if (Notification.permission === 'granted' && document.hidden) {
  new Notification('Pipeline Complete', {
    body: `${sectorName}: ${processedLeads} leads ready`,
    icon: '/icons/pipeline-complete.png',
    tag: `pipeline-${runId}`,
  });
}
```

---

## 7. MOBILE RESPONSIVE DESIGN

### 7.1 Breakpoints

```scss
// Responsive behavior
@media (max-width: 768px) {
  // Pipeline list: Card layout instead of table
  // Flow visualization: Vertical instead of horizontal
  // Metrics: 2-column grid instead of 4
  // Block log: Collapsed by default, expand on tap
}

@media (max-width: 480px) {
  // Single column layout
  // Hide secondary metrics
  // Simplified progress display
}
```

### 7.2 Touch Interactions

```typescript
// Swipe to reveal actions on mobile
const swipeActions = [
  { label: 'Pause', icon: '⏸', action: pausePipeline },
  { label: 'Cancel', icon: '✗', action: cancelPipeline, destructive: true },
];
```

---

## 8. ACCESSIBILITY

### 8.1 ARIA Labels

```tsx
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Pipeline progress: ${progress}% complete, ${processedLeads} of ${totalLeads} leads`}
>
  <div className="progress-fill" style={{ width: `${progress}%` }} />
</div>
```

### 8.2 Keyboard Navigation

```typescript
// Keyboard shortcuts
const shortcuts = {
  'r': 'Refresh pipeline list',
  'n': 'Start new pipeline',
  'p': 'Pause selected pipeline',
  'Escape': 'Close detail view',
  'ArrowUp/Down': 'Navigate pipeline list',
  'Enter': 'View pipeline details',
};
```

---

## 9. IMPLEMENTATION CHECKLIST

### Phase 1: Core Components
- [ ] StatusBadge component
- [ ] ProgressBar component
- [ ] Pipeline list table
- [ ] Basic filtering (status, sector)

### Phase 2: Detail View
- [ ] Flow visualization
- [ ] Block execution log
- [ ] Metrics panel
- [ ] Artifact list with download

### Phase 3: Real-Time Updates
- [ ] WebSocket integration
- [ ] Live progress updates
- [ ] Toast notifications
- [ ] Browser push notifications

### Phase 4: Error Handling
- [ ] Error display component
- [ ] Failed block recovery UI
- [ ] Retry/Skip/Abort controls

### Phase 5: Polish
- [ ] Mobile responsive design
- [ ] Accessibility audit
- [ ] Keyboard shortcuts
- [ ] Performance optimization

---

*Document generated for OutreachGlobal Platform Architecture*
