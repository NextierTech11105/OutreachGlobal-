/**
 * LEAD SCORING SERVICE (Advisory Only)
 * =====================================
 * Computes priority scores for leads based on signals and behavior patterns.
 *
 * CRITICAL: This service is ADVISORY ONLY
 * - Scores are shown in UI, NEVER auto-executed
 * - Human approval required for all actions
 * - Predictions logged for accuracy tracking
 *
 * Architecture:
 * - Rule-based scoring (deterministic, explainable)
 * - Signal-driven (all features from leadSignals table)
 * - Touch-aware (integrates with 5-touch exhaustion rule)
 * - Human-in-loop (recommendations require approval)
 *
 * Scoring Factors:
 * 1. RECENCY - Recent activity bonus (decay function)
 * 2. ENGAGEMENT - Reply rate and positive response ratio
 * 3. INTENT - HIGH_INTENT signals (email_provided, call_requested)
 * 4. TIMING - Business hours bonus
 * 5. TOUCH_HISTORY - Diminishing returns after each touch
 */

import { redis, isRedisAvailable } from "@/lib/redis";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// Signal types from signals.schema.ts
export type SignalType =
  | "CONTACTED"
  | "REPLIED"
  | "POSITIVE_RESPONSE"
  | "NEGATIVE_RESPONSE"
  | "QUESTION_ASKED"
  | "EMAIL_PROVIDED"
  | "INTERESTED"
  | "HOT_LEAD"
  | "VALUATION_REQUESTED"
  | "CALL_REQUESTED"
  | "MEETING_REQUESTED"
  | "APPOINTMENT_SCHEDULED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_NO_SHOW"
  | "OPTED_OUT"
  | "WRONG_NUMBER"
  | "DO_NOT_CONTACT"
  | "PROFANITY_DETECTED"
  | "ESCALATED_TO_CATHY"
  | "ESCALATED_TO_SABRINA"
  | "ARCHIVED"
  | "REACTIVATED"
  | "NO_RESPONSE_24H"
  | "NO_RESPONSE_72H"
  | "NO_RESPONSE_7D"
  | "NO_RESPONSE_14D"
  | "NO_RESPONSE_30D";

/**
 * Lead signal record (simplified for scoring)
 */
export interface LeadSignalRecord {
  id: string;
  leadId: string;
  signalType: SignalType;
  confidence: number;
  createdAt: Date;
  signalValue?: {
    sentiment?: "positive" | "neutral" | "negative";
    extractedEmail?: string;
    [key: string]: unknown;
  };
}

/**
 * Scoring factor breakdown
 */
export interface ScoringFactors {
  recency: number; // 0-25: Recent activity bonus
  engagement: number; // 0-25: Reply rate and quality
  intent: number; // 0-25: HIGH_INTENT signals
  timing: number; // 0-15: Business hours bonus
  touchHistory: number; // 0-10: Touch count adjustment
}

/**
 * Lead score result
 */
export interface LeadScore {
  leadId: string;
  score: number; // 0-100
  factors: ScoringFactors;
  recommendation: LeadRecommendation;
  confidence: number; // 0-100: How confident we are in this score
  reasoning: string; // Human-readable explanation
  computedAt: Date;

  // Signal summary
  signalCounts: Record<string, number>;
  lastActivityAt?: Date;
  lastReplyAt?: Date;
  touchCount: number;
  hasReplied: boolean;
  hasHighIntent: boolean;

  // Pivot recommendation
  shouldPivot: boolean;
  pivotReason?: string;
}

/**
 * Recommended action (ADVISORY ONLY)
 */
