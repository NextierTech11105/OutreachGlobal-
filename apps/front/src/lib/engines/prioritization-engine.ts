/**
 * PRIORITIZATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Machine's brain for selecting the "next best 2,000" leads from millions
 *
 * 5-DIMENSION SCORING:
 * 1. Contactability - Do we have mobile? Email? Valid address?
 * 2. Probability - Role score (Owner=100, CEO=90...), decision maker?
 * 3. Profitability - Company size, revenue signals
 * 4. Situational Fluency - Industry match, timing indicators
 * 5. Predictability - Data quality, response likelihood
 *
 * DAILY CYCLE:
 * - Draw 2,000 highest-scoring leads not yet processed
 * - Skip trace → Bulk SMS → Response capture
 * - Repeat for 10 days = 20,000 total to stabilize the machine
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, notInArray, isNull, desc, sql, or, like } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const DAILY_BATCH_SIZE = 2000; // 2K leads per day
export const STABILIZATION_TARGET = 20000; // 20K to calibrate the machine
export const DAYS_TO_STABILIZE = 10; // 10 days × 2K = 20K

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION 1: CONTACTABILITY (0-25 points)
// ═══════════════════════════════════════════════════════════════════════════════

interface ContactabilityScore {
  score: number;
  hasPhone: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  signals: string[];
}

function scoreContactability(lead: {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  metadata?: Record<string, unknown> | null;
}): ContactabilityScore {
  let score = 0;
  const signals: string[] = [];

  // Phone = 10 points (most valuable for SMS)
  const hasPhone = !!(lead.phone && lead.phone.length >= 10);
  if (hasPhone) {
    score += 10;
    signals.push("has_phone");
  }

  // Email = 8 points (for GOLD LABEL capture)
  const hasEmail = !!(lead.email && lead.email.includes("@"));
  if (hasEmail) {
    score += 8;
    signals.push("has_email");
  }

  // Address completeness = 7 points (for skip trace)
  const hasAddress = !!(lead.address && lead.city && lead.state);
  if (hasAddress) {
    score += 7;
    signals.push("has_address");
  }

  return { score, hasPhone, hasEmail, hasAddress, signals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION 2: PROBABILITY (0-25 points) - Role/Seniority Scoring
// ═══════════════════════════════════════════════════════════════════════════════

const SENIORITY_WEIGHTS: Record<string, number> = {
  owner: 25,
  founder: 24,
  c_suite: 23,
  president: 22,
  partner: 21,
  vp: 20,
  director: 18,
  sales_manager: 16,
  manager: 12,
  other: 5,
  unknown: 0,
};

interface ProbabilityScore {
  score: number;
  seniorityLevel: string;
  isDecisionMaker: boolean;
  signals: string[];
}

function scoreProbability(lead: {
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}): ProbabilityScore {
  const signals: string[] = [];

  // Check metadata for pre-computed seniority
  const meta = lead.metadata as Record<string, unknown> | null;
  const seniority = meta?.seniority as {
    level?: string;
    weight?: number;
    isDecisionMaker?: boolean;
  } | null;

  if (seniority?.level) {
    const level = seniority.level;
    const score = SENIORITY_WEIGHTS[level] || 0;
    const isDecisionMaker = seniority.isDecisionMaker || false;

    if (isDecisionMaker) signals.push("decision_maker");
    signals.push(`seniority:${level}`);

    return { score, seniorityLevel: level, isDecisionMaker, signals };
  }

  // Fallback: Parse title directly
  const title = (lead.title || "").toLowerCase();

  if (title.includes("owner") || title.includes("proprietor")) {
    signals.push("seniority:owner");
    return {
      score: 25,
      seniorityLevel: "owner",
      isDecisionMaker: true,
      signals,
    };
  }
  if (title.includes("ceo") || title.includes("chief")) {
    signals.push("seniority:c_suite");
    return {
      score: 23,
      seniorityLevel: "c_suite",
      isDecisionMaker: true,
      signals,
    };
  }
  if (title.includes("president")) {
    signals.push("seniority:president");
    return {
      score: 22,
      seniorityLevel: "president",
      isDecisionMaker: true,
      signals,
    };
  }
  if (title.includes("partner")) {
    signals.push("seniority:partner");
    return {
      score: 21,
      seniorityLevel: "partner",
      isDecisionMaker: true,
      signals,
    };
  }
  if (title.includes("vp") || title.includes("vice president")) {
    signals.push("seniority:vp");
    return { score: 20, seniorityLevel: "vp", isDecisionMaker: true, signals };
  }
  if (title.includes("director")) {
    signals.push("seniority:director");
    return {
      score: 18,
      seniorityLevel: "director",
      isDecisionMaker: false,
      signals,
    };
  }
  if (title.includes("manager")) {
    signals.push("seniority:manager");
    return {
      score: 12,
      seniorityLevel: "manager",
      isDecisionMaker: false,
      signals,
    };
  }

  return {
    score: 0,
    seniorityLevel: "unknown",
    isDecisionMaker: false,
    signals,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION 3: PROFITABILITY (0-20 points) - Business Size/Revenue
// ═══════════════════════════════════════════════════════════════════════════════

interface ProfitabilityScore {
  score: number;
  companySize: string;
  signals: string[];
}

function scoreProfitability(lead: {
  company?: string | null;
  metadata?: Record<string, unknown> | null;
}): ProfitabilityScore {
  const signals: string[] = [];
  let score = 0;

  const meta = lead.metadata as Record<string, unknown> | null;

  // Employee count from metadata
  const employees = meta?.employees as string | null;
  if (employees) {
    const empLower = employees.toLowerCase();
    if (
      empLower.includes("100") ||
      empLower.includes("250") ||
      empLower.includes("500")
    ) {
      score += 10;
      signals.push("size:medium+");
    } else if (
      empLower.includes("20") ||
      empLower.includes("50") ||
      empLower.includes("10-")
    ) {
      score += 8;
      signals.push("size:small");
    } else if (
      empLower.includes("1-") ||
      empLower.includes("5-") ||
      empLower.includes("micro")
    ) {
      score += 5;
      signals.push("size:micro");
    }
  }

  // Revenue from metadata
  const revenue = meta?.revenue as string | null;
  if (revenue) {
    const revLower = revenue.toLowerCase();
    if (
      revLower.includes("million") ||
      revLower.includes("$1") ||
      revLower.includes("$5")
    ) {
      score += 10;
      signals.push("revenue:high");
    } else if (revLower.includes("$500") || revLower.includes("$250")) {
      score += 7;
      signals.push("revenue:medium");
    } else if (revLower.includes("$100") || revLower.includes("$50")) {
      score += 4;
      signals.push("revenue:low");
    }
  }

  // Has company name = basic profitability signal
  if (lead.company) {
    score += 2;
    signals.push("has_company");
  }

  const companySize =
    signals.find((s) => s.startsWith("size:"))?.replace("size:", "") ||
    "unknown";

  return { score: Math.min(score, 20), companySize, signals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION 4: SITUATIONAL FLUENCY (0-15 points) - Industry/Timing Match
// ═══════════════════════════════════════════════════════════════════════════════

// High-value industries for Campaign 1 (Real Estate Agents)
const TARGET_INDUSTRIES = [
  "real estate",
  "realtor",
  "broker",
  "realty",
  "property",
  "commercial real estate",
  "residential real estate",
];

interface SituationalScore {
  score: number;
  industryMatch: boolean;
  signals: string[];
}

function scoreSituational(
  lead: {
    company?: string | null;
    title?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  targetIndustries: string[] = TARGET_INDUSTRIES,
): SituationalScore {
  const signals: string[] = [];
  let score = 0;

  const company = (lead.company || "").toLowerCase();
  const title = (lead.title || "").toLowerCase();
  const meta = lead.metadata as Record<string, unknown> | null;
  const sicCode = (meta?.sicCode as string) || "";
  const sicDesc = (meta?.sicDescription as string) || "";

  // Industry match from SIC or company name
  let industryMatch = false;
  for (const industry of targetIndustries) {
    if (
      company.includes(industry) ||
      title.includes(industry) ||
      sicDesc.toLowerCase().includes(industry)
    ) {
      industryMatch = true;
      score += 15;
      signals.push(`industry:${industry}`);
      break;
    }
  }

  // SIC code 6531 = Real Estate Agents & Brokers
  if (sicCode.startsWith("6531")) {
    if (!industryMatch) {
      industryMatch = true;
      score += 15;
    }
    signals.push("sic:6531");
  }

  return { score: Math.min(score, 15), industryMatch, signals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION 5: PREDICTABILITY (0-15 points) - Data Quality/Response Likelihood
// ═══════════════════════════════════════════════════════════════════════════════

interface PredictabilityScore {
  score: number;
  dataQuality: "high" | "medium" | "low";
  signals: string[];
}

function scorePredictability(lead: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
}): PredictabilityScore {
  const signals: string[] = [];
  let score = 0;

  // Full name = higher match rate
  if (lead.firstName && lead.lastName) {
    score += 5;
    signals.push("full_name");
  }

  // Personal email domain = higher response rate
  if (lead.email) {
    const domain = lead.email.split("@")[1]?.toLowerCase() || "";
    if (
      !domain.includes("gmail") &&
      !domain.includes("yahoo") &&
      !domain.includes("hotmail")
    ) {
      score += 4; // Business email
      signals.push("business_email");
    } else {
      score += 2; // Personal email still valuable
      signals.push("personal_email");
    }
  }

  // Phone format quality
  if (lead.phone) {
    const digits = lead.phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      score += 3;
      signals.push("valid_phone");
    }
  }

  // Metadata completeness
  const meta = lead.metadata as Record<string, unknown> | null;
  if (meta) {
    const metaKeys = Object.keys(meta).filter(
      (k) => meta[k] !== null && meta[k] !== "",
    );
    if (metaKeys.length >= 5) {
      score += 3;
      signals.push("rich_metadata");
    }
  }

  const dataQuality = score >= 12 ? "high" : score >= 6 ? "medium" : "low";

  return { score: Math.min(score, 15), dataQuality, signals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompositeScore {
  total: number; // 0-100
  dimensions: {
    contactability: ContactabilityScore;
    probability: ProbabilityScore;
    profitability: ProfitabilityScore;
    situational: SituationalScore;
    predictability: PredictabilityScore;
  };
  allSignals: string[];
  tier: "A" | "B" | "C" | "D"; // A=80+, B=60-79, C=40-59, D=<40
}

export function calculateCompositeScore(
  lead: {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    company?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  targetIndustries: string[] = TARGET_INDUSTRIES,
): CompositeScore {
  const contactability = scoreContactability(lead);
  const probability = scoreProbability(lead);
  const profitability = scoreProfitability(lead);
  const situational = scoreSituational(lead, targetIndustries);
  const predictability = scorePredictability(lead);

  const total =
    contactability.score +
    probability.score +
    profitability.score +
    situational.score +
    predictability.score;

  const allSignals = [
    ...contactability.signals,
    ...probability.signals,
    ...profitability.signals,
    ...situational.signals,
    ...predictability.signals,
  ];

  const tier = total >= 80 ? "A" : total >= 60 ? "B" : total >= 40 ? "C" : "D";

  return {
    total,
    dimensions: {
      contactability,
      probability,
      profitability,
      situational,
      predictability,
    },
    allSignals,
    tier,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEXT BEST 2,000 SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueuedLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  title: string | null;
  company: string | null;
  score: number;
  compositeScore: CompositeScore;
}

export interface DailyQueueResult {
  day: number;
  totalProcessed: number;
  remainingToTarget: number;
  leads: QueuedLead[];
  tierBreakdown: { A: number; B: number; C: number; D: number };
  averageScore: number;
}

/**
 * Select the next best 2,000 leads for today's campaign
 * Excludes leads already processed (status != 'new')
 */
