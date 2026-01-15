/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI AUDIT SERVICE - Decision Logging & Cost Tracking
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides centralized logging for all AI decisions including:
 * - Token usage tracking for cost analysis
 * - Input sanitization audit trail
 * - Output validation results
 * - Human override tracking
 * - Performance metrics (latency, retries)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { aiDecisionLogs } from "@/lib/db/schema";
import { Logger } from "@/lib/logger";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL PRICING (per 1M tokens) - Updated Jan 2025
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  "claude-3-sonnet": { input: 3, output: 15 },
  "claude-3-opus": { input: 15, output: 75 },
  "llama-3.1-sonar-small-128k-online": { input: 0.2, output: 0.2 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AIWorker = "gianna" | "cathy" | "sabrina" | "luci" | "copilot" | "system";

export interface AuditLogInput {
  leadId: string;
  workerId: AIWorker;
  operation: string;
  inboundMessage?: string;
  // Classification results
  classification?: string;
  priority?: string;
  intent?: string;
  confidence?: number;
  // Generated output
  generatedResponse?: string;
  responseSent?: boolean;
  // Token usage
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  // Retry info
  attemptNumber?: number;
  wasRetried?: boolean;
  // Security tracking
  inputSanitized?: boolean;
  outputValidated?: boolean;
  validationErrors?: unknown[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate estimated cost based on token usage
 */
function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Generate hash of prompt for deduplication analysis
 */
function hashPrompt(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE LOGGING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log an AI decision to the audit table
 */
export async function logAIDecision(input: AuditLogInput): Promise<string | null> {
  try {
    const estimatedCost =
      input.model && input.promptTokens && input.completionTokens
        ? calculateCost(input.model, input.promptTokens, input.completionTokens)
        : undefined;

    const promptHash = input.inboundMessage
      ? hashPrompt(input.inboundMessage)
      : undefined;

    const [result] = await db
      .insert(aiDecisionLogs)
      .values({
        leadId: input.leadId,
        workerId: input.workerId,
        operation: input.operation,
        inboundMessage: input.inboundMessage,
        promptHash,
        classification: input.classification,
        priority: input.priority,
        intent: input.intent,
        confidence: input.confidence?.toString(),
        generatedResponse: input.generatedResponse,
        responseSent: input.responseSent ?? false,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        estimatedCostUsd: estimatedCost?.toFixed(6),
        latencyMs: input.latencyMs,
        attemptNumber: input.attemptNumber ?? 1,
        wasRetried: input.wasRetried ?? false,
        inputSanitized: input.inputSanitized ?? false,
        outputValidated: input.outputValidated ?? false,
        validationErrors: input.validationErrors,
      })
      .returning({ id: aiDecisionLogs.id });

    Logger.debug("AI Audit", "Decision logged", {
      logId: result.id,
      workerId: input.workerId,
      operation: input.operation,
      totalTokens: input.totalTokens,
      estimatedCost,
    });

    return result.id;
  } catch (error) {
    Logger.error("AI Audit", "Failed to log decision", {
      error: error instanceof Error ? error.message : "Unknown",
      workerId: input.workerId,
      operation: input.operation,
    });
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Record a human override of an AI decision
 */
export async function recordHumanOverride(
  logId: string,
  overrideBy: string,
  reason: string,
): Promise<void> {
  try {
    const { eq } = await import("drizzle-orm");

    await db
      .update(aiDecisionLogs)
      .set({
        humanOverride: true,
        overrideBy,
        overrideReason: reason,
      })
      .where(eq(aiDecisionLogs.id, logId));

    Logger.info("AI Audit", "Human override recorded", {
      logId,
      overrideBy,
      reason,
    });
  } catch (error) {
    Logger.error("AI Audit", "Failed to record override", {
      error: error instanceof Error ? error.message : "Unknown",
      logId,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION FUNCTIONS (for dashboards)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get token usage summary for a time period
 */
export async function getTokenUsageSummary(
  startDate: Date,
  endDate: Date,
): Promise<{
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byOperation: Record<string, { tokens: number; count: number }>;
}> {
  try {
    const { gte, lte, sql } = await import("drizzle-orm");

    const logs = await db
      .select({
        model: aiDecisionLogs.model,
        operation: aiDecisionLogs.operation,
        totalTokens: sql<number>`SUM(${aiDecisionLogs.totalTokens})`,
        totalCost: sql<number>`SUM(CAST(${aiDecisionLogs.estimatedCostUsd} AS DECIMAL))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(aiDecisionLogs)
      .where(
        sql`${aiDecisionLogs.createdAt} >= ${startDate} AND ${aiDecisionLogs.createdAt} <= ${endDate}`,
      )
      .groupBy(aiDecisionLogs.model, aiDecisionLogs.operation);

    const byModel: Record<string, { tokens: number; cost: number }> = {};
    const byOperation: Record<string, { tokens: number; count: number }> = {};
    let totalTokens = 0;
    let totalCost = 0;

    for (const log of logs) {
      const tokens = Number(log.totalTokens) || 0;
      const cost = Number(log.totalCost) || 0;
      const count = Number(log.count) || 0;

      totalTokens += tokens;
      totalCost += cost;

      if (log.model) {
        if (!byModel[log.model]) {
          byModel[log.model] = { tokens: 0, cost: 0 };
        }
        byModel[log.model].tokens += tokens;
        byModel[log.model].cost += cost;
      }

      if (log.operation) {
        if (!byOperation[log.operation]) {
          byOperation[log.operation] = { tokens: 0, count: 0 };
        }
        byOperation[log.operation].tokens += tokens;
        byOperation[log.operation].count += count;
      }
    }

    return { totalTokens, totalCost, byModel, byOperation };
  } catch (error) {
    Logger.error("AI Audit", "Failed to get usage summary", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return {
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
      byOperation: {},
    };
  }
}

Logger.info("AI Audit", "AI Audit service loaded");