export type LeadRecommendation =
  | "call_now" // High priority - human should call immediately
  | "queue_for_call" // Add to Gianna's call queue
  | "send_sms" // Send next SMS touch
  | "send_email" // Pivot to email sequence
  | "wait" // Too soon for next touch
  | "archive" // Move to cold bucket
  | "do_not_contact"; // Suppressed lead

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  // Weight multipliers (should sum to ~100)
  weights: {
    recency: number; // Default: 25
    engagement: number; // Default: 25
    intent: number; // Default: 25
    timing: number; // Default: 15
    touchHistory: number; // Default: 10
  };

  // Thresholds
  thresholds: {
    callNow: number; // Default: 80
    queueForCall: number; // Default: 60
    sendSms: number; // Default: 40
    archive: number; // Default: 20
  };

  // Decay rates (hours)
  decayRates: {
    recencyHalfLife: number; // Default: 48 (2 days)
    engagementWindow: number; // Default: 168 (7 days)
  };

  // Touch settings
  maxTouches: number; // Default: 5
  minHoursBetweenTouches: number; // Default: 24
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: ScoringConfig = {
  weights: {
    recency: 25,
    engagement: 25,
    intent: 25,
    timing: 15,
    touchHistory: 10,
  },
  thresholds: {
    callNow: 80,
    queueForCall: 60,
    sendSms: 40,
    archive: 20,
  },
  decayRates: {
    recencyHalfLife: 48, // 2 days
    engagementWindow: 168, // 7 days
  },
  maxTouches: 5,
  minHoursBetweenTouches: 24,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL WEIGHTS (Rule-Based Scoring)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Signal weight map for scoring
 * Positive = increases score
 * Negative = decreases score
 */
const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  // High-intent signals (big positive impact)
  EMAIL_PROVIDED: 30,
  CALL_REQUESTED: 25,
  MEETING_REQUESTED: 25,
  VALUATION_REQUESTED: 20,
  HOT_LEAD: 20,
  INTERESTED: 15,
  APPOINTMENT_SCHEDULED: 35,
  APPOINTMENT_CONFIRMED: 40,
  APPOINTMENT_COMPLETED: 50,

  // Engagement signals (moderate positive impact)
  POSITIVE_RESPONSE: 15,
  QUESTION_ASKED: 10,
  REPLIED: 8,
  CONTACTED: 2,
  REACTIVATED: 10,

  // Neutral signals
  ESCALATED_TO_CATHY: 0,
  ESCALATED_TO_SABRINA: 5,

  // Negative signals
  NEGATIVE_RESPONSE: -10,
  APPOINTMENT_CANCELLED: -15,
  APPOINTMENT_NO_SHOW: -20,

  // Suppression signals (immediately disqualifying)
  OPTED_OUT: -100,
  WRONG_NUMBER: -100,
  DO_NOT_CONTACT: -100,
  PROFANITY_DETECTED: -50,
  ARCHIVED: -30,

  // Silence signals (moderate negative impact)
  NO_RESPONSE_24H: -2,
  NO_RESPONSE_72H: -5,
  NO_RESPONSE_7D: -10,
  NO_RESPONSE_14D: -20,
  NO_RESPONSE_30D: -30,
};

/**
 * High-intent signal types (trigger call recommendation)
 */
const HIGH_INTENT_SIGNALS: SignalType[] = [
  "EMAIL_PROVIDED",
  "CALL_REQUESTED",
  "MEETING_REQUESTED",
  "VALUATION_REQUESTED",
  "HOT_LEAD",
  "INTERESTED",
  "APPOINTMENT_SCHEDULED",
];

/**
 * Suppression signal types (immediately disqualify)
 */
