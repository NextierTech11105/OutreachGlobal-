/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PIPELINE WORKFLOW ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Declarative pipeline definitions for the DEAL ORIGINATION MACHINE.
 * Pipelines define the stages, transitions, and conditions for entity progression.
 *
 * CORE PIPELINES:
 *   • LEAD_QUALIFICATION  → USBizData → Validated Lead
 *   • OUTREACH_SEQUENCE   → Lead → 10-touch engagement
 *   • CONVERSATION_FLOW   → Inbound → Response → Outcome
 *   • DEAL_PROGRESSION    → Opportunity → Booked → Closed
 *
 * STAGE TYPES:
 *   • entry      → Pipeline entry point (only one per pipeline)
 *   • process    → Standard processing stage
 *   • decision   → Branching based on conditions
 *   • parallel   → Multiple paths executed concurrently
 *   • wait       → Pause for event/timeout
 *   • exit       → Pipeline completion
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { nanoid } from "nanoid";
import { EventType, EventFactory, eventBus, PipelinePayload } from "./events";

// ─────────────────────────────────────────────────────────────────────────────
// CONDITION TYPES (inline until ./conditions.ts is created)
// ─────────────────────────────────────────────────────────────────────────────

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

export interface Condition {
  type: ConditionType;
  field?: string;
  operator?: ConditionOperator;
  value?: unknown;
  conditions?: Condition[];
  negate?: boolean;
}

export interface ConditionResult {
  passed: boolean;
  reason?: string;
}

// Simple condition evaluator
export class ConditionEvaluator {
  static evaluate(
    condition: Condition,
    data: Record<string, unknown>,
  ): ConditionResult {
    switch (condition.type) {
      case "comparison":
        return this.evaluateComparison(condition, data);
      case "exists":
        return this.evaluateExists(condition, data);
      case "and":
        return this.evaluateAnd(condition, data);
      case "or":
        return this.evaluateOr(condition, data);
      default:
        return {
          passed: false,
          reason: `Unknown condition type: ${condition.type}`,
        };
    }
  }

  private static evaluateComparison(
    condition: Condition,
    data: Record<string, unknown>,
  ): ConditionResult {
    const fieldValue = condition.field ? data[condition.field] : undefined;
    const targetValue = condition.value;
    let passed = false;

    switch (condition.operator) {
      case "eq":
        passed = fieldValue === targetValue;
        break;
      case "neq":
        passed = fieldValue !== targetValue;
        break;
      case "gt":
        passed = (fieldValue as number) > (targetValue as number);
        break;
      case "gte":
        passed = (fieldValue as number) >= (targetValue as number);
        break;
      case "lt":
        passed = (fieldValue as number) < (targetValue as number);
        break;
      case "lte":
        passed = (fieldValue as number) <= (targetValue as number);
        break;
      case "in":
        passed = Array.isArray(targetValue) && targetValue.includes(fieldValue);
        break;
      case "contains":
        passed = String(fieldValue).includes(String(targetValue));
        break;
      default:
        passed = false;
    }

    return { passed: condition.negate ? !passed : passed };
  }

  private static evaluateExists(
    condition: Condition,
    data: Record<string, unknown>,
  ): ConditionResult {
    const exists = condition.field
      ? data[condition.field] !== undefined && data[condition.field] !== null
      : false;
    const passed = condition.negate ? !exists : exists;
    return { passed };
  }

  private static evaluateAnd(
    condition: Condition,
    data: Record<string, unknown>,
  ): ConditionResult {
    if (!condition.conditions)
      return { passed: false, reason: "No conditions for AND" };
    const allPassed = condition.conditions.every(
      (c) => this.evaluate(c, data).passed,
    );
    return { passed: condition.negate ? !allPassed : allPassed };
  }

