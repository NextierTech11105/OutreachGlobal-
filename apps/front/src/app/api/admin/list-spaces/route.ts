import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
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

// GET - List all files in DO Spaces
export async function GET(request: NextRequest) {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces credentials not configured" },
        { status: 500 }
      );
    }

    const prefix = request.nextUrl.searchParams.get("prefix") || "";

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: prefix,
        MaxKeys: 100,
      })
    );

    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

    return NextResponse.json({
      success: true,
      bucket: SPACES_BUCKET,
      prefix,
      files,
      count: files.length,
      isTruncated: response.IsTruncated,
    });
  } catch (error: any) {
    console.error("[List Spaces] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to list spaces",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
