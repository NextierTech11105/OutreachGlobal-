/**
 * LUCI Recheck API
 *
 * Rechecks a lead when NEVA finds risk flags.
 * LUCI has final authority to suppress or approve.
 */

import { NextRequest, NextResponse } from "next/server";
import { luciService } from "@/lib/luci";
import type { LuciRecheckRequest } from "@/lib/luci/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, teamId, triggeredBy, riskFlags, context } = body;

    if (!leadId || !teamId) {
      return NextResponse.json(
        { error: "leadId and teamId are required" },
        { status: 400 }
      );
    }

    const recheckRequest: LuciRecheckRequest = {
      lead_id: leadId,
      team_id: teamId,
      triggered_by: triggeredBy || "MANUAL",
      risk_flags: {
        reputation: riskFlags?.reputation || false,
        legal: riskFlags?.legal || false,
        financial_distress: riskFlags?.financial_distress || false,
      },
      context,
    };

    const result = await luciService.recheck(recheckRequest);

    return NextResponse.json({
      success: true,
      lead_id: result.lead_id,
      previous_status: result.previous_status,
      new_status: result.new_status,
      action_taken: result.action_taken,
      suppression_reason: result.suppression_reason,
      reviewed_at: result.reviewed_at,
    });
  } catch (error) {
    console.error("[LUCI] Recheck error:", error);
    const message = error instanceof Error ? error.message : "Recheck failed";

    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
