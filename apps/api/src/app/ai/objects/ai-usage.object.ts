/**
 * AI Usage GraphQL Objects
 *
 * Exposes AI usage tracking and limits via GraphQL
 * for dashboard and billing integration.
 */

import { Field, ObjectType, Float, Int, registerEnumType } from "@nestjs/graphql";

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum AiProvider {
  OPENAI = "openai",
  PERPLEXITY = "perplexity",
  ANTHROPIC = "anthropic",
}

registerEnumType(AiProvider, {
  name: "AiProvider",
  description: "AI service provider",
});

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE TRACKING OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class AiUsageBreakdown {
  @Field()
  provider: string;

  @Field()
  model: string;

  @Field(() => Int)
  tokens: number;

  @Field(() => Int)
  requests: number;

  @Field(() => Float)
  cost: number;
}

@ObjectType()
export class AiUsageSummary {
  @Field()
  teamId: string;

  @Field()
  period: string;

  @Field(() => Int)
  totalTokens: number;

  @Field(() => Int)
  totalRequests: number;

  @Field(() => Float)
  estimatedCostUsd: number;

  @Field(() => [AiUsageBreakdown])
  breakdown: AiUsageBreakdown[];
}

@ObjectType()
export class AiUsageRecord {
  @Field()
  id: string;

  @Field()
  teamId: string;

  @Field()
  provider: string;

  @Field()
  model: string;

  @Field(() => Int)
  promptTokens: number;

  @Field(() => Int)
  completionTokens: number;

  @Field(() => Int)
  totalTokens: number;

  @Field(() => Int)
  requestCount: number;

  @Field(() => Int)
  successCount: number;

  @Field(() => Int)
  failureCount: number;

  @Field(() => Float)
  estimatedCostUsd: number;

  @Field(() => Float)
  avgLatencyMs: number;

  @Field()
  periodStart: Date;

  @Field()
  periodEnd: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE LIMITS OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class AiUsageLimits {
  @Field()
  teamId: string;

  @Field(() => Int, { nullable: true })
  monthlyTokenLimit?: number;

  @Field(() => Int, { nullable: true })
  monthlyRequestLimit?: number;

  @Field(() => Float, { nullable: true })
  monthlyCostLimitUsd?: number;

  @Field(() => Int, { nullable: true })
  dailyTokenLimit?: number;

  @Field(() => Int, { nullable: true })
  dailyRequestLimit?: number;

  @Field(() => Int)
  alertThresholdPercent: number;

  @Field()
  isEnabled: boolean;
}

@ObjectType()
export class AiUsageLimitCheck {
  @Field()
  allowed: boolean;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => Int)
  currentTokens: number;

  @Field(() => Int)
  currentRequests: number;

  @Field(() => Float)
  currentCost: number;

  @Field(() => Int)
  percentUsed: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class UpdateAiUsageLimitsPayload {
  @Field(() => AiUsageLimits)
  limits: AiUsageLimits;
}

@ObjectType()
export class AiUsageQueryPayload {
  @Field(() => AiUsageSummary)
  summary: AiUsageSummary;

  @Field(() => AiUsageLimitCheck)
  limitCheck: AiUsageLimitCheck;

  @Field(() => AiUsageLimits, { nullable: true })
  limits?: AiUsageLimits;
}
