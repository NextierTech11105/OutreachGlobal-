import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { getUsageSummary } from "@/lib/signalhouse/admin-service";
import {
  getWalletSummary,
  getUsageSummary as getDetailedUsage,
  getPricing,
  getDashboardAnalytics,
  getOutboundAnalytics,
  getInboundAnalytics,
  getOptOutAnalytics,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - Usage and billing information
export async function GET(request: NextRequest) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "summary";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Detailed usage breakdown
    if (action === "detailed") {
      const result = await getDetailedUsage({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        usage: result.data,
      });
    }

    // Pricing information
    if (action === "pricing") {
      const result = await getPricing();

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        pricing: result.data,
      });
    }

    // Analytics breakdown
    if (action === "analytics") {
      const [outbound, inbound, optout, dashboard] = await Promise.all([
        getOutboundAnalytics({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        getInboundAnalytics({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        getOptOutAnalytics(),
        getDashboardAnalytics(),
      ]);

      return NextResponse.json({
        success: true,
        analytics: {
          outbound: outbound.success ? outbound.data : null,
          inbound: inbound.success ? inbound.data : null,
          optout: optout.success ? optout.data : null,
          dashboard: dashboard.success ? dashboard.data : null,
        },
      });
    }

    // Default: summary overview
    const [summary, wallet] = await Promise.all([
      getUsageSummary(),
      getWalletSummary(),
    ]);

    return NextResponse.json({
      success: true,
      summary,
      wallet: wallet.success ? wallet.data : null,
    });
  } catch (error) {
    console.error("[Admin Usage] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get usage data",
      },
      { status: 500 },
    );
  }
}
