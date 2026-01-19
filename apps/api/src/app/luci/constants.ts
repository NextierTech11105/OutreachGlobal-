/**
 * LUCI Engine Constants
 */

export const LUCI_QUEUE = "luci-data-engine";

export const LuciJobs = {
  // Pipeline stages
  SKIP_TRACE: "skip-trace",
  SCORE_CONTACTS: "score-contacts",
  FULL_PIPELINE: "full-pipeline",

  // Batch operations
  BATCH_TRACE: "batch-trace",
  BATCH_SCORE: "batch-score",
} as const;

export type LuciJobType = (typeof LuciJobs)[keyof typeof LuciJobs];

// Tracerfy trace types
export const TraceType = {
  NORMAL: "normal", // 1 credit/lead - basic contact data
  ENHANCED: "enhanced", // 15 credits/lead - relatives, aliases, past addresses, businesses
} as const;

export type TraceTypeValue = (typeof TraceType)[keyof typeof TraceType];

// Trestle phone grades
export const PhoneGrade = {
  A: "A", // Highest quality - direct mobile, high confidence
  B: "B", // Good quality
  C: "C", // Moderate quality
  D: "D", // Low quality
  F: "F", // Unreachable / disconnected
} as const;

export type PhoneGradeValue = (typeof PhoneGrade)[keyof typeof PhoneGrade];

// Phone types from Trestle
export const PhoneType = {
  MOBILE: "mobile",
  LANDLINE: "landline",
  FIXED_VOIP: "fixedVoIP",
  NON_FIXED_VOIP: "nonFixedVoIP",
} as const;

export type PhoneTypeValue = (typeof PhoneType)[keyof typeof PhoneType];

// Pipeline status
export const PipelineStatus = {
  PENDING: "pending",
  TRACING: "tracing",
  SCORING: "scoring",
  READY: "ready",
  FAILED: "failed",
} as const;

export type PipelineStatusValue =
  (typeof PipelineStatus)[keyof typeof PipelineStatus];