  private static evaluateOr(
    condition: Condition,
    data: Record<string, unknown>,
  ): ConditionResult {
    if (!condition.conditions)
      return { passed: false, reason: "No conditions for OR" };
    const anyPassed = condition.conditions.some(
      (c) => this.evaluate(c, data).passed,
    );
    return { passed: condition.negate ? !anyPassed : anyPassed };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StageType =
  | "entry"
  | "process"
  | "decision"
  | "parallel"
  | "wait"
  | "exit";

export interface StageTransition {
  to: string; // Target stage ID
  condition?: Condition; // Optional condition for this transition
  priority?: number; // Lower = higher priority when multiple match
  label?: string; // Human-readable label for the transition
}

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  description?: string;
  agent?: "luci" | "gianna" | "cathy" | "sabrina" | "system";

  // Entry actions when stage is entered
  onEnter?: (context: PipelineContext) => Promise<void>;

  // Exit actions when stage is exited
  onExit?: (context: PipelineContext) => Promise<void>;

  // Main processing logic
  execute?: (context: PipelineContext) => Promise<StageResult>;

  // Transitions to next stages
  transitions: StageTransition[];

  // For 'wait' stages: what triggers resumption
  waitFor?: {
    event?: EventType; // Resume on this event
    timeout?: number; // Resume after timeout (ms)
    condition?: Condition; // Resume when condition is met
  };

  // For 'parallel' stages: stages to run concurrently
  parallel?: string[];

  // Retry configuration
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier?: number;
  };

  // Timeout for stage execution
  timeoutMs?: number;

  // Metadata
  metadata?: Record<string, unknown>;
}

export interface StageResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  nextStage?: string; // Explicit next stage (overrides conditions)
  shouldRetry?: boolean;
}

export interface PipelineConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
  entityType: "record" | "lead" | "contact" | "deal" | "campaign";
  stages: PipelineStage[];

  // Global pipeline settings
  settings?: {
    maxDuration?: number; // Max pipeline execution time (ms)
    enableRetry?: boolean; // Global retry enable
    enableLogging?: boolean; // Log all stage transitions
    enableMetrics?: boolean; // Collect execution metrics
  };

  // Hooks
  onStart?: (context: PipelineContext) => Promise<void>;
  onComplete?: (
    context: PipelineContext,
    result: PipelineResult,
  ) => Promise<void>;
  onError?: (context: PipelineContext, error: Error) => Promise<void>;
}

