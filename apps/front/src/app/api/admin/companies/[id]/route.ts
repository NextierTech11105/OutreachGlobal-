import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers, users, teamSettings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/api-auth";
import { logAdminAction } from "@/lib/audit-log";

/**
 * GET /api/admin/companies/[id]
 * Get company detail with members and settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Get team
    const teamsResult = await db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (teamsResult.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
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

    const settings: Record<string, string | undefined> = {};
    for (const setting of settingsResult) {
      if (setting.name === "twilio_phone_number" && setting.value) {
        settings.twilioPhone = setting.value;
      }
      if (setting.name === "signalhouse_phone_number" && setting.value) {
        settings.signalhousePhone = setting.value;
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
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/companies/[id]
 * Update company name, slug, or owner
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Verify company exists
    const existingTeam = await db
      .select({ id: teams.id, ownerId: teams.ownerId })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (existingTeam.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, ownerId } = body;

    // Build update object
    const updates: {
      name?: string;
      slug?: string;
      ownerId?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { error: "Name must be a non-empty string" },
          { status: 400 },
        );
      }
      updates.name = name;
    }

    if (slug !== undefined) {
      if (!slug || typeof slug !== "string") {
        return NextResponse.json(
          { error: "Slug must be a non-empty string" },
          { status: 400 },
        );
      }
      // Check slug uniqueness (excluding current company)
      const slugExists = await db
        .select({ id: teams.id })
        .from(teams)
        .where(sql`${teams.slug} = ${slug} AND ${teams.id} != ${id}`)
        .limit(1);

      if (slugExists.length > 0) {
        return NextResponse.json(
          { error: "A company with this slug already exists" },
          { status: 409 },
        );
      }
      updates.slug = slug;
    }

    if (ownerId !== undefined) {
      // Verify new owner exists
      const ownerExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1);

      if (ownerExists.length === 0) {
        return NextResponse.json(
          { error: "Owner user not found" },
          { status: 400 },
        );
      }

      updates.ownerId = ownerId;

      // Update team member role - demote old owner, promote new owner
      const oldOwnerId = existingTeam[0].ownerId;

      if (oldOwnerId !== ownerId) {
        // Demote old owner to ADMIN
        await db
          .update(teamMembers)
          .set({ role: "ADMIN", updatedAt: new Date() })
          .where(
            sql`${teamMembers.teamId} = ${id} AND ${teamMembers.userId} = ${oldOwnerId}`,
          );

        // Check if new owner is already a member
        const newOwnerMember = await db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(
            sql`${teamMembers.teamId} = ${id} AND ${teamMembers.userId} = ${ownerId}`,
          )
          .limit(1);

        if (newOwnerMember.length > 0) {
          // Promote existing member to OWNER
          await db
            .update(teamMembers)
            .set({ role: "OWNER", updatedAt: new Date() })
            .where(eq(teamMembers.id, newOwnerMember[0].id));
        } else {
          // Add new owner as team member
          const memberId = crypto.randomUUID();
          await db.insert(teamMembers).values({
            id: memberId,
            teamId: id,
            userId: ownerId,
            role: "OWNER",
            status: "APPROVED",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // Apply updates
    await db.update(teams).set(updates).where(eq(teams.id, id));

    // Fetch updated company
    const updatedTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    // Audit log
    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      action: "company.update",
      category: "company",
      targetType: "team",
      targetId: id,
      targetName: updatedTeam[0].name,
      details: { updates: { name, slug, ownerId } },
      request,
    });

    return NextResponse.json({
      success: true,
      company: {
        id: updatedTeam[0].id,
        name: updatedTeam[0].name,
        slug: updatedTeam[0].slug,
        ownerId: updatedTeam[0].ownerId,
        updatedAt: updatedTeam[0].updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Admin Company Update] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update company",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * Delete company with all related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Verify company exists
    const existingTeam = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (existingTeam.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyName = existingTeam[0].name;

    // Check for confirmation parameter (safety check for destructive operation)
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get("confirm");

    if (confirm !== "true") {
      return NextResponse.json(
        {
          error: "Deletion requires confirmation",
          message:
            "Add ?confirm=true to confirm deletion. This will permanently delete the company and all associated data.",
        },
        { status: 400 },
      );
    }

    // Cascade delete related data
    // 1. Delete team members
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));

    // 2. Delete team settings
    await db.delete(teamSettings).where(eq(teamSettings.teamId, id));

    // 3. Delete the team itself
    await db.delete(teams).where(eq(teams.id, id));

    // Audit log (before logging since company is deleted)
    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      action: "company.delete",
      category: "company",
      targetType: "team",
      targetId: id,
      targetName: companyName,
      details: { permanentDelete: true },
      request,
    });

    console.log(
      `[Admin Company Delete] Company "${companyName}" (${id}) deleted by admin ${admin.email}`,
    );

    return NextResponse.json({
      success: true,
      message: `Company "${companyName}" has been permanently deleted`,
      deletedId: id,
    });
  } catch (error) {
    console.error("[Admin Company Delete] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete company",
      },
      { status: 500 },
    );
  }
}
