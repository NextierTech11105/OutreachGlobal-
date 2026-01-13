import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * CRM INTEGRATIONS API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Manage CRM integrations for teams
 * Supports: Zoho, Salesforce, HubSpot, Pipedrive, Monday.com, Custom Webhooks
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// GET - Retrieve CRM config for a team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    // Get CRM integration config from team_settings
    const result = await db.execute(sql`
      SELECT value FROM team_settings
      WHERE team_id = ${teamId} AND name = 'crm_integration'
      LIMIT 1
    `);

    const row = result.rows?.[0];
    if (!row?.value) {
      return NextResponse.json({
        enabled: false,
        provider: null,
        message: "No CRM integration configured",
      });
    }

    const config = JSON.parse(row.value as string);

    // Don't expose sensitive credentials
    return NextResponse.json({
      enabled: config.enabled,
      provider: config.provider,
      syncSettings: config.syncSettings,
      fieldMapping: config.fieldMapping,
      hasCredentials:
        !!config.credentials?.accessToken || !!config.credentials?.apiKey,
    });
  } catch (error) {
    console.error("[CRM Integration] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve CRM config" },
      { status: 500 },
    );
  }
}

// POST - Save CRM config for a team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId,
      provider,
      credentials,
      syncSettings,
      fieldMapping,
      enabled,
    } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    const config = {
      provider,
      credentials,
      syncSettings: syncSettings || {
        syncDirection: "bidirectional",
        syncLeads: true,
        syncContacts: true,
        syncDeals: false,
        syncActivities: true,
        syncOnSmsReceived: true,
        syncOnSmsSent: true,
        syncOnCallCompleted: true,
        syncOnStatusChange: true,
        syncOnDealClosed: false,
        realTimeSync: true,
        batchSyncIntervalMinutes: 15,
      },
      fieldMapping: fieldMapping || {},
      enabled: enabled ?? true,
      updatedAt: new Date().toISOString(),
    };

    // Upsert CRM integration config
    await db.execute(sql`
      INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
      VALUES (
        ${`${teamId}_crm_integration`},
        ${teamId},
        'crm_integration',
        ${JSON.stringify(config)},
        'json',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `);

    return NextResponse.json({
      success: true,
      message: `CRM integration ${enabled ? "enabled" : "disabled"} successfully`,
      provider,
    });
  } catch (error) {
    console.error("[CRM Integration] POST Error:", error);
    return NextResponse.json(
      { error: "Failed to save CRM config" },
      { status: 500 },
    );
  }
}

// PUT - Sync activity to CRM
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, activity } = body;

    if (!teamId || !activity) {
      return NextResponse.json(
        { error: "teamId and activity are required" },
        { status: 400 },
      );
    }

    // Get CRM config
    const configResult = await db.execute(sql`
      SELECT value FROM team_settings
      WHERE team_id = ${teamId} AND name = 'crm_integration'
      LIMIT 1
    `);

    const row = configResult.rows?.[0];
    if (!row?.value) {
      return NextResponse.json({
        success: false,
        error: "No CRM integration configured",
      });
    }

    const config = JSON.parse(row.value as string);
    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        error: "CRM integration is disabled",
      });
    }

    // Import and use the service
    const { UnifiedCRMService } = await import("@/lib/crm/unified-crm-service");
    const crmService = new UnifiedCRMService(config);

    const result = await crmService.syncActivity(activity);

    // Log sync attempt
    await db.execute(sql`
      INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
      VALUES (
        ${`${teamId}_crm_sync_log_${Date.now()}`},
        ${teamId},
        'crm_sync_log',
        ${JSON.stringify({
          activity,
          result,
          timestamp: new Date().toISOString(),
        })},
        'json',
        NOW(),
        NOW()
      )
    `);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRM Integration] PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to sync activity to CRM" },
      { status: 500 },
    );
  }
}
