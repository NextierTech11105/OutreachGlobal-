/**
 * Lead Lab API Proxy
 * GET /api/luci/leadlab - Get leads sorted by priority
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    // Forward query params
    const url = new URL(req.url);
    const params = url.searchParams.toString();

    const res = await fetch(`${API_URL}/luci/leadlab${params ? `?${params}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Lead Lab fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
