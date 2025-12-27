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
}

/**
 * Get authenticated user ID from JWT session token
 * Use this instead of Clerk's auth() in API routes
 */
export async function apiAuth(): Promise<{ userId: string | null }> {
  try {
    const cookieStore = await cookies();
    // Try both prefixed and non-prefixed cookie names
    const token =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    if (!token) {
      return { userId: null };
    }

    // Decode JWT (verification happens on backend via GraphQL)
    const decoded = jwtDecode<JWTPayload>(token);

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { userId: null };
    }

    return { userId: decoded.sub };
  } catch (error) {
    console.error("[apiAuth] Error:", error);
    return { userId: null };
  }
}

/**
 * Get full auth context including token
 */
export async function getApiAuthContext(): Promise<{
  userId: string | null;
  token: string | null;
  email: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    if (!token) {
      return { userId: null, token: null, email: null };
    }

    const decoded = jwtDecode<JWTPayload>(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { userId: null, token: null, email: null };
    }

    return {
      userId: decoded.sub,
      token,
      email: decoded.username,
    };
  } catch (error) {
    console.error("[getApiAuthContext] Error:", error);
    return { userId: null, token: null, email: null };
  }
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
      console.warn(`[requireSuperAdmin] User ${user.email} attempted admin access without SUPER_ADMIN role`);
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
