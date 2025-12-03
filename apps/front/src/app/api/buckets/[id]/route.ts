import { NextRequest, NextResponse } from "next/server";
import { Bucket, UpdateBucketRequest } from "@/lib/types/bucket";

// Shared store reference (in production, use database)
// For now, we'll use a simple fetch from the main buckets endpoint
async function getBucket(id: string): Promise<Bucket | null> {
  // In production, fetch from database
  // For demo, return mock data based on ID
  const mockBuckets: Record<string, Bucket> = {
    "bucket-1": {
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
    "bucket-2": {
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
    "bucket-3": {
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
  };

  return mockBuckets[id] || null;
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

    // In production, save to database
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

    // In production, delete from database
    return NextResponse.json({ success: true, message: "Bucket deleted" });
  } catch (error) {
    console.error("[Bucket API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete bucket" }, { status: 500 });
  }
}
