/**
 * SMS Analytics API
 * GET /api/sms/analytics
 *
 * Comprehensive SMS analytics aggregation - better than Easify.
 * Supports date range filtering, campaign breakdown, worker stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Response types
interface MetricsSummary {
  totalOutbound: number;
  delivered: number;
  deliveryRate: number;
  failed: number;
  failureRate: number;
  totalInbound: number;
  responseRate: number;
  optedOut: number;
  blacklistCount: number;
}

interface ClassificationBreakdown {
  classification: string;
  count: number;
  percentage: number;
}

interface WorkerStats {
  worker: string;
  sent: number;
  delivered: number;
  responses: number;
  responseRate: number;
}

interface CampaignStats {
  campaignId: string;
  campaignName: string;
  sent: number;
  delivered: number;
  responses: number;
  optOuts: number;
  responseRate: number;
}

interface DailyTrend {
  date: string;
  outbound: number;
  inbound: number;
  delivered: number;
  failed: number;
}

interface RecentMessage {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  body: string;
  direction: "inbound" | "outbound";
  status: string;
  classification?: string;
  worker?: string;
  createdAt: string;
}

interface AnalyticsResponse {
  success: boolean;
  data?: {
    summary: MetricsSummary;
    classifications: ClassificationBreakdown[];
    workerStats: WorkerStats[];
    campaignStats: CampaignStats[];
    dailyTrends: DailyTrend[];
    recentMessages: RecentMessage[];
    dateRange: {
      from: string;
      to: string;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AnalyticsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const from = searchParams.get("from"); // ISO date string
    const to = searchParams.get("to"); // ISO date string
    const campaignId = searchParams.get("campaignId");
    const worker = searchParams.get("worker");
    const days = parseInt(searchParams.get("days") || "30");

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 },
      );
    }

    // Calculate date range
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Build filter conditions
    const dateFilter = sql`AND m.created_at >= ${fromDate.toISOString()}::timestamp
                           AND m.created_at <= ${toDate.toISOString()}::timestamp`;
    const campaignFilter = campaignId
      ? sql`AND m.campaign_id = ${campaignId}`
      : sql``;
    const workerFilter = worker
      ? sql`AND m.sent_by_advisor = ${worker}`
      : sql``;

    // 1. Summary Metrics
    const summaryResult = await db.execute(sql`
      WITH message_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE direction = 'outbound') as total_outbound,
          COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'failed') as failed,
          COUNT(*) FILTER (WHERE direction = 'inbound') as total_inbound
        FROM sms_messages m
        WHERE m.lead_id IN (SELECT id FROM leads WHERE team_id = ${teamId})
        ${dateFilter}
        ${campaignFilter}
        ${workerFilter}
      ),
      suppression_stats AS (
        SELECT COUNT(DISTINCT phone) as opted_out
        FROM leads
        WHERE team_id = ${teamId}
          AND opted_out = true
      ),
      blacklist_stats AS (
        SELECT COUNT(*) as blacklist_count
        FROM suppression_list
        WHERE team_id = ${teamId}
      )
      SELECT
        ms.total_outbound,
        ms.delivered,
        ms.failed,
        ms.total_inbound,
        COALESCE(ss.opted_out, 0) as opted_out,
        COALESCE(bs.blacklist_count, 0) as blacklist_count
      FROM message_stats ms
      CROSS JOIN suppression_stats ss
      CROSS JOIN blacklist_stats bs
    `);

    const summaryRow = summaryResult.rows?.[0] as any;
    const totalOutbound = parseInt(summaryRow?.total_outbound) || 0;
    const delivered = parseInt(summaryRow?.delivered) || 0;
    const failed = parseInt(summaryRow?.failed) || 0;
    const totalInbound = parseInt(summaryRow?.total_inbound) || 0;
    const optedOut = parseInt(summaryRow?.opted_out) || 0;
    const blacklistCount = parseInt(summaryRow?.blacklist_count) || 0;

    const summary: MetricsSummary = {
      totalOutbound,
      delivered,
      deliveryRate: totalOutbound > 0 ? (delivered / totalOutbound) * 100 : 0,
      failed,
      failureRate: totalOutbound > 0 ? (failed / totalOutbound) * 100 : 0,
      totalInbound,
      responseRate:
        totalOutbound > 0 ? (totalInbound / totalOutbound) * 100 : 0,
      optedOut,
      blacklistCount,
    };

    // 2. Classification Breakdown (from inbox_items)
    const classificationsResult = await db.execute(sql`
      SELECT
        COALESCE(classification, 'UNCLASSIFIED') as classification,
        COUNT(*) as count
      FROM inbox_items ii
      WHERE ii.team_id = ${teamId}
        AND ii.created_at >= ${fromDate.toISOString()}::timestamp
        AND ii.created_at <= ${toDate.toISOString()}::timestamp
      GROUP BY classification
      ORDER BY count DESC
    `);

    const totalClassified =
      classificationsResult.rows?.reduce(
        (sum, row: any) => sum + parseInt(row.count),
        0,
      ) || 1;

    const classifications: ClassificationBreakdown[] = (
      classificationsResult.rows || []
    ).map((row: any) => ({
      classification: row.classification || "UNCLASSIFIED",
      count: parseInt(row.count) || 0,
      percentage: (parseInt(row.count) / totalClassified) * 100,
    }));

    // 3. Worker Stats (GIANNA, CATHY, SABRINA)
    const workerStatsResult = await db.execute(sql`
      SELECT
        COALESCE(sent_by_advisor, 'manual') as worker,
        COUNT(*) FILTER (WHERE direction = 'outbound') as sent,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE direction = 'inbound') as responses
      FROM sms_messages m
      WHERE m.lead_id IN (SELECT id FROM leads WHERE team_id = ${teamId})
        ${dateFilter}
      GROUP BY sent_by_advisor
      ORDER BY sent DESC
    `);

    const workerStats: WorkerStats[] = (workerStatsResult.rows || []).map(
      (row: any) => {
        const sent = parseInt(row.sent) || 0;
        const responses = parseInt(row.responses) || 0;
        return {
          worker: row.worker || "manual",
          sent,
          delivered: parseInt(row.delivered) || 0,
          responses,
          responseRate: sent > 0 ? (responses / sent) * 100 : 0,
        };
      },
    );

    // 4. Campaign Stats
    const campaignStatsResult = await db.execute(sql`
      SELECT
        m.campaign_id,
        COALESCE(c.name, 'No Campaign') as campaign_name,
        COUNT(*) FILTER (WHERE m.direction = 'outbound') as sent,
        COUNT(*) FILTER (WHERE m.direction = 'outbound' AND m.status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE m.direction = 'inbound') as responses,
        COUNT(*) FILTER (WHERE m.status = 'opted_out' OR m.provider_status = 'opt_out') as opt_outs
      FROM sms_messages m
      LEFT JOIN campaigns c ON m.campaign_id = c.id
      WHERE m.lead_id IN (SELECT id FROM leads WHERE team_id = ${teamId})
        ${dateFilter}
      GROUP BY m.campaign_id, c.name
      ORDER BY sent DESC
      LIMIT 10
    `);

    const campaignStats: CampaignStats[] = (campaignStatsResult.rows || []).map(
      (row: any) => {
        const sent = parseInt(row.sent) || 0;
        const responses = parseInt(row.responses) || 0;
        return {
          campaignId: row.campaign_id || "none",
          campaignName: row.campaign_name || "No Campaign",
          sent,
          delivered: parseInt(row.delivered) || 0,
          responses,
          optOuts: parseInt(row.opt_outs) || 0,
          responseRate: sent > 0 ? (responses / sent) * 100 : 0,
        };
      },
    );

    // 5. Daily Trends (last N days)
    const dailyTrendsResult = await db.execute(sql`
      SELECT
        DATE(m.created_at) as date,
        COUNT(*) FILTER (WHERE direction = 'outbound') as outbound,
        COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND status = 'failed') as failed
      FROM sms_messages m
      WHERE m.lead_id IN (SELECT id FROM leads WHERE team_id = ${teamId})
        ${dateFilter}
      GROUP BY DATE(m.created_at)
      ORDER BY date ASC
    `);

    const dailyTrends: DailyTrend[] = (dailyTrendsResult.rows || []).map(
      (row: any) => ({
        date: row.date,
        outbound: parseInt(row.outbound) || 0,
        inbound: parseInt(row.inbound) || 0,
        delivered: parseInt(row.delivered) || 0,
        failed: parseInt(row.failed) || 0,
      }),
    );

    // 6. Recent Messages (for the table view like Easify)
    const recentMessagesResult = await db.execute(sql`
      SELECT
        m.id,
        m.lead_id as "leadId",
        COALESCE(l.first_name || ' ' || l.last_name, m.from_number) as "leadName",
        COALESCE(l.phone, m.from_number) as phone,
        m.body,
        m.direction,
        m.status,
        m.sent_by_advisor as worker,
        m.created_at as "createdAt",
        ii.classification
      FROM sms_messages m
      LEFT JOIN leads l ON m.lead_id = l.id
      LEFT JOIN LATERAL (
        SELECT classification
        FROM inbox_items
        WHERE lead_id = m.lead_id
        ORDER BY created_at DESC
        LIMIT 1
      ) ii ON true
      WHERE l.team_id = ${teamId}
        ${dateFilter}
        ${campaignFilter}
        ${workerFilter}
      ORDER BY m.created_at DESC
      LIMIT 50
    `);

    const recentMessages: RecentMessage[] = (
      recentMessagesResult.rows || []
    ).map((row: any) => ({
      id: row.id,
      leadId: row.leadId,
      leadName: row.leadName || row.phone,
      phone: row.phone,
      body: row.body,
      direction: row.direction,
      status: row.status,
      classification: row.classification,
      worker: row.worker,
      createdAt: row.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        classifications,
        workerStats,
        campaignStats,
        dailyTrends,
        recentMessages,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[SMS Analytics API] Error:", error);
    // Return empty data structure on error (graceful degradation)
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOutbound: 0,
          delivered: 0,
          deliveryRate: 0,
          failed: 0,
          failureRate: 0,
          totalInbound: 0,
          responseRate: 0,
          optedOut: 0,
          blacklistCount: 0,
        },
        classifications: [],
        workerStats: [],
        campaignStats: [],
        dailyTrends: [],
        recentMessages: [],
        dateRange: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      },
    });
  }
}
