/**
 * LUCI Constants - Thresholds & Configuration
 */

// Contactability score thresholds
export const LUCI_THRESHOLDS = {
  CAMPAIGN_READY_MIN_SCORE: 60,    // Minimum score to be campaign-ready
  HIGH_CONFIDENCE_SCORE: 80,       // High confidence - auto-approve
  LOW_CONFIDENCE_SCORE: 40,        // Low confidence - needs review
  MOBILE_BONUS: 20,                // Bonus for verified mobile
  LANDLINE_PENALTY: -30,           // Penalty for landline (SMS won't work)
  VOIP_PENALTY: -10,               // Slight penalty for VOIP
} as const;

// TCPA compliance timing (local time)
export const TCPA_CALLING_HOURS = {
  START_HOUR: 8,   // 8 AM local
  END_HOUR: 21,    // 9 PM local
} as const;

// Status color mapping (matches color system)
export const LUCI_STATUS_COLORS = {
  RAW: "#F9FAFB",           // White/Outline
  PENDING_TRACE: "#F59E0B", // Amber
  TRACED: "#3B82F6",        // Steel Blue
  PENDING_VERIFY: "#F59E0B",// Amber
  VERIFIED: "#3B82F6",      // Steel Blue
  CAMPAIGN_READY: "#22C55E",// Green
  SUPPRESSED: "#EF4444",    // Red
  FAILED: "#374151",        // Charcoal
} as const;

// Status dot mapping
export const LUCI_STATUS_DOTS = {
  RAW: "⚪",
  PENDING_TRACE: "🟡",
  TRACED: "🔵",
  PENDING_VERIFY: "🟡",
  VERIFIED: "🔵",
  CAMPAIGN_READY: "🟢",
  SUPPRESSED: "🔴",
  FAILED: "⚫",
} as const;

// Suppression reasons that are permanent (cannot be undone)
export const PERMANENT_SUPPRESSIONS = [
  "DNC",
  "LITIGATOR",
  "OPT_OUT",
] as const;

// Suppression reasons that can be reviewed
export const REVIEWABLE_SUPPRESSIONS = [
  "WRONG_NUMBER",
  "INVALID_PHONE",
  "COMPLIANCE_HOLD",
] as const;
