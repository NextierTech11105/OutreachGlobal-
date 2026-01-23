/**
 * Data Lake Pipeline API - Bronze → Silver → Gold
 * ON-DEMAND enrichment with LUCI guardrails
 *
 * COST: $0.02/lead (Tracerfy) - ON DEMAND ONLY
 * DAILY LIMIT: 10-2,000 per campaign (configurable)
 *
 * Flow:
 * 1. POST /api/datalake/pipeline/preview - Preview costs before commit
 * 2. POST /api/datalake/pipeline/enrich - Execute enrichment (requires approval)
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { LUCI, luciService } from "@/lib/luci";
import { startTrace, getQueueResults, waitForQueue } from "@/lib/luci/tracerfy-client";
import { batchVerifyPhones } from "@/lib/luci/trestle-client";

// ═══════════════════════════════════════════════════════════════════════════════
// LUCI GUARDRAILS - ON DEMAND ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════════

const ENRICHMENT_CONFIG = {
  // Per-campaign daily limits
  DAILY_LIMITS: {
    test: 10,
    small: 100,
    medium: 500,
    large: 1000,
    max: 2000,
  },

  // Cost per lead
  COST_PER_LEAD: {
    tracerfy: 0.02,  // Skip trace
    trestle: 0.03,   // Per phone validation (avg 3 phones = $0.09)
  },

  // Never auto-enrich above this threshold
  MAX_AUTO_ENRICH: 0, // Always require confirmation
};

interface EnrichmentPreview {
  batchId: string;
  totalLeads: number;
  alreadyEnriched: number;
  toEnrich: number;
  estimatedCost: {
    tracerfy: number;
    trestle: number;
    total: number;
  };
  dailyLimitRemaining: number;
  requiresConfirmation: boolean;
}

interface EnrichmentResult {
  success: boolean;
  batchId: string;
  enriched: number;
  skipped: number;
  failed: number;
  cost: number;
  tracerfyQueueId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Preview OR Execute Enrichment
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action = "preview",     // "preview" or "enrich"
      batchId,                // Batch/bucket ID from data lake
      leadIds,                // Specific lead IDs (optional)
      limit = 500,            // Max leads to enrich
      campaignType = "medium", // test, small, medium, large, max
      confirmed = false,      // User confirmed cost
    } = body;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Get leads that need enrichment
    // ═══════════════════════════════════════════════════════════════════════════

    const dailyLimit = ENRICHMENT_CONFIG.DAILY_LIMITS[campaignType as keyof typeof ENRICHMENT_CONFIG.DAILY_LIMITS] || 500;

    // Count already enriched today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnriched = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          sql`(metadata->>'enrichedAt')::timestamp >= ${today.toISOString()}`
        )
      );

    const enrichedToday = Number(todayEnriched[0]?.count || 0);
    const dailyRemaining = Math.max(0, dailyLimit - enrichedToday);

    // Get raw leads (not yet enriched)
    let query = db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        email: leads.email,
        address: leads.address,
        city: leads.city,
        state: leads.state,
        company: leads.company,
        metadata: leads.metadata,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          // Not yet enriched (no tracerfyQueueId)
          sql`(metadata->>'tracerfyQueueId' IS NULL OR metadata->>'tracerfyQueueId' = '')`
        )
      )
      .limit(Math.min(limit, dailyRemaining));

    const rawLeads = await query;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Calculate costs
    // ═══════════════════════════════════════════════════════════════════════════

    const toEnrich = rawLeads.length;
    const estimatedCost = {
      tracerfy: toEnrich * ENRICHMENT_CONFIG.COST_PER_LEAD.tracerfy,
      trestle: toEnrich * ENRICHMENT_CONFIG.COST_PER_LEAD.trestle * 3, // avg 3 phones
      total: toEnrich * (ENRICHMENT_CONFIG.COST_PER_LEAD.tracerfy + ENRICHMENT_CONFIG.COST_PER_LEAD.trestle * 3),
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // PREVIEW MODE - Return cost estimate, require confirmation
    // ═══════════════════════════════════════════════════════════════════════════

    if (action === "preview") {
      const preview: EnrichmentPreview = {
        batchId: batchId || "all",
        totalLeads: rawLeads.length + enrichedToday,
        alreadyEnriched: enrichedToday,
        toEnrich,
        estimatedCost,
        dailyLimitRemaining: dailyRemaining,
        requiresConfirmation: true,
      };

      return NextResponse.json({
        success: true,
        action: "preview",
        preview,
        message: toEnrich > 0
          ? `Ready to enrich ${toEnrich} leads for $${estimatedCost.total.toFixed(2)}. Call with action="enrich" and confirmed=true to proceed.`
          : dailyRemaining === 0
            ? `Daily limit reached (${dailyLimit}/day for ${campaignType} campaigns). Try again tomorrow.`
            : "No leads to enrich. Import more raw data first.",
        guardrails: {
          dailyLimit,
          enrichedToday,
          dailyRemaining,
          costPerLead: `$${(ENRICHMENT_CONFIG.COST_PER_LEAD.tracerfy + ENRICHMENT_CONFIG.COST_PER_LEAD.trestle * 3).toFixed(2)}`,
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENRICH MODE - Execute enrichment (requires confirmation)
    // ═══════════════════════════════════════════════════════════════════════════

    if (action === "enrich") {
      // LUCI GUARDRAIL: Require explicit confirmation
      if (!confirmed) {
        return NextResponse.json({
          error: "Confirmation required",
          message: `This will cost $${estimatedCost.total.toFixed(2)} to enrich ${toEnrich} leads. Set confirmed=true to proceed.`,
          preview: {
            toEnrich,
            estimatedCost,
          },
        }, { status: 400 });
      }

      // LUCI GUARDRAIL: Check daily limit
      if (toEnrich === 0) {
        return NextResponse.json({
          error: "No leads to enrich",
          message: dailyRemaining === 0
            ? `Daily limit reached (${dailyLimit}/day). Try again tomorrow.`
            : "No raw leads found. Import more data first.",
        }, { status: 400 });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 3: LUCI suppression check BEFORE enrichment
      // ═══════════════════════════════════════════════════════════════════════

      const leadsToEnrich: typeof rawLeads = [];
      const suppressed: string[] = [];

      for (const lead of rawLeads) {
        const canContact = await luciService.canContact(lead.id, teamId);
        if (canContact.allowed) {
          leadsToEnrich.push(lead);
        } else {
          suppressed.push(lead.id);
        }
      }

      if (leadsToEnrich.length === 0) {
        return NextResponse.json({
          success: false,
          error: "All leads suppressed by LUCI",
          suppressed: suppressed.length,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 4: Start Tracerfy skip trace
      // ═══════════════════════════════════════════════════════════════════════

      try {
        // Format for Tracerfy
        const traceInput = leadsToEnrich.map(lead => ({
          first_name: lead.firstName || "",
          last_name: lead.lastName || "",
          address: lead.address || "",
          city: lead.city || "",
          state: lead.state || "",
          phone: lead.phone || "",
          email: lead.email || "",
        }));

        // Start trace (async - will callback via webhook)
        const traceResult = await startTrace({
          records: traceInput,
          listTag: `nextier-${teamId}-${Date.now()}`,
          traceType: "normal", // $0.02/lead
        });

        if (!traceResult.success || !traceResult.queueId) {
          return NextResponse.json({
            success: false,
            error: "Tracerfy failed to start",
            details: traceResult.error,
          }, { status: 500 });
        }

        // Update leads with queue ID for webhook matching
        for (const lead of leadsToEnrich) {
          const currentMeta = (lead.metadata || {}) as Record<string, unknown>;
          await db
            .update(leads)
            .set({
              metadata: {
                ...currentMeta,
                tracerfyQueueId: traceResult.queueId,
                enrichmentStartedAt: new Date().toISOString(),
                enrichmentStatus: "tracing",
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));
        }

        const result: EnrichmentResult = {
          success: true,
          batchId: batchId || "all",
          enriched: leadsToEnrich.length,
          skipped: suppressed.length,
          failed: 0,
          cost: leadsToEnrich.length * ENRICHMENT_CONFIG.COST_PER_LEAD.tracerfy,
          tracerfyQueueId: traceResult.queueId,
        };

        return NextResponse.json({
          success: true,
          action: "enrich",
          result,
          message: `Started enrichment for ${leadsToEnrich.length} leads. Tracerfy queue: ${traceResult.queueId}`,
          nextSteps: [
            "Tracerfy will process leads (typically 5-30 mins)",
            "Webhook will update leads with phone/email data",
            "Then Trestle scoring will run automatically",
            "Check /api/datalake/pipeline?action=status for progress",
          ],
        });
      } catch (error) {
        console.error("[Pipeline] Tracerfy error:", error);
        return NextResponse.json({
          success: false,
          error: "Enrichment failed",
          details: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: "Invalid action",
      validActions: ["preview", "enrich"],
    }, { status: 400 });

  } catch (error) {
    console.error("[Pipeline] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Pipeline error",
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Pipeline status and documentation
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Status check
    if (action === "status") {
      // Count leads by enrichment status
      const stats = await db
        .select({
          total: sql<number>`count(*)`,
          raw: sql<number>`count(*) filter (where metadata->>'tracerfyQueueId' is null)`,
          tracing: sql<number>`count(*) filter (where metadata->>'enrichmentStatus' = 'tracing')`,
          traced: sql<number>`count(*) filter (where metadata->>'enrichmentStatus' = 'traced')`,
          scoring: sql<number>`count(*) filter (where metadata->>'enrichmentStatus' = 'scoring')`,
          ready: sql<number>`count(*) filter (where metadata->>'enrichmentStatus' = 'ready')`,
        })
        .from(leads)
        .where(eq(leads.teamId, teamId));

      const s = stats[0] || {};

      return NextResponse.json({
        success: true,
        pipeline: {
          bronze: { raw: Number(s.raw || 0), description: "Awaiting enrichment" },
          silver: {
            tracing: Number(s.tracing || 0),
            traced: Number(s.traced || 0),
            scoring: Number(s.scoring || 0),
            description: "Enrichment in progress",
          },
          gold: { ready: Number(s.ready || 0), description: "Campaign-ready" },
          total: Number(s.total || 0),
        },
      });
    }

    // Documentation
    return NextResponse.json({
      success: true,
      endpoint: "/api/datalake/pipeline",
      description: "ON-DEMAND enrichment pipeline with LUCI guardrails",

      workflow: {
        step1: "POST with action='preview' to see costs",
        step2: "POST with action='enrich' and confirmed=true to start",
        step3: "Tracerfy processes leads (~5-30 mins)",
        step4: "Webhook updates leads with enriched data",
        step5: "Trestle scores phones automatically",
        step6: "Leads move to GOLD (ready) status",
      },

      guardrails: {
        dailyLimits: ENRICHMENT_CONFIG.DAILY_LIMITS,
        costPerLead: {
          tracerfy: "$0.02 (skip trace)",
          trestle: "$0.03 per phone (~$0.09 avg)",
          total: "~$0.11 per lead",
        },
        rules: [
          "NEVER auto-enrich entire batches",
          "Cost confirmation required for every enrichment",
          "LUCI suppression check runs BEFORE enrichment",
          "Daily limits enforced per campaign type",
        ],
      },

      actions: {
        preview: {
          method: "POST",
          body: { action: "preview", limit: 500, campaignType: "medium" },
          returns: "Cost estimate and lead count",
        },
        enrich: {
          method: "POST",
          body: { action: "enrich", limit: 500, campaignType: "medium", confirmed: true },
          returns: "Tracerfy queue ID and processing status",
        },
        status: {
          method: "GET",
          query: "?action=status",
          returns: "Pipeline stage counts (bronze/silver/gold)",
        },
      },
    });

  } catch (error) {
    console.error("[Pipeline] GET Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Pipeline error",
    }, { status: 500 });
  }
}
