import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getAdminDashboard } from "@/lib/signalhouse/admin-service";

// GET - Admin dashboard data (all SignalHouse resources)
export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const dashboard = await getAdminDashboard();

    return NextResponse.json({
      success: true,
      ...dashboard,
    });
  } catch (error) {
    console.error("[Admin Dashboard] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data",
      },
      { status: 500 },
    );
  }
}
