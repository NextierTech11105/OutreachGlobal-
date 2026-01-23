import { Args, Mutation, Query, Resolver, Context } from "@nestjs/graphql";
import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import { TenantOnboardingService } from "../services/tenant-onboarding.service";
import { ApiKeyService } from "../services/api-key.service";
import { ProductPack, TenantState } from "@/database/schema/api-keys.schema";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { sql } from "drizzle-orm";
import { TeamService } from "@/app/team/services/team.service";

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for provisioning a paid tenant (called by Stripe webhook)
 */
@InputType()
export class ProvisionPaidTenantInput {
  @Field({ nullable: true, description: "Existing tenant ID to upgrade" })
  tenantId?: string;

  @Field({ nullable: true, description: "Existing tenant slug to upgrade" })
  tenantSlug?: string;

  @Field({ description: "Stripe customer ID" })
  stripeCustomerId: string;

  @Field({ description: "Stripe subscription ID" })
  stripeSubscriptionId: string;

  @Field({ description: "Product pack purchased" })
  productPack: string;

  @Field({ description: "Customer email for onboarding" })
  customerEmail: string;

  @Field({ nullable: true, description: "Customer name" })
  customerName?: string;
}

/**
 * Input for activating a tenant (called by admin after strategy session)
 */
@InputType()
export class ActivateTenantInput {
  @Field({ description: "Tenant ID to activate" })
  tenantId: string;

  @Field({ description: "Name of person who completed onboarding" })
  completedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

@ObjectType()
export class ProvisionResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  tenantId?: string;

  @Field({ nullable: true })
  adminKeyPrefix?: string;

  @Field({ nullable: true })
  devKeyPrefix?: string;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
export class ActivateResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
export class TenantListItem {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  state: string;

  @Field({ nullable: true })
  contactEmail?: string;

  @Field({ nullable: true })
  contactName?: string;

  @Field({ nullable: true })
  productPack?: string;

  @Field({ nullable: true })
  billingStatus?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  onboardingCompletedAt?: Date;
}

@ObjectType()
export class BootstrapTenantInfo {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  state: string;
}

@ObjectType()
export class BootstrapApiKeyInfo {
  @Field()
  key: string;

  @Field()
  keyPrefix: string;

  @Field()
  name: string;

  @Field()
  type: string;
}

@ObjectType()
export class BootstrapOwnerResult {
  @Field()
  success: boolean;

  @Field(() => BootstrapTenantInfo, { nullable: true })
  tenant?: BootstrapTenantInfo;

  @Field(() => BootstrapApiKeyInfo, { nullable: true })
  apiKey?: BootstrapApiKeyInfo;

  @Field()
  isNew: boolean;

  @Field({ nullable: true })
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

@ObjectType()
export class MigrationResult {
  @Field()
  success: boolean;

  @Field(() => [String])
  results: string[];

  @Field({ nullable: true })
  error?: string;
}

@Resolver()
export class TenantOnboardingResolver {
  private readonly webhookSecret: string;

