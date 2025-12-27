import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers, users, teamSettings } from "@/lib/db/schema";
import { eq, count, like, sql, desc } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/api-auth";
import { logAdminAction } from "@/lib/audit-log";

/**
 * GET /api/admin/companies
 * List all companies (teams) for super admin
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Query all teams with owner info and member count
    let teamsQuery = db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .orderBy(desc(teams.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply search filter if provided
    const allTeams = search
      ? await db
          .select({
            id: teams.id,
            name: teams.name,
            slug: teams.slug,
            ownerId: teams.ownerId,
            createdAt: teams.createdAt,
            updatedAt: teams.updatedAt,
          })
          .from(teams)
          .where(like(teams.name, `%${search}%`))
          .orderBy(desc(teams.createdAt))
          .limit(limit)
          .offset(offset)
      : await teamsQuery;

    // Get member counts for each team
    const memberCounts = await db
      .select({
        teamId: teamMembers.teamId,
        count: count(),
      })
      .from(teamMembers)
      .groupBy(teamMembers.teamId);

    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.teamId, Number(mc.count)])
    );

    // Get owner info for each team
    const ownerIds = [...new Set(allTeams.map((t) => t.ownerId))];
    const owners = ownerIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(sql`${users.id} IN ${ownerIds}`)
      : [];

    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    // Get phone numbers for each team from team_settings
    const phoneSettings = await db
      .select({
        teamId: teamSettings.teamId,
        value: teamSettings.value,
      })
      .from(teamSettings)
      .where(eq(teamSettings.name, "twilio_phone_number"));

    const phoneMap = new Map(
      phoneSettings.map((ps) => [ps.teamId, ps.value])
    );

    // Build company objects
    const companies = allTeams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      owner: ownerMap.get(team.ownerId) || null,
      membersCount: memberCountMap.get(team.id) || 0,
      phone: phoneMap.get(team.id) || null,
      status: "active" as const, // Default to active - can add status column later
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    }));

    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(teams);
    const total = Number(totalResult[0]?.count || 0);

    // Calculate stats
    const stats = {
      total,
      active: total, // All are active for now
      inactive: 0,
      expired: 0,
    };

    return NextResponse.json({
      success: true,
      companies,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Admin Companies] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch companies",
        companies: [],
        stats: { total: 0, active: 0, inactive: 0, expired: 0 },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/companies
 * Create a new company
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
    const { name, slug, ownerId } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingTeam = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, slug))
      .limit(1);

    if (existingTeam.length > 0) {
      return NextResponse.json(
        { error: "A company with this slug already exists" },
        { status: 409 }
      );
    }

    // If ownerId provided, verify user exists
    let finalOwnerId = ownerId;
    if (ownerId) {
      const ownerExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1);

      if (ownerExists.length === 0) {
        return NextResponse.json(
          { error: "Owner user not found" },
          { status: 400 }
        );
      }
    } else {
      // Default to admin user as owner if not specified
      finalOwnerId = admin.userId;
    }

    // Generate ID and create company
    const teamId = crypto.randomUUID();
    const now = new Date();

    await db.insert(teams).values({
      id: teamId,
      name,
      slug,
      ownerId: finalOwnerId,
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as team member with OWNER role
    const memberId = crypto.randomUUID();
    await db.insert(teamMembers).values({
      id: memberId,
      teamId,
      userId: finalOwnerId,
      role: "OWNER",
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      action: "company.create",
      category: "company",
      targetType: "team",
      targetId: teamId,
      targetName: name,
      details: { slug, ownerId: finalOwnerId },
      request,
    });

    return NextResponse.json({
      success: true,
      company: {
        id: teamId,
        name,
        slug,
        ownerId: finalOwnerId,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Admin Companies] Create Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create company" },
      { status: 500 }
    );
  }
}
