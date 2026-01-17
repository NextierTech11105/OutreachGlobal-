/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROUTING STRATEGY SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Determines optimal outreach strategy based on ContactabilityProfile.
 * Uses contactability scores, risk tiers, and channel preferences to
 * route leads to the most effective communication channel.
 *
 * ROUTE DECISIONS:
 * - BLOCK: Do not contact (litigator, DNC, severe risk)
 * - HIGH_PRIORITY_CALL: Best leads - aggressive cadence
 * - NORMAL_CALL: Good leads - standard cadence
 * - SMS_FIRST: Mobile leads - start with SMS before call
 * - EMAIL_FIRST: Better email than phone - lead with email
 * - NURTURE: Low score - passive nurture only
 *
 * CHANNEL LOGIC:
 * - Mobile + high score (80+) → SMS/Call priority
 * - Good score (60-79) → Normal call cadence
 * - Email better than phone → Email first
 * - Low score (40-59) → Nurture
 * - Very low (<40) or HIGH risk → Email nurture only
 * - BLOCK tier → No contact
 */

import type { ContactabilityProfile, RiskTier } from "../domain/contactability";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Block decision - lead should not be contacted
 */
export interface BlockDecision {
  type: "BLOCK";
  reason: string;
}

/**
 * High priority call decision - best leads
 */
export interface HighPriorityCallDecision {
  type: "HIGH_PRIORITY_CALL";
  maxAttempts: number;
  cadenceMinutes: number;
  preferredChannel: "SMS" | "CALL";
  timeWindow: { start: number; end: number }; // Hours (9-21)
}

/**
 * Normal call decision - good leads
 */
export interface NormalCallDecision {
  type: "NORMAL_CALL";
  maxAttempts: number;
  cadenceMinutes: number;
  timeWindow: { start: number; end: number };
}

/**
 * SMS first decision - start with SMS before calling
 */
export interface SmsFirstDecision {
  type: "SMS_FIRST";
  smsAttempts: number;
  callFallback: boolean;
  cadenceMinutes: number;
}

/**
 * Email first decision - lead with email outreach
 */
export interface EmailFirstDecision {
  type: "EMAIL_FIRST";
  emailAttempts: number;
  cadenceHours: number;
  callFallback: boolean;
}

/**
 * Nurture decision - low-touch passive outreach
 */
export interface NurtureDecision {
  type: "NURTURE";
  channel: "EMAIL" | "SMS";
  cadenceDays: number;
  maxAttempts: number;
}

/**
 * Union of all route decisions
 */
export type RouteDecision =
  | BlockDecision
  | HighPriorityCallDecision
  | NormalCallDecision
  | SmsFirstDecision
  | EmailFirstDecision
  | NurtureDecision;

/**
 * Routing configuration options
 */
export interface RoutingConfig {
  /** Minimum score for high priority (default 80) */
  highPriorityThreshold?: number;
  /** Minimum score for normal priority (default 60) */
  normalPriorityThreshold?: number;
  /** Minimum score for SMS/email outreach (default 40) */
  minimumOutreachThreshold?: number;
  /** Enable SMS as first touch for mobile (default true) */
  smsFirstForMobile?: boolean;
  /** Default time window start hour (default 9) */
  timeWindowStart?: number;
  /** Default time window end hour (default 21) */
  timeWindowEnd?: number;
}

