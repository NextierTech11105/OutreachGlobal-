/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTACTABILITY DOMAIN MODEL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Core domain types and scoring logic for NextTier's proprietary
 * Contactability Engine. Merges Trestle Real Contact API data with
 * Tracerfy signals to produce a unified ContactabilityProfile.
 *
 * RISK TIERS:
 * - SAFE: Green light for all outreach channels
 * - ELEVATED: Proceed with caution, may need manual review
 * - HIGH: Limit to low-touch channels (email nurture)
 * - BLOCK: Do not contact (litigator, DNC, severe risk)
 *
 * SCORING WEIGHTS:
 * - Phone: 60% activity_score + 40% contact_grade
 * - Email: contact_grade + deliverability + age penalties
 * - Overall: 70% phone + 30% email, with Tracerfy modifiers
 */

import type { TrestleRealContactResponse, TrestleContactGrade } from "../trestle";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Risk tier determines routing strategy and compliance handling
 */
export type RiskTier = "SAFE" | "ELEVATED" | "HIGH" | "BLOCK";

/**
 * Tracerfy signals from internal event history
 */
export interface TracerfySignals {
  /** Is this number on the Do Not Call list? */
  dnc?: boolean;
  /** Carrier risk assessment from previous outreach */
  carrierRisk?: "LOW" | "MEDIUM" | "HIGH";
  /** Number of spam reports received */
  spamReports?: number;
  /** Last successful contact timestamp */
  lastSuccessfulContactAt?: string | null;
  /** Total outbound attempt count */
  outboundAttemptCount?: number;
  /** Previous answer rate (0-100) */
  answerRate?: number;
  /** Has this number been verified as right-party? */
  rightPartyVerified?: boolean;
}

/**
 * Unified ContactabilityProfile merging Trestle + Tracerfy
 */
export interface ContactabilityProfile {
  /** Lead ID from NextTier */
  leadId: string;
  /** Phone contactability score (0-100) */
  phoneContactScore: number;
  /** Email contactability score (0-100) */
  emailContactScore: number;
  /** Overall contactability score (0-100) */
  overallContactabilityScore: number;
  /** Risk tier for routing decisions */
  riskTier: RiskTier;
  /** Raw Trestle API response */
  trestle: TrestleRealContactResponse;
  /** Tracerfy internal signals */
  tracerfy: TracerfySignals;
  /** Profile creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Lightweight profile for UI display and quick lookups
 */
export interface ContactabilitySummary {
  leadId: string;
  overallScore: number;
  riskTier: RiskTier;
  phoneValid: boolean;
  phoneGrade: TrestleContactGrade | null;
  phoneActivityScore: number | null;
  phoneLineType: string | null;
  emailValid: boolean;
  emailGrade: TrestleContactGrade | null;
  isLitigatorRisk: boolean;
  isDNC: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert letter grade to numeric score
 */
export function gradeToScore(grade?: TrestleContactGrade | string | null): number {
  if (!grade) return 0;
  switch (grade.toUpperCase()) {
    case "A":
      return 95;
    case "B":
      return 80;
    case "C":
      return 65;
    case "D":
      return 40;
    case "E":
      return 20;
    case "F":
      return 5;
    default:
      return 0;
  }
}

/**
 * Convert numeric score to letter grade
 */
export function scoreToGrade(score: number): TrestleContactGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 35) return "D";
  return "F";
}

/**
 * Calculate phone contactability score
 *
 * Formula: 60% activity_score + 40% contact_grade
 * Zero out if: invalid phone, litigator risk
 */
