/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LUCI SCANNER - Radar Sweep for Datalake Records
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Scan the datalake for records matching criteria.
 * Like a radar sweep - finds what you need from millions of records.
 *
 * POST /api/luci/scan
 * {
 *   "sector": "plumbers_hvac",
 *   "state": "TX",           // optional
 *   "city": "Houston",       // optional
 *   "limit": 500,            // default: 500, max: 2000
 *   "hasEmail": true,        // optional - only records with email
 *   "hasPhone": true         // optional - only records with phone
 * }
 *
 * Returns:
 * {
 *   "scanId": "scan_123456",
 *   "matches": 523,
 *   "preview": [...first 10 records...],
 *   "cost": { "skipTrace": 10.46, "phoneValidate": 15.69, "total": 26.15 }
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";

const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Pricing (your cost)
const PRICING = {
  skipTrace: 0.02,       // Tracerfy - finds mobiles/emails, TRIGGERS LEAD ID
  phoneValidate: 0.015,  // Trestle basic - phone quality score
  realContact: 0.03,     // Trestle premium - deep dive (name, social, etc.)
  full: 0.05,            // Skip trace + Real Contact
};

// Limits
const CAMPAIGN_BLOCK_SIZE = 10000;  // Max per activation (1 campaign block)
const MAX_SCAN_LIMIT = 10000;       // Max records per scan
const DAILY_TARGETS = [500, 1000, 2000]; // Records processed per day
const DEFAULT_LIMIT = 1000;

// USBizData Sectors
const SECTORS = {
  plumbers_hvac: { name: "Plumbing & HVAC", sicCodes: ["1711"] },
  business_consultants: { name: "Business Consultants", sicCodes: ["8742", "8748"] },
  realtors: { name: "Realtors", sicCodes: ["6531"] },
  hotels_motels: { name: "Hotels & Motels", sicCodes: ["7011"] },
  restaurants: { name: "Restaurants", sicCodes: ["5812"] },
  trucking: { name: "Trucking", sicCodes: ["4212", "4213"] },
} as const;

type SectorId = keyof typeof SECTORS;

interface ScanRequest {
  sector: SectorId;
  state?: string;
  city?: string;
  limit?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

interface ScanResult {
  scanId: string;
  sector: string;
  filters: {
    state?: string;
    city?: string;
    hasEmail?: boolean;
    hasPhone?: boolean;
  };
  matches: number;
  limited: boolean;
  preview: Record<string, unknown>[];
  cost: {
    skipTrace: number;
    phoneValidate: number;
    combined: number;
    perLead: typeof PRICING;
  };
  expiresAt: string;
}

/**
 * POST /api/luci/scan
 * Scan datalake for matching records
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

    const body: ScanRequest = await req.json();
    const { sector, state, city, hasEmail, hasPhone } = body;
    const limit = Math.min(body.limit || DEFAULT_LIMIT, MAX_SCAN_LIMIT);

    // Validate sector
    if (!sector || !SECTORS[sector]) {
      return NextResponse.json(
        {
          error: `Invalid sector: ${sector}`,
          availableSectors: Object.keys(SECTORS),
        },
        { status: 400 }
      );
    }

    // Get manifest
    const basePath = `datalake/usbizdata/${sector}`;
    let manifest: any;

    try {
      const manifestRes = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${basePath}/manifest.json`,
        })
      );
      const content = await manifestRes.Body?.transformToString();
      manifest = content ? JSON.parse(content) : null;
    } catch {
      return NextResponse.json(
        {
          error: `Sector ${sector} has no data uploaded`,
          help: "Upload data first with POST /api/luci/datalake",
        },
        { status: 404 }
      );
    }

    if (!manifest || manifest.totalBlocks === 0) {
      return NextResponse.json(
        { error: `Sector ${sector} is empty` },
        { status: 404 }
      );
    }

    // Get header columns
    let headers: string[] = manifest.columns || [];
    if (headers.length === 0) {
      try {
        const headerRes = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${basePath}/header.csv`,
          })
        );
        const headerContent = await headerRes.Body?.transformToString();
        if (headerContent) {
          const parsed = parse(headerContent, { columns: false });
          headers = parsed[0] || [];
        }
      } catch {
        // Use default headers
        headers = ["Company Name", "Address", "City", "State", "Zip", "Phone", "Email"];
      }
    }

    // Find column indices
    const stateCol = headers.find((h) =>
      ["state", "State", "STATE"].includes(h)
    );
    const cityCol = headers.find((h) =>
      ["city", "City", "CITY"].includes(h)
    );
    const phoneCol = headers.find((h) =>
      ["phone", "Phone", "PHONE", "Phone Number"].includes(h)
    );
    const emailCol = headers.find((h) =>
      ["email", "Email", "EMAIL", "Email Address"].includes(h)
    );

    // Scan blocks for matches
    const matches: Record<string, unknown>[] = [];
    let totalScanned = 0;
    let totalMatches = 0;

    // Sort blocks to scan
    const blocksToScan = [...manifest.blocks].sort((a: any, b: any) =>
      a.name.localeCompare(b.name)
    );

    for (const block of blocksToScan) {
      if (matches.length >= limit) break;

      try {
        const blockRes = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${basePath}/blocks/${block.name}`,
          })
        );
        const blockContent = await blockRes.Body?.transformToString();
        if (!blockContent) continue;

        const records = parse(blockContent, {
          columns: headers,
          skip_empty_lines: true,
          relax_column_count: true,
        });

        totalScanned += records.length;

        for (const record of records) {
          // Apply filters
          if (state && stateCol) {
            const recordState = String(record[stateCol] || "").toUpperCase().trim();
            if (recordState !== state.toUpperCase()) continue;
          }

          if (city && cityCol) {
            const recordCity = String(record[cityCol] || "").toLowerCase().trim();
            if (!recordCity.includes(city.toLowerCase())) continue;
          }

          if (hasEmail && emailCol) {
            const recordEmail = String(record[emailCol] || "").trim();
            if (!recordEmail || !recordEmail.includes("@")) continue;
          }

          if (hasPhone && phoneCol) {
            const recordPhone = String(record[phoneCol] || "").replace(/\D/g, "");
            if (!recordPhone || recordPhone.length < 10) continue;
          }

          totalMatches++;

          if (matches.length < limit) {
            // Normalize record
            matches.push({
              company: record["Company Name"] || record["company"] || null,
              contactFirst: record["Contact First"] || record["first_name"] || null,
              contactLast: record["Contact Last"] || record["last_name"] || null,
              address: record["Address"] || record["address"] || null,
              city: record["City"] || record["city"] || null,
              state: record["State"] || record["state"] || null,
              zip: record["Zip"] || record["zip"] || null,
              phone: record["Phone"] || record["phone"] || null,
              email: record["Email"] || record["email"] || null,
              website: record["Website"] || record["website"] || null,
              sicCode: record["SIC Code"] || record["sic_code"] || null,
              industry: record["Industry"] || record["sic_description"] || null,
              _block: block.name,
            });
          }
        }
      } catch (err) {
        console.error(`[Scan] Error reading block ${block.name}:`, err);
      }
    }

    // Generate scan ID and save results
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const scanResult: ScanResult = {
      scanId,
      sector,
      filters: {
        state: state?.toUpperCase(),
        city,
        hasEmail,
        hasPhone,
      },
      matches: matches.length,
      limited: totalMatches > limit,
      preview: matches.slice(0, 10),
      cost: {
        skipTrace: Math.round(matches.length * PRICING.skipTrace * 100) / 100,
        phoneValidate: Math.round(matches.length * PRICING.phoneValidate * 100) / 100,
        combined: Math.round(matches.length * PRICING.combined * 100) / 100,
        perLead: PRICING,
      },
      expiresAt,
    };

    // Save full scan results
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `scans/${scanId}.json`,
        Body: JSON.stringify(
          {
            ...scanResult,
            records: matches, // Full records for activation
            createdAt: new Date().toISOString(),
          },
          null,
          2
        ),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({
      success: true,
      ...scanResult,
      message:
        totalMatches > limit
          ? `Found ${totalMatches.toLocaleString()} matches, returning first ${limit}`
          : `Found ${matches.length.toLocaleString()} matches`,
      nextSteps: {
        activate: `POST /api/luci/activate with { scanId: "${scanId}", enrich: "skipTrace" | "phoneValidate" | "both" }`,
        getScan: `GET /api/luci/scan?id=${scanId}`,
      },
    });
  } catch (error) {
    console.error("[Scan] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/luci/scan
 * Get scan results or documentation
 *
 * ?id=scan_123456 - Get specific scan
 * (no params) - Show documentation
 */
export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get("id");

  if (!scanId) {
    // Return documentation
    return NextResponse.json({
      endpoint: "POST /api/luci/scan",
      description: "Scan datalake for records matching your criteria",
      parameters: {
        sector: "Required - Sector to scan (plumbers_hvac, business_consultants, realtors, etc.)",
        state: "Optional - 2-letter state code (TX, NY, CA, etc.)",
        city: "Optional - City name (partial match)",
        limit: `Optional - Max records (default: ${DEFAULT_LIMIT}, max: ${MAX_SCAN_LIMIT} per campaign block)`,
        hasEmail: "Optional - Only records with valid email",
        hasPhone: "Optional - Only records with phone number",
      },
      pricing: {
        skipTrace: `$${PRICING.skipTrace}/lead - Find mobile phones & emails via Tracerfy`,
        phoneValidate: `$${PRICING.phoneValidate}/lead - Score phone quality via Trestle`,
        combined: `$${PRICING.combined}/lead - Full enrichment (both)`,
      },
      campaignBlockSize: CAMPAIGN_BLOCK_SIZE,
      dailyTargets: DAILY_TARGETS,
      availableSectors: Object.entries(SECTORS).map(([id, s]) => ({
        id,
        name: s.name,
        sicCodes: s.sicCodes,
      })),
      examples: {
        texasPlumbers: {
          sector: "plumbers_hvac",
          state: "TX",
          limit: 500,
        },
        nyRealtorsWithEmail: {
          sector: "realtors",
          state: "NY",
          hasEmail: true,
          limit: 1000,
        },
        houstonConsultants: {
          sector: "business_consultants",
          state: "TX",
          city: "Houston",
          limit: 200,
        },
      },
    });
  }

  // Get specific scan
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const scanRes = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `scans/${scanId}.json`,
      })
    );

    const content = await scanRes.Body?.transformToString();
    if (!content) {
      return NextResponse.json(
        { error: `Scan ${scanId} not found` },
        { status: 404 }
      );
    }

    const scan = JSON.parse(content);

    // Check expiration
    if (new Date(scan.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: `Scan ${scanId} has expired`, expiredAt: scan.expiresAt },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      ...scan,
      records: undefined, // Don't return full records in GET
      recordCount: scan.records?.length || 0,
    });
  } catch {
    return NextResponse.json(
      { error: `Scan ${scanId} not found` },
      { status: 404 }
    );
  }
}
