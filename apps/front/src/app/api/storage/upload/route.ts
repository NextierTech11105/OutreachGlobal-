import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { apiAuth } from "@/lib/api-auth";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STORAGE UPLOAD ENDPOINT - File Landing (DO Spaces Only)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generic file storage endpoint. No business logic - just lands files in Spaces.
 * Use this as the first step before calling import endpoints.
 *
 * Flow: Source → POST /api/storage/upload → storagePath → POST /api/{resource}/import
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
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

// Valid folder prefixes (enforces conventions)
const VALID_FOLDERS = {
  // USBizData sector imports
  "sectors/usbizdata": "USBizData B2B sector files",
  "sectors/b2b": "Other B2B sector files",
  "sectors/trucking": "Trucking industry files",
  "sectors/education": "Education sector files",
  // Datalake schemas
  "datalake/ny_residential": "NY residential data",
  "datalake/ny_business": "NY business data",
  "datalake/ny_cell_phone": "NY cell phone data",
  "datalake/ny_optin_email": "NY opt-in email data",
  // Buckets
  buckets: "Analyzed cohort buckets",
  // FDAILY foreclosure
  fdaily: "Foreclosure/Lis Pendens data",
  // LUCI pipeline
  luci: "LUCI enrichment pipeline files",
  // Generic uploads
  uploads: "General file uploads",
} as const;

type FolderPrefix = keyof typeof VALID_FOLDERS;

interface UploadMetadata {
  originalFilename: string;
  uploadedBy: string;
  uploadedAt: string;
  contentType: string;
  size: number;
  tags?: string[];
  source?: string;
}

/**
 * POST /api/storage/upload
 * Upload a file to DO Spaces (storage only, no processing)
 *
 * Body: multipart/form-data
 * - file: The file to upload
 * - folder: Target folder (e.g., "sectors/usbizdata/plumbers-hvac")
 * - filename?: Custom filename (optional, defaults to original)
 * - tags?: Comma-separated tags
 * - source?: Source identifier
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured", required: ["DO_SPACES_KEY", "DO_SPACES_SECRET"] },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string | null;
    const customFilename = formData.get("filename") as string | null;
    const tags = formData.get("tags") as string | null;
    const source = formData.get("source") as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate folder
    if (!folder) {
      return NextResponse.json(
        {
          error: "folder parameter required",
          validPrefixes: Object.entries(VALID_FOLDERS).map(([prefix, desc]) => ({
            prefix,
            description: desc,
          })),
          example: "sectors/usbizdata/plumbers-hvac",
        },
        { status: 400 }
      );
    }

    // Ensure folder starts with valid prefix
    const validPrefix = Object.keys(VALID_FOLDERS).find((prefix) =>
      folder.startsWith(prefix)
    ) as FolderPrefix | undefined;

    if (!validPrefix) {
      return NextResponse.json(
        {
          error: `Invalid folder prefix: ${folder}`,
          validPrefixes: Object.keys(VALID_FOLDERS),
        },
        { status: 400 }
      );
    }

    // Build storage path
    const timestamp = Date.now();
    const originalFilename = file.name;
    const filename = customFilename || `${timestamp}_${originalFilename}`;
    const storagePath = `${folder.replace(/\/$/, "")}/${filename}`;

    // Determine content type
    const contentType = file.type || "application/octet-stream";

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Spaces
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          "original-filename": originalFilename,
          "uploaded-by": userId,
          "team-id": teamId || "",
          source: source || "api",
          tags: tags || "",
        },
      })
    );

    // Create metadata record
    const metadata: UploadMetadata = {
      originalFilename,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      contentType,
      size: buffer.length,
      tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
      source: source || undefined,
    };

    console.log(`[Storage] Uploaded ${storagePath} (${buffer.length} bytes) by ${userId}`);

    return NextResponse.json({
      success: true,
      storagePath,
      bucket: SPACES_BUCKET,
      url: `${SPACES_ENDPOINT}/${SPACES_BUCKET}/${storagePath}`,
      metadata,
      nextSteps: getNextSteps(validPrefix, storagePath),
    });
  } catch (error) {
    console.error("[Storage Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/storage/upload
 * List files in a folder or get documentation
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder");
    const limit = parseInt(searchParams.get("limit") || "100");

    // If no folder, return documentation
    if (!folder) {
      return NextResponse.json({
        endpoint: "POST /api/storage/upload",
        description: "Generic file storage endpoint (DO Spaces). No business logic.",
        flow: "Source → POST /api/storage/upload → storagePath → POST /api/{resource}/import",
        validFolders: Object.entries(VALID_FOLDERS).map(([prefix, desc]) => ({
          prefix,
          description: desc,
          example: `${prefix}/my-file.csv`,
        })),
        parameters: {
          file: "The file to upload (required)",
          folder: "Target folder path (required)",
          filename: "Custom filename (optional)",
          tags: "Comma-separated tags (optional)",
          source: "Source identifier (optional)",
        },
        importEndpoints: {
          "sectors/*": "POST /api/sectors/import with storagePath",
          "datalake/*": "POST /api/datalake/import with storagePath",
          "buckets/*": "POST /api/buckets/import with storagePath",
          "fdaily/*": "POST /api/fdaily/import with storagePath",
          "luci/*": "POST /api/luci/import with storagePath",
        },
      });
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json({ error: "DO Spaces not configured" }, { status: 503 });
    }

    // List objects in folder
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: folder,
        MaxKeys: limit,
      })
    );

    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      folder,
      count: files.length,
      files,
    });
  } catch (error) {
    console.error("[Storage List] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 }
    );
  }
}

/**
 * Get suggested next steps based on folder prefix
 */
function getNextSteps(prefix: FolderPrefix, storagePath: string): string[] {
  const steps: string[] = [];

  if (prefix.startsWith("sectors")) {
    steps.push(`POST /api/sectors/import with { "storagePath": "${storagePath}" }`);
    steps.push("Or use Python script: python scripts/import-usbizdata.py");
  } else if (prefix.startsWith("datalake")) {
    steps.push(`POST /api/datalake/import with { "storagePath": "${storagePath}" }`);
  } else if (prefix === "buckets") {
    steps.push(`POST /api/buckets/import with { "storagePath": "${storagePath}" }`);
  } else if (prefix === "fdaily") {
    steps.push(`POST /api/fdaily/import with { "storagePath": "${storagePath}" }`);
  } else if (prefix === "luci") {
    steps.push(`POST /api/luci/import with { "storagePath": "${storagePath}" }`);
  }

  return steps;
}
