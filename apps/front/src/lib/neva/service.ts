/**
 * NEVA Service - Research Copilot
 *
 * NEVA provides context and intelligence for outreach.
 * Uses Perplexity API for business research.
 *
 * NEVA is ADVISORY ONLY.
 * NEVA may NEVER override LUCI.
 */

import type {
  NevaContextPacket,
  NevaEnrichRequest,
  NevaDiscoveryPrep,
} from "./types";
import { evaluateConfidence, hasRiskFlags } from "./confidence";

// =============================================================================
// CONFIGURATION
// =============================================================================

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = "llama-3.1-sonar-small-128k-online";
const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Enrich a lead with business context
 * Returns NevaContextPacket or null if research fails
 */
export async function enrich(
  request: NevaEnrichRequest
): Promise<NevaContextPacket | null> {
  try {
    const { business, owner, context, options } = request;

    // Build research query
    const query = buildResearchQuery(business, owner, context);

    // Call Perplexity
    const research = await callPerplexity(query, options?.timeout_ms);

    if (!research) {
      console.warn("[NEVA] Research returned null for:", business.name);
      return null;
    }

    // Parse and structure response
    const packet = parseResearchResponse(
      request.lead_id,
      request.team_id,
      business,
      research
    );

    return packet;
  } catch (error) {
    console.error("[NEVA] Enrichment error:", error);
    return null; // Fail gracefully - NEVA failures shouldn't block outreach
  }
}

/**
 * Get cached context if available
 */
export async function getContext(
  leadId: string,
  teamId: string
): Promise<NevaContextPacket | null> {
  // TODO: Implement caching with Redis
  // For now, return null to force fresh research
  return null;
}

/**
 * Prepare discovery call questions based on NEVA research
 */
export async function prepareDiscovery(
  packet: NevaContextPacket
): Promise<NevaDiscoveryPrep> {
  const questions: NevaDiscoveryPrep["opening_questions"] = [];

  // Generate questions based on signals
  if (packet.signals.recent_activity.length > 0) {
    const activity = packet.signals.recent_activity[0];
    questions.push({
      question: `I noticed ${activity.toLowerCase()}. How's that going for you?`,
      signal_source: "Recent activity",
      priority: 1,
    });
  }

  // Industry-specific question
  if (packet.summary.size_signal !== "unknown") {
    questions.push({
      question: "What's the biggest challenge you're facing with growth right now?",
      signal_source: "Size signal",
      priority: 2,
    });
  }

  // Years in business question
  if (packet.summary.years_in_business && packet.summary.years_in_business > 5) {
    questions.push({
      question: `You've been in business for ${packet.summary.years_in_business} years - what's changed most in the last year?`,
      signal_source: "Longevity",
      priority: 2,
    });
  }

  // Default question if no signals
  if (questions.length === 0) {
    questions.push({
      question: "What's the main thing you'd like to accomplish in the next 90 days?",
      signal_source: "Default",
      priority: 1,
    });
  }

  return {
    lead_id: packet.lead_id,
    prepared_at: new Date(),
    context_summary: `${packet.summary.company} is a ${packet.summary.size_signal} business${
      packet.summary.years_in_business
        ? ` with ${packet.summary.years_in_business} years in operation`
        : ""
    }.`,
    opening_questions: questions,
    pain_points: extractPainPoints(packet),
    likely_objections: generateObjectionHandlers(packet),
    value_props: generateValueProps(packet),
  };
}

// =============================================================================
// PERPLEXITY INTEGRATION
// =============================================================================