export interface Pipeline extends PipelineConfig {
  entryStage: string;
  stageMap: Map<string, PipelineStage>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineContext {
  executionId: string;
  pipelineId: string;
  pipelineName: string;
  entityId: string;
  entityType: string;

  // State
  currentStage: string;
  previousStages: string[];
  startedAt: string;
  stageEnteredAt: string;

  // Data bag - accumulates through pipeline
  data: Record<string, unknown>;

  // Execution state
  retryCount: number;
  isParallel: boolean;
  parallelResults?: Record<string, StageResult>;

  // Correlation for event tracking
  correlationId: string;

  // Helper methods
  setData: (key: string, value: unknown) => void;
  getData: <T>(key: string) => T | undefined;
  emit: (type: EventType, payload: Record<string, unknown>) => Promise<void>;
}

export interface PipelineResult {
  executionId: string;
  pipelineId: string;
  success: boolean;
  finalStage: string;
  stages: Array<{
    stageId: string;
    enteredAt: string;
    exitedAt: string;
    durationMs: number;
    result: StageResult;
  }>;
  data: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class PipelineEngine {
  private pipelines: Map<string, Pipeline> = new Map();
  private executions: Map<string, PipelineContext> = new Map();
  private waitingExecutions: Map<
    string,
    { executionId: string; waitFor: PipelineStage["waitFor"] }
  > = new Map();

  constructor() {
    // Listen for events that might resume waiting pipelines
    eventBus.subscribe("*", async (event) => {
      this.checkWaitingExecutions(event.metadata.type);
    });
  }

  // Register a pipeline definition
  register(config: PipelineConfig): Pipeline {
    // Find entry stage
    const entryStage = config.stages.find((s) => s.type === "entry");
    if (!entryStage) {
      throw new Error(`Pipeline ${config.id} must have an entry stage`);
    }

    // Build stage map
    const stageMap = new Map<string, PipelineStage>();
    config.stages.forEach((stage) => stageMap.set(stage.id, stage));

    // Validate transitions
    config.stages.forEach((stage) => {
      stage.transitions.forEach((t) => {
        if (!stageMap.has(t.to)) {
          throw new Error(
            `Invalid transition: ${stage.id} -> ${t.to} (stage not found)`,
          );
        }
      });
    });

    const pipeline: Pipeline = {
      ...config,
      entryStage: entryStage.id,
      stageMap,
    };

    this.pipelines.set(config.id, pipeline);
    return pipeline;
  }

  // Execute a pipeline for an entity
  async execute(
    pipelineId: string,
    entityId: string,
    initialData: Record<string, unknown> = {},
  ): Promise<PipelineResult> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    const executionId = `exec_${nanoid()}`;
    const correlationId = nanoid();
    const startedAt = new Date().toISOString();

    // Create context
    const context: PipelineContext = {
      executionId,
      pipelineId,
      pipelineName: pipeline.name,
      entityId,
      entityType: pipeline.entityType,
      currentStage: pipeline.entryStage,
      previousStages: [],
      startedAt,
      stageEnteredAt: startedAt,
      data: { ...initialData },
      retryCount: 0,
      isParallel: false,
      correlationId,
      setData: (key, value) => {
        context.data[key] = value;
      },
      getData: <T>(key: string) => context.data[key] as T | undefined,
      emit: async (type, payload) => {
        const event = EventFactory.createEvent(
          type,
          { entityType: pipeline.entityType as any, entityId },
          { ...payload, executionId, pipelineId },
          { agent: "system", stage: context.currentStage },
          correlationId,
        );
        await eventBus.emit(event);
      },
    };

    this.executions.set(executionId, context);

    // Emit pipeline started
    await context.emit("pipeline.started", { pipelineName: pipeline.name });

    // Run onStart hook
    if (pipeline.onStart) {
      await pipeline.onStart(context);
    }

    // Execute stages
    const stageHistory: PipelineResult["stages"] = [];
    let success = true;
    let error: string | undefined;

    try {
      while (true) {
        const stage = pipeline.stageMap.get(context.currentStage);
        if (!stage) {
          throw new Error(`Stage not found: ${context.currentStage}`);
        }

        const stageStart = new Date().toISOString();
        context.stageEnteredAt = stageStart;

        // Emit stage entered
        await context.emit("pipeline.stage_entered", {
          stage: stage.id,
          stageName: stage.name,
          previousStage:
            context.previousStages[context.previousStages.length - 1],
        });

        // Run onEnter
        if (stage.onEnter) {
          await stage.onEnter(context);
        }

        // Execute stage
        let result: StageResult = { success: true };

        if (stage.type === "wait") {
          // Handle wait stage
          result = await this.handleWaitStage(stage, context);
        } else if (stage.type === "parallel") {
          // Handle parallel execution
          result = await this.handleParallelStage(stage, context, pipeline);
        } else if (stage.execute) {
          // Normal execution with timeout
          result = await this.executeWithTimeout(
            stage.execute(context),
            stage.timeoutMs || 30000,
          );
        }

        const stageEnd = new Date().toISOString();

        // Record stage execution
        stageHistory.push({
          stageId: stage.id,
          enteredAt: stageStart,
          exitedAt: stageEnd,
          durationMs:
            new Date(stageEnd).getTime() - new Date(stageStart).getTime(),
          result,
        });

        // Run onExit
        if (stage.onExit) {
          await stage.onExit(context);
        }

        // Emit stage completed
        await context.emit("pipeline.stage_completed", {
          stage: stage.id,
          success: result.success,
        });

        // Handle retry
        if (!result.success && result.shouldRetry && stage.retry) {
          if (context.retryCount < stage.retry.maxAttempts) {
            context.retryCount++;
            const backoff =
              stage.retry.backoffMs *
              Math.pow(
                stage.retry.backoffMultiplier || 2,
                context.retryCount - 1,
              );
            await this.sleep(backoff);
            await context.emit("pipeline.retry", {
              stage: stage.id,
              attempt: context.retryCount,
            });
            continue;
          }
        }

        // Reset retry count on success
        if (result.success) {
          context.retryCount = 0;
        }

        // Check for exit
        if (stage.type === "exit" || (!result.success && !result.shouldRetry)) {
          success = result.success;
          if (!result.success) {
            error = result.error;
          }
          break;
        }

        // Determine next stage
        let nextStage: string | undefined = result.nextStage;

        if (!nextStage) {
          nextStage = await this.evaluateTransitions(
            stage.transitions,
            context,
          );
        }

        if (!nextStage) {
          throw new Error(`No valid transition from stage: ${stage.id}`);
        }

        // Move to next stage
        context.previousStages.push(context.currentStage);
        context.currentStage = nextStage;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);

      if (pipeline.onError) {
        await pipeline.onError(
          context,
          err instanceof Error ? err : new Error(String(err)),
        );
      }

      await context.emit("pipeline.failed", { error });
    }

    const completedAt = new Date().toISOString();

    const pipelineResult: PipelineResult = {
      executionId,
      pipelineId,
      success,
      finalStage: context.currentStage,
      stages: stageHistory,
      data: context.data,
      startedAt,
      completedAt,
      durationMs:
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      error,
    };

    // Run onComplete hook
    if (pipeline.onComplete) {
      await pipeline.onComplete(context, pipelineResult);
    }

    await context.emit("pipeline.completed", {
      success,
      finalStage: context.currentStage,
      durationMs: pipelineResult.durationMs,
    });

    // Cleanup
    this.executions.delete(executionId);

    return pipelineResult;
  }

