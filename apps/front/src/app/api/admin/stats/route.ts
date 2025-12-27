import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  leads,
  businesses,
  contacts,
  properties,
  smsMessages,
  callLogs,
  dataSources,
  buckets,
  campaignAttempts,
  deals,
} from "@/lib/db/schema";
import { count, desc, gte } from "drizzle-orm";

/**
 * Real Admin Stats Endpoint
 * CONNECTED TO: DigitalOcean Managed PostgreSQL
 * Queries actual schema tables for live dashboard data
 */

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured", database: "not_connected" },
        { status: 500 },
      );
    }

    // Run all counts in parallel for performance
    const [
      leadsResult,
      businessesResult,
      contactsResult,
      propertiesResult,
      smsResult,
      callsResult,
      dataSourcesResult,
      bucketsResult,
      campaignAttemptsResult,
      dealsResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(leads)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(businesses)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(contacts)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(properties)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(smsMessages)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(callLogs)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(dataSources)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(buckets)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(campaignAttempts)
        .catch(() => [{ count: 0 }]),
      db
        .select({ count: count() })
        .from(deals)
        .catch(() => [{ count: 0 }]),
    ]);

    // Get recent activity from SMS messages and call logs
    let recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      time: string;
    }> = [];

    try {
      // Get recent SMS messages
      const recentSms = await db
        .select({
          id: smsMessages.id,
          direction: smsMessages.direction,
          toNumber: smsMessages.toNumber,
          fromNumber: smsMessages.fromNumber,
          status: smsMessages.status,
          createdAt: smsMessages.createdAt,
        })
        .from(smsMessages)
        .orderBy(desc(smsMessages.createdAt))
        .limit(5);

      recentActivity = recentSms.map((msg) => ({
        id: String(msg.id),
        type:
          msg.direction === "inbound" ? "📥 Inbound SMS" : "📤 Outbound SMS",
        description: `${msg.direction === "inbound" ? "From" : "To"} ${msg.direction === "inbound" ? msg.fromNumber : msg.toNumber} (${msg.status})`,
        time: msg.createdAt.toISOString(),
      }));

      // Add recent calls
      const recentCalls = await db
        .select({
          id: callLogs.id,
          direction: callLogs.direction,
          toNumber: callLogs.toNumber,
          fromNumber: callLogs.fromNumber,
          status: callLogs.status,
          duration: callLogs.duration,
          createdAt: callLogs.createdAt,
        })
        .from(callLogs)
        .orderBy(desc(callLogs.createdAt))
        .limit(3);

      recentActivity = [
        ...recentActivity,
        ...recentCalls.map((call) => ({
          id: String(call.id),
          type:
            call.direction === "inbound"
              ? "📞 Inbound Call"
              : "📱 Outbound Call",
          description: `${call.direction === "inbound" ? "From" : "To"} ${call.direction === "inbound" ? call.fromNumber : call.toNumber} (${call.status}, ${call.duration || 0}s)`,
          time: call.createdAt.toISOString(),
        })),
      ].slice(0, 10);
    } catch (err) {
      console.log("No recent activity found:", err);
    }

    // Get campaign attempts in last 24 hours
    let todayAttempts = 0;
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const todayResult = await db
        .select({ count: count() })
        .from(campaignAttempts)
        .where(gte(campaignAttempts.createdAt, oneDayAgo));
      todayAttempts = Number(todayResult[0]?.count || 0);
    } catch {
      todayAttempts = 0;
    }

    // Calculate datalake total (businesses + contacts + properties)
    const datalakeTotal =
      Number(businessesResult[0]?.count || 0) +
      Number(contactsResult[0]?.count || 0) +
      Number(propertiesResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      database: "postgresql",
      stats: {
        // Core data counts
        totalLeads: Number(leadsResult[0]?.count || 0),
        totalBusinesses: Number(businessesResult[0]?.count || 0),
        totalContacts: Number(contactsResult[0]?.count || 0),
        totalProperties: Number(propertiesResult[0]?.count || 0),
        datalakeTotal,

        // Communication
        totalSmsMessages: Number(smsResult[0]?.count || 0),
        totalCalls: Number(callsResult[0]?.count || 0),

        // Organization
        totalDataSources: Number(dataSourcesResult[0]?.count || 0),
        totalBuckets: Number(bucketsResult[0]?.count || 0),
        totalDeals: Number(dealsResult[0]?.count || 0),

        // Campaign activity
        totalCampaignAttempts: Number(campaignAttemptsResult[0]?.count || 0),
        todayAttempts,

        // System
        systemAlerts: 0,
        activeJobs: 0,
      },
      recentActivity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        database: "error",
        stats: {
          totalLeads: 0,
          totalBusinesses: 0,
          totalContacts: 0,
          totalProperties: 0,
          datalakeTotal: 0,
          totalSmsMessages: 0,
          totalCalls: 0,
          totalDataSources: 0,
          totalBuckets: 0,
          totalDeals: 0,
          totalCampaignAttempts: 0,
          todayAttempts: 0,
          systemAlerts: 0,
          activeJobs: 0,
        },
        recentActivity: [],
      },
      { status: 500 },
    );
  }
}