  constructor(
    private onboardingService: TenantOnboardingService,
    private apiKeyService: ApiKeyService,
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
  ) {
    // Secret for webhook authentication (should match Stripe webhook secret or custom)
    this.webhookSecret =
      this.configService.get("TENANT_WEBHOOK_SECRET") ||
      this.configService.get("STRIPE_WEBHOOK_SECRET") ||
      "";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK ENDPOINTS (called by Stripe webhook handler)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Provision a paid tenant after Stripe payment
   *
   * This is called by the Next.js Stripe webhook handler.
   * Requires webhook secret for authentication (not user auth).
   */
  @Mutation(() => ProvisionResult, {
    description:
      "Provision a paid tenant after Stripe payment. Called by webhook.",
  })
  async provisionPaidTenant(
    @Args("input") input: ProvisionPaidTenantInput,
    @Args("webhookSecret") webhookSecret: string,
  ): Promise<ProvisionResult> {
    // Verify webhook secret
    if (!this.webhookSecret || webhookSecret !== this.webhookSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    const result = await this.onboardingService.provisionPaidTenant({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      productPack: input.productPack as ProductPack,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS (require OWNER_KEY or authenticated admin)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Activate a tenant after founder strategy session
   *
   * This enables execution scopes (messages:send, calls:initiate).
   * Only callable by admin/owner.
   */
  @Mutation(() => ActivateResult, {
    description: "Activate a tenant after strategy session. Admin only.",
  })
  @UseAuthGuard()
  async activateTenant(
    @Auth() user: User,
    @Args("input") input: ActivateTenantInput,
    @Context() context: any,
  ): Promise<ActivateResult> {
    // Check if user has admin access (OWNER_KEY or platform admin)
    const apiKeyType = context.req?.apiKeyType;
    const isOwnerKey = apiKeyType === "OWNER_KEY";
    const isAdmin = user?.email?.endsWith("@outreachglobal.io");

    if (!isOwnerKey && !isAdmin) {
      throw new ForbiddenException("Only platform admins can activate tenants");
    }

    return this.onboardingService.activateTenant(
      input.tenantId,
      input.completedBy,
    );
  }

  /**
   * List all tenants pending onboarding
   *
   * For admin dashboard to see who needs strategy sessions.
   */
  @Query(() => [TenantListItem], {
    description: "List tenants pending onboarding. Admin only.",
  })
  @UseAuthGuard()
  async pendingOnboardingTenants(
    @Auth() user: User,
    @Context() context: any,
  ): Promise<TenantListItem[]> {
    // Check admin access
    const apiKeyType = context.req?.apiKeyType;
    const isOwnerKey = apiKeyType === "OWNER_KEY";
    const isAdmin = user?.email?.endsWith("@outreachglobal.io");

    if (!isOwnerKey && !isAdmin) {
      throw new ForbiddenException(
        "Only platform admins can view pending tenants",
      );
    }

    // Get tenants in PENDING_ONBOARDING state
    const tenantList = await this.apiKeyService.listTenants({
      state: TenantState.PENDING_ONBOARDING,
    });

    return tenantList.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      state: t.state,
      contactEmail: t.contactEmail || undefined,
      contactName: t.contactName || undefined,
      productPack: t.productPack || undefined,
      billingStatus: t.billingStatus || undefined,
      createdAt: t.createdAt,
      onboardingCompletedAt: t.onboardingCompletedAt || undefined,
    }));
  }

  /**
   * List all tenants (admin view)
   */
  @Query(() => [TenantListItem], {
    description: "List all tenants. Admin only.",
  })
  @UseAuthGuard()
  async allTenants(
    @Auth() user: User,
    @Context() context: any,
  ): Promise<TenantListItem[]> {
    // Check admin access
    const apiKeyType = context.req?.apiKeyType;
    const isOwnerKey = apiKeyType === "OWNER_KEY";
    const isAdmin = user?.email?.endsWith("@outreachglobal.io");

    if (!isOwnerKey && !isAdmin) {
      throw new ForbiddenException("Only platform admins can view all tenants");
    }

    const tenantList = await this.apiKeyService.listTenants();

    return tenantList.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      state: t.state,
      contactEmail: t.contactEmail || undefined,
      contactName: t.contactName || undefined,
      productPack: t.productPack || undefined,
      billingStatus: t.billingStatus || undefined,
      createdAt: t.createdAt,
      onboardingCompletedAt: t.onboardingCompletedAt || undefined,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOTSTRAP ENDPOINT (one-time setup for platform owner)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bootstrap the platform owner account
   *
   * Creates OWNER_KEY for tb@outreachglobal.io
   * This is a one-time setup operation. Requires a secret.
   */
  @Mutation(() => BootstrapOwnerResult, {
    description: "Bootstrap platform owner. One-time setup.",
  })
  async bootstrapOwner(
    @Args("email") email: string,
    @Args("secret") secret: string,
  ): Promise<BootstrapOwnerResult> {
    // Get bootstrap secret from config
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    // Verify secret
    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    // Only allow @outreachglobal.io emails
    if (!email || !email.endsWith("@outreachglobal.io")) {
      throw new ForbiddenException(
        "Only @outreachglobal.io emails can bootstrap owner access",
      );
    }

    try {
      const result = await this.apiKeyService.bootstrapOwner(email);

      return {
        success: true,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          state: result.tenant.state,
        },
        apiKey: {
          key: result.apiKey.key,
          keyPrefix: result.apiKey.keyPrefix,
          name: result.apiKey.name,
          type: result.apiKey.type,
        },
        isNew: result.isNew,
      };
    } catch (error) {
      return {
        success: false,
        isNew: false,
        error: error instanceof Error ? error.message : "Bootstrap failed",
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION ENDPOINT (one-time setup for database schema)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run API key governance migration
   *
   * Creates tenants table and updates api_keys table for multi-tenant support.
   * This is a one-time setup operation. Requires bootstrap secret.
   */
  @Mutation(() => MigrationResult, {
    description: "Run API key governance migration. One-time setup.",
  })
  async runApiKeyMigration(
    @Args("secret") secret: string,
  ): Promise<MigrationResult> {
    // Get bootstrap secret from config
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    // Verify secret
    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      // Create tenants table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "tenants" (
          "id" varchar(30) PRIMARY KEY NOT NULL,
          "name" varchar(200) NOT NULL,
          "slug" varchar(100) NOT NULL UNIQUE,
          "contact_email" varchar(255),
          "contact_name" varchar(200),
          "signalhouse_subgroup_id" varchar(255),
          "signalhouse_brand_id" varchar(255),
          "stripe_customer_id" varchar(255),
          "stripe_subscription_id" varchar(255),
          "product_pack" varchar(30) DEFAULT 'DATA_ENGINE',
          "state" varchar(25) NOT NULL DEFAULT 'DEMO',
          "billing_status" varchar(20) DEFAULT 'trial',
          "trial_ends_at" timestamp,
          "onboarding_completed_at" timestamp,
          "onboarding_completed_by" varchar(100),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      results.push("Created tenants table");

      // Create indexes for tenants
      await this.db.execute(
        sql`CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" ("slug")`,
      );
      await this.db.execute(
        sql`CREATE INDEX IF NOT EXISTS "tenants_stripe_customer_idx" ON "tenants" ("stripe_customer_id")`,
      );
      await this.db.execute(
        sql`CREATE INDEX IF NOT EXISTS "tenants_state_idx" ON "tenants" ("state")`,
      );
      results.push("Created tenants indexes");

      // Add tenant_id column to api_keys
      try {
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "tenant_id" varchar(30) REFERENCES "tenants"("id") ON DELETE CASCADE`,
        );
        results.push("Added tenant_id column to api_keys");
      } catch (e: any) {
        results.push(`tenant_id column: ${e.message}`);
      }

      // Add other new columns to api_keys
      try {
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar(30)`,
        );
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "parent_key_id" varchar(30)`,
        );
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "product_pack" varchar(30)`,
        );
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" jsonb DEFAULT '[]'::jsonb`,
        );
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "usage_caps" jsonb`,
        );
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "usage_counters" jsonb DEFAULT '{}'::jsonb`,
        );
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_used_from_ip" varchar(45)`,
        );
        results.push("Added new columns to api_keys");
      } catch (e: any) {
        results.push(`api_keys columns: ${e.message}`);
      }

      // Extend key_prefix length
      try {
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ALTER COLUMN "key_prefix" TYPE varchar(24)`,
        );
        results.push("Extended key_prefix length");
      } catch (e: any) {
        results.push(`key_prefix: ${e.message}`);
      }

      // Create api_keys indexes
      await this.db.execute(
        sql`CREATE INDEX IF NOT EXISTS "api_keys_tenant_idx" ON "api_keys" ("tenant_id")`,
      );
      results.push("Created api_keys tenant index");

      // Create api_key_usage_logs table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "api_key_usage_logs" (
          "id" varchar(30) PRIMARY KEY NOT NULL,
          "api_key_id" varchar(30) NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
          "tenant_id" varchar(30) REFERENCES "tenants"("id") ON DELETE CASCADE,
          "action" varchar(100) NOT NULL,
          "endpoint" varchar(200),
          "ip_address" varchar(45),
          "user_agent" varchar(500),
          "status_code" integer,
          "response_time_ms" integer,
          "units_consumed" integer DEFAULT 1,
          "metadata" jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      results.push("Created api_key_usage_logs table");

      // Create usage logs indexes
      await this.db.execute(
        sql`CREATE INDEX IF NOT EXISTS "api_key_usage_key_idx" ON "api_key_usage_logs" ("api_key_id")`,
      );
      await this.db.execute(
        sql`CREATE INDEX IF NOT EXISTS "api_key_usage_tenant_idx" ON "api_key_usage_logs" ("tenant_id")`,
      );
      results.push("Created usage logs indexes");

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Migration failed",
      };
    }
  }

  /**
   * Fix tenants table schema
   * Drops and recreates if columns are misconfigured
   */
  @Mutation(() => MigrationResult, {
    description: "Fix tenants table schema issues. One-time fix.",
  })
  async fixTenantsSchema(
    @Args("secret") secret: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      // Drop dependent tables first
      await this.db.execute(
        sql`DROP TABLE IF EXISTS "api_key_usage_logs" CASCADE`,
      );
      results.push("Dropped api_key_usage_logs");

      // Drop tenants table
      await this.db.execute(sql`DROP TABLE IF EXISTS "tenants" CASCADE`);
      results.push("Dropped tenants table");

      // Recreate tenants table with proper schema matching Drizzle
      await this.db.execute(sql`
        CREATE TABLE "tenants" (
          "id" varchar(30) PRIMARY KEY NOT NULL,
          "name" varchar(200) NOT NULL,
          "slug" varchar(100) NOT NULL UNIQUE,
          "contact_email" varchar(255),
          "contact_name" varchar(200),
          "signalhouse_subgroup_id" varchar(255),
          "signalhouse_brand_id" varchar(255),
          "stripe_customer_id" varchar(255),
          "stripe_subscription_id" varchar(255),
          "product_pack" varchar(30) DEFAULT 'DATA_ENGINE',
          "state" varchar(25) NOT NULL DEFAULT 'DEMO',
          "billing_status" varchar(20) DEFAULT 'trial',
          "trial_ends_at" timestamp,
          "onboarding_completed_at" timestamp,
          "onboarding_completed_by" varchar(100),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      results.push("Recreated tenants table");

      // Create indexes
      await this.db.execute(
        sql`CREATE INDEX "tenants_slug_idx" ON "tenants" ("slug")`,
      );
      await this.db.execute(
        sql`CREATE INDEX "tenants_stripe_customer_idx" ON "tenants" ("stripe_customer_id")`,
      );
      await this.db.execute(
        sql`CREATE INDEX "tenants_state_idx" ON "tenants" ("state")`,
      );
      results.push("Created tenants indexes");

      // Re-add tenant_id column to api_keys
      try {
        await this.db.execute(
          sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "tenant_id" varchar(30) REFERENCES "tenants"("id") ON DELETE CASCADE`,
        );
        results.push("Re-added tenant_id to api_keys");
      } catch (e: any) {
        results.push(`tenant_id: ${e.message}`);
      }

      // Recreate api_key_usage_logs
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "api_key_usage_logs" (
          "id" varchar(30) PRIMARY KEY NOT NULL,
          "api_key_id" varchar(30) NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
          "tenant_id" varchar(30) REFERENCES "tenants"("id") ON DELETE CASCADE,
          "action" varchar(100) NOT NULL,
          "endpoint" varchar(200),
          "ip_address" varchar(45),
          "user_agent" varchar(500),
          "status_code" integer,
          "response_time_ms" integer,
          "units_consumed" integer DEFAULT 1,
          "metadata" jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      results.push("Recreated api_key_usage_logs table");

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Fix failed",
      };
    }
  }

  /**
   * Fix api_keys schema to allow null team_id
   */
  @Mutation(() => MigrationResult, {
    description: "Fix api_keys table to allow null team_id. One-time fix.",
  })
  async fixApiKeysSchema(
    @Args("secret") secret: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      // Make team_id nullable
      await this.db.execute(
        sql`ALTER TABLE "api_keys" ALTER COLUMN "team_id" DROP NOT NULL`,
      );
      results.push("Made team_id nullable");

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Fix failed",
      };
    }
  }

  /**
   * Fix messages table - add sent_at column
   */
  @Mutation(() => MigrationResult, {
    description: "Add sent_at column to messages table. One-time fix.",
  })
  async fixMessagesSchema(
    @Args("secret") secret: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      await this.db.execute(
        sql`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sent_at" timestamp`,
      );
      results.push("Added sent_at column to messages");

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Fix failed",
      };
    }
  }

  /**
   * Bootstrap owner using direct SQL (bypasses Drizzle ORM)
   */
  @Mutation(() => BootstrapOwnerResult, {
    description: "Bootstrap platform owner using direct SQL. One-time setup.",
  })
  async bootstrapOwnerDirect(
    @Args("email") email: string,
    @Args("secret") secret: string,
  ): Promise<BootstrapOwnerResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    if (!email || !email.endsWith("@outreachglobal.io")) {
      throw new ForbiddenException(
        "Only @outreachglobal.io emails can bootstrap owner access",
      );
    }

    try {
      // Generate IDs
      const tenantId = `tenant_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const apiKeyId = `apikey_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

      // Generate API key
      const crypto = await import("crypto");
      const rawKey = `og_owner_${crypto.randomBytes(32).toString("base64url")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(0, 16);

      // Insert tenant using raw SQL with NOW()
      await this.db.execute(sql`
        INSERT INTO "tenants" (
          "id", "name", "slug", "contact_email", "contact_name",
          "signalhouse_subgroup_id", "signalhouse_brand_id",
          "stripe_customer_id", "stripe_subscription_id",
          "product_pack", "state", "billing_status", "trial_ends_at",
          "onboarding_completed_at", "onboarding_completed_by",
          "created_at", "updated_at"
        ) VALUES (
          ${tenantId}, 'OutreachGlobal (Owner)', 'outreachglobal-owner', ${email}, 'Tyler Baughman',
          NULL, NULL, NULL, NULL,
          'FULL_PLATFORM', 'DEMO', 'trial', NOW() + INTERVAL '30 days',
          NULL, NULL,
          NOW(), NOW()
        )
      `);

      // Insert API key using raw SQL - with team_id = NULL
      await this.db.execute(sql`
        INSERT INTO "api_keys" (
          "id", "key_prefix", "key_hash", "name", "type",
          "tenant_id", "team_id", "is_active", "scopes",
          "created_at", "updated_at"
        ) VALUES (
          ${apiKeyId}, ${keyPrefix}, ${keyHash}, 'Owner Key', 'OWNER_KEY',
          ${tenantId}, NULL, true, '["*"]'::jsonb,
          NOW(), NOW()
        )
      `);

      return {
        success: true,
        tenant: {
          id: tenantId,
          name: "OutreachGlobal (Owner)",
          slug: "outreachglobal-owner",
          state: "DEMO",
        },
        apiKey: {
          key: rawKey,
          keyPrefix,
          name: "Owner Key",
          type: "OWNER_KEY",
        },
        isNew: true,
      };
    } catch (error) {
      return {
        success: false,
        isNew: false,
        error: error instanceof Error ? error.message : "Bootstrap failed",
      };
    }
  }

  /**
   * Fix api_keys table to add all missing columns
   */
  @Mutation(() => MigrationResult, {
    description: "Add all missing columns to api_keys table",
  })
  async fixApiKeysFullSchema(
    @Args("secret") secret: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      // Add all potentially missing columns
      await this.db.execute(sql`
        ALTER TABLE "api_keys"
        ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar,
        ADD COLUMN IF NOT EXISTS "parent_key_id" varchar,
        ADD COLUMN IF NOT EXISTS "description" varchar(500),
        ADD COLUMN IF NOT EXISTS "product_pack" varchar(30),
        ADD COLUMN IF NOT EXISTS "usage_caps" jsonb,
        ADD COLUMN IF NOT EXISTS "usage_counters" jsonb DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "rate_limit" varchar(20) DEFAULT '1000/hour',
        ADD COLUMN IF NOT EXISTS "last_used_at" timestamp,
        ADD COLUMN IF NOT EXISTS "last_used_from_ip" varchar(45),
        ADD COLUMN IF NOT EXISTS "expires_at" timestamp,
        ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar,
        ADD COLUMN IF NOT EXISTS "signalhouse_subgroup_id" varchar
      `);
      results.push("Added all missing columns to api_keys table");

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Fix failed",
      };
    }
  }

  /**
   * Debug: Check API keys in database
   */
  @Mutation(() => MigrationResult, {
    description: "Debug: List API keys in database",
  })
  async debugApiKeys(@Args("secret") secret: string): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      const keys = await this.db.execute(
        sql`SELECT id, key_prefix, key_hash, type, tenant_id, is_active FROM api_keys LIMIT 10`,
      );

      for (const row of keys.rows || []) {
        results.push(JSON.stringify(row));
      }

      if (results.length === 0) {
        results.push("No API keys found in database");
      }

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Debug failed",
      };
    }
  }

  /**
   * Associate OWNER key with platform owner user
   * Creates user if needed and links to existing API key
   */
  @Mutation(() => MigrationResult, {
    description: "Associate OWNER key with platform owner user",
  })
  async linkOwnerKey(
    @Args("secret") secret: string,
    @Args("email") email: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      // Find the OWNER_KEY
      const ownerKeyResult = await this.db.execute(
        sql`SELECT id, tenant_id FROM api_keys WHERE type = 'OWNER_KEY' LIMIT 1`,
      );

      if (!ownerKeyResult.rows || ownerKeyResult.rows.length === 0) {
        return {
          success: false,
          results,
          error: "No OWNER_KEY found. Run bootstrapOwner first.",
        };
      }

      const ownerKey = ownerKeyResult.rows[0] as {
        id: string;
        tenant_id: string;
      };
      results.push(`Found OWNER_KEY: ${ownerKey.id}`);

      // Find or create user
      const existingUser = await this.db.execute(
        sql`SELECT id, email, name FROM users WHERE email = ${email} LIMIT 1`,
      );

      let userId: string;
      if (existingUser.rows && existingUser.rows.length > 0) {
        userId = (existingUser.rows[0] as { id: string }).id;
        results.push(`Found existing user: ${userId}`);
      } else {
        // Create new user for platform owner
        // For API key-only access, password is set to a random hash (not usable for login)
        userId = `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const placeholderPassword = `APIKEY_ONLY_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 16)}`;
        await this.db.execute(sql`
          INSERT INTO users (id, email, name, password, role, created_at, updated_at)
          VALUES (${userId}, ${email}, ${"Platform Owner"}, ${placeholderPassword}, ${"OWNER"}, NOW(), NOW())
        `);
        results.push(`Created new user: ${userId}`);
      }

      // Update the API key to link to this user
      await this.db.execute(sql`
        UPDATE api_keys
        SET created_by_user_id = ${userId}
        WHERE id = ${ownerKey.id}
      `);
      results.push(`Linked API key to user`);

      // Find or create team for this user
      const existingTeam = await this.db.execute(
        sql`SELECT id FROM teams WHERE owner_id = ${userId} LIMIT 1`,
      );

      let teamId: string;
      if (existingTeam.rows && existingTeam.rows.length > 0) {
        teamId = (existingTeam.rows[0] as { id: string }).id;
        results.push(`Found existing team: ${teamId}`);
      } else {
        // Create team
        teamId = `team_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const slug =
          "platform-owner-" +
          Math.random().toString(16).slice(2, 8).toLowerCase();
        await this.db.execute(sql`
          INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
          VALUES (${teamId}, ${userId}, ${"Platform Team"}, ${slug}, NOW(), NOW())
        `);
        results.push(`Created team: ${teamId}`);

        // Add owner as team member
        const memberId = `tm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        await this.db.execute(sql`
          INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)
          VALUES (${memberId}, ${teamId}, ${userId}, ${"OWNER"}, ${"APPROVED"}, NOW(), NOW())
        `);
        results.push(`Added owner as team member`);
      }

      // Update API key with team_id too
      await this.db.execute(sql`
        UPDATE api_keys
        SET team_id = ${teamId}
        WHERE id = ${ownerKey.id}
      `);
      results.push(`Linked API key to team`);

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Link failed",
      };
    }
  }

