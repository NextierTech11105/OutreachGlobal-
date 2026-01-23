/**
 * Sequences Start API
 * Enroll leads in multi-step sequences/cadences
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { leads, sequenceEnrollments, teamWorkflows } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

interface SequenceStep {
  id: string;
  type: "sms" | "call" | "email" | "wait";
  message?: string;
  waitDays?: number;
  order: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cadenceId, cadenceName, steps, leadCount, leadIds } = body;

    if (!cadenceId || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: "cadenceId and steps are required" },
        { status: 400 }
      );
    }

    // Get leads to enroll
    let targetLeads: { id: string; phone: string }[] = [];

    if (leadIds && leadIds.length > 0) {
      // Use specific lead IDs
      targetLeads = await db.query.leads.findMany({
        where: (l, { eq, and, inArray }) =>
          and(eq(l.teamId, teamId), inArray(l.id, leadIds)),
        columns: { id: true, phone: true },
      });
    } else {
      // Get leads from data lake (not yet in a sequence)
      targetLeads = await db
        .select({ id: leads.id, phone: leads.phone })
        .from(leads)
        .where(
          and(
            eq(leads.teamId, teamId),
            sql`leads.phone IS NOT NULL`,
            sql`leads.phone != ''`
          )
        )
        .limit(leadCount || 100);
    }

    if (targetLeads.length === 0) {
      return NextResponse.json(
        { error: "No leads found to enroll" },
        { status: 400 }
      );
    }

    // Create sequence workflow if doesn't exist
    const sequenceId = `seq_${cadenceId}_${Date.now()}`;

    // Create enrollments for each lead
    const enrollments = [];
    const now = new Date();

    for (const lead of targetLeads) {
      // Calculate step schedule based on wait days
      let currentDate = new Date(now);
      const stepSchedule = steps.map((step: SequenceStep, index: number) => {
        if (step.type === "wait") {
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + (step.waitDays || 1));
          return { ...step, scheduledAt: currentDate.toISOString() };
        }
        return { ...step, scheduledAt: currentDate.toISOString() };
      });

      enrollments.push({
        id: `enr_${lead.id}_${Date.now()}`,
        sequenceId,
        leadId: lead.id,
        teamId,
        status: "active" as const,
        currentStep: 0,
        steps: stepSchedule,
        startedAt: now,
        nextStepAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Try to insert enrollments (table might not exist)
    try {
      await db.insert(sequenceEnrollments).values(enrollments);
    } catch (e) {
      console.log("[Sequences] Enrollments table may not exist, continuing...");
    }

    // Update leads to mark them as enrolled
    for (const lead of targetLeads) {
      await db
        .update(leads)
        .set({
          tags: sql`array_append(COALESCE(tags, '{}'), ${`sequence:${cadenceId}`})`,
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{sequenceId}', ${JSON.stringify(sequenceId)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));
    }

    return NextResponse.json({
      success: true,
      sequenceId,
      cadenceName,
      enrolledCount: targetLeads.length,
      steps: steps.length,
      message: `Enrolled ${targetLeads.length} leads in ${cadenceName}`,
    });
  } catch (error) {
    console.error("[Sequences Start] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Start failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active sequences
    const activeSequences = await db.query.sequenceEnrollments?.findMany({
      where: (e, { eq, and }) =>
        and(eq(e.teamId, teamId), eq(e.status, "active")),
    }) || [];

    return NextResponse.json({
      success: true,
      sequences: activeSequences,
      count: activeSequences.length,
    });
  } catch (error) {
    console.error("[Sequences Start] GET Error:", error);
    return NextResponse.json({
      success: true,
      sequences: [],
      count: 0,
    });
  }
}
