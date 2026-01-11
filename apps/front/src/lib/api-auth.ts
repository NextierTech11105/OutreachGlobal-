/**
 * API Route Authentication
 * Uses JWT session token instead of Clerk
 */

import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
 * Get authenticated user ID from JWT session token
 * Use this instead of Clerk's auth() in API routes
 */
export async function apiAuth(): Promise<{
  userId: string | null;
  teamId: string | null;
  tenantId: string | null;
}> {
  try {
    const cookieStore = await cookies();
    // Try both prefixed and non-prefixed cookie names
    const token =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    if (!token) {
      return { userId: null, teamId: null, tenantId: null };
    }

    // Decode JWT (verification happens on backend via GraphQL)
    const decoded = jwtDecode<JWTPayload>(token);

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { userId: null, teamId: null, tenantId: null };
    }

    return {
      userId: decoded.sub,
      teamId: decoded.teamId ?? null,
      tenantId: decoded.tenantId ?? null,
    };
  } catch (error) {
    console.error("[apiAuth] Error:", error);
    return { userId: null, teamId: null, tenantId: null };
  }
}

/**
 * Get full auth context including token
 */
export async function getApiAuthContext(): Promise<{
  userId: string | null;
  token: string | null;
  email: string | null;
  tenantId: string | null;
  teamId: string | null;
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
      };
    }

    return {
      userId: decoded.sub,
      token,
      email: decoded.username,
      tenantId: decoded.tenantId ?? null,
      teamId: decoded.teamId ?? null,
    };
  } catch (error) {
    console.error("[getApiAuthContext] Error:", error);
    return {
      userId: null,
      token: null,
      email: null,
      tenantId: null,
      teamId: null,
    };
  }
}

/**
 * Require tenant/team context for multi-tenant API routes.
 * Throws on missing/expired token or missing teamId to avoid cross-tenant access.
 */
export async function requireTenantContext(): Promise<{
  userId: string;
  teamId: string;
  tenantId: string | null;
  token: string;
  email: string | null;
}> {
  const ctx = await getApiAuthContext();

  if (!ctx.token || !ctx.userId) {
    throw new Error("Unauthorized: missing session token");
  }

  if (!ctx.teamId) {
    throw new Error("Unauthorized: team context required");
  }

  return {
    userId: ctx.userId,
    teamId: ctx.teamId,
    tenantId: ctx.tenantId,
    token: ctx.token,
    email: ctx.email,
  };
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
