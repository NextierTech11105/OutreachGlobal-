import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableNumbers,
  buyPhoneNumber,
  releasePhoneNumber,
  getMyPhoneNumbers,
  configurePhoneNumber,
  addFriendlyName,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List available or owned phone numbers
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "owned";
  const areaCode = searchParams.get("areaCode") || undefined;
  const state = searchParams.get("state") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

  try {
    // Search for available numbers to purchase
    if (action === "available" || action === "search") {
      const result = await getAvailableNumbers({ areaCode, state, limit });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({
        success: true,
        available: result.data || [],
        count: (result.data || []).length,
      });
    }

    // Get owned numbers (default)
    const result = await getMyPhoneNumbers();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      numbers: result.data || [],
      count: (result.data || []).length,
    });
  } catch (error) {
    console.error("[SignalHouse Numbers] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get numbers" },
      { status: 500 }
    );
  }
}

// POST - Buy a number, configure it, or add friendly name
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { action, phoneNumber, friendlyName, campaignId, smsWebhookUrl, voiceWebhookUrl } = body;

    // Buy a phone number
    if (action === "buy" || action === "purchase") {
      if (!phoneNumber) {
        return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
      }

      const result = await buyPhoneNumber(phoneNumber, friendlyName);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }

      return NextResponse.json({
        success: true,
        number: result.data,
        message: `Phone number ${phoneNumber} purchased successfully`,
      });
    }

    // Configure a phone number (attach to campaign, set webhooks)
    if (action === "configure") {
      if (!phoneNumber) {
        return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
      }

      const result = await configurePhoneNumber(phoneNumber, {
        campaignId,
        smsWebhookUrl,
        voiceWebhookUrl,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }

      return NextResponse.json({
        success: true,
        number: result.data,
        message: "Phone number configured",
      });
    }

    // Add friendly name
    if (action === "rename" || action === "friendlyName") {
      if (!phoneNumber || !friendlyName) {
        return NextResponse.json({ error: "phoneNumber and friendlyName required" }, { status: 400 });
      }

      const result = await addFriendlyName(phoneNumber, friendlyName);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }

      return NextResponse.json({
        success: true,
        number: result.data,
        message: "Friendly name updated",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: buy, configure, rename" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[SignalHouse Numbers] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

// DELETE - Release a phone number
export async function DELETE(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const phoneNumber = searchParams.get("phoneNumber");

  if (!phoneNumber) {
    return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
  }

  try {
    const result = await releasePhoneNumber(phoneNumber);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Phone number ${phoneNumber} released`,
    });
  } catch (error) {
    console.error("[SignalHouse Numbers] Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to release number" },
      { status: 500 }
    );
  }
}
