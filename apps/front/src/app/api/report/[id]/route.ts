import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

// In-memory cache for reports (would be Redis in production)
const reportCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Report ID required" },
        { status: 400 },
      );
    }

    // Check cache first
    const cached = reportCache.get(id);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({
        success: true,
        report: cached.data,
        cached: true,
      });
    }

    // Try to fetch from Spaces
    try {
      const command = new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `research-library/reports/${id}.json`,
      });
      const response = await s3Client.send(command);
      const body = await response.Body?.transformToString();

      if (body) {
        const reportData = JSON.parse(body);

        // Extract full report data for display (no skip trace personal contact info)
        // Support both nested report.property and top-level property formats
        const r = reportData.report || reportData;
        const publicReport = {
          id: reportData.id,
          name: reportData.name,
          savedAt: reportData.savedAt,
          // Full property details (check both locations)
          property: r.property || {},
          valuation: r.valuation || {},
          comparables: r.comparables || [],
          neighborhood: r.neighborhood || {},
          demographics: r.demographics || null,
          aiAnalysis: r.aiAnalysis || null,
          // Include lead name for personalization but not contact info
          leadInfo: r.leadInfo
            ? { name: r.leadInfo.name }
            : null,
          // Include partner offer if present
          partnerOffer: r.partnerOffer || null,
          // Company and agent branding for white-label reports
          companyInfo: r.companyInfo || null,
          agentInfo: r.agentInfo || null,
          // Additional detailed data
          propertyDetails: r.propertyDetails || null,
          marketAnalysis: r.marketAnalysis || null,
          investmentMetrics: r.investmentMetrics || null,
          taxHistory: r.taxHistory || null,
          saleHistory: r.saleHistory || null,
          schools: r.schools || null,
        };

        // Cache it
        reportCache.set(id, {
          data: publicReport,
          expires: Date.now() + CACHE_TTL,
        });

        return NextResponse.json({ success: true, report: publicReport });
      }
    } catch (err) {
      console.log("[Report API] Spaces fetch error:", err);
    }

    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  } catch (error) {
    console.error("[Report API] Error:", error);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 },
    );
  }
}
