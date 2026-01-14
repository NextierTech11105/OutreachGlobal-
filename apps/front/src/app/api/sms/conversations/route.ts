/**
 * SMS Conversations API
 *
 * Fetches SMS conversation threads for the Command Center.
 * Returns conversations grouped by lead with full message history.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface ConversationMessage {
  id: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  sentAt: string;
  deliveredAt?: string;
  worker?: string;
}

interface Conversation {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  campaignId?: string;
  campaignName?: string;
  classification?: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ConversationMessage[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const leadId = searchParams.get("leadId"); // Get specific conversation
    const worker = searchParams.get("worker"); // Filter by worker (gianna, cathy, sabrina)
    const status = searchParams.get("status"); // new, replied, all
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 },
      );
    }

    // If leadId is provided, get full conversation for that lead
    if (leadId) {
      return await getConversationThread(teamId, leadId);
    }

    // Otherwise get conversation list
    return await getConversationList(teamId, worker, status, limit);
  } catch (error) {
    console.error("[SMS Conversations API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch conversations",
      },
      { status: 500 },
    );
  }
}

async function getConversationThread(teamId: string, leadId: string) {
  try {
    // Get lead info
    const leadResult = await db.execute(sql`
      SELECT
        l.id,
        l.first_name,
        l.last_name,
        l.phone,
        l.email,
        l.company
      FROM leads l
      WHERE l.id = ${leadId}
        AND l.team_id = ${teamId}
    `);

    const leadRows = leadResult as any[];
    if (!leadRows?.length) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    const lead = leadRows[0];

    // Get all messages for this lead (both inbound and outbound)
    const messagesResult = await db.execute(sql`
      SELECT
        m.id,
        m.body,
        m.direction,
        m.status,
        m.sent_at as "sentAt",
        m.delivered_at as "deliveredAt",
        m.metadata->>'worker' as worker
      FROM messages m
      WHERE m.lead_id = ${leadId}
        AND m.team_id = ${teamId}
        AND m.type = 'SMS'
      ORDER BY m.sent_at ASC
    `);

    const messageRows = messagesResult as any[];

    // Get latest inbox item info (without classification column that may not exist)
    const inboxResult = await db.execute(sql`
      SELECT campaign_id
      FROM inbox_items
      WHERE lead_id = ${leadId}
        AND team_id = ${teamId}
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const inboxItem = (inboxResult as any)?.[0];

    // Get campaign info if available
    let campaignName = null;
    if (inboxItem?.campaign_id) {
      const campaignResult = await db.execute(sql`
        SELECT name FROM campaigns WHERE id = ${inboxItem.campaign_id}
      `);
      campaignName = (campaignResult as any)?.[0]?.name;
    }

    const conversation: Conversation = {
      leadId: lead.id,
      leadName:
        `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.phone,
      leadPhone: lead.phone,
      leadEmail: lead.email,
      campaignId: inboxItem?.campaign_id,
      campaignName,
      classification: undefined,
      lastMessageAt:
        messageRows.length > 0
          ? messageRows[messageRows.length - 1].sentAt
          : new Date().toISOString(),
      unreadCount: 0,
      messages: messageRows.map((row: any) => ({
        id: row.id,
        body: row.body,
        direction: row.direction,
        status: row.status,
        sentAt: row.sentAt,
        deliveredAt: row.deliveredAt,
        worker: row.worker,
      })),
    };

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("[SMS Conversations] Thread error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversation" },
      { status: 500 },
    );
  }
}

async function getConversationList(
  teamId: string,
  _worker: string | null, // Reserved for future filtering by worker
  status: string | null,
  limit: number,
) {
  try {
    // Get conversations with latest message
    // Note: Using a simpler query that doesn't depend on inbox_items columns
    // that may not exist yet (classification, etc.)
    const result = await db.execute(sql`
      WITH latest_messages AS (
        SELECT DISTINCT ON (lead_id)
          lead_id,
          id as message_id,
          body as last_message,
          direction as last_direction,
          sent_at as last_message_at,
          from_address,
          to_address
        FROM messages
        WHERE team_id = ${teamId}
          AND type = 'SMS'
          AND lead_id IS NOT NULL
        ORDER BY lead_id, sent_at DESC
      )
      SELECT
        l.id as "leadId",
        COALESCE(l.first_name || ' ' || l.last_name, lm.from_address) as "leadName",
        l.phone as "leadPhone",
        l.email as "leadEmail",
        lm.last_message as "lastMessage",
        lm.last_direction as "lastDirection",
        lm.last_message_at as "lastMessageAt",
        ii.campaign_id as "campaignId",
        c.name as "campaignName",
        COALESCE(ii.is_read, false) as "isRead",
        COALESCE(ii.is_processed, false) as "isProcessed",
        0 as "unreadCount"
      FROM latest_messages lm
      JOIN leads l ON lm.lead_id = l.id
      LEFT JOIN LATERAL (
        SELECT campaign_id, is_read, is_processed
        FROM inbox_items
        WHERE lead_id = l.id AND team_id = ${teamId}
        ORDER BY created_at DESC
        LIMIT 1
      ) ii ON true
      LEFT JOIN campaigns c ON ii.campaign_id = c.id
      WHERE l.team_id = ${teamId}
        ${status === "new" ? sql`AND ii.is_read = false` : sql``}
        ${status === "replied" ? sql`AND ii.is_processed = true` : sql``}
      ORDER BY lm.last_message_at DESC
      LIMIT ${limit}
    `);

    const rows = result as any[];
    const conversations = (rows || []).map((row: any) => ({
      leadId: row.leadId,
      leadName: row.leadName || row.leadPhone,
      leadPhone: row.leadPhone,
      leadEmail: row.leadEmail,
      lastMessage: row.lastMessage,
      lastDirection: row.lastDirection,
      lastMessageAt: row.lastMessageAt,
      classification: undefined,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      isRead: row.isRead,
      isProcessed: row.isProcessed,
      unreadCount: parseInt(row.unreadCount) || 0,
    }));

    // Get aggregate stats
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE ii.is_read = false) as pending,
        COUNT(*) FILTER (WHERE ii.is_read = true AND ii.is_processed = false) as read_count,
        COUNT(*) FILTER (WHERE ii.is_processed = true) as replied
      FROM inbox_items ii
      WHERE ii.team_id = ${teamId}
    `);

    const statsRows = statsResult as any[];
    const stats = statsRows?.[0];

    return NextResponse.json({
      success: true,
      conversations,
      stats: {
        pending: parseInt(stats?.pending) || 0,
        read: parseInt(stats?.read_count) || 0,
        replied: parseInt(stats?.replied) || 0,
      },
    });
  } catch (error) {
    console.error("[SMS Conversations] List error:", error);
    // Return empty list if tables don't exist yet
    return NextResponse.json({
      success: true,
      conversations: [],
      stats: { pending: 0, read: 0, replied: 0 },
    });
  }
}

// Mark conversation as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, teamId, action } = body;

    if (!leadId || !teamId) {
      return NextResponse.json(
        { success: false, error: "leadId and teamId are required" },
        { status: 400 },
      );
    }

    if (action === "read") {
      await db.execute(sql`
        UPDATE inbox_items
        SET is_read = true, updated_at = NOW()
        WHERE lead_id = ${leadId}
          AND team_id = ${teamId}
      `);
    } else if (action === "archive") {
      await db.execute(sql`
        UPDATE inbox_items
        SET is_processed = true, processed_at = NOW(), updated_at = NOW()
        WHERE lead_id = ${leadId}
          AND team_id = ${teamId}
      `);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SMS Conversations] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}
