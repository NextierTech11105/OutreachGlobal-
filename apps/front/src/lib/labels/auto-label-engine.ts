/**
 * AUTO-LABEL ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Detects labels from inbound message content and applies them to leads.
 * All thresholds are config-driven - NO hardcoded numeric values.
 *
 * Functions:
 * - detectLabels(): Analyze message body, return detected labels
 * - applyLabelsToLead(): Persist labels to lead record
 * - evaluateCallQueueEligibility(): Determine if lead should be queued for call
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  CANONICAL_LABELS,
  type CanonicalLabel,
  isHardStop,
} from "./canonical-labels";
import {
  getInboundConfig,
  type InboundProcessingConfig,
} from "../config/inbound-processing.config";

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION PATTERNS (keywords only - no numeric thresholds)
// ─────────────────────────────────────────────────────────────────────────────

const OPT_OUT_PATTERNS = [
  /\bSTOP\b/i,
  /\bUNSUBSCRIBE\b/i,
  /\bCANCEL\b/i,
  /\bEND\b/i,
  /\bQUIT\b/i,
  /\bOPTOUT\b/i,
  /\bOPT[\s-]?OUT\b/i,
  /\bREMOVE\s+ME\b/i,
];

const DO_NOT_CONTACT_PATTERNS = [
  /\bWRONG\s+(NUMBER|PERSON)\b/i,
  /\bDON'?T\s+TEXT\b/i,
  /\bSTOP\s+TEXTING\b/i,
  /\bNOT\s+INTERESTED\b/i,
  /\bLEAVE\s+ME\s+ALONE\b/i,
  /\bWHO\s+IS\s+THIS\b/i,
];

const WANTS_CALL_PATTERNS = [
  /\bCALL\s+ME\b/i,
  /\bGIVE\s+ME\s+A\s+CALL\b/i,
  /\bRING\s+ME\b/i,
  /\bPLEASE\s+CALL\b/i,
  /\bCAN\s+YOU\s+CALL\b/i,
  /\bI'?D\s+LIKE\s+A\s+CALL\b/i,
  /\bCOULD\s+YOU\s+CALL\b/i,
];

const NEEDS_HELP_PATTERNS = [
  /\bHELP\b/i,
  /\bASSIST(ANCE)?\b/i,
  /\bSUPPORT\b/i,
  /\bCAN\s+YOU\s+HELP\b/i,
  /\bNEED\s+HELP\b/i,
  /\bI\s+NEED\b/i,
];

const HIGH_INTENT_PATTERNS = [
  /\b(YES|YEP|YEAH|SURE|ABSOLUTELY)\b.*\b(INTERESTED|INFO|MORE|CALL|DETAILS)\b/i,
  /\bINTERESTED\b/i,
  /\bTELL\s+ME\s+MORE\b/i,
  /\bSEND\s+INFO\b/i,
  /\bSIGN\s+ME\s+UP\b/i,
  /\bI'?M\s+IN\b/i,
  /\bSCHEDULE\b/i,
  /\bBOOK\b/i,
  /\bAPPOINTMENT\b/i,
];

const NOISE_PATTERNS = [
  /^[^a-zA-Z0-9]+$/, // Only special chars
  /^.{1,2}$/, // Single or double character
  /^(LOL|LMAO|OK|K|Y|N|HMM|UH|UM)$/i, // Non-substantive responses
];

// Profanity list - common explicit words (can be expanded)
const PROFANITY_PATTERNS = [/\b(fuck|shit|ass|damn|bitch|crap)\b/i];

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Phone regex (different formats)
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract email from message body
 */
export function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extract phone number from message body
 * Returns normalized 10-digit phone or null
 */
export function extractPhone(text: string): string | null {
  const match = text.match(PHONE_REGEX);
  if (!match) return null;

  const normalized = match[0].replace(/\D/g, "").slice(-10);
  return normalized.length === 10 ? normalized : null;
}

/**
 * Detect all applicable labels from message body
 *
 * @param messageBody - The inbound message text
 * @param senderPhone - The phone number that sent the message (to avoid tagging sender's own number)
 * @returns Array of detected canonical labels
 */
