import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * DEBUG: Check DO Spaces configuration and list buckets
 * GET /api/debug/spaces
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

export async function GET() {
  // Check which env vars are set (don't expose actual values)
  const envStatus = {
    SPACES_KEY: !!process.env.SPACES_KEY,
    DO_SPACES_KEY: !!process.env.DO_SPACES_KEY,
    SPACES_SECRET: !!process.env.SPACES_SECRET,
    DO_SPACES_SECRET: !!process.env.DO_SPACES_SECRET,
    SPACES_BUCKET: process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier (default)",
    REALESTATE_API_KEY: !!process.env.REALESTATE_API_KEY,
    REAL_ESTATE_API_KEY: !!process.env.REAL_ESTATE_API_KEY,
    APOLLO_IO_API_KEY: !!process.env.APOLLO_IO_API_KEY,
    APOLLO_API_KEY: !!process.env.APOLLO_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  // Check if we can connect to DO Spaces
  if (!SPACES_KEY || !SPACES_SECRET) {
    return NextResponse.json({
      status: "ERROR",
      message: "DO Spaces not configured - missing SPACES_KEY or SPACES_SECRET",
      envStatus,
      recommendation: "Add SPACES_KEY and SPACES_SECRET to your DO App Platform environment variables",
    });
  }

  try {
    const s3 = new S3Client({
      endpoint: SPACES_ENDPOINT,
      region: "nyc3",
      credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    });

    // List buckets folder contents
    const listCommand = new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: "buckets/",
      Delimiter: "/",
      MaxKeys: 100,
    });

    const result = await s3.send(listCommand);
    const bucketFolders = result.CommonPrefixes?.map(p => p.Prefix) || [];
    const files = result.Contents?.map(c => ({ key: c.Key, size: c.Size })) || [];

    return NextResponse.json({
      status: "OK",
      message: "DO Spaces connected successfully!",
      envStatus,
      spacesConfig: {
        endpoint: SPACES_ENDPOINT,
        bucket: SPACES_BUCKET,
        keyConfigured: true,
      },
      bucketContents: {
        folders: bucketFolders,
        files: files.slice(0, 20),
        totalFolders: bucketFolders.length,
        totalFiles: result.KeyCount || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: "ERROR",
      message: "Failed to connect to DO Spaces",
      error: error instanceof Error ? error.message : "Unknown error",
      envStatus,
      recommendation: "Check that your SPACES_KEY and SPACES_SECRET are correct",
    });
  }
}
