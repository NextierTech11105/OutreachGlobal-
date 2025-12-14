/**
 * Datalake List API
 * List contents of DO Spaces bucket to debug data location
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// GET - List bucket contents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix") || "";
  const maxKeys = parseInt(searchParams.get("limit") || "100");

  if (!SPACES_KEY || !SPACES_SECRET) {
    return NextResponse.json(
      {
        error: "DO Spaces credentials not configured",
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: prefix || undefined,
        MaxKeys: maxKeys,
        Delimiter: prefix ? undefined : "/", // Show top-level folders if no prefix
      }),
    );

    // Get folders (CommonPrefixes)
    const folders = (response.CommonPrefixes || []).map((p) => ({
      type: "folder",
      path: p.Prefix,
    }));

    // Get files
    const files = (response.Contents || []).map((obj) => ({
      type: "file",
      path: obj.Key,
      size: obj.Size,
      sizeFormatted: formatBytes(obj.Size || 0),
      lastModified: obj.LastModified,
    }));

    // Calculate totals
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    return NextResponse.json({
      success: true,
      bucket: SPACES_BUCKET,
      prefix: prefix || "(root)",
      folders,
      files,
      summary: {
        folderCount: folders.length,
        fileCount: files.length,
        totalSize: formatBytes(totalSize),
        isTruncated: response.IsTruncated,
      },
      hint: prefix
        ? "Add ?prefix=folder/subfolder/ to drill down"
        : "Top-level folders shown. Add ?prefix=datalake/ to see datalake contents",
    });
  } catch (error) {
    console.error("[Datalake List] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to list bucket",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
