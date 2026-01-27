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

    // Queue skip trace jobs via Tracerfy
    // For now, return success - actual implementation connects to Tracerfy API
    console.log(`[Skip Trace] Queuing ${leadIds.length} leads for team ${teamId}`);

    return NextResponse.json({
      success: true,
      queued: leadIds.length,
      message: `Skip trace queued for ${leadIds.length} leads`,
    });
  } catch (error) {
    console.error("[Skip Trace] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue skip trace" },
      { status: 500 }
    );
  }
}
