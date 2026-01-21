/**
 * NEVA Confidence Thresholds
 *
 * Determines how much to trust NEVA's research output
 */

import type { NevaConfidenceResult, NevaConfidenceLevel, NevaContextPacket } from "./types";

// =============================================================================
// THRESHOLDS
// =============================================================================

export const NEVA_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,          // Auto-inject personalization into SMS
  MEDIUM: 0.60,        // Optional - Copilot decides
  LOW: 0.40,           // Ignore NEVA output, use generic
  RISK_FLAG_THRESHOLD: 0.50, // Below this, don't use any NEVA output
} as const;

// =============================================================================
// CONFIDENCE EVALUATION
// =============================================================================

/**
 * Evaluate NEVA confidence level
 * Returns whether to use personalization and if review is needed
 */
export function evaluateConfidence(packet: NevaContextPacket | null): NevaConfidenceResult {
  // No packet = no confidence
  if (!packet) {
    return {
      level: "NONE",
      score: 0,
      use_personalization: false,
      requires_review: false,
    };
  }

  const score = packet.confidence;

  // Check for risk flags first
  const hasRiskFlag =
    packet.risk_flags.reputation ||
    packet.risk_flags.legal ||
    packet.risk_flags.financial_distress;

  if (hasRiskFlag) {
    return {
      level: "LOW",
      score,
      use_personalization: false,
      requires_review: true, // Human must review risk flags
    };
  }

  // High confidence - auto-inject
  if (score >= NEVA_CONFIDENCE_THRESHOLDS.HIGH) {
    return {
      level: "HIGH",
      score,
      use_personalization: true,
      requires_review: false,
    };
  }

  // Medium confidence - Copilot decides
  if (score >= NEVA_CONFIDENCE_THRESHOLDS.MEDIUM) {
    return {
      level: "MEDIUM",
      score,
      use_personalization: true, // Use it but Copilot can override
      requires_review: false,
    };
  }

  // Low confidence - ignore
  if (score >= NEVA_CONFIDENCE_THRESHOLDS.LOW) {
    return {
      level: "LOW",
      score,
      use_personalization: false,
      requires_review: false,
    };
  }

  // Very low / no confidence
  return {
    level: "NONE",
    score,
    use_personalization: false,
    requires_review: false,
  };
}

/**
 * Check if any risk flag is set
 */
export function hasRiskFlags(packet: NevaContextPacket | null): boolean {
  if (!packet) return false;

  return (
    packet.risk_flags.reputation ||
    packet.risk_flags.legal ||
    packet.risk_flags.financial_distress
  );
}

/**
 * Get confidence color for UI
 */
export function getConfidenceColor(level: NevaConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "#22C55E"; // Green
    case "MEDIUM":
      return "#F59E0B"; // Amber
    case "LOW":
      return "#F97316"; // Orange
    case "NONE":
      return "#374151"; // Charcoal
    default:
      return "#374151";
  }
}
