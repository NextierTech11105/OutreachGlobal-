/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LUCI ACTIVATE - Pull Scan Results into Enrichment Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Takes scan results and activates them:
 * 1. Pulls records from scan
 * 2. Creates leads in database
 * 3. Queues for enrichment (Tracerfy, Trestle, or both)
 *
 * POST /api/luci/activate
 * {
 *   "scanId": "scan_123456",
 *   "enrich": "skipTrace" | "phoneValidate" | "realContact" | "full",
 *   "dailyTarget": 500 | 1000 | 2000,
 *   "campaignId": "optional-campaign-id"
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });
}

// Enrichment options and pricing (your cost)
const ENRICHMENT_OPTIONS = {
  skipTrace: {
    name: "Skip Trace",
    provider: "Tracerfy",
    cost: 0.02,
    description: "Find mobile phones & emails",
    provides: ["mobile1-5", "email1-5"],
  },
  phoneValidate: {
    name: "Phone Validate",
    provider: "Trestle",
    cost: 0.015,
    description: "Basic phone quality score",
    provides: ["phoneActivityScore"],
  },
  realContact: {
    name: "Real Contact API",
    provider: "Trestle",
    cost: 0.03,
    description: "Deep dive: name, phones, emails, social profiles",
    provides: ["phoneContactGrade", "phoneActivityScore", "validatedName", "socialProfiles"],
  },
  full: {
    name: "Full Enrichment",
    provider: "Tracerfy + Trestle",
    cost: 0.05,
    description: "Skip trace + Real Contact validation",
    provides: ["mobile1-5", "email1-5", "phoneContactGrade", "phoneActivityScore"],
  },
} as const;

type EnrichmentType = keyof typeof ENRICHMENT_OPTIONS;

interface ActivateRequest {
  scanId: string;
  enrich: EnrichmentType;
  dailyTarget?: 500 | 1000 | 2000;
  campaignId?: string;
  teamId?: string;
}

/**
 * POST /api/luci/activate
 * Activate scan results for enrichment
 */
