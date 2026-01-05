import {
  index,
  pgTable,
  timestamp,
  varchar,
  boolean,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { users } from "./users.schema";

export const API_KEY_PK = "ak";
export const TENANT_PK = "tenant";

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS - Key Types & Product Packs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API Key Types - Hierarchical access levels
 *
 * OWNER_KEY   → Platform owner (Nextier internal), scope: *
 * ADMIN_KEY   → Paying customer admin (from Stripe), all scopes for their tenant
 * DEV_KEY     → Developer sandbox (no message send, no calls)
 * SUB_KEY     → Sub-user/limited access (specific scopes only)
 * DEMO_KEY    → 30-day trial, limited usage, NO Stripe required
 */
export const ApiKeyType = {
  OWNER_KEY: "OWNER_KEY",
  ADMIN_KEY: "ADMIN_KEY",
  DEV_KEY: "DEV_KEY",
  SUB_KEY: "SUB_KEY",
  DEMO_KEY: "DEMO_KEY",
} as const;

export type ApiKeyType = (typeof ApiKeyType)[keyof typeof ApiKeyType];

export const apiKeyTypeEnum = pgEnum("api_key_type", [
  ApiKeyType.OWNER_KEY,
  ApiKeyType.ADMIN_KEY,
  ApiKeyType.DEV_KEY,
  ApiKeyType.SUB_KEY,
  ApiKeyType.DEMO_KEY,
]);

/**
 * Product Packs - Commercial bundles that map to scope sets
 *
 * DATA_ENGINE        → Enrichment, skiptracing, business search
 * CAMPAIGN_ENGINE    → Campaign CRUD, SMS blast, scheduling
 * SEQUENCE_DESIGNER  → Multi-step sequences, A/B testing
 * INBOX_CALL_CENTER  → Power dialer, inbox, live calls
 * ANALYTICS_COMMAND  → Dashboards, reports, exports
 * FULL_PLATFORM      → Everything (all packs combined)
 */
export const ProductPack = {
  DATA_ENGINE: "DATA_ENGINE",
  CAMPAIGN_ENGINE: "CAMPAIGN_ENGINE",
  SEQUENCE_DESIGNER: "SEQUENCE_DESIGNER",
  INBOX_CALL_CENTER: "INBOX_CALL_CENTER",
  ANALYTICS_COMMAND: "ANALYTICS_COMMAND",
  FULL_PLATFORM: "FULL_PLATFORM",
} as const;

export type ProductPack = (typeof ProductPack)[keyof typeof ProductPack];

export const productPackEnum = pgEnum("product_pack", [
  ProductPack.DATA_ENGINE,
  ProductPack.CAMPAIGN_ENGINE,
  ProductPack.SEQUENCE_DESIGNER,
  ProductPack.INBOX_CALL_CENTER,
  ProductPack.ANALYTICS_COMMAND,
  ProductPack.FULL_PLATFORM,
]);

/**
 * All Available Scopes - Verb-based permissions
 *
 * Format: resource:action
 * Actions: read, write, execute, export, initiate, send
 */
export const Scope = {
  // Data & Enrichment
  DATA_READ: "data:read",
  DATA_WRITE: "data:write",
  ENRICHMENT_EXECUTE: "enrichment:execute",

  // Campaigns
  CAMPAIGNS_READ: "campaigns:read",
  CAMPAIGNS_CREATE: "campaigns:create",
  CAMPAIGNS_EXECUTE: "campaigns:execute",

  // Sequences
  SEQUENCES_READ: "sequences:read",
  SEQUENCES_WRITE: "sequences:write",

  // Messaging
  MESSAGES_READ: "messages:read",
  MESSAGES_SEND: "messages:send",

  // Calls
  CALLS_READ: "calls:read",
  CALLS_INITIATE: "calls:initiate",

  // Analytics
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",

  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",

  // Billing (ADMIN/OWNER only)
  BILLING_READ: "billing:read",
  BILLING_MANAGE: "billing:manage",

  // Wildcard (OWNER only)
  ALL: "*",
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

// ═══════════════════════════════════════════════════════════════════════════
// SCOPE MAPPINGS - Product Pack → Scopes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps Product Packs to their included scopes
 */
export const ProductPackScopes: Record<ProductPack, Scope[]> = {
  [ProductPack.DATA_ENGINE]: [
    Scope.DATA_READ,
    Scope.DATA_WRITE,
    Scope.ENRICHMENT_EXECUTE,
  ],
  [ProductPack.CAMPAIGN_ENGINE]: [
    Scope.CAMPAIGNS_READ,
    Scope.CAMPAIGNS_CREATE,
    Scope.CAMPAIGNS_EXECUTE,
    Scope.MESSAGES_READ,
    Scope.MESSAGES_SEND,
  ],
  [ProductPack.SEQUENCE_DESIGNER]: [
    Scope.SEQUENCES_READ,
    Scope.SEQUENCES_WRITE,
    Scope.CAMPAIGNS_READ,
    Scope.CAMPAIGNS_CREATE,
  ],
  [ProductPack.INBOX_CALL_CENTER]: [
    Scope.MESSAGES_READ,
    Scope.MESSAGES_SEND,
    Scope.CALLS_READ,
    Scope.CALLS_INITIATE,
  ],
  [ProductPack.ANALYTICS_COMMAND]: [
    Scope.ANALYTICS_READ,
    Scope.ANALYTICS_EXPORT,
    Scope.DATA_READ,
  ],
  [ProductPack.FULL_PLATFORM]: [
    Scope.DATA_READ,
    Scope.DATA_WRITE,
    Scope.ENRICHMENT_EXECUTE,
    Scope.CAMPAIGNS_READ,
    Scope.CAMPAIGNS_CREATE,
    Scope.CAMPAIGNS_EXECUTE,
    Scope.SEQUENCES_READ,
    Scope.SEQUENCES_WRITE,
    Scope.MESSAGES_READ,
    Scope.MESSAGES_SEND,
    Scope.CALLS_READ,
    Scope.CALLS_INITIATE,
    Scope.ANALYTICS_READ,
    Scope.ANALYTICS_EXPORT,
    Scope.SETTINGS_READ,
    Scope.SETTINGS_WRITE,
    Scope.BILLING_READ,
    Scope.BILLING_MANAGE,
  ],
};

/**
 * Default scopes for each key type
 */
export const KeyTypeDefaultScopes: Record<ApiKeyType, Scope[]> = {
  [ApiKeyType.OWNER_KEY]: [Scope.ALL],
  [ApiKeyType.ADMIN_KEY]: [], // Determined by productPack
  [ApiKeyType.DEV_KEY]: [
    Scope.DATA_READ,
    Scope.DATA_WRITE,
    Scope.SEQUENCES_READ,
    Scope.SEQUENCES_WRITE,
    Scope.ANALYTICS_READ,
    // NO messages:send, NO calls:initiate
  ],
  [ApiKeyType.SUB_KEY]: [
    Scope.MESSAGES_SEND,
    Scope.MESSAGES_READ,
    Scope.CALLS_INITIATE,
    // Limited by parent key's scopes
  ],
  [ApiKeyType.DEMO_KEY]: [
    Scope.DATA_READ,
    Scope.CAMPAIGNS_READ,
    Scope.ANALYTICS_READ,
    Scope.MESSAGES_SEND, // Limited to 25 total
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// TENANTS TABLE - Multi-tenant isolation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tenant State - Controls execution access
 *
 * PENDING_ONBOARDING  → Just paid, awaiting founder strategy session
 * READY_FOR_EXECUTION → Onboarding complete, can enable execution
 * LIVE                → Full access, execution enabled
 * DEMO                → Demo mode (30-day trial, limited caps)
 */
export const TenantState = {
  PENDING_ONBOARDING: "PENDING_ONBOARDING",
  READY_FOR_EXECUTION: "READY_FOR_EXECUTION",
  LIVE: "LIVE",
  DEMO: "DEMO",
} as const;

export type TenantState = (typeof TenantState)[keyof typeof TenantState];

/**
 * Execution scopes - these require LIVE tenant state
 * Dev keys and pre-onboarding tenants cannot use these
 */
export const ExecutionScopes: Scope[] = [
  Scope.MESSAGES_SEND,
  Scope.CALLS_INITIATE,
];

/**
 * Tenants Table
 *
 * Top-level organization for API-key governed access.
 * A tenant can have multiple teams underneath.
 * Maps 1:1 with SignalHouse SubGroup.
 */
export const tenants = pgTable(
  "tenants",
  {
    id: primaryUlid(TENANT_PK),

    // Display name for the tenant
    name: varchar({ length: 200 }).notNull(),

    // Unique slug for tenant identification
    slug: varchar({ length: 100 }).notNull().unique(),

    // Contact email for the tenant (for onboarding comms)
    contactEmail: varchar("contact_email", { length: 255 }),
    contactName: varchar("contact_name", { length: 200 }),

    // SignalHouse multi-tenant mapping
    signalhouseSubGroupId: varchar("signalhouse_subgroup_id"),
    signalhouseBrandId: varchar("signalhouse_brand_id"),

    // Stripe integration (null for DEMO tenants)
    stripeCustomerId: varchar("stripe_customer_id"),
    stripeSubscriptionId: varchar("stripe_subscription_id"),

    // Product pack determines available features
    productPack: varchar({ length: 30 }).default(ProductPack.DATA_ENGINE),

    // Tenant state controls execution access
    // DEMO → PENDING_ONBOARDING (on payment) → LIVE (after founder session)
    state: varchar({ length: 25 }).default(TenantState.DEMO).notNull(),

    // Billing status
    billingStatus: varchar({ length: 20 }).default("trial"), // trial, active, past_due, cancelled

    // Trial tracking
    trialEndsAt: timestamp("trial_ends_at"),

    // Onboarding tracking
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    onboardingCompletedBy: varchar("onboarding_completed_by", { length: 100 }), // Staff name

    // Standard timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index("tenants_slug_idx").on(t.slug),
    index("tenants_stripe_customer_idx").on(t.stripeCustomerId),
    index("tenants_signalhouse_idx").on(t.signalhouseSubGroupId),
    index("tenants_state_idx").on(t.state),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export const tenantsRef = (config?: { onDelete?: "cascade" | "set null" | "restrict" }) =>
  ulidColumn().references(() => tenants.id, config);

// ═══════════════════════════════════════════════════════════════════════════
// API KEYS TABLE - Enhanced for scope-based auth
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API Keys Table
 *
 * Central authentication mechanism. No user logins - all access via API keys.
 * Each key has a type, scopes, and usage tracking.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: primaryUlid(API_KEY_PK),

    // The actual key (hashed for security - SHA-256)
    keyHash: varchar({ length: 128 }).notNull(),

    // First 8 characters for display (e.g., "og_live_abc...")
    // Prefix format: og_{type}_{random}
    // og_owner_, og_admin_, og_dev_, og_sub_, og_demo_
    keyPrefix: varchar({ length: 24 }).notNull(),

    // Key type determines base access level
    type: varchar({ length: 20 }).notNull().default(ApiKeyType.ADMIN_KEY),

    // Tenant this key belongs to (multi-tenant isolation)
    tenantId: ulidColumn().references(() => tenants.id, { onDelete: "cascade" }),

    // Team this key is scoped to (optional, for team-level keys)
    teamId: teamsRef({ onDelete: "cascade" }),

    // Optional: which user created this key (for audit trail)
    createdByUserId: ulidColumn().references(() => users.id, { onDelete: "set null" }),

    // Parent key (for SUB_KEY hierarchy)
    parentKeyId: ulidColumn(),

    // Friendly name for the key (e.g., "Production API Key")
    name: varchar({ length: 100 }).notNull(),

    // Optional description
    description: varchar({ length: 500 }),

    // Product pack (determines scope set for ADMIN_KEY)
    productPack: varchar({ length: 30 }),

    // Explicit scopes (JSON array of scope strings)
    // For ADMIN_KEY: derived from productPack
    // For SUB_KEY: subset of parent's scopes
    // For DEMO_KEY: limited preset scopes
    scopes: jsonb().$type<Scope[]>().default([]),

    // Usage caps (for rate limiting and demo restrictions)
    usageCaps: jsonb().$type<{
      maxMessagesPerDay?: number;
      maxMessagesTotal?: number;  // For DEMO_KEY: 25
      maxCallsPerDay?: number;
      maxCallsTotal?: number;
      maxEnrichmentsPerDay?: number;
      maxApiCallsPerMinute?: number;
    }>(),

    // Current usage counters (reset daily or tracked cumulatively)
    usageCounters: jsonb().$type<{
      messagesUsedToday?: number;
      messagesUsedTotal?: number;
      callsUsedToday?: number;
      callsUsedTotal?: number;
      enrichmentsUsedToday?: number;
      lastResetAt?: string; // ISO date
    }>().default({}),

    // Rate limiting
    rateLimit: varchar({ length: 20 }).default("1000/hour"),

    // Is the key active?
    isActive: boolean().notNull().default(true),

    // Last time the key was used
    lastUsedAt: timestamp(),

    // IP address of last use (for security)
    lastUsedFromIp: varchar({ length: 45 }),

    // Expiration (required for DEMO_KEY - 30 days)
    expiresAt: timestamp(),

    // Stripe subscription reference (null for DEMO_KEY)
    stripeSubscriptionId: varchar("stripe_subscription_id"),

    // SignalHouse mapping (inherited from tenant, but can override)
    signalhouseSubGroupId: varchar("signalhouse_subgroup_id"),

    // Standard timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index("api_keys_tenant_idx").on(t.tenantId),
    index("api_keys_team_idx").on(t.teamId),
    index("api_keys_hash_idx").on(t.keyHash),
    index("api_keys_prefix_idx").on(t.keyPrefix),
    index("api_keys_type_idx").on(t.type),
    index("api_keys_active_idx").on(t.isActive),
    index("api_keys_parent_idx").on(t.parentKeyId),
    index("api_keys_stripe_idx").on(t.stripeSubscriptionId),
  ],
);

// Type exports
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// API KEY USAGE LOG - Audit trail for all key usage
// ═══════════════════════════════════════════════════════════════════════════

export const API_KEY_USAGE_LOG_PK = "akul";

/**
 * API Key Usage Log
 *
 * Tracks every API call for audit, analytics, and billing.
 */
export const apiKeyUsageLogs = pgTable(
  "api_key_usage_logs",
  {
    id: primaryUlid(API_KEY_USAGE_LOG_PK),

    // Which key was used
    apiKeyId: ulidColumn().references(() => apiKeys.id, { onDelete: "cascade" }).notNull(),

    // Tenant for easy querying
    tenantId: ulidColumn().references(() => tenants.id, { onDelete: "cascade" }),

    // What action was performed
    action: varchar({ length: 100 }).notNull(), // e.g., "messages:send", "data:read"

    // Which endpoint/resolver was called
    endpoint: varchar({ length: 200 }),

    // Request metadata
    ipAddress: varchar({ length: 45 }),
    userAgent: varchar({ length: 500 }),

    // Response info
    statusCode: integer(),
    responseTimeMs: integer(),

    // For billable actions, track units consumed
    unitsConsumed: integer().default(1),

    // Additional context (e.g., lead IDs affected)
    metadata: jsonb().$type<Record<string, unknown>>(),

    // Timestamp
    createdAt,
  },
  (t) => [
    index("api_key_usage_key_idx").on(t.apiKeyId),
    index("api_key_usage_tenant_idx").on(t.tenantId),
    index("api_key_usage_action_idx").on(t.action),
    index("api_key_usage_created_idx").on(t.createdAt),
  ],
);

export type ApiKeyUsageLog = typeof apiKeyUsageLogs.$inferSelect;
export type NewApiKeyUsageLog = typeof apiKeyUsageLogs.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get key prefix based on key type
 */
export function getKeyPrefix(type: ApiKeyType): string {
  const prefixMap: Record<ApiKeyType, string> = {
    [ApiKeyType.OWNER_KEY]: "og_owner_",
    [ApiKeyType.ADMIN_KEY]: "og_admin_",
    [ApiKeyType.DEV_KEY]: "og_dev_",
    [ApiKeyType.SUB_KEY]: "og_sub_",
    [ApiKeyType.DEMO_KEY]: "og_demo_",
  };
  return prefixMap[type];
}

/**
 * Get default usage caps for key type
 */
export function getDefaultUsageCaps(type: ApiKeyType): NonNullable<ApiKey["usageCaps"]> {
  const capsMap: Record<ApiKeyType, NonNullable<ApiKey["usageCaps"]>> = {
    [ApiKeyType.OWNER_KEY]: {}, // Unlimited
    [ApiKeyType.ADMIN_KEY]: {
      maxApiCallsPerMinute: 100,
    },
    [ApiKeyType.DEV_KEY]: {
      maxApiCallsPerMinute: 50,
      maxEnrichmentsPerDay: 100,
    },
    [ApiKeyType.SUB_KEY]: {
      maxMessagesPerDay: 100,
      maxCallsPerDay: 50,
      maxApiCallsPerMinute: 30,
    },
    [ApiKeyType.DEMO_KEY]: {
      maxMessagesTotal: 25,
      maxCallsTotal: 5,
      maxEnrichmentsPerDay: 10,
      maxApiCallsPerMinute: 20,
    },
  };
  return capsMap[type];
}

/**
 * Check if a key has a specific scope
 */
export function hasScope(key: ApiKey, requiredScope: Scope): boolean {
  // OWNER_KEY has all scopes
  if (key.type === ApiKeyType.OWNER_KEY) return true;

  // Check for wildcard
  if (key.scopes?.includes(Scope.ALL)) return true;

  // Check explicit scope
  return key.scopes?.includes(requiredScope) ?? false;
}

/**
 * Get all scopes for a key based on its type and product pack
 */
export function getEffectiveScopes(key: ApiKey): Scope[] {
  // OWNER gets everything
  if (key.type === ApiKeyType.OWNER_KEY) {
    return [Scope.ALL];
  }

  // If explicit scopes are set, use those
  if (key.scopes && key.scopes.length > 0) {
    return key.scopes;
  }

  // For ADMIN_KEY, derive from product pack
  if (key.type === ApiKeyType.ADMIN_KEY && key.productPack) {
    return ProductPackScopes[key.productPack as ProductPack] || [];
  }

  // Fall back to default scopes for key type
  return KeyTypeDefaultScopes[key.type as ApiKeyType] || [];
}
