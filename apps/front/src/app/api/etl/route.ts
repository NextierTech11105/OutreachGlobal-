/**
 * ETL API - Unified Graph Processing
 *
 * POST /api/etl - Trigger ETL for a bucket or all buckets
 * GET /api/etl - Get ETL status and graph statistics
 */

import { NextRequest, NextResponse } from "next/server";
import {
  processBucket,
  processAllBuckets,
  getETLStatus,
  getGraphStats,
} from "@/lib/etl";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("bucketId");

    if (bucketId) {
      // Get ETL status for specific bucket
      const status = await getETLStatus(bucketId);
      return NextResponse.json(status);
    }

    // Get overall graph statistics
    const stats = await getGraphStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[ETL API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get ETL status" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucketId, processAll } = body;

    if (processAll) {
      // Process all buckets (use with caution - can be slow)
      const results = await processAllBuckets();
      return NextResponse.json({
        success: true,
        results,
        summary: {
          bucketsProcessed: results.length,
          totalNodes: results.reduce((a, r) => a + r.nodesCreated, 0),
          totalEdges: results.reduce((a, r) => a + r.edgesCreated, 0),
          totalErrors: results.reduce((a, r) => a + r.errors.length, 0),
        },
      });
    }

    if (!bucketId) {
      return NextResponse.json(
        { error: "bucketId is required" },
        { status: 400 },
      );
    }

    // Process single bucket
    const result = await processBucket(bucketId);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[ETL API] Error:", error);
    return NextResponse.json(
      { error: "ETL processing failed" },
      { status: 500 },
    );
  }
}
