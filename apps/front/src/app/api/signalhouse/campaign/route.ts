import { NextRequest, NextResponse } from "next/server";
import {
  createCampaign,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignBasicDetails,
  qualifyBrandForUsecases,
  isConfigured,
  type CreateCampaignInput,
} from "@/lib/signalhouse/client";

// GET - List campaigns or get specific campaign
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const brandId = searchParams.get("brandId");
  const action = searchParams.get("action");

  try {
    // Get available usecases for a brand
    if (action === "qualify" && brandId) {
      const result = await qualifyBrandForUsecases(brandId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({
        success: true,
        brandId,
        availableUsecases: result.data?.usecases || [],
      });
    }

    // Get specific campaign
    if (campaignId) {
      const result = await getCampaign(campaignId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, campaign: result.data });
    }

    // List all campaigns
    const result = await getCampaignBasicDetails();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      campaigns: result.data || [],
    });
  } catch (error) {
    console.error("[SignalHouse Campaign] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get campaigns",
      },
      { status: 500 },
    );
  }
}

// POST - Create a new campaign (10DLC)
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.brandId || !body.usecase) {
      return NextResponse.json(
        { error: "brandId and usecase are required" },
        { status: 400 },
      );
    }

    const input: CreateCampaignInput = {
      brandId: body.brandId,
      usecase: body.usecase, // MARKETING, LOW_VOLUME, MIXED, etc.
      description: body.description,
      sampleMessages: body.sampleMessages || [],
      messageFlow:
        body.messageFlow || "User receives promotional messages after opt-in",
      helpMessage: body.helpMessage || "Reply HELP for assistance",
      optoutMessage: body.optoutMessage || "Reply STOP to unsubscribe",
      isDirectLending: body.isDirectLending || false,
      isAgeGated: body.isAgeGated || false,
      subGroupId: body.subGroupId,
    };

    const result = await createCampaign(input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      campaign: result.data,
      message:
        "Campaign submitted for review. Status will update once approved.",
    });
  } catch (error) {
    console.error("[SignalHouse Campaign] Create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 },
    );
  }
}

// PUT - Update a campaign
export async function PUT(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { campaignId, ...updates } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId required" },
        { status: 400 },
      );
    }

    const result = await updateCampaign(campaignId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({ success: true, campaign: result.data });
  } catch (error) {
    console.error("[SignalHouse Campaign] Update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update campaign",
      },
      { status: 500 },
    );
  }
}

// DELETE - Deactivate a campaign
export async function DELETE(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  try {
    const result = await deleteCampaign(campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Campaign deactivated",
    });
  } catch (error) {
    console.error("[SignalHouse Campaign] Delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete campaign",
      },
      { status: 500 },
    );
  }
}
