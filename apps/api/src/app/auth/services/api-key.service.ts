import { Injectable, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  apiKeys,
  ApiKeyType,
  ProductPack,
  Scope,
  KeyTypeDefaultScopes,
  ProductPackScopes,
  getKeyPrefix,
  getDefaultUsageCaps,
  tenants,
  TenantState,
} from "@/database/schema/api-keys.schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import { SignalHouseProvisioningService } from "./signalhouse-provisioning.service";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateTenantOptions {
  name: string;
  slug: string;
  contactEmail: string;
  contactName?: string;
  productPack?: ProductPack;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface CreateApiKeyOptions {
  tenantId: string;
  teamId?: string;
  createdByUserId?: string;
  name: string;
  description?: string;
  type: ApiKeyType;
  productPack?: ProductPack;
  expiresAt?: Date;
  scopes?: Scope[];
  parentKeyId?: string; // For SUB_KEY hierarchy
}

export interface CreateDemoKeyOptions {
  tenantName: string;
  tenantSlug: string;
  contactEmail: string;
  contactName?: string;
}

export interface ApiKeyResponse {
  id: string;
  key: string; // The raw key - only shown once!
  keyPrefix: string;
  name: string;
  type: ApiKeyType;
  scopes: Scope[];
  expiresAt: Date | null;
  createdAt: Date;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  state: TenantState;
  productPack: string;
  trialEndsAt: Date | null;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private signalhouseProvisioning: SignalHouseProvisioningService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a random API key
   * Format: og_{type}_{random} (e.g., og_admin_abc123...)
   */
  private generateApiKey(type: ApiKeyType): string {
    const prefix = getKeyPrefix(type);
    const random = crypto.randomBytes(32).toString("hex");
    return `${prefix}${random}`;
  }

