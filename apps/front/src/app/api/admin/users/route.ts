import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, teamMembers, teams } from "@/lib/db/schema";
import { eq, sql, desc, like, count, and } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/api-auth";

/**
 * GET /api/admin/users
 * List all users or users for a specific team
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (teamId) {
      // Get members of a specific team
      const members = await db
        .select({
          memberId: teamMembers.id,
          userId: teamMembers.userId,
          role: teamMembers.role,
          status: teamMembers.status,
          joinedAt: teamMembers.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(teamMembers)
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, teamId))
        .orderBy(desc(teamMembers.createdAt));

      return NextResponse.json({
        success: true,
        members: members.map((m) => ({
          id: m.memberId,
          userId: m.userId,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt?.toISOString(),
          user: {
            id: m.userId,
            name: m.userName,
            email: m.userEmail,
            globalRole: m.userRole,
          },
        })),
      });
    }

    // List all users with their team memberships
    let usersQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const allUsers = search
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            emailVerified: users.emailVerified,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset)
      : await usersQuery;

    // Get team memberships for each user
    const userIds = allUsers.map((u) => u.id);
    const memberships =
      userIds.length > 0
        ? await db
            .select({
              userId: teamMembers.userId,
              teamId: teamMembers.teamId,
              role: teamMembers.role,
              teamName: teams.name,
            })
            .from(teamMembers)
            .leftJoin(teams, eq(teamMembers.teamId, teams.id))
            .where(sql`${teamMembers.userId} IN ${userIds}`)
        : [];

    const membershipMap = new Map<string, typeof memberships>();
    for (const m of memberships) {
      if (!m.userId) continue;
      if (!membershipMap.has(m.userId)) {
        membershipMap.set(m.userId, []);
      }
      membershipMap.get(m.userId)!.push(m);
    }

    const usersWithTeams = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt?.toISOString(),
      teams: (membershipMap.get(user.id) || []).map((m) => ({
        teamId: m.teamId,
        teamName: m.teamName,
        role: m.role,
      })),
    }));

    // Get total count
    const totalResult = await db.select({ count: count() }).from(users);
    const total = Number(totalResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      users: usersWithTeams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Add a user to a team (invite) or create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "add-to-team": {
        // Add existing user to a team
        const { userId, teamId, role = "MEMBER" } = body;

        if (!userId || !teamId) {
          return NextResponse.json(
            { error: "userId and teamId are required" },
            { status: 400 }
          );
        }

        // Verify user exists
        const userExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userExists.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify team exists
        const teamExists = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);

        if (teamExists.length === 0) {
          return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Check if already a member
        const existingMembership = await db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
          .limit(1);

        if (existingMembership.length > 0) {
          return NextResponse.json(
            { error: "User is already a member of this team" },
            { status: 409 }
          );
        }

        // Validate role
        const validRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
        if (!validRoles.includes(role)) {
          return NextResponse.json(
            { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
            { status: 400 }
          );
        }

        // Add to team
        const memberId = crypto.randomUUID();
        const now = new Date();
        await db.insert(teamMembers).values({
          id: memberId,
          teamId,
          userId,
          role,
          status: "APPROVED",
          createdAt: now,
          updatedAt: now,
        });

        return NextResponse.json({
          success: true,
          membership: {
            id: memberId,
            userId,
            teamId,
            role,
            status: "APPROVED",
          },
        });
      }

      case "set-super-admin": {
        // Promote/demote user to/from SUPER_ADMIN
        const { userId, isSuperAdmin } = body;

        if (!userId) {
          return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const newRole = isSuperAdmin ? "SUPER_ADMIN" : "USER";

        await db
          .update(users)
          .set({ role: newRole, updatedAt: new Date() })
          .where(eq(users.id, userId));

        console.log(
          `[Admin Users] User ${userId} role changed to ${newRole} by admin ${admin.email}`
        );

        return NextResponse.json({
          success: true,
          message: `User role updated to ${newRole}`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role in a team
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { membershipId, role, status } = body;

    if (!membershipId) {
      return NextResponse.json(
        { error: "membershipId is required" },
        { status: 400 }
      );
    }

    // Verify membership exists
    const membership = await db
      .select({ id: teamMembers.id, teamId: teamMembers.teamId, userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.id, membershipId))
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    const updates: { role?: string; status?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (role !== undefined) {
      const validRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
      updates.role = role;
    }

    if (status !== undefined) {
      const validStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    await db
      .update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, membershipId));

    console.log(
      `[Admin Users] Membership ${membershipId} updated (role: ${role}, status: ${status}) by admin ${admin.email}`
    );

    return NextResponse.json({
      success: true,
      message: "Membership updated",
    });
  } catch (error) {
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update membership" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Remove a user from a team
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get("membershipId");
    const userId = searchParams.get("userId");
    const teamId = searchParams.get("teamId");

    if (membershipId) {
      // Delete by membership ID
      const membership = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(eq(teamMembers.id, membershipId))
        .limit(1);

      if (membership.length === 0) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
      }

      await db.delete(teamMembers).where(eq(teamMembers.id, membershipId));

      console.log(`[Admin Users] Membership ${membershipId} removed by admin ${admin.email}`);

      return NextResponse.json({
        success: true,
        message: "User removed from team",
      });
    }

    if (userId && teamId) {
      // Delete by user ID + team ID
      const membership = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)))
        .limit(1);

      if (membership.length === 0) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
      }

      await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)));

      console.log(
        `[Admin Users] User ${userId} removed from team ${teamId} by admin ${admin.email}`
      );

      return NextResponse.json({
        success: true,
        message: "User removed from team",
      });
    }

    return NextResponse.json(
      { error: "membershipId or (userId + teamId) are required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove user" },
      { status: 500 }
    );
  }
}
