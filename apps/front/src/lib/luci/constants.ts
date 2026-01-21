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

// Tracerfy batch settings
export const TRACERFY_BATCH = {
  MIN_RECORDS: 10,          // Minimum records per trace batch
  MAX_RECORDS: 2000,        // Maximum records per trace batch (block size)
  COST_NORMAL: 0.02,        // $0.02 per credit (1 credit/lead)
  COST_ENHANCED: 0.30,      // $0.30 per lead (15 credits @ $0.02)
} as const;

// Trestle verification settings
export const TRESTLE_SETTINGS = {
  PHONE_INTEL_COST: 0.03,   // $0.03 per phone lookup
  REAL_CONTACT_COST: 0.09,  // $0.09 per contact (avg 3 phones)
  ACTIVITY_THRESHOLD_HIGH: 70,   // 70+ = high confidence connected
  ACTIVITY_THRESHOLD_LOW: 30,    // 30 or below = likely disconnected
} as const;

// LUCI pipeline block settings
export const LUCI_PIPELINE = {
  BLOCK_SIZE: 2000,              // Accumulate until 2K block
  MIN_BLOCK_SIZE: 10,            // Minimum to start processing
  TRACERFY_THEN_TRESTLE: true,   // Skip trace first, then verify
} as const;
