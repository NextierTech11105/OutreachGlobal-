import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * ONBOARDING API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Save and retrieve onboarding progress for teams
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface OnboardingData {
  industry: string;
  audienceProfile: {
    targetRoles: string[];
    geography: {
      states: string[];
      cities: string[];
      zips: string[];
    };
    sicCodes: string[];
    companySizeRange: string;
    employeeMin?: number;
    employeeMax?: number;
    revenueRange?: string;
    revenueMin?: number;
    revenueMax?: number;
  };
  uploadedFiles: {
    key: string;
    name: string;
    recordCount: number;
    tierBreakdown?: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
  }[];
  leadsImported: number;
  teamAcknowledged: boolean;
  dailyCapacity: number;
  firstMessageTemplate: string;
  testSentTo?: string;
  launched: boolean;
}

// GET - Retrieve onboarding status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default_team";

    // Check tenants table first (API-key governed architecture)
    const tenantResult = await db.execute(sql`
      SELECT
        id,
        name,
        onboarding_completed_at,
        onboarding_completed_by,
        state
      FROM tenants
      WHERE id = ${teamId} OR slug = ${teamId}
      LIMIT 1
    `);

    const tenant = tenantResult.rows?.[0];
    if (tenant) {
      // Check for stored onboarding data in settings
      const settingsResult = await db.execute(sql`
        SELECT value FROM team_settings
        WHERE team_id = ${teamId} AND name = 'onboarding_data'
        LIMIT 1
      `);
      const settingsRow = settingsResult.rows?.[0];
      const data = settingsRow?.value ? JSON.parse(settingsRow.value as string) : null;

      return NextResponse.json({
        success: true,
        hasStarted: tenant.state !== 'DEMO',
        completed: !!tenant.onboarding_completed_at,
        completedAt: tenant.onboarding_completed_at,
        currentStep: data?.currentStep || 0,
        data,
      });
    }

    // Fallback: check team_settings key-value store
    const settingsResult = await db.execute(sql`
      SELECT name, value FROM team_settings
      WHERE team_id = ${teamId} AND name IN ('onboarding_data', 'onboarding_completed')
    `);

    const settings: Record<string, string> = {};
    for (const row of settingsResult.rows || []) {
      settings[row.name as string] = row.value as string;
    }

    const data = settings.onboarding_data ? JSON.parse(settings.onboarding_data) : null;
    const completed = settings.onboarding_completed === 'true';

    return NextResponse.json({
      success: true,
      hasStarted: !!data,
      completed,
      currentStep: data?.currentStep || 0,
      data,
    });
  } catch (error) {
    console.error("[Onboarding] GET Error:", error);
    return NextResponse.json({
      success: true,
      hasStarted: false,
      completed: false,
      currentStep: 0,
      data: null,
    });
  }
}

// POST - Save onboarding progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId = "default_team",
      data,
      completed = false,
      currentStep = 0,
    }: {
      teamId: string;
      data: OnboardingData;
      completed: boolean;
      currentStep: number;
    } = body;

    const dataWithStep = { ...data, currentStep };
    const dataJson = JSON.stringify(dataWithStep);
    const now = new Date().toISOString();

    // Save to team_settings as key-value pairs (works with existing schema)
    // Upsert onboarding_data
    await db.execute(sql`
      INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
      VALUES (
        ${`${teamId}_onboarding_data`},
        ${teamId},
        'onboarding_data',
        ${dataJson},
        'json',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `);

    // If completed, mark as completed
    if (completed) {
      await db.execute(sql`
        INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
        VALUES (
          ${`${teamId}_onboarding_completed`},
          ${teamId},
          'onboarding_completed',
          'true',
          'boolean',
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          value = 'true',
          updated_at = NOW()
      `);

      // Also update tenants table if it exists
      await db.execute(sql`
        UPDATE tenants
        SET
          onboarding_completed_at = ${now}::timestamp,
          state = 'READY_FOR_EXECUTION',
          updated_at = NOW()
        WHERE id = ${teamId} OR slug = ${teamId}
      `).catch(() => {
        // Tenant may not exist, that's OK
      });

      // Save audience profile separately for easy access
      if (data.audienceProfile) {
        await db.execute(sql`
          INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
          VALUES (
            ${`${teamId}_audience_profile`},
            ${teamId},
            'audience_profile',
            ${JSON.stringify(data.audienceProfile)},
            'json',
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
        `);
      }
    }

    return NextResponse.json({
      success: true,
      completed,
      currentStep,
      message: completed
        ? "Onboarding complete! Your machine is ready."
        : "Progress saved successfully.",
    });
  } catch (error) {
    console.error("[Onboarding] POST Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save onboarding data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
