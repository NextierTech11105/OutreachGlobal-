/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CORE EXECUTION CHAIN API - Digital Workforce Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/execution-chain - Execute pipeline stages
 * GET  /api/execution-chain - Get batch status and preview
 *
 * STAGES:
 * 1. import    → Upload CSV data
 * 2. enrich    → Tracerfy skip trace + Perplexity verify
 * 3. filter    → Contactability filter (mobile only)
 * 4. prep      → Campaign prep (ICP/Persona/Template)
 * 5. preview   → Review before deploy
 * 6. deploy    → Execute SMS via SignalHouse
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import {
  executeDataImport,
  executeEnrich,
  executeContactability,
  executeCampaignPrep,
  executePreview,
  executeDeploy,
  executeCapture,
  executeFullChain,
  BLUEPRINTS,
  getBlueprint,
  type ExecutionStage,
} from "@/lib/execution-chain";
import { CAMPAIGN_MACROS, SIGNALHOUSE_10DLC } from "@/config/constants";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";

const log = new Logger("ExecutionChainAPI");

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Execute pipeline stage
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stage, batchId, config, data } = body as {
      stage: ExecutionStage | "full";
      batchId?: string;
      config?: Record<string, unknown>;
      data?: Array<Record<string, string>>;
    };

    log.info(`[ExecutionChain] Stage: ${stage}, BatchId: ${batchId}`);

    // Full chain execution
    if (stage === "full") {
      if (!data || !Array.isArray(data)) {
        return NextResponse.json(
          { error: "data array required for full chain execution" },
          { status: 400 },
        );
      }

      const result = await executeFullChain(data, {
        source: (config?.source as string) || "usbizdata",
        industryId: (config?.industryId as string) || "b2b_technology",
        campaign: (config?.campaign as keyof typeof CAMPAIGN_MACROS) || "B2B",
        personaId: (config?.personaId as string) || "busy_ceo",
        dryRun: config?.dryRun as boolean,
      });

      return NextResponse.json({
        success: result.success,
        batchId: result.batchId,
        stages: result.stages,
        preview: result.preview,
        nextSteps: [
          result.preview?.readyToDeploy
            ? "Ready to deploy - POST with stage: 'DEPLOY'"
            : "Review preview and fix warnings",
          "Monitor responses in AI Copilot",
          "HOT leads routed to Call Queue",
        ],
      });
    }

    // Individual stage execution
    switch (stage) {
      case "DATA_IMPORT": {
        if (!data || !Array.isArray(data)) {
          return NextResponse.json(
            { error: "data array required for import" },
            { status: 400 },
          );
        }

        const result = await executeDataImport(data, {
          source: (config?.source as string) || "usbizdata",
          campaignId: config?.campaignId as string,
          industryId: config?.industryId as string,
          batchName: config?.batchName as string,
        });

        return NextResponse.json({
          success: result.success,
          stage: result.stage,
          batchId: result.batchId,
          results: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
          },
          errors: result.errors,
          nextStage: result.nextStage,
          action: `POST /api/execution-chain with stage: '${result.nextStage}' and batchId: '${result.batchId}'`,
        });
      }

      case "ENRICH": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for enrich stage" },
            { status: 400 },
          );
        }

        const result = await executeEnrich(batchId, {
          skipTrace: config?.skipTrace !== false,
          verifyBusiness: config?.verifyBusiness === true,
        });

        return NextResponse.json({
          success: result.success,
          stage: result.stage,
          batchId,
          results: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            enrichmentCost: result.data?.enrichmentCost,
          },
          errors: result.errors,
          nextStage: result.nextStage,
          note: "Skip trace is async - results will arrive via webhook",
        });
      }

      case "CONTACTABILITY": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for contactability stage" },
            { status: 400 },
          );
        }

        const result = await executeContactability(batchId);

        return NextResponse.json({
          success: result.success,
          stage: result.stage,
          batchId,
          results: {
            processed: result.processed,
            mobile: result.data?.mobile,
            landline: result.data?.landline,
            unknown: result.data?.unknown,
            contactableRate: `${result.data?.contactableRate}%`,
          },
          nextStage: result.nextStage,
        });
      }

      case "CAMPAIGN_PREP": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for campaign prep" },
            { status: 400 },
          );
        }

        const result = await executeCampaignPrep(batchId, {
          personaId: (config?.personaId as string) || "busy_ceo",
          templateStage:
            (config?.templateStage as "opener" | "nudge" | "value" | "close") ||
            "opener",
          campaign: (config?.campaign as keyof typeof CAMPAIGN_MACROS) || "B2B",
        });

        return NextResponse.json({
          success: result.success,
          stage: result.stage,
          batchId,
          results: {
            processed: result.processed,
            template: result.data?.templateMessage,
            charCount: result.data?.charCount,
            campaignId: result.data?.campaignId,
          },
          errors: result.errors,
          nextStage: result.nextStage,
        });
      }

      case "PREVIEW": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for preview" },
            { status: 400 },
          );
        }

        const preview = await executePreview(batchId);

        return NextResponse.json({
          success: true,
          stage: "PREVIEW",
          batchId,
          preview: {
            totalLeads: preview.totalLeads,
            contactableLeads: preview.contactableLeads,
            mobileLeads: preview.mobileLeads,
            template: preview.template,
            estimatedCost: preview.estimatedCost,
            sampleMessages: preview.sampleMessages,
            readyToDeploy: preview.readyToDeploy,
            warnings: preview.warnings,
          },
          compliance: {
            campaignId: SIGNALHOUSE_10DLC.campaignId,
            brandId: SIGNALHOUSE_10DLC.brandId,
            optOutText: SIGNALHOUSE_10DLC.compliance.optOutText,
            fromNumber: SIGNALHOUSE_10DLC.phoneNumber,
            rateLimit: `${SIGNALHOUSE_10DLC.carrierLimits.att.smsTPM} SMS/min`,
          },
          nextStage: preview.readyToDeploy ? "DEPLOY" : "CAMPAIGN_PREP",
        });
      }

      case "DEPLOY": {
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId required for deploy" },
            { status: 400 },
          );
        }

        const result = await executeDeploy(batchId, {
          dryRun: config?.dryRun === true,
          limit: config?.limit as number,
        });

        return NextResponse.json({
          success: result.success,
          stage: result.stage,
          batchId,
          results: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            dryRun: result.data?.dryRun,
            fromNumber: result.data?.fromNumber,
            smsRate: result.data?.smsRate,
          },
          errors: result.errors,
          nextStage: result.nextStage,
          worker: "GIANNA",
          note: result.data?.dryRun
            ? "Dry run completed - no SMS sent"
            : `${result.succeeded} SMS sent via SignalHouse`,
        });
      }

      case "CAPTURE": {
        const { leadId, email, mobileConfirmed, permissionGranted } =
          config || {};

        if (!leadId) {
          return NextResponse.json(
            { error: "leadId required for capture" },
            { status: 400 },
          );
        }

        const result = await executeCapture(leadId as string, {
          email: email as string,
          mobileConfirmed: mobileConfirmed as boolean,
          permissionGranted: permissionGranted as boolean,
        });

        return NextResponse.json({
          success: result.success,
          stage: result.stage,
          leadId,
          captured: result.data,
          nextStage: result.nextStage,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown stage: ${stage}` },
          { status: 400 },
        );
    }
  } catch (error) {
    log.error("[ExecutionChain] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get batch status and pipeline info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const action = searchParams.get("action");

    // Get blueprints info
    if (action === "blueprints") {
      return NextResponse.json({
        success: true,
        blueprints: BLUEPRINTS,
        description: {
          COLD: "Initial outreach - THE LOOP Day 1-7",
          WARM: "Engaged leads - THE LOOP Day 7-21",
          RETENTION: "Converted leads - ongoing nurture",
        },
      });
    }

    // Get 10DLC compliance info
    if (action === "compliance") {
      return NextResponse.json({
        success: true,
        compliance: {
          ...SIGNALHOUSE_10DLC,
          sampleMessages: [
            `Hi {firstName}, save 20+ hrs/week on outbound with AI. Quick call to show you? ${SIGNALHOUSE_10DLC.compliance.optOutText} -NEXTIER`,
            `{firstName}, scale outbound without hiring. Book 15 min: {link} ${SIGNALHOUSE_10DLC.compliance.optOutText} -NEXTIER`,
          ],
        },
      });
    }

    // Get campaigns info
    if (action === "campaigns") {
      return NextResponse.json({
        success: true,
        campaigns: CAMPAIGN_MACROS,
        default: "B2B",
      });
    }

    // Get batch status
    if (batchId) {
      const batchLeads = await db
        .select()
        .from(leads)
        .where(sql`custom_fields->>'batchId' = ${batchId}`);

      const stages = {
        imported: 0,
        enriched: 0,
        contactable: 0,
        campaign_ready: 0,
        contacted: 0,
        engaged: 0,
        qualified: 0,
        appointment_set: 0,
      };

      for (const lead of batchLeads) {
        const stage = lead.stage as keyof typeof stages;
        if (stages[stage] !== undefined) {
          stages[stage]++;
        }
        if ((lead.customFields as Record<string, boolean>)?.contactable) {
          stages.contactable++;
        }
      }

      return NextResponse.json({
        success: true,
        batchId,
        totalLeads: batchLeads.length,
        stages,
        preview: batchLeads.length > 0 ? await executePreview(batchId) : null,
      });
    }

    // List all batches
    const allLeads = await db
      .select({
        batchId: sql<string>`custom_fields->>'batchId'`,
        count: sql<number>`count(*)`,
        source: sql<string>`custom_fields->>'source'`,
        createdAt: sql<string>`min(created_at)`,
      })
      .from(leads)
      .where(sql`custom_fields->>'batchId' IS NOT NULL`)
      .groupBy(sql`custom_fields->>'batchId'`, sql`custom_fields->>'source'`);

    return NextResponse.json({
      success: true,
      batches: allLeads,
      stages: [
        "DATA_IMPORT",
        "ENRICH",
        "CONTACTABILITY",
        "CAMPAIGN_PREP",
        "PREVIEW",
        "DEPLOY",
        "INBOUND",
        "CAPTURE",
        "CONVERSION",
      ],
      blueprints: Object.keys(BLUEPRINTS),
      campaigns: Object.keys(CAMPAIGN_MACROS),
      compliance: {
        campaignId: SIGNALHOUSE_10DLC.campaignId,
        status: SIGNALHOUSE_10DLC.status,
        rateLimit: `${SIGNALHOUSE_10DLC.carrierLimits.att.smsTPM} SMS/min`,
      },
    });
  } catch (error) {
    log.error("[ExecutionChain] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get execution status" },
      { status: 500 },
    );
  }
}
