/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATA → SMS PIPELINE API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/pipeline/data-to-sms
 *
 * Unified endpoint to process raw CSV data into an SMS-ready campaign.
 *
 * FLOW: CSV Upload → LUCI Structure → Tracerfy → Trestle → Filter → Campaign Ready
 */

import { NextRequest, NextResponse } from "next/server";
import {
  csvToSMSCampaign,
  estimatePipelineCost,
  DataToSMSPipeline,
  PIPELINE_DEFAULTS,
  COSTS,
  type PipelineConfig,
} from "@/lib/pipelines/data-to-sms";
import { apiAuth } from "@/lib/api-auth";

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Process CSV to SMS Campaign
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    // Handle multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const name = (formData.get("name") as string) || "SMS Campaign";
      const configStr = formData.get("config") as string | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      const csvContent = await file.text();
      const config: Partial<PipelineConfig> = configStr
        ? JSON.parse(configStr)
        : {};

      const campaign = await csvToSMSCampaign(csvContent, {
        name,
        sourceFile: file.name,
        config,
      });

      return NextResponse.json({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalLeads: campaign.totalLeads,
          stats: campaign.stats,
          costs: campaign.costs,
          signalHouse: campaign.signalHouse,
        },
        message: `Campaign ready with ${campaign.totalLeads} qualified leads`,
        nextStep: "POST /api/sms/send-campaign to execute",
      });
    }

    // Handle JSON body (for estimation or config)
    const body = await request.json();
    const { action } = body;

    // Estimate costs
    if (action === "estimate") {
      const { recordCount } = body;
      if (!recordCount || typeof recordCount !== "number") {
        return NextResponse.json(
          { error: "recordCount required for estimation" },
          { status: 400 }
        );
      }

      const estimate = estimatePipelineCost(recordCount);

      return NextResponse.json({
        success: true,
        action: "estimate",
        recordCount,
        estimate: {
          ...estimate,
          breakdown: {
            tracerfy: `${recordCount} × $${COSTS.TRACERFY_PER_RECORD} = $${estimate.tracerfy.toFixed(2)}`,
            trestle: `${recordCount} × ${COSTS.AVG_PHONES_PER_RECORD} phones × $${COSTS.TRESTLE_PER_PHONE} = $${estimate.trestle.toFixed(2)}`,
            sms: `~${estimate.estimatedQualified} × $${COSTS.SMS_PER_MESSAGE} = $${estimate.estimatedSMS.toFixed(2)}`,
          },
          qualifyRate: "27-40% expected (33% estimated)",
        },
      });
    }

    // Process inline CSV
    if (action === "process") {
      const { csv, name, config } = body;
      if (!csv) {
        return NextResponse.json(
          { error: "csv content required" },
          { status: 400 }
        );
      }

      const campaign = await csvToSMSCampaign(csv, {
        name: name || "SMS Campaign",
        sourceFile: "inline.csv",
        config: config || {},
      });

      return NextResponse.json({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalLeads: campaign.totalLeads,
          stats: campaign.stats,
          costs: campaign.costs,
          signalHouse: campaign.signalHouse,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: estimate, process (or upload file)" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Pipeline API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Pipeline processing failed" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Pipeline Info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    name: "Data → SMS Pipeline",
    version: "1.0.0",
    description: "Unified pipeline: CSV → LUCI → Tracerfy → Trestle → Filter → SMS Campaign",

    stages: [
      { stage: 1, name: "INGEST", description: "LUCI structures raw CSV into 2K blocks" },
      { stage: 2, name: "ENRICH", description: "Tracerfy skip trace ($0.02/record)" },
      { stage: 3, name: "SCORE", description: "Trestle contactability ($0.03/phone)" },
      { stage: 4, name: "FILTER", description: "Contactability gate (Grade A/B, Activity 70+)" },
      { stage: 5, name: "CAMPAIGN", description: "Qualified leads → SignalHouse SMS queue" },
    ],

    costs: {
      tracerfy: "$0.02/record",
      trestle: "$0.03/phone (avg 3 phones = $0.09/record)",
      totalEnrichment: "~$0.11/record",
      sms: "$0.0075/message (SignalHouse 10DLC)",
    },

    contactabilityGate: {
      minGrade: "B (A or B only)",
      minActivityScore: 70,
      lineType: "Mobile only",
      nameMatch: "Required",
      litigatorBlock: "Yes",
      expectedPassRate: "27-40%",
    },

    defaults: PIPELINE_DEFAULTS,

    endpoints: {
      estimate: "POST { action: 'estimate', recordCount: 10000 }",
      processCSV: "POST { action: 'process', csv: '...', name: 'Campaign Name' }",
      uploadFile: "POST multipart/form-data { file: CSV, name: 'Campaign Name' }",
    },

    signalHouse: {
      campaign: "CJRCU60",
      brand: "BZOYPIH (NEXTIER)",
      phone: "+1 (516) 407-9249",
      tpm: 75,
      tcrStatus: "Active",
      expirationDate: "2026-04-06",
    },
  });
}
