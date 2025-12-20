import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, callLogs, campaignAttempts } from "@/lib/db/schema";
import { desc, gte, and, eq } from "drizzle-orm";

/**
 * Outreach Schedule API
 * CONNECTED TO: DigitalOcean Managed PostgreSQL
 * Returns real scheduled campaigns, calls, and sequences
 */

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Get date range: today through next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Fetch scheduled SMS messages (campaigns)
    const smsData = await db
      .select({
        id: smsMessages.id,
        toNumber: smsMessages.toNumber,
        direction: smsMessages.direction,
        status: smsMessages.status,
        scheduledAt: smsMessages.scheduledAt,
        createdAt: smsMessages.createdAt,
        campaignId: smsMessages.campaignId,
      })
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.direction, "outbound"),
          gte(smsMessages.createdAt, today),
        ),
      )
      .orderBy(desc(smsMessages.createdAt))
      .limit(100)
      .catch(() => []);

    // Fetch scheduled calls
    const callData = await db
      .select({
        id: callLogs.id,
        toNumber: callLogs.toNumber,
        direction: callLogs.direction,
        status: callLogs.status,
        scheduledAt: callLogs.scheduledAt,
        createdAt: callLogs.createdAt,
        leadId: callLogs.leadId,
      })
      .from(callLogs)
      .where(gte(callLogs.createdAt, today))
      .orderBy(desc(callLogs.createdAt))
      .limit(50)
      .catch(() => []);

    // Fetch campaign attempts (sequences)
    const campaignData = await db
      .select({
        id: campaignAttempts.id,
        leadId: campaignAttempts.leadId,
        status: campaignAttempts.status,
        campaignContext: campaignAttempts.campaignContext,
        createdAt: campaignAttempts.createdAt,
        responseReceived: campaignAttempts.responseReceived,
      })
      .from(campaignAttempts)
      .where(gte(campaignAttempts.createdAt, today))
      .orderBy(desc(campaignAttempts.createdAt))
      .limit(100)
      .catch(() => []);

    // Group SMS by campaign
    const campaignMap = new Map<
      string,
      { id: string; count: number; status: string; scheduledAt: Date }
    >();
    smsData.forEach((sms) => {
      const campaignId = sms.campaignId || "direct";
      const existing = campaignMap.get(campaignId);
      if (existing) {
        existing.count++;
      } else {
        campaignMap.set(campaignId, {
          id: campaignId,
          count: 1,
          status: sms.status || "pending",
          scheduledAt: sms.scheduledAt || sms.createdAt,
        });
      }
    });

    // Group campaign attempts by context (follow_up, nurture, etc.)
    const sequenceMap = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
        status: string;
        scheduledAt: Date;
      }
    >();
    campaignData.forEach((attempt) => {
      const context = attempt.campaignContext || "general";
      const existing = sequenceMap.get(context);
      if (existing) {
        existing.count++;
      } else {
        sequenceMap.set(context, {
          id: context,
          name: context
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          count: 1,
          status: attempt.status || "pending",
          scheduledAt: attempt.createdAt,
        });
      }
    });

    // Transform to API response - handle null dates safely
    const campaigns = Array.from(campaignMap.values()).map((c) => ({
      id: c.id,
      name: c.id === "direct" ? "Direct SMS" : `Campaign ${c.id.slice(0, 8)}`,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : new Date().toISOString(),
      recipientCount: c.count,
      status:
        c.status === "delivered"
          ? "completed"
          : c.status === "sending"
            ? "active"
            : "pending",
    }));

    const calls = callData.map((call) => ({
      id: String(call.id),
      scheduledAt: (call.scheduledAt || call.createdAt || new Date()).toISOString(),
      leadName: `Lead ${call.leadId || call.toNumber || "Unknown"}`,
      status:
        call.status === "completed"
          ? "completed"
          : call.status === "in-progress"
            ? "active"
            : "pending",
    }));

    const sequences = Array.from(sequenceMap.values()).map((s) => ({
      id: s.id,
      name: s.name,
      scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : new Date().toISOString(),
      recipientCount: s.count,
      status: "pending",
    }));

    return NextResponse.json({
      success: true,
      database: "postgresql",
      campaigns,
      calls,
      sequences,
      stats: {
        totalSms: smsData.length,
        totalCalls: callData.length,
        totalAttempts: campaignData.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Outreach schedule error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch schedule",
        campaigns: [],
        calls: [],
        sequences: [],
        stats: { totalSms: 0, totalCalls: 0, totalAttempts: 0 },
      },
      { status: 500 },
    );
  }
}
