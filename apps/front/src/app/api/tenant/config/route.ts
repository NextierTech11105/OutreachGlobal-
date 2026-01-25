import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamSettings, teams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NEXTIER_DEFAULT_CONFIG } from "@/lib/tenant/types";

/**
 * TENANT CONFIG API
 * ═══════════════════════════════════════════════════════════════════════════════
 * GET: Fetch tenant config (falls back to NEXTIER default)
 * PATCH: Update tenant config
 *
 * This API returns the configuration that shapes the universal engine
 * to the tenant's specific business intent.
 *
 * Uses teamSettings table with name='tenant_config' for persistence.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CONFIG_SETTING_NAME = "tenant_config";

/**
 * GET /api/tenant/config?team=<team_slug>
 * Returns tenant configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamSlug = searchParams.get("team") || "default";

    // Look up team by slug to get teamId
    const team = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, teamSlug))
      .limit(1);

    const teamId = team[0]?.id;

    if (!teamId) {
      // No team found, return default config
      return NextResponse.json({
        success: true,
        config: NEXTIER_DEFAULT_CONFIG,
        source: "default",
      });
    }

    // Query teamSettings for tenant_config
    const settings = await db
      .select()
      .from(teamSettings)
      .where(
        and(
          eq(teamSettings.teamId, teamId),
          eq(teamSettings.name, CONFIG_SETTING_NAME)
        )
      )
      .limit(1);

    if (settings.length > 0 && settings[0].value) {
      // Parse stored config
      const storedConfig = JSON.parse(settings[0].value);
      return NextResponse.json({
        success: true,
        config: storedConfig,
        source: "database",
      });
    }

    // No config stored, return default
    return NextResponse.json({
      success: true,
      config: NEXTIER_DEFAULT_CONFIG,
      source: "default",
    });
  } catch (error) {
    console.error("[Tenant Config] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch config",
        config: NEXTIER_DEFAULT_CONFIG, // Always return a valid config
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenant/config
 * Update tenant configuration
 * Body: { team: string, updates: Partial<TenantConfigData> }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, updates } = body;

    if (!team) {
      return NextResponse.json(
        { success: false, error: "team is required" },
        { status: 400 }
      );
    }

    // Look up team by slug
    const teamRecord = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, team))
      .limit(1);

    const teamId = teamRecord[0]?.id;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Get existing config from DB
    const existingSettings = await db
      .select()
      .from(teamSettings)
      .where(
        and(
          eq(teamSettings.teamId, teamId),
          eq(teamSettings.name, CONFIG_SETTING_NAME)
        )
      )
      .limit(1);

    const existingConfig = existingSettings[0]?.value
      ? JSON.parse(existingSettings[0].value)
      : { ...NEXTIER_DEFAULT_CONFIG };

    // Merge updates
    const newConfig = {
      ...existingConfig,
      ...updates,
      // Deep merge nested objects
      branding: { ...existingConfig.branding, ...(updates.branding || {}) },
      messaging: { ...existingConfig.messaging, ...(updates.messaging || {}) },
      icp: { ...existingConfig.icp, ...(updates.icp || {}) },
      capacity: { ...existingConfig.capacity, ...(updates.capacity || {}) },
      features: { ...existingConfig.features, ...(updates.features || {}) },
      // Workers replace entirely if provided
      workers: updates.workers || existingConfig.workers,
    };

    // Upsert to database
    if (existingSettings.length > 0) {
      // Update existing
      await db
        .update(teamSettings)
        .set({
          value: JSON.stringify(newConfig),
          updatedAt: new Date(),
        })
        .where(eq(teamSettings.id, existingSettings[0].id));
    } else {
      // Insert new
      await db.insert(teamSettings).values({
        id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        teamId,
        name: CONFIG_SETTING_NAME,
        value: JSON.stringify(newConfig),
        type: "json",
      });
    }

    console.log(`[Tenant Config] Updated config for team: ${team}`);

    return NextResponse.json({
      success: true,
      config: newConfig,
    });
  } catch (error) {
    console.error("[Tenant Config] PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update config",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/config
 * Initialize tenant config from a preset
 * Body: { team: string, preset: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, preset, customConfig } = body;

    if (!team) {
      return NextResponse.json(
        { success: false, error: "team is required" },
        { status: 400 }
      );
    }

    // Look up team by slug
    const teamRecord = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, team))
      .limit(1);

    const teamId = teamRecord[0]?.id;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Start with default
    let config = { ...NEXTIER_DEFAULT_CONFIG };

    // If preset provided, use that as base
    if (preset === "nextier") {
      config = { ...NEXTIER_DEFAULT_CONFIG };
    }

    // Apply any custom config on top
    if (customConfig) {
      config = {
        ...config,
        ...customConfig,
        branding: { ...config.branding, ...(customConfig.branding || {}) },
        messaging: { ...config.messaging, ...(customConfig.messaging || {}) },
        icp: { ...config.icp, ...(customConfig.icp || {}) },
        capacity: { ...config.capacity, ...(customConfig.capacity || {}) },
        features: { ...config.features, ...(customConfig.features || {}) },
        workers: customConfig.workers || config.workers,
      };
    }

    // Check if config exists
    const existingSettings = await db
      .select()
      .from(teamSettings)
      .where(
        and(
          eq(teamSettings.teamId, teamId),
          eq(teamSettings.name, CONFIG_SETTING_NAME)
        )
      )
      .limit(1);

    // Upsert to database
    if (existingSettings.length > 0) {
      await db
        .update(teamSettings)
        .set({
          value: JSON.stringify(config),
          updatedAt: new Date(),
        })
        .where(eq(teamSettings.id, existingSettings[0].id));
    } else {
      await db.insert(teamSettings).values({
        id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        teamId,
        name: CONFIG_SETTING_NAME,
        value: JSON.stringify(config),
        type: "json",
      });
    }

    console.log(
      `[Tenant Config] Initialized config for team: ${team}, preset: ${preset || "default"}`
    );

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("[Tenant Config] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize config",
      },
      { status: 500 }
    );
  }
}
