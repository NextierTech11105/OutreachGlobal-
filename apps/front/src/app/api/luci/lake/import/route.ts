/**
 * LUCI Lake Import API Proxy
 * POST /api/luci/lake/import
 * Accepts file upload OR file path from DO Spaces
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    const contentType = req.headers.get("content-type") || "";

    let res: Response;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      res = await fetch(`${API_URL}/luci/lake/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    } else {
      // JSON with file path
      const body = await req.json();
      res = await fetch(`${API_URL}/luci/lake/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("LUCI lake import error:", error);
    return NextResponse.json(
      { success: false, error: "Lake import failed" },
      { status: 500 }
    );
  }
}
