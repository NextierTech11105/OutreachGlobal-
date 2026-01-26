import { NextRequest, NextResponse } from "next/server";
import {
  Bucket,
  BucketSource,
  CreateBucketRequest,
  BucketListResponse,
  EnrichmentStatus,
} from "@/lib/types/bucket";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// DO Spaces configuration - check multiple env var names for compatibility
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET ||
  process.env.DO_SPACES_BUCKET ||
  process.env.DIGITALOCEAN_SPACES_BUCKET ||
  process.env.BUCKET_NAME ||
  "nextier";
const SPACES_KEY =
  process.env.SPACES_KEY ||
  process.env.DO_SPACES_KEY ||
  process.env.DIGITALOCEAN_SPACES_KEY ||
  process.env.AWS_ACCESS_KEY_ID ||
  process.env.S3_ACCESS_KEY ||
  "";
const SPACES_SECRET =
  process.env.SPACES_SECRET ||
  process.env.DO_SPACES_SECRET ||
  process.env.DIGITALOCEAN_SPACES_SECRET ||
  process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.S3_SECRET_KEY ||
  "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Buckets API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });
}

// Bucket index for fast listing (cached in memory)
let bucketIndexCache: { buckets: Bucket[]; lastUpdated: number } | null = null;
const CACHE_TTL = 60000; // 1 minute cache

// Get bucket index from DO Spaces (or create if missing)
async function getBucketIndex(): Promise<Bucket[]> {
  const client = getS3Client();
  if (!client) return [];

  // Check memory cache first
  if (
    bucketIndexCache &&
    Date.now() - bucketIndexCache.lastUpdated < CACHE_TTL
  ) {
    return bucketIndexCache.buckets;
  }

  try {
    // Try to read the index file first (fast path)
    try {
      const indexResponse = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: "buckets/_index.json",
        }),
      );
      const indexContents = await indexResponse.Body?.transformToString();
      if (indexContents) {
        const index = JSON.parse(indexContents);
        bucketIndexCache = {
          buckets: index.buckets || [],
          lastUpdated: Date.now(),
        };
        return bucketIndexCache.buckets;
      }
    } catch {
      // Index doesn't exist, build it
      console.log("[Buckets API] Building bucket index...");
    }

    // Fallback: List all buckets and build index (slow, but only once)
    const buckets = await listBucketsFromS3(client);

    // Save index for future fast loads
    await saveBucketIndex(client, buckets);

    bucketIndexCache = { buckets, lastUpdated: Date.now() };
    return buckets;
  } catch (error) {
    console.error("[Buckets API] Index error:", error);
    return [];
  }
}

// Save bucket index to S3
async function saveBucketIndex(
  client: S3Client,
  buckets: Bucket[],
): Promise<void> {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: "buckets/_index.json",
        Body: JSON.stringify(
          {
            buckets: buckets.map((b) => ({
              id: b.id,
              name: b.name,
              description: b.description,
              source: b.source,
              tags: b.tags,
              createdAt: b.createdAt,
              updatedAt: b.updatedAt,
              totalLeads: b.totalLeads,
              enrichedLeads: b.enrichedLeads,
              enrichmentStatus: b.enrichmentStatus,
            })),
            updatedAt: new Date().toISOString(),
            count: buckets.length,
          },
          null,
          2,
        ),
        ContentType: "application/json",
      }),
    );
    console.log(`[Buckets API] Index saved with ${buckets.length} buckets`);
  } catch (error) {
    console.error("[Buckets API] Failed to save index:", error);
  }
}

// Update index when a new bucket is added
async function addToIndex(bucket: Bucket): Promise<void> {
  const client = getS3Client();
  if (!client) return;

  // Invalidate cache
  bucketIndexCache = null;

  // Get current index and add new bucket
  const buckets = await getBucketIndex();
  const existing = buckets.findIndex((b) => b.id === bucket.id);
  if (existing >= 0) {
    buckets[existing] = bucket;
  } else {
    buckets.unshift(bucket); // Add to front (newest first)
  }

  await saveBucketIndex(client, buckets);
}

