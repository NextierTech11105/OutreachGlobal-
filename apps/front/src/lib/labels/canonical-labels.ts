/**
 * CANONICAL LABELS - Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════════
 * These labels MUST be used consistently across all inbound processing.
 * DO NOT use hardcoded strings - always reference CANONICAL_LABELS.
 *
 * Categories:
 * - HARD STOP: Short-circuit processing, no further action
 * - DATA CAPTURE: Entity extracted from message
 * - INTENT: Behavioral signal detected
 * - EXECUTION: Queue/routing action taken
 * - HOUSEKEEPING: Administrative state
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const CANONICAL_LABELS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // HARD STOP - These short-circuit processing
  // ─────────────────────────────────────────────────────────────────────────────
  OPTED_OUT: "opted_out", // STOP, UNSUBSCRIBE, etc.
  DO_NOT_CONTACT: "do_not_contact", // Wrong number, blocked, etc.

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA CAPTURE - Entity extracted from inbound message
  // ─────────────────────────────────────────────────────────────────────────────
  EMAIL_CAPTURED: "email_captured", // Email address extracted
  MOBILE_CAPTURED: "mobile_captured", // Mobile phone extracted/confirmed
  CONTACT_VERIFIED: "contact_verified", // Both email AND mobile confirmed
  INBOUND_DATA: "inbound_data", // Any extractable data present

  // ─────────────────────────────────────────────────────────────────────────────
  // INTENT - Behavioral signals detected
  // ─────────────────────────────────────────────────────────────────────────────
  WANTS_CALL: "wants_call", // "Call me", "Give me a ring", etc.
  NEEDS_HELP: "needs_help", // "Help", "Assist", "Support"
  QUESTION_ASKED: "question_asked", // Message contains "?"
  HIGH_INTENT: "high_intent", // Strong buying/engagement signal

  // ─────────────────────────────────────────────────────────────────────────────
  // EXECUTION - Queue/routing actions
  // ─────────────────────────────────────────────────────────────────────────────
  PUSH_TO_CALL_CENTER: "push_to_call_center", // Queued for call center
  CALL_READY: "call_ready", // Ready for immediate call

  // ─────────────────────────────────────────────────────────────────────────────
  // HOUSEKEEPING - Administrative states
  // ─────────────────────────────────────────────────────────────────────────────
  NO_RESPONSE: "no_response", // Lead hasn't responded
  AWAITING_EMAIL: "awaiting_email", // Asked for email, waiting
  AWAITING_PHONE: "awaiting_phone", // Asked for phone, waiting
  NOISE: "noise", // Unclassifiable/spam/gibberish

  // ─────────────────────────────────────────────────────────────────────────────
  // LEGACY COMPATIBILITY - Map to existing tags in codebase
  // ─────────────────────────────────────────────────────────────────────────────
  GOLD_LABEL: "gold_label", // Email + mobile = highest priority
  HIGH_CONTACTABILITY: "high_contactability", // Both contact methods verified
  RESPONDED: "responded", // Lead responded (GREEN tag)
  NEEDS_FOLLOW_UP: "needs_follow_up", // Positive response needs follow-up
  CONTENT_DELIVERED: "content_delivered", // Content link sent
} as const;

export type CanonicalLabel =
  (typeof CANONICAL_LABELS)[keyof typeof CANONICAL_LABELS];

/**
 * Label categories for filtering and grouping
 */
export const LABEL_CATEGORIES = {
  HARD_STOP: [
    CANONICAL_LABELS.OPTED_OUT,
    CANONICAL_LABELS.DO_NOT_CONTACT,
  ] as const,
  DATA_CAPTURE: [
    CANONICAL_LABELS.EMAIL_CAPTURED,
    CANONICAL_LABELS.MOBILE_CAPTURED,
    CANONICAL_LABELS.CONTACT_VERIFIED,
    CANONICAL_LABELS.INBOUND_DATA,
  ] as const,
  INTENT: [
    CANONICAL_LABELS.WANTS_CALL,
    CANONICAL_LABELS.NEEDS_HELP,
    CANONICAL_LABELS.QUESTION_ASKED,
    CANONICAL_LABELS.HIGH_INTENT,
  ] as const,
  EXECUTION: [
    CANONICAL_LABELS.PUSH_TO_CALL_CENTER,
    CANONICAL_LABELS.CALL_READY,
  ] as const,
  HOUSEKEEPING: [
    CANONICAL_LABELS.NO_RESPONSE,
    CANONICAL_LABELS.AWAITING_EMAIL,
    CANONICAL_LABELS.AWAITING_PHONE,
    CANONICAL_LABELS.NOISE,
  ] as const,
} as const;

/**
 * Check if a label is a "hard stop" (short-circuits processing)
 */
export function isHardStop(label: CanonicalLabel): boolean {
  return (LABEL_CATEGORIES.HARD_STOP as readonly string[]).includes(label);
}

/**
 * Check if a label indicates data capture
 */
export function isDataCapture(label: CanonicalLabel): boolean {
  return (LABEL_CATEGORIES.DATA_CAPTURE as readonly string[]).includes(label);
}

/**
 * Check if a label indicates intent signal
 */
export function isIntentSignal(label: CanonicalLabel): boolean {
  return (LABEL_CATEGORIES.INTENT as readonly string[]).includes(label);
}

/**
 * Get all labels in a category
 */
export function getLabelsInCategory(
  category: keyof typeof LABEL_CATEGORIES,
): readonly CanonicalLabel[] {
  return LABEL_CATEGORIES[category];
}

// Log on import
console.log(
  `[CanonicalLabels] Loaded ${Object.keys(CANONICAL_LABELS).length} canonical labels`,
);
