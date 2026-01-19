/**
 * Lead Qualification Rules
 *
 * Status flow: raw → traced → scored → ready/rejected
 *
 * Ready criteria:
 *   phone_contact_grade IN ('A', 'B')
 *   AND phone_activity_score >= 70
 *
 * Reject criteria:
 *   phone_contact_grade IN ('D', 'F')
 *   OR phone_activity_score < 50
 *   OR primary_phone IS NULL
 */

import { PhoneGradeValue } from "../constants";

export type EnrichmentStatus = "raw" | "traced" | "scored" | "ready" | "rejected";

export interface QualificationInput {
  primaryPhone: string | null;
  phoneContactGrade: PhoneGradeValue | null;
  phoneActivityScore: number | null;
  emailContactGrade?: PhoneGradeValue | null;
}

export interface QualificationResult {
  status: "ready" | "rejected" | "review";
  reason: string;
  flags: string[];
}

/**
 * Apply qualification rules to a scored lead
 */
export function qualifyLead(input: QualificationInput): QualificationResult {
  const flags: string[] = [];

  // No phone = reject
  if (!input.primaryPhone) {
    return {
      status: "rejected",
      reason: "no_primary_phone",
      flags: ["no-phone"],
    };
  }

  // No score yet = review
  if (input.phoneContactGrade === null || input.phoneActivityScore === null) {
    return {
      status: "review",
      reason: "missing_score",
      flags: ["needs-scoring"],
    };
  }

  // Grade D or F = reject
  if (input.phoneContactGrade === "D" || input.phoneContactGrade === "F") {
    flags.push("low-grade");
    return {
      status: "rejected",
      reason: `low_grade_${input.phoneContactGrade}`,
      flags,
    };
  }

  // Activity score < 50 = reject
  if (input.phoneActivityScore < 50) {
    flags.push("low-activity");
    return {
      status: "rejected",
      reason: "low_activity_score",
      flags,
    };
  }

  // Grade A or B AND score >= 70 = ready
  if (
    (input.phoneContactGrade === "A" || input.phoneContactGrade === "B") &&
    input.phoneActivityScore >= 70
  ) {
    flags.push("high-quality");
    if (input.phoneContactGrade === "A") flags.push("grade-a");
    return {
      status: "ready",
      reason: "qualified",
      flags,
    };
  }

  // Everything else = review (scored but not campaign-ready)
  flags.push("not-ready");
  return {
    status: "review",
    reason: "not_ready",
    flags,
  };
}

/**
 * Batch qualify leads
 */
export function qualifyLeads(
  leads: QualificationInput[],
): Map<number, QualificationResult> {
  const results = new Map<number, QualificationResult>();

  for (let i = 0; i < leads.length; i++) {
    results.set(i, qualifyLead(leads[i]));
  }

  return results;
}

/**
 * Get qualification stats for a batch
 */
export function getQualificationStats(results: QualificationResult[]): {
  total: number;
  ready: number;
  rejected: number;
  review: number;
  readyRate: number;
  rejectRate: number;
} {
  const total = results.length;
  const ready = results.filter((r) => r.status === "ready").length;
  const rejected = results.filter((r) => r.status === "rejected").length;
  const review = results.filter((r) => r.status === "review").length;

  return {
    total,
    ready,
    rejected,
    review,
    readyRate: total > 0 ? Math.round((ready / total) * 100) : 0,
    rejectRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
  };
}

/**
 * Check if a lead should be included in daily target
 */
export function isTargetReady(input: QualificationInput): boolean {
  const result = qualifyLead(input);
  return result.status === "ready";
}
