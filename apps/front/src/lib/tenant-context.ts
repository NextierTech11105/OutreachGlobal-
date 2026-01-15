/**
 * Tenant Context & Isolation
 * ═══════════════════════════════════════════════════════════════════════════
 * Provides tenant-scoped database access to prevent cross-tenant data leakage.
 *
 * Usage:
 * ```
 * import { withTenantContext, getTenantLeads } from "@/lib/tenant-context";
 *
 * // In an API route:
 * const ctx = await withTenantContext();
 * if (!ctx.success) {
 *   return NextResponse.json({ error: ctx.error }, { status: ctx.status });
 * }
 *
 * // Queries are automatically scoped to the tenant
 * const leads = await getTenantLeads(ctx.teamId);
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { leads, subscriptions, buckets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireTenantContext, apiAuth } from "@/lib/api-auth";
import { Logger } from "@/lib/logger";

export interface TenantContext {
  success: true;
  userId: string;
  teamId: string;
  tenantId: string | null;
}

export interface TenantContextError {
  success: false;
  error: string;
  status: number;
}

/**
 * Get authenticated tenant context.
 * Returns error if user is not authenticated or missing team context.
 */
export async function withTenantContext(): Promise<
  TenantContext | TenantContextError
> {
  try {
    const ctx = await requireTenantContext();

    return {
      success: true,
      userId: ctx.userId,
      teamId: ctx.teamId,
      tenantId: ctx.tenantId,
    };
  } catch (error: any) {
    Logger.warn("TenantContext", "Failed to get tenant context", {
      error: error.message,
    });

    return {
      success: false,
      error: error.message || "Authentication required",
      status: 401,
    };
  }
}

/**
 * Verify that a resource belongs to the authenticated tenant.
 * Use this before any data access operation.
 */
export async function verifyTenantOwnership(
  resourceTeamId: string | null | undefined
): Promise<boolean> {
  try {
    const ctx = await requireTenantContext();

    if (!resourceTeamId) {
      return false;
    }

    return resourceTeamId === ctx.teamId;
  } catch {
    return false;
  }
}

// ============================================================================
// TENANT-SCOPED QUERY HELPERS
// ============================================================================

/**
 * Get leads for the authenticated tenant.
 */
export async function getTenantLeads(
  teamId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
) {
  if (!db) {
    throw new Error("Database not configured");
  }

  const query = db
    .select()
    .from(leads)
    .where(
      options?.status
        ? and(eq(leads.teamId, teamId), eq(leads.status, options.status))
        : eq(leads.teamId, teamId)
    )
    .orderBy(desc(leads.createdAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  return query;
}

/**
 * Get a single lead, verifying tenant ownership.
 */
export async function getTenantLead(leadId: string, teamId: string) {
  if (!db) {
    throw new Error("Database not configured");
  }

  const result = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)))
    .limit(1);

  return result[0] || null;
}

/**
 * Get buckets for the authenticated tenant.
 */
export async function getTenantBuckets(userId: string) {
  if (!db) {
    throw new Error("Database not configured");
  }

  return db
    .select()
    .from(buckets)
    .where(eq(buckets.userId, userId))
    .orderBy(desc(buckets.createdAt));
}

/**
 * Get subscription for the authenticated tenant.
 */
export async function getTenantSubscription(userId: string, teamId: string) {
  if (!db) {
    throw new Error("Database not configured");
  }

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return result[0] || null;
}

// ============================================================================
// MIDDLEWARE-STYLE WRAPPER
// ============================================================================

/**
 * Higher-order function to wrap API route handlers with tenant context.
 * Automatically validates authentication and provides tenant-scoped context.
 *
 * Usage:
 * ```
 * import { withTenantHandler } from "@/lib/tenant-context";
 *
 * export const GET = withTenantHandler(async (req, ctx) => {
 *   const leads = await getTenantLeads(ctx.teamId);
 *   return NextResponse.json({ leads });
 * });
 * ```
 */
export function withTenantHandler<T>(
  handler: (
    request: Request,
    context: TenantContext
  ) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const tenantResult = await withTenantContext();

    if (!tenantResult.success) {
      return new Response(
        JSON.stringify({ error: tenantResult.error }),
        {
          status: tenantResult.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return handler(request, tenantResult);
  };
}

/**
 * Log tenant access for audit purposes.
 */
export function logTenantAccess(
  action: string,
  teamId: string,
  resourceType: string,
  resourceId?: string
) {
  Logger.info("TenantAccess", action, {
    teamId,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a lead belongs to the specified team.
 * Returns the lead if valid, null if not found or wrong team.
 */
export async function validateLeadAccess(
  leadId: string,
  teamId: string
): Promise<{ valid: boolean; lead?: any; error?: string }> {
  if (!db) {
    return { valid: false, error: "Database not configured" };
  }

  const lead = await getTenantLead(leadId, teamId);

  if (!lead) {
    return { valid: false, error: "Lead not found or access denied" };
  }

  return { valid: true, lead };
}

/**
 * Validate that multiple leads belong to the specified team.
 * Returns only the leads that belong to the team.
 */
export async function validateLeadsAccess(
  leadIds: string[],
  teamId: string
): Promise<{ validIds: string[]; invalidIds: string[] }> {
  if (!db || leadIds.length === 0) {
    return { validIds: [], invalidIds: leadIds };
  }

  const validIds: string[] = [];
  const invalidIds: string[] = [];

  // Batch check (in production, use IN clause for efficiency)
  for (const id of leadIds) {
    const lead = await getTenantLead(id, teamId);
    if (lead) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }

  if (invalidIds.length > 0) {
    Logger.warn("TenantContext", "Invalid lead access attempt", {
      teamId,
      invalidIds,
    });
  }

  return { validIds, invalidIds };
}
