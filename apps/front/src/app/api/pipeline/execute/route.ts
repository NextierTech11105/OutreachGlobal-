/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PIPELINE EXECUTE API - Full USBizData → SMS Execution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/pipeline/execute - Execute full pipeline
 * GET  /api/pipeline/execute - Get pipeline status
 *
 * Flow: Upload CSV → 1K Blocks → Tracerfy Skip Trace → Filter → Template → Deploy
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import {
  executePipeline,
  DeployMode,
  getClassificationAction,
  detectCaptures,
  extractEmailFromMessage,
} from "@/lib/execution-flow";
import {
  LEAD_SOURCE_FOLDERS,
  SMS_TEMPLATE_GROUPS,
  BATCH_CONFIG,
  getFolderById,
} from "@/config/lead-sources";
import { SIGNALHOUSE_10DLC } from "@/config/constants";
import { Logger } from "@/lib/logger";

const log = new Logger("PipelineAPI");

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Pipeline info and status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get("pipelineId");

  // Return pipeline status if ID provided
  if (pipelineId) {
    // Would fetch from DB in production
    return NextResponse.json({
      success: true,
      pipelineId,
      status: "Would fetch from database",
      note: "Pipeline tracking requires database implementation",
    });
  }

  // Return pipeline documentation
  return NextResponse.json({
    success: true,
    name: "Nextier Pipeline Execution API",
    description: "Full USBizData → Skip Trace → SMS Pipeline",
    flow: [
      "1. Upload CSV (USBizData format)",
      "2. Split into 1K blocks",
      "3. Tracerfy skip trace ($0.02/lead)",
      "4. Filter by contactability (mobile only)",
      "5. Match to SMS template group by sector",
      "6. Deploy SMS (BLAST, SCHEDULE, or IF_THEN mode)",
      "7. Track inbound responses → classify → capture",
    ],
    folders: Object.entries(LEAD_SOURCE_FOLDERS).map(([key, folder]) => ({
      key,
      id: folder.id,
      name: folder.name,
      sector: folder.sector,
      tags: folder.tags,
    })),
    templateGroups: Object.entries(SMS_TEMPLATE_GROUPS).map(([key, group]) => ({
      key,
      id: group.id,
      name: group.name,
      sector: group.sector,
      intent: group.intent,
      templateCount: group.templates.length,
    })),
    deployModes: {
      BLAST: "Immediate send all - for time-sensitive campaigns",
      SCHEDULE: "THE LOOP cadence - Day 1, 3, 5, 7, 10, 14, 21, 28, 30",
      IF_THEN: "Conditional triggers - response-based automation",
    },
    batchConfig: BATCH_CONFIG,
    compliance: {
      campaignId: SIGNALHOUSE_10DLC.campaignId,
      brandId: SIGNALHOUSE_10DLC.brandId,
      optOutText: "Reply STOP to opt out -NEXTIER",
      rateLimit: `${SIGNALHOUSE_10DLC.carrierLimits.att.smsTPM} SMS/min`,
    },
    endpoints: {
      execute: "POST /api/pipeline/execute { file, folderId, sector, deployMode }",
      status: "GET /api/pipeline/execute?pipelineId=xxx",
      inbound: "POST /api/pipeline/inbound { from, message }",
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Execute pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle multipart file upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const folderId = formData.get("folderId") as string;
      const sector = formData.get("sector") as string;
      const deployMode = (formData.get("deployMode") as DeployMode) || "BLAST";
      const dryRun = formData.get("dryRun") === "true";

      if (!file) {
        return NextResponse.json({ error: "file required" }, { status: 400 });
      }

      if (!folderId && !sector) {
        return NextResponse.json(
          { error: "folderId or sector required" },
          { status: 400 }
        );
      }

      // Parse CSV
      const content = await file.text();
      let records: Record<string, string>[];

      try {
        records = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (e) {
        return NextResponse.json(
          { error: "Failed to parse CSV", details: String(e) },
          { status: 400 }
        );
      }

      if (records.length === 0) {
        return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
      }

      // Get folder/sector
      const folder = folderId ? getFolderById(folderId) : null;
      const finalSector = sector || folder?.sector || "b2b";

      log.info("Starting pipeline execution", {
        fileName: file.name,
        recordCount: records.length,
        folderId,
        sector: finalSector,
        deployMode,
        dryRun,
      });

      // Execute pipeline
      const result = await executePipeline(records, {
        folderId: folderId || "manual_upload",
        sector: finalSector,
        deployMode,
        dryRun,
      });

      return NextResponse.json({
        success: true,
        pipelineId: result.pipelineId,
        file: file.name,
        folder: folder ? { id: folder.id, name: folder.name } : null,
        sector: finalSector,
        deployMode,
        dryRun,
        stages: result.stages.map((s) => ({
          name: s.name,
          status: s.status,
          ...s.stats,
        })),
        results: result.results,
        cost: {
          skipTrace: `$${result.results.cost.toFixed(2)}`,
          sms: `$${(result.results.deployed * 0.02).toFixed(2)}`,
          total: `$${(result.results.cost + result.results.deployed * 0.02).toFixed(2)}`,
        },
        nextSteps: [
          "Monitor inbound responses at /api/pipeline/inbound",
          "Track engagement in AI Copilot",
          "HOT leads auto-routed to SABRINA for booking",
        ],
      });
    }

    // Handle JSON request
    const body = await request.json();
    const { action, pipelineId, data, folderId, sector, deployMode, dryRun } = body;

    switch (action) {
      case "execute": {
        if (!data || !Array.isArray(data)) {
          return NextResponse.json(
            { error: "data array required" },
            { status: 400 }
          );
        }

        const result = await executePipeline(data, {
          folderId: folderId || "api_upload",
          sector: sector || "b2b",
          deployMode: deployMode || "BLAST",
          dryRun: dryRun === true,
        });

        return NextResponse.json({
          success: true,
          pipelineId: result.pipelineId,
          stages: result.stages,
          results: result.results,
        });
      }

      case "preview": {
        // Preview without executing
        if (!data || !Array.isArray(data)) {
          return NextResponse.json(
            { error: "data array required" },
            { status: 400 }
          );
        }

        const recordCount = data.length;
        const blocks = Math.ceil(recordCount / BATCH_CONFIG.SKIP_TRACE_BLOCK_SIZE);
        const estimatedMobiles = Math.round(recordCount * 0.6); // ~60% mobile rate
        const traceCost = recordCount * BATCH_CONFIG.COST_PER_TRACE;
        const smsCost = estimatedMobiles * 0.02;

        return NextResponse.json({
          success: true,
          preview: {
            totalRecords: recordCount,
            blocks,
            estimatedMobiles,
            estimatedContactableRate: "60%",
            sector: sector || "b2b",
            deployMode: deployMode || "BLAST",
          },
          estimatedCost: {
            skipTrace: `$${traceCost.toFixed(2)}`,
            sms: `$${smsCost.toFixed(2)}`,
            total: `$${(traceCost + smsCost).toFixed(2)}`,
          },
          warning: recordCount > BATCH_CONFIG.DAILY_TRACE_LIMIT
            ? `Exceeds daily limit of ${BATCH_CONFIG.DAILY_TRACE_LIMIT}. Will process in batches.`
            : undefined,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}`, validActions: ["execute", "preview"] },
          { status: 400 }
        );
    }
  } catch (error) {
    log.error("Pipeline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
