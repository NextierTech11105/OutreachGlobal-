import { Args, Mutation, Query, Resolver, Context } from "@nestjs/graphql";
import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import { TenantOnboardingService } from "../services/tenant-onboarding.service";
import { ApiKeyService } from "../services/api-key.service";
import { ProductPack, TenantState } from "@/database/schema/api-keys.schema";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

@Resolver()
export class TenantOnboardingResolver {
  private readonly webhookSecret: string;

  constructor(
    private onboardingService: TenantOnboardingService,
    private apiKeyService: ApiKeyService,
    private configService: ConfigService,
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
    description: "Provision a paid tenant after Stripe payment. Called by webhook.",
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
      throw new ForbiddenException("Only platform admins can view pending tenants");
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
}
