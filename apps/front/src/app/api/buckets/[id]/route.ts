import { NextRequest, NextResponse } from "next/server";
import { Bucket, UpdateBucketRequest } from "@/lib/types/bucket";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Bucket API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Load bucket from DO Spaces
async function getBucket(id: string): Promise<Bucket | null> {
  const client = getS3Client();
  if (!client) return null;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${id}.json`,
      })
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) return null;

    return JSON.parse(bodyContents);
  } catch (error: unknown) {
    // If file doesn't exist, return null
    const err = error as { name?: string };
    if (err.name === "NoSuchKey") return null;
    console.error("[Bucket API] Get error:", error);
    return null;
  }
}

// Save bucket to DO Spaces
async function saveBucket(bucket: Bucket): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${bucket.id}.json`,
        Body: JSON.stringify(bucket, null, 2),
        ContentType: "application/json",
      })
    );
    return true;
  } catch (error) {
    console.error("[Bucket API] Save error:", error);
    return false;
  }
}

// Delete bucket from DO Spaces
async function deleteBucketFile(id: string): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${id}.json`,
      })
    );
    return true;
  } catch (error) {
    console.error("[Bucket API] Delete error:", error);
    return false;
  }
}

// GET /api/buckets/:id - Get bucket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bucket = await getBucket(id);

    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    return NextResponse.json({ bucket });
  } catch (error) {
    console.error("[Bucket API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch bucket" }, { status: 500 });
  }
}

// PUT /api/buckets/:id - Update bucket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateBucketRequest = await request.json();
    const bucket = await getBucket(id);

    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Update fields
    const updated: Bucket = {
      ...bucket,
      name: body.name || bucket.name,
      description: body.description !== undefined ? body.description : bucket.description,
      tags: body.tags || bucket.tags,
      filters: body.filters || bucket.filters,
      updatedAt: new Date().toISOString(),
    };

    // Save to DO Spaces
    await saveBucket(updated);
    return NextResponse.json({ success: true, bucket: updated });
  } catch (error) {
    console.error("[Bucket API] PUT error:", error);
    return NextResponse.json({ error: "Failed to update bucket" }, { status: 500 });
  }
}

// DELETE /api/buckets/:id - Delete bucket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bucket = await getBucket(id);

    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Delete from DO Spaces
    const deleted = await deleteBucketFile(id);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete bucket from storage" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Bucket deleted" });
  } catch (error) {
    console.error("[Bucket API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete bucket" }, { status: 500 });
  }
}
