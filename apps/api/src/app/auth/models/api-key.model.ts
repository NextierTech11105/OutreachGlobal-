import { TimestampModel } from "@/app/apollo/base-model";
import { Field, ObjectType, registerEnumType, Int } from "@nestjs/graphql";
import GraphQLJSON from "graphql-type-json";

// Register the API Key Type enum for GraphQL
registerEnumType(
  {
    OWNER_KEY: "OWNER_KEY",
    ADMIN_KEY: "ADMIN_KEY",
    DEV_KEY: "DEV_KEY",
    SUB_KEY: "SUB_KEY",
    DEMO_KEY: "DEMO_KEY",
  },
  {
    name: "ApiKeyType",
    description: "Type of API key with different access levels",
  },
);

// Register the Product Pack enum for GraphQL
registerEnumType(
  {
    DATA_ENGINE: "DATA_ENGINE",
    CAMPAIGN_ENGINE: "CAMPAIGN_ENGINE",
    SEQUENCE_DESIGNER: "SEQUENCE_DESIGNER",
    INBOX_CALL_CENTER: "INBOX_CALL_CENTER",
    ANALYTICS_COMMAND: "ANALYTICS_COMMAND",
    FULL_PLATFORM: "FULL_PLATFORM",
  },
  {
    name: "ProductPack",
    description: "Commercial product bundles",
  },
);

// Register the Tenant State enum for GraphQL
registerEnumType(
  {
    PENDING_ONBOARDING: "PENDING_ONBOARDING",
    READY_FOR_EXECUTION: "READY_FOR_EXECUTION",
    LIVE: "LIVE",
    DEMO: "DEMO",
  },
  {
    name: "TenantState",
    description: "Tenant lifecycle state controlling execution access",
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// TENANT MODELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tenant - Organization for API-key governed access
 */
@ObjectType()
export class Tenant extends TimestampModel {
  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => String, { nullable: true })
  contactEmail: string | null;

  @Field(() => String, { nullable: true })
  contactName: string | null;

  @Field()
  state: string;

  @Field(() => String, { nullable: true })
  productPack: string | null;

  @Field(() => String, { nullable: true })
  billingStatus: string | null;

  @Field(() => Date, { nullable: true })
  trialEndsAt: Date | null;

  @Field(() => Date, { nullable: true })
  onboardingCompletedAt: Date | null;
}

/**
 * Demo Key Response - for new trial users
 */
@ObjectType()
export class DemoKeyResponse {
  @Field(() => Tenant)
  tenant: Tenant;

  @Field(() => NewApiKeyResponse)
  apiKey: NewApiKeyResponse;
}

// ═══════════════════════════════════════════════════════════════════════════
// API KEY MODELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Usage Caps - limits on API key usage
 */
@ObjectType()
export class UsageCaps {
  @Field(() => Int, { nullable: true })
  maxMessagesPerDay?: number;

  @Field(() => Int, { nullable: true })
  maxMessagesTotal?: number;

  @Field(() => Int, { nullable: true })
  maxCallsPerDay?: number;

  @Field(() => Int, { nullable: true })
  maxCallsTotal?: number;

  @Field(() => Int, { nullable: true })
  maxEnrichmentsPerDay?: number;

  @Field(() => Int, { nullable: true })
  maxApiCallsPerMinute?: number;
}

/**
 * Usage Counters - current usage tracking
 */
@ObjectType()
export class UsageCounters {
  @Field(() => Int, { nullable: true })
  messagesUsedToday?: number;

  @Field(() => Int, { nullable: true })
  messagesUsedTotal?: number;

  @Field(() => Int, { nullable: true })
  callsUsedToday?: number;

  @Field(() => Int, { nullable: true })
  callsUsedTotal?: number;

  @Field(() => Int, { nullable: true })
  enrichmentsUsedToday?: number;
}

/**
 * API Key - shown in list views (without the actual key)
 */
@ObjectType()
export class ApiKey extends TimestampModel {
  @Field()
  keyPrefix: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field(() => String, { nullable: true })
  tenantId: string | null;

  @Field(() => String, { nullable: true })
  teamId: string | null;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String, { nullable: true })
  productPack: string | null;

  @Field(() => [String])
  scopes: string[];

  @Field()
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  lastUsedAt: Date | null;

  @Field(() => Date, { nullable: true })
  expiresAt: Date | null;

  @Field(() => GraphQLJSON, { nullable: true })
  usageCaps: Record<string, any> | null;

  @Field(() => GraphQLJSON, { nullable: true })
  usageCounters: Record<string, any> | null;
}

/**
 * New API Key Response - includes the raw key (only shown once!)
 */
@ObjectType()
export class NewApiKeyResponse {
  @Field()
  id: string;

  @Field({ description: "The raw API key - ONLY SHOWN ONCE! Copy it now." })
  key: string;

  @Field()
  keyPrefix: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field(() => [String])
  scopes: string[];

  @Field(() => Date, { nullable: true })
  expiresAt: Date | null;

  @Field()
  createdAt: Date;
}

/**
 * Paid Keys Response - after Stripe payment
 */
@ObjectType()
export class PaidKeysResponse {
  @Field(() => NewApiKeyResponse)
  adminKey: NewApiKeyResponse;

  @Field(() => NewApiKeyResponse)
  devKey: NewApiKeyResponse;
}
