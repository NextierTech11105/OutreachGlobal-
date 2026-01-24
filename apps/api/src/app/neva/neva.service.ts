import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and } from "drizzle-orm";
import { nevaEnrichments } from "@/database/schema";
import { AiOrchestratorService } from "../ai-orchestrator/ai-orchestrator.service";
import { v4 as uuid } from "uuid";
import { CacheService } from "@/lib/cache/cache.service";

/**
 * NEVA SERVICE - Research Copilot
 *
 * NEVA provides business intelligence and context for outreach.
 * Uses Perplexity API (via AI Orchestrator) for research.
 *
 * NEVA is ADVISORY ONLY.
 * NEVA may NEVER override LUCI compliance decisions.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface NevaContextPacket {
  leadId: string;
  teamId: string;
  confidence: number;

  summary: {
    company: string;
    sizeSignal: "small" | "medium" | "large" | "unknown";
    yearsInBusiness: number | null;
    employeeEstimate: string | null;
  };

  signals: {
    recentActivity: string[];
    negativeSignals: string[];
    timingSignals: string[];
  };

  personalization: {
    openingHook: string;
    industryLanguage: string[];
    locationReference: string;
    avoidTopics: string[];
  };

  recommendations: {
    bestWorker: "gianna" | "cathy" | "sabrina";
    tone: "professional" | "casual" | "urgent" | "friendly";
    cta: string;
    discoveryQuestions: string[];
  };

  riskFlags: {
    reputation: boolean;
    legal: boolean;
    financialDistress: boolean;
  };

  researchedAt: Date;
  sources: string[];
  cacheKey: string | null;
}

export interface NevaEnrichRequest {
  leadId: string;
  teamId: string;
  business: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    industry?: string;
  };
  owner?: {
    name?: string;
    email?: string;
  };
  context: {
    campaignType: "cold_outreach" | "nurture" | "reactivation";
    intent: string;
    priorInteractions?: number;
  };
  options?: {
    skipCache?: boolean;
    maxDepth?: "shallow" | "normal" | "deep";
    timeoutMs?: number;
  };
}

export interface NevaDiscoveryPrep {
  leadId: string;
  preparedAt: Date;
  contextSummary: string;
  openingQuestions: {
    question: string;
    signalSource: string;
    priority: 1 | 2 | 3;
  }[];
  painPoints: string[];
  likelyObjections: {
    objection: string;
    response: string;
  }[];
  valueProps: string[];
}

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class NevaService {
  private readonly logger = new Logger(NevaService.name);
  private readonly CACHE_TTL_MS = 60 * 60 * 24 * 1000; // 24 hours in ms

  constructor(
    @InjectDB() private db: DrizzleClient,
    private aiOrchestrator: AiOrchestratorService,
    private cacheService: CacheService,
  ) {}

  /**
   * Enrich a lead with business context using Perplexity research
   */
  async enrich(request: NevaEnrichRequest): Promise<NevaContextPacket | null> {
    try {
      const { business, context, options } = request;
      const cacheKey = `neva:${request.teamId}:${request.leadId}`;

      // Check cache first (unless skipCache is true)
      if (!options?.skipCache) {
        const cached = await this.getContext(request.leadId, request.teamId);
        if (cached) {
          this.logger.log(`[NEVA] Cache hit for ${business.name}`);
          return cached;
        }
      }

      // Build research query
      const query = this.buildResearchQuery(business, context);
      this.logger.log(`[NEVA] Researching: ${business.name}`);

      // Call Perplexity via AI Orchestrator
      const aiContext = {
        teamId: request.teamId,
        traceId: uuid(),
        leadId: request.leadId,
        channel: "system" as const,
      };

      const research = await this.aiOrchestrator.researchDeep(aiContext, query);

      if (!research.summary) {
        this.logger.warn(
          `[NEVA] Research returned empty for: ${business.name}`,
        );
        return null;
      }

      // Calculate confidence based on findings
      const confidence =
        research.keyFindings.length > 3
          ? 0.8
          : research.keyFindings.length > 1
            ? 0.6
            : 0.4;

      // Parse research response into structured packet
      const packet = this.parseResearchResponse(
        request.leadId,
        request.teamId,
        business,
        research.summary,
        confidence,
      );

      // Cache the result
      await this.cacheService.set(cacheKey, packet, this.CACHE_TTL_MS);

      // Store in database for persistence
      await this.saveResearch(packet);

      return packet;
    } catch (error) {
      this.logger.error(`[NEVA] Enrichment error: ${error}`);
      return null; // Fail gracefully - NEVA failures shouldn't block outreach
    }
  }

  /**
   * Get cached context if available
   */
  async getContext(
    leadId: string,
    teamId: string,
  ): Promise<NevaContextPacket | null> {
    const cacheKey = `neva:${teamId}:${leadId}`;

    // Try memory cache first
    const cached = await this.cacheService.get<NevaContextPacket>(cacheKey);
    if (cached) {
      return cached;
    }

    // Try database
    try {
      const research = await this.db.query.nevaEnrichments?.findFirst({
        where: and(
          eq(nevaEnrichments.leadId, leadId),
          eq(nevaEnrichments.teamId, teamId),
        ),
      });

      if (research) {
        // Reconstruct packet from stored fields
        const companyIntel = research.companyIntel as {
          name?: string;
          size?: string;
          employeeCount?: number;
          founded?: string;
          recentNews?: Array<{ title: string }>;
          buyingSignals?: string[];
        } | null;
        const realtimeContext = research.realtimeContext as {
          lastUpdated?: string;
          companyStatus?: { operational: boolean; majorChanges: string[] };
          riskFactors?: string[];
          recommendedAction?: string;
        } | null;

        const packet: NevaContextPacket = {
          leadId,
          teamId,
          confidence: (research.confidenceScore || 50) / 100,
          summary: {
            company: companyIntel?.name || "Unknown",
            sizeSignal: (companyIntel?.size?.includes("small")
              ? "small"
              : companyIntel?.size?.includes("medium")
                ? "medium"
                : companyIntel?.size?.includes("large")
                  ? "large"
                  : "unknown") as "small" | "medium" | "large" | "unknown",
            yearsInBusiness: companyIntel?.founded
              ? new Date().getFullYear() - parseInt(companyIntel.founded)
              : null,
            employeeEstimate: companyIntel?.employeeCount?.toString() || null,
          },
          signals: {
            recentActivity: companyIntel?.recentNews?.map((n) => n.title) || [],
            negativeSignals: realtimeContext?.riskFactors || [],
            timingSignals: companyIntel?.buyingSignals || [],
          },
          personalization: {
            openingHook: "",
            industryLanguage: [],
            locationReference: "",
            avoidTopics: [],
          },
          recommendations: {
            bestWorker: "gianna",
            tone: "professional",
            cta: realtimeContext?.recommendedAction || "Schedule a quick call",
            discoveryQuestions: [],
          },
          riskFlags: {
            reputation: false,
            legal: false,
            financialDistress:
              realtimeContext?.companyStatus?.operational === false,
          },
          researchedAt: research.enrichedAt || new Date(),
          sources: ["perplexity"],
          cacheKey,
        };

        // Re-cache for future requests
        await this.cacheService.set(cacheKey, packet, this.CACHE_TTL_MS);
        return packet;
      }
    } catch {
      // Table may not exist yet - that's ok
    }

    return null;
  }

  /**
   * Prepare discovery call questions based on NEVA research
   */
  async prepareDiscovery(
    packet: NevaContextPacket,
  ): Promise<NevaDiscoveryPrep> {
    const questions: NevaDiscoveryPrep["openingQuestions"] = [];

    // Generate questions based on signals
    if (packet.signals.recentActivity.length > 0) {
      const activity = packet.signals.recentActivity[0];
      questions.push({
        question: `I noticed ${activity.toLowerCase()}. How's that going for you?`,
        signalSource: "Recent activity",
        priority: 1,
      });
    }

    // Industry-specific question
    if (packet.summary.sizeSignal !== "unknown") {
      questions.push({
        question:
          "What's the biggest challenge you're facing with growth right now?",
        signalSource: "Size signal",
        priority: 2,
      });
    }

    // Years in business question
    if (packet.summary.yearsInBusiness && packet.summary.yearsInBusiness > 5) {
      questions.push({
        question: `You've been in business for ${packet.summary.yearsInBusiness} years - what's changed most in the last year?`,
        signalSource: "Longevity",
        priority: 2,
      });
    }

    // Default question if no signals
    if (questions.length === 0) {
      questions.push({
        question:
          "What's the main thing you'd like to accomplish in the next 90 days?",
        signalSource: "Default",
        priority: 1,
      });
    }

    return {
      leadId: packet.leadId,
      preparedAt: new Date(),
      contextSummary: `${packet.summary.company} is a ${packet.summary.sizeSignal} business${
        packet.summary.yearsInBusiness
          ? ` with ${packet.summary.yearsInBusiness} years in operation`
          : ""
      }.`,
      openingQuestions: questions,
      painPoints: this.extractPainPoints(packet),
      likelyObjections: this.generateObjectionHandlers(packet),
      valueProps: this.generateValueProps(packet),
    };
  }

  /**
   * Evaluate confidence level
   */
  evaluateConfidence(packet: NevaContextPacket): {
    level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
    score: number;
    usePersonalization: boolean;
    requiresReview: boolean;
  } {
    const score = packet.confidence;

    if (score >= 0.8) {
      return {
        level: "HIGH",
        score,
        usePersonalization: true,
        requiresReview: false,
      };
    }
    if (score >= 0.5) {
      return {
        level: "MEDIUM",
        score,
        usePersonalization: true,
        requiresReview: false,
      };
    }
    if (score >= 0.3) {
      return {
        level: "LOW",
        score,
        usePersonalization: false,
        requiresReview: true,
      };
    }
    return {
      level: "NONE",
      score,
      usePersonalization: false,
      requiresReview: true,
    };
  }

  /**
   * Check if there are any risk flags
   */
  hasRiskFlags(packet: NevaContextPacket): boolean {
    return (
      packet.riskFlags.reputation ||
      packet.riskFlags.legal ||
      packet.riskFlags.financialDistress
    );
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private buildResearchQuery(
    business: NevaEnrichRequest["business"],
    context: NevaEnrichRequest["context"],
  ): string {
    const parts = [`Research this business: ${business.name}`];

    if (business.city && business.state) {
      parts.push(`Location: ${business.city}, ${business.state}`);
    }

    if (business.industry) {
      parts.push(`Industry: ${business.industry}`);
    }

    parts.push(
      "Find: years in business, approximate size, recent news/activity, any complaints or legal issues, growth signals.",
    );

    return parts.join(". ");
  }

  private parseResearchResponse(
    leadId: string,
    teamId: string,
    business: NevaEnrichRequest["business"],
    research: string,
    baseConfidence: number,
  ): NevaContextPacket {
    // Parse the research response
    const hasNegative = /lawsuit|complaint|bbb|negative|problem/i.test(
      research,
    );
    const hasGrowth = /expand|growth|hiring|new location|raised/i.test(
      research,
    );

    // Extract years in business
    const yearsMatch = research.match(
      /(\d+)\s*years?\s*(in business|operating|established)/i,
    );
    const yearsInBusiness = yearsMatch ? parseInt(yearsMatch[1]) : null;

    // Adjust confidence based on research quality
    let confidence = baseConfidence;
    if (research.length > 200) confidence += 0.1;
    if (yearsInBusiness) confidence += 0.1;
    if (hasGrowth || hasNegative) confidence += 0.05;
    confidence = Math.min(confidence, 0.95);

    // Determine best worker based on signals
    let bestWorker: "gianna" | "cathy" | "sabrina" = "gianna";
    if (hasGrowth) {
      bestWorker = "sabrina"; // High potential → closer
    } else if (hasNegative) {
      bestWorker = "cathy"; // Needs nurturing approach
    }

    return {
      leadId,
      teamId,
      confidence,

      summary: {
        company: business.name,
        sizeSignal: this.estimateSize(research),
        yearsInBusiness,
        employeeEstimate: this.extractEmployeeCount(research),
      },

      signals: {
        recentActivity: hasGrowth ? this.extractRecentActivity(research) : [],
        negativeSignals: hasNegative
          ? this.extractNegativeSignals(research)
          : [],
        timingSignals: this.extractTimingSignals(research),
      },

      personalization: {
        openingHook: this.generateOpeningHook(business, research),
        industryLanguage: [],
        locationReference: business.city ? `in ${business.city}` : "",
        avoidTopics: hasNegative ? ["complaints", "issues"] : [],
      },

      recommendations: {
        bestWorker,
        tone: hasNegative ? "friendly" : "professional",
        cta: "Schedule a quick 15-minute call",
        discoveryQuestions: [],
      },

      riskFlags: {
        reputation: /bbb complaint|bad review|1 star/i.test(research),
        legal: /lawsuit|sued|litigation|regulatory/i.test(research),
        financialDistress: /bankruptcy|lien|foreclosure|closed/i.test(research),
      },

      researchedAt: new Date(),
      sources: ["perplexity"],
      cacheKey: `neva:${teamId}:${leadId}`,
    };
  }

  private estimateSize(
    research: string,
  ): "small" | "medium" | "large" | "unknown" {
    if (/enterprise|large|500\+|1000\+/i.test(research)) return "large";
    if (/medium|mid-size|50-|100-/i.test(research)) return "medium";
    if (/small|local|family|1-10|owner-operated/i.test(research))
      return "small";
    return "unknown";
  }

  private extractEmployeeCount(research: string): string | null {
    const match = research.match(/(\d+[-–]?\d*)\s*employees/i);
    return match ? match[1] : null;
  }

  private extractRecentActivity(research: string): string[] {
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

  private extractNegativeSignals(research: string): string[] {
    const signals: string[] = [];
    if (/bbb complaint/i.test(research)) signals.push("BBB complaints");
    if (/lawsuit/i.test(research)) signals.push("Legal issues");
    if (/negative review/i.test(research)) signals.push("Negative reviews");
    return signals;
  }

  private extractTimingSignals(research: string): string[] {
    const signals: string[] = [];
    if (/season|busy period|peak/i.test(research)) {
      signals.push("Seasonal business timing");
    }
    if (/just|recently|new/i.test(research)) {
      signals.push("Recent activity detected");
    }
    return signals;
  }

  private generateOpeningHook(
    business: NevaEnrichRequest["business"],
    research: string,
  ): string {
    if (/new location|expand/i.test(research)) {
      return `I saw ${business.name} recently expanded - congrats!`;
    }
    if (/hiring/i.test(research)) {
      return `I noticed ${business.name} is growing the team.`;
    }
    return `I came across ${business.name} and wanted to reach out.`;
  }

  private extractPainPoints(packet: NevaContextPacket): string[] {
    const pains: string[] = [];
    if (packet.summary.sizeSignal === "small") {
      pains.push("Time constraints with small team");
      pains.push("Manual follow-up processes");
    }
    if (packet.signals.recentActivity.includes("Actively hiring")) {
      pains.push("Scaling operations");
    }
    return pains;
  }

  private generateObjectionHandlers(
    packet: NevaContextPacket,
  ): NevaDiscoveryPrep["likelyObjections"] {
    return [
      {
        objection: "I'm too busy right now",
        response:
          "I totally get it - that's exactly why I keep these calls to 15 minutes max.",
      },
      {
        objection: "I'm not interested",
        response:
          "No problem at all. Mind if I ask what you're currently using to handle this?",
      },
      {
        objection: "Send me more info",
        response:
          "Happy to! What specifically would be most helpful for you to see?",
      },
    ];
  }

  private generateValueProps(packet: NevaContextPacket): string[] {
    return [
      "Save hours of manual outreach each week",
      "Get more responses with personalized messaging",
      "Know exactly who to call and when",
    ];
  }

  private async saveResearch(packet: NevaContextPacket): Promise<void> {
    try {
      // Save to nevaEnrichments table
      await this.db.insert(nevaEnrichments).values({
        teamId: packet.teamId,
        leadId: packet.leadId,
        trigger: "manual", // Default trigger for API-initiated research
        companyIntel: {
          name: packet.summary.company,
          size: packet.summary.sizeSignal,
          employeeCount: packet.summary.employeeEstimate
            ? parseInt(packet.summary.employeeEstimate)
            : undefined,
          founded: packet.summary.yearsInBusiness
            ? String(new Date().getFullYear() - packet.summary.yearsInBusiness)
            : undefined,
          recentNews: packet.signals.recentActivity.map((a) => ({
            title: a,
            date: new Date().toISOString(),
            summary: a,
          })),
          buyingSignals: packet.signals.timingSignals,
        },
        realtimeContext: {
          lastUpdated: packet.researchedAt.toISOString(),
          companyStatus: {
            operational: !packet.riskFlags.financialDistress,
            majorChanges: packet.signals.negativeSignals,
          },
          riskFactors: [
            ...(packet.riskFlags.reputation ? ["Reputation concerns"] : []),
            ...(packet.riskFlags.legal ? ["Legal issues"] : []),
            ...(packet.riskFlags.financialDistress
              ? ["Financial distress"]
              : []),
          ],
          recommendedAction: packet.recommendations.cta,
        },
        confidenceScore: Math.round(packet.confidence * 100),
        enrichedAt: packet.researchedAt,
      });
    } catch (error) {
      // Table may not exist or constraint violation - log but don't fail
      this.logger.debug(`[NEVA] Could not save research to DB: ${error}`);
    }
  }
}
