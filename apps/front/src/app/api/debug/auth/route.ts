/**
 * DEBUG: Auth State Checker
 * Shows exactly what auth state the server sees for your request
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Get all auth-related cookies
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c =>
      c.name.includes("session") ||
      c.name.includes("auth") ||
      c.name.includes("token") ||
      c.name.includes("nextier")
    );

    // Try to get session token
    const sessionToken =
      cookieStore.get("nextier_session")?.value ||
      cookieStore.get("session")?.value;

    let decoded = null;
    let tokenStatus = "No session token found";
    let isExpired = false;

    if (sessionToken) {
      try {
        decoded = jwtDecode<any>(sessionToken);
        isExpired = decoded.exp && decoded.exp * 1000 < Date.now();
        tokenStatus = isExpired ? "Token EXPIRED" : "Token VALID";
      } catch (e) {
        tokenStatus = "Token decode FAILED: " + String(e);
      }
    }

    return NextResponse.json({
      status: sessionToken ? (isExpired ? "EXPIRED" : "AUTHENTICATED") : "NOT_AUTHENTICATED",
      summary: {
        hasSessionCookie: !!sessionToken,
        tokenStatus,
        userId: decoded?.sub || null,
        teamId: decoded?.teamId || null,
        email: decoded?.username || null,
        isExpired,
      },
      tokenDetails: decoded ? {
        sub: decoded.sub,
        username: decoded.username,
        teamId: decoded.teamId,
        tenantId: decoded.tenantId,
        iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        expiresIn: decoded.exp ? Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60) + " minutes" : null,
      } : null,
      cookies: {
        total: allCookies.length,
        authRelated: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0,
        })),
      },
      help: !sessionToken ? {
        problem: "No session cookie found",
        solution: "You need to log in at /login",
        note: "The import endpoints require authentication",
      } : isExpired ? {
        problem: "Your session has expired",
        solution: "Log out and log back in",
      } : !decoded?.teamId ? {
        problem: "No team ID in your session",
        solution: "Your account may not be associated with a team",
        note: "Contact support or check the teams table in the database",
      } : {
        status: "You are properly authenticated",
        userId: decoded.sub,
        teamId: decoded.teamId,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Debug check failed",
      details: String(error),
    }, { status: 500 });
  }
}
