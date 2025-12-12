import { NextRequest, NextResponse } from "next/server";
import { realEstateApi } from "@/lib/services/real-estate-api";

// GET - Get property detail by ID
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Property ID required" },
      { status: 400 },
    );
  }

  try {
    const data = await realEstateApi.getPropertyDetail(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Property detail error:", error);
    return NextResponse.json(
      { error: "Failed to get property detail", details: String(error) },
      { status: 500 },
    );
  }
}

// POST - Get multiple property details (batch)
export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "Property IDs array required" },
        { status: 400 },
      );
    }

    const data = await realEstateApi.getPropertyDetailsBatch(ids);
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("Property details batch error:", error);
    return NextResponse.json(
      { error: "Failed to get property details", details: String(error) },
      { status: 500 },
    );
  }
}
