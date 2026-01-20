/**
 * AI Decision Log GraphQL Objects
 *
 * Exposes AI decision audit trail for:
 * - Compliance and auditing
 * - Debugging AI behavior
 * - Training data collection
 */

import {
  Field,
  ObjectType,
  Float,
  Int,
  registerEnumType,
} from "@nestjs/graphql";

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum AiDecisionType {
  CLASSIFICATION = "CLASSIFICATION",
  RESPONSE_GENERATION = "RESPONSE_GENERATION",
  ROUTING = "ROUTING",
  ENRICHMENT = "ENRICHMENT",
  RESEARCH = "RESEARCH",
}

registerEnumType(AiDecisionType, {
  name: "AiDecisionType",
  description: "Type of AI decision",
});

export enum Classification {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
  QUESTION = "QUESTION",
  OBJECTION = "OBJECTION",
  BOOKING = "BOOKING",
  RESCHEDULE = "RESCHEDULE",
  STOP = "STOP",
  SPAM = "SPAM",
  UNCLEAR = "UNCLEAR",
}

registerEnumType(Classification, {
  name: "Classification",
  description: "SMS message classification result",
});

export enum Priority {
  HOT = "HOT",
  WARM = "WARM",
  COLD = "COLD",
}

registerEnumType(Priority, {
  name: "Priority",
  description: "Lead priority level",
});

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION LOG OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class AiClassificationResult {
  @Field(() => Classification)
  classification: Classification;

  @Field(() => Priority)
  priority: Priority;

  @Field(() => Float)
  confidence: number;

  @Field()
  intent: string;

  @Field()
  suggestedAction: string;

  @Field()
  shouldAutoRespond: boolean;

  @Field()
  shouldRouteToCall: boolean;
}

@ObjectType()
export class AiGeneratedResponse {
  @Field()
  message: string;

  @Field()
  tone: string;

  @Field(() => Int)
  charCount: number;

  @Field()
  isCompliant: boolean;
}

@ObjectType()
export class AiDecisionLog {
  @Field()
  id: string;

  @Field()
  teamId: string;

  @Field({ nullable: true })
  leadId?: string;

  @Field({ nullable: true })
  messageId?: string;

  @Field(() => AiDecisionType)
  decisionType: AiDecisionType;

  @Field()
  provider: string;

  @Field()
  model: string;

  @Field()
  input: string;

  @Field()
  output: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => Int)
  latencyMs: number;

  @Field(() => Int)
  tokensUsed: number;

  @Field(() => Float)
  costUsd: number;

  @Field()
  success: boolean;

  @Field({ nullable: true })
  error?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field({ nullable: true })
  reviewedBy?: string;

  @Field({ nullable: true })
  correctedOutput?: string;
}

@ObjectType()
export class AiDecisionStats {
  @Field(() => Int)
  totalDecisions: number;

  @Field(() => Int)
  successfulDecisions: number;

  @Field(() => Int)
  failedDecisions: number;

  @Field(() => Float)
  avgConfidence: number;

  @Field(() => Float)
  avgLatencyMs: number;

  @Field(() => Float)
  totalCostUsd: number;

  @Field(() => [ClassificationBreakdown])
  classificationBreakdown: ClassificationBreakdown[];
}

@ObjectType()
export class ClassificationBreakdown {
  @Field(() => Classification)
  classification: Classification;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  percentage: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class AiDecisionLogConnection {
  @Field(() => [AiDecisionLog])
  edges: AiDecisionLog[];

  @Field(() => Int)
  totalCount: number;

  @Field()
  hasNextPage: boolean;
}

@ObjectType()
export class CorrectAiDecisionPayload {
  @Field(() => AiDecisionLog)
  decision: AiDecisionLog;
}
