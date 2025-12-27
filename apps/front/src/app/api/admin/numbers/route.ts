import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  provisionNumberForTeam,
  getPhoneNumbersByCampaign,
} from "@/lib/signalhouse/admin-service";
import {
  getMyPhoneNumbers,
  getAvailableNumbers,
  releasePhoneNumber,
  configurePhoneNumber,
  addFriendlyName,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List phone numbers or search available
export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const areaCode = searchParams.get("areaCode");
    const state = searchParams.get("state");

    // Search available numbers
    if (action === "available") {
      const result = await getAvailableNumbers({
        areaCode: areaCode || undefined,
        state: state || undefined,
        limit: 20,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        numbers: result.data || [],
      });
    }

    // Get my numbers grouped by campaign
    if (action === "grouped") {
      const grouped = await getPhoneNumbersByCampaign();
      const numbers: Record<string, unknown[]> = {};
      grouped.forEach((value, key) => {
        numbers[key] = value;
      });

      return NextResponse.json({
        success: true,
        numbers,
      });
    }

    // Default: list all my numbers
    const result = await getMyPhoneNumbers();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      numbers: result.data || [],
    });
  } catch (error) {
    console.error("[Admin Numbers] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get numbers",
      },
      { status: 500 },
    );
  }
}

// POST - Provision (buy & configure) a number for a team
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { teamId, phoneNumber, campaignId, action } = body;

    // Configure existing number
    if (action === "configure") {
      if (!phoneNumber) {
        return NextResponse.json(
          { error: "phoneNumber is required" },
          { status: 400 },
        );
      }

      const result = await configurePhoneNumber(phoneNumber, {
        campaignId: body.campaignId,
        smsWebhookUrl: body.smsWebhookUrl,
        voiceWebhookUrl: body.voiceWebhookUrl,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        phone: result.data,
        message: "Number configured",
      });
    }

    // Set friendly name
    if (action === "name") {
      if (!phoneNumber || !body.friendlyName) {
        return NextResponse.json(
          { error: "phoneNumber and friendlyName are required" },
          { status: 400 },
        );
      }

      const result = await addFriendlyName(phoneNumber, body.friendlyName);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        phone: result.data,
      });
    }

    // Default: provision new number for team
    if (!teamId || !phoneNumber || !campaignId) {
      return NextResponse.json(
        { error: "teamId, phoneNumber, and campaignId are required" },
        { status: 400 },
      );
    }

    const result = await provisionNumberForTeam(
      teamId,
      phoneNumber,
      campaignId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      phone: result.phone,
      message: "Number provisioned and configured for team",
    });
  } catch (error) {
    console.error("[Admin Numbers] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to provision number",
      },
      { status: 500 },
    );
  }
}

// DELETE - Release a phone number
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "phoneNumber is required" },
        { status: 400 },
      );
    }

    const result = await releasePhoneNumber(phoneNumber);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Number released",
    });
  } catch (error) {
    console.error("[Admin Numbers] Delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to release number",
      },
      { status: 500 },
    );
  }
}
