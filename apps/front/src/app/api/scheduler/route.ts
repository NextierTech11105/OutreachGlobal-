import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/signalhouse/client";
import { THE_LOOP } from "@/config/constants";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED SCHEDULER API - SMS & Calls from Any Page
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Schedule SMS via SignalHouse.io
 * Schedule Calls via Twilio
 *
 * Works from any page in the app.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Phone numbers
const GIANNA_NUMBER =
  process.env.GIANNA_PHONE_NUMBER ||
  process.env.SIGNALHOUSE_FROM_NUMBER ||
  "+15164079249";
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+16312123195";

// Twilio config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

interface ScheduleRequest {
  type: "sms" | "call";
  leadId?: string;
  to: string;
  message?: string; // For SMS
  scheduledAt?: string; // ISO date string, if not provided = immediate
  worker?: "gianna" | "cathy" | "sabrina";
  context?: {
    firstName?: string;
    companyName?: string;
    reason?: string;
  };
}

interface ScheduledItem {
  id: string;
  type: "sms" | "call";
  to: string;
  scheduledAt: string;
  status: "scheduled" | "sent" | "failed" | "cancelled";
  worker?: string;
  message?: string;
  createdAt: string;
}

// In-memory queue (in production, use Redis or DB)
const scheduledQueue: ScheduledItem[] = [];

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequest = await request.json();
    const { type, leadId, to, message, scheduledAt, worker, context } = body;

    if (!to) {
      return NextResponse.json(
        { error: "to (phone number) is required" },
        { status: 400 },
      );
    }

    // Clean phone number
    const cleanPhone = to.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("1")
      ? `+${cleanPhone}`
      : `+1${cleanPhone}`;

    const scheduleTime = scheduledAt ? new Date(scheduledAt) : new Date();
    const isImmediate = !scheduledAt || new Date(scheduledAt) <= new Date();

    if (type === "sms") {
      // ═══════════════════════════════════════════════════════════════════════
      // SCHEDULE SMS via SignalHouse
      // ═══════════════════════════════════════════════════════════════════════
      const smsMessage =
        message ||
        `Hi ${context?.firstName || "there"}, this is Emily. Quick question - do you have a few minutes to chat? -Emily`;

      if (isImmediate) {
        // Send immediately
        const result = await sendSMS({
          from: GIANNA_NUMBER,
          to: formattedPhone,
          message: smsMessage,
        });

        if (result.success) {
          // Update lead if provided
          if (leadId) {
            await db
              .update(leads)
              .set({
                customFields: sql`
                  jsonb_set(
                    COALESCE(custom_fields, '{}'::jsonb),
                    '{lastSmsAt}',
                    to_jsonb(${new Date().toISOString()}::text)
                  )
                `,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, leadId));
          }

          return NextResponse.json({
            success: true,
            type: "sms",
            status: "sent",
            messageId: result.data?.messageId,
            to: formattedPhone,
            message: smsMessage,
            sentAt: new Date().toISOString(),
          });
        } else {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 },
          );
        }
      } else {
        // Schedule for later
        const scheduledItem: ScheduledItem = {
          id: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "sms",
          to: formattedPhone,
          scheduledAt: scheduleTime.toISOString(),
          status: "scheduled",
          worker: worker || "gianna",
          message: smsMessage,
          createdAt: new Date().toISOString(),
        };

        scheduledQueue.push(scheduledItem);

        return NextResponse.json({
          success: true,
          type: "sms",
          status: "scheduled",
          scheduledId: scheduledItem.id,
          to: formattedPhone,
          scheduledAt: scheduleTime.toISOString(),
        });
      }
    } else if (type === "call") {
      // ═══════════════════════════════════════════════════════════════════════
      // SCHEDULE CALL via Twilio
      // ═══════════════════════════════════════════════════════════════════════
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        return NextResponse.json(
          { error: "Twilio not configured" },
          { status: 503 },
        );
      }

      if (isImmediate) {
        // Initiate call immediately
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

        const twimlUrl = `${process.env.NEXT_PUBLIC_API_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/twilio/twiml?leadId=${leadId || ""}&firstName=${encodeURIComponent(context?.firstName || "")}`;

        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: TWILIO_NUMBER,
            Url: twimlUrl,
          }).toString(),
        });

        const callData = await response.json();

        if (response.ok) {
          // Update lead if provided
          if (leadId) {
            await db
              .update(leads)
              .set({
                customFields: sql`
                  jsonb_set(
                    COALESCE(custom_fields, '{}'::jsonb),
                    '{lastCallAt}',
                    to_jsonb(${new Date().toISOString()}::text)
                  )
                `,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, leadId));
          }

          return NextResponse.json({
            success: true,
            type: "call",
            status: "initiated",
            callSid: callData.sid,
            to: formattedPhone,
            initiatedAt: new Date().toISOString(),
          });
        } else {
          return NextResponse.json(
            { success: false, error: callData.message || "Call failed" },
            { status: 500 },
          );
        }
      } else {
        // Schedule call for later
        const scheduledItem: ScheduledItem = {
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "call",
          to: formattedPhone,
          scheduledAt: scheduleTime.toISOString(),
          status: "scheduled",
          worker: worker || "sabrina",
          createdAt: new Date().toISOString(),
        };

        scheduledQueue.push(scheduledItem);

        return NextResponse.json({
          success: true,
          type: "call",
          status: "scheduled",
          scheduledId: scheduledItem.id,
          to: formattedPhone,
          scheduledAt: scheduleTime.toISOString(),
        });
      }
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'sms' or 'call'" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[Scheduler] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scheduling failed" },
      { status: 500 },
    );
  }
}

// GET - View scheduled items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'sms' | 'call' | null (all)
  const status = searchParams.get("status"); // 'scheduled' | 'sent' | etc

  let filtered = scheduledQueue;

  if (type) {
    filtered = filtered.filter((item) => item.type === type);
  }
  if (status) {
    filtered = filtered.filter((item) => item.status === status);
  }

  // Sort by scheduled time
  filtered.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return NextResponse.json({
    success: true,
    count: filtered.length,
    items: filtered,
    loopConfig: {
      touchSchedule: THE_LOOP.TOUCH_SCHEDULE,
      lifecycleDays: THE_LOOP.LIFECYCLE_DAYS,
    },
  });
}

// DELETE - Cancel scheduled item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const index = scheduledQueue.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json(
      { error: "Scheduled item not found" },
      { status: 404 },
    );
  }

  const item = scheduledQueue[index];
  if (item.status !== "scheduled") {
    return NextResponse.json(
      { error: "Can only cancel scheduled items" },
      { status: 400 },
    );
  }

  scheduledQueue[index].status = "cancelled";

  return NextResponse.json({
    success: true,
    cancelled: item,
  });
}
