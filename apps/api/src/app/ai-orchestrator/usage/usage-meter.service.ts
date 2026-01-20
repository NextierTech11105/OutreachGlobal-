/**
 * AI Usage Meter Service
 * Tracks AI API usage per tenant in usage_records table
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { usageRecordsTable } from "@/database/schema-alias";
import { and, eq, gte, sql, sum } from "drizzle-orm";
import { AiContext, AiUsage, AiProvider, AiTask } from "../providers";

export interface UsageLimitCheck {
  allowed: boolean;
  reason?: string;
  currentUsage: {
    tokens: number;
    requests: number;
    costUsd: number;
  };
  limits: {
    tokensPerMonth: number | null;
    requestsPerMonth: number | null;
    costPerMonth: number | null;
  };
  percentUsed: number;
}

// Default limits (can be overridden per team via subscription)
const DEFAULT_LIMITS = {
  tokensPerMonth: 1_000_000, // 1M tokens
  requestsPerMonth: 10_000, // 10k requests
  costPerMonth: 50, // $50 USD
};

@Injectable()
export class UsageMeterService {
  private readonly logger = new Logger(UsageMeterService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Record AI usage for a team
   */
  async recordUsage(
    context: AiContext,
    task: AiTask,
    provider: AiProvider,
    model: string,
    usage: AiUsage | null,
    latencyMs: number,
    success: boolean,
  ): Promise<void> {
    try {
      await this.db.insert(usageRecordsTable).values({
        teamId: context.teamId,
        usageType: "ai_call",
        quantity: 1,
        unitCost: usage?.costUsd?.toString() || "0",
        totalCost: usage?.costUsd?.toString() || "0",
        resourceId: context.leadId || context.conversationId,
        resourceType: task,
        description: `${provider}/${model}`,
        metadata: {
          task,
          provider,
          model,
          traceId: context.traceId,
          channel: context.channel,
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0,
          costUsd: usage?.costUsd || 0,
          latencyMs,
          success,
          userId: context.userId,
        },
      });

      this.logger.debug(
        `Usage recorded: team=${context.teamId} task=${task} provider=${provider} tokens=${usage?.totalTokens} cost=${usage?.costUsd?.toFixed(6)}`,
      );
    } catch (error) {
      // Don't throw - usage tracking should not block AI calls
      this.logger.error(
        `Failed to record usage: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }

  /**
   * Check if a team is within usage limits
   */
  async checkLimits(teamId: string): Promise<UsageLimitCheck> {
    try {
      // Get current month start
      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );

      // Query usage for current month
      const [monthlyUsage] = await this.db
        .select({
          totalRequests: sql<number>`COALESCE(COUNT(*), 0)`,
          totalTokens: sql<number>`COALESCE(SUM((${usageRecordsTable.metadata}->>'totalTokens')::int), 0)`,
          totalCost: sql<number>`COALESCE(SUM(CAST(${usageRecordsTable.totalCost} AS DECIMAL(12,6))), 0)`,
        })
        .from(usageRecordsTable)
        .where(
          and(
            eq(usageRecordsTable.teamId, teamId),
            eq(usageRecordsTable.usageType, "ai_call"),
            gte(usageRecordsTable.createdAt, monthStart),
          ),
        );

      const usage = monthlyUsage || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
      };
      const limits = DEFAULT_LIMITS; // TODO: Get from team subscription

      // Check limits
      if (limits.tokensPerMonth && usage.totalTokens >= limits.tokensPerMonth) {
        return {
          allowed: false,
          reason: "Monthly token limit exceeded",
          currentUsage: {
            tokens: usage.totalTokens,
            requests: usage.totalRequests,
            costUsd: Number(usage.totalCost),
          },
          limits: {
            tokensPerMonth: limits.tokensPerMonth,
            requestsPerMonth: limits.requestsPerMonth,
            costPerMonth: limits.costPerMonth,
          },
          percentUsed: 100,
        };
      }

      if (
        limits.requestsPerMonth &&
        usage.totalRequests >= limits.requestsPerMonth
      ) {
        return {
          allowed: false,
          reason: "Monthly request limit exceeded",
          currentUsage: {
            tokens: usage.totalTokens,
            requests: usage.totalRequests,
            costUsd: Number(usage.totalCost),
          },
          limits: {
            tokensPerMonth: limits.tokensPerMonth,
            requestsPerMonth: limits.requestsPerMonth,
            costPerMonth: limits.costPerMonth,
          },
          percentUsed: 100,
        };
      }

      if (
        limits.costPerMonth &&
        Number(usage.totalCost) >= limits.costPerMonth
      ) {
        return {
          allowed: false,
          reason: "Monthly cost limit exceeded",
          currentUsage: {
            tokens: usage.totalTokens,
            requests: usage.totalRequests,
            costUsd: Number(usage.totalCost),
          },
          limits: {
            tokensPerMonth: limits.tokensPerMonth,
            requestsPerMonth: limits.requestsPerMonth,
            costPerMonth: limits.costPerMonth,
          },
          percentUsed: 100,
        };
      }

      // Calculate percent used
      let percentUsed = 0;
      if (limits.tokensPerMonth) {
        percentUsed = Math.max(
          percentUsed,
          (usage.totalTokens / limits.tokensPerMonth) * 100,
        );
      }
      if (limits.costPerMonth) {
        percentUsed = Math.max(
          percentUsed,
          (Number(usage.totalCost) / limits.costPerMonth) * 100,
        );
      }

      return {
        allowed: true,
        currentUsage: {
          tokens: usage.totalTokens,
          requests: usage.totalRequests,
          costUsd: Number(usage.totalCost),
        },
        limits: {
          tokensPerMonth: limits.tokensPerMonth,
          requestsPerMonth: limits.requestsPerMonth,
          costPerMonth: limits.costPerMonth,
        },
        percentUsed: Math.round(percentUsed),
      };
    } catch (error) {
      this.logger.error(
        `Failed to check limits: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      // Fail open - allow the request on error
      return {
        allowed: true,
        currentUsage: { tokens: 0, requests: 0, costUsd: 0 },
        limits: {
          tokensPerMonth: null,
          requestsPerMonth: null,
          costPerMonth: null,
        },
        percentUsed: 0,
      };
    }
  }

  /**
   * Get usage summary for a team
   */
  async getUsageSummary(
    teamId: string,
    period: "day" | "month" = "month",
  ): Promise<{
    totalTokens: number;
    totalRequests: number;
    totalCostUsd: number;
    byProvider: Record<
      AiProvider,
      { tokens: number; requests: number; cost: number }
    >;
    byTask: Record<AiTask, { tokens: number; requests: number; cost: number }>;
  }> {
    const now = new Date();
    const start =
      period === "day"
        ? new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
          )
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const usage = await this.db
      .select({
        provider: sql<string>`${usageRecordsTable.metadata}->>'provider'`,
        task: sql<string>`${usageRecordsTable.metadata}->>'task'`,
        totalTokens: sql<number>`SUM((${usageRecordsTable.metadata}->>'totalTokens')::int)`,
        totalRequests: sql<number>`COUNT(*)`,
        totalCost: sql<number>`SUM(CAST(${usageRecordsTable.totalCost} AS DECIMAL(12,6)))`,
      })
      .from(usageRecordsTable)
      .where(
        and(
          eq(usageRecordsTable.teamId, teamId),
          eq(usageRecordsTable.usageType, "ai_call"),
          gte(usageRecordsTable.createdAt, start),
        ),
      )
      .groupBy(
        sql`${usageRecordsTable.metadata}->>'provider'`,
        sql`${usageRecordsTable.metadata}->>'task'`,
      );

    const byProvider: Record<
      string,
      { tokens: number; requests: number; cost: number }
    > = {};
    const byTask: Record<
      string,
      { tokens: number; requests: number; cost: number }
    > = {};
    let totalTokens = 0;
    let totalRequests = 0;
    let totalCostUsd = 0;

    for (const row of usage) {
      const tokens = Number(row.totalTokens) || 0;
      const requests = Number(row.totalRequests) || 0;
      const cost = Number(row.totalCost) || 0;

      totalTokens += tokens;
      totalRequests += requests;
      totalCostUsd += cost;

      // Aggregate by provider
      const provider = row.provider || "unknown";
      if (!byProvider[provider]) {
        byProvider[provider] = { tokens: 0, requests: 0, cost: 0 };
      }
      byProvider[provider].tokens += tokens;
      byProvider[provider].requests += requests;
      byProvider[provider].cost += cost;

      // Aggregate by task
      const task = row.task || "unknown";
      if (!byTask[task]) {
        byTask[task] = { tokens: 0, requests: 0, cost: 0 };
      }
      byTask[task].tokens += tokens;
      byTask[task].requests += requests;
      byTask[task].cost += cost;
    }

    return {
      totalTokens,
      totalRequests,
      totalCostUsd,
      byProvider: byProvider as Record<
        AiProvider,
        { tokens: number; requests: number; cost: number }
      >,
      byTask: byTask as Record<
        AiTask,
        { tokens: number; requests: number; cost: number }
      >,
    };
  }

  /**
   * Get usage stats for a date range (for dashboard)
   */
  async getUsageStats(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalTokens: number;
    totalCostUsd: number;
    requestCount: number;
    avgLatencyMs: number;
    byProvider: Record<
      string,
      { tokens: number; cost: number; requests: number }
    >;
    byTask: Record<string, number>;
  }> {
    const usage = await this.db
      .select({
        provider: sql<string>`${usageRecordsTable.metadata}->>'provider'`,
        task: sql<string>`${usageRecordsTable.metadata}->>'task'`,
        totalTokens: sql<number>`COALESCE(SUM((${usageRecordsTable.metadata}->>'totalTokens')::int), 0)`,
        totalRequests: sql<number>`COUNT(*)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(${usageRecordsTable.totalCost} AS DECIMAL(12,6))), 0)`,
        avgLatency: sql<number>`COALESCE(AVG((${usageRecordsTable.metadata}->>'latencyMs')::int), 0)`,
      })
      .from(usageRecordsTable)
      .where(
        and(
          eq(usageRecordsTable.teamId, teamId),
          eq(usageRecordsTable.usageType, "ai_call"),
          gte(usageRecordsTable.createdAt, startDate),
          sql`${usageRecordsTable.createdAt} <= ${endDate}`,
        ),
      )
      .groupBy(
        sql`${usageRecordsTable.metadata}->>'provider'`,
        sql`${usageRecordsTable.metadata}->>'task'`,
      );

    const byProvider: Record<
      string,
      { tokens: number; cost: number; requests: number }
    > = {};
    const byTask: Record<string, number> = {};
    let totalTokens = 0;
    let totalCostUsd = 0;
    let requestCount = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    for (const row of usage) {
      const tokens = Number(row.totalTokens) || 0;
      const requests = Number(row.totalRequests) || 0;
      const cost = Number(row.totalCost) || 0;
      const latency = Number(row.avgLatency) || 0;

      totalTokens += tokens;
      totalCostUsd += cost;
      requestCount += requests;
      totalLatency += latency * requests;
      latencyCount += requests;

      // Aggregate by provider
      const provider = row.provider || "unknown";
      if (!byProvider[provider]) {
        byProvider[provider] = { tokens: 0, cost: 0, requests: 0 };
      }
      byProvider[provider].tokens += tokens;
      byProvider[provider].cost += cost;
      byProvider[provider].requests += requests;

      // Aggregate by task
      const task = row.task || "unknown";
      byTask[task] = (byTask[task] || 0) + requests;
    }

    return {
      totalTokens,
      totalCostUsd,
      requestCount,
      avgLatencyMs:
        latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      byProvider,
      byTask,
    };
  }
}
