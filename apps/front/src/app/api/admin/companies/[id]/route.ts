import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers, users, teamSettings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

/**
 * GET /api/admin/companies/[id]
 * Get company detail with members and settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get team
    const teamsResult = await db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (teamsResult.length === 0) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const team = teamsResult[0];

    // Get owner
    const ownerResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, team.ownerId))
      .limit(1);

    const owner = ownerResult[0] || null;

    // Get team members
    const membersResult = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        status: teamMembers.status,
        createdAt: teamMembers.createdAt,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, id));

    // Get user info for each member
    const memberUserIds = membersResult
      .map((m) => m.userId)
      .filter((id): id is string => id !== null);

    const memberUsers =
      memberUserIds.length > 0
        ? await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(sql`${users.id} IN ${memberUserIds}`)
        : [];

    const userMap = new Map(memberUsers.map((u) => [u.id, u]));

    const members = membersResult.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      status: member.status,
      user: member.userId ? userMap.get(member.userId) || null : null,
      createdAt: member.createdAt.toISOString(),
    }));

    // Get team settings (phone numbers)
    const settingsResult = await db
      .select({
        name: teamSettings.name,
        value: teamSettings.value,
      })
      .from(teamSettings)
      .where(eq(teamSettings.teamId, id));

    const settings: Record<string, string> = {};
    for (const setting of settingsResult) {
      if (setting.name === "twilio_phone_number") {
        settings.twilioPhone = setting.value || undefined;
      }
      if (setting.name === "signalhouse_phone_number") {
        settings.signalhousePhone = setting.value || undefined;
      }
    }

    return NextResponse.json({
      success: true,
      company: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        owner,
        members,
        settings,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Admin Company Detail] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch company",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/companies/[id]
 * Update company
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // TODO: Implement company update
    return NextResponse.json({
      success: true,
      message: "Company update not yet implemented",
    });
  } catch (error) {
    console.error("[Admin Company Update] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update company" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * Delete company
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Implement company deletion (with cascading)
    return NextResponse.json({
      success: true,
      message: "Company deletion not yet implemented",
    });
  } catch (error) {
    console.error("[Admin Company Delete] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete company" },
      { status: 500 }
    );
  }
}
