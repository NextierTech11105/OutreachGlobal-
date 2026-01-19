/**
 * LUCI Data Map API Proxy
 * GET /api/luci/datamap
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const res = await fetch(`${API_URL}/luci/datamap`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("LUCI datamap error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get data map" },
      { status: 500 }
    );
  }
}
