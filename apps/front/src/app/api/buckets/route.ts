import { NextRequest, NextResponse } from "next/server";
import {
  Bucket,
  BucketSource,
  CreateBucketRequest,
  BucketListResponse,
  EnrichmentStatus,
} from "@/lib/types/bucket";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Buckets API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// List all buckets from DO Spaces
async function listBuckets(): Promise<Bucket[]> {
  const client = getS3Client();
  if (!client) return [];

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "buckets/",
      })
    );

    const buckets: Bucket[] = [];

    for (const obj of response.Contents || []) {
      if (!obj.Key?.endsWith(".json")) continue;

      try {
        const getResponse = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: obj.Key,
          })
        );

        const bodyContents = await getResponse.Body?.transformToString();
        if (!bodyContents) continue;

        const data = JSON.parse(bodyContents);

        // Convert saved search format to Bucket format if needed
        if (data.metadata) {
          const bucket: Bucket = {
            id: data.metadata.id || obj.Key.replace("buckets/", "").replace(".json", ""),
            name: data.metadata.name || "Unnamed Bucket",
            description: data.metadata.description || "",
            source: "real-estate",
            filters: data.metadata.searchParams || {},
            tags: data.metadata.tags || [],
            createdAt: data.metadata.createdAt || new Date().toISOString(),
            updatedAt: data.metadata.updatedAt || new Date().toISOString(),
            totalLeads: data.properties?.length || data.metadata.savedCount || 0,
            enrichedLeads: data.properties?.filter((p: Record<string, unknown>) => p.phone || p.email).length || 0,
            queuedLeads: 0,
            contactedLeads: 0,
            enrichmentStatus: "pending",
          };
          buckets.push(bucket);
        } else if (data.id) {
          // Already in bucket format
          buckets.push(data as Bucket);
        }
      } catch {
        // Skip invalid files
        continue;
      }
    }

    return buckets;
  } catch (error) {
    console.error("[Buckets API] List error:", error);
    return [];
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
    console.error("[Buckets API] Save error:", error);
    return false;
  }
}

// GET /api/buckets - List all buckets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");
    const source = searchParams.get("source") as BucketSource | null;
    const tag = searchParams.get("tag");
    const status = searchParams.get("status") as EnrichmentStatus | null;

    // Load real buckets from DO Spaces
    let buckets = await listBuckets();

    // Filter by source
    if (source) {
      buckets = buckets.filter((b) => b.source === source);
    }

    // Filter by tag
    if (tag) {
      buckets = buckets.filter((b) => b.tags.includes(tag));
    }

    // Filter by enrichment status
    if (status) {
      buckets = buckets.filter((b) => b.enrichmentStatus === status);
    }

    // Sort by updated date (newest first)
    buckets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Paginate
    const total = buckets.length;
    const start = (page - 1) * perPage;
    const paginatedBuckets = buckets.slice(start, start + perPage);

    const response: BucketListResponse = {
      buckets: paginatedBuckets,
      total,
      page,
      perPage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Buckets API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch buckets" }, { status: 500 });
  }
}

// POST /api/buckets - Create a new bucket
export async function POST(request: NextRequest) {
  try {
    const body: CreateBucketRequest = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!body.source) {
      return NextResponse.json({ error: "Source is required" }, { status: 400 });
    }

    const id = `bucket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const bucket: Bucket = {
      id,
      name: body.name,
      description: body.description,
      source: body.source,
      filters: body.filters || {},
      tags: body.tags || [],
      createdAt: now,
      updatedAt: now,
      totalLeads: body.leadIds?.length || 0,
      enrichedLeads: 0,
      queuedLeads: 0,
      contactedLeads: 0,
      enrichmentStatus: "pending",
    };

    // Save to DO Spaces
    const saved = await saveBucket(bucket);
    if (!saved) {
      console.warn("[Buckets API] Could not save to DO Spaces, bucket created in-memory only");
    }

    return NextResponse.json({ success: true, bucket }, { status: 201 });
  } catch (error) {
    console.error("[Buckets API] POST error:", error);
    return NextResponse.json({ error: "Failed to create bucket" }, { status: 500 });
  }
}
