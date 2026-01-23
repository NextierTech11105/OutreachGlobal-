import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
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
  process.env.SPACES_BUCKET ||
  process.env.DO_SPACES_BUCKET ||
  "nextier";
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

export async function POST(request: NextRequest) {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces credentials not configured" },
        { status: 500 }
      );
    }

    console.log("[Delete Datalake] Listing all objects in datalake/ folder...");

    // List all objects with datalake/ prefix
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "datalake/",
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No datalake files found",
        deleted: 0,
      });
    }

    const totalFiles = listResponse.Contents.length;
    console.log(`[Delete Datalake] Found ${totalFiles} files to delete`);

    // Delete in batches of 1000 (S3 API limit)
    const batchSize = 1000;
    let deletedCount = 0;

    for (let i = 0; i < listResponse.Contents.length; i += batchSize) {
      const batch = listResponse.Contents.slice(i, i + batchSize);

      await client.send(
        new DeleteObjectsCommand({
          Bucket: SPACES_BUCKET,
          Delete: {
            Objects: batch.map((obj) => ({ Key: obj.Key })),
            Quiet: false,
          },
        })
      );

      deletedCount += batch.length;
      console.log(
        `[Delete Datalake] Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} files (${deletedCount}/${totalFiles})`
      );
    }

    // Also delete the buckets/_index.json file to clear the cached bucket list
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: SPACES_BUCKET,
          Delete: {
            Objects: [{ Key: "buckets/_index.json" }],
            Quiet: false,
          },
        })
      );
      console.log("[Delete Datalake] Deleted buckets/_index.json");
    } catch (indexErr) {
      console.log("[Delete Datalake] No _index.json to delete or error:", indexErr);
    }

    return NextResponse.json({
      success: true,
      message: "All NY business data deleted successfully",
      deleted: deletedCount,
      totalFiles,
    });
  } catch (error: any) {
    console.error("[Delete Datalake] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete datalake files",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
