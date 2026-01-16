import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNotNull, notInArray, sql, gte } from "drizzle-orm";
import {
  CAMPAIGN_MACROS,
  MACRO_STABILIZATION_TARGET,
  DAILY_SKIP_TRACE_LIMIT,
} from "@/config/constants";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STABILIZATION TRACKER - Stage 1: 20K per Macro
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Track progress toward stabilization:
 * - B2B Decision Makers: 20K enriched + contacted
 * - Real Estate Technology: 20K enriched + contacted
 *
 * Stage 1 is COMPLETE when both macros hit 20K.
 * Then we move to Stage 2: Optimization & Response Handling
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const EXCLUDED_STATUSES = ["opted_out", "dnc", "invalid", "bounced"];

interface MacroProgress {
  macro: string;
  name: string;
  target: number;

  // Pipeline stages
  raw: number; // Total leads in system
  enriched: number; // Have phone number
  contacted: number; // GIANNA sent
  responded: number; // Got a response (GREEN tag)
  converted: number; // In call queue or booked

  // Progress metrics
  enrichmentRate: number; // enriched / raw
  contactRate: number; // contacted / enriched
  responseRate: number; // responded / contacted
  conversionRate: number; // converted / responded

  // Stabilization
  progress: number; // % toward 20K
  stabilized: boolean; // Hit 20K?
  daysToStabilize: number; // Estimated days left
}

interface DailyMetrics {
  date: string;
  enriched: number;
  contacted: number;
  responded: number;
  converted: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get stats for each macro
    const macroStats: MacroProgress[] = await Promise.all(
      Object.entries(CAMPAIGN_MACROS).map(async ([key, config]) => {
        // Raw leads (all leads for this team)
        const rawResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(eq(leads.teamId, teamId));

        // Enriched (have phone)
        const enrichedResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.teamId, teamId),
              isNotNull(leads.phone),
              notInArray(leads.status, EXCLUDED_STATUSES),
            ),
          );

        // Contacted (GIANNA sent)
        const contactedResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.teamId, teamId),
              sql`custom_fields->>'giannaStatus' = 'sent'`,
            ),
          );

        // Responded (has 'responded' tag)
        const respondedResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(and(eq(leads.teamId, teamId), sql`'responded' = ANY(tags)`));

        // Converted (in call queue or booked)
        const convertedResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.teamId, teamId),
              sql`lead_state IN ('in_call_queue', 'booked', 'appointment_set')`,
            ),
          );

        const raw = Number(rawResult[0]?.count || 0);
        const enriched = Number(enrichedResult[0]?.count || 0);
        const contacted = Number(contactedResult[0]?.count || 0);
        const responded = Number(respondedResult[0]?.count || 0);
        const converted = Number(convertedResult[0]?.count || 0);

        const progress = Math.round(
          (contacted / MACRO_STABILIZATION_TARGET) * 100,
        );
        const remaining = Math.max(0, MACRO_STABILIZATION_TARGET - contacted);
        const daysToStabilize = Math.ceil(remaining / DAILY_SKIP_TRACE_LIMIT);

        return {
          macro: key,
          name: config.name,
          target: MACRO_STABILIZATION_TARGET,
          raw,
          enriched,
          contacted,
          responded,
          converted,
          enrichmentRate: raw > 0 ? Math.round((enriched / raw) * 100) : 0,
          contactRate:
            enriched > 0 ? Math.round((contacted / enriched) * 100) : 0,
          responseRate:
            contacted > 0 ? Math.round((responded / contacted) * 100) : 0,
          conversionRate:
            responded > 0 ? Math.round((converted / responded) * 100) : 0,
          progress: Math.min(progress, 100),
          stabilized: contacted >= MACRO_STABILIZATION_TARGET,
          daysToStabilize,
        };
      }),
    );

    // Today's activity
    const todayEnriched = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          isNotNull(leads.phone),
          gte(leads.updatedAt, today),
        ),
      );

    const todayContacted = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          sql`custom_fields->>'giannaLastSentAt' >= ${today.toISOString()}`,
        ),
      );

    const todayResponded = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          sql`'responded' = ANY(tags)`,
          gte(leads.updatedAt, today),
        ),
      );

    // Calculate overall progress
    const totalContacted = macroStats.reduce((sum, m) => sum + m.contacted, 0);
    const totalTarget = MACRO_STABILIZATION_TARGET * macroStats.length; // 40K total
    const overallProgress = Math.round((totalContacted / totalTarget) * 100);
    const stage1Complete = macroStats.every((m) => m.stabilized);

    return NextResponse.json({
      success: true,
      teamId,
      stage: stage1Complete ? 2 : 1,
      stageName: stage1Complete ? "Optimization" : "Stabilization",

      // Overall progress
      overall: {
        target: totalTarget,
        contacted: totalContacted,
        progress: overallProgress,
        complete: stage1Complete,
      },

      // Per-macro progress
      macros: macroStats,

      // Today's metrics (dopamine!)
      today: {
        date: today.toISOString().split("T")[0],
        enriched: Number(todayEnriched[0]?.count || 0),
        contacted: Number(todayContacted[0]?.count || 0),
        responded: Number(todayResponded[0]?.count || 0),
        dailyTarget: DAILY_SKIP_TRACE_LIMIT,
      },

      // Next actions
      actions: getNextActions(macroStats, stage1Complete),
    });
  } catch (error) {
    console.error("[Stabilization] Error:", error);
    return NextResponse.json(
      { error: "Failed to get stabilization status" },
      { status: 500 },
    );
  }
}

function getNextActions(
  macros: MacroProgress[],
  stage1Complete: boolean,
): string[] {
  const actions: string[] = [];

  if (stage1Complete) {
    actions.push(
      "🎉 Stage 1 Complete! Focus on response handling and optimization.",
    );
    actions.push("📊 Analyze response rates and optimize openers.");
    actions.push("📞 Clear the call queue - book those meetings!");
    return actions;
  }

  // Find the macro with lowest progress
  const lowestMacro = macros.reduce((low, m) =>
    m.progress < low.progress ? m : low,
  );

  // Check if we need to enrich more
  const needsEnrichment = macros.some((m) => m.enriched < m.contacted + 1000);
  if (needsEnrichment) {
    actions.push("⚡ ENRICH: Upload more leads or run skip trace batch");
  }

  // Check if we have leads ready to contact
  const readyToContact = macros.some((m) => m.enriched > m.contacted);
  if (readyToContact) {
    actions.push("🚀 EXECUTE: Run instant execute to push leads to GIANNA");
  }

  // Progress message
  actions.push(
    `📈 ${lowestMacro.name}: ${lowestMacro.contacted.toLocaleString()} / 20K (${lowestMacro.daysToStabilize} days to go)`,
  );

  // Response handling
  const hasResponses = macros.some((m) => m.responded > 0);
  if (hasResponses) {
    actions.push("📞 Handle responses in call queue - book meetings!");
  }

  return actions;
}
