/**
 * Centralized ID Prefix Registry
 *
 * ALL table prefixes must be defined here to prevent collisions.
 * Max prefix length: 9 characters (enforced by validatePrefix)
 *
 * Format: {prefix}_{ULID} = max 36 chars (varchar(36))
 */

export const ID_PREFIXES = {
  // Core entities
  USER: "user",
  TEAM: "team",
  TEAM_MEMBER: "tm",
  TEAM_INVITATION: "ti",

  // Authentication
  PERSONAL_ACCESS_TOKEN: "pat",

  // Leads & Contacts
  LEAD: "lead",
  LEAD_ACTIVITY: "lact",
  LEAD_PHONE_NUMBER: "lpn",
  UNIFIED_LEAD_CARD: "ulc",

  // Properties
  PROPERTY: "prop",
  PROPERTY_OWNER: "powner",
  PROPERTY_SEARCH: "psrch",
  PROPERTY_SEARCH_BATCH: "psb",
  PROPERTY_DISTRESS_SCORE: "pds",

  // Personas
  PERSONA: "persona",
  PERSONA_ADDRESS: "paddr",
  PERSONA_DEMOGRAPHICS: "pdemo",
  PERSONA_EMAIL: "pemail",
  PERSONA_PHONE: "pphone",
  PERSONA_SOCIAL: "psocial",
  PERSONA_MATCH_HISTORY: "pmh",

  // Campaigns
  CAMPAIGN: "camp",
  CAMPAIGN_EVENT: "cevt",
  CAMPAIGN_EXECUTION: "cexec",
  CAMPAIGN_INITIAL_MESSAGE: "cim",
  CAMPAIGN_QUEUE: "cq",
  CAMPAIGN_SEQUENCE: "cseq",

  // Messages & Communication
  MESSAGE: "msg",
  MESSAGE_LABEL: "msgl",
  MESSAGE_TEMPLATE: "mt",
  INITIAL_MESSAGE: "imsg",
  INBOX: "inb",

  // Calls & Dialer
  CALL_HISTORY: "ch",
  CALL_RECORDING: "cr",
  DIALER_CONTACT: "dc",
  POWER_DIALER: "pd",

  // Content
  CONTENT_LIBRARY: "clib",
  CONTENT_CATEGORY: "ccat",
  CONTENT_USAGE_LOG: "clog",

  // Workflows
  WORKFLOW: "wf",
  WORKFLOW_LINK: "wl",
  WORKFLOW_RUN: "wr",
  WORKFLOW_STEP: "ws",
  WORKFLOW_STEP_RUN: "wsr",
  WORKFLOW_VERSION: "wver",

  // Integrations
  INTEGRATION: "intg",
  INTEGRATION_FIELD: "intf",
  INTEGRATION_TASK: "itask",

  // Business
  BUSINESS: "biz",
  BUSINESS_OWNER: "bowner",
  BUCKET_MOVEMENT: "bmov",

  // AI & SDR
  AI_SDR_AVATAR: "aisdr",
  SDR_CAMPAIGN_CONFIG: "sdrcc",
  PROMPT: "prompt",

  // Skiptrace & Enrichment
  SKIPTRACE_JOB: "sjob",
  SKIPTRACE_RESULT: "strace",

  // Achievements & Gamification
  ACHIEVEMENT_DEFINITION: "achdef",
  ACHIEVEMENT_NOTIFICATION: "achnot",
  USER_ACHIEVEMENT: "uach",
  USER_STATISTICS: "ustat",
  LEADERBOARD_SNAPSHOT: "lbsnap",

  // Other
  IMPORT_LEAD_PRESET: "ilp",
  RESPONSE_BUCKET: "rbkt",
  SUPPRESSION: "supp",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

// Validation
const MAX_PREFIX_LENGTH = 9;
const usedPrefixes = new Set<string>();

/**
 * Validates a prefix at startup/import time
 * - Checks length <= 9
 * - Checks for duplicates
 */
export function validatePrefix(prefix: string, tableName: string): void {
  if (prefix.length > MAX_PREFIX_LENGTH) {
    console.warn(
      `[ID PREFIX WARNING] "${prefix}" for ${tableName} exceeds ${MAX_PREFIX_LENGTH} chars - will be truncated`,
    );
  }

  if (usedPrefixes.has(prefix)) {
    console.warn(
      `[ID PREFIX WARNING] "${prefix}" is used by multiple tables! This makes debugging harder.`,
    );
  }

  usedPrefixes.add(prefix);
}

// Validate all prefixes on module load
Object.entries(ID_PREFIXES).forEach(([key, prefix]) => {
  validatePrefix(prefix, key);
});

/**
 * Get all registered prefixes (for documentation/debugging)
 */
export function getAllPrefixes(): Record<string, string> {
  return { ...ID_PREFIXES };
}

/**
 * Check if an ID belongs to a specific entity type
 */
export function getEntityTypeFromId(id: string): string | null {
  const prefix = id.split("_")[0];
  const entry = Object.entries(ID_PREFIXES).find(([, p]) => p === prefix);
  return entry ? entry[0] : null;
}
