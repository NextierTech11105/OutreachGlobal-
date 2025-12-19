import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, businesses, properties, contacts } from "@/lib/db/schema";

const MAINTENANCE_KEY = process.env.MAINTENANCE_KEY || "owner-recovery-2025";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key !== MAINTENANCE_KEY) {
      return NextResponse.json(
        { error: "Unauthorized maintenance request" },
        { status: 401 },
      );
    }

    await db.delete(leads);
    await db.delete(businesses);
    await db.delete(properties);
    await db.delete(contacts);

    return NextResponse.json({
      success: true,
      message: "All data cleared",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
