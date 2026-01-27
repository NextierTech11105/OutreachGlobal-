/**
 * API Route Authentication
 * Uses JWT session token instead of Clerk
 */

import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

interface JWTPayload {
  sub: string; // User ID
  username: string; // Email
  jti: string; // Token ID
  iat: number;
  exp: number;
  iss: string;
  tenantId?: string;
  teamId?: string;
}

/**
 * Lookup user's team from database when not included in JWT
 *
 * Priority:
 * 1. Team where user is OWNER
 * 2. Team where user is ACTIVE MEMBER
 *
 * This ensures proper tenant isolation and supports both
 * account owners and invited team members.
 */
async function lookupUserTeam(userId: string): Promise<string | null> {
  if (!db) {
    return null;
  }

  try {
    // First priority: User owns a team
    const ownerResult = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.ownerId, userId))
      .limit(1);

    if (ownerResult.length > 0) {
      return ownerResult[0].id;
    }

    // Second priority: User is an active member of a team
    const memberResult = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, userId), eq(teamMembers.status, "ACTIVE")),
      )
      .limit(1);

    if (memberResult.length > 0) {
      return memberResult[0].teamId;
    }

    return null;
  } catch (error) {
    console.error("[lookupUserTeam] Error:", error);
    return null;
  }
}

/**
 * Get authenticated user ID from JWT session token
 * Use this instead of Clerk's auth() in API routes
 *
 * Note: If teamId is not in JWT, we lookup the user's team from the database
 */
export async function apiAuth(): Promise<{
  userId: string | null;
  teamId: string | null;
  tenantId: string | null;
  role: string | null;
  isOwner: boolean;
  canBypass: boolean;
}> {
  try {
    const cookieStore = await cookies();
    // Try both prefixed and non-prefixed cookie names
    const token =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    if (!token) {
      return { userId: null, teamId: null, tenantId: null, role: null, isOwner: false, canBypass: false };
    }

    // Decode JWT (verification happens on backend via GraphQL)
    const decoded = jwtDecode<JWTPayload>(token);

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { userId: null, teamId: null, tenantId: null, role: null, isOwner: false, canBypass: false };
    }

    // Get teamId from JWT or lookup from database
    let teamId = decoded.teamId ?? null;
    if (!teamId && decoded.sub) {
      teamId = await lookupUserTeam(decoded.sub);
    }

    // Fetch role and ownership info from DB if available
    let role: string | null = null;
    let isOwner = false;
    try {
      if (decoded.sub && db) {
        const userResult = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.id, decoded.sub))
          .limit(1);
        if (userResult.length > 0) {
          role = userResult[0].role ?? null;
        }

        // Check if user is an owner of any team
        const ownerCheck = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.ownerId, decoded.sub))
          .limit(1);
        isOwner = ownerCheck.length > 0;
      }
    } catch (e) {
      console.error('[apiAuth] role/owner lookup failed', e);
    }

    const canBypass = (process.env.FEATURE_OWNER_BYPASS === 'true' && isOwner) || role === SUPER_ADMIN_ROLE;

    return {
      userId: decoded.sub,
      teamId,
      tenantId: decoded.tenantId ?? null,
      role,
      isOwner,
      canBypass,
    };
  } catch (error) {
    console.error("[apiAuth] Error:", error);
    return { userId: null, teamId: null, tenantId: null, role: null, isOwner: false, canBypass: false };
  }
}

/**
 * Get full auth context including token
 *
 * Note: If teamId is not in JWT, we lookup the user's team from the database
 */
