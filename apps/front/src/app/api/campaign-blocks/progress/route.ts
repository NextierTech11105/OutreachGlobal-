import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, or, sql, gte } from "drizzle-orm";
import {
  getStabilizationProgress,
  DAILY_BATCH_SIZE,
  STABILIZATION_TARGET,
  DAYS_TO_STABILIZE,
} from "@/lib/engines/prioritization-engine";

/**
 * STABILIZATION PROGRESS TRACKER
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tracks the 10-day cycle toward 20K leads
 *
 * Visual: The Machine's dopamine-driven progress display
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface DayStats {
  day: number;
  processed: number;
  target: number;
  percentOfTarget: number;
  goldLabels: number;
  greenTags: number;
  responseRate: number;
  status: "complete" | "in_progress" | "pending";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default_team";

    // Get overall progress
    const progress = await getStabilizationProgress(teamId);

    // Get daily breakdown
    const dailyStats: DayStats[] = [];

    for (let day = 1; day <= DAYS_TO_STABILIZE; day++) {
      const dayStart = (day - 1) * DAILY_BATCH_SIZE;
      const dayEnd = day * DAILY_BATCH_SIZE;

      // Count leads processed in this day's window
      // This is a simplification - in production, use actual timestamps
      const dayLeadsResult = await db
        .select({
          total: sql<number>`count(*)`,
          goldLabels: sql<number>`count(*) FILTER (WHERE 'gold_label' = ANY(tags))`,
          greenTags: sql<number>`count(*) FILTER (WHERE 'green_tag' = ANY(tags))`,
          responded: sql<number>`count(*) FILTER (WHERE status IN ('responded', 'interested', 'converted'))`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.teamId, teamId),
            or(
              eq(leads.status, "contacted"),
              eq(leads.status, "queued"),
              eq(leads.status, "responded"),
              eq(leads.status, "interested"),
              eq(leads.status, "converted"),
            ),
          ),
        )
        .limit(1);

      // Simulated breakdown per day (in production, track by date)
      const totalForTeam = Number(dayLeadsResult[0]?.total || 0);
      const dayProcessed = Math.min(
        Math.max(0, totalForTeam - dayStart),
        DAILY_BATCH_SIZE,
      );

      const goldLabels = Number(dayLeadsResult[0]?.goldLabels || 0);
      const greenTags = Number(dayLeadsResult[0]?.greenTags || 0);
      const responded = Number(dayLeadsResult[0]?.responded || 0);

      // Distribute stats across days proportionally
      const dayGoldLabels =
        dayProcessed > 0
          ? Math.round(goldLabels * (dayProcessed / totalForTeam))
          : 0;
      const dayGreenTags =
        dayProcessed > 0
          ? Math.round(greenTags * (dayProcessed / totalForTeam))
          : 0;
      const dayResponded =
        dayProcessed > 0
          ? Math.round(responded * (dayProcessed / totalForTeam))
          : 0;

      let status: "complete" | "in_progress" | "pending";
      if (dayProcessed >= DAILY_BATCH_SIZE) {
        status = "complete";
      } else if (dayProcessed > 0) {
        status = "in_progress";
      } else {
        status = "pending";
      }

      dailyStats.push({
        day,
        processed: dayProcessed,
        target: DAILY_BATCH_SIZE,
        percentOfTarget: Math.round((dayProcessed / DAILY_BATCH_SIZE) * 100),
        goldLabels: dayGoldLabels,
        greenTags: dayGreenTags,
        responseRate:
          dayProcessed > 0
            ? Math.round((dayResponded / dayProcessed) * 100)
            : 0,
        status,
      });
    }

    // Calculate totals
    const totals = {
      processed: progress.totalProcessed,
      target: STABILIZATION_TARGET,
      percentComplete: progress.percentComplete,
      goldLabels: dailyStats.reduce((sum, d) => sum + d.goldLabels, 0),
      greenTags: dailyStats.reduce((sum, d) => sum + d.greenTags, 0),
      daysComplete: dailyStats.filter((d) => d.status === "complete").length,
      daysRemaining: progress.daysRemaining,
      onTrack: progress.onTrack,
    };

    // Generate ASCII progress bar for terminal display
    const progressBar = generateProgressBar(progress.percentComplete);

    return NextResponse.json({
      success: true,
      stabilization: {
        phase: progress.percentComplete >= 100 ? "COMPLETE" : "IN_PROGRESS",
        currentDay: progress.day,
        totalDays: DAYS_TO_STABILIZE,
        dailyTarget: DAILY_BATCH_SIZE,
        totalTarget: STABILIZATION_TARGET,
      },
      progress: {
        ...totals,
        progressBar,
        message: getProgressMessage(progress.percentComplete, progress.day),
      },
      dailyBreakdown: dailyStats,
      metrics: {
        avgResponseRate: Math.round(
          dailyStats.reduce((sum, d) => sum + d.responseRate, 0) /
            Math.max(1, dailyStats.filter((d) => d.processed > 0).length),
        ),
        conversionPotential: totals.goldLabels + totals.greenTags,
        projectedCompletion: new Date(
          Date.now() + progress.daysRemaining * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0],
      },
    });
  } catch (error: unknown) {
    console.error("[Progress Tracker] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateProgressBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent}%`;
}

function getProgressMessage(percent: number, day: number): string {
  if (percent >= 100) {
    return "🎯 STABILIZATION COMPLETE - The Machine is calibrated!";
  }
  if (percent >= 75) {
    return `📈 Day ${day}: Final stretch! ${100 - percent}% to go.`;
  }
  if (percent >= 50) {
    return `⚡ Day ${day}: Halfway there! Machine warming up.`;
  }
  if (percent >= 25) {
    return `🚀 Day ${day}: Building momentum. Patterns emerging.`;
  }
  return `🔧 Day ${day}: Calibration in progress. Data flowing.`;
}
