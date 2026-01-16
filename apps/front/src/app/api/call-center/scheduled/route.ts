/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCHEDULED CALLS CRON ENDPOINT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Called by Vercel Cron or external scheduler to check for due scheduled calls.
 * Retargets and follow-ups flow naturally into scheduled calls.
 *
 * Usage:
 * - Set up Vercel Cron to call this every 5 minutes
 * - Or use external scheduler (Railway, etc.) to POST here
 */

import { NextRequest, NextResponse } from "next/server";
import { redis, isRedisAvailable } from "@/lib/redis";
import { db } from "@/lib/db";
import { callHistories } from "@/lib/db/schema";

const CALL_QUEUE_KEY = "call:queue";

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextier.ai";

interface CallQueueItem {
  id: string;
  leadId: string;
  leadName?: string;
  phone: string;
  email?: string;
  company?: string;
  persona: string;
  mode: string;
  campaignLane: string;
  queueType: string;
  status: string;
  priority: number;
  scheduledAt?: string;
  attempts: number;
  tags: string[];
  createdAt: string;
}

async function initiateTwilioCall(
  toNumber: string,
  leadId: string,
  persona: string,
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const formattedTo = toNumber.startsWith("+")
      ? toNumber
      : `+1${toNumber.replace(/\D/g, "")}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = Buffer.from(
      `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
    ).toString("base64");

    const twimlUrl = `${BASE_URL}/api/webhook/twilio/outbound?leadId=${leadId}&persona=${persona}`;

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: TWILIO_PHONE_NUMBER,
        Url: twimlUrl,
        StatusCallback: `${BASE_URL}/api/webhook/twilio`,
        StatusCallbackEvent: "initiated ringing answered completed",
      }).toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || "Call failed" };
    }

    // Log to database (schema requires powerDialerId and dialerContactId)
    // Skipping DB insert for scheduled calls as they don't have dialer context
    console.log(`[Scheduled] Call initiated: ${result.sid} to ${formattedTo}`);

    return { success: true, callSid: result.sid };
  } catch (error) {
    console.error("[Scheduled] Call initiation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// GET - Check for and initiate scheduled calls
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!isRedisAvailable()) {
      return NextResponse.json({
        success: false,
        error: "Redis not available",
      });
    }

    // Load queue from Redis
    const queueData = await redis.get<string>(CALL_QUEUE_KEY);
    if (!queueData) {
      return NextResponse.json({
        success: true,
        message: "No scheduled calls",
        processed: 0,
      });
    }

    const parsed =
      typeof queueData === "string" ? JSON.parse(queueData) : queueData;
    if (!Array.isArray(parsed)) {
      return NextResponse.json({
        success: true,
        message: "No scheduled calls",
        processed: 0,
      });
    }

    const now = new Date();
    const dueCalls = parsed
      .filter(
        (item: CallQueueItem) =>
          item.status === "pending" &&
          item.scheduledAt &&
          new Date(item.scheduledAt) <= now,
      )
      .sort(
        (a: CallQueueItem, b: CallQueueItem) =>
          new Date(a.scheduledAt!).getTime() -
          new Date(b.scheduledAt!).getTime(),
      )
      .slice(0, limit);

    if (dueCalls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled calls due",
        processed: 0,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        dueCalls: dueCalls.map((c: CallQueueItem) => ({
          id: c.id,
          leadName: c.leadName,
          phone: c.phone,
          scheduledAt: c.scheduledAt,
          campaignLane: c.campaignLane,
          persona: c.persona,
        })),
      });
    }

    // Process due calls
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      details: [] as Array<{
        leadId: string;
        success: boolean;
        callSid?: string;
        error?: string;
      }>,
    };

    for (const call of dueCalls) {
      const callResult = await initiateTwilioCall(
        call.phone,
        call.leadId,
        call.persona,
      );

      results.processed++;
      if (callResult.success) {
        results.succeeded++;
        // Update status in queue
        const item = parsed.find((i: CallQueueItem) => i.id === call.id);
        if (item) {
          item.status = "in_progress";
          item.lastAttempt = now.toISOString();
          item.attempts = (item.attempts || 0) + 1;
        }
      } else {
        results.failed++;
      }

      results.details.push({
        leadId: call.leadId,
        success: callResult.success,
        callSid: callResult.callSid,
        error: callResult.error,
      });
    }

    // Persist updated queue
    await redis.set(CALL_QUEUE_KEY, JSON.stringify(parsed));

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} scheduled calls`,
      ...results,
    });
  } catch (error) {
    console.error("[Scheduled] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST - Manually trigger scheduled calls check (same as GET)
export async function POST(request: NextRequest) {
  return GET(request);
}