async function callPerplexity(
  query: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string | null> {
  if (!PERPLEXITY_API_KEY) {
    console.warn("[NEVA] Perplexity API key not configured");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a business research assistant. Provide concise, factual information about businesses. Focus on: recent news, size indicators, years in operation, any red flags (lawsuits, complaints), and growth signals. Be brief and factual.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("[NEVA] Perplexity API error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[NEVA] Perplexity request timed out");
    } else {
      console.error("[NEVA] Perplexity request failed:", error);
    }
    return null;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildResearchQuery(
  business: NevaEnrichRequest["business"],
  owner: NevaEnrichRequest["owner"],
  context: NevaEnrichRequest["context"]
): string {
  const parts = [
    `Research this business: ${business.name}`,
  ];

  if (business.city && business.state) {
    parts.push(`Location: ${business.city}, ${business.state}`);
  }

  if (business.industry) {
    parts.push(`Industry: ${business.industry}`);
  }

  parts.push(
    "Find: years in business, approximate size, recent news/activity, any complaints or legal issues, growth signals."
  );

  return parts.join(". ");
}

function parseResearchResponse(
  leadId: string,
  teamId: string,
  business: NevaEnrichRequest["business"],
  research: string
): NevaContextPacket {
  // Parse the research response (simplified - in production use structured extraction)
  const hasNegative = /lawsuit|complaint|bbb|negative|problem/i.test(research);
  const hasGrowth = /expand|growth|hiring|new location|raised/i.test(research);

  // Extract years in business
  const yearsMatch = research.match(/(\d+)\s*years?\s*(in business|operating|established)/i);
  const yearsInBusiness = yearsMatch ? parseInt(yearsMatch[1]) : null;

  // Estimate confidence based on research quality
  let confidence = 0.5;
  if (research.length > 200) confidence += 0.2;
  if (yearsInBusiness) confidence += 0.1;
  if (hasGrowth || hasNegative) confidence += 0.1;
  confidence = Math.min(confidence, 0.95);

  return {
    lead_id: leadId,
    team_id: teamId,
    confidence,

    summary: {
      company: business.name,
      size_signal: estimateSize(research),
      years_in_business: yearsInBusiness,
      employee_estimate: extractEmployeeCount(research),
    },

    signals: {
      recent_activity: hasGrowth ? extractRecentActivity(research) : [],
      negative_signals: hasNegative ? extractNegativeSignals(research) : [],
      timing_signals: extractTimingSignals(research),
    },

    personalization: {
      opening_hook: generateOpeningHook(business, research),
      industry_language: [],
      location_reference: business.city ? `in ${business.city}` : "",
      avoid_topics: hasNegative ? ["complaints", "issues"] : [],
    },

    recommendations: {
      best_worker: hasGrowth ? "SABRINA" : "GIANNA",
      tone: "professional",
      cta: "Schedule a quick 15-minute call",
      discovery_questions: [],
    },

    risk_flags: {
      reputation: /bbb complaint|bad review|1 star/i.test(research),
      legal: /lawsuit|sued|litigation|regulatory/i.test(research),
      financial_distress: /bankruptcy|lien|foreclosure|closed/i.test(research),
    },

    researched_at: new Date(),
    sources: ["perplexity"],
    cache_key: `neva:${teamId}:${leadId}`,
  };
}

function estimateSize(research: string): "small" | "medium" | "large" | "unknown" {
  if (/enterprise|large|500\+|1000\+/i.test(research)) return "large";
  if (/medium|mid-size|50-|100-/i.test(research)) return "medium";
  if (/small|local|family|1-10|owner-operated/i.test(research)) return "small";
  return "unknown";
}

function extractEmployeeCount(research: string): string | null {
  const match = research.match(/(\d+[-–]?\d*)\s*employees/i);
  return match ? match[1] : null;
}

function extractRecentActivity(research: string): string[] {
  const activities: string[] = [];
  if (/new location|opened|expansion/i.test(research)) {
    activities.push("New location or expansion");
  }
  if (/hiring|new hire|team growth/i.test(research)) {
    activities.push("Actively hiring");
  }
  if (/funding|investment|raised/i.test(research)) {
    activities.push("Recent funding");
  }
  return activities;
}

function extractNegativeSignals(research: string): string[] {
  const signals: string[] = [];
  if (/bbb complaint/i.test(research)) signals.push("BBB complaints");
  if (/lawsuit/i.test(research)) signals.push("Legal issues");
  if (/negative review/i.test(research)) signals.push("Negative reviews");
  return signals;
}

function extractTimingSignals(research: string): string[] {
  const signals: string[] = [];
  if (/season|busy period|peak/i.test(research)) {
    signals.push("Seasonal business timing");
  }
  if (/just|recently|new/i.test(research)) {
    signals.push("Recent activity detected");
  }
  return signals;
}

function generateOpeningHook(
  business: NevaEnrichRequest["business"],
  research: string
): string {
  if (/new location|expand/i.test(research)) {
    return `I saw ${business.name} recently expanded - congrats!`;
  }
  if (/hiring/i.test(research)) {
    return `I noticed ${business.name} is growing the team.`;
  }
  return `I came across ${business.name} and wanted to reach out.`;
}

function extractPainPoints(packet: NevaContextPacket): string[] {
  const pains: string[] = [];
  if (packet.summary.size_signal === "small") {
    pains.push("Time constraints with small team");
    pains.push("Manual follow-up processes");
  }
  if (packet.signals.recent_activity.includes("Actively hiring")) {
    pains.push("Scaling operations");
  }
  return pains;
}

function generateObjectionHandlers(
  packet: NevaContextPacket
): NevaDiscoveryPrep["likely_objections"] {
  return [
    {
      objection: "I'm too busy right now",
      response: "I totally get it - that's exactly why I keep these calls to 15 minutes max.",
    },
    {
      objection: "I'm not interested",
      response: "No problem at all. Mind if I ask what you're currently using to handle this?",
    },
    {
      objection: "Send me more info",
      response: "Happy to! What specifically would be most helpful for you to see?",
    },
  ];
}

function generateValueProps(packet: NevaContextPacket): string[] {
  return [
    "Save hours of manual outreach each week",
    "Get more responses with personalized messaging",
    "Know exactly who to call and when",
  ];
}

// =============================================================================
// EXPORTS
// =============================================================================

export const nevaService = {
  enrich,
  getContext,
  prepareDiscovery,
  evaluateConfidence,
  hasRiskFlags,
};

export default nevaService;
