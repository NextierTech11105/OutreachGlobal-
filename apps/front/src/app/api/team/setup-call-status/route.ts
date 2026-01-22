import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * SETUP CALL STATUS API
 * Check if a team has completed their onboarding setup call
 */

// GET - Check setup call status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ completed: false });
    }

    // Check team_settings for setup_call_completed flag
    const result = await db.execute(sql`
      SELECT value FROM team_settings
      WHERE team_id = ${teamId} AND name = 'setup_call_completed'
      LIMIT 1
    `);

    const row = result.rows?.[0];
    const completed = row?.value === "true";

    return NextResponse.json({ completed });
  } catch (error) {
    console.error("[SetupCallStatus] Error:", error);
    return NextResponse.json({ completed: false });
  }
}

// POST - Mark setup call as completed (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, adminKey } = body;

    // Simple admin key check (you can improve this later)
    const expectedKey = process.env.ADMIN_API_KEY || "nextier-admin-2024";
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Upsert setup_call_completed flag
    await db.execute(sql`
      INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
      VALUES (
        ${`${teamId}_setup_call_completed`},
        ${teamId},
        'setup_call_completed',
        'true',
        'boolean',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        value = 'true',
        updated_at = NOW()
    `);

    // Also update team state if applicable
    await db.execute(sql`
      UPDATE teams
      SET updated_at = NOW()
      WHERE id = ${teamId} OR slug = ${teamId}
    `).catch(() => {});

    console.log(`[SetupCallStatus] Marked team ${teamId} as setup call completed`);

    return NextResponse.json({
      success: true,
      message: `Team ${teamId} can now launch campaigns`,
      completedAt: now
    });
  } catch (error) {
    console.error("[SetupCallStatus] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 }
    );
  }
}
