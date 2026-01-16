/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEEP RESEARCH API - Perplexity-Powered Personalization
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/research/deep
 *
 * TRIGGERED BY:
 * - Meeting booked via Calendly
 * - Manual research request
 * - HOT lead escalation
 *
 * RETURNS:
 * - Company overview
 * - Decision maker info
 * - Recent news/activity
 * - Pain points identification
 * - Personalization hooks
 *
 * PURPOSE: Arm you with context for high-impact 15-min discovery calls
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";

const log = new Logger("DeepResearch");

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

interface ResearchRequest {
  leadId?: string;
  companyName?: string;
  inviteeEmail?: string;
  inviteeName?: string;
  meetingTime?: string;
  purpose?: "meeting_prep" | "enrichment" | "qualification";
  questions?: string[];
}

interface ResearchResult {
  companyOverview: string;
  decisionMaker: {
    name?: string;
    title?: string;
    background?: string;
  };
  recentActivity: string[];
  painPoints: string[];
  personalizationHooks: string[];
  competitors?: string[];
  companySize?: string;
  industry?: string;
  fundingStage?: string;
  rawResponse: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const {
      leadId,
      companyName,
      inviteeEmail,
      inviteeName,
      meetingTime,
      purpose = "meeting_prep",
      questions,
    } = body;

    if (!companyName && !inviteeEmail) {
      return NextResponse.json(
        { error: "companyName or inviteeEmail required" },
        { status: 400 },
      );
    }

    // Extract company from email domain if no company name
    const emailDomain = inviteeEmail?.split("@")[1];
    const researchTarget =
      companyName || emailDomain?.replace(/\.(com|io|net|org|co)$/, "");

    log.info(`[DeepResearch] Starting research for: ${researchTarget}`);

    let researchResult: ResearchResult;

    if (PERPLEXITY_API_KEY) {
      // Use Perplexity API for deep research
      researchResult = await runPerplexityResearch(
        researchTarget || "",
        inviteeName,
        questions,
      );
    } else {
      // Fallback to basic research structure
      log.warn("[DeepResearch] No Perplexity API key - using fallback");
      researchResult = createFallbackResearch(
        researchTarget || "",
        inviteeName,
      );
    }

