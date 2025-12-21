import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * ECBB SECTOR MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Upload and manage USBizData CSV files by sector:
 *   - Real Estate Agents
 *   - Plumbing Companies
 *   - HVAC Companies
 *   - Bagels & Bakeries
 *   - RV Parks
 *
 * Each sector gets its own folder in DO Spaces for organization.
 *
 * FOLDER STRUCTURE:
 *   datalake/business/us/sectors/
 *     ├── real-estate-agents/
 *     ├── plumbing/
 *     ├── hvac/
 *     ├── bakeries/
 *     └── rv-parks/
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// DO Spaces config
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: "nyc3",
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ECBB SECTOR DEFINITIONS - USBizData Target Sectors
// These are ECBB-specific sectors for business acquisition targeting
// Different from config/sectors.ts which is for general sector workspaces
// ═══════════════════════════════════════════════════════════════════════════════

export const ECBB_TARGET_SECTORS = {
  "real-estate-agents": {
    id: "real-estate-agents",
    name: "Real Estate Agents",
    sicCodes: ["6531", "6519"],
    folder: "datalake/business/us/sectors/real-estate-agents",
    description: "Real estate agents, brokers, and property managers",
    openerTemplate: "real_estate",
    icon: "🏠",
  },
  plumbing: {
    id: "plumbing",
    name: "Plumbing Companies",
    sicCodes: ["1711"],
    folder: "datalake/business/us/sectors/plumbing",
    description: "Plumbing contractors and services",
    openerTemplate: "hvac_plumber",
    icon: "🔧",
  },
  hvac: {
    id: "hvac",
    name: "HVAC Companies",
    sicCodes: ["1711", "5075"],
    folder: "datalake/business/us/sectors/hvac",
    description: "Heating, ventilation, and air conditioning",
    openerTemplate: "hvac_plumber",
    icon: "❄️",
  },
  bakeries: {
    id: "bakeries",
    name: "Bagels & Bakeries",
    sicCodes: ["5461", "2051", "2052"],
    folder: "datalake/business/us/sectors/bakeries",
    description: "Bakeries, bagel shops, and bread producers",
    openerTemplate: "food_service",
    icon: "🥯",
  },
  "rv-parks": {
    id: "rv-parks",
    name: "RV Parks & Campgrounds",
    sicCodes: ["7033", "7011"],
    folder: "datalake/business/us/sectors/rv-parks",
    description: "RV parks, campgrounds, and recreational facilities",
    openerTemplate: "hospitality",
    icon: "🚐",
  },
} as const;

export type EcbbEcbbSectorId = keyof typeof ECBB_TARGET_SECTORS;

// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function parseCSVContent(content: string): {
  headers: string[];
  records: Record<string, string>[];
  recordCount: number;
} {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 1) {
    return { headers: [], records: [], recordCount: 0 };
  }

  // Parse headers - normalize to snake_case
  const headers = lines[0].split(",").map((h) =>
    h
      .trim()
      .replace(/^"|"$/g, "")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, ""),
  );

  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
    });
    records.push(record);
  }

  return { headers, records, recordCount: records.length };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST: Upload CSV to Sector
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const EcbbSectorId = formData.get("sector") as EcbbSectorId | null;
    const teamId = (formData.get("teamId") as string) || "default";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!EcbbSectorId || !ECBB_TARGET_SECTORS[EcbbSectorId]) {
      return NextResponse.json(
        {
          error: "Invalid sector",
          validSectors: Object.keys(ECBB_TARGET_SECTORS),
        },
        { status: 400 },
      );
    }

    const sector = ECBB_TARGET_SECTORS[EcbbSectorId];

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${sector.folder}/${timestamp}_${safeName}`;

    // Read and parse CSV content
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");
    const { headers, records, recordCount } = parseCSVContent(content);

    // Validate CSV has required columns
    const requiredColumns = [
      "company",
      "company_name",
      "contact_name",
      "first_name",
    ];
    const hasRequiredColumns = requiredColumns.some((col) =>
      headers.some((h) => h.includes(col.replace("_", ""))),
    );

    if (!hasRequiredColumns && recordCount > 0) {
      console.warn(
        `[ECBB Sectors] CSV may be missing key columns. Found: ${headers.join(", ")}`,
      );
    }

    // Upload to DO Spaces
    const command = new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "text/csv",
      ACL: "private",
      Metadata: {
        "original-name": file.name,
        "uploaded-at": new Date().toISOString(),
        sector: EcbbSectorId,
        "team-id": teamId,
        "record-count": String(recordCount),
      },
    });

    await s3Client.send(command);

    console.log(
      `[ECBB Sectors] Uploaded ${recordCount} records to ${sector.name}`,
    );

    // Return preview of first 5 records
    const preview = records.slice(0, 5);

    return NextResponse.json({
      success: true,
      upload: {
        key,
        sector: {
          id: EcbbSectorId,
          name: sector.name,
          icon: sector.icon,
        },
        file: {
          name: file.name,
          size: file.size,
        },
        csv: {
          headers,
          recordCount,
          preview,
        },
      },
      nextSteps: {
        message: `${recordCount} records uploaded to ${sector.name}. Ready for pipeline processing.`,
        pipelineUrl: `/api/ecbb/batch`,
        pipelinePayload: {
          EcbbSectorId,
          sectorPath: sector.folder,
          batchSize: 250,
          maxRecords: 2000,
          teamId,
        },
      },
    });
  } catch (error: any) {
    console.error("[ECBB Sectors] Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET: List Sectors & Files
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const EcbbSectorId = searchParams.get("sector") as EcbbSectorId | null;
  const action = searchParams.get("action");

  // List all available sectors
  if (action === "list" || !EcbbSectorId) {
    const sectors = Object.entries(ECBB_TARGET_SECTORS).map(([id, sector]) => ({
      id,
      name: sector.name,
      icon: sector.icon,
      description: sector.description,
      folder: sector.folder,
      sicCodes: sector.sicCodes,
    }));

    return NextResponse.json({
      success: true,
      sectors,
      usage: {
        upload: {
          method: "POST",
          contentType: "multipart/form-data",
          fields: {
            file: "CSV file from USBizData",
            sector: "One of: " + Object.keys(ECBB_TARGET_SECTORS).join(", "),
            teamId: "Your team ID (optional)",
          },
        },
      },
    });
  }

  // Get files for specific sector
  if (EcbbSectorId && ECBB_TARGET_SECTORS[EcbbSectorId]) {
    const sector = ECBB_TARGET_SECTORS[EcbbSectorId];

    try {
      const command = new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: sector.folder + "/",
      });

      const response = await s3Client.send(command);
      const files = (response.Contents || [])
        .filter((item) => item.Key?.endsWith(".csv"))
        .map((item) => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          recordCount: null, // Would need to parse to get this
        }));

      return NextResponse.json({
        success: true,
        sector: {
          id: EcbbSectorId,
          name: sector.name,
          icon: sector.icon,
          folder: sector.folder,
        },
        files,
        fileCount: files.length,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: "Failed to list sector files", details: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid sector", validSectors: Object.keys(ECBB_TARGET_SECTORS) },
    { status: 400 },
  );
}