const SUPPRESSION_SIGNALS: SignalType[] = [
  "OPTED_OUT",
  "WRONG_NUMBER",
  "DO_NOT_CONTACT",
];

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const SCORE_CACHE_PREFIX = "lead_score:";
const SCORE_CACHE_TTL = 300; // 5 minutes

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD SCORING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class LeadScoringService {
  private static instance: LeadScoringService;
  private config: ScoringConfig = DEFAULT_CONFIG;
  private redisAvailable = false;

  private constructor() {
    this.redisAvailable = isRedisAvailable();
    console.log("[LeadScoring] Service initialized");
  }

  public static getInstance(): LeadScoringService {
    if (!LeadScoringService.instance) {
      LeadScoringService.instance = new LeadScoringService();
    }
    return LeadScoringService.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────

  public updateConfig(config: Partial<ScoringConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      weights: { ...this.config.weights, ...config.weights },
      thresholds: { ...this.config.thresholds, ...config.thresholds },
      decayRates: { ...this.config.decayRates, ...config.decayRates },
    };
  }

  public getConfig(): ScoringConfig {
    return { ...this.config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE SCORING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Compute lead score from signals
   * This is the main scoring function - ADVISORY ONLY
   */
  public computeScore(
    leadId: string,
    signals: LeadSignalRecord[],
    touchCount: number = 0,
    lastTouchAt?: Date,
  ): LeadScore {
    const now = new Date();

    // Check for suppression first
    const suppression = this.checkSuppression(signals);
    if (suppression.isSuppressed) {
      return this.createSuppressedScore(leadId, suppression.reason, signals);
    }

    // Compute signal counts
    const signalCounts = this.countSignals(signals);

    // Find key timestamps
    const lastActivityAt = this.findLastActivity(signals);
    const lastReplyAt = this.findLastReply(signals);
    const hasReplied =
      signalCounts["REPLIED"] > 0 || signalCounts["POSITIVE_RESPONSE"] > 0;
    const hasHighIntent = HIGH_INTENT_SIGNALS.some(
      (type) => (signalCounts[type] || 0) > 0,
    );

    // Compute scoring factors
    const factors = this.computeFactors(
      signals,
      signalCounts,
      touchCount,
      lastTouchAt,
      now,
    );

    // Calculate total score (weighted sum)
    const rawScore =
      factors.recency * (this.config.weights.recency / 25) +
      factors.engagement * (this.config.weights.engagement / 25) +
      factors.intent * (this.config.weights.intent / 25) +
      factors.timing * (this.config.weights.timing / 15) +
      factors.touchHistory * (this.config.weights.touchHistory / 10);

    // Clamp score to 0-100
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Determine recommendation
    const { recommendation, shouldPivot, pivotReason } =
      this.determineRecommendation(
        score,
        hasReplied,
        hasHighIntent,
        touchCount,
        lastTouchAt,
        now,
      );

    // Calculate confidence (higher with more signals)
    const signalCount = signals.length;
    const confidence = Math.min(100, 50 + signalCount * 5);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      score,
      factors,
      recommendation,
      hasReplied,
      hasHighIntent,
      touchCount,
    );

    return {
      leadId,
      score,
      factors,
      recommendation,
      confidence,
      reasoning,
      computedAt: now,
      signalCounts,
      lastActivityAt,
      lastReplyAt,
      touchCount,
      hasReplied,
      hasHighIntent,
      shouldPivot,
      pivotReason,
    };
  }

  /**
   * Batch score multiple leads
   */
  public computeScores(
    leads: Array<{
      leadId: string;
      signals: LeadSignalRecord[];
      touchCount?: number;
      lastTouchAt?: Date;
    }>,
  ): LeadScore[] {
    return leads.map((lead) =>
      this.computeScore(
        lead.leadId,
        lead.signals,
        lead.touchCount,
        lead.lastTouchAt,
      ),
    );
  }

  /**
   * Get cached score or compute new one
   */
  public async getCachedScore(
    leadId: string,
    signals: LeadSignalRecord[],
    touchCount?: number,
    lastTouchAt?: Date,
  ): Promise<LeadScore> {
    // Try cache first
    if (this.redisAvailable) {
      try {
        const cached = await redis.get<LeadScore>(
          `${SCORE_CACHE_PREFIX}${leadId}`,
        );
        if (cached) {
          // Check if cache is still valid (signals haven't changed)
          const latestSignal = signals.reduce(
            (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
            new Date(0),
          );
          const cachedTime = new Date(cached.computedAt);

          if (latestSignal <= cachedTime) {
            return {
              ...cached,
              computedAt: new Date(cached.computedAt),
              lastActivityAt: cached.lastActivityAt
                ? new Date(cached.lastActivityAt)
                : undefined,
              lastReplyAt: cached.lastReplyAt
                ? new Date(cached.lastReplyAt)
                : undefined,
            };
          }
        }
      } catch (error) {
        console.error("[LeadScoring] Cache read error:", error);
      }
    }

    // Compute fresh score
    const score = this.computeScore(leadId, signals, touchCount, lastTouchAt);

    // Cache result
    if (this.redisAvailable) {
      try {
        await redis.set(
          `${SCORE_CACHE_PREFIX}${leadId}`,
          JSON.stringify(score),
          { ex: SCORE_CACHE_TTL },
        );
      } catch (error) {
        console.error("[LeadScoring] Cache write error:", error);
      }
    }

    return score;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FACTOR COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Compute all scoring factors
   */
  private computeFactors(
    signals: LeadSignalRecord[],
    signalCounts: Record<string, number>,
    touchCount: number,
    lastTouchAt: Date | undefined,
    now: Date,
  ): ScoringFactors {
    return {
      recency: this.computeRecencyFactor(signals, now),
      engagement: this.computeEngagementFactor(signals, signalCounts),
      intent: this.computeIntentFactor(signalCounts),
      timing: this.computeTimingFactor(now),
      touchHistory: this.computeTouchHistoryFactor(
        touchCount,
        lastTouchAt,
        now,
      ),
    };
  }

  /**
   * RECENCY FACTOR (0-25)
   * Higher score for more recent activity
   * Exponential decay with configurable half-life
   */
  private computeRecencyFactor(signals: LeadSignalRecord[], now: Date): number {
    if (signals.length === 0) return 0;

    const lastActivity = this.findLastActivity(signals);
    if (!lastActivity) return 0;

    const hoursSinceActivity =
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    const halfLife = this.config.decayRates.recencyHalfLife;

    // Exponential decay: score = 25 * 0.5^(hours/halfLife)
    const decayFactor = Math.pow(0.5, hoursSinceActivity / halfLife);
    return Math.round(25 * decayFactor);
  }

  /**
   * ENGAGEMENT FACTOR (0-25)
   * Based on reply rate and response sentiment
   */
  private computeEngagementFactor(
    signals: LeadSignalRecord[],
    signalCounts: Record<string, number>,
  ): number {
    let score = 0;

    // Reply bonus
    if (signalCounts["REPLIED"] > 0) {
      score += 10;
    }

    // Positive response bonus
    if (signalCounts["POSITIVE_RESPONSE"] > 0) {
      score += 8;
    }

    // Question asked bonus (shows engagement)
    if (signalCounts["QUESTION_ASKED"] > 0) {
      score += 5;
    }

    // Negative response penalty
    if (signalCounts["NEGATIVE_RESPONSE"] > 0) {
      score -= 5;
    }

    // No response penalties
    if (signalCounts["NO_RESPONSE_7D"] > 0) {
      score -= 5;
    }
    if (signalCounts["NO_RESPONSE_30D"] > 0) {
      score -= 10;
    }

    return Math.max(0, Math.min(25, score));
  }

  /**
   * INTENT FACTOR (0-25)
   * High-intent signals get big bonuses
   */
  private computeIntentFactor(signalCounts: Record<string, number>): number {
    let score = 0;

    // Apply signal weights
    for (const signalType of HIGH_INTENT_SIGNALS) {
      if (signalCounts[signalType] > 0) {
        const weight = SIGNAL_WEIGHTS[signalType] || 0;
        // Diminishing returns for multiple signals of same type
        score += weight * Math.min(signalCounts[signalType], 2);
      }
    }

    // Normalize to 0-25 range
    return Math.max(0, Math.min(25, Math.round(score / 3)));
  }

  /**
   * TIMING FACTOR (0-15)
   * Bonus for business hours (lead more likely to respond)
   */
  private computeTimingFactor(now: Date): number {
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend penalty
    if (day === 0 || day === 6) {
      return 5;
    }

    // Business hours bonus (9 AM - 5 PM)
    if (hour >= 9 && hour < 17) {
      return 15;
    }

    // Early morning / evening (7-9 AM, 5-7 PM)
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      return 10;
    }

    // Night time
    return 3;
  }

  /**
   * TOUCH HISTORY FACTOR (0-10)
   * Diminishing returns after each touch
   * Negative after max touches (lead exhausted)
   */
  private computeTouchHistoryFactor(
    touchCount: number,
    lastTouchAt: Date | undefined,
    now: Date,
  ): number {
    // No touches yet = full bonus
    if (touchCount === 0) {
      return 10;
    }

    // Exhausted leads get penalty
    if (touchCount >= this.config.maxTouches) {
      return 0;
    }

    // Diminishing returns: 10 - (touchCount * 2)
    let score = 10 - touchCount * 2;

    // Recent touch penalty (too soon to touch again)
    if (lastTouchAt) {
      const hoursSinceTouch =
        (now.getTime() - lastTouchAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceTouch < this.config.minHoursBetweenTouches) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(10, score));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RECOMMENDATION LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Determine recommendation based on score and context
   */
  private determineRecommendation(
    score: number,
    hasReplied: boolean,
    hasHighIntent: boolean,
    touchCount: number,
    lastTouchAt: Date | undefined,
    now: Date,
  ): {
    recommendation: LeadRecommendation;
    shouldPivot: boolean;
    pivotReason?: string;
  } {
    // Check if too soon for next touch
    if (lastTouchAt) {
      const hoursSinceTouch =
        (now.getTime() - lastTouchAt.getTime()) / (1000 * 60 * 60);
      if (
        hoursSinceTouch < this.config.minHoursBetweenTouches &&
        !hasHighIntent
      ) {
        return {
          recommendation: "wait",
          shouldPivot: false,
        };
      }
    }

    // High-intent leads get call recommendation
    if (hasHighIntent) {
      if (score >= this.config.thresholds.callNow) {
        return {
          recommendation: "call_now",
          shouldPivot: true,
          pivotReason: "High-intent signal detected",
        };
      }
      return {
        recommendation: "queue_for_call",
        shouldPivot: true,
        pivotReason: "Lead showed interest",
      };
    }

    // Replied leads may need call escalation
    if (hasReplied && score >= this.config.thresholds.queueForCall) {
      return {
        recommendation: "queue_for_call",
        shouldPivot: true,
        pivotReason: "Lead engaged via SMS",
      };
    }

    // Check if exhausted (5 touches)
    if (touchCount >= this.config.maxTouches) {
      if (score >= this.config.thresholds.archive) {
        return {
          recommendation: "send_email",
          shouldPivot: true,
          pivotReason: "SMS exhausted - pivot to email",
        };
      }
      return {
        recommendation: "archive",
        shouldPivot: true,
        pivotReason: "No response after 5 touches",
      };
    }

    // Standard scoring thresholds
    if (score >= this.config.thresholds.callNow) {
      return {
        recommendation: "call_now",
        shouldPivot: true,
        pivotReason: "High lead score",
      };
    }

    if (score >= this.config.thresholds.queueForCall) {
      return {
        recommendation: "queue_for_call",
        shouldPivot: false,
      };
    }

    if (score >= this.config.thresholds.sendSms) {
      return {
        recommendation: "send_sms",
        shouldPivot: false,
      };
    }

    if (score >= this.config.thresholds.archive) {
      return {
        recommendation: "send_sms",
        shouldPivot: false,
      };
    }

    return {
      recommendation: "archive",
      shouldPivot: true,
      pivotReason: "Low engagement score",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check for suppression signals
   */
  private checkSuppression(signals: LeadSignalRecord[]): {
    isSuppressed: boolean;
    reason: string;
  } {
    for (const signal of signals) {
      if (SUPPRESSION_SIGNALS.includes(signal.signalType)) {
        return {
          isSuppressed: true,
          reason: signal.signalType,
        };
      }
    }
    return { isSuppressed: false, reason: "" };
  }

  /**
   * Create suppressed lead score
   */
  private createSuppressedScore(
    leadId: string,
    reason: string,
    signals: LeadSignalRecord[],
  ): LeadScore {
    return {
      leadId,
      score: 0,
      factors: {
        recency: 0,
        engagement: 0,
        intent: 0,
        timing: 0,
        touchHistory: 0,
      },
      recommendation: "do_not_contact",
      confidence: 100,
      reasoning: `Lead is suppressed: ${reason}`,
      computedAt: new Date(),
      signalCounts: this.countSignals(signals),
      lastActivityAt: this.findLastActivity(signals),
      lastReplyAt: this.findLastReply(signals),
      touchCount: 0,
      hasReplied: false,
      hasHighIntent: false,
      shouldPivot: true,
      pivotReason: `Suppressed: ${reason}`,
    };
  }

  /**
   * Count signals by type
   */
  private countSignals(signals: LeadSignalRecord[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const signal of signals) {
      counts[signal.signalType] = (counts[signal.signalType] || 0) + 1;
    }
    return counts;
  }

  /**
   * Find last activity timestamp
   */
  private findLastActivity(signals: LeadSignalRecord[]): Date | undefined {
    if (signals.length === 0) return undefined;
    return signals.reduce(
      (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
      signals[0].createdAt,
    );
  }

  /**
   * Find last reply timestamp
   */
  private findLastReply(signals: LeadSignalRecord[]): Date | undefined {
    const replySignals = signals.filter(
      (s) =>
        s.signalType === "REPLIED" ||
        s.signalType === "POSITIVE_RESPONSE" ||
        s.signalType === "NEGATIVE_RESPONSE" ||
        s.signalType === "QUESTION_ASKED",
    );
    if (replySignals.length === 0) return undefined;
    return replySignals.reduce(
      (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
      replySignals[0].createdAt,
    );
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    score: number,
    factors: ScoringFactors,
    recommendation: LeadRecommendation,
    hasReplied: boolean,
    hasHighIntent: boolean,
    touchCount: number,
  ): string {
    const parts: string[] = [];

    // Score summary
    if (score >= 80) {
      parts.push("High-priority lead");
    } else if (score >= 60) {
      parts.push("Good engagement");
    } else if (score >= 40) {
      parts.push("Moderate interest");
    } else {
      parts.push("Low engagement");
    }

    // Key factors
    if (hasHighIntent) {
      parts.push("showed high intent");
    }
    if (hasReplied) {
      parts.push("has replied");
    }
    if (factors.recency >= 20) {
      parts.push("recently active");
    }
    if (touchCount >= 4) {
      parts.push(`${touchCount} touches sent`);
    }

    // Recommendation context
    switch (recommendation) {
      case "call_now":
        parts.push("→ Call immediately");
        break;
      case "queue_for_call":
        parts.push("→ Add to call queue");
        break;
      case "send_sms":
        parts.push(`→ Send touch ${touchCount + 1}`);
        break;
      case "send_email":
        parts.push("→ Pivot to email");
        break;
      case "wait":
        parts.push("→ Wait before next touch");
        break;
      case "archive":
        parts.push("→ Archive (cold bucket)");
        break;
      case "do_not_contact":
        parts.push("→ DNC");
        break;
    }

    return parts.join(", ");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get high-priority leads for call queue
   */
  public filterHighPriorityLeads(
    scores: LeadScore[],
    threshold: number = 60,
  ): LeadScore[] {
    return scores
      .filter((s) => s.score >= threshold && !s.shouldPivot)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get leads ready for next SMS touch
   */
  public filterLeadsForSMS(scores: LeadScore[]): LeadScore[] {
    return scores
      .filter(
        (s) =>
          s.recommendation === "send_sms" &&
          !s.shouldPivot &&
          s.touchCount < this.config.maxTouches,
      )
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get leads to pivot (exhausted or replied)
   */
  public filterLeadsToPivot(scores: LeadScore[]): LeadScore[] {
    return scores.filter((s) => s.shouldPivot);
  }

  /**
   * Invalidate cached score
   */
  public async invalidateScore(leadId: string): Promise<void> {
    if (this.redisAvailable) {
      try {
        await redis.del(`${SCORE_CACHE_PREFIX}${leadId}`);
      } catch (error) {
        console.error("[LeadScoring] Cache invalidation error:", error);
      }
    }
  }
}

// Export singleton instance
export const leadScoringService = LeadScoringService.getInstance();
