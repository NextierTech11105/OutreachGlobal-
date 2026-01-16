/**
 * CATHY SCHEDULE API - Nudge Sequence Scheduling
 *
 * Manages automated nudge sequences for leads:
 * - POST: Create/update nudge schedule for leads
 * - GET: Get scheduled nudges
 * - DELETE: Cancel scheduled nudges
 *
 * Default cadence:
 * - Day 2: First nudge (mild)
 * - Day 4: Second nudge (mild)
 * - Day 7: Third nudge (medium)
 * - Day 10: Fourth nudge (medium)
 * - Day 14: Final nudge (spicy)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, or, isNull, sql, gte } from "drizzle-orm";
import { redis, isRedisAvailable } from "@/lib/redis";

const NUDGE_SCHEDULE_KEY = "cathy:nudge_schedule";

// Default nudge cadence (days after initial contact)
const DEFAULT_CADENCE = [
  { day: 2, humorLevel: "mild" as const },
  { day: 4, humorLevel: "mild" as const },
  { day: 7, humorLevel: "medium" as const },
  { day: 10, humorLevel: "medium" as const },
  { day: 14, humorLevel: "spicy" as const },
];

interface ScheduledNudge {
  id: string;
  leadId: string;
  scheduledAt: string; // ISO date
  attemptNumber: number;
  humorLevel: "mild" | "medium" | "spicy";
  status: "pending" | "sent" | "cancelled" | "failed";
  createdAt: string;
}

interface NudgeScheduleMemory {
  schedules: ScheduledNudge[];
}

let scheduleMemory: NudgeScheduleMemory = { schedules: [] };
let initialized = false;

// Initialize from Redis
async function initializeFromRedis(): Promise<void> {
  if (initialized) return;

  try {
    if (await isRedisAvailable()) {
      const stored = await redis.get<NudgeScheduleMemory>(NUDGE_SCHEDULE_KEY);
      if (stored) {
        scheduleMemory = stored;
        console.log(
          `[Cathy Schedule] Loaded ${scheduleMemory.schedules.length} scheduled nudges from Redis`,
        );
      }
    }
  } catch (error) {
    console.error("[Cathy Schedule] Redis init error:", error);
  }
  initialized = true;
}

async function persistSchedule(): Promise<void> {
  try {
    if (await isRedisAvailable()) {
      await redis.set(NUDGE_SCHEDULE_KEY, JSON.stringify(scheduleMemory));
    }
  } catch (error) {
    console.error("[Cathy Schedule] Redis persist error:", error);
  }
}

async function getSchedules(): Promise<ScheduledNudge[]> {
  await initializeFromRedis();
  return scheduleMemory.schedules;
}

interface ScheduleRequest {
  leadIds: string[];
  cadence?: typeof DEFAULT_CADENCE;
  startDate?: string; // ISO date to start from (default: now)
  campaignId?: string;
}

// POST - Create nudge schedules for leads
export async function POST(request: NextRequest) {
  try {
    await initializeFromRedis();

    const body: ScheduleRequest = await request.json();
    const { leadIds, cadence = DEFAULT_CADENCE, startDate, campaignId } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "leadIds array required" },
        { status: 400 },
      );
    }

    const baseDate = startDate ? new Date(startDate) : new Date();
    const createdSchedules: ScheduledNudge[] = [];
    const skipped: string[] = [];

    for (const leadId of leadIds) {
      // Check if lead exists
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead) {
        skipped.push(leadId);
        continue;
      }

      // Check for existing schedules
      const existingForLead = scheduleMemory.schedules.filter(
        (s) => s.leadId === leadId && s.status === "pending",
      );

      if (existingForLead.length > 0) {
        skipped.push(leadId);
        continue;
      }

      // Create schedule for each nudge in cadence
      for (let i = 0; i < cadence.length; i++) {
        const nudgeConfig = cadence[i];
        const scheduledDate = new Date(baseDate);
        scheduledDate.setDate(scheduledDate.getDate() + nudgeConfig.day);

        const schedule: ScheduledNudge = {
          id: crypto.randomUUID(),
          leadId,
          scheduledAt: scheduledDate.toISOString(),
          attemptNumber: i + 1,
          humorLevel: nudgeConfig.humorLevel,
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        scheduleMemory.schedules.push(schedule);
        createdSchedules.push(schedule);
      }
    }

    await persistSchedule();

    console.log(
      `[Cathy Schedule] Created ${createdSchedules.length} nudge schedules for ${leadIds.length - skipped.length} leads`,
    );

    return NextResponse.json({
      success: true,
      created: createdSchedules.length,
      skipped: skipped.length,
      leadsScheduled: leadIds.length - skipped.length,
      schedules: createdSchedules.map((s) => ({
        id: s.id,
        leadId: s.leadId,
        scheduledAt: s.scheduledAt,
        attemptNumber: s.attemptNumber,
        humorLevel: s.humorLevel,
      })),
      cadence,
    });
  } catch (error) {
    console.error("[Cathy Schedule] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Schedule failed",
      },
      { status: 500 },
    );
  }
}

// GET - Get scheduled nudges
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const status = searchParams.get("status");
    const dueOnly = searchParams.get("due") === "true";

    await initializeFromRedis();

    let schedules = scheduleMemory.schedules;

    // Filter by leadId
    if (leadId) {
      schedules = schedules.filter((s) => s.leadId === leadId);
    }

    // Filter by status
    if (status) {
      schedules = schedules.filter((s) => s.status === status);
    }

    // Filter to only due nudges (past scheduledAt)
    if (dueOnly) {
      const now = new Date();
      schedules = schedules.filter(
        (s) => s.status === "pending" && new Date(s.scheduledAt) <= now,
      );
    }

    // Sort by scheduledAt
    schedules.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

    return NextResponse.json({
      success: true,
      count: schedules.length,
      schedules: schedules.slice(0, 100), // Limit response
      summary: {
        pending: scheduleMemory.schedules.filter((s) => s.status === "pending")
          .length,
        sent: scheduleMemory.schedules.filter((s) => s.status === "sent")
          .length,
        cancelled: scheduleMemory.schedules.filter(
          (s) => s.status === "cancelled",
        ).length,
        failed: scheduleMemory.schedules.filter((s) => s.status === "failed")
          .length,
      },
    });
  } catch (error) {
    console.error("[Cathy Schedule] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get schedules" },
      { status: 500 },
    );
  }
}

// DELETE - Cancel scheduled nudges
export async function DELETE(request: NextRequest) {
  try {
    await initializeFromRedis();

    const body = await request.json();
    const { scheduleIds, leadId, cancelAll } = body;

    let cancelled = 0;

    if (cancelAll && leadId) {
      // Cancel all pending for a lead
      scheduleMemory.schedules = scheduleMemory.schedules.map((s) => {
        if (s.leadId === leadId && s.status === "pending") {
          cancelled++;
          return { ...s, status: "cancelled" as const };
        }
        return s;
      });
    } else if (scheduleIds && Array.isArray(scheduleIds)) {
      // Cancel specific schedules
      scheduleMemory.schedules = scheduleMemory.schedules.map((s) => {
        if (scheduleIds.includes(s.id) && s.status === "pending") {
          cancelled++;
          return { ...s, status: "cancelled" as const };
        }
        return s;
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "scheduleIds array or leadId with cancelAll required",
        },
        { status: 400 },
      );
    }

    await persistSchedule();

    return NextResponse.json({
      success: true,
      cancelled,
    });
  } catch (error) {
    console.error("[Cathy Schedule] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel schedules" },
      { status: 500 },
    );
  }
}
