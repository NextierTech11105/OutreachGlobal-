/**
 * API Route Authentication
 * Uses JWT session token instead of Clerk
 */

import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

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