  private async handleWaitStage(
    stage: PipelineStage,
    context: PipelineContext,
  ): Promise<StageResult> {
    if (!stage.waitFor) {
      return { success: true };
    }

    // For now, just handle timeout-based waits
    if (stage.waitFor.timeout) {
      await this.sleep(stage.waitFor.timeout);
      return { success: true };
    }

    // Register for event-based wait
    if (stage.waitFor.event) {
      this.waitingExecutions.set(context.executionId, {
        executionId: context.executionId,
        waitFor: stage.waitFor,
      });
      // In a real implementation, this would suspend execution
      // For now, we'll poll
      await this.sleep(1000);
      return { success: true };
    }

    return { success: true };
  }

  private async handleParallelStage(
    stage: PipelineStage,
    context: PipelineContext,
    pipeline: Pipeline,
  ): Promise<StageResult> {
    if (!stage.parallel || stage.parallel.length === 0) {
      return { success: true };
    }

    const parallelPromises = stage.parallel.map(async (stageId) => {
      const parallelStage = pipeline.stageMap.get(stageId);
      if (!parallelStage || !parallelStage.execute) {
        return {
          stageId,
          result: { success: false, error: "Stage not found" } as StageResult,
        };
      }

      const parallelContext = { ...context, isParallel: true };
      const result = await parallelStage.execute(parallelContext);
      return { stageId, result };
    });

    const results = await Promise.all(parallelPromises);

    context.parallelResults = {};
    results.forEach(({ stageId, result }) => {
      context.parallelResults![stageId] = result;
    });

    const allSuccess = results.every((r) => r.result.success);
    return {
      success: allSuccess,
      data: context.parallelResults,
    };
  }

  private async evaluateTransitions(
    transitions: StageTransition[],
    context: PipelineContext,
  ): Promise<string | undefined> {
    // Sort by priority
    const sorted = [...transitions].sort(
      (a, b) => (a.priority || 0) - (b.priority || 0),
    );

    for (const transition of sorted) {
      if (!transition.condition) {
        return transition.to;
      }

      // Evaluate condition
      const result = await this.evaluateCondition(
        transition.condition,
        context,
      );
      if (result.passed) {
        return transition.to;
      }
    }

    return undefined;
  }