export function detectLabels(
  messageBody: string,
  senderPhone?: string,
): CanonicalLabel[] {
  const labels: CanonicalLabel[] = [];
  const normalizedBody = messageBody.trim();

  // Early exit for empty messages
  if (!normalizedBody) {
    labels.push(CANONICAL_LABELS.NOISE);
    return labels;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HARD STOP checks (highest priority)
  // ─────────────────────────────────────────────────────────────────────────
  for (const pattern of OPT_OUT_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.OPTED_OUT);
      console.log(
        `[AutoLabel] 🛑 OPTED_OUT detected: "${normalizedBody.substring(0, 50)}"`,
      );
      return labels; // Short-circuit - no further processing needed
    }
  }

  for (const pattern of DO_NOT_CONTACT_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.DO_NOT_CONTACT);
      console.log(
        `[AutoLabel] 🚫 DO_NOT_CONTACT detected: "${normalizedBody.substring(0, 50)}"`,
      );
      return labels; // Short-circuit - no further processing needed
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NOISE check
  // ─────────────────────────────────────────────────────────────────────────
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.NOISE);
      console.log(`[AutoLabel] 🗑️ NOISE detected: "${normalizedBody}"`);
      return labels;
    }
  }

  // Check for profanity (mark as noise but don't short-circuit)
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.NOISE);
      console.log(`[AutoLabel] 🗑️ PROFANITY detected, marking as NOISE`);
      // Don't short-circuit - may still have valid data
      break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DATA CAPTURE checks
  // ─────────────────────────────────────────────────────────────────────────
  const extractedEmail = extractEmail(normalizedBody);
  const extractedPhone = extractPhone(normalizedBody);

  if (extractedEmail) {
    labels.push(CANONICAL_LABELS.EMAIL_CAPTURED);
    labels.push(CANONICAL_LABELS.INBOUND_DATA);
    console.log(`[AutoLabel] 📧 EMAIL_CAPTURED: ${extractedEmail}`);
  }

  // Only tag mobile_captured if different from sender's phone
  if (extractedPhone) {
    const senderNormalized = senderPhone?.replace(/\D/g, "").slice(-10);
    if (extractedPhone !== senderNormalized) {
      labels.push(CANONICAL_LABELS.MOBILE_CAPTURED);
      labels.push(CANONICAL_LABELS.INBOUND_DATA);
      console.log(`[AutoLabel] 📱 MOBILE_CAPTURED: ${extractedPhone}`);
    }
  }

  // Check for contact verified (both email AND mobile)
  if (
    labels.includes(CANONICAL_LABELS.EMAIL_CAPTURED) &&
    labels.includes(CANONICAL_LABELS.MOBILE_CAPTURED)
  ) {
    labels.push(CANONICAL_LABELS.CONTACT_VERIFIED);
    labels.push(CANONICAL_LABELS.GOLD_LABEL);
    labels.push(CANONICAL_LABELS.HIGH_CONTACTABILITY);
    console.log(
      `[AutoLabel] 🏆 CONTACT_VERIFIED + GOLD_LABEL: Both email and mobile captured`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT checks
  // ─────────────────────────────────────────────────────────────────────────
  for (const pattern of WANTS_CALL_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.WANTS_CALL);
      console.log(`[AutoLabel] 📞 WANTS_CALL detected`);
      break;
    }
  }

  for (const pattern of NEEDS_HELP_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.NEEDS_HELP);
      console.log(`[AutoLabel] 🆘 NEEDS_HELP detected`);
      break;
    }
  }

  // Question detection
  if (normalizedBody.includes("?")) {
    labels.push(CANONICAL_LABELS.QUESTION_ASKED);
    console.log(`[AutoLabel] ❓ QUESTION_ASKED detected`);
  }

  // High intent detection
  for (const pattern of HIGH_INTENT_PATTERNS) {
    if (pattern.test(normalizedBody)) {
      labels.push(CANONICAL_LABELS.HIGH_INTENT);
      labels.push(CANONICAL_LABELS.RESPONDED);
      labels.push(CANONICAL_LABELS.NEEDS_FOLLOW_UP);
      console.log(`[AutoLabel] 🔥 HIGH_INTENT detected`);
      break;
    }
  }

  // Remove duplicates
  const uniqueLabels = [...new Set(labels)] as CanonicalLabel[];

  console.log(
    `[AutoLabel] Detected ${uniqueLabels.length} labels: ${uniqueLabels.join(", ")}`,
  );

  return uniqueLabels;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply detected labels to a lead record
 * Uses PostgreSQL array_cat to merge with existing tags
 *
 * @param leadId - The lead ID to update
 * @param labels - Array of canonical labels to apply
 */
