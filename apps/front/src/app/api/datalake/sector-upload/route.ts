/**
 * Sector Upload API
 * Upload CSV lists directly to B2B sector folders in the datalake
 */

import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { B2B_SECTORS } from "@/lib/datalake/schemas";

// DO Spaces configuration
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
  forcePathStyle: true,
});

// Build storage path from sector/subsector
function getStoragePath(sector: string, subsector?: string): string {
  const basePath = `datalake/business/ny/sectors/${sector}/`;
  if (subsector) {
    return `${basePath}${subsector}/`;
  }
  return `${basePath}raw/`;
}

// POST - Upload CSV to sector
export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        {
          error: "DigitalOcean Spaces credentials not configured",
        },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sector = formData.get("sector") as string | null;
    const subsector = formData.get("subsector") as string | null;
    const notes = formData.get("notes") as string | null;
    const recordCount = formData.get("recordCount") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!sector) {
      return NextResponse.json(
        {
          error: "sector is required",
          availableSectors: Object.keys(B2B_SECTORS),
        },
        { status: 400 },
      );
    }

    // Validate sector
    const sectorDef = B2B_SECTORS[sector as keyof typeof B2B_SECTORS];
    if (!sectorDef) {
      return NextResponse.json(
        {
          error: `Invalid sector: ${sector}`,
          availableSectors: Object.keys(B2B_SECTORS),
        },
        { status: 400 },
      );
    }

    // Validate subsector if provided
    if (
      subsector &&
      !sectorDef.subsectors[subsector as keyof typeof sectorDef.subsectors]
    ) {
      return NextResponse.json(
        {
          error: `Invalid subsector: ${subsector} for sector: ${sector}`,
          availableSubsectors: Object.keys(sectorDef.subsectors),
        },
        { status: 400 },
      );
    }

    const storagePath = getStoragePath(sector, subsector || undefined);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${storagePath}${timestamp}_${sanitizedName}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Spaces
    await s3Client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "text/csv",
        Metadata: {
          "x-amz-meta-sector": sector,
          "x-amz-meta-subsector": subsector || "",
          "x-amz-meta-original-filename": file.name,
          "x-amz-meta-uploaded-at": new Date().toISOString(),
        },
      }),
    );

    // Save metadata file
    const metadata = {
      sector,
      subsector: subsector || null,
      sectorName: sectorDef.name,
      subsectorName: subsector
        ? ((
            sectorDef.subsectors as Record<
              string,
              { name: string; sicCodes: string[] }
            >
          )[subsector]?.name ?? null)
        : null,
      originalFilename: file.name,
      uploadedAt: new Date().toISOString(),
      fileSize: buffer.length,
      recordCount: recordCount ? parseInt(recordCount) : undefined,
      notes: notes || undefined,
      storagePath,
    };

    await s3Client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${key}.meta.json`,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: "application/json",
      }),
    );

    return NextResponse.json({
      success: true,
      message: `Uploaded ${file.name} to ${sectorDef.name}${subsector ? ` / ${(sectorDef.subsectors as Record<string, { name: string; sicCodes: string[] }>)[subsector]?.name ?? subsector}` : ""}`,
      details: {
        key,
        bucket: SPACES_BUCKET,
        sector: sectorDef.name,
        subsector: subsector
          ? (
              sectorDef.subsectors as Record<
                string,
                { name: string; sicCodes: string[] }
              >
            )[subsector]?.name
          : null,
        storagePath,
        fileSize: buffer.length,
        fileSizeFormatted: formatBytes(buffer.length),
      },
    });
  } catch (error) {
    console.error("[Sector Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

// GET - List available sectors and their contents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector");
  const subsector = searchParams.get("subsector");

  // If sector specified, list files in that sector
  if (sector) {
    const sectorDef = B2B_SECTORS[sector as keyof typeof B2B_SECTORS];
    if (!sectorDef) {
      return NextResponse.json(
        {
          error: `Invalid sector: ${sector}`,
          availableSectors: Object.keys(B2B_SECTORS),
        },
        { status: 400 },
      );
    }

    const storagePath = getStoragePath(sector, subsector || undefined);

    try {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: SPACES_BUCKET,
          Prefix: storagePath,
        }),
      );

      const files = (response.Contents || [])
        .filter((obj) => obj.Key?.endsWith(".csv"))
        .map((obj) => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          sizeFormatted: formatBytes(obj.Size || 0),
        }));

      return NextResponse.json({
        success: true,
        sector: sectorDef.name,
        subsector: subsector
          ? (
              sectorDef.subsectors as Record<
                string,
                { name: string; sicCodes: string[] }
              >
            )[subsector]?.name
          : null,
        storagePath,
        fileCount: files.length,
        files,
        availableSubsectors: Object.entries(sectorDef.subsectors).map(
          ([id, sub]) => ({
            id,
            name: sub.name,
            sicCodes: sub.sicCodes,
          }),
        ),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to list files",
          details: String(error),
        },
        { status: 500 },
      );
    }
  }

  // Otherwise, return all sectors and their structure
  const sectors = Object.entries(B2B_SECTORS).map(([id, sector]) => ({
    id,
    name: sector.name,
    description: sector.description,
    sicPrefix: sector.sicPrefix,
    storagePath: getStoragePath(id),
    subsectors: Object.entries(sector.subsectors).map(([subId, sub]) => ({
      id: subId,
      name: sub.name,
      sicCodes: sub.sicCodes,
      storagePath: getStoragePath(id, subId),
    })),
  }));

  return NextResponse.json({
    success: true,
    message: "Upload CSV files to B2B sector folders",
    endpoint: "POST /api/datalake/sector-upload",
    requiredFields: {
      file: "CSV file (multipart/form-data)",
      sector:
        "Sector ID (e.g., 'restaurants-food', 'construction-contractors')",
    },
    optionalFields: {
      subsector: "Subsector ID (e.g., 'pizzerias', 'plumbers')",
      notes: "Description of this upload",
      recordCount: "Number of records in file",
    },
    totalSectors: sectors.length,
    sectors,
    configured: {
      hasCredentials: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
      endpoint: SPACES_ENDPOINT,
    },
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
