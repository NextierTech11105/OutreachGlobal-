import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  createTeamCampaign,
  getCampaignsBySubGroup,
} from "@/lib/signalhouse/admin-service";
import {
  getCampaign,
  updateCampaign,
  deleteCampaign,
  qualifyBrandForUsecases,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List campaigns or get qualifying use cases
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
    const campaignId = searchParams.get("campaignId");
    const brandId = searchParams.get("brandId");
    const action = searchParams.get("action");

    // Get qualifying use cases for a brand
    if (action === "qualify" && brandId) {
      const result = await qualifyBrandForUsecases(brandId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        usecases: result.data?.usecases || [],
      });
    }

    // Get specific campaign
    if (campaignId) {
      const result = await getCampaign(campaignId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        campaign: result.data,
      });
    }

    // List all campaigns grouped by sub-group
    const groupedCampaigns = await getCampaignsBySubGroup();
    const campaigns: Record<string, unknown[]> = {};
    groupedCampaigns.forEach((value, key) => {
      campaigns[key] = value;
    });

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("[Admin Campaigns] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get campaigns",
      },
      { status: 500 },
    );
  }
}

// POST - Create a new campaign for a team
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
    const { teamId, usecase, description, sampleMessages } = body;

    if (!teamId || !usecase || !description) {
      return NextResponse.json(
        { error: "teamId, usecase, and description are required" },
        { status: 400 },
      );
    }

    const result = await createTeamCampaign(
      teamId,
      usecase,
      description,
      sampleMessages || [],
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaign: result.campaign,
      message: "Campaign created and submitted for review",
    });
  } catch (error) {
    console.error("[Admin Campaigns] Create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update a campaign
export async function PATCH(request: NextRequest) {
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
    const { campaignId, ...updates } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }

    const result = await updateCampaign(campaignId, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaign: result.data,
    });
  } catch (error) {
    console.error("[Admin Campaigns] Update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update campaign",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete a campaign
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
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }

    const result = await deleteCampaign(campaignId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Campaign deleted",
    });
  } catch (error) {
    console.error("[Admin Campaigns] Delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete campaign",
      },
      { status: 500 },
    );
  }
}
