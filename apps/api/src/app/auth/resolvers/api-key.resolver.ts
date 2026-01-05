import { Args, Mutation, Query, Resolver, Context } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import {
  ApiKey,
  NewApiKeyResponse,
  DemoKeyResponse,
  Tenant,
  PaidKeysResponse,
} from "../models/api-key.model";
import { ApiKeyService } from "../services/api-key.service";
import {
  ApiKeyType,
  ProductPack,
  Scope,
  TenantState,
} from "@/database/schema/api-keys.schema";
import { Field, InputType, ArgsType } from "@nestjs/graphql";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamService } from "@/app/team/services/team.service";

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for creating a demo key (NO AUTH REQUIRED)
 * This is the public entry point for trial users
 */
@InputType()
export class CreateDemoKeyInput {
  @Field({ description: "Name for the tenant/organization" })
  tenantName: string;

  @Field({ description: "Unique slug for the tenant (lowercase, no spaces)" })
  tenantSlug: string;

  @Field({ description: "Contact email for onboarding communications" })
  contactEmail: string;

  @Field(() => String, { nullable: true, description: "Contact name" })
  contactName?: string;
}

/**
 * Input for creating an API key (authenticated)
 */
@InputType()
export class CreateApiKeyInput {
  @Field({ description: "Tenant ID this key belongs to" })
  tenantId: string;

  @Field(() => String, { nullable: true, description: "Optional team ID" })
  teamId?: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { defaultValue: "ADMIN_KEY" })
  type: string;

  @Field(() => String, { nullable: true })
  productPack?: string;

  @Field(() => [String], { nullable: true, description: "Explicit scopes" })
  scopes?: string[];
}

/**
 * Input for creating a sub-key
 */
@InputType()
export class CreateSubKeyInput {
  @Field({ description: "Parent key ID" })
  parentKeyId: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], { description: "Scopes to grant (must be subset of parent)" })
  scopes: string[];
}

@ArgsType()
export class ListApiKeysArgs {
  @Field({ description: "Tenant ID to list keys for" })
  tenantId: string;
}

@ArgsType()
export class TenantKeyArgs {
  @Field()
  keyId: string;

  @Field()
  tenantId: string;
}

@ArgsType()
export class UpdateTenantStateArgs {
  @Field()
  tenantId: string;

  @Field()
  state: string;