  private async evaluateCondition(
    condition: Condition,
    context: PipelineContext,
  ): Promise<ConditionResult> {
    // Use inline ConditionEvaluator (defined above)
    return ConditionEvaluator.evaluate(condition, context.data);
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Stage execution timeout")),
          timeoutMs,
        ),
      ),
    ]);
  }

  private checkWaitingExecutions(eventType: EventType): void {
    for (const [execId, waiting] of this.waitingExecutions) {
      if (waiting.waitFor?.event === eventType) {
        this.waitingExecutions.delete(execId);
        // Resume execution - in real implementation, this would trigger resumption
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get execution status
  getExecution(executionId: string): PipelineContext | undefined {
    return this.executions.get(executionId);
  }

  // Get all registered pipelines
  getPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }
}

// Singleton instance
export const pipelineEngine = new PipelineEngine();

// ─────────────────────────────────────────────────────────────────────────────
// PREDEFINED PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

export const PIPELINE_CONFIGS = {
  // Lead Qualification Pipeline
  LEAD_QUALIFICATION: {
    id: "lead-qualification",
    name: "Lead Qualification Pipeline",
    version: "1.0.0",
    description: "USBizData record → Qualified Lead with verified mobile",
    entityType: "record" as const,
    stages: [
      {
        id: "entry",
        name: "Pipeline Entry",
        type: "entry" as const,
        description: "Raw record enters qualification pipeline",
        agent: "luci" as const,
        transitions: [{ to: "validate-apollo" }],
      },
      {
        id: "validate-apollo",
        name: "Apollo Validation",
        type: "process" as const,
        description: "Validate company exists via Apollo.io",
        agent: "luci" as const,
        transitions: [
          {
            to: "skip-trace",
            condition: {
              type: "comparison" as const,
              field: "apolloValidated",
              operator: "eq",
              value: true,
            },
          },
          {
            to: "disqualified",
            condition: {
              type: "comparison" as const,
              field: "apolloValidated",
              operator: "eq",
              value: false,
            },
          },
        ],
        retry: { maxAttempts: 3, backoffMs: 1000 },
        timeoutMs: 10000,
      },
      {
        id: "skip-trace",
        name: "Skip Trace",
        type: "process" as const,
        description: "Find owner mobile via RealEstateAPI",
        agent: "luci" as const,
        transitions: [
          {
            to: "verify-twilio",
            condition: { type: "exists" as const, field: "mobilePhone" },
          },
          {
            to: "disqualified",
            condition: {
              type: "exists" as const,
              field: "mobilePhone",
              negate: true,
            },
          },
        ],
        retry: { maxAttempts: 2, backoffMs: 2000 },
        timeoutMs: 15000,
      },
      {
        id: "verify-twilio",
        name: "Twilio Verification",
        type: "process" as const,
        description: "Confirm mobile via Twilio Lookup",
        agent: "luci" as const,
        transitions: [
          {
            to: "qualified",
            condition: {
              type: "and" as const,
              conditions: [
                {
                  type: "comparison" as const,
                  field: "twilioLineType",
                  operator: "eq",
                  value: "mobile",
                },
                {
                  type: "comparison" as const,
                  field: "isConnected",
                  operator: "eq",
                  value: true,
                },
              ],
            },
          },
          { to: "disqualified", priority: 1 },
        ],
        retry: { maxAttempts: 2, backoffMs: 1000 },
        timeoutMs: 5000,
      },
      {
        id: "qualified",
        name: "Lead Qualified",
        type: "exit" as const,
        description: "Record became a qualified lead",
        agent: "luci" as const,
        transitions: [],
      },
      {
        id: "disqualified",
        name: "Disqualified",
        type: "exit" as const,
        description: "Record did not meet qualification criteria",
        agent: "luci" as const,
        transitions: [],
      },
    ],
  },

  // Outreach Sequence Pipeline
  OUTREACH_SEQUENCE: {
    id: "outreach-sequence",
    name: "10-Touch 30-Day Outreach",
    version: "1.0.0",
    description: "Multi-touch lead engagement sequence",
    entityType: "lead" as const,
    stages: [
      {
        id: "entry",
        name: "Sequence Start",
        type: "entry" as const,
        agent: "gianna" as const,
        transitions: [{ to: "touch-1" }],
      },
      {
        id: "touch-1",
        name: "Initial SMS",
        type: "process" as const,
        agent: "gianna" as const,
        transitions: [
          {
            to: "responded",
            condition: {
              type: "comparison" as const,
              field: "hasResponse",
              operator: "eq",
              value: true,
            },
          },
          { to: "wait-touch-2" },
        ],
      },
      {
        id: "wait-touch-2",
        name: "Wait 2 Days",
        type: "wait" as const,
        waitFor: { timeout: 2 * 24 * 60 * 60 * 1000 }, // 2 days
        transitions: [{ to: "touch-2" }],
      },
      {
        id: "touch-2",
        name: "Follow-up Call",
        type: "process" as const,
        agent: "gianna" as const,
        transitions: [
          {
            to: "responded",
            condition: {
              type: "comparison" as const,
              field: "hasResponse",
              operator: "eq",
              value: true,
            },
          },
          { to: "wait-touch-3" },
        ],
      },
      // ... additional touches would continue here
      {
        id: "responded",
        name: "Lead Responded",
        type: "decision" as const,
        agent: "gianna" as const,
        transitions: [
          {
            to: "positive-response",
            condition: {
              type: "comparison" as const,
              field: "sentiment",
              operator: "eq",
              value: "positive",
            },
          },
          {
            to: "negative-response",
            condition: {
              type: "comparison" as const,
              field: "sentiment",
              operator: "eq",
              value: "negative",
            },
          },
          { to: "neutral-response" },
        ],
      },
      {
        id: "positive-response",
        name: "Positive Response",
        type: "exit" as const,
        agent: "sabrina" as const,
        transitions: [],
      },
      {
        id: "negative-response",
        name: "Opted Out",
        type: "exit" as const,
        transitions: [],
      },
      {
        id: "neutral-response",
        name: "Neutral - Continue",
        type: "process" as const,
        agent: "cathy" as const,
        transitions: [{ to: "nudge-sequence" }],
      },
      {
        id: "nudge-sequence",
        name: "Nudge Sequence",
        type: "process" as const,
        agent: "cathy" as const,
        transitions: [
          {
            to: "positive-response",
            condition: {
              type: "comparison" as const,
              field: "sentiment",
              operator: "eq",
              value: "positive",
            },
          },
          { to: "sequence-complete" },
        ],
      },
      {
        id: "sequence-complete",
        name: "Sequence Complete",
        type: "exit" as const,
        transitions: [],
      },
      {
        id: "wait-touch-3",
        name: "Wait for Touch 3",
        type: "wait" as const,
        waitFor: { timeout: 2 * 24 * 60 * 60 * 1000 },
        transitions: [{ to: "sequence-complete" }], // Simplified for now
      },
    ],
  },

  // Inbound Response Pipeline
  INBOUND_RESPONSE: {
    id: "inbound-response",
    name: "Inbound Response Handler",
    version: "1.0.0",
    description: "Process and route inbound SMS/calls",
    entityType: "contact" as const,
    stages: [
      {
        id: "entry",
        name: "Message Received",
        type: "entry" as const,
        agent: "gianna" as const,
        transitions: [{ to: "analyze-intent" }],
      },
      {
        id: "analyze-intent",
        name: "Analyze Intent",
        type: "process" as const,
        agent: "gianna" as const,
        description: "AI classification of message intent",
        transitions: [
          {
            to: "handle-opt-out",
            condition: {
              type: "comparison" as const,
              field: "intent",
              operator: "in",
              value: ["stop", "unsubscribe", "opt_out"],
            },
          },
          {
            to: "handle-interested",
            condition: {
              type: "comparison" as const,
              field: "intent",
              operator: "in",
              value: ["interested", "yes", "tell_me_more"],
            },
          },
          {
            to: "handle-question",
            condition: {
              type: "comparison" as const,
              field: "intent",
              operator: "in",
              value: ["question", "info"],
            },
          },
          {
            to: "handle-objection",
            condition: {
              type: "comparison" as const,
              field: "intent",
              operator: "in",
              value: ["not_interested", "objection"],
            },
          },
          { to: "handle-unknown" },
        ],
      },
      {
        id: "handle-opt-out",
        name: "Handle Opt-Out",
        type: "process" as const,
        agent: "system" as const,
        transitions: [{ to: "exit-opted-out" }],
      },
      {
        id: "handle-interested",
        name: "Handle Interest",
        type: "process" as const,
        agent: "sabrina" as const,
        description: "Route to Sabrina for booking",
        transitions: [{ to: "exit-qualified" }],
      },
      {
        id: "handle-question",
        name: "Handle Question",
        type: "process" as const,
        agent: "gianna" as const,
        transitions: [{ to: "exit-engaged" }],
      },
      {
        id: "handle-objection",
        name: "Handle Objection",
        type: "process" as const,
        agent: "cathy" as const,
        description: "Route to Cathy for objection handling",
        transitions: [{ to: "exit-nurture" }],
      },
      {
        id: "handle-unknown",
        name: "Handle Unknown",
        type: "process" as const,
        agent: "gianna" as const,
        transitions: [{ to: "exit-engaged" }],
      },
      {
        id: "exit-opted-out",
        name: "Opted Out",
        type: "exit" as const,
        transitions: [],
      },
      {
        id: "exit-qualified",
        name: "Qualified Lead",
        type: "exit" as const,
        transitions: [],
      },
      {
        id: "exit-engaged",
        name: "Engaged",
        type: "exit" as const,
        transitions: [],
      },
      {
        id: "exit-nurture",
        name: "Nurture",
        type: "exit" as const,
        transitions: [],
      },
    ],
  },
};
