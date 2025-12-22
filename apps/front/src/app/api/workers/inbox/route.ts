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
        { status: 400 },
      );
    }

    // Build query to fetch messages via inbox_items + messages tables
    let messages: InboxMessage[] = [];

    try {
      // Query inbox_items joined with messages table for inbound responses
      const result = await db.execute(sql`
        SELECT
          ii.id,
          ii.lead_id as "leadId",
          COALESCE(l.first_name || ' ' || l.last_name, m.from_address) as "leadName",
          m.from_address as "leadPhone",
          COALESCE(ii.response_text, m.body) as message,
          m.direction,
          CASE
            WHEN ii.is_read = false THEN 'new'
            WHEN ii.is_processed = true THEN 'replied'
            ELSE 'read'
          END as status,
          ii.classification,
          ii.sentiment,
          ii.created_at as "createdAt",
          c.name as campaign
        FROM inbox_items ii
        LEFT JOIN messages m ON ii.message_id = m.id
        LEFT JOIN leads l ON ii.lead_id = l.id
        LEFT JOIN campaigns c ON ii.campaign_id = c.id
        WHERE ii.team_id = ${teamId}
          AND (m.direction = 'INBOUND' OR m.direction IS NULL)
          ${phoneNumber ? sql`AND m.to_address = ${phoneNumber}` : sql``}
          ${status === "new" ? sql`AND ii.is_read = false` : sql``}
          ${status === "replied" ? sql`AND ii.is_processed = true` : sql``}
        ORDER BY ii.created_at DESC
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
          COUNT(*) FILTER (WHERE ii.is_read = false) as new_count,
          COUNT(*) as total_count
        FROM inbox_items ii
        LEFT JOIN messages m ON ii.message_id = m.id
        WHERE ii.team_id = ${teamId}
          AND (m.direction = 'INBOUND' OR m.direction IS NULL)
          ${phoneNumber ? sql`AND m.to_address = ${phoneNumber}` : sql``}
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
      { status: 500 },
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
        { status: 400 },
      );
    }

    // Update inbox_item status
    if (status === "read") {
      await db.execute(sql`
        UPDATE inbox_items
        SET is_read = true, updated_at = NOW()
        WHERE id = ANY(${messageIds}::text[])
          AND team_id = ${teamId}
      `);
    } else if (status === "archived") {
      await db.execute(sql`
        UPDATE inbox_items
        SET is_processed = true, processed_at = NOW(), updated_at = NOW()
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
        error:
          error instanceof Error ? error.message : "Failed to update messages",
      },
      { status: 500 },
    );
  }
}
