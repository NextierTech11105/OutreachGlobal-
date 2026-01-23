import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const SPACES_KEY =
  process.env.SPACES_KEY ||
  process.env.DO_SPACES_KEY ||
  process.env.DIGITALOCEAN_SPACES_KEY ||
  "";
const SPACES_SECRET =
  process.env.SPACES_SECRET ||
  process.env.DO_SPACES_SECRET ||
  process.env.DIGITALOCEAN_SPACES_SECRET ||
  "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";

function getS3Client() {
  if (!SPACES_KEY || !SPACES_SECRET) {
    return null;
  }

  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: SPACES_REGION,
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
    forcePathStyle: true,
  });
}

// Allow GET for easy browser access
export async function GET() {
  return rebuildIndex();
}

export async function POST() {
  return rebuildIndex();
}

async function rebuildIndex() {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces credentials not configured" },
        { status: 500 }
      );
    }

    console.log("[Rebuild Index] Scanning buckets/ folder...");

    // List all bucket JSON files
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "buckets/",
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log("[Rebuild Index] No bucket files found");
      return NextResponse.json({
        success: true,
        message: "No buckets found - index is empty",
        buckets: [],
        totalFiles: 0,
      });
    }

    console.log(
      `[Rebuild Index] Found ${listResponse.Contents.length} files in buckets/`
    );

    // Filter for actual bucket files (not _index.json)
    const bucketFiles = listResponse.Contents.filter(
      (obj) =>
        obj.Key &&
        obj.Key.startsWith("buckets/") &&
        obj.Key.endsWith(".json") &&
        obj.Key !== "buckets/_index.json"
    );

    console.log(
      `[Rebuild Index] Found ${bucketFiles.length} bucket JSON files`
    );

    const buckets = [];

    // Load each bucket file
    for (const file of bucketFiles) {
      try {
        const getResponse = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: file.Key,
          })
        );

        const content = await getResponse.Body?.transformToString();
        if (content) {
          const bucketData = JSON.parse(content);

          // Extract bucket metadata for index
          buckets.push({
            id: bucketData.id,
            name: bucketData.name,
            description: bucketData.description || "",
            source: bucketData.source || "unknown",
            tags: bucketData.tags || [],
            createdAt: bucketData.createdAt || new Date().toISOString(),
            updatedAt: bucketData.updatedAt || new Date().toISOString(),
            totalLeads: bucketData.leads?.length || 0,
            enrichedLeads: bucketData.enrichedLeads || 0,
            enrichmentStatus: bucketData.enrichmentStatus || "not_started",
          });
        }
      } catch (err) {
        console.error(`[Rebuild Index] Error loading ${file.Key}:`, err);
      }
    }

    console.log(`[Rebuild Index] Loaded ${buckets.length} buckets`);

    // Save new index
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: "buckets/_index.json",
        Body: JSON.stringify(
          {
            buckets,
            updatedAt: new Date().toISOString(),
            count: buckets.length,
          },
          null,
          2
        ),
        ContentType: "application/json",
      })
    );

    console.log("[Rebuild Index] Index file saved");

    return NextResponse.json({
      success: true,
      message: "Bucket index rebuilt successfully",
      buckets,
      totalFiles: bucketFiles.length,
      bucketsFound: buckets.length,
    });
  } catch (error: any) {
    console.error("[Rebuild Index] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to rebuild index",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
