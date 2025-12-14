/**
 * Airflow SMS API Routes
 * Called by gianna_escalation_dag.py for sending SMS
 */

import { NextRequest, NextResponse } from "next/server";

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

const smsLog = new Map<string, SMSRecord>();
const dailySendCount = { date: "", count: 0 };

// POST /api/airflow/sms
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "send";
    const body = await request.json();

    switch (action) {
      case "send":
        return handleSend(body);
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

    switch (action) {
      case "stats":
        return handleStats();
      case "log":
        return handleLog(url.searchParams);
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

async function handleSend(body: {
  to: string;
  message: string;
  lead_id: string;
  campaign_type: string;
  escalation_step?: number;
}) {
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
  const today = new Date().toISOString().split("T")[0];
  if (dailySendCount.date !== today) {
    dailySendCount.date = today;
    dailySendCount.count = 0;
  }

  if (dailySendCount.count >= 2000) {
    return NextResponse.json(
      { error: "Daily SMS limit reached" },
      { status: 429 }
    );
  }

  // Create SMS record
  const smsId = `sms_${Date.now()}`;
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
  // For demo, simulate send
  try {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check for SignalHouse config
    const signalHouseApiKey = process.env.SIGNALHOUSE_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;

    if (signalHouseApiKey) {
      // TODO: Actual SignalHouse integration
      // const response = await fetch('https://api.signalhouse.com/v1/sms', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${signalHouseApiKey}` },
      //   body: JSON.stringify({ to: cleanPhone, message })
      // });
      record.status = "sent";
    } else if (twilioSid) {
      // TODO: Actual Twilio integration
      record.status = "sent";
    } else {
      // Demo mode - simulate success
      record.status = "sent";
    }

    dailySendCount.count++;
    smsLog.set(smsId, record);

    console.log(`[Airflow SMS] Sent to ${cleanPhone.slice(-4)}: Step ${escalation_step}`);

    return NextResponse.json({
      success: true,
      sms_id: smsId,
      status: record.status,
    });
  } catch (error) {
    record.status = "failed";
    record.error = error instanceof Error ? error.message : "Unknown error";
    smsLog.set(smsId, record);

    console.error(`[Airflow SMS] Failed to send to ${cleanPhone}: ${record.error}`);

    return NextResponse.json(
      { error: record.error },
      { status: 500 }
    );
  }
}

async function handleStats() {
  const today = new Date().toISOString().split("T")[0];

  // Count today's sends
  let sentToday = 0;
  let failedToday = 0;

  smsLog.forEach((record) => {
    if (record.sent_at.startsWith(today)) {
      if (record.status === "sent" || record.status === "delivered") {
        sentToday++;
      } else if (record.status === "failed") {
        failedToday++;
      }
    }
  });

  return NextResponse.json({
    date: today,
    sent_today: sentToday,
    failed_today: failedToday,
    total_logged: smsLog.size,
  });
}

async function handleLog(params: URLSearchParams) {
  const limit = parseInt(params.get("limit") || "100");
  const leadId = params.get("lead_id");

  let records = Array.from(smsLog.values());

  if (leadId) {
    records = records.filter((r) => r.lead_id === leadId);
  }

  // Sort by sent_at descending
  records.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

  return NextResponse.json({
    records: records.slice(0, limit),
    total: records.length,
  });
}
