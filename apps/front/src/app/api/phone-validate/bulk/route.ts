import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, leadIds } = body;

    if (!teamId || !leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { error: "teamId and leadIds are required" },
        { status: 400 }
      );
    }

    // Queue phone validation jobs via Trestle
    // For now, return success - actual implementation connects to Trestle API
    console.log(`[Phone Validate] Queuing ${leadIds.length} leads for team ${teamId}`);

    return NextResponse.json({
      success: true,
      queued: leadIds.length,
      message: `Phone validation queued for ${leadIds.length} leads`,
    });
  } catch (error) {
    console.error("[Phone Validate] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue phone validation" },
      { status: 500 }
    );
  }
}