export async function POST(req: NextRequest) {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const body: ActivateRequest = await req.json();
    const { scanId, enrich, campaignId } = body;
    const dailyTarget = body.dailyTarget || 500;
    const teamId = body.teamId || req.headers.get("x-team-id") || "tm_nextiertech";

    // Validate enrichment type
    if (!enrich || !ENRICHMENT_OPTIONS[enrich]) {
      return NextResponse.json(
        {
          error: `Invalid enrichment type: ${enrich}`,
          availableOptions: Object.entries(ENRICHMENT_OPTIONS).map(([id, opt]) => ({
            id,
            name: opt.name,
            cost: `$${opt.cost}/lead`,
            description: opt.description,
          })),
        },
        { status: 400 }
      );
    }

    if (!scanId) {
      return NextResponse.json(
        { error: "scanId is required" },
        { status: 400 }
      );
    }

    // Get scan results
    let scan: any;
    try {
      const scanRes = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `scans/${scanId}.json`,
        })
      );
      const content = await scanRes.Body?.transformToString();
      scan = content ? JSON.parse(content) : null;
    } catch {
      return NextResponse.json(
        { error: `Scan ${scanId} not found` },
        { status: 404 }
      );
    }

    if (!scan || !scan.records || scan.records.length === 0) {
      return NextResponse.json(
        { error: `Scan ${scanId} has no records` },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(scan.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: `Scan ${scanId} has expired`, expiredAt: scan.expiresAt },
        { status: 410 }
      );
    }

    const enrichOption = ENRICHMENT_OPTIONS[enrich];
    const records = scan.records;
    const recordCount = records.length;
    const estimatedCost = Math.round(recordCount * enrichOption.cost * 100) / 100;

    // Create activation job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const job = {
      jobId,
      scanId,
      teamId,
      campaignId: campaignId || null,
      enrichment: {
        type: enrich,
        name: enrichOption.name,
        provider: enrichOption.provider,
        costPerLead: enrichOption.cost,
      },
      records: {
        total: recordCount,
        processed: 0,
        enriched: 0,
        failed: 0,
      },
      cost: {
        estimated: estimatedCost,
        actual: 0,
      },
      dailyTarget,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      sector: scan.sector,
      filters: scan.filters,
    };

    // Save job
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `jobs/${jobId}.json`,
        Body: JSON.stringify(
          {
            ...job,
            records: records, // Include records for processing
          },
          null,
          2
        ),
        ContentType: "application/json",
      })
    );

    // Queue job for processing (call backend)
    try {
      const pipelineRes = await fetch(`${API_URL}/luci/enrich/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-team-id": teamId,
        },
        body: JSON.stringify({
          jobId,
          enrichType: enrich,
          recordCount,
          dailyTarget,
        }),
      });

      if (pipelineRes.ok) {
        job.status = "processing";
      }
    } catch (err) {
      console.error("[Activate] Failed to queue job:", err);
      // Job is saved, can be retried
    }

    return NextResponse.json({
      success: true,
      jobId,
      activation: {
        scanId,
        sector: scan.sector,
        filters: scan.filters,
        recordCount,
      },
      enrichment: {
        type: enrich,
        name: enrichOption.name,
        provider: enrichOption.provider,
        costPerLead: `$${enrichOption.cost}`,
        provides: enrichOption.provides,
      },
      cost: {
        estimated: `$${estimatedCost.toFixed(2)}`,
        breakdown: `${recordCount} leads × $${enrichOption.cost} = $${estimatedCost.toFixed(2)}`,
      },
      dailyTarget,
      status: job.status,
      message: `Activated ${recordCount} leads for ${enrichOption.name}. Estimated cost: $${estimatedCost.toFixed(2)}`,
      checkStatus: `GET /api/luci/activate?jobId=${jobId}`,
    });
  } catch (error) {
    console.error("[Activate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/luci/activate
 * Get job status or documentation
 *
 * ?jobId=job_123456 - Get specific job status
 * (no params) - Show documentation
 */
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    // Return documentation
    return NextResponse.json({
      endpoint: "POST /api/luci/activate",
      description: "Activate scan results for enrichment pipeline",
      parameters: {
        scanId: "Required - Scan ID from /api/luci/scan",
        enrich: "Required - Enrichment type",
        dailyTarget: "Optional - Records per day (500, 1000, 2000)",
        campaignId: "Optional - Assign to campaign",
      },
      enrichmentOptions: Object.entries(ENRICHMENT_OPTIONS).map(([id, opt]) => ({
        id,
        name: opt.name,
        provider: opt.provider,
        cost: `$${opt.cost}/lead`,
        description: opt.description,
        provides: opt.provides,
      })),
      workflow: [
        "1. POST /api/luci/scan → Find records in datalake",
        "2. Review scan results (matches, cost estimate)",
        "3. POST /api/luci/activate → Start enrichment",
        "4. GET /api/luci/activate?jobId=xxx → Monitor progress",
        "5. Records appear in Lead Lab when ready",
      ],
      example: {
        scanId: "scan_1737345678901_abc123def",
        enrich: "full",
        dailyTarget: 500,
      },
    });
  }

  // Get job status
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const jobRes = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `jobs/${jobId}.json`,
      })
    );

    const content = await jobRes.Body?.transformToString();
    if (!content) {
      return NextResponse.json(
        { error: `Job ${jobId} not found` },
        { status: 404 }
      );
    }

    const job = JSON.parse(content);

    // Calculate progress
    const progress = job.records.total > 0
      ? Math.round((job.records.processed / job.records.total) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      jobId,
      status: job.status,
      progress: `${progress}%`,
      sector: job.sector,
      filters: job.filters,
      enrichment: job.enrichment,
      records: {
        total: job.records.total,
        processed: job.records.processed,
        enriched: job.records.enriched,
        failed: job.records.failed,
        remaining: job.records.total - job.records.processed,
      },
      cost: {
        estimated: `$${job.cost.estimated.toFixed(2)}`,
        actual: `$${job.cost.actual.toFixed(2)}`,
      },
      dailyTarget: job.dailyTarget,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: `Job ${jobId} not found` },
      { status: 404 }
    );
  }
}
