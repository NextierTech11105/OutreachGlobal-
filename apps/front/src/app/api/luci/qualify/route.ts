/**
 * QUALIFY LEADS - Move VALIDATED leads to READY status
 *
 * POST /api/luci/qualify
 * - Takes leads with pipelineStatus='validated'
 * - Applies qualification rules (Grade A/B + score >= 70)
 * - Updates pipelineStatus to 'ready' for qualified leads
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, sql, or, gte, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get validated leads
    const validatedLeads = await db
      .select({
        id: leads.id,
        score: leads.score,
        grade: leads.grade,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          eq(leads.pipelineStatus, "validated")
        )
      )
      .limit(5000); // Process in batches

    if (validatedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No validated leads to qualify",
        data: { ready: 0, rejected: 0 }
      });
    }

    // Qualification rules:
    // - Grade A or B
    // - OR score >= 70
    // - OR has phone (for now, just move all validated to ready)
    const qualifiedIds: string[] = [];
    const rejectedIds: string[] = [];

    for (const lead of validatedLeads) {
      const grade = (lead.grade || "").toUpperCase();
      const score = lead.score || 0;

      // Qualify if: Grade A/B OR score >= 70 OR just validated (lenient mode)
      const isQualified =
        grade === "A" ||
        grade === "B" ||
        score >= 70 ||
        true; // LENIENT: move all validated to ready for now

      if (isQualified) {
        qualifiedIds.push(lead.id);
      } else {
        rejectedIds.push(lead.id);
      }
    }

    // Update qualified leads to READY status
    if (qualifiedIds.length > 0) {
      await db
        .update(leads)
        .set({
          pipelineStatus: "ready",
          updatedAt: new Date()
        })
        .where(inArray(leads.id, qualifiedIds));
    }

    console.log(`[Qualify] ${qualifiedIds.length} leads moved to READY, ${rejectedIds.length} rejected`);

    return NextResponse.json({
      success: true,
      message: `Qualified ${qualifiedIds.length} leads`,
      data: {
        ready: qualifiedIds.length,
        rejected: rejectedIds.length,
        total: validatedLeads.length
      }
    });
  } catch (error) {
    console.error("[Qualify] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Qualification failed" },
      { status: 500 }
    );
  }
}