export async function getApiAuthContext(): Promise<{
  userId: string | null;
  token: string | null;
  email: string | null;
  tenantId: string | null;
  teamId: string | null;
  role: string | null;
  isOwner: boolean;
  canBypass: boolean;
}> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    if (!token) {
      return {
        userId: null,
        token: null,
        email: null,
        tenantId: null,
        teamId: null,
        role: null,
        isOwner: false,
        canBypass: false,
      };
    }

    const decoded = jwtDecode<JWTPayload>(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return {
        userId: null,
        token: null,
        email: null,
        tenantId: null,
        teamId: null,
        role: null,
        isOwner: false,
        canBypass: false,
      };
    }

    // Get teamId from JWT or lookup from database
    let teamId = decoded.teamId ?? null;
    if (!teamId && decoded.sub) {
      teamId = await lookupUserTeam(decoded.sub);
    }

    // Fetch role and ownership info from DB if available
    let role: string | null = null;
    let isOwner = false;
    try {
      if (decoded.sub && db) {
        const userResult = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.id, decoded.sub))
          .limit(1);
        if (userResult.length > 0) {
          role = userResult[0].role ?? null;
        }

        // Check if user is an owner of any team
        const ownerCheck = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.ownerId, decoded.sub))
          .limit(1);
        isOwner = ownerCheck.length > 0;
      }
    } catch (e) {
      console.error('[getApiAuthContext] role/owner lookup failed', e);
    }

    const canBypass = (process.env.FEATURE_OWNER_BYPASS === 'true' && isOwner) || role === SUPER_ADMIN_ROLE;

    return {
      userId: decoded.sub,
      token,
      email: decoded.username,
      tenantId: decoded.tenantId ?? null,
      teamId,
      role,
      isOwner,
      canBypass,
    };
  } catch (error) {
    console.error("[getApiAuthContext] Error:", error);
    return {
      userId: null,
      token: null,
      email: null,
      tenantId: null,
      teamId: null,
      role: null,
      isOwner: false,
      canBypass: false,
    };
  }
}

/**
 * Require tenant/team context for multi-tenant API routes.
 * Throws on missing/expired token or missing teamId to avoid cross-tenant access.
 */
export async function requireTenantContext(): Promise<{
  userId: string;
  teamId: string | null;
  tenantId: string | null;
  token: string;
  email: string | null;
  role?: string | null;
  isOwner?: boolean;
  canBypass?: boolean;
}> {
  const ctx = await getApiAuthContext();

  if (!ctx.token || !ctx.userId) {
    throw new Error("Unauthorized: missing session token");
  }

  // If we have a team context, return it immediately
  if (ctx.teamId) {
    return {
      userId: ctx.userId,
      teamId: ctx.teamId,
      tenantId: ctx.tenantId,
      token: ctx.token,
      email: ctx.email,
      role: ctx.role,
      isOwner: ctx.isOwner,
      canBypass: ctx.canBypass,
    };
  }

  // Owner bypass enabled and user can bypass (owner or super-admin)
  if (ctx.canBypass) {
    // Audit: log that an owner bypass occurred (structured console warn for now)
    try {
      console.warn(JSON.stringify({
        level: 'warn',
        source: 'auth',
        message: `Owner bypass used by user ${ctx.userId}`,
        userId: ctx.userId,
        note: 'FEATURE_OWNER_BYPASS',
        timestamp: new Date().toISOString(),
      }));
    } catch {
      // Ignore logging errors
    }

    return {
      userId: ctx.userId,
      teamId: null,
      tenantId: ctx.tenantId,
      token: ctx.token,
      email: ctx.email,
      role: ctx.role,
      isOwner: ctx.isOwner,
      canBypass: ctx.canBypass,
    };
  }

  // Default: require a team context
  throw new Error("Unauthorized: team context required");
}

/**
 * Require super admin role for admin API routes
 * Returns user info if authorized, null if not
 */
export async function requireSuperAdmin(): Promise<{
  userId: string;
  email: string;
  isSuperAdmin: true;
} | null> {
  try {
    const auth = await getApiAuthContext();
    if (!auth.userId) {
      return null;
    }

    if (!db) {
      console.error("[requireSuperAdmin] Database not configured");
      return null;
    }

    // Check if user has SUPER_ADMIN role
    const userResult = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];
    if (user.role !== SUPER_ADMIN_ROLE) {
      console.warn(
        `[requireSuperAdmin] User ${user.email} attempted admin access without SUPER_ADMIN role`,
      );
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      isSuperAdmin: true,
    };
  } catch (error) {
    console.error("[requireSuperAdmin] Error:", error);
    return null;
  }
}
