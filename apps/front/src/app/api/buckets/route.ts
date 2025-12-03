import { NextRequest, NextResponse } from "next/server";
import {
  Bucket,
  BucketSource,
  CreateBucketRequest,
  BucketListResponse,
  EnrichmentStatus,
} from "@/lib/types/bucket";

// In-memory storage (replace with database in production)
const bucketsStore = new Map<string, Bucket>();

// Seed with example data
const seedBuckets: Bucket[] = [
  {
    id: "bucket-1",
    name: "NY High Equity Properties",
    description: "Properties in NY with 50%+ equity",
    source: "real-estate",
    filters: { state: "NY", minEquity: 50 },
    tags: ["high-equity", "priority"],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    totalLeads: 156,
    enrichedLeads: 120,
    queuedLeads: 45,
    contactedLeads: 32,
    enrichmentStatus: "completed",
    lastEnrichedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "bucket-2",
    name: "Blue Collar HVAC Owners",
    description: "HVAC company owners $1-10M revenue",
    source: "apollo",
    filters: { industry: "HVAC", minRevenue: 1000000, maxRevenue: 10000000 },
    tags: ["blue-collar", "b2b"],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    totalLeads: 89,
    enrichedLeads: 89,
    queuedLeads: 0,
    contactedLeads: 15,
    enrichmentStatus: "completed",
    lastEnrichedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "bucket-3",
    name: "TX Absentee Owners",
    description: "Absentee owners in Texas",
    source: "real-estate",
    filters: { state: "TX", absenteeOwner: true },
    tags: ["absentee", "motivated"],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    totalLeads: 234,
    enrichedLeads: 50,
    queuedLeads: 184,
    contactedLeads: 0,
    enrichmentStatus: "processing",
    enrichmentProgress: { total: 234, processed: 50, successful: 48, failed: 2 },
    queuedAt: new Date().toISOString(),
  },
];

// Initialize store
seedBuckets.forEach((b) => bucketsStore.set(b.id, b));

// GET /api/buckets - List all buckets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");
    const source = searchParams.get("source") as BucketSource | null;
    const tag = searchParams.get("tag");
    const status = searchParams.get("status") as EnrichmentStatus | null;

    let buckets = Array.from(bucketsStore.values());

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

    bucketsStore.set(id, bucket);

    return NextResponse.json({ success: true, bucket }, { status: 201 });
  } catch (error) {
    console.error("[Buckets API] POST error:", error);
    return NextResponse.json({ error: "Failed to create bucket" }, { status: 500 });
  }
}