  /**
   * Update team slug - allows changing team URL
   */
  @Mutation(() => MigrationResult, {
    description: "Update team slug for URL access",
  })
  async updateTeamSlug(
    @Args("secret") secret: string,
    @Args("email") email: string,
    @Args("newSlug") newSlug: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      const userResult = await this.db.execute(
        sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`,
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        return {
          success: false,
          results,
          error: `User not found for email: ${email}`,
        };
      }

      const userId = (userResult.rows[0] as { id: string }).id;
      results.push(`Found user: ${userId}`);

      const teamResult = await this.db.execute(
        sql`SELECT id, slug FROM teams WHERE owner_id = ${userId} LIMIT 1`,
      );

      if (!teamResult.rows || teamResult.rows.length === 0) {
        return {
          success: false,
          results,
          error: `No team found for user: ${userId}`,
        };
      }

      const team = teamResult.rows[0] as { id: string; slug: string };
      results.push(`Found team: ${team.id} with current slug: ${team.slug}`);

      await this.db.execute(sql`
        UPDATE teams
        SET slug = ${newSlug}, updated_at = NOW()
        WHERE id = ${team.id}
      `);
      results.push(`Updated team slug to: ${newSlug}`);

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  }

  /**
   * Debug: List teams in database
   */
  @Mutation(() => MigrationResult, {
    description: "Debug: List teams in database",
  })
  async debugTeams(@Args("secret") secret: string): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      const teams = await this.db.execute(
        sql`SELECT id, owner_id, name, slug FROM teams LIMIT 20`,
      );

      for (const row of teams.rows || []) {
        results.push(JSON.stringify(row));
      }

      if (results.length === 0) {
        results.push("No teams found in database");
      }

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Debug failed",
      };
    }
  }

  /**
   * Generate a new API key for the platform owner
   */
  @Mutation(() => MigrationResult, {
    description: "Generate new API key for owner",
  })
  async regenerateOwnerKey(
    @Args("secret") secret: string,
    @Args("email") email: string,
  ): Promise<MigrationResult> {
    const bootstrapSecret =
      this.configService.get("BOOTSTRAP_SECRET") || "og-bootstrap-2024";

    if (secret !== bootstrapSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const results: string[] = [];

    try {
      // Find the user
      const userResult = await this.db.execute(
        sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`,
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        return {
          success: false,
          results,
          error: `User not found for email: ${email}`,
        };
      }

      const userId = (userResult.rows[0] as { id: string }).id;
      results.push(`Found user: ${userId}`);

      // Find their tenant
      const tenantResult = await this.db.execute(
        sql`SELECT tenant_id FROM api_keys WHERE created_by_user_id = ${userId} LIMIT 1`,
      );

      let tenantId: string;
      if (tenantResult.rows && tenantResult.rows.length > 0) {
        tenantId = (tenantResult.rows[0] as { tenant_id: string }).tenant_id;
      } else {
        return {
          success: false,
          results,
          error: "No tenant found for user",
        };
      }
      results.push(`Found tenant: ${tenantId}`);

      // Generate new API key
      const keyId = `apikey_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const randomPart = Array.from({ length: 32 }, () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
          Math.floor(Math.random() * 62),
        ),
      ).join("");
      const fullKey = `og_owner_${randomPart}`;
      const keyPrefix = fullKey.slice(0, 15);

      // Simple hash for storage
      const crypto = await import("crypto");
      const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");

      // Deactivate old keys
      await this.db.execute(sql`
        UPDATE api_keys SET is_active = false
        WHERE created_by_user_id = ${userId} AND type = 'OWNER_KEY'
      `);
      results.push("Deactivated old keys");

      // Insert new key
      await this.db.execute(sql`
        INSERT INTO api_keys (id, key_prefix, key_hash, type, tenant_id, created_by_user_id, name, is_active, created_at, updated_at)
        VALUES (${keyId}, ${keyPrefix}, ${keyHash}, 'OWNER_KEY', ${tenantId}, ${userId}, 'Platform Owner Key', true, NOW(), NOW())
      `);
      results.push(`Created new API key`);
      results.push(`YOUR NEW API KEY: ${fullKey}`);
      results.push(`Save this key - it will not be shown again!`);

      return { success: true, results };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : "Key generation failed",
      };
    }
  }
}
