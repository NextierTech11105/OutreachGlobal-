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

    // Check if team_settings table exists and has onboarding data
    const result = await db.execute(sql`
      SELECT
        onboarding_data,
        onboarding_completed_at,
        onboarding_current_step
      FROM team_settings
      WHERE team_id = ${teamId}
      LIMIT 1
    `);

    const row = result.rows?.[0];

    if (!row) {
      return NextResponse.json({
        success: true,
        hasStarted: false,
        completed: false,
        currentStep: 0,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasStarted: true,
      completed: !!row.onboarding_completed_at,
      completedAt: row.onboarding_completed_at,
      currentStep: row.onboarding_current_step || 0,
      data: row.onboarding_data,
    });
  } catch (error) {
    console.error("[Onboarding] GET Error:", error);
    // Return default state if table doesn't exist yet
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

    // Upsert onboarding data
    await db.execute(sql`
      INSERT INTO team_settings (
        team_id,
        onboarding_data,
        onboarding_current_step,
        onboarding_completed_at,
        updated_at
      ) VALUES (
        ${teamId},
        ${JSON.stringify(data)}::jsonb,
        ${currentStep},
        ${completed ? new Date().toISOString() : null},
        NOW()
      )
      ON CONFLICT (team_id) DO UPDATE SET
        onboarding_data = EXCLUDED.onboarding_data,
        onboarding_current_step = EXCLUDED.onboarding_current_step,
        onboarding_completed_at = COALESCE(EXCLUDED.onboarding_completed_at, team_settings.onboarding_completed_at),
        updated_at = NOW()
    `);

    // If completed, update team settings with audience profile
    if (completed && data.audienceProfile) {
      await db.execute(sql`
        UPDATE team_settings
        SET
          audience_profile = ${JSON.stringify(data.audienceProfile)}::jsonb,
          daily_capacity = ${data.dailyCapacity},
          default_message_template = ${data.firstMessageTemplate}
        WHERE team_id = ${teamId}
      `);
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
