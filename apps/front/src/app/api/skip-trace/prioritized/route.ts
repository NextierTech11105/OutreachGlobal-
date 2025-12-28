import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  selectNextBest2000,
  markLeadsAsQueued,
  getStabilizationProgress,
  DAILY_BATCH_SIZE,
  STABILIZATION_TARGET,
} from "@/lib/engines/prioritization-engine";

/**
 * PRIORITIZED SKIP TRACE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Combines prioritization engine + skip trace in one step
 *
 * Flow:
 * 1. Select next best 2,000 using 5-dimension scoring
 * 2. Skip trace all selected leads
 * 3. Return mobile phones ready for SMS campaign block
 *
 * This is the core of "The Machine" - automated lead enrichment on demand
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const SKIP_TRACE_BATCH_URL =
  "https://api.realestateapi.com/v1/SkipTraceBatchAwait";
const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";

interface SkipTraceResult {
  leadId: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  email: string | null;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId = "default_team",
      batchSize = DAILY_BATCH_SIZE,
      campaignId,
      targetIndustries,
      dryRun = false, // Preview without actually skip tracing
    } = body;

    console.log(
      `[Prioritized Skip Trace] Starting for team ${teamId}, batch size ${batchSize}`,
    );

    // Check API key
    if (!REALESTATE_API_KEY && !dryRun) {
      return NextResponse.json(
        { error: "REAL_ESTATE_API_KEY not configured" },
        { status: 503 },
      );
    }

    // Get stabilization progress
    const progress = await getStabilizationProgress(teamId);

    if (progress.totalProcessed >= STABILIZATION_TARGET) {
      return NextResponse.json({
        success: true,
        complete: true,
        message: `Stabilization complete! ${progress.totalProcessed} leads processed.`,
        progress,
      });
    }

    // Select next best leads using prioritization engine
    const nextBatch = await selectNextBest2000(teamId, {
      batchSize: Math.min(batchSize, DAILY_BATCH_SIZE),
      targetIndustries,
    });

    if (nextBatch.leads.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No unprocessed leads available",
          progress,
        },
        { status: 400 },
      );
    }

    console.log(
      `[Prioritized Skip Trace] Selected ${nextBatch.leads.length} leads (avg score: ${nextBatch.averageScore})`,
    );

    // Dry run - just return what would be processed
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        day: nextBatch.day,
        leadsSelected: nextBatch.leads.length,
        tierBreakdown: nextBatch.tierBreakdown,
        averageScore: nextBatch.averageScore,
        preview: nextBatch.leads.slice(0, 20).map((l) => ({
          id: l.id,
          name: [l.firstName, l.lastName].filter(Boolean).join(" "),
          title: l.title,
          company: l.company,
          score: l.score,
          tier: l.compositeScore.tier,
        })),
        progress,
      });
    }

    // Build skip trace batch request
    const skipTraceInputs = nextBatch.leads
      .filter((l) => l.firstName || l.lastName)
      .map((l) => ({
        key: l.id,
        first_name: l.firstName || "",
        last_name: l.lastName || "",
        address: l.address || "",
        city: l.city || "",
        state: l.state || "",
        zip: l.zipCode || "",
      }));

    if (skipTraceInputs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No leads with name data for skip trace",
        },
        { status: 400 },
      );
    }

    console.log(
      `[Prioritized Skip Trace] Sending ${skipTraceInputs.length} leads to SkipTraceBatchAwait`,
    );

    // Call RealEstateAPI SkipTraceBatchAwait
    const skipResponse = await fetch(SKIP_TRACE_BATCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ inputs: skipTraceInputs }),
    });

    if (!skipResponse.ok) {
      const errorText = await skipResponse.text();
      console.error("[Prioritized Skip Trace] API error:", errorText);
      return NextResponse.json(
        {
          error: `Skip trace API error: ${skipResponse.status}`,
          details: errorText,
        },
        { status: 502 },
      );
    }

    const skipData = await skipResponse.json();
    const results: SkipTraceResult[] = [];

    // Process results and extract mobile phones
    for (const result of skipData.output || []) {
      const leadId = result.input?.key || "";
      const lead = nextBatch.leads.find((l) => l.id === leadId);

      if (!result.identity) {
        results.push({
          leadId,
          firstName: lead?.firstName || null,
          lastName: lead?.lastName || null,
          mobile: null,
          email: null,
          success: false,
          error: "No identity found",
        });
        continue;
      }

      // Extract mobile phone (prefer mobile > wireless > any)
      const phones = result.identity.phones || [];
      const mobilePhone =
        phones.find((p: { type?: string }) =>
          ["mobile", "wireless", "cell"].includes(p.type?.toLowerCase() || ""),
        ) || phones[0];

      // Extract email
      const emails = result.identity.emails || [];
      const primaryEmail = emails[0]?.address || null;

      results.push({
        leadId,
        firstName: result.identity.firstName || lead?.firstName || null,
        lastName: result.identity.lastName || lead?.lastName || null,
        mobile: mobilePhone?.number || null,
        email: primaryEmail,
        success: true,
      });

      // Update lead record with enriched data
      if (leadId && (mobilePhone?.number || primaryEmail)) {
        await db
          .update(leads)
          .set({
            phone: mobilePhone?.number || lead?.phone,
            email: primaryEmail || lead?.email,
            status: "enriched",
            metadata: sql`
              COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
                skipTracedAt: new Date().toISOString(),
                phoneType: mobilePhone?.type,
                skipTraceScore: lead?.score,
              })}::jsonb
            `,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
      }
    }

    // Mark all leads as processed
    const leadIds = nextBatch.leads.map((l) => l.id);
    const queueTag = campaignId
      ? `campaign:${campaignId}`
      : `day${nextBatch.day}_skiptrace`;
    await markLeadsAsQueued(leadIds, queueTag);

    // Prepare SMS-ready output
    const smsReady = results
      .filter((r) => r.success && r.mobile)
      .map((r) => ({
        leadId: r.leadId,
        name: [r.firstName, r.lastName].filter(Boolean).join(" "),
        phone: r.mobile,
        email: r.email,
      }));

    const mobileHitRate = Math.round((smsReady.length / results.length) * 100);

    console.log(
      `[Prioritized Skip Trace] Complete: ${smsReady.length} mobiles found (${mobileHitRate}% hit rate)`,
    );

    // Get updated progress
    const newProgress = await getStabilizationProgress(teamId);

    return NextResponse.json({
      success: true,
      day: nextBatch.day,
      campaignBlock: {
        leadsProcessed: results.length,
        mobilesFound: smsReady.length,
        mobileHitRate: `${mobileHitRate}%`,
        tierBreakdown: nextBatch.tierBreakdown,
        averageScore: nextBatch.averageScore,
      },
      smsReady, // Ready for /api/signalhouse/bulk-send
      results, // Full results
      progress: {
        ...newProgress,
        dailyBatchSize: DAILY_BATCH_SIZE,
        stabilizationTarget: STABILIZATION_TARGET,
      },
      message: `Day ${nextBatch.day}: ${smsReady.length} mobiles ready for SMS (${mobileHitRate}% hit rate)`,
    });
  } catch (error: unknown) {
    console.error("[Prioritized Skip Trace] Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run prioritized skip trace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Preview what would be skip traced
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default_team";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const progress = await getStabilizationProgress(teamId);
    const preview = await selectNextBest2000(teamId, { batchSize: limit });

    return NextResponse.json({
      success: true,
      preview: {
        day: preview.day,
        leadsAvailable: preview.leads.length,
        tierBreakdown: preview.tierBreakdown,
        averageScore: preview.averageScore,
        topLeads: preview.leads.map((l) => ({
          id: l.id,
          name: [l.firstName, l.lastName].filter(Boolean).join(" "),
          title: l.title,
          company: l.company,
          address: [l.address, l.city, l.state].filter(Boolean).join(", "),
          score: l.score,
          tier: l.compositeScore.tier,
          signals: l.compositeScore.allSignals.slice(0, 5),
        })),
      },
      progress: {
        ...progress,
        dailyBatchSize: DAILY_BATCH_SIZE,
        stabilizationTarget: STABILIZATION_TARGET,
      },
    });
  } catch (error: unknown) {
    console.error("[Prioritized Skip Trace] GET Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
