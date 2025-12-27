import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, businesses, properties, contacts } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/api-auth";

// SECURITY: No fallback - maintenance key MUST be set in environment
const MAINTENANCE_KEY = process.env.MAINTENANCE_KEY;

if (!MAINTENANCE_KEY) {
  console.warn(
    "[Clear Data] MAINTENANCE_KEY not configured - endpoint disabled",
  );
}

export async function POST(request: NextRequest) {
  try {
    // Require both super admin AND maintenance key for this dangerous operation
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    // SECURITY: Reject if maintenance key not configured
    if (!MAINTENANCE_KEY) {
      return NextResponse.json(
        { error: "Maintenance endpoint disabled - key not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key !== MAINTENANCE_KEY) {
      return NextResponse.json(
        { error: "Unauthorized maintenance request - invalid key" },
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