export async function selectNextBest2000(
  teamId: string,
  options: {
    excludeStatuses?: string[];
    targetIndustries?: string[];
    batchSize?: number;
  } = {},
): Promise<DailyQueueResult> {
  const {
    excludeStatuses = [
      "contacted",
      "responded",
      "converted",
      "unsubscribed",
      "invalid",
    ],
    targetIndustries = TARGET_INDUSTRIES,
    batchSize = DAILY_BATCH_SIZE,
  } = options;

  // Count total processed for this team
  const processedCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(
      and(
        eq(leads.teamId, teamId),
        or(...excludeStatuses.map((s) => eq(leads.status, s))),
      ),
    );
  const totalProcessed = Number(processedCountResult[0]?.count || 0);

  // Calculate which day we're on
  const day = Math.floor(totalProcessed / DAILY_BATCH_SIZE) + 1;
  const remainingToTarget = Math.max(0, STABILIZATION_TARGET - totalProcessed);

  // Get unprocessed leads (status = 'new' or null)
  const candidateLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.teamId, teamId),
        or(eq(leads.status, "new"), isNull(leads.status)),
      ),
    )
    .limit(batchSize * 3); // Get 3x to have room for scoring

  // Score all candidates
  const scoredLeads: QueuedLead[] = candidateLeads.map((lead) => {
    const compositeScore = calculateCompositeScore(lead, targetIndustries);
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zipCode: lead.zipCode,
      title: lead.title,
      company: lead.company,
      score: compositeScore.total,
      compositeScore,
    };
  });

  // Sort by composite score DESC and take top batchSize
  scoredLeads.sort((a, b) => b.score - a.score);
  const selectedLeads = scoredLeads.slice(0, batchSize);

  // Calculate tier breakdown
  const tierBreakdown = { A: 0, B: 0, C: 0, D: 0 };
  let totalScore = 0;
  for (const lead of selectedLeads) {
    tierBreakdown[lead.compositeScore.tier]++;
    totalScore += lead.score;
  }

  return {
    day,
    totalProcessed,
    remainingToTarget,
    leads: selectedLeads,
    tierBreakdown,
    averageScore:
      selectedLeads.length > 0
        ? Math.round(totalScore / selectedLeads.length)
        : 0,
  };
}

