/**
 * SMS Send API - Direct send via SignalHouse
 * Creates thread in database for unified inbox
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { sendSMS, isConfigured } from "@/lib/signalhouse";
import { db } from "@/lib/db";
import { smsMessages, leads } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured. Set SIGNALHOUSE_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, message, from, leadId } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "to and message are required" },
        { status: 400 }
      );
    }

    // Use provided from number or default
    const fromNumber = from || process.env.SIGNALHOUSE_FROM_NUMBER || "";
    if (!fromNumber) {
      return NextResponse.json(
        { error: "No from number configured. Set SIGNALHOUSE_FROM_NUMBER." },
        { status: 400 }
      );
    }

    // Find or create lead for this phone number (for unified inbox thread)
    let targetLeadId = leadId;
    if (!targetLeadId && teamId) {
      const normalizedPhone = to.replace(/\D/g, "");
      const existingLead = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            eq(leads.teamId, teamId),
            or(
              eq(leads.phone, to),
              eq(leads.phone, normalizedPhone),
              eq(leads.phone, `+1${normalizedPhone}`),
              eq(leads.phone, `+${normalizedPhone}`)
            )
          )
        )
        .limit(1);

      if (existingLead.length > 0) {
        targetLeadId = existingLead[0].id;
      }
    }

    // Send via SignalHouse
    const result = await sendSMS({
      to,
      from: fromNumber,
      message,
    });

    // Save to database for unified inbox (regardless of send success)
    const [savedMessage] = await db
      .insert(smsMessages)
      .values({
        leadId: targetLeadId || null,
        userId,
        direction: "outbound",
        fromNumber,
        toNumber: to,
        body: message,
        status: result.success ? "sent" : "failed",
        provider: "signalhouse",
        providerMessageId: result.data?.messageId || null,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (result.success) {
      console.log(`[SMS] Sent to ${to} from ${fromNumber}, saved as ${savedMessage.id}`);
      return NextResponse.json({
        success: true,
        messageId: result.data?.messageId,
        dbMessageId: savedMessage.id,
        leadId: targetLeadId,
        to,
        from: fromNumber,
      });
    } else {
      console.error(`[SMS] Failed to ${to}:`, result.error);
      return NextResponse.json(
        { success: false, error: result.error || "Send failed", dbMessageId: savedMessage.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[SMS Send] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = isConfigured();
  const fromNumber = process.env.SIGNALHOUSE_FROM_NUMBER;

  return NextResponse.json({
    endpoint: "POST /api/sms/send",
    configured,
    fromNumber: fromNumber ? `${fromNumber.slice(0, 6)}...` : null,
    params: {
      to: "Phone number to send to (required)",
      message: "SMS message content (required)",
      from: "From number (optional, uses default)",
      leadId: "Lead ID to attach to (optional, auto-matches by phone)",
    },
  });
}
