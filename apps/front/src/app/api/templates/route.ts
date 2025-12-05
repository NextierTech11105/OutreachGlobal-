import { NextRequest, NextResponse } from "next/server";
import smsInitial from "@/lib/templates/sms_initial.json";
import smsGiannaLoop from "@/lib/templates/sms_gianna_loop.json";
import coldCallOpeners from "@/lib/templates/cold_call_openers.json";
import smsStrategySession from "@/lib/templates/sms_strategy_session.json";

// GET /api/templates - Get all templates or filter by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    // All template libraries
    const allTemplates = {
      initial: smsInitial,
      gianna_loop: smsGiannaLoop,
      cold_calls: coldCallOpeners,
      strategy_session: smsStrategySession,
    };

    // Filter by category if specified
    if (category) {
      switch (category) {
        case "initial_outreach":
        case "initial":
          return NextResponse.json(smsInitial);
        case "escalation_loop":
        case "gianna_loop":
        case "loop":
          return NextResponse.json(smsGiannaLoop);
        case "cold_call":
        case "cold_calls":
          return NextResponse.json(coldCallOpeners);
        case "strategy_session":
        case "strategy":
          return NextResponse.json(smsStrategySession);
        default:
          return NextResponse.json(
            { error: `Unknown category: ${category}` },
            { status: 400 }
          );
      }
    }

    // Filter by type (sms, cold_call)
    if (type === "sms") {
      return NextResponse.json({
        initial: smsInitial,
        gianna_loop: smsGiannaLoop,
        strategy_session: smsStrategySession,
      });
    }

    if (type === "cold_call") {
      return NextResponse.json(coldCallOpeners);
    }

    // Return all templates
    return NextResponse.json({
      success: true,
      templates: allTemplates,
      categories: [
        { id: "initial", name: "Initial Outreach", count: smsInitial.templates.length },
        { id: "gianna_loop", name: "Gianna Escalation Loop", count: smsGiannaLoop.templates.length },
        { id: "cold_calls", name: "Cold Call Openers", count: coldCallOpeners.templates.length },
        { id: "strategy_session", name: "Strategy Session Invites", count: smsStrategySession.templates.length },
      ],
      total_count:
        smsInitial.templates.length +
        smsGiannaLoop.templates.length +
        coldCallOpeners.templates.length +
        smsStrategySession.templates.length,
    });
  } catch (error) {
    console.error("[Templates API] Error:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 }
    );
  }
}
