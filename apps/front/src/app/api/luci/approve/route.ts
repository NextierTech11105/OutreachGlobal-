/**
 * LUCI Approve API
 *
 * Approves a lead for campaign outreach.
 * This is the ONLY way to get a lead into CAMPAIGN_READY status.
 */

import { NextRequest, NextResponse } from "next/server";
import { luciService } from "@/lib/luci";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, teamId } = body;

    if (!leadId || !teamId) {
      return NextResponse.json(
        { error: "leadId and teamId are required" },
        { status: 400 }
      );
    }

    const result = await luciService.approve(leadId, teamId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          lead_id: result.lead_id,
          status: result.status,
          can_contact: false,
          reason: result.reason,
        },
        { status: 200 } // Return 200 even on rejection - it's a valid business result
      );
    }

    return NextResponse.json({
      success: true,
      lead_id: result.lead_id,
      status: result.status,
      can_contact: result.can_contact,
      approved_lead: result.approved_lead,
    });
  } catch (error) {
    console.error("[LUCI] Approve error:", error);
    const message = error instanceof Error ? error.message : "Approval failed";

    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}

// GET - Quick contactability check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const teamId = searchParams.get("teamId");

    if (!leadId || !teamId) {
      return NextResponse.json(
        { error: "leadId and teamId are required" },
        { status: 400 }
      );
    }

    const result = await luciService.canContact(leadId, teamId);

    return NextResponse.json({
      lead_id: leadId,
      can_contact: result.allowed,
      reason: result.reason,
    });
  } catch (error) {
    console.error("[LUCI] Contact check error:", error);
    const message = error instanceof Error ? error.message : "Check failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
