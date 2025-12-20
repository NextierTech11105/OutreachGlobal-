import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    campaigns: [],
    calls: [],
    sequences: [],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, id: "schedule_" + Date.now() });
  } catch {
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 400 });
  }
}
