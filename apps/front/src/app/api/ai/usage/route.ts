/**
 * AI Usage API - View and manage AI usage per tenant
 *
 * GET /api/ai/usage - Get usage summary
 * GET /api/ai/usage?period=day - Get daily usage
 * GET /api/ai/usage/limits - Get usage limits
 * POST /api/ai/usage/limits - Set usage limits
 */

import { NextRequest, NextResponse } from "next/server";
import { getUsageSummary, checkUsageLimits, setUsageLimits } from "@/lib/ai/usage-tracker";
import { apiAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { userId, teamId: authTeamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = authTeamId || userId;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") === "day" ? "day" : "month";
    const checkLimits = searchParams.get("check") === "true";

    // Get usage summary
    const summary = await getUsageSummary(teamId, period);

    // Optionally check limits
    let limits = null;
    if (checkLimits) {
      limits = await checkUsageLimits(teamId);
    }

    return NextResponse.json({
      success: true,
      usage: summary,
      limits,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get AI usage:", error);
    return NextResponse.json(
      { error: "Failed to get AI usage" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, teamId: authTeamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = authTeamId || userId;
    const body = await req.json();

    // Validate input
    const {
      monthlyTokenLimit,
      monthlyRequestLimit,
      monthlyCostLimitUsd,
      dailyTokenLimit,
      dailyRequestLimit,
      alertThresholdPercent,
      isEnabled,
    } = body;

    await setUsageLimits(teamId, {
      monthlyTokenLimit,
      monthlyRequestLimit,
      monthlyCostLimitUsd,
      dailyTokenLimit,
      dailyRequestLimit,
      alertThresholdPercent,
      isEnabled,
    });

    return NextResponse.json({
      success: true,
      message: "Usage limits updated",
    });
  } catch (error) {
    console.error("Failed to update AI usage limits:", error);
    return NextResponse.json(
      { error: "Failed to update AI usage limits" },
      { status: 500 }
    );
  }
}
