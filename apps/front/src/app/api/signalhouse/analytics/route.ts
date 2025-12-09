import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardAnalytics,
  getOutboundAnalytics,
  getInboundAnalytics,
  getOptOutAnalytics,
  getWalletSummary,
  getUsageSummary,
  getPricing,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - Get analytics and wallet data
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "dashboard";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  try {
    switch (type) {
      case "dashboard": {
        // Get main dashboard analytics
        const [analyticsResult, walletResult] = await Promise.all([
          getDashboardAnalytics(),
          getWalletSummary(),
        ]);

        return NextResponse.json({
          success: true,
          analytics: analyticsResult.data || {
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0,
            deliveryRate: 0,
            failureRate: 0,
            uniqueClicks: 0,
            clickthroughRate: 0,
          },
          wallet: walletResult.data || {
            balance: 0,
            currency: "USD",
          },
        });
      }

      case "outbound": {
        const result = await getOutboundAnalytics({ startDate, endDate });
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status || 400 });
        }
        return NextResponse.json({
          success: true,
          type: "outbound",
          data: result.data,
        });
      }

      case "inbound": {
        const result = await getInboundAnalytics({ startDate, endDate });
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status || 400 });
        }
        return NextResponse.json({
          success: true,
          type: "inbound",
          data: result.data,
        });
      }

      case "optout": {
        const result = await getOptOutAnalytics();
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status || 400 });
        }
        return NextResponse.json({
          success: true,
          type: "optout",
          data: result.data,
        });
      }

      case "wallet": {
        const result = await getWalletSummary();
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status || 400 });
        }
        return NextResponse.json({
          success: true,
          wallet: result.data,
        });
      }

      case "usage": {
        const result = await getUsageSummary({ startDate, endDate });
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status || 400 });
        }
        return NextResponse.json({
          success: true,
          usage: result.data,
        });
      }

      case "pricing": {
        const result = await getPricing();
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: result.status || 400 });
        }
        return NextResponse.json({
          success: true,
          pricing: result.data,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type. Use: dashboard, outbound, inbound, optout, wallet, usage, pricing" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[SignalHouse Analytics] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get analytics" },
      { status: 500 }
    );
  }
}
