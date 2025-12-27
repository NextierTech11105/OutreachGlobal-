import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, businesses, properties, contacts } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/api-auth";

const MAINTENANCE_KEY = process.env.MAINTENANCE_KEY || "owner-recovery-2025";

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
