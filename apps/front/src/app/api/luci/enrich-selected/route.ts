/**
 * Lead Lab Enrichment API Proxy
 * POST /api/luci/enrich-selected - Start enrichment for selected leads
 * GET /api/luci/enrich-selected?jobId=xxx - Poll job status
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * POST - Start enrichment job for selected leads
 * Body: { leadIds: string[], mode?: "full" | "score_only" }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { leadIds, mode = "full" } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "leadIds array is required" },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_URL}/luci/enrich/selected`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ leadIds, mode }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[LUCI] Enrich selected error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start enrichment" },
      { status: 500 },
    );
  }
}

/**
 * GET - Poll enrichment job status
 * Query: ?jobId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "jobId query param is required" },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_URL}/luci/enrich/job/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[LUCI] Job status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get job status" },
      { status: 500 },
    );
  }
}
