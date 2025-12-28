import { NextRequest, NextResponse } from "next/server";
import {
  selectNextBest2000,
  markLeadsAsQueued,
  getStabilizationProgress,
  calculateCompositeScore,
  DAILY_BATCH_SIZE,
  STABILIZATION_TARGET,
  DAYS_TO_STABILIZE,
} from "@/lib/engines/prioritization-engine";

/**
 * CAMPAIGN BLOCKS API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Manages the "next best 2,000" selection for daily campaign blocks
 *
 * Flow:
 * 1. GET - View progress and preview next batch
 * 2. POST - Draw the next 2,000 and mark them queued
 * 3. The queued leads are then skip traced + bulk SMS'd
 *
 * 10-day cycle: 2,000/day × 10 days = 20,000 to stabilize the machine
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// GET - Preview next campaign block and view progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default_team";
    const preview = searchParams.get("preview") === "true";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Get stabilization progress
    const progress = await getStabilizationProgress(teamId);

    if (!preview) {
      // Just return progress stats
      return NextResponse.json({
        success: true,
        progress: {
          ...progress,
          dailyBatchSize: DAILY_BATCH_SIZE,
          stabilizationTarget: STABILIZATION_TARGET,
          daysToStabilize: DAYS_TO_STABILIZE,
        },
        message: `Day ${progress.day} of ${DAYS_TO_STABILIZE}: ${progress.totalProcessed}/${STABILIZATION_TARGET} leads processed (${progress.percentComplete}%)`,
      });
    }

    // Preview mode: show what the next 2,000 would look like
    const nextBatch = await selectNextBest2000(teamId, {
      batchSize: Math.min(limit, DAILY_BATCH_SIZE),
    });

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        dailyBatchSize: DAILY_BATCH_SIZE,
        stabilizationTarget: STABILIZATION_TARGET,
      },
      preview: {
        day: nextBatch.day,
        leadsAvailable: nextBatch.leads.length,
        tierBreakdown: nextBatch.tierBreakdown,
        averageScore: nextBatch.averageScore,
        topLeads: nextBatch.leads.slice(0, 10).map((lead) => ({
          id: lead.id,
          name: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
          title: lead.title,
          company: lead.company,
          score: lead.score,
          tier: lead.compositeScore.tier,
          signals: lead.compositeScore.allSignals,
        })),
      },
      message: `Preview of next ${nextBatch.leads.length} leads (avg score: ${nextBatch.averageScore})`,
    });
  } catch (error: unknown) {
    console.error("[Campaign Blocks] GET Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get campaign block preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Draw the next 2,000 leads and queue them for skip trace + SMS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId = "default_team",
      campaignId,
      batchSize = DAILY_BATCH_SIZE,
      targetIndustries,
      autoSkipTrace = false,
      autoSms = false,
    } = body;

    // Check stabilization progress
    const progress = await getStabilizationProgress(teamId);

    if (progress.totalProcessed >= STABILIZATION_TARGET) {
      return NextResponse.json({
        success: true,
        complete: true,
        message: `Stabilization complete! ${progress.totalProcessed} leads processed over ${progress.day} days.`,
        progress,
      });
    }

    // Select the next best leads
    console.log(
      `[Campaign Blocks] Selecting next best ${batchSize} leads for team ${teamId}...`,
    );

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
          message: "Import more leads to continue the campaign",
        },
        { status: 400 },
      );
    }

    // Mark leads as queued
    const leadIds = nextBatch.leads.map((l) => l.id);
    const queueTag = campaignId
      ? `campaign:${campaignId}`
      : `day${nextBatch.day}_block`;
    await markLeadsAsQueued(leadIds, queueTag);

    console.log(
      `[Campaign Blocks] Queued ${leadIds.length} leads with tag: ${queueTag}`,
    );

    // Build response with leads ready for skip trace
    const queuedLeads = nextBatch.leads.map((lead) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zipCode: lead.zipCode,
      title: lead.title,
      company: lead.company,
      score: lead.score,
      tier: lead.compositeScore.tier,
      // For skip trace API
      skipTraceInput: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zipCode,
      },
    }));

    // If auto skip trace is enabled, trigger the skip trace batch
    let skipTraceResult = null;
    if (autoSkipTrace && queuedLeads.length > 0) {
      console.log(
        `[Campaign Blocks] Auto-triggering skip trace for ${queuedLeads.length} leads...`,
      );
      try {
        const skipTraceResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/skip-trace`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bulk: true,
              ids: queuedLeads.map((l) => l.id),
            }),
          },
        );
        skipTraceResult = await skipTraceResponse.json();
        console.log(`[Campaign Blocks] Skip trace result:`, skipTraceResult);
      } catch (stError) {
        console.error("[Campaign Blocks] Skip trace error:", stError);
      }
    }

    // If auto SMS is enabled, trigger the bulk send
    let smsResult = null;
    if (autoSms && skipTraceResult?.results) {
      const phonesToSms = skipTraceResult.results
        .filter(
          (r: { phones?: { number: string; type?: string }[] }) =>
            r.phones?.length > 0,
        )
        .flatMap((r: { phones: { number: string; type?: string }[] }) =>
          r.phones.map((p) => ({ number: p.number, type: p.type })),
        );

      if (phonesToSms.length > 0) {
        console.log(
          `[Campaign Blocks] Auto-triggering SMS for ${phonesToSms.length} phones...`,
        );
        try {
          const smsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/signalhouse/bulk-send`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: phonesToSms,
                message:
                  body.smsMessage ||
                  "Hi! Quick question - do you have a moment to chat?",
                campaignId,
              }),
            },
          );
          smsResult = await smsResponse.json();
          console.log(`[Campaign Blocks] SMS result:`, smsResult);
        } catch (smsError) {
          console.error("[Campaign Blocks] SMS error:", smsError);
        }
      }
    }

    // Updated progress
    const newProgress = await getStabilizationProgress(teamId);

    return NextResponse.json({
      success: true,
      campaignBlock: {
        day: nextBatch.day,
        leadsQueued: queuedLeads.length,
        queueTag,
        tierBreakdown: nextBatch.tierBreakdown,
        averageScore: nextBatch.averageScore,
      },
      leads: queuedLeads,
      skipTrace: skipTraceResult,
      sms: smsResult,
      progress: {
        ...newProgress,
        dailyBatchSize: DAILY_BATCH_SIZE,
        stabilizationTarget: STABILIZATION_TARGET,
      },
      message: `Day ${nextBatch.day}: Queued ${queuedLeads.length} leads (avg score: ${nextBatch.averageScore}, ${nextBatch.tierBreakdown.A} tier-A)`,
    });
  } catch (error: unknown) {
    console.error("[Campaign Blocks] POST Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create campaign block";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
