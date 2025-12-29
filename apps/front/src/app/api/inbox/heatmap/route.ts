import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * INBOX HEATMAP API
 * Returns hourly response activity grouped by day of week
 */

interface HeatmapCell {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number; // Count of responses
  labels: string[]; // Which labels this includes
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "7d";
    const labelsParam = searchParams.get("labels") || "";
    const selectedLabels = labelsParam
      ? labelsParam.split(",").filter(Boolean)
      : [];

    // Calculate date range
    let daysBack = 7;
    if (timeRange === "24h") daysBack = 1;
    if (timeRange === "7d") daysBack = 7;
    if (timeRange === "30d") daysBack = 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Query inbox responses grouped by day of week and hour
    const result = await db.execute(sql`
      SELECT
        EXTRACT(DOW FROM created_at) as day_of_week,
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT label) as labels
      FROM inbox_responses
      WHERE created_at >= ${startDate.toISOString()}
        ${
          selectedLabels.length > 0
            ? sql`AND label = ANY(${selectedLabels})`
            : sql``
        }
      GROUP BY
        EXTRACT(DOW FROM created_at),
        EXTRACT(HOUR FROM created_at)
      ORDER BY day_of_week, hour_of_day
    `);

    const cells: HeatmapCell[] = [];
    let maxValue = 0;

    if (result.rows && result.rows.length > 0) {
      for (const row of result.rows) {
        const value = Number(row.count) || 0;
        if (value > maxValue) maxValue = value;

        cells.push({
          day: Number(row.day_of_week),
          hour: Number(row.hour_of_day),
          value,
          labels: (row.labels as string[]) || [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      cells,
      maxValue,
      timeRange,
      selectedLabels,
    });
  } catch (error) {
    console.error("[Inbox Heatmap] Error:", error);
    // Return empty data on error (table might not exist yet)
    return NextResponse.json({
      success: true,
      cells: [],
      maxValue: 0,
      timeRange: "7d",
      selectedLabels: [],
    });
  }
}