/**
 * Mark leads as queued for processing (update status)
 */
export async function markLeadsAsQueued(
  leadIds: string[],
  queueTag: string = "sms_queue",
): Promise<number> {
  if (leadIds.length === 0) return 0;

  const result = await db
    .update(leads)
    .set({
      status: "queued",
      tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), ${queueTag})`,
      updatedAt: new Date(),
    })
    .where(sql`id = ANY(${leadIds})`);

  return leadIds.length;
}

/**
 * Get stabilization progress
 */
export async function getStabilizationProgress(teamId: string): Promise<{
  day: number;
  totalProcessed: number;
  targetTotal: number;
  percentComplete: number;
  daysRemaining: number;
  onTrack: boolean;
}> {
  const processedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(
      and(
        eq(leads.teamId, teamId),
        or(
          eq(leads.status, "contacted"),
          eq(leads.status, "queued"),
          eq(leads.status, "responded"),
          eq(leads.status, "converted"),
        ),
      ),
    );

  const totalProcessed = Number(processedResult[0]?.count || 0);
  const day = Math.floor(totalProcessed / DAILY_BATCH_SIZE) + 1;
  const percentComplete = Math.round(
    (totalProcessed / STABILIZATION_TARGET) * 100,
  );
  const daysRemaining = Math.max(0, DAYS_TO_STABILIZE - day + 1);

  return {
    day,
    totalProcessed,
    targetTotal: STABILIZATION_TARGET,
    percentComplete,
    daysRemaining,
    onTrack: totalProcessed >= (day - 1) * DAILY_BATCH_SIZE,
  };
}