  /**
   * Hash an API key for storage (SHA-256)
   */
  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new tenant
   *
   * Automatically provisions a SignalHouse SubGroup for multi-tenant isolation.
   * The SubGroup ensures all SignalHouse resources (numbers, campaigns, analytics)
   * are isolated per tenant.
   */
  async createTenant(options: CreateTenantOptions): Promise<TenantResponse> {
    // Check if slug is unique
    const existing = await this.db.query.tenants.findFirst({
      where: eq(tenants.slug, options.slug),
    });

    if (existing) {
      throw new BadRequestException(`Tenant slug "${options.slug}" is already taken`);
    }

    const [tenant] = await this.db
      .insert(tenants)
      .values({
        name: options.name,
        slug: options.slug,
        contactEmail: options.contactEmail,
        contactName: options.contactName,
        productPack: options.productPack || ProductPack.DATA_ENGINE,
        stripeCustomerId: options.stripeCustomerId,
        stripeSubscriptionId: options.stripeSubscriptionId,
        state: options.stripeSubscriptionId
          ? TenantState.PENDING_ONBOARDING
          : TenantState.DEMO,
        billingStatus: options.stripeSubscriptionId ? "active" : "trial",
        trialEndsAt: options.stripeSubscriptionId
          ? null
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();

    // Auto-provision SignalHouse SubGroup for data isolation
    // This runs async - we don't block tenant creation if SignalHouse is unavailable
    this.signalhouseProvisioning
      .createSubGroupForTenant(tenant.id, tenant.name, tenant.slug)
      .then((result) => {
        if (result.success) {
          this.logger.log(
            `SignalHouse SubGroup ${result.subGroupId} provisioned for tenant ${tenant.slug}`,
          );
        } else {
          this.logger.warn(
            `Failed to provision SignalHouse SubGroup for tenant ${tenant.slug}: ${result.error}`,
          );
        }
      })
      .catch((err) => {
        this.logger.error(
          `Error provisioning SignalHouse SubGroup for tenant ${tenant.slug}:`,
          err,
        );
      });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      state: tenant.state as TenantState,
      productPack: tenant.productPack || ProductPack.DATA_ENGINE,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
    };
  }

  /**
   * Update tenant state (e.g., after onboarding completes)
   */
  async updateTenantState(
    tenantId: string,
    state: TenantState,
    completedBy?: string,
  ): Promise<void> {
    const updates: any = { state };

    if (state === TenantState.LIVE && completedBy) {
      updates.onboardingCompletedAt = new Date();
      updates.onboardingCompletedBy = completedBy;
    }

    await this.db
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, tenantId));
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string) {
    return this.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string) {
    return this.db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });
  }

  /**
   * List all tenants (for admin)
   */
  async listTenants(filter?: { state?: TenantState }) {
    if (filter?.state) {
      return this.db.query.tenants.findMany({
        where: eq(tenants.state, filter.state),
        orderBy: (t, { desc }) => desc(t.createdAt),
      });
    }
    return this.db.query.tenants.findMany({
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new API key
   */
  async createKey(options: CreateApiKeyOptions): Promise<ApiKeyResponse> {
    const type = options.type;

    // Generate the key
    const rawKey = this.generateApiKey(type);
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 20) + "...";

    // Determine scopes
    let scopes: Scope[];
    if (options.scopes && options.scopes.length > 0) {
      scopes = options.scopes;
    } else if (type === ApiKeyType.ADMIN_KEY && options.productPack) {
      // ADMIN_KEY gets scopes from product pack
      scopes = ProductPackScopes[options.productPack] || [];
    } else {
      // Use default scopes for key type
      scopes = KeyTypeDefaultScopes[type] || [];
    }

    // Get default usage caps
    const usageCaps = getDefaultUsageCaps(type);

    // Insert into database
    const [keyRecord] = await this.db
      .insert(apiKeys)
      .values({
        keyHash,
        keyPrefix,
        type,
        tenantId: options.tenantId,
        teamId: options.teamId,
        createdByUserId: options.createdByUserId,
        parentKeyId: options.parentKeyId,
        name: options.name,
        description: options.description,
        productPack: options.productPack,
        scopes,
        usageCaps,
        usageCounters: {},
        expiresAt: options.expiresAt,
        isActive: true,
      })
      .returning();

    return {
      id: keyRecord.id,
      key: rawKey, // Only time the raw key is returned!
      keyPrefix,
      name: keyRecord.name,
      type: keyRecord.type as ApiKeyType,
      scopes: keyRecord.scopes as Scope[] || [],
      expiresAt: keyRecord.expiresAt,
      createdAt: keyRecord.createdAt,
    };
  }

  /**
   * Create a DEMO_KEY for trial users (NO STRIPE REQUIRED)
   *
   * This is the primary entry point for new users wanting to try the platform.
   * - Creates a tenant in DEMO state
   * - Creates a DEMO_KEY with 30-day expiry
   * - Sets usage caps (25 messages, 5 calls)
   */
  async createDemoKey(options: CreateDemoKeyOptions): Promise<{
    tenant: TenantResponse;
    apiKey: ApiKeyResponse;
  }> {
    // Create tenant in DEMO state
    const tenant = await this.createTenant({
      name: options.tenantName,
      slug: options.tenantSlug,
      contactEmail: options.contactEmail,
      contactName: options.contactName,
      productPack: ProductPack.FULL_PLATFORM, // Demo gets full access to explore
    });

    // Create DEMO_KEY with 30-day expiry
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const apiKey = await this.createKey({
      tenantId: tenant.id,
      name: "Demo API Key",
      description: "30-day trial key with limited usage",
      type: ApiKeyType.DEMO_KEY,
      expiresAt,
      scopes: KeyTypeDefaultScopes[ApiKeyType.DEMO_KEY],
    });

    return { tenant, apiKey };
  }

  /**
   * Create keys for a paying customer (after Stripe webhook)
   *
   * Issues:
   * - ADMIN_KEY (active, scopes based on product pack)
   * - DEV_KEY (active, no execution)
   */
  async createPaidKeys(
    tenantId: string,
    productPack: ProductPack,
    stripeSubscriptionId: string,
  ): Promise<{
    adminKey: ApiKeyResponse;
    devKey: ApiKeyResponse;
  }> {
    // Update tenant with Stripe info and move to PENDING_ONBOARDING
    await this.db
      .update(tenants)
      .set({
        stripeSubscriptionId,
        billingStatus: "active",
        state: TenantState.PENDING_ONBOARDING,
        trialEndsAt: null, // No longer on trial
      })
      .where(eq(tenants.id, tenantId));

    // Create ADMIN_KEY
    const adminKey = await this.createKey({
      tenantId,
      name: "Production API Key",
      description: "Full access key for production use",
      type: ApiKeyType.ADMIN_KEY,
      productPack,
    });

    // Create DEV_KEY
    const devKey = await this.createKey({
      tenantId,
      name: "Development API Key",
      description: "Safe sandbox key for development (no message/call execution)",
      type: ApiKeyType.DEV_KEY,
    });

    return { adminKey, devKey };
  }

  /**
   * Create a SUB_KEY (limited access key from parent)
   */
  async createSubKey(
    parentKeyId: string,
    name: string,
    scopes: Scope[],
    description?: string,
  ): Promise<ApiKeyResponse> {
    // Get parent key
    const parentKey = await this.db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, parentKeyId),
    });

    if (!parentKey) {
      throw new BadRequestException("Parent key not found");
    }

    // Validate that requested scopes are subset of parent's scopes
    const parentScopes = (parentKey.scopes as Scope[]) || [];
    const invalidScopes = scopes.filter(
      (s) => !parentScopes.includes(s) && !parentScopes.includes(Scope.ALL),
    );

    if (invalidScopes.length > 0) {
      throw new ForbiddenException(
        `Cannot grant scopes not present in parent key: ${invalidScopes.join(", ")}`,
      );
    }

    return this.createKey({
      tenantId: parentKey.tenantId!,
      teamId: parentKey.teamId || undefined,
      parentKeyId: parentKey.id,
      name,
      description,
      type: ApiKeyType.SUB_KEY,
      scopes,
    });
  }

  /**
   * List all API keys for a tenant
   */
  async listKeys(tenantId: string) {
    const keys = await this.db.query.apiKeys.findMany({
      where: eq(apiKeys.tenantId, tenantId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    // Don't return the hash, only the prefix
    return keys.map((k) => ({
      id: k.id,
      keyPrefix: k.keyPrefix,
      name: k.name,
      type: k.type,
      scopes: k.scopes,
      productPack: k.productPack,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      usageCaps: k.usageCaps,
      usageCounters: k.usageCounters,
      createdAt: k.createdAt,
    }));
  }

  /**
   * Revoke (delete) an API key
   */
  async revokeKey(keyId: string, tenantId: string): Promise<boolean> {
    const result = await this.db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Deactivate an API key (soft delete)
   */
  async deactivateKey(keyId: string, tenantId: string): Promise<boolean> {
    const result = await this.db
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Reactivate an API key
   */
  async activateKey(keyId: string, tenantId: string): Promise<boolean> {
    const result = await this.db
      .update(apiKeys)
      .set({ isActive: true })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Rotate an API key (create new one, deactivate old one)
   */
  async rotateKey(keyId: string, tenantId: string): Promise<ApiKeyResponse | null> {
    // Get the existing key
    const existingKey = await this.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)),
    });

    if (!existingKey) {
      return null;
    }

    // Deactivate the old key
    await this.deactivateKey(keyId, tenantId);

    // Create a new key with the same settings
    return this.createKey({
      tenantId: existingKey.tenantId!,
      teamId: existingKey.teamId || undefined,
      createdByUserId: existingKey.createdByUserId || undefined,
      name: existingKey.name + " (rotated)",
      description: existingKey.description || undefined,
      type: existingKey.type as ApiKeyType,
      productPack: existingKey.productPack as ProductPack | undefined,
      scopes: existingKey.scopes as Scope[] | undefined,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Increment usage counter for an API key
   */
  async incrementUsage(
    keyId: string,
    action: "message" | "call" | "enrichment",
    count: number = 1,
  ): Promise<void> {
    const key = await this.db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, keyId),
    });

    if (!key) return;

    const counters = (key.usageCounters || {}) as NonNullable<
      typeof key.usageCounters
    >;

    // Check if we need to reset daily counters
    const today = new Date().toISOString().split("T")[0];
    const lastReset = counters.lastResetAt?.split("T")[0];

    if (lastReset !== today) {
      counters.messagesUsedToday = 0;
      counters.callsUsedToday = 0;
      counters.enrichmentsUsedToday = 0;
      counters.lastResetAt = new Date().toISOString();
    }

    // Increment counters
    switch (action) {
      case "message":
        counters.messagesUsedToday = (counters.messagesUsedToday || 0) + count;
        counters.messagesUsedTotal = (counters.messagesUsedTotal || 0) + count;
        break;
      case "call":
        counters.callsUsedToday = (counters.callsUsedToday || 0) + count;
        counters.callsUsedTotal = (counters.callsUsedTotal || 0) + count;
        break;
      case "enrichment":
        counters.enrichmentsUsedToday =
          (counters.enrichmentsUsedToday || 0) + count;
        break;
    }

    await this.db
      .update(apiKeys)
      .set({ usageCounters: counters })
      .where(eq(apiKeys.id, keyId));
  }

  /**
   * Get current usage for an API key
   */
  async getUsage(keyId: string): Promise<{
    caps: NonNullable<typeof apiKeys.$inferSelect.usageCaps>;
    counters: NonNullable<typeof apiKeys.$inferSelect.usageCounters>;
  } | null> {
    const key = await this.db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, keyId),
    });

    if (!key) return null;

    return {
      caps: (key.usageCaps || {}) as NonNullable<typeof key.usageCaps>,
      counters: (key.usageCounters || {}) as NonNullable<typeof key.usageCounters>,
    };
  }
}
