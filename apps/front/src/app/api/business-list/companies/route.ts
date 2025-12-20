import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    companies: [],
    total: 0,
    page: 1,
    pageSize: 50,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, imported: 0 });
  } catch {
    return NextResponse.json({ error: "Failed to import companies" }, { status: 400 });
  }
}
