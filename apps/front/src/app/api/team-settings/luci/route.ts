import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { teamSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const SETTING_NAME = "luci_config";

interface LuciConfig {
  active: boolean;
  dailyLimit: number;
  schedule?: {
    startHour: number;
    endHour: number;
    timezone: string;
    daysOfWeek: number[]; // 0-6, Sunday-Saturday
  };
}

const DEFAULT_CONFIG: LuciConfig = {
  active: false,
  dailyLimit: 50,
  schedule: {
    startHour: 9,
    endHour: 17,
    timezone: "America/New_York",
    daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
  },
};

/**
 * GET /api/team-settings/luci
 *
 * Returns the LUCI automation configuration for the team
 */
export async function GET() {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!db) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    // Fetch LUCI config from team settings
    const result = await db
      .select({ value: teamSettings.value })
      .from(teamSettings)
      .where(
        and(
          eq(teamSettings.teamId, teamId),
          eq(teamSettings.name, SETTING_NAME)
        )
      )
      .limit(1);

    if (result.length === 0 || !result[0].value) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    try {
      const config = JSON.parse(result[0].value) as LuciConfig;
      return NextResponse.json({
        ...DEFAULT_CONFIG,
        ...config,
      });
    } catch {
      return NextResponse.json(DEFAULT_CONFIG);
    }
  } catch (error) {
    console.error("[LUCI Settings] GET Error:", error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

/**
 * POST /api/team-settings/luci
 *
 * Updates the LUCI automation configuration for the team
 * Body: { active: boolean, dailyLimit: number, schedule?: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const config: LuciConfig = {
      active: typeof body.active === "boolean" ? body.active : false,
      dailyLimit: typeof body.dailyLimit === "number"
        ? Math.max(0, Math.min(500, body.dailyLimit)) // Clamp 0-500
        : 50,
      schedule: body.schedule || DEFAULT_CONFIG.schedule,
    };

    if (!db) {
      return NextResponse.json(config);
    }

    // Check if setting exists
    const existing = await db
      .select({ id: teamSettings.id })
      .from(teamSettings)
      .where(
        and(
          eq(teamSettings.teamId, teamId),
          eq(teamSettings.name, SETTING_NAME)
        )
      )
      .limit(1);

    const configJson = JSON.stringify(config);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(teamSettings)
        .set({
          value: configJson,
          updatedAt: new Date(),
        })
        .where(eq(teamSettings.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(teamSettings).values({
        id: nanoid(),
        teamId,
        name: SETTING_NAME,
        value: configJson,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("[LUCI Settings] POST Error:", error);
    return NextResponse.json(
      { error: "Failed to save LUCI settings" },
      { status: 500 }
    );
  }
}
