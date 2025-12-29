import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * INBOX STATS API
 * Returns label counts and changes for inbox responses
 */

// Standard inbox labels
const LABEL_IDS = [
  "gold-label",
  "needs-help",
  "mobile-captured",
  "wants-call",
  "positive",
  "negative",
  "not-interested",
  "do-not-contact",
  "follow-up",
  "appointment-set",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "7d";

    // Calculate date ranges
    let currentDaysBack = 7;
    if (timeRange === "24h") currentDaysBack = 1;
    if (timeRange === "7d") currentDaysBack = 7;
    if (timeRange === "30d") currentDaysBack = 30;

    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - currentDaysBack);

    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - currentDaysBack * 2);

    // Get current period counts
    const currentResult = await db.execute(sql`
      SELECT
        label,
        COUNT(*) as count
      FROM inbox_responses
      WHERE created_at >= ${currentStart.toISOString()}
      GROUP BY label
    `);

    // Get previous period counts for change calculation
    const previousResult = await db.execute(sql`
      SELECT
        label,
        COUNT(*) as count
      FROM inbox_responses
      WHERE created_at >= ${previousStart.toISOString()}
        AND created_at < ${currentStart.toISOString()}
      GROUP BY label
    `);

    // Build label stats
    const labels: Record<string, number> = {};
    const changes: Record<string, number> = {};
    const previousCounts: Record<string, number> = {};

    // Initialize all labels to 0
    for (const id of LABEL_IDS) {
      labels[id] = 0;
      changes[id] = 0;
      previousCounts[id] = 0;
    }

    // Fill in previous period counts
    if (previousResult.rows) {
      for (const row of previousResult.rows) {
        const label = row.label as string;
        if (label) {
          previousCounts[label] = Number(row.count) || 0;
        }
      }
    }

    // Fill in current period counts and calculate changes
    if (currentResult.rows) {
      for (const row of currentResult.rows) {
        const label = row.label as string;
        if (label) {
          const current = Number(row.count) || 0;
          const previous = previousCounts[label] || 0;
          labels[label] = current;

          // Calculate percentage change
          if (previous === 0) {
            changes[label] = current > 0 ? 100 : 0;
          } else {
            changes[label] = Math.round(
              ((current - previous) / previous) * 100,
            );
          }
        }
      }
    }

    // Calculate totals
    const totalResponses = Object.values(labels).reduce((a, b) => a + b, 0);
    const goldLabels = labels["gold-label"] || 0;
    const positiveResponses = labels["positive"] || 0;
    const appointmentsSet = labels["appointment-set"] || 0;

    return NextResponse.json({
      success: true,
      labels,
      changes,
      summary: {
        total: totalResponses,
        goldLabels,
        positiveResponses,
        appointmentsSet,
        conversionRate:
          totalResponses > 0
            ? Math.round((appointmentsSet / totalResponses) * 100)
            : 0,
      },
      timeRange,
    });
  } catch (error) {
    console.error("[Inbox Stats] Error:", error);
    // Return empty data on error (table might not exist yet)
    const emptyLabels: Record<string, number> = {};
    const emptyChanges: Record<string, number> = {};
    for (const id of LABEL_IDS) {
      emptyLabels[id] = 0;
      emptyChanges[id] = 0;
    }

    return NextResponse.json({
      success: true,
      labels: emptyLabels,
      changes: emptyChanges,
      summary: {
        total: 0,
        goldLabels: 0,
        positiveResponses: 0,
        appointmentsSet: 0,
        conversionRate: 0,
      },
      timeRange: "7d",
    });
  }
}
