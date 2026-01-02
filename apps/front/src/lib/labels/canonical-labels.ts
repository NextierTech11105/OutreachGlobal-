/**
 * CANONICAL LABELS - Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════════
 * These labels MUST be used consistently across ALL inbound processing.
 * DO NOT use ad-hoc tag strings - always reference CANONICAL_LABELS.
 *
 * Labels are applied automatically based on inbound message content.
 * Backend is source of truth - UI only renders state.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Canonical labels for inbound processing
 * Grouped by category for clarity
 */
export const CANONICAL_LABELS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HARD STOP (short-circuit processing - no further action)
  // ═══════════════════════════════════════════════════════════════════════════
  OPTED_OUT: "opted_out", // STOP, UNSUBSCRIBE, etc.
  DO_NOT_CONTACT: "do_not_contact", // Wrong number, blocked, explicit refusal

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA CAPTURE (contact information extracted from message)
  // ═══════════════════════════════════════════════════════════════════════════
  EMAIL_CAPTURED: "email_captured", // Email address extracted from message
  MOBILE_CAPTURED: "mobile_captured", // Mobile phone extracted/confirmed
  CONTACT_VERIFIED: "contact_verified", // BOTH email AND mobile confirmed
  INBOUND_DATA: "inbound_data", // Any structured data extracted from inbound

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENT / SIGNAL (lead engagement indicators)
  // ═══════════════════════════════════════════════════════════════════════════
  WANTS_CALL: "wants_call", // "Call me", "Give me a ring", etc.
  NEEDS_HELP: "needs_help", // "Help", "Assist", "Support", "Can you"
  QUESTION_ASKED: "question_asked", // Message contains "?"
  HIGH_INTENT: "high_intent", // Strong buying signal (YES + interest keywords)

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTION (routing and queue status)
  // ═══════════════════════════════════════════════════════════════════════════
  PUSH_TO_CALL_CENTER: "push_to_call_center", // Queued for Phone Center
  CALL_READY: "call_ready", // Ready for immediate call

  // ═══════════════════════════════════════════════════════════════════════════
  // HOUSEKEEPING (workflow state tracking)
  // ═══════════════════════════════════════════════════════════════════════════
  NO_RESPONSE: "no_response", // Lead hasn't responded (applied after timeout)
  AWAITING_EMAIL: "awaiting_email", // Asked for email, waiting for response
  AWAITING_PHONE: "awaiting_phone", // Asked for phone, waiting for response
  NOISE: "noise", // Unclassifiable, spam, or gibberish

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED / COMPOSITE LABELS (Easify-style display labels)
  // ═══════════════════════════════════════════════════════════════════════════
  MOBILE_AND_EMAIL: "mobile_and_email", // GOLD: Both mobile + email captured
  HOT_LEAD: "hot_lead", // Qualified hot lead ready for call

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY/COMPATIBILITY (for existing code)
  // ═══════════════════════════════════════════════════════════════════════════
  GOLD_LABEL: "gold_label", // High contactability (legacy)
  HIGH_CONTACTABILITY: "high_contactability", // Both contact methods verified
  RESPONDED: "responded", // Lead responded (GREEN TAG)
  NEEDS_FOLLOW_UP: "needs_follow_up", // Requires follow-up action
} as const;

/**
 * Type for canonical label values
 */
export type CanonicalLabel =
  (typeof CANONICAL_LABELS)[keyof typeof CANONICAL_LABELS];

/**
 * Label categories for grouping
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
 * Check if a label is a hard stop (should short-circuit processing)
 */
export function isHardStopLabel(label: string): boolean {
  return (LABEL_CATEGORIES.HARD_STOP as readonly string[]).includes(label);
}

/**
 * Alias for isHardStopLabel (used by auto-label-engine)
 */
export const isHardStop = isHardStopLabel;

/**
 * Check if a label indicates data capture
 */
export function isDataCaptureLabel(label: string): boolean {
  return (LABEL_CATEGORIES.DATA_CAPTURE as readonly string[]).includes(label);
}

/**
 * Check if a label indicates intent/signal
 */
export function isIntentLabel(label: string): boolean {
  return (LABEL_CATEGORIES.INTENT as readonly string[]).includes(label);
}

/**
 * Check if a label qualifies for call queue
 */
export function isCallQueueLabel(label: string): boolean {
  return (
    label === CANONICAL_LABELS.PUSH_TO_CALL_CENTER ||
    label === CANONICAL_LABELS.CALL_READY ||
    label === CANONICAL_LABELS.WANTS_CALL ||
    label === CANONICAL_LABELS.HIGH_INTENT ||
    label === CANONICAL_LABELS.CONTACT_VERIFIED
  );
}

/**
 * Get all canonical labels as an array
 */
export function getAllLabels(): CanonicalLabel[] {
  return Object.values(CANONICAL_LABELS);
}

/**
 * Validate that a string is a valid canonical label
 */
export function isValidLabel(label: string): label is CanonicalLabel {
  return getAllLabels().includes(label as CanonicalLabel);
}
