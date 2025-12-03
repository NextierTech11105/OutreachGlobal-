import { NextRequest, NextResponse } from "next/server";

interface CreateCampaignRequest {
  name?: string;
  templateId?: string;
  sequenceId?: string;
  startImmediately?: boolean;
}

// POST /api/buckets/:id/campaign - Create campaign from bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: CreateCampaignRequest = await request.json().catch(() => ({}));

    // In production:
    // 1. Fetch bucket and its leads
    // 2. Create campaign record
    // 3. Link bucket to campaign
    // 4. Optionally start campaign

    const campaignId = `campaign-${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: "Campaign created from bucket",
      campaign: {
        id: campaignId,
        name: body.name || `Campaign from Bucket ${id}`,
        bucketId: id,
        templateId: body.templateId,
        sequenceId: body.sequenceId,
        status: body.startImmediately ? "active" : "draft",
        leadsCount: 120, // Mock count
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Bucket Campaign API] POST error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
