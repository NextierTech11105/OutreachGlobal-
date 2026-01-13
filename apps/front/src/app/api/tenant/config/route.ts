import { NextRequest, NextResponse } from "next/server";
import { NEXTIER_DEFAULT_CONFIG } from "@/lib/tenant/types";

/**
 * TENANT CONFIG API
 * ═══════════════════════════════════════════════════════════════════════════════
 * GET: Fetch tenant config (falls back to NEXTIER default)
 * PATCH: Update tenant config
 *
 * This API returns the configuration that shapes the universal engine
 * to the tenant's specific business intent.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// In-memory store for now (replace with DB query when tenant_config table is migrated)
const tenantConfigStore = new Map<string, typeof NEXTIER_DEFAULT_CONFIG>();

// Initialize with NEXTIER default for the default team
tenantConfigStore.set("default", NEXTIER_DEFAULT_CONFIG);
tenantConfigStore.set("nextier", NEXTIER_DEFAULT_CONFIG);

/**
 * GET /api/tenant/config?team=<team_slug>
 * Returns tenant configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamSlug = searchParams.get("team") || "default";

    // Check in-memory store first
    let config = tenantConfigStore.get(teamSlug);

    // If not found, try to fetch from DB
    if (!config) {
      // TODO: Query tenant_config table when migrated
      // const dbConfig = await db
      //   .select()
      //   .from(tenantConfig)
      //   .where(eq(tenantConfig.teamId, teamId))
      //   .limit(1);

      // For now, return NEXTIER default
      config = NEXTIER_DEFAULT_CONFIG;
    }

    return NextResponse.json({
      success: true,
      config,
      source: tenantConfigStore.has(teamSlug) ? "cache" : "default",
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
      { status: 500 },
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
        { status: 400 },
      );
    }

    // Get existing config or default
    const existingConfig = tenantConfigStore.get(team) || {
      ...NEXTIER_DEFAULT_CONFIG,
    };

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

    // Store in memory
    tenantConfigStore.set(team, newConfig);

    // TODO: Persist to DB when tenant_config table is migrated
    // await db
    //   .insert(tenantConfig)
    //   .values({ teamId, config: newConfig })
    //   .onConflictDoUpdate({ target: tenantConfig.teamId, set: { config: newConfig } });

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
      { status: 500 },
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
        { status: 400 },
      );
    }

    // Start with default
    let config = { ...NEXTIER_DEFAULT_CONFIG };

    // If preset provided, use that as base
    // TODO: Load preset from INDUSTRY_PRESETS when available on frontend
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

    // Store
    tenantConfigStore.set(team, config);

    console.log(
      `[Tenant Config] Initialized config for team: ${team}, preset: ${preset || "default"}`,
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
      { status: 500 },
    );
  }
}
