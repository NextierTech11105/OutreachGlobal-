/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LUCI IMPORT ENDPOINT - Enrichment Pipeline Entry Point
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Canonical endpoint for starting LUCI enrichment pipeline.
 * Accepts file references from DO Spaces or bucket IDs.
 *
 * POST /api/luci/import
 * {
 *   // Option 1: File path in DO Spaces
 *   "storagePath": "sectors/usbizdata/plumbers-hvac/imports/batch-123.json",
 *   "sectorTag": "plumbing-hvac"
 *
 *   // Option 2: Bucket ID (from /api/buckets/import)
 *   "bucketId": "bucket-123456",
 *   "sectorTag": "plumbing-hvac"
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// DO Spaces config
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
    forcePathStyle: true, // CRITICAL for DO Spaces
  });
}

interface ImportRequest {
  // New canonical names
  storagePath?: string;   // Path in DO Spaces (e.g., "sectors/usbizdata/plumbers-hvac/imports/batch-123.json")
  bucketId?: string;      // Bucket ID (fetches from buckets/{bucketId}.json)

  // Legacy support
  filePath?: string;      // Deprecated alias for storagePath

  // Common options
  sectorTag: string;
  dailyTarget?: 500 | 1000 | 2000;
  traceType?: "normal" | "enhanced";
  columnMapping?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const body: ImportRequest = await req.json();

    // Support both new (storagePath) and legacy (filePath) names, plus bucketId
    const storagePath = body.storagePath || body.filePath || (body.bucketId ? `buckets/${body.bucketId}.json` : null);

    if (!storagePath || !body.sectorTag) {
      return NextResponse.json(
        {
          success: false,
          error: "sectorTag required, plus one of: storagePath, filePath, or bucketId",
          usage: {
            option1: { storagePath: "sectors/usbizdata/plumbers-hvac/imports/batch-123.json", sectorTag: "plumbing" },
            option2: { bucketId: "bucket-123456", sectorTag: "plumbing" },
            option3: { filePath: "imports/file.csv", sectorTag: "plumbing" }, // legacy
          },
        },
        { status: 400 }
      );
    }

    // Use S3 client for proper auth
    const client = getS3Client();
    let fileContent: string;
    let filename: string;

    if (client) {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: storagePath,
          })
        );
        fileContent = (await response.Body?.transformToString()) || "";
        filename = storagePath.split("/").pop() || "import.csv";
      } catch {
        return NextResponse.json(
          { success: false, error: `File not found: ${storagePath}` },
          { status: 404 }
        );
      }
    } else {
      // Fallback to public URL fetch
      const fileUrl = `${SPACES_ENDPOINT}/${SPACES_BUCKET}/${storagePath}`;
      const fileRes = await fetch(fileUrl);

      if (!fileRes.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch file: ${fileRes.status}` },
          { status: 400 }
        );
      }

      fileContent = await fileRes.text();
      filename = storagePath.split("/").pop() || "import.csv";
    }

    // Determine content type based on file extension
    const isJson = storagePath.endsWith(".json");
    const contentType = isJson ? "application/json" : "text/csv";

    // Create form data for API
    const formData = new FormData();
    formData.append("file", new Blob([fileContent], { type: contentType }), filename);
    formData.append("sectorTag", body.sectorTag);
    formData.append("dailyTarget", (body.dailyTarget || 2000).toString());
    if (body.traceType) {
      formData.append("traceType", body.traceType);
    }
    if (body.columnMapping) {
      formData.append("columnMapping", JSON.stringify(body.columnMapping));
    }

    // Forward to LUCI pipeline
    const token = req.headers.get("authorization");
    const pipelineRes = await fetch(`${API_URL}/luci/pipeline/start`, {
      method: "POST",
      headers: token ? { Authorization: token } : {},
      body: formData,
    });

    const result = await pipelineRes.json();

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        source: storagePath,
        bucketId: body.bucketId || null,
      },
    });
  } catch (error) {
    console.error("LUCI import error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/luci/import
 * List available files or get documentation
 *
 * ?path=sectors/usbizdata/ - List files in path
 * (no params) - Show documentation
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  // If no path, return documentation
  if (!path) {
    return NextResponse.json({
      endpoint: "POST /api/luci/import",
      description: "Start LUCI enrichment pipeline from DO Spaces file or bucket",
      inputOptions: {
        storagePath: "Path to file in DO Spaces (e.g., sectors/usbizdata/plumbers-hvac/imports/batch-123.json)",
        bucketId: "Bucket ID from /api/buckets/import (fetches buckets/{bucketId}.json)",
        filePath: "Legacy alias for storagePath (deprecated)",
      },
      commonParams: {
        sectorTag: "Sector tag for categorization (required)",
        dailyTarget: "Records per day: 500, 1000, or 2000 (default: 2000)",
        traceType: "normal or enhanced (default: normal)",
        columnMapping: "Custom column mapping object (optional)",
      },
      flow: [
        "1. Upload file: POST /api/storage/upload → get storagePath",
        "   OR create bucket: POST /api/buckets/import → get bucketId",
        "2. Start pipeline: POST /api/luci/import with storagePath or bucketId",
        "3. Pipeline runs: Tracerfy skip trace → Trestle scoring → DB insert",
      ],
      examples: {
        withStoragePath: {
          storagePath: "sectors/usbizdata/plumbers-hvac/imports/batch-123.json",
          sectorTag: "plumbing-hvac",
          dailyTarget: 1000,
        },
        withBucketId: {
          bucketId: "bucket-1737345678901",
          sectorTag: "realtors",
        },
      },
    });
  }

  // List files in path
  const client = getS3Client();
  if (!client) {
    return NextResponse.json({ success: false, error: "DO Spaces not configured" }, { status: 503 });
  }

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: path,
        MaxKeys: 100,
      })
    );

    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      name: obj.Key?.split("/").pop(),
      size: obj.Size,
      modified: obj.LastModified?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      path,
      count: files.length,
      files,
    });
  } catch (error) {
    console.error("LUCI import list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list files" },
      { status: 500 }
    );
  }
}
