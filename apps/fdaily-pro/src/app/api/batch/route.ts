import { NextRequest, NextResponse } from "next/server";
import { batches } from "@/lib/batches-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({
      batches: Array.from(batches.keys()),
    });
  }

  const batch = batches.get(name);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  return NextResponse.json(batch);
}