export async function applyLabelsToLead(
  leadId: string,
  labels: CanonicalLabel[],
): Promise<void> {
  if (!leadId || labels.length === 0) {
    console.log(
      `[AutoLabel] Skip applyLabelsToLead: no leadId or empty labels`,
    );
    return;
  }

  try {
    // Use array_cat to merge new labels with existing tags, preserving both
    // Use array(select distinct unnest(...)) to deduplicate
    await db
      .update(leads)
      .set({
        tags: sql`
          array(
            SELECT DISTINCT unnest(
              array_cat(
                COALESCE(tags, ARRAY[]::text[]),
                ARRAY[${sql.join(
                  labels.map((l) => sql`${l}`),
                  sql`, `,
                )}]::text[]
              )
            )
          )
        `,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    console.log(
      `[AutoLabel] ✅ Applied ${labels.length} labels to lead ${leadId}: ${labels.join(", ")}`,
    );
  } catch (error) {
    console.error(
      `[AutoLabel] Error applying labels to lead ${leadId}:`,
      error,
    );
    // Don't throw - graceful degradation
  }
}

/**
 * Apply labels AND update score based on config weights
 *
 * @param leadId - The lead ID to update
 * @param labels - Array of canonical labels to apply
 * @param config - Inbound processing config
 */
export async function applyLabelsWithScore(
  leadId: string,
  labels: CanonicalLabel[],
  config?: InboundProcessingConfig,
): Promise<void> {
  if (!leadId || labels.length === 0) {
    console.log(
      `[AutoLabel] Skip applyLabelsWithScore: no leadId or empty labels`,
    );
    return;
  }

  const cfg = config || getInboundConfig();
  let scoreBoost = 0;

  // Calculate score boost from config weights
  if (
    labels.includes(CANONICAL_LABELS.EMAIL_CAPTURED) &&
    cfg.WEIGHT_EMAIL_CAPTURED !== null
  ) {
    scoreBoost += cfg.WEIGHT_EMAIL_CAPTURED;
  }
  if (
    labels.includes(CANONICAL_LABELS.MOBILE_CAPTURED) &&
    cfg.WEIGHT_MOBILE_CAPTURED !== null
  ) {
    scoreBoost += cfg.WEIGHT_MOBILE_CAPTURED;
  }
  if (
    labels.includes(CANONICAL_LABELS.CONTACT_VERIFIED) &&
    cfg.WEIGHT_CONTACT_VERIFIED !== null
  ) {
    scoreBoost += cfg.WEIGHT_CONTACT_VERIFIED;
  }
  if (
    labels.includes(CANONICAL_LABELS.WANTS_CALL) &&
    cfg.WEIGHT_WANTS_CALL !== null
  ) {
    scoreBoost += cfg.WEIGHT_WANTS_CALL;
  }
  if (
    labels.includes(CANONICAL_LABELS.QUESTION_ASKED) &&
    cfg.WEIGHT_QUESTION_ASKED !== null
  ) {
    scoreBoost += cfg.WEIGHT_QUESTION_ASKED;
  }
  if (
    labels.includes(CANONICAL_LABELS.HIGH_INTENT) &&
    cfg.WEIGHT_HIGH_INTENT !== null
  ) {
    scoreBoost += cfg.WEIGHT_HIGH_INTENT;
  }
  if (
    labels.includes(CANONICAL_LABELS.RESPONDED) &&
    cfg.WEIGHT_INBOUND_RESPONSE !== null
  ) {
    scoreBoost += cfg.WEIGHT_INBOUND_RESPONSE;
  }

  try {
    // Update tags AND score in one query
    await db
      .update(leads)
      .set({
        tags: sql`
          array(
            SELECT DISTINCT unnest(
              array_cat(
                COALESCE(tags, ARRAY[]::text[]),
                ARRAY[${sql.join(
                  labels.map((l) => sql`${l}`),
                  sql`, `,
                )}]::text[]
              )
            )
          )
        `,
        // Add score boost (capped at 100)
        score:
          scoreBoost > 0
            ? sql`LEAST(COALESCE(score, 0) + ${scoreBoost}, 100)`
            : sql`score`,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    console.log(
      `[AutoLabel] ✅ Applied ${labels.length} labels to lead ${leadId} with score boost: +${scoreBoost}`,
    );
  } catch (error) {
    console.error(
      `[AutoLabel] Error applying labels with score to lead ${leadId}:`,
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL QUEUE ELIGIBILITY
// ─────────────────────────────────────────────────────────────────────────────

export interface CallQueueEligibility {
  eligible: boolean;
  reason: string;
  priority: number | null; // Priority score from config (null if not set)
}

/**
 * Evaluate if a lead should be pushed to the call queue
 * Logic:
 * - HARD STOP (opted_out) = NEVER queue
 * - MUST have mobile_captured OR existing phone
 * - Eligible if: wants_call OR priority >= threshold OR gold_label/green_tag
 *
 * @param lead - Lead data including tags and score
 * @param labels - Newly detected labels (may not be persisted yet)
 * @param config - Inbound processing config
 */
export function evaluateCallQueueEligibility(
  lead: {
    id: string;
    tags?: string[] | null;
    score?: number | null;
    phone?: string | null;
  },
  labels: CanonicalLabel[],
  config?: InboundProcessingConfig,
): CallQueueEligibility {
  const cfg = config || getInboundConfig();
  const allLabels = [...(lead.tags || []), ...labels];

  // ─────────────────────────────────────────────────────────────────────────
  // HARD STOP: opted_out = NEVER queue
  // ─────────────────────────────────────────────────────────────────────────
  if (
    allLabels.includes(CANONICAL_LABELS.OPTED_OUT) ||
    allLabels.includes(CANONICAL_LABELS.DO_NOT_CONTACT)
  ) {
    console.log(
      `[AutoLabel] ❌ Call queue BLOCKED: Lead ${lead.id} is opted out or DNC`,
    );
    return {
      eligible: false,
      reason: "opted_out_or_dnc",
      priority: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MUST have phone number
  // ─────────────────────────────────────────────────────────────────────────
  const hasMobile =
    allLabels.includes(CANONICAL_LABELS.MOBILE_CAPTURED) ||
    (lead.phone && lead.phone.length >= 10);

  if (!hasMobile) {
    console.log(
      `[AutoLabel] ❌ Call queue BLOCKED: Lead ${lead.id} has no mobile`,
    );
    return {
      eligible: false,
      reason: "no_mobile",
      priority: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GOLD LABEL = highest priority
  // ─────────────────────────────────────────────────────────────────────────
  if (
    allLabels.includes(CANONICAL_LABELS.GOLD_LABEL) ||
    allLabels.includes(CANONICAL_LABELS.CONTACT_VERIFIED)
  ) {
    const priority = cfg.CALL_QUEUE_GOLD_LABEL_PRIORITY;
    if (priority === null) {
      console.warn(
        `[AutoLabel] ⚠️ CALL_QUEUE_GOLD_LABEL_PRIORITY not set, skipping queue`,
      );
      return {
        eligible: false,
        reason: "config_gold_priority_not_set",
        priority: null,
      };
    }
    console.log(
      `[AutoLabel] ✅ Call queue ELIGIBLE: Lead ${lead.id} is GOLD LABEL`,
    );
    return {
      eligible: true,
      reason: "gold_label",
      priority,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WANTS_CALL = high intent, use GOLD priority
  // ─────────────────────────────────────────────────────────────────────────
  if (allLabels.includes(CANONICAL_LABELS.WANTS_CALL)) {
    const priority = cfg.CALL_QUEUE_GOLD_LABEL_PRIORITY;
    if (priority === null) {
      console.warn(
        `[AutoLabel] ⚠️ CALL_QUEUE_GOLD_LABEL_PRIORITY not set, skipping queue`,
      );
      return {
        eligible: false,
        reason: "config_gold_priority_not_set",
        priority: null,
      };
    }
    console.log(
      `[AutoLabel] ✅ Call queue ELIGIBLE: Lead ${lead.id} WANTS_CALL`,
    );
    return {
      eligible: true,
      reason: "wants_call",
      priority,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HIGH_INTENT / RESPONDED = GREEN tag priority
  // ─────────────────────────────────────────────────────────────────────────
  if (
    allLabels.includes(CANONICAL_LABELS.HIGH_INTENT) ||
    allLabels.includes(CANONICAL_LABELS.RESPONDED) ||
    allLabels.includes(CANONICAL_LABELS.NEEDS_FOLLOW_UP)
  ) {
    const priority = cfg.CALL_QUEUE_GREEN_TAG_PRIORITY;
    if (priority === null) {
      console.warn(
        `[AutoLabel] ⚠️ CALL_QUEUE_GREEN_TAG_PRIORITY not set, skipping queue`,
      );
      return {
        eligible: false,
        reason: "config_green_priority_not_set",
        priority: null,
      };
    }
    console.log(
      `[AutoLabel] ✅ Call queue ELIGIBLE: Lead ${lead.id} is HIGH_INTENT/GREEN`,
    );
    return {
      eligible: true,
      reason: "high_intent_or_responded",
      priority,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Score threshold check (if configured)
  // ─────────────────────────────────────────────────────────────────────────
  const threshold = cfg.CALL_QUEUE_PRIORITY_THRESHOLD;
  const leadScore = lead.score ?? 0;

  if (threshold !== null && leadScore >= threshold) {
    // Use GREEN priority for threshold-based eligibility
    const priority = cfg.CALL_QUEUE_GREEN_TAG_PRIORITY;
    if (priority === null) {
      console.warn(
        `[AutoLabel] ⚠️ CALL_QUEUE_GREEN_TAG_PRIORITY not set, skipping queue`,
      );
      return {
        eligible: false,
        reason: "config_green_priority_not_set",
        priority: null,
      };
    }
    console.log(
      `[AutoLabel] ✅ Call queue ELIGIBLE: Lead ${lead.id} score ${leadScore} >= threshold ${threshold}`,
    );
    return {
      eligible: true,
      reason: "score_threshold",
      priority,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Not eligible
  // ─────────────────────────────────────────────────────────────────────────
  console.log(
    `[AutoLabel] ℹ️ Call queue NOT ELIGIBLE: Lead ${lead.id} - no qualifying signal`,
  );
  return {
    eligible: false,
    reason: "no_qualifying_signal",
    priority: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if any detected labels indicate a hard stop
 */
export function hasHardStopLabel(labels: CanonicalLabel[]): boolean {
  return labels.some((label) => isHardStop(label));
}

/**
 * Get the highest priority label from a set of labels
 * Priority order: OPTED_OUT > GOLD_LABEL > HIGH_INTENT > EMAIL_CAPTURED > etc.
 */
export function getHighestPriorityLabel(
  labels: CanonicalLabel[],
): CanonicalLabel | null {
  const priorityOrder: CanonicalLabel[] = [
    CANONICAL_LABELS.OPTED_OUT,
    CANONICAL_LABELS.DO_NOT_CONTACT,
    CANONICAL_LABELS.GOLD_LABEL,
    CANONICAL_LABELS.CONTACT_VERIFIED,
    CANONICAL_LABELS.WANTS_CALL,
    CANONICAL_LABELS.HIGH_INTENT,
    CANONICAL_LABELS.EMAIL_CAPTURED,
    CANONICAL_LABELS.MOBILE_CAPTURED,
    CANONICAL_LABELS.QUESTION_ASKED,
    CANONICAL_LABELS.NEEDS_HELP,
    CANONICAL_LABELS.RESPONDED,
    CANONICAL_LABELS.NOISE,
  ];

  for (const priority of priorityOrder) {
    if (labels.includes(priority)) {
      return priority;
    }
  }

  return labels[0] || null;
}

// Log on import
console.log("[AutoLabelEngine] Loaded with config-driven thresholds");