  @Field(() => String, { nullable: true })
  completedBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

@Resolver(() => ApiKey)
export class ApiKeyResolver {
  constructor(
    private apiKeyService: ApiKeyService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (NO AUTH REQUIRED)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a DEMO_KEY for trial users
   *
   * NO AUTHENTICATION REQUIRED - this is the public entry point.
   * Creates a tenant in DEMO state with a 30-day trial key.
   */
  @Mutation(() => DemoKeyResponse, {
    description: "Create a demo API key for trial. No authentication required.",
  })
  async createDemoKey(
    @Args("input") input: CreateDemoKeyInput,
  ): Promise<DemoKeyResponse> {
    const result = await this.apiKeyService.createDemoKey({
      tenantName: input.tenantName,
      tenantSlug: input.tenantSlug.toLowerCase().replace(/\s+/g, "-"),
      contactEmail: input.contactEmail,
      contactName: input.contactName,
    });

    return {
      tenant: result.tenant as any,
      apiKey: result.apiKey as any,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATED ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a new API key for a tenant
   */
  @Mutation(() => NewApiKeyResponse, {
    description: "Generate a new API key. The raw key is ONLY shown once!",
  })
  @UseAuthGuard()
  async createApiKey(
    @Auth() user: User,
    @Args("input") input: CreateApiKeyInput,
  ): Promise<NewApiKeyResponse> {
    // Verify user has access (via API key with settings:write scope)
    // TODO: Add proper tenant-level authorization

    const result = await this.apiKeyService.createKey({
      tenantId: input.tenantId,
      teamId: input.teamId,
      createdByUserId: user?.id,
      name: input.name,
      description: input.description,
      type: (input.type as ApiKeyType) || ApiKeyType.ADMIN_KEY,
      productPack: input.productPack as ProductPack,
      scopes: input.scopes as Scope[],
    });

    return result as any;
  }

  /**
   * Create a SUB_KEY with limited scopes
   */
  @Mutation(() => NewApiKeyResponse, {
    description: "Create a sub-key with limited scopes from parent key",
  })
  @UseAuthGuard()
  async createSubKey(
    @Auth() user: User,
    @Args("input") input: CreateSubKeyInput,
  ): Promise<NewApiKeyResponse> {
    const result = await this.apiKeyService.createSubKey(
      input.parentKeyId,
      input.name,
      input.scopes as Scope[],
      input.description,
    );

    return result as any;
  }

  /**
   * List all API keys for a tenant
   */
  @Query(() => [ApiKey])
  @UseAuthGuard()
  async apiKeys(
    @Auth() user: User,
    @Args() args: ListApiKeysArgs,
  ): Promise<ApiKey[]> {
    const keys = await this.apiKeyService.listKeys(args.tenantId);
    return keys as any;
  }

  /**
   * Get current tenant info
   */
  @Query(() => Tenant, { nullable: true })
  @UseAuthGuard()
  async tenant(
    @Args("tenantId") tenantId: string,
  ): Promise<Tenant | null> {
    const tenant = await this.apiKeyService.getTenant(tenantId);
    return tenant as any;
  }

  /**
   * Update tenant state (for onboarding flow)
   * Typically called by admin/internal after founder strategy session
   */
  @Mutation(() => Boolean)
  @UseAuthGuard()
  async updateTenantState(
    @Auth() user: User,
    @Args() args: UpdateTenantStateArgs,
  ): Promise<boolean> {
    // TODO: Restrict to OWNER_KEY only
    await this.apiKeyService.updateTenantState(
      args.tenantId,
      args.state as TenantState,
      args.completedBy,
    );
    return true;
  }

  /**
   * Revoke (permanently delete) an API key
   */
  @Mutation(() => Boolean)
  @UseAuthGuard()
  async revokeApiKey(
    @Auth() user: User,
    @Args() args: TenantKeyArgs,
  ): Promise<boolean> {
    return this.apiKeyService.revokeKey(args.keyId, args.tenantId);
  }

  /**
   * Deactivate an API key (can be reactivated later)
   */
  @Mutation(() => Boolean)
  @UseAuthGuard()
  async deactivateApiKey(
    @Auth() user: User,
    @Args() args: TenantKeyArgs,
  ): Promise<boolean> {
    return this.apiKeyService.deactivateKey(args.keyId, args.tenantId);
  }

  /**
   * Reactivate a deactivated API key
   */
  @Mutation(() => Boolean)
  @UseAuthGuard()
  async activateApiKey(
    @Auth() user: User,
    @Args() args: TenantKeyArgs,
  ): Promise<boolean> {
    return this.apiKeyService.activateKey(args.keyId, args.tenantId);
  }

  /**
   * Rotate an API key (create new, deactivate old)
   */
  @Mutation(() => NewApiKeyResponse, { nullable: true })
  @UseAuthGuard()
  async rotateApiKey(
    @Auth() user: User,
    @Args() args: TenantKeyArgs,
  ): Promise<NewApiKeyResponse | null> {
    const result = await this.apiKeyService.rotateKey(args.keyId, args.tenantId);
    return result as any;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY ENDPOINTS (Team-based, for backward compatibility)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @deprecated Use tenant-based endpoints instead
   * List API keys by team (legacy)
   */
  @Query(() => [ApiKey], { name: "teamApiKeys" })
  @UseAuthGuard()
  async legacyApiKeys(
    @Auth() user: User,
    @Args("teamId") teamId: string,
  ): Promise<ApiKey[]> {
    // Verify user has access to this team
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    // For now, return empty - team-based keys are being phased out
    return [];
  }
}
