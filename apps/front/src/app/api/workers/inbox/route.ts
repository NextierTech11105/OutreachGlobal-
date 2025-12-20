/**
 * Worker Inbox API
 *
 * Fetches inbound messages for AI Digital Workers:
 * - GIANNA: Initial outreach responses
 * - CATHY: Nudge responses
 * - SABRINA: Booking/objection responses
 *
 * Messages are filtered by worker's assigned phone number.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface InboxMessage {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  message: string;
  direction: "inbound" | "outbound";
  status: "new" | "read" | "replied" | "archived";
  classification?: string;
  sentiment?: "positive" | "negative" | "neutral";
  createdAt: Date;
  campaign?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worker = searchParams.get("worker");
    const teamId = searchParams.get("teamId");
    const phoneNumber = searchParams.get("phoneNumber");
    const status = searchParams.get("status"); // filter by status
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 }
      );
    }

    // Build query to fetch SMS messages
    // This queries the sms_messages table or similar
    let messages: InboxMessage[] = [];

    try {
      // Query SMS messages table for inbound messages
      const result = await db.execute(sql`
        SELECT
          sm.id,
          sm.lead_id as "leadId",
          COALESCE(l.first_name || ' ' || l.last_name, sm.from_phone) as "leadName",
          sm.from_phone as "leadPhone",
          sm.body as message,
          sm.direction,
          CASE
            WHEN sm.read_at IS NULL THEN 'new'
            WHEN sm.replied_at IS NOT NULL THEN 'replied'
            ELSE 'read'
          END as status,
          sm.classification,
          sm.sentiment,
          sm.created_at as "createdAt",
          c.name as campaign
        FROM sms_messages sm
        LEFT JOIN leads l ON sm.lead_id = l.id
        LEFT JOIN campaigns c ON sm.campaign_id = c.id
        WHERE sm.team_id = ${teamId}
          AND sm.direction = 'inbound'
          ${phoneNumber ? sql`AND sm.to_phone = ${phoneNumber}` : sql``}
          ${status === "new" ? sql`AND sm.read_at IS NULL` : sql``}
          ${status === "replied" ? sql`AND sm.replied_at IS NOT NULL` : sql``}
        ORDER BY sm.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      messages = (result.rows || []).map((row: any) => ({
        id: row.id,
        leadId: row.leadId || "",
        leadName: row.leadName || row.leadPhone,
        leadPhone: row.leadPhone,
        message: row.message,
        direction: row.direction as "inbound" | "outbound",
        status: row.status as "new" | "read" | "replied" | "archived",
        classification: row.classification,
        sentiment: row.sentiment,
        createdAt: new Date(row.createdAt),
        campaign: row.campaign,
      }));
    } catch (dbError) {
      // If table doesn't exist or query fails, return empty array
      console.warn("[Worker Inbox] DB query failed:", dbError);
      messages = [];
    }

    // Get counts for badges
    let newCount = 0;
    let totalCount = messages.length;

    try {
      const countResult = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE read_at IS NULL) as new_count,
          COUNT(*) as total_count
        FROM sms_messages
        WHERE team_id = ${teamId}
          AND direction = 'inbound'
          ${phoneNumber ? sql`AND to_phone = ${phoneNumber}` : sql``}
      `);

      newCount = countResult.rows?.[0]?.new_count || 0;
      totalCount = countResult.rows?.[0]?.total_count || messages.length;
    } catch {
      // Ignore count errors
    }

    return NextResponse.json({
      success: true,
      messages,
      counts: {
        new: newCount,
        total: totalCount,
      },
      worker,
      phoneNumber,
    });
  } catch (error) {
    console.error("[Worker Inbox API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch inbox",
        messages: [],
      },
      { status: 500 }
    );
  }
}

// Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageIds, teamId, status } = body;

    if (!messageIds || !teamId) {
      return NextResponse.json(
        { success: false, error: "messageIds and teamId are required" },
        { status: 400 }
      );
    }

    // Update message status
    if (status === "read") {
      await db.execute(sql`
        UPDATE sms_messages
        SET read_at = NOW()
        WHERE id = ANY(${messageIds}::text[])
          AND team_id = ${teamId}
      `);
    } else if (status === "archived") {
      await db.execute(sql`
        UPDATE sms_messages
        SET archived_at = NOW()
        WHERE id = ANY(${messageIds}::text[])
          AND team_id = ${teamId}
      `);
    }

    return NextResponse.json({
      success: true,
      updatedCount: messageIds.length,
    });
  } catch (error) {
    console.error("[Worker Inbox API] PATCH Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update messages",
      },
      { status: 500 }
    );
  }
}