const DEFAULT_CONFIG: Required<RoutingConfig> = {
  highPriorityThreshold: 80,
  normalPriorityThreshold: 60,
  minimumOutreachThreshold: 40,
  smsFirstForMobile: true,
  timeWindowStart: 9,
  timeWindowEnd: 21,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine optimal routing strategy for a lead
 *
 * @param profile - ContactabilityProfile from ContactabilityEngine
 * @param config - Optional routing configuration overrides
 * @returns RouteDecision with channel, cadence, and attempt limits
 */
export function decideRouting(
  profile: ContactabilityProfile,
  config: RoutingConfig = {}
): RouteDecision {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const score = profile.overallContactabilityScore;
  const phoneScore = profile.phoneContactScore;
  const emailScore = profile.emailContactScore;
  const lineType = profile.trestle.phone.lineType;
  const isMobile = lineType === "Mobile";

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOCK: Litigator, DNC, or severe risk
  // ─────────────────────────────────────────────────────────────────────────────
  if (profile.riskTier === "BLOCK") {
    let reason = "Blocked by risk tier";
    if (profile.tracerfy.dnc) {
      reason = "Do Not Call list member";
    } else if (
      profile.trestle.addOns?.litigatorChecks?.phoneIsLitigatorRisk
    ) {
      reason = "TCPA litigator risk detected";
    }
    return { type: "BLOCK", reason };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HIGH RISK: Email nurture only
  // ─────────────────────────────────────────────────────────────────────────────
  if (profile.riskTier === "HIGH") {
    return {
      type: "NURTURE",
      channel: "EMAIL",
      cadenceDays: 14,
      maxAttempts: 3,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HIGH PRIORITY: Best leads (score >= 80, mobile preferred)
  // ─────────────────────────────────────────────────────────────────────────────
  if (score >= cfg.highPriorityThreshold) {
    if (isMobile && cfg.smsFirstForMobile) {
      return {
        type: "HIGH_PRIORITY_CALL",
        maxAttempts: 8,
        cadenceMinutes: 60,
        preferredChannel: "SMS",
        timeWindow: { start: cfg.timeWindowStart, end: cfg.timeWindowEnd },
      };
    }
    return {
      type: "HIGH_PRIORITY_CALL",
      maxAttempts: 6,
      cadenceMinutes: 90,
      preferredChannel: "CALL",
      timeWindow: { start: cfg.timeWindowStart, end: cfg.timeWindowEnd },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NORMAL PRIORITY: Good leads (score >= 60)
  // ─────────────────────────────────────────────────────────────────────────────
  if (score >= cfg.normalPriorityThreshold) {
    // SMS first for mobile numbers
    if (isMobile && cfg.smsFirstForMobile) {
      return {
        type: "SMS_FIRST",
        smsAttempts: 3,
        callFallback: true,
        cadenceMinutes: 240,
      };
    }
    return {
      type: "NORMAL_CALL",
      maxAttempts: 4,
      cadenceMinutes: 240,
      timeWindow: { start: cfg.timeWindowStart, end: cfg.timeWindowEnd },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EMAIL FIRST: Email score better than phone (score >= 40)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    score >= cfg.minimumOutreachThreshold &&
    emailScore > phoneScore &&
    emailScore >= 50
  ) {
    return {
      type: "EMAIL_FIRST",
      emailAttempts: 4,
      cadenceHours: 24,
      callFallback: phoneScore >= 40,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NURTURE: Low score but above minimum threshold
  // ─────────────────────────────────────────────────────────────────────────────
  if (score >= cfg.minimumOutreachThreshold) {
    // Prefer email for landlines/VoIP
    const channel = isMobile ? "SMS" : "EMAIL";
    return {
      type: "NURTURE",
      channel,
      cadenceDays: 7,
      maxAttempts: 5,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VERY LOW: Minimal nurture only
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    type: "NURTURE",
    channel: "EMAIL",
    cadenceDays: 14,
    maxAttempts: 2,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a decision allows phone contact
 */
export function allowsPhoneContact(decision: RouteDecision): boolean {
  return (
    decision.type === "HIGH_PRIORITY_CALL" ||
    decision.type === "NORMAL_CALL" ||
    (decision.type === "SMS_FIRST" && decision.callFallback) ||
    (decision.type === "EMAIL_FIRST" && decision.callFallback)
  );
}

/**
 * Check if a decision allows SMS contact
 */
export function allowsSmsContact(decision: RouteDecision): boolean {
  return (
    decision.type === "HIGH_PRIORITY_CALL" ||
    decision.type === "SMS_FIRST" ||
    (decision.type === "NURTURE" && decision.channel === "SMS")
  );
}

/**
 * Check if a decision allows email contact
 */
export function allowsEmailContact(decision: RouteDecision): boolean {
  return (
    decision.type === "EMAIL_FIRST" ||
    (decision.type === "NURTURE" && decision.channel === "EMAIL")
  );
}

/**
 * Get human-readable description of a route decision
 */
export function getRouteDescription(decision: RouteDecision): string {
  switch (decision.type) {
    case "BLOCK":
      return `Blocked: ${decision.reason}`;
    case "HIGH_PRIORITY_CALL":
      return `High priority ${decision.preferredChannel.toLowerCase()} with ${decision.maxAttempts} attempts every ${decision.cadenceMinutes}min`;
    case "NORMAL_CALL":
      return `Normal call cadence with ${decision.maxAttempts} attempts every ${decision.cadenceMinutes}min`;
    case "SMS_FIRST":
      return `SMS first (${decision.smsAttempts} texts), then ${decision.callFallback ? "call fallback" : "stop"}`;
    case "EMAIL_FIRST":
      return `Email first (${decision.emailAttempts} emails every ${decision.cadenceHours}hrs), then ${decision.callFallback ? "call fallback" : "stop"}`;
    case "NURTURE":
      return `${decision.channel} nurture every ${decision.cadenceDays} days (${decision.maxAttempts} max)`;
  }
}

/**
 * Get priority score for sorting (higher = more urgent)
 */
export function getRoutePriority(decision: RouteDecision): number {
  switch (decision.type) {
    case "HIGH_PRIORITY_CALL":
      return 100;
    case "SMS_FIRST":
      return 80;
    case "NORMAL_CALL":
      return 70;
    case "EMAIL_FIRST":
      return 50;
    case "NURTURE":
      return 20;
    case "BLOCK":
      return 0;
  }
}

/**
 * Batch route multiple profiles
 */
export function batchDecideRouting(
  profiles: ContactabilityProfile[],
  config?: RoutingConfig
): Array<{ leadId: string; decision: RouteDecision }> {
  return profiles.map((profile) => ({
    leadId: profile.leadId,
    decision: decideRouting(profile, config),
  }));
}

/**
 * Group profiles by route type
 */
export function groupByRouteType(
  profiles: ContactabilityProfile[],
  config?: RoutingConfig
): Record<RouteDecision["type"], ContactabilityProfile[]> {
  const result: Record<RouteDecision["type"], ContactabilityProfile[]> = {
    BLOCK: [],
    HIGH_PRIORITY_CALL: [],
    NORMAL_CALL: [],
    SMS_FIRST: [],
    EMAIL_FIRST: [],
    NURTURE: [],
  };

  for (const profile of profiles) {
    const decision = decideRouting(profile, config);
    result[decision.type].push(profile);
  }

  return result;
}

/**
 * Calculate routing statistics for a batch of profiles
 */
export function calculateRoutingStats(
  profiles: ContactabilityProfile[],
  config?: RoutingConfig
): {
  total: number;
  blocked: number;
  highPriority: number;
  normalPriority: number;
  smsFirst: number;
  emailFirst: number;
  nurture: number;
  contactableRate: number;
} {
  const grouped = groupByRouteType(profiles, config);
  const total = profiles.length;
  const blocked = grouped.BLOCK.length;
  const contactable = total - blocked;

  return {
    total,
    blocked,
    highPriority: grouped.HIGH_PRIORITY_CALL.length,
    normalPriority: grouped.NORMAL_CALL.length,
    smsFirst: grouped.SMS_FIRST.length,
    emailFirst: grouped.EMAIL_FIRST.length,
    nurture: grouped.NURTURE.length,
    contactableRate: total > 0 ? Math.round((contactable / total) * 100) : 0,
  };
}

console.log("[RoutingStrategy] Service loaded");