    // Save research to lead if leadId provided
    if (leadId) {
      await db
        .update(leads)
        .set({
          customFields: sql`
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{deepResearch}',
                ${JSON.stringify(researchResult)}::jsonb
              ),
              '{researchedAt}',
              ${JSON.stringify(new Date().toISOString())}::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      log.info(`[DeepResearch] Research saved to lead: ${leadId}`);
    }

    return NextResponse.json({
      success: true,
      target: researchTarget,
      purpose,
      meetingTime,
      research: researchResult,
      callPrep: {
        opener: `Hey ${inviteeName?.split(" ")[0] || "there"}, thanks for taking the time. I did some research on ${researchTarget} - looks like you're doing some interesting work in ${researchResult.industry || "your space"}.`,
        hooks: researchResult.personalizationHooks.slice(0, 3),
        painPointQuestions: researchResult.painPoints.map(
          (p) =>
            `I noticed ${p} - is that something you're currently dealing with?`,
        ),
      },
    });
  } catch (error) {
    log.error("[DeepResearch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY RESEARCH
// ═══════════════════════════════════════════════════════════════════════════════

async function runPerplexityResearch(
  companyName: string,
  personName?: string,
  customQuestions?: string[],
): Promise<ResearchResult> {
  const defaultQuestions = [
    `What does ${companyName} do? Describe their main products, services, and value proposition.`,
    `Who are the founders and key executives at ${companyName}? What are their backgrounds?`,
    `What is ${companyName}'s company size, funding stage, and industry?`,
    `What are recent news, announcements, or developments about ${companyName}?`,
    `What business challenges or pain points might ${companyName} face that could be solved with sales automation or AI-powered outreach?`,
    `Who are ${companyName}'s main competitors?`,
  ];

  if (personName) {
    defaultQuestions.push(
      `What can you tell me about ${personName} at ${companyName}? Their role, background, LinkedIn activity?`,
    );
  }

  const questions = customQuestions || defaultQuestions;
  const prompt = questions.join("\n\n");

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-large-128k-online",
        messages: [
          {
            role: "system",
            content: `You are a sales research assistant. Provide concise, actionable intelligence for a sales call. Focus on facts that help personalize outreach and identify pain points. Be specific and cite sources when possible.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
        return_citations: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    // Parse the response into structured format
    return parsePerplexityResponse(content, companyName);
  } catch (error) {
    log.error("[DeepResearch] Perplexity API error:", error);
    return createFallbackResearch(companyName, personName);
  }
}

function parsePerplexityResponse(
  content: string,
  companyName: string,
): ResearchResult {
  // Extract structured data from Perplexity response
  const lines = content.split("\n").filter((l) => l.trim());

  // Basic parsing - in production, use more sophisticated NLP
  const painPointKeywords = [
    "challenge",
    "struggle",
    "problem",
    "issue",
    "pain",
    "difficult",
  ];
  const painPoints = lines
    .filter((l) => painPointKeywords.some((k) => l.toLowerCase().includes(k)))
    .slice(0, 5);

  const newsKeywords = [
    "announced",
    "launched",
    "raised",
    "acquired",
    "partnership",
    "release",
  ];
  const recentActivity = lines
    .filter((l) => newsKeywords.some((k) => l.toLowerCase().includes(k)))
    .slice(0, 5);

  // Extract personalization hooks
  const personalizationHooks = [
    ...painPoints.map((p) => `Pain point: ${p.slice(0, 100)}`),
    ...recentActivity.map((a) => `Recent: ${a.slice(0, 100)}`),
  ].slice(0, 5);

  return {
    companyOverview: content.slice(0, 500),
    decisionMaker: {
      name: undefined,
      title: undefined,
      background: undefined,
    },
    recentActivity:
      recentActivity.length > 0 ? recentActivity : ["No recent activity found"],
    painPoints:
      painPoints.length > 0 ? painPoints : ["General sales automation needs"],
    personalizationHooks:
      personalizationHooks.length > 0
        ? personalizationHooks
        : [`${companyName} appears to be in growth mode`],
    competitors: [],
    companySize: undefined,
    industry: undefined,
    fundingStage: undefined,
    rawResponse: content,
  };
}

function createFallbackResearch(
  companyName: string,
  personName?: string,
): ResearchResult {
  return {
    companyOverview: `${companyName} - Research pending. Use this call to learn more about their business.`,
    decisionMaker: {
      name: personName,
      title: undefined,
      background: undefined,
    },
    recentActivity: ["Research not available - ask about recent developments"],
    painPoints: [
      "Lead generation and pipeline",
      "Sales automation",
      "Time spent on manual outreach",
      "Follow-up consistency",
    ],
    personalizationHooks: [
      `${personName || "They"} took time to book a call - they're interested`,
      "Ask about their current outreach process",
      "Explore their biggest time sinks in sales",
    ],
    competitors: [],
    companySize: undefined,
    industry: undefined,
    fundingStage: undefined,
    rawResponse: "Fallback research - Perplexity API not configured",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - View research status/info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (leadId) {
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (lead[0]) {
      const customFields =
        (lead[0].customFields as Record<string, unknown>) || {};
      return NextResponse.json({
        success: true,
        leadId,
        hasResearch: !!customFields.deepResearch,
        research: customFields.deepResearch || null,
        researchedAt: customFields.researchedAt || null,
      });
    }
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/research/deep",
    description: "Perplexity-powered deep research for meeting personalization",
    triggers: [
      "Meeting booked via Calendly",
      "Manual research request",
      "HOT lead escalation",
    ],
    usage: {
      method: "POST",
      body: {
        leadId: "optional - saves research to lead",
        companyName: "required if no email",
        inviteeEmail: "required if no company",
        inviteeName: "optional - for person research",
        purpose: "meeting_prep | enrichment | qualification",
      },
    },
    perplexityConfigured: !!PERPLEXITY_API_KEY,
  });
}
