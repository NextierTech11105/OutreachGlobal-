/**
 * NEVA RESEARCH API - The Researcher
 *
 * Generates research briefings for leads:
 * - POST: Generate research for a lead (property/business context)
 * - GET: Get research status or cached research
 *
 * NEVA finds the story in the numbers and makes data actionable.
 * Output is always structured, never a wall of text.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, properties, businesses } from "@/lib/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { NEVA } from "@/lib/ai-workers/digital-workers";

interface ResearchRequest {
  leadId?: string;
  propertyAddress?: string;
  businessName?: string;
  researchType?: "property" | "business" | "both";
  includeHistory?: boolean;
}

interface ResearchOutput {
  propertyContext?: {
    address: string;
    estimatedValue?: number;
    equity?: number;
    yearsOwned?: number;
    distressSignals?: string[];
    propertyType?: string;
  };
  businessContext?: {
    name: string;
    industry?: string;
    sicCode?: string;
    employees?: number;
    revenue?: string;
    yearsInBusiness?: number;
    ownerName?: string;
  };
  keyInsight: string;
  likelyMotivation: string;
  talkingPoints: string[];
  potentialObjections: Array<{
    objection: string;
    response: string;
  }>;
  nextSteps: string[];
  researchedAt: string;
}

// Generate research insight based on data
function generateInsight(
  property?: ResearchOutput["propertyContext"],
  business?: ResearchOutput["businessContext"],
): { insight: string; motivation: string } {
  // Property-focused insights
  if (property) {
    if (property.distressSignals && property.distressSignals.length > 0) {
      return {
        insight: `Property shows ${property.distressSignals.length} distress signal(s): ${property.distressSignals.join(", ")}. High motivation potential.`,
        motivation:
          "Likely looking for a quick, hassle-free solution due to property stress.",
      };
    }
    if (property.equity && property.equity > 100000) {
      return {
        insight: `Significant equity position (~$${(property.equity / 1000).toFixed(0)}K). Could be looking to unlock value.`,
        motivation:
          "May want to access equity or optimize their real estate portfolio.",
      };
    }
    if (property.yearsOwned && property.yearsOwned > 10) {
      return {
        insight: `Long-term owner (${property.yearsOwned}+ years). Likely has strong emotional attachment.`,
        motivation:
          "Needs to feel their property will be valued and cared for.",
      };
    }
  }

  // Business-focused insights
  if (business) {
    if (business.yearsInBusiness && business.yearsInBusiness > 20) {
      return {
        insight: `Established business (${business.yearsInBusiness}+ years). Owner likely thinking about succession/exit.`,
        motivation:
          "May be considering retirement or transitioning to next chapter.",
      };
    }
    if (business.employees && business.employees < 10) {
      return {
        insight: `Small operation with <10 employees. Owner likely wearing many hats.`,
        motivation:
          "May be burned out, looking for relief or exit opportunity.",
      };
    }
  }

  return {
    insight:
      "Standard lead profile. Focus on discovery to uncover specific motivations.",
    motivation: "Motivation unclear - lead with open-ended questions.",
  };
}

// Generate talking points
function generateTalkingPoints(
  property?: ResearchOutput["propertyContext"],
  business?: ResearchOutput["businessContext"],
): string[] {
  const points: string[] = [];

  if (property) {
    if (property.estimatedValue) {
      points.push(
        `Reference property value (~$${(property.estimatedValue / 1000).toFixed(0)}K) to establish credibility`,
      );
    }
    if (property.yearsOwned) {
      points.push(
        `Acknowledge their tenure (${property.yearsOwned} years) - shows you did homework`,
      );
    }
    if (property.distressSignals?.length) {
      points.push(
        `Gently probe on situation - they may be looking for solutions`,
      );
    }
  }

  if (business) {
    if (business.industry) {
      points.push(
        `Reference their industry (${business.industry}) - show you understand their world`,
      );
    }
    if (business.yearsInBusiness) {
      points.push(
        `Compliment business longevity (${business.yearsInBusiness} years) - build rapport`,
      );
    }
  }

  // Default points
  points.push("Lead with value - what can you offer them?");
  points.push("Ask about their timeline and goals");
  points.push("Listen more than you talk (80/20 rule)");

  return points.slice(0, 5);
}

// Generate objection prep
function generateObjectionPrep(
  property?: ResearchOutput["propertyContext"],
  business?: ResearchOutput["businessContext"],
): Array<{ objection: string; response: string }> {
  const preps: Array<{ objection: string; response: string }> = [];

  if (property?.yearsOwned && property.yearsOwned > 10) {
    preps.push({
      objection: '"We\'ve been here too long to sell now"',
      response:
        "That's actually why it makes sense to explore options - you've built significant equity. Let me show you what that could mean for you.",
    });
  }

  if (business?.yearsInBusiness && business.yearsInBusiness > 15) {
    preps.push({
      objection: '"I\'m not ready to retire yet"',
      response:
        "Totally get it. This isn't about retiring - it's about knowing your options. Smart owners plan ahead.",
    });
  }

  // Common objections
  preps.push({
    objection: '"I\'m not interested in selling"',
    response:
      "No problem. I'm not here to push. Just wanted to share what's happening in your market. Worth 10 mins?",
  });

  preps.push({
    objection: '"How did you get my number?"',
    response:
      "We research property/business owners in the area who might benefit from what we do. If it's not relevant, I totally understand.",
  });

  return preps.slice(0, 4);
}

// POST - Generate research for a lead
export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const {
      leadId,
      propertyAddress,
      businessName,
      researchType = "both",
      includeHistory = true,
    } = body;

    if (!leadId && !propertyAddress && !businessName) {
      return NextResponse.json(
        {
          success: false,
          error: "leadId, propertyAddress, or businessName required",
        },
        { status: 400 },
      );
    }

    let lead = null;
    let propertyData = null;
    let businessData = null;

    // Get lead if provided
    if (leadId) {
      const [foundLead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);
      lead = foundLead;

      // Try to find associated property/business
      if (
        lead?.address &&
        (researchType === "property" || researchType === "both")
      ) {
        try {
          const [prop] = await db
            .select()
            .from(properties)
            .where(ilike(properties.address, `%${lead.address}%`))
            .limit(1);
          propertyData = prop;
        } catch {
          // Table might not exist
        }
      }

      if (
        lead?.company &&
        (researchType === "business" || researchType === "both")
      ) {
        try {
          const [biz] = await db
            .select()
            .from(businesses)
            .where(ilike(businesses.name, `%${lead.company}%`))
            .limit(1);
          businessData = biz;
        } catch {
          // Table might not exist
        }
      }
    }

    // Direct property lookup
    if (
      propertyAddress &&
      (researchType === "property" || researchType === "both")
    ) {
      try {
        const [prop] = await db
          .select()
          .from(properties)
          .where(ilike(properties.address, `%${propertyAddress}%`))
          .limit(1);
        propertyData = prop;
      } catch {
        // Table might not exist
      }
    }

    // Direct business lookup
    if (
      businessName &&
      (researchType === "business" || researchType === "both")
    ) {
      try {
        const [biz] = await db
          .select()
          .from(businesses)
          .where(ilike(businesses.name, `%${businessName}%`))
          .limit(1);
        businessData = biz;
      } catch {
        // Table might not exist
      }
    }

    // Build property context
    let propertyContext: ResearchOutput["propertyContext"] | undefined;
    if (propertyData) {
      propertyContext = {
        address: propertyData.address,
        estimatedValue: propertyData.estimatedValue || undefined,
        equity: propertyData.equity || undefined,
        yearsOwned: propertyData.purchaseDate
          ? Math.floor(
              (Date.now() - new Date(propertyData.purchaseDate).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : undefined,
        distressSignals: [], // Would come from propertyDistressScores table
        propertyType: propertyData.propertyType || undefined,
      };
    } else if (lead?.address) {
      // Create minimal context from lead
      propertyContext = {
        address: lead.address,
      };
    }

    // Build business context
    let businessContext: ResearchOutput["businessContext"] | undefined;
    if (businessData) {
      businessContext = {
        name: businessData.name,
        industry: businessData.sicCode || undefined,
        sicCode: businessData.sicCode || undefined,
        employees: businessData.employees || undefined,
        revenue: businessData.revenue || undefined,
        yearsInBusiness: businessData.yearEstablished
          ? new Date().getFullYear() - businessData.yearEstablished
          : undefined,
        ownerName: undefined, // Would come from businessOwners junction
      };
    } else if (lead?.company) {
      businessContext = {
        name: lead.company,
      };
    }

    // Generate insights
    const { insight, motivation } = generateInsight(
      propertyContext,
      businessContext,
    );
    const talkingPoints = generateTalkingPoints(
      propertyContext,
      businessContext,
    );
    const objectionPrep = generateObjectionPrep(
      propertyContext,
      businessContext,
    );

    // Build research output
    const research: ResearchOutput = {
      propertyContext,
      businessContext,
      keyInsight: insight,
      likelyMotivation: motivation,
      talkingPoints,
      potentialObjections: objectionPrep,
      nextSteps: [
        lead?.phone
          ? "Call or text to initiate contact"
          : "Find phone number for outreach",
        "Reference key insight in opener",
        "Prepare for listed objections",
        "Book strategy session if interest shown",
      ],
      researchedAt: new Date().toISOString(),
    };

    console.log(
      `[Neva Research] Generated research for ${lead?.firstName || propertyAddress || businessName}`,
    );

    return NextResponse.json({
      success: true,
      research,
      lead: lead
        ? {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            email: lead.email,
            status: lead.status,
          }
        : null,
      worker: "neva",
    });
  } catch (error) {
    console.error("[Neva Research] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Research failed",
      },
      { status: 500 },
    );
  }
}

// GET - Get research info
export async function GET() {
  return NextResponse.json({
    success: true,
    worker: {
      id: NEVA.id,
      name: NEVA.name,
      role: NEVA.role,
      tagline: NEVA.tagline,
    },
    researchTypes: ["property", "business", "both"],
    outputFormat: {
      propertyContext: "Address, value, equity, years owned, distress signals",
      businessContext: "Name, industry, employees, revenue, years in business",
      keyInsight: "What makes this lead special",
      likelyMotivation: "Their probable motivation",
      talkingPoints: "What to lead with",
      potentialObjections: "What they might say + how to respond",
      nextSteps: "Recommended actions",
    },
    signaturePhrases: NEVA.linguistic.signaturePhrases,
  });
}
