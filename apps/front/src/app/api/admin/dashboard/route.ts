import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import {
  getAdminDashboard,
  getUsageSummary,
} from "@/lib/signalhouse/admin-service";

// GET - Admin dashboard data (all SignalHouse resources)
export async function GET() {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
