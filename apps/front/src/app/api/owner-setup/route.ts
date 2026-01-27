/**
 * OWNER SETUP ENDPOINT
 * Creates a team for the platform owner (tb@outreachglobal.io)
 *
 * This is a ONE-TIME setup endpoint to bootstrap the owner's team.
 * GET or POST /api/owner-setup
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const OWNER_EMAIL = "tb@outreachglobal.io";

async function setupOwner() {
  try {
    // Find the owner user
    const [user] = await db.select().from(users).where(eq(users.email, OWNER_EMAIL)).limit(1);

    if (!user) {
      return NextResponse.json({
        error: "Owner user not found",
        email: OWNER_EMAIL,
        action: "Please sign up first at /sign-up",
      }, { status: 404 });
    }

    // Check if owner already has a team
    const existingTeams = await db.select().from(teams).where(eq(teams.ownerId, user.id));

    if (existingTeams.length > 0) {
      const team = existingTeams[0];
      return NextResponse.json({
        success: true,
        message: "Team already exists",
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
        },
        dashboardUrl: `/t/${team.slug}/dashboard`,
        leadsUrl: `/t/${team.slug}/leads`,
        campaignsUrl: `/t/${team.slug}/campaigns`,
      });
    }

    // Generate team ID and slug
    const teamId = "team_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const teamName = "OutreachGlobal";
    const slug = "outreachglobal";
    const now = new Date();

    // Create team
    await db.insert(teams).values({
      id: teamId,
      ownerId: user.id,
      name: teamName,
      slug: slug,
      createdAt: now,
      updatedAt: now,
    });

    // Create team member entry for owner
    const tmId = "tm_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.insert(teamMembers).values({
      id: tmId,
      teamId: teamId,
      userId: user.id,
      role: "OWNER",
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "Team created successfully!",
      team: {
        id: teamId,
        name: teamName,
        slug: slug,
      },
      dashboardUrl: `/t/${slug}/dashboard`,
      leadsUrl: `/t/${slug}/leads`,
      campaignsUrl: `/t/${slug}/campaigns`,
      skipTraceUrl: `/t/${slug}/skip-trace`,
      inboxUrl: `/t/${slug}/inbox`,
    });
  } catch (error) {
    console.error("[Owner Setup] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Setup failed",
    }, { status: 500 });
  }
}

export async function GET() {
  return setupOwner();
}

export async function POST() {
  return setupOwner();
}
