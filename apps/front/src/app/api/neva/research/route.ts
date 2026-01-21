/**
 * NEVA Research API
 *
 * Provides deep business research using Perplexity AI.
 * Used by Inbox for pre-call research and discovery prep.
 */

import { NextRequest, NextResponse } from "next/server";
import { nevaService } from "@/lib/neva";
import type { NevaEnrichRequest } from "@/lib/neva/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      contactName,
      phone,
      email,
      address,
      industry,
      teamId,
      leadId,
    } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    // Build NEVA enrich request
    const enrichRequest: NevaEnrichRequest = {
      lead_id: leadId || `temp-${Date.now()}`,
      team_id: teamId || "default",

      business: {
        name: companyName,
        address: address?.street,
        city: address?.city,
        state: address?.state,
        phone,
        industry,
      },

      owner: contactName
        ? {
            name: contactName,
            email,
          }
        : undefined,

      context: {
        campaign_type: "cold_outreach",
        intent: "discovery_call",
        prior_interactions: 0,
      },

      options: {
        max_depth: "normal",
        timeout_ms: 15000,
      },
    };

    // Call NEVA enrich
    const packet = await nevaService.enrich(enrichRequest);

    if (!packet) {
      // Return minimal response if research failed
      return NextResponse.json({
        success: true,
        confidence: 0,
        summary: {
          company: companyName,
          overview: "Research unavailable. Proceed with general approach.",
        },
        signals: [],
        recommendations: {
          tone: "professional",
          discovery_questions: [
            "What's the biggest challenge you're facing right now?",
            "How are you currently handling lead follow-up?",
            "What would make your day-to-day easier?",
          ],
        },
        risk_flags: null,
      });
    }

    // Prepare discovery questions
    const discoveryPrep = await nevaService.prepareDiscovery(packet);

    // Evaluate confidence
    const confidenceResult = nevaService.evaluateConfidence(packet);

    return NextResponse.json({
      success: true,
      confidence: packet.confidence,
      confidence_level: confidenceResult.level,
      use_personalization: confidenceResult.use_personalization,

      summary: {
        company: packet.summary.company,
        size: packet.summary.size_signal,
        years_in_business: packet.summary.years_in_business,
        employees: packet.summary.employee_estimate,
        overview: discoveryPrep.context_summary,
      },

      signals: {
        recent_activity: packet.signals.recent_activity,
        negative: packet.signals.negative_signals,
        timing: packet.signals.timing_signals,
      },

      personalization: packet.personalization,

      recommendations: {
        best_worker: packet.recommendations.best_worker,
        tone: packet.recommendations.tone,
        cta: packet.recommendations.cta,
        discovery_questions: discoveryPrep.opening_questions.map((q) => q.question),
      },

      discovery_prep: {
        questions: discoveryPrep.opening_questions,
        pain_points: discoveryPrep.pain_points,
        objection_handlers: discoveryPrep.likely_objections,
        value_props: discoveryPrep.value_props,
      },

      risk_flags: packet.risk_flags,
      requires_luci_recheck:
        packet.risk_flags.reputation ||
        packet.risk_flags.legal ||
        packet.risk_flags.financial_distress,

      sources: packet.sources,
      researched_at: packet.researched_at,
    });
  } catch (error) {
    console.error("[NEVA] Research error:", error);
    const message = error instanceof Error ? error.message : "Research failed";

    return NextResponse.json(
      {
        error: message,
        success: false,
      },
      { status: 500 }
    );
  }
}

// GET - Check NEVA status and Perplexity config
export async function GET() {
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;

  return NextResponse.json({
    status: "operational",
    perplexity_configured: hasPerplexity,
    capabilities: [
      "business_research",
      "discovery_prep",
      "risk_detection",
      "personalization",
    ],
  });
}
