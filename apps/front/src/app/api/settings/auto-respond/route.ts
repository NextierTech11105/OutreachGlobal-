import { NextRequest, NextResponse } from "next/server";
import { autoRespondService } from "@/lib/services/auto-respond";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { clearConfigCache } from "@/lib/config/inbound-processing.config";

/**
 * AUTO-RESPOND SETTINGS API
 * ═══════════════════════════════════════════════════════════════════════════
 * GET  - Retrieve current auto-respond settings
 * POST - Update auto-respond settings
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface AutoRespondSettings {
  enabled: boolean;
  delayMinSeconds: number;
  delayMaxSeconds: number;
  requireApproval: boolean;
}

// GET - Get current auto-respond settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default";

    // Get runtime config (in-memory)
    const runtimeConfig = autoRespondService.getConfig(teamId);

    // Get DB settings
    let dbSettings: Record<string, string> = {};
    try {
      const settings = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.category, "inbound_processing"));

      for (const s of settings) {
        dbSettings[s.key] = s.value || "";
      }
    } catch {}

    return NextResponse.json({
      success: true,
      settings: {
        enabled: dbSettings.AUTO_RESPOND_ENABLED !== "false",
        delayMinSeconds: parseInt(dbSettings.AUTO_RESPOND_DELAY_MIN || "180"),
        delayMaxSeconds: parseInt(dbSettings.AUTO_RESPOND_DELAY_MAX || "300"),
        requireApproval: dbSettings.AUTO_RESPOND_REQUIRE_APPROVAL === "true",
      },
      runtimeConfig: {
        enabled: runtimeConfig.enabled,
        delayMinSeconds: runtimeConfig.delayMinSeconds,
        delayMaxSeconds: runtimeConfig.delayMaxSeconds,
        humanApprovalRequired: runtimeConfig.humanApprovalRequired,
        personality: runtimeConfig.personality,
        preset: runtimeConfig.preset,
      },
      // Show pending responses awaiting approval
      pendingApprovals: autoRespondService.getAwaitingApproval(teamId).length,
    });
  } catch (error) {
    console.error("[Auto-Respond Settings] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

// POST - Update auto-respond settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      enabled,
      delayMinSeconds,
      delayMaxSeconds,
      requireApproval,
      teamId = "default",
    } = body;

    // Update DB settings (source of truth)
    const updates: Array<{ key: string; value: string }> = [];

    if (enabled !== undefined) {
      updates.push({ key: "AUTO_RESPOND_ENABLED", value: String(enabled) });
    }
    if (delayMinSeconds !== undefined) {
      updates.push({
        key: "AUTO_RESPOND_DELAY_MIN",
        value: String(delayMinSeconds),
      });
    }
    if (delayMaxSeconds !== undefined) {
      updates.push({
        key: "AUTO_RESPOND_DELAY_MAX",
        value: String(delayMaxSeconds),
      });
    }
    if (requireApproval !== undefined) {
      updates.push({
        key: "AUTO_RESPOND_REQUIRE_APPROVAL",
        value: String(requireApproval),
      });
    }

    // Upsert each setting
    for (const { key, value } of updates) {
      try {
        // Check if exists
        const existing = await db
          .select()
          .from(systemSettings)
          .where(
            and(
              eq(systemSettings.category, "inbound_processing"),
              eq(systemSettings.key, key)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(systemSettings)
            .set({ value, updatedAt: new Date() })
            .where(
              and(
                eq(systemSettings.category, "inbound_processing"),
                eq(systemSettings.key, key)
              )
            );
        } else {
          await db.insert(systemSettings).values({
            id: crypto.randomUUID(),
            category: "inbound_processing",
            key,
            value,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (dbErr) {
        console.error(`[Auto-Respond Settings] Failed to update ${key}:`, dbErr);
      }
    }

    // Clear config cache so new settings take effect
    clearConfigCache();

    // Also update runtime config for immediate effect
    autoRespondService.updateConfig(teamId, {
      enabled: enabled !== undefined ? enabled : undefined,
      delayMinSeconds: delayMinSeconds,
      delayMaxSeconds: delayMaxSeconds,
      humanApprovalRequired: requireApproval,
    });

    console.log(`[Auto-Respond Settings] Updated:`, {
      enabled,
      delayMinSeconds,
      delayMaxSeconds,
      requireApproval,
    });

    return NextResponse.json({
      success: true,
      message: "Auto-respond settings updated",
      settings: {
        enabled: enabled !== undefined ? enabled : true,
        delayMinSeconds: delayMinSeconds || 180,
        delayMaxSeconds: delayMaxSeconds || 300,
        requireApproval: requireApproval || false,
      },
    });
  } catch (error) {
    console.error("[Auto-Respond Settings] POST error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

// PUT - Toggle auto-respond on/off quickly
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, teamId = "default" } = body;

    if (enabled === undefined) {
      return NextResponse.json(
        { error: "enabled field is required" },
        { status: 400 }
      );
    }

    // Update DB
    try {
      const existing = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.category, "inbound_processing"),
            eq(systemSettings.key, "AUTO_RESPOND_ENABLED")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({ value: String(enabled), updatedAt: new Date() })
          .where(
            and(
              eq(systemSettings.category, "inbound_processing"),
              eq(systemSettings.key, "AUTO_RESPOND_ENABLED")
            )
          );
      } else {
        await db.insert(systemSettings).values({
          id: crypto.randomUUID(),
          category: "inbound_processing",
          key: "AUTO_RESPOND_ENABLED",
          value: String(enabled),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch {}

    // Clear cache and update runtime
    clearConfigCache();
    autoRespondService.toggle(teamId, enabled);

    console.log(`[Auto-Respond] Toggled to: ${enabled ? "ON" : "OFF"}`);

    return NextResponse.json({
      success: true,
      enabled,
      message: `Auto-respond ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("[Auto-Respond Settings] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to toggle" },
      { status: 500 }
    );
  }
}
