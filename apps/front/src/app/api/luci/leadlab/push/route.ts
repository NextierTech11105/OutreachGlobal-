/**
 * Lead Lab Push to Campaign API Proxy
 * POST /api/luci/leadlab/push
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const body = await req.json();

    const res = await fetch(`${API_URL}/luci/leadlab/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Lead Lab push error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to push leads" },
      { status: 500 }
    );
  }
}