// List all buckets from DO Spaces (slow - fetches each file)
async function listBucketsFromS3(client: S3Client): Promise<Bucket[]> {
  const buckets: Bucket[] = [];
  let continuationToken: string | undefined;
  let totalProcessed = 0;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "buckets/",
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    // Process in parallel batches of 50
    const objects = (response.Contents || []).filter(
      (obj) => obj.Key?.endsWith(".json") && !obj.Key.includes("_index"),
    );

    const batchSize = 50;
    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (obj) => {
          try {
            const getResponse = await client.send(
              new GetObjectCommand({
                Bucket: SPACES_BUCKET,
                Key: obj.Key!,
              }),
            );

            const bodyContents = await getResponse.Body?.transformToString();
            if (!bodyContents) return null;

            const data = JSON.parse(bodyContents);

            if (data.metadata) {
              return {
                id:
                  data.metadata.id ||
                  obj.Key!.replace("buckets/", "").replace(".json", ""),
                name: data.metadata.name || "Unnamed Bucket",
                description: data.metadata.description || "",
                source: "real-estate" as const,
                filters: data.metadata.searchParams || {},
                tags: data.metadata.tags || [],
                createdAt: data.metadata.createdAt || new Date().toISOString(),
                updatedAt: data.metadata.updatedAt || new Date().toISOString(),
                totalLeads:
                  data.properties?.length ||
                  data.records?.length ||
                  data.metadata.savedCount ||
                  0,
                enrichedLeads: 0,
                queuedLeads: 0,
                contactedLeads: 0,
                enrichmentStatus: "pending" as const,
              } as Bucket;
            } else if (data.id) {
              return data as Bucket;
            }
            return null;
          } catch {
            return null;
          }
        }),
      );

      buckets.push(...batchResults.filter((b): b is Bucket => b !== null));
      totalProcessed += batch.length;
      console.log(`[Buckets API] Processed ${totalProcessed} bucket files...`);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return buckets;
}

// Legacy function name for compatibility
async function listBuckets(): Promise<Bucket[]> {
  return getBucketIndex();
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

    // If no buckets from DO Spaces, create virtual buckets from database leads
    if (buckets.length === 0) {
      try {
        // Import dynamically to avoid circular deps
        const { db } = await import("@/lib/db");
        const { leads } = await import("@/lib/db/schema");
        const { sql, count, isNotNull } = await import("drizzle-orm");

        if (db) {
          // Get lead stats from database
          const [totalResult] = await db.select({ count: count() }).from(leads);
          const [withPhoneResult] = await db
            .select({ count: count() })
            .from(leads)
            .where(sql`${leads.phone} IS NOT NULL AND ${leads.phone} != ''`);

          const totalLeads = Number(totalResult?.count || 0);
          const enrichedLeads = Number(withPhoneResult?.count || 0);

          if (totalLeads > 0) {
            // Create a virtual bucket representing all database leads
            const virtualBucket: Bucket = {
              id: "db-leads",
              name: "Database Leads",
              description: "All leads imported directly to database",
              source: "csv",
              filters: {},
              tags: ["database", "imported"],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              totalLeads,
              enrichedLeads,
              queuedLeads: 0,
              contactedLeads: 0,
              enrichmentStatus: enrichedLeads > 0 ? "completed" : "pending",
            };
            buckets.push(virtualBucket);
            console.log(`[Buckets API] Added virtual bucket with ${totalLeads} database leads`);
          }
        }
      } catch (dbError) {
        console.error("[Buckets API] Database fallback failed:", dbError);
      }
    }

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
    buckets.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

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
    return NextResponse.json(
      { error: "Failed to fetch buckets" },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: "Source is required" },
        { status: 400 },
      );
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
      console.warn(
        "[Buckets API] Could not save to DO Spaces, bucket created in-memory only",
      );
    }

    return NextResponse.json({ success: true, bucket }, { status: 201 });
  } catch (error) {
    console.error("[Buckets API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create bucket" },
      { status: 500 },
    );
  }
}
