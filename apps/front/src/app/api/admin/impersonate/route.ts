import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiAuthContext } from "@/lib/api-auth";

const IMPERSONATION_COOKIE = "nextier_impersonation";
const ORIGINAL_TOKEN_COOKIE = "nextier_original_session";

interface ImpersonationContext {
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  targetTeamId: string;
  targetTeamName: string;
  targetTeamSlug: string;
  adminUserId: string;
  startedAt: string;
}

/**
 * POST /api/admin/impersonate
 * Start impersonating a user/company
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth.userId || !auth.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add proper super admin check
    // For now, allow any authenticated user (we'll add role check later)

    const body = await request.json();
    const { targetUserId, targetTeamId } = body;

    if (!targetUserId || !targetTeamId) {
      return NextResponse.json(
        { error: "targetUserId and targetTeamId are required" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get target user info
    const targetUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    const targetUser = targetUsers[0];

    // Get target team info
    const targetTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
      })
      .from(teams)
      .where(eq(teams.id, targetTeamId))
      .limit(1);

    if (targetTeams.length === 0) {
      return NextResponse.json(
        { error: "Target team not found" },
        { status: 404 }
      );
    }

    const targetTeam = targetTeams[0];

    // Create impersonation context
    const impersonationContext: ImpersonationContext = {
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      targetTeamId: targetTeam.id,
      targetTeamName: targetTeam.name,
      targetTeamSlug: targetTeam.slug,
      adminUserId: auth.userId,
      startedAt: new Date().toISOString(),
    };

    // Set cookies
    const cookieStore = await cookies();

    // Store original token for exit
    cookieStore.set(ORIGINAL_TOKEN_COOKIE, auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Store impersonation context (readable by client)
    cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(impersonationContext), {
      httpOnly: false, // Readable by client for banner
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({
      success: true,
      message: `Now impersonating ${targetUser.name} at ${targetTeam.name}`,
      redirectTo: `/t/${targetTeam.slug}`,
      impersonation: impersonationContext,
    });
  } catch (error) {
    console.error("[Impersonate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start impersonation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/impersonate
 * Exit impersonation and return to admin
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();

    // Get original token
    const originalToken = cookieStore.get(ORIGINAL_TOKEN_COOKIE)?.value;

    if (!originalToken) {
      return NextResponse.json(
        { error: "No impersonation session found" },
        { status: 400 }
      );
    }

    // Clear impersonation cookies
    cookieStore.delete(IMPERSONATION_COOKIE);
    cookieStore.delete(ORIGINAL_TOKEN_COOKIE);

    return NextResponse.json({
      success: true,
      message: "Impersonation ended",
      redirectTo: "/admin/companies",
    });
  } catch (error) {
    console.error("[Impersonate Exit] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to exit impersonation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/impersonate
 * Check current impersonation status
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE)?.value;

    if (!impersonationCookie) {
      return NextResponse.json({
        isImpersonating: false,
        impersonation: null,
      });
    }

    const impersonation = JSON.parse(impersonationCookie) as ImpersonationContext;

    return NextResponse.json({
      isImpersonating: true,
      impersonation,
    });
  } catch (error) {
    console.error("[Impersonate Status] Error:", error);
    return NextResponse.json({
      isImpersonating: false,
      impersonation: null,
    });
  }
}
