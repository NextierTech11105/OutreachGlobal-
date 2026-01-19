/**
 * Lead Prioritization Engine
 *
 * Priority order:
 * 1. Highest scored Trestle mobiles (Grade A, activity >= 90)
 * 2. Grade A mobiles (activity >= 70)
 * 3. Grade B mobiles (activity >= 70)
 * 4. Grade A non-mobiles
 * 5. Grade B non-mobiles
 * 6. Everything else
 *
 * Speed. Fluidity. Best contacts first.
 */

import { PhoneGradeValue, PhoneTypeValue } from "../constants";

export interface PrioritizedLead {
  leadId: string;
  phone: string;
  phoneType: PhoneTypeValue;
  grade: PhoneGradeValue;
  activityScore: number;
  priorityScore: number;
  priorityTier: 1 | 2 | 3 | 4 | 5 | 6;
  contactOrder: number;
}

export interface PrioritizationInput {
  leadId: string;
  phone: string;
  phoneType: PhoneTypeValue;
  grade: PhoneGradeValue;
  activityScore: number;
}

/**
 * Calculate priority score for a single lead
 * Higher score = higher priority
 */
export function calculatePriorityScore(input: PrioritizationInput): number {
  let score = 0;

  // Base score from activity (0-100)
  score += input.activityScore;

  // Grade multiplier
  switch (input.grade) {
    case "A":
      score *= 2.0;
      break;
    case "B":
      score *= 1.5;
      break;
    case "C":
      score *= 1.0;
      break;
    case "D":
      score *= 0.5;
      break;
    case "F":
      score *= 0.1;
      break;
  }

  // Phone type bonus
  if (input.phoneType === "mobile") {
    score += 100; // Major boost for mobile
  } else if (input.phoneType === "nonFixedVoIP") {
    score += 30; // Small boost for non-fixed VoIP (often mobile-like)
  }

  return Math.round(score);
}

/**
 * Determine priority tier
 */
export function getPriorityTier(input: PrioritizationInput): 1 | 2 | 3 | 4 | 5 | 6 {
  const isMobile = input.phoneType === "mobile";

  // Tier 1: Grade A mobile with 90+ activity
  if (isMobile && input.grade === "A" && input.activityScore >= 90) {
    return 1;
  }

  // Tier 2: Grade A mobile with 70+ activity
  if (isMobile && input.grade === "A" && input.activityScore >= 70) {
    return 2;
  }

  // Tier 3: Grade B mobile with 70+ activity
  if (isMobile && input.grade === "B" && input.activityScore >= 70) {
    return 3;
  }

  // Tier 4: Grade A non-mobile
  if (input.grade === "A") {
    return 4;
  }

  // Tier 5: Grade B non-mobile
  if (input.grade === "B") {
    return 5;
  }

  // Tier 6: Everything else
  return 6;
}

/**
 * Prioritize a batch of leads
 * Returns sorted array with highest priority first
 */
export function prioritizeLeads(leads: PrioritizationInput[]): PrioritizedLead[] {
  const prioritized: PrioritizedLead[] = leads.map((lead) => ({
    ...lead,
    priorityScore: calculatePriorityScore(lead),
    priorityTier: getPriorityTier(lead),
    contactOrder: 0, // Will be set after sorting
  }));

  // Sort by tier first, then by score within tier
  prioritized.sort((a, b) => {
    if (a.priorityTier !== b.priorityTier) {
      return a.priorityTier - b.priorityTier; // Lower tier = higher priority
    }
    return b.priorityScore - a.priorityScore; // Higher score = higher priority
  });

  // Assign contact order
  prioritized.forEach((lead, index) => {
    lead.contactOrder = index + 1;
  });

  return prioritized;
}

/**
 * Get top N leads for campaign
 * Highest scored Trestle mobiles first
 */
export function getTopLeads(
  leads: PrioritizationInput[],
  count: number,
): PrioritizedLead[] {
  const prioritized = prioritizeLeads(leads);
  return prioritized.slice(0, count);
}

/**
 * Split leads into tiers for reporting
 */
export function getTierBreakdown(
  leads: PrioritizedLead[],
): Record<number, { count: number; percentage: number }> {
  const total = leads.length;
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const lead of leads) {
    tierCounts[lead.priorityTier]++;
  }

  const breakdown: Record<number, { count: number; percentage: number }> = {};
  for (let tier = 1; tier <= 6; tier++) {
    breakdown[tier] = {
      count: tierCounts[tier],
      percentage: total > 0 ? Math.round((tierCounts[tier] / total) * 100) : 0,
    };
  }

  return breakdown;
}

/**
 * Get campaign-ready leads for daily target
 * Only Tier 1-3 (mobiles with Grade A/B and 70+ activity)
 */
export function getCampaignReadyLeads(
  leads: PrioritizationInput[],
  targetCount: number,
): PrioritizedLead[] {
  const prioritized = prioritizeLeads(leads);

  // Filter to tier 1-3 only (campaign-ready mobiles)
  const campaignReady = prioritized.filter((l) => l.priorityTier <= 3);

  return campaignReady.slice(0, targetCount);
}

/**
 * Get stats summary for prioritized leads
 */
export function getPrioritizationStats(leads: PrioritizedLead[]): {
  total: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  mobileCount: number;
  avgPriorityScore: number;
  avgActivityScore: number;
  campaignReadyCount: number;
} {
  const tier1 = leads.filter((l) => l.priorityTier === 1);
  const tier2 = leads.filter((l) => l.priorityTier === 2);
  const tier3 = leads.filter((l) => l.priorityTier === 3);
  const mobiles = leads.filter((l) => l.phoneType === "mobile");
  const campaignReady = leads.filter((l) => l.priorityTier <= 3);

  const avgPriority =
    leads.length > 0
      ? Math.round(leads.reduce((sum, l) => sum + l.priorityScore, 0) / leads.length)
      : 0;

  const avgActivity =
    leads.length > 0
      ? Math.round(leads.reduce((sum, l) => sum + l.activityScore, 0) / leads.length)
      : 0;

  return {
    total: leads.length,
    tier1Count: tier1.length,
    tier2Count: tier2.length,
    tier3Count: tier3.length,
    mobileCount: mobiles.length,
    avgPriorityScore: avgPriority,
    avgActivityScore: avgActivity,
    campaignReadyCount: campaignReady.length,
  };
}
