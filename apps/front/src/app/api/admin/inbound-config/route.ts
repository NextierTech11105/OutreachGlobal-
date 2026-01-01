import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Inbound Processing Config API
 * GET: Retrieve all inbound processing settings
 * POST: Update inbound processing settings
 */

// Define the inbound processing settings with metadata
const INBOUND_SETTINGS = [
  // Call Queue Routing
  {
    key: "CALL_QUEUE_PRIORITY_THRESHOLD",
    label: "Call Queue Priority Threshold",
    description: "Minimum score required for call queue eligibility",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "50",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "CALL_QUEUE_GOLD_LABEL_PRIORITY",
    label: "Gold Label Priority",
    description: "Priority score for GOLD leads (email + mobile verified)",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "100",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "CALL_QUEUE_GREEN_TAG_PRIORITY",
    label: "Green Tag Priority",
    description: "Priority score for GREEN leads (positive response)",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "75",
    minValue: 0,
    maxValue: 100,
  },
  // Contactability Scoring
  {
    key: "WEIGHT_EMAIL_CAPTURED",
    label: "Email Captured Weight",
    description: "Score boost when email is captured (50 = 50%)",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "50",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "WEIGHT_MOBILE_CAPTURED",
    label: "Mobile Captured Weight",
    description: "Score boost when mobile is captured (50 = 50%)",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "50",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "WEIGHT_CONTACT_VERIFIED",
    label: "Contact Verified Weight",
    description: "Additional score when both email AND mobile verified",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "0",
    minValue: 0,
    maxValue: 100,
  },
  // Inbound Response Priority Boost
  {
    key: "WEIGHT_INBOUND_RESPONSE",
    label: "Inbound Response Weight",
    description: "Priority boost for any positive SMS reply",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "25",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "WEIGHT_HIGH_INTENT",
    label: "High Intent Weight",
    description: "Priority boost for strong buying signals",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "30",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "WEIGHT_WANTS_CALL",
    label: "Wants Call Weight",
    description: "Priority boost for explicit call requests",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "35",
    minValue: 0,
    maxValue: 100,
  },
  {
    key: "WEIGHT_QUESTION_ASKED",
    label: "Question Asked Weight",
    description: "Priority boost for engagement signals (questions)",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "15",
    minValue: 0,
    maxValue: 100,
  },
  // Feature Flags
  {
    key: "AUTO_ROUTE_TO_CALL_CENTER",
    label: "Auto-Route to Call Center",
    description: "Automatically push qualified leads to call queue",
    valueType: "boolean",
    category: "inbound_processing",
    defaultValue: "true",
  },
  {
    key: "AUTO_RESOLVE_THREADS",
    label: "Auto-Resolve Threads",
    description: "Auto-close inbox threads when data request is satisfied",
    valueType: "boolean",
    category: "inbound_processing",
    defaultValue: "true",
  },
  {
    key: "LOG_LEAD_EVENTS",
    label: "Log Lead Events",
    description: "Enable detailed event logging for leads",
    valueType: "boolean",
    category: "inbound_processing",
    defaultValue: "false",
  },
  // Retry/Cooldown
  {
    key: "MAX_RETRY_ATTEMPTS",
    label: "Max Retry Attempts",
    description: "Maximum retry attempts before marking as exhausted",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "3",
    minValue: 1,
    maxValue: 10,
  },
  {
    key: "RETRY_COOLDOWN_HOURS",
    label: "Retry Cooldown (Hours)",
    description: "Hours to wait between retry attempts",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "24",
    minValue: 1,
    maxValue: 168,
  },
  // Batch Limits
  {
    key: "DAILY_BATCH_SIZE",
    label: "Daily Batch Size",
    description: "Maximum leads to process per day",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "2000",
    minValue: 100,
    maxValue: 50000,
  },
  {
    key: "SMS_BATCH_SIZE",
    label: "SMS Batch Size",
    description: "Maximum SMS messages per batch",
    valueType: "number",
    category: "inbound_processing",
    defaultValue: "250",
    minValue: 10,
    maxValue: 1000,
  },
];

export async function GET() {
  try {
    // Get all settings from DB
    const dbSettings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.category, "inbound_processing"));

    // Create a map for quick lookup
    const settingsMap = new Map(dbSettings.map((s) => [s.key, s.value]));

    // Merge with defaults and env vars
    const settings = INBOUND_SETTINGS.map((setting) => {
      // Priority: DB value > env var > default
      const dbValue = settingsMap.get(setting.key);
      const envValue = process.env[setting.key];
      const currentValue = dbValue ?? envValue ?? setting.defaultValue;

      return {
        ...setting,
        value: currentValue,
        source: dbValue ? "database" : envValue ? "environment" : "default",
      };
    });

    return NextResponse.json({
      success: true,
      settings,
      lastUpdated: dbSettings[0]?.updatedAt || null,
    });
  } catch (error) {
    console.error("[InboundConfig API] Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid settings payload" },
        { status: 400 }
      );
    }

    const updates: { key: string; value: string }[] = [];

    for (const [key, value] of Object.entries(settings)) {
      // Validate key exists in our settings
      const settingDef = INBOUND_SETTINGS.find((s) => s.key === key);
      if (!settingDef) {
        console.warn(`[InboundConfig API] Unknown setting key: ${key}`);
        continue;
      }

      // Validate value type
      if (settingDef.valueType === "number") {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          return NextResponse.json(
            { success: false, error: `Invalid number value for ${key}` },
            { status: 400 }
          );
        }
        if (
          settingDef.minValue !== undefined &&
          numValue < settingDef.minValue
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `${key} must be at least ${settingDef.minValue}`,
            },
            { status: 400 }
          );
        }
        if (
          settingDef.maxValue !== undefined &&
          numValue > settingDef.maxValue
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `${key} must be at most ${settingDef.maxValue}`,
            },
            { status: 400 }
          );
        }
      }

      if (settingDef.valueType === "boolean") {
        if (value !== "true" && value !== "false") {
          return NextResponse.json(
            { success: false, error: `Invalid boolean value for ${key}` },
            { status: 400 }
          );
        }
      }

      updates.push({ key, value: String(value) });
    }

    // Upsert each setting
    for (const update of updates) {
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, update.key))
        .limit(1);

      const settingDef = INBOUND_SETTINGS.find((s) => s.key === update.key)!;

      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({
            value: update.value,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.key, update.key));
      } else {
        await db.insert(systemSettings).values({
          key: update.key,
          value: update.value,
          category: "inbound_processing",
          label: settingDef.label,
          description: settingDef.description,
          valueType: settingDef.valueType,
          defaultValue: settingDef.defaultValue,
          minValue: settingDef.minValue,
          maxValue: settingDef.maxValue,
        });
      }
    }

    console.log(
      `[InboundConfig API] Updated ${updates.length} settings:`,
      updates.map((u) => u.key).join(", ")
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} settings`,
      updated: updates.map((u) => u.key),
    });
  } catch (error) {
    console.error("[InboundConfig API] Error saving settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
