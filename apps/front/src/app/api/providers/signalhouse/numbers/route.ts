import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    numbers: [],
    total: 0,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, number: null });
  } catch {
    return NextResponse.json({ error: "Failed to provision number" }, { status: 400 });
  }
}
