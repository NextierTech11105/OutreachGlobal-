/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED ORCHESTRATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Central nervous system for the DEAL ORIGINATION MACHINE.
 * Tracks every ID-based entity through the entire pipeline lifecycle.
 *
 * ARCHITECTURE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │                     ORCHESTRATION LAYER                                 │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │                                                                         │
 *   │   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
 *   │   │  EVENTS  │ →  │ PIPELINES│ →  │EXECUTIONS│ →  │ AGENTS   │        │
 *   │   └──────────┘    └──────────┘    └──────────┘    └──────────┘        │
 *   │       ↓                ↓                ↓                ↓            │
 *   │   ┌──────────────────────────────────────────────────────────────┐    │
 *   │   │                 OBSERVABILITY LAYER                          │    │
 *   │   │  • Event Logs    • Metrics    • Traces    • Alerts          │    │
 *   │   └──────────────────────────────────────────────────────────────┘    │
 *   │                                                                         │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * ID ENTITIES TRACKED:
 *   • RecordID   → Raw USBizData record (pre-qualification)
 *   • LeadID     → Qualified lead with verified mobile
 *   • ContactID  → Lead with conversation history
 *   • DealID     → Lead progressing toward engagement letter
 *   • CampaignID → SMS/Email campaign batch
 *   • SessionID  → Conversation thread
 *   • ExecutionID → Pipeline run instance
 *
 * AGENTS IN PIPELINE:
 *   LUCI    → Data sourcing & qualification
 *   GIANNA  → Initial outreach & inbound handling
 *   CATHY   → Follow-up nudging
 *   SABRINA → Aggressive closing & booking
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Core exports - only export what exists
export * from "./events";
export * from "./pipeline";

// Re-export types from events
export type {
  OrchestrationEvent,
  EventType,
  EventPayload,
  EventMetadata,
} from "./events";

// Re-export types from pipeline
export type {
  Pipeline,
  PipelineStage,
  PipelineConfig,
  StageTransition,
  PipelineContext,
  PipelineResult,
} from "./pipeline";

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER TYPES - To be implemented in future modules
// ─────────────────────────────────────────────────────────────────────────────

// Execution types (TODO: implement ./execution.ts)
export interface Execution {
  id: string;
  pipelineId: string;
  entityId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
}

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "paused";

export interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionContext {
  executionId: string;
  pipelineId: string;
  entityId: string;
  data: Record<string, unknown>;
}

// Condition types (TODO: implement ./conditions.ts)
export interface Condition {
  type: ConditionType;
  field?: string;
  operator?: ConditionOperator;
  value?: unknown;
  conditions?: Condition[];
  negate?: boolean;
}

export type ConditionType =
  | "comparison"
  | "exists"
  | "and"
  | "or"
  | "not"
  | "custom";
export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "startsWith"
  | "endsWith";

export interface ConditionResult {
  passed: boolean;
  reason?: string;
}

// Observability types (TODO: implement ./observability.ts)
export interface Metric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
}

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface Trace {
  traceId: string;
  spans: Span[];
}

export interface Span {
  spanId: string;
  name: string;
  startTime: string;
  endTime?: string;
  status: "ok" | "error";
}

// Agent Coordinator types (TODO: implement ./coordinator.ts)
export interface AgentCoordination {
  fromAgent: string;
  toAgent: string;
  reason: string;
  timestamp: string;
}

export interface HandoffRequest {
  sessionId: string;
  leadId: string;
  fromAgent: "luci" | "gianna" | "cathy" | "sabrina";
  toAgent: "luci" | "gianna" | "cathy" | "sabrina";
  context: Record<string, unknown>;
}

export interface HandoffResult {
  success: boolean;
  handoffId?: string;
  error?: string;
}

export interface AgentAssignment {
  agentId: string;
  leadId: string;
  assignedAt: string;
  reason: string;
}
