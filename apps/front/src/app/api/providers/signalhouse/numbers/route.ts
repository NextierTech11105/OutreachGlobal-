import { NextRequest, NextResponse } from "next/server";
import {
  getMyPhoneNumbers,
  getAvailableNumbers,
  buyPhoneNumber,
  isConfigured,
} from "@/lib/signalhouse/client";

/**
 * GET - List owned phone numbers from SignalHouse
 *
 * This endpoint provides a simplified interface to SignalHouse phone numbers.
 * For full functionality, use /api/signalhouse/numbers directly.
 */
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    // Return empty array if SignalHouse not configured (graceful degradation)
    return NextResponse.json({
      numbers: [],
      total: 0,
      configured: false,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "owned";

    // Get available numbers for purchase
    if (action === "available") {
      const areaCode = searchParams.get("areaCode") || undefined;
      const state = searchParams.get("state") || undefined;

      const result = await getAvailableNumbers({ areaCode, state, limit: 20 });

      if (!result.success) {
        return NextResponse.json({
          numbers: [],
          total: 0,
          error: result.error,
        });
      }

      return NextResponse.json({
        numbers: result.data || [],
        total: (result.data || []).length,
        configured: true,
      });
    }

    // Default: Get owned numbers
    const result = await getMyPhoneNumbers();

    if (!result.success) {
      return NextResponse.json({
        numbers: [],
        total: 0,
        error: result.error,
      });
    }

    return NextResponse.json({
      numbers: result.data || [],
      total: (result.data || []).length,
      configured: true,
    });
  } catch (error) {
    console.error("[Providers/SignalHouse/Numbers] Error:", error);
    return NextResponse.json({
      numbers: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to fetch numbers",
    });
  }
}

/**
 * POST - Purchase a new phone number
 */
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured", success: false },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { phoneNumber, friendlyName } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "phoneNumber is required", success: false },
        { status: 400 }
      );
    }

    const result = await buyPhoneNumber(phoneNumber, friendlyName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      number: result.data,
      message: `Phone number ${phoneNumber} purchased successfully`,
    });
  } catch (error) {
    console.error("[Providers/SignalHouse/Numbers] POST Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to provision number",
        success: false,
      },
      { status: 500 }
    );
  }
}
