/**
 * SignalHouse Reports API
 *
 * Pulls reports and analytics directly from SignalHouse.
 * No local storage - SignalHouse absorbs all message logs.
 *
 * Available reports:
 * - Dashboard analytics (delivery rates, opt-outs, response rates)
 * - Outbound analytics (sent, delivered, failed by period)
 * - Inbound analytics (received, responded by period)
 * - Message logs (with filtering)
 * - Opt-out stats
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/api-auth";
import { signalHouseService } from "@/lib/services/signalhouse-service";

interface ReportRequest {
  reportType:
    | "dashboard"
    | "outbound"
    | "inbound"
    | "messages"
    | "optouts"
    | "conversation"
    | "usage";
  startDate?: string;
  endDate?: string;
  groupBy?: "hour" | "day" | "week" | "month";
  // For message logs
  phoneNumber?: string;
  direction?: "inbound" | "outbound";
  status?: string;
  limit?: number;
  offset?: number;
  // For conversation
  fromNumber?: string;
  toNumber?: string;
}

/**
 * POST - Get reports from SignalHouse
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // P0: Require tenant context for proper auth
    await requireTenantContext();

    // Check if SignalHouse is configured
    if (!signalHouseService.isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 },
      );
    }

    const body: ReportRequest = await request.json();
    const { reportType, startDate, endDate, groupBy } = body;

    let data: unknown;

    switch (reportType) {
      case "dashboard":
        // Get main dashboard analytics
        data = await signalHouseService.getDashboardAnalytics({
          startDate,
          endDate,
        });
        break;

      case "outbound":
        // Get outbound analytics (sent, delivered, failed)
        data = await signalHouseService.getOutboundAnalytics({
          startDate,
          endDate,
          groupBy: groupBy || "day",
        });
        break;

      case "inbound":
        // Get inbound analytics (received, responded)
        data = await signalHouseService.getInboundAnalytics({
          startDate,
          endDate,
          groupBy: groupBy || "day",
        });
        break;

      case "messages":
        // Get message logs with filtering
        data = await signalHouseService.getMessageLogs({
          from: body.phoneNumber,
          to: body.phoneNumber,
          startDate,
          endDate,
          status: body.status,
          direction: body.direction,
          limit: body.limit || 100,
          offset: body.offset || 0,
        });
        break;

      case "optouts":
        // Get opt-out statistics
        data = await signalHouseService.getOptOutStats({
          startDate,
          endDate,
        });
        break;

      case "conversation":
        // Get conversation between two numbers
        if (!body.fromNumber || !body.toNumber) {
          return NextResponse.json(
            {
              error: "fromNumber and toNumber required for conversation report",
            },
            { status: 400 },
          );
        }
        data = await signalHouseService.getConversation(
          body.fromNumber,
          body.toNumber,
        );
        break;

      case "usage":
        // Get usage summary
        data = await signalHouseService.getUsageSummary({
          startDate,
          endDate,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown report type: ${reportType}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      reportType,
      period: { startDate, endDate },
      data,
      source: "signalhouse.io",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SignalHouse Reports] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch report",
      },
      { status: 500 },
    );
  }
}

/**
 * GET - Get quick dashboard overview
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // P0: Require tenant context for proper auth
    await requireTenantContext();

    if (!signalHouseService.isConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          message:
            "SignalHouse not configured. Set SIGNALHOUSE_API_KEY in environment.",
        },
        { status: 200 },
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Get dashboard overview
    const [dashboard, usage, wallet] = await Promise.all([
      signalHouseService.getDashboardAnalytics({ startDate, endDate }),
      signalHouseService.getUsageSummary({ startDate, endDate }),
      signalHouseService.getWalletSummary(),
    ]);

    return NextResponse.json({
      configured: true,
      source: "signalhouse.io",
      dashboard: {
        totalSent: dashboard.totalSent,
        totalDelivered: dashboard.totalDelivered,
        totalFailed: dashboard.totalFailed,
        deliveryRate: dashboard.deliveryRate,
        optOutCount: dashboard.optOutCount,
        responseRate: dashboard.responseRate,
        costTotal: dashboard.costTotal,
        period: {
          start: dashboard.periodStart,
          end: dashboard.periodEnd,
        },
      },
      usage: {
        smsSent: usage.smsSent,
        smsReceived: usage.smsReceived,
        mmsSent: usage.mmsSent,
        mmsReceived: usage.mmsReceived,
        totalCost: usage.totalCost,
      },
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        autoRechargeEnabled: wallet.autoRechargeEnabled,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SignalHouse Reports] GET Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch dashboard",
      },
      { status: 500 },
    );
  }
}
