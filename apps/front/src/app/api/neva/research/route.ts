import { NextRequest, NextResponse } from "next/server";
import {
  quickValidationScan,
  deepResearch,
  calculateMarketSizing,
  buildPersonaIntelligence,
  generateDealIntelligence,
  generateFullResearchReport,
} from "@/lib/ai-workers/neva-research";

/**
 * POST /api/neva/research
 *
 * NEVA Deep Research API - Internal Copilot
 * Uses Perplexity API for comprehensive business intelligence.
 *
 * Research Types:
 * - quick_validation: Apollo-style business validation
 * - deep_research: Pre-appointment intel
 * - market_sizing: TAM/SAM/SOM calculations
 * - persona: ICP and buyer personas
 * - deal_intelligence: Competitive positioning
 * - full_report: All modules combined
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { success: false, error: "PERPLEXITY_API_KEY not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { type, companyName, contactName, address, industry, leadId } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Research type is required" },
        { status: 400 },
      );
    }

    let result: any;

    switch (type) {
      case "quick_validation":
        if (!companyName || !address) {
          return NextResponse.json(
            { success: false, error: "Company name and address required" },
            { status: 400 },
          );
        }
        result = await quickValidationScan(companyName, address);
        break;

      case "deep_research":
        if (!companyName) {
          return NextResponse.json(
            { success: false, error: "Company name required" },
            { status: 400 },
          );
        }
        result = await deepResearch(
          companyName,
          contactName,
          address,
          industry,
        );
        break;

      case "market_sizing":
        if (!industry) {
          return NextResponse.json(
            { success: false, error: "Industry required" },
            { status: 400 },
          );
        }
        result = await calculateMarketSizing(industry, address?.state);
        break;

      case "persona":
        if (!industry) {
          return NextResponse.json(
            { success: false, error: "Industry required" },
            { status: 400 },
          );
        }
        result = await buildPersonaIntelligence(industry);
        break;

      case "deal_intelligence":
        if (!companyName) {
          return NextResponse.json(
            { success: false, error: "Company name required" },
            { status: 400 },
          );
        }
        result = await generateDealIntelligence(companyName, industry, address);
        break;

      case "full_report":
        if (!companyName || !address || !industry) {
          return NextResponse.json(
            {
              success: false,
              error: "Company, address, and industry required",
            },
            { status: 400 },
          );
        }
        result = await generateFullResearchReport(
          companyName,
          address,
          industry,
          contactName,
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Unknown research type: " + type },
          { status: 400 },
        );
    }

    console.log("[NEVA Research]", { type, companyName, leadId });

    return NextResponse.json({
      success: true,
      type,
      result,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("NEVA research error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Research failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "active",
    configured: !!PERPLEXITY_API_KEY,
    capabilities: [
      "quick_validation",
      "deep_research",
      "market_sizing",
      "persona",
      "deal_intelligence",
      "full_report",
    ],
  });
}
