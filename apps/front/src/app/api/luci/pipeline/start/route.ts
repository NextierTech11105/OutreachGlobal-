/**
 * LUCI Pipeline Start API Proxy
 * POST /api/luci/pipeline/start
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const formData = await req.formData();

    const res = await fetch(`${API_URL}/luci/pipeline/start`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("LUCI pipeline start error:", error);
    return NextResponse.json(
      { success: false, error: "Pipeline start failed" },
      { status: 500 }
    );
  }
}
