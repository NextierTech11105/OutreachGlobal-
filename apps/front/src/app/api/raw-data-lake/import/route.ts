/**
 * Proxy to backend raw-data-lake import endpoint
 * This routes to the NestJS API which has the correct database schema
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value || cookieStore.get("token")?.value;

    // Forward to backend API
    const response = await fetch(`${API_URL}/raw-data-lake/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Import failed", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[raw-data-lake/import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
