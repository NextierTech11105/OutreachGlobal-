import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import {
  getWalletSummary,
  getUsageSummary,
  getPricing,
  getDashboardAnalytics,
  getOutboundAnalytics,
  getInboundAnalytics,
  getOptOutAnalytics,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - Get billing/usage data from SignalHouse
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
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Wallet summary (balance, auto-recharge settings)
    if (action === "wallet") {
      const result = await getWalletSummary();
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, wallet: result.data });
    }

    // Usage summary (detailed spend breakdown)
    if (action === "usage") {
      const result = await getUsageSummary({ startDate, endDate });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, usage: result.data });
    }

    // Pricing info
    if (action === "pricing") {
      const result = await getPricing();
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, pricing: result.data });
    }

    // Analytics - outbound messages
    if (action === "outbound") {
      const result = await getOutboundAnalytics({ startDate, endDate });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, outbound: result.data });
    }

    // Analytics - inbound messages
    if (action === "inbound") {
      const result = await getInboundAnalytics({ startDate, endDate });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, inbound: result.data });
    }

    // Analytics - opt-outs
    if (action === "optouts") {
      const result = await getOptOutAnalytics();
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, optouts: result.data });
    }

    // Default: Full dashboard summary
    const [walletResult, analyticsResult, outboundResult, inboundResult] =
      await Promise.all([
        getWalletSummary(),
        getDashboardAnalytics(),
        getOutboundAnalytics({ startDate, endDate }),
        getInboundAnalytics({ startDate, endDate }),
      ]);

    return NextResponse.json({
      success: true,
      summary: {
        wallet: walletResult.success ? walletResult.data : null,
        analytics: analyticsResult.success ? analyticsResult.data : null,
        outbound: outboundResult.success ? outboundResult.data : null,
        inbound: inboundResult.success ? inboundResult.data : null,
      },
    });
  } catch (error) {
    console.error("[Admin Billing] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get billing data",
      },
      { status: 500 },
    );
  }
}
