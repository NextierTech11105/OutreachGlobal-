import { NextRequest, NextResponse } from "next/server";
import { Bucket, UpdateBucketRequest } from "@/lib/types/bucket";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// DO Spaces configuration - check multiple env var names for compatibility
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Bucket API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true,
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
      }),
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
      }),
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
      }),
    );
    return true;
  } catch (error) {
    console.error("[Bucket API] Delete error:", error);
    return false;
  }
}

// GET /api/buckets/:id - Get bucket details with paginated records
// Query params:
//   page: page number (default 1)
//   limit: records per page (default 100, max 500)
//   search: search query (searches company, contact, email, phone, city)
//   all: if "true", returns all records (use with caution for large datasets)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const client = getS3Client();
    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      2000,
      Math.max(1, parseInt(searchParams.get("limit") || "100")),
    ); // Max 2000 per batch
    const search = searchParams.get("search")?.toLowerCase() || "";
    const returnAll = searchParams.get("all") === "true";
    const shuffle = searchParams.get("shuffle") === "true";

    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    // Get full bucket data including properties
    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${id}.json`,
      }),
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    const data = JSON.parse(bodyContents);

    // Get records array
    let records = data.records || data.properties || [];
    const totalRecords = records.length;

    // Apply search filter if provided
    if (search) {
      records = records.filter((r: Record<string, unknown>) => {
        const matchingKeys = (r.matchingKeys || {}) as Record<string, unknown>;
        const original = (r._original || {}) as Record<string, unknown>;

        // Search in normalized fields
        const companyName = String(
          matchingKeys.companyName || original["Company Name"] || "",
        ).toLowerCase();
        const contactName = String(
          matchingKeys.contactName || original["Contact Name"] || "",
        ).toLowerCase();
        const firstName = String(
          matchingKeys.firstName || original["Contact First"] || "",
        ).toLowerCase();
        const lastName = String(
          matchingKeys.lastName || original["Contact Last"] || "",
        ).toLowerCase();
        const email = String(
          matchingKeys.email || original["Email"] || "",
        ).toLowerCase();
        const phone = String(
          matchingKeys.phone || original["Phone"] || "",
        ).toLowerCase();
        const city = String(
          matchingKeys.city || original["City"] || "",
        ).toLowerCase();
        const state = String(
          matchingKeys.state || original["State"] || "",
        ).toLowerCase();
        const industry = String(
          original["Industry"] || original["SIC Description"] || "",
        ).toLowerCase();

        return (
          companyName.includes(search) ||
          contactName.includes(search) ||
          firstName.includes(search) ||
          lastName.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          city.includes(search) ||
          state.includes(search) ||
          industry.includes(search)
        );
      });
    }

    const filteredTotal = records.length;

    // Shuffle records if requested (Fisher-Yates shuffle)
    if (shuffle) {
      for (let i = records.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [records[i], records[j]] = [records[j], records[i]];
      }
    }

    // Apply pagination unless returning all
    let paginatedRecords = records;
    if (!returnAll) {
      const startIndex = (page - 1) * limit;
      paginatedRecords = records.slice(startIndex, startIndex + limit);
    }

    // Return paginated response with metadata
    return NextResponse.json({
      ...data,
      records: paginatedRecords,
      pagination: {
        page,
        limit,
        totalRecords,
        filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
        hasMore: page * limit < filteredTotal,
        search: search || null,
      },
    });
  } catch (error) {
    console.error("[Bucket API] GET error:", error);
    return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
  }
}

// PUT /api/buckets/:id - Update bucket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      description:
        body.description !== undefined ? body.description : bucket.description,
      tags: body.tags || bucket.tags,
      filters: body.filters || bucket.filters,
      updatedAt: new Date().toISOString(),
    };

    // Save to DO Spaces
    await saveBucket(updated);
    return NextResponse.json({ success: true, bucket: updated });
  } catch (error) {
    console.error("[Bucket API] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update bucket" },
      { status: 500 },
    );
  }
}

// DELETE /api/buckets/:id - Delete bucket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      return NextResponse.json(
        { error: "Failed to delete bucket from storage" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "Bucket deleted" });
  } catch (error) {
    console.error("[Bucket API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete bucket" },
      { status: 500 },
    );
  }
}
