/**
 * B2B Search API
 * Searches USBizData records from DO Spaces buckets
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

interface BucketLead {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  sicCode?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        { error: "DO Spaces credentials not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      state,
      city,
      company,
      sicCode,
      email,
      limit = 50,
      offset = 0,
      bucketId // Optional: search specific bucket
    } = body;

    // If specific bucket requested, search just that one
    if (bucketId) {
      const results = await searchBucket(bucketId, { state, city, company, sicCode, email }, limit);
      return NextResponse.json({
        leads: results,
        total: results.length,
        limit,
        offset: 0,
        source: "bucket",
        bucketId,
      });
    }

    // Otherwise, search across buckets (sample from first few)
    const bucketList = await listBuckets(10); // Get first 10 buckets to sample
    const allResults: BucketLead[] = [];

    for (const bucket of bucketList) {
      if (allResults.length >= limit) break;

      const results = await searchBucket(
        bucket.key,
        { state, city, company, sicCode, email },
        limit - allResults.length
      );
      allResults.push(...results);
    }

    return NextResponse.json({
      leads: allResults.map(lead => ({
        id: lead.id,
        first_name: lead.firstName || "",
        last_name: lead.lastName || "",
        company: lead.company || "",
        email: lead.email || "",
        phone: lead.phone || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "NY",
        zip_code: lead.zipCode || "",
        sic_code: lead.sicCode || "",
        property_id: null,
        metadata: lead,
        created_at: new Date().toISOString(),
      })),
      total: allResults.length,
      limit,
      offset,
      source: "buckets",
      bucketsSearched: bucketList.length,
      hint: "Add bucketId param to search a specific bucket",
    });
  } catch (error) {
    console.error("B2B search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}

// GET - Return available buckets and search options
export async function GET() {
  try {
    const buckets = await listBuckets(20);

    return NextResponse.json({
      success: true,
      message: "B2B Search - Query your USBizData business records",
      endpoint: "POST /api/b2b/search",
      params: {
        state: "Filter by state (e.g., 'NY')",
        city: "Filter by city name",
        company: "Filter by company name",
        sicCode: "Filter by SIC code prefix",
        email: "Filter by email domain",
        limit: "Max results (default: 50)",
        bucketId: "Search specific bucket",
      },
      availableBuckets: buckets.slice(0, 10),
      totalBuckets: buckets.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// List available bucket files
async function listBuckets(maxBuckets: number): Promise<{ key: string; size: number }[]> {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: "buckets/csv-",
      MaxKeys: maxBuckets,
    })
  );

  return (response.Contents || [])
    .filter(obj => obj.Key?.endsWith(".json") && !obj.Key?.includes("_index"))
    .map(obj => ({
      key: obj.Key!.replace("buckets/", "").replace(".json", ""),
      size: obj.Size || 0,
    }));
}

// Search within a specific bucket
async function searchBucket(
  bucketId: string,
  filters: { state?: string; city?: string; company?: string; sicCode?: string; email?: string },
  maxResults: number
): Promise<BucketLead[]> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${bucketId}.json`,
      })
    );

    const content = await response.Body?.transformToString();
    if (!content) return [];

    const data = JSON.parse(content);
    const leads: BucketLead[] = data.leads || data.records || [];

    // Apply filters
    const filtered = leads.filter(lead => {
      if (filters.state && lead.state?.toUpperCase() !== filters.state.toUpperCase()) {
        return false;
      }
      if (filters.city && !lead.city?.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      if (filters.company && !lead.company?.toLowerCase().includes(filters.company.toLowerCase())) {
        return false;
      }
      if (filters.sicCode && !lead.sicCode?.startsWith(filters.sicCode)) {
        return false;
      }
      if (filters.email && !lead.email?.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, maxResults);
  } catch (error) {
    console.warn(`Error reading bucket ${bucketId}:`, error);
    return [];
  }
}
