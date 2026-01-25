/**
 * Airflow SMS API Routes
 * Called by gianna_escalation_dag.py for sending SMS
 *
 * Uses appState table for persistence.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appState } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// SMS send log for tracking
interface SMSRecord {
  id: string;
  to: string;
  message: string;
  lead_id: string;
  campaign_type: string;
  escalation_step?: number;
  status: "queued" | "sent" | "delivered" | "failed";
  sent_at: string;
  error?: string;
}

interface DailySendCount {
  date: string;
  count: number;
}

// Helper to get daily send count from database
async function getDailySendCount(
  teamId: string = "default"
): Promise<DailySendCount> {
  const today = new Date().toISOString().split("T")[0];
  const key = `sms_daily_count:${today}`;

  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (state?.value) {
    return state.value as DailySendCount;
  }

  return { date: today, count: 0 };
}

// Helper to update daily send count
async function incrementDailySendCount(
  teamId: string = "default"
): Promise<DailySendCount> {
  const today = new Date().toISOString().split("T")[0];
  const key = `sms_daily_count:${today}`;

  const current = await getDailySendCount(teamId);
  const newCount = { date: today, count: current.count + 1 };

  const [existing] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: newCount, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      key,
      value: newCount,
    });
  }

  return newCount;
}

// Helper to save SMS record
async function saveSMSRecord(
  record: SMSRecord,
  teamId: string = "default"
): Promise<void> {
  const key = `sms_record:${record.id}`;

  await db.insert(appState).values({
    id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teamId,
    key,
    value: record,
  });
}

// POST /api/airflow/sms
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "send";
    const body = await request.json();
    const teamId = body.teamId || "default";

    switch (action) {
      case "send":
        return handleSend(body, teamId);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow SMS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/airflow/sms - Get send stats
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "stats";
    const teamId = url.searchParams.get("teamId") || "default";

    switch (action) {
      case "stats":
        return handleStats(teamId);
      case "log":
        return handleLog(url.searchParams, teamId);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow SMS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleSend(
  body: {
    to: string;
    message: string;
    lead_id: string;
    campaign_type: string;
    escalation_step?: number;
  },
  teamId: string
) {
  const { to, message, lead_id, campaign_type, escalation_step } = body;

  if (!to || !message) {
    return NextResponse.json(
      { error: "Phone number and message required" },
      { status: 400 }
    );
  }

  // Validate phone format
  const cleanPhone = to.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    return NextResponse.json(
      { error: "Invalid phone number" },
      { status: 400 }
    );
  }

  // Check daily limit
  const dailyCount = await getDailySendCount(teamId);
  if (dailyCount.count >= 2000) {
    return NextResponse.json(
      { error: "Daily SMS limit reached" },
      { status: 429 }
    );
  }

  // Create SMS record
  const smsId = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: SMSRecord = {
    id: smsId,
    to: cleanPhone,
    message,
    lead_id,
    campaign_type,
    escalation_step,
    status: "queued",
    sent_at: new Date().toISOString(),
  };

  // In production: Call SignalHouse or Twilio API
  try {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check for SignalHouse config
    const signalHouseApiKey = process.env.SIGNALHOUSE_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;

    if (signalHouseApiKey) {
      // TODO: Actual SignalHouse integration
      record.status = "sent";
    } else if (twilioSid) {
      // TODO: Actual Twilio integration
      record.status = "sent";
    } else {
      // Demo mode - simulate success
      record.status = "sent";
    }

    await incrementDailySendCount(teamId);
    await saveSMSRecord(record, teamId);

    console.log(
      `[Airflow SMS] Sent to ${cleanPhone.slice(-4)}: Step ${escalation_step}`
    );

    return NextResponse.json({
      success: true,
      sms_id: smsId,
      status: record.status,
    });
  } catch (error) {
    record.status = "failed";
    record.error = error instanceof Error ? error.message : "Unknown error";
    await saveSMSRecord(record, teamId);

    console.error(
      `[Airflow SMS] Failed to send to ${cleanPhone}: ${record.error}`
    );

    return NextResponse.json({ error: record.error }, { status: 500 });
  }
}

async function handleStats(teamId: string) {
  const today = new Date().toISOString().split("T")[0];

  // Get all SMS records from database
  const allStates = await db
    .select()
    .from(appState)
    .where(eq(appState.teamId, teamId));

  const smsRecords = allStates
    .filter((s) => s.key.startsWith("sms_record:") && s.value)
    .map((s) => s.value as SMSRecord);

  // Count today's sends
  let sentToday = 0;
  let failedToday = 0;

  for (const record of smsRecords) {
    if (record.sent_at.startsWith(today)) {
      if (record.status === "sent" || record.status === "delivered") {
        sentToday++;
      } else if (record.status === "failed") {
        failedToday++;
      }
    }
  }

  return NextResponse.json({
    date: today,
    sent_today: sentToday,
    failed_today: failedToday,
    total_logged: smsRecords.length,
  });
}

async function handleLog(params: URLSearchParams, teamId: string) {
  const limit = parseInt(params.get("limit") || "100");
  const leadId = params.get("lead_id");

  // Get all SMS records from database
  const allStates = await db
    .select()
    .from(appState)
    .where(eq(appState.teamId, teamId))
    .orderBy(desc(appState.createdAt));

  let records = allStates
    .filter((s) => s.key.startsWith("sms_record:") && s.value)
    .map((s) => s.value as SMSRecord);

  if (leadId) {
    records = records.filter((r) => r.lead_id === leadId);
  }

  // Sort by sent_at descending
  records.sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  return NextResponse.json({
    records: records.slice(0, limit),
    total: records.length,
  });
}