export function calculatePhoneContactScore(
  trestle: TrestleRealContactResponse,
  isLitigator: boolean
): number {
  const phone = trestle.phone;

  // Invalid phone = 0
  if (!phone.isValid) return 0;

  // Litigator = 0 (TCPA compliance)
  if (isLitigator) return 0;

  const activityScore = phone.activityScore ?? 0;
  const gradeScore = gradeToScore(phone.contactGrade);

  // Weighted formula: 60% activity + 40% grade
  const score = 0.6 * activityScore + 0.4 * gradeScore;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate email contactability score
 *
 * Formula: contact_grade with deliverability and age penalties
 */
export function calculateEmailContactScore(
  trestle: TrestleRealContactResponse
): number {
  const email = trestle.email;

  // No email data = 0
  if (!email) return 0;

  // Invalid email = 0
  if (!email.isValid) return 0;

  let score = gradeToScore(email.contactGrade);

  // Deliverability check
  const isDeliverable = trestle.addOns?.emailChecks?.isDeliverable;
  if (isDeliverable === false) return 0;

  // Age score penalty (penalize very new emails)
  const ageScore = trestle.addOns?.emailChecks?.ageScore;
  if (ageScore !== null && ageScore !== undefined) {
    if (ageScore < 20) {
      score *= 0.5; // 50% penalty for very new emails
    } else if (ageScore < 40) {
      score *= 0.75; // 25% penalty for moderately new emails
    }
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Check if phone has litigator risk from Trestle add-ons
 */
export function checkLitigatorRisk(trestle: TrestleRealContactResponse): boolean {
  return trestle.addOns?.litigatorChecks?.phoneIsLitigatorRisk === true;
}

/**
 * Determine risk tier based on scores and signals
 */
export function determineRiskTier(
  overallScore: number,
  isLitigator: boolean,
  tracerfy: TracerfySignals
): RiskTier {
  // BLOCK: Litigator or DNC - never contact
  if (isLitigator || tracerfy.dnc) {
    return "BLOCK";
  }

  // HIGH: Very low score or excessive spam reports
  if (overallScore < 30 || (tracerfy.spamReports && tracerfy.spamReports > 3)) {
    return "HIGH";
  }

  // ELEVATED: Below threshold but not critical
  if (overallScore < 60 || tracerfy.carrierRisk === "HIGH") {
    return "ELEVATED";
  }

  // SAFE: Good to go
  return "SAFE";
}

/**
 * Build a complete ContactabilityProfile from Trestle + Tracerfy data
 */
export function buildContactabilityProfile(
  leadId: string,
  trestle: TrestleRealContactResponse,
  tracerfy: TracerfySignals
): ContactabilityProfile {
  const now = new Date();

  // Check litigator risk first
  const isLitigator = checkLitigatorRisk(trestle);

  // Calculate individual scores
  const phoneContactScore = calculatePhoneContactScore(trestle, isLitigator);
  const emailContactScore = calculateEmailContactScore(trestle);

  // Calculate overall score: 70% phone + 30% email
  let overallScore = 0.7 * phoneContactScore + 0.3 * emailContactScore;

  // Apply Tracerfy modifiers
  if (tracerfy.dnc) {
    overallScore = 0;
  }
  if (tracerfy.carrierRisk === "HIGH") {
    overallScore *= 0.4;
  } else if (tracerfy.carrierRisk === "MEDIUM") {
    overallScore *= 0.7;
  }

  // Bonus for verified right-party contacts
  if (tracerfy.rightPartyVerified && overallScore > 0) {
    overallScore = Math.min(100, overallScore * 1.1);
  }

  // Bonus for good historical answer rate
  if (tracerfy.answerRate && tracerfy.answerRate > 50 && overallScore > 0) {
    overallScore = Math.min(100, overallScore * 1.05);
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, overallScore)));

  // Determine risk tier
  const riskTier = determineRiskTier(finalScore, isLitigator, tracerfy);

  return {
    leadId,
    phoneContactScore,
    emailContactScore,
    overallContactabilityScore: finalScore,
    riskTier,
    trestle,
    tracerfy,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a lightweight summary from a full profile
 */
export function createContactabilitySummary(
  profile: ContactabilityProfile
): ContactabilitySummary {
  return {
    leadId: profile.leadId,
    overallScore: profile.overallContactabilityScore,
    riskTier: profile.riskTier,
    phoneValid: profile.trestle.phone.isValid ?? false,
    phoneGrade: profile.trestle.phone.contactGrade,
    phoneActivityScore: profile.trestle.phone.activityScore,
    phoneLineType: profile.trestle.phone.lineType,
    emailValid: profile.trestle.email?.isValid ?? false,
    emailGrade: profile.trestle.email?.contactGrade ?? null,
    isLitigatorRisk: checkLitigatorRisk(profile.trestle),
    isDNC: profile.tracerfy.dnc ?? false,
  };
}

/**
 * Get human-readable risk tier description
 */
export function getRiskTierDescription(tier: RiskTier): string {
  switch (tier) {
    case "SAFE":
      return "Green light - all channels available";
    case "ELEVATED":
      return "Proceed with caution - may need review";
    case "HIGH":
      return "High risk - limit to email nurture only";
    case "BLOCK":
      return "Do not contact - litigator or DNC";
  }
}

/**
 * Get risk tier color for UI display
 */
export function getRiskTierColor(tier: RiskTier): string {
  switch (tier) {
    case "SAFE":
      return "green";
    case "ELEVATED":
      return "yellow";
    case "HIGH":
      return "orange";
    case "BLOCK":
      return "red";
  }
}

console.log("[ContactabilityDomain] Domain model loaded");
