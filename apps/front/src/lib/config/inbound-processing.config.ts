/**
 * INBOUND PROCESSING CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALL thresholds and weights are config-driven.
 * Priority: Database (admin panel) > Environment Variables > Defaults
 * DO NOT hardcode numeric values in processing logic.
 *
 * Backend is source of truth - UI only renders state.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Cache for DB settings (refresh every 60 seconds)
let dbSettingsCache: Map<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load settings from database (with caching)
 */
async function loadDbSettings(): Promise<Map<string, string>> {
  const now = Date.now();
  if (dbSettingsCache && now - cacheTimestamp < CACHE_TTL) {
    return dbSettingsCache;
  }

  try {
    const settings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.category, "inbound_processing"));

    dbSettingsCache = new Map(
      settings.map((s) => [s.key, s.value || ""])
    );
    cacheTimestamp = now;
    return dbSettingsCache;
  } catch (error) {
    console.warn("[InboundConfig] Failed to load DB settings, using env vars:", error);
    return new Map();
  }
}

/**
 * Get a config value with priority: DB > ENV > default
 */
function getConfigValue(
  dbSettings: Map<string, string>,
  key: string,
  defaultValue?: string
): string | null {
  // Priority 1: Database
  const dbValue = dbSettings.get(key);
  if (dbValue !== undefined && dbValue !== "") {
    return dbValue;
  }

  // Priority 2: Environment variable
  const envValue = process.env[key];
  if (envValue !== undefined && envValue.trim() !== "") {
    return envValue;
  }

  // Priority 3: Default
  return defaultValue || null;
}

/**
 * Clear the settings cache (call after admin updates)
 */
export function clearConfigCache(): void {
  dbSettingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Config interface - all values nullable (null = not configured)
 */
export interface InboundProcessingConfig {
  // Call Queue Routing
  CALL_QUEUE_PRIORITY_THRESHOLD: number | null;
  CALL_QUEUE_GOLD_LABEL_PRIORITY: number | null;
  CALL_QUEUE_GREEN_TAG_PRIORITY: number | null;

  // Priority Weights (added to lead score when label applied)
  WEIGHT_EMAIL_CAPTURED: number | null;
  WEIGHT_MOBILE_CAPTURED: number | null;
  WEIGHT_CONTACT_VERIFIED: number | null;
  WEIGHT_WANTS_CALL: number | null;
  WEIGHT_QUESTION_ASKED: number | null;
  WEIGHT_HIGH_INTENT: number | null;
  WEIGHT_INBOUND_RESPONSE: number | null;

  // Retry/Cooldown
  MAX_RETRY_ATTEMPTS: number | null;
  RETRY_COOLDOWN_HOURS: number | null;

  // Batch Limits
  DAILY_BATCH_SIZE: number | null;
  SMS_BATCH_SIZE: number | null;

  // Feature Flags
  AUTO_ROUTE_TO_CALL_CENTER: boolean;
  AUTO_RESOLVE_THREADS: boolean;
  LOG_LEAD_EVENTS: boolean;
}

/**
 * Config keys as constants for type-safe access
 */
export const CONFIG_KEYS = {
  // Call Queue Routing
  CALL_QUEUE_PRIORITY_THRESHOLD: "CALL_QUEUE_PRIORITY_THRESHOLD",
  CALL_QUEUE_GOLD_LABEL_PRIORITY: "CALL_QUEUE_GOLD_LABEL_PRIORITY",
  CALL_QUEUE_GREEN_TAG_PRIORITY: "CALL_QUEUE_GREEN_TAG_PRIORITY",

  // Priority Weights
  WEIGHT_EMAIL_CAPTURED: "WEIGHT_EMAIL_CAPTURED",
  WEIGHT_MOBILE_CAPTURED: "WEIGHT_MOBILE_CAPTURED",
  WEIGHT_CONTACT_VERIFIED: "WEIGHT_CONTACT_VERIFIED",
  WEIGHT_WANTS_CALL: "WEIGHT_WANTS_CALL",
  WEIGHT_QUESTION_ASKED: "WEIGHT_QUESTION_ASKED",
  WEIGHT_HIGH_INTENT: "WEIGHT_HIGH_INTENT",
  WEIGHT_INBOUND_RESPONSE: "WEIGHT_INBOUND_RESPONSE",

  // Retry/Cooldown
  MAX_RETRY_ATTEMPTS: "MAX_RETRY_ATTEMPTS",
  RETRY_COOLDOWN_HOURS: "RETRY_COOLDOWN_HOURS",

  // Batch Limits
  DAILY_BATCH_SIZE: "DAILY_BATCH_SIZE",
  SMS_BATCH_SIZE: "SMS_BATCH_SIZE",

  // Feature Flags
  AUTO_ROUTE_TO_CALL_CENTER: "AUTO_ROUTE_TO_CALL_CENTER",
  AUTO_RESOLVE_THREADS: "AUTO_RESOLVE_THREADS",
  LOG_LEAD_EVENTS: "LOG_LEAD_EVENTS",
} as const;

/**
 * Parse value as number (returns null if not set or invalid)
 */
function parseNumber(val: string | null): number | null {
  if (!val || val.trim() === "") return null;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) {
    return null;
  }
  return parsed;
}

/**
 * Parse value as boolean (defaults to provided default if not set)
 */
function parseBool(val: string | null, defaultValue: boolean = false): boolean {
  if (!val || val.trim() === "") return defaultValue;
  return val.toLowerCase() === "true" || val === "1";
}

/**
 * Load inbound processing config from DB first, then environment
 * Returns config with null values for unset keys (fail gracefully)
 *
 * Priority: Database (admin panel) > Environment Variables > Defaults
 */
export async function getInboundConfigAsync(): Promise<InboundProcessingConfig> {
  const dbSettings = await loadDbSettings();

  return {
    // Call Queue Routing
    CALL_QUEUE_PRIORITY_THRESHOLD: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.CALL_QUEUE_PRIORITY_THRESHOLD, "50")
    ),
    CALL_QUEUE_GOLD_LABEL_PRIORITY: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.CALL_QUEUE_GOLD_LABEL_PRIORITY, "100")
    ),
    CALL_QUEUE_GREEN_TAG_PRIORITY: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.CALL_QUEUE_GREEN_TAG_PRIORITY, "75")
    ),

    // Priority Weights
    WEIGHT_EMAIL_CAPTURED: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_EMAIL_CAPTURED, "50")
    ),
    WEIGHT_MOBILE_CAPTURED: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_MOBILE_CAPTURED, "50")
    ),
    WEIGHT_CONTACT_VERIFIED: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_CONTACT_VERIFIED, "0")
    ),
    WEIGHT_WANTS_CALL: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_WANTS_CALL, "35")
    ),
    WEIGHT_QUESTION_ASKED: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_QUESTION_ASKED, "15")
    ),
    WEIGHT_HIGH_INTENT: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_HIGH_INTENT, "30")
    ),
    WEIGHT_INBOUND_RESPONSE: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.WEIGHT_INBOUND_RESPONSE, "25")
    ),

    // Retry/Cooldown
    MAX_RETRY_ATTEMPTS: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.MAX_RETRY_ATTEMPTS, "3")
    ),
    RETRY_COOLDOWN_HOURS: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.RETRY_COOLDOWN_HOURS, "24")
    ),

    // Batch Limits
    DAILY_BATCH_SIZE: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.DAILY_BATCH_SIZE, "2000")
    ),
    SMS_BATCH_SIZE: parseNumber(
      getConfigValue(dbSettings, CONFIG_KEYS.SMS_BATCH_SIZE, "250")
    ),

    // Feature Flags (default to true for auto-processing)
    AUTO_ROUTE_TO_CALL_CENTER: parseBool(
      getConfigValue(dbSettings, CONFIG_KEYS.AUTO_ROUTE_TO_CALL_CENTER, "true"),
      true
    ),
    AUTO_RESOLVE_THREADS: parseBool(
      getConfigValue(dbSettings, CONFIG_KEYS.AUTO_RESOLVE_THREADS, "true"),
      true
    ),
    LOG_LEAD_EVENTS: parseBool(
      getConfigValue(dbSettings, CONFIG_KEYS.LOG_LEAD_EVENTS, "false"),
      false
    ),
  };
}

/**
 * Synchronous version using only env vars (for cases where async isn't possible)
 * Falls back to env vars only - use getInboundConfigAsync when possible
 */
export function getInboundConfig(): InboundProcessingConfig {
  const envVal = (key: string, defaultVal?: string) => {
    const val = process.env[key];
    return val && val.trim() !== "" ? val : defaultVal || null;
  };

  return {
    CALL_QUEUE_PRIORITY_THRESHOLD: parseNumber(envVal(CONFIG_KEYS.CALL_QUEUE_PRIORITY_THRESHOLD, "50")),
    CALL_QUEUE_GOLD_LABEL_PRIORITY: parseNumber(envVal(CONFIG_KEYS.CALL_QUEUE_GOLD_LABEL_PRIORITY, "100")),
    CALL_QUEUE_GREEN_TAG_PRIORITY: parseNumber(envVal(CONFIG_KEYS.CALL_QUEUE_GREEN_TAG_PRIORITY, "75")),
    WEIGHT_EMAIL_CAPTURED: parseNumber(envVal(CONFIG_KEYS.WEIGHT_EMAIL_CAPTURED, "50")),
    WEIGHT_MOBILE_CAPTURED: parseNumber(envVal(CONFIG_KEYS.WEIGHT_MOBILE_CAPTURED, "50")),
    WEIGHT_CONTACT_VERIFIED: parseNumber(envVal(CONFIG_KEYS.WEIGHT_CONTACT_VERIFIED, "0")),
    WEIGHT_WANTS_CALL: parseNumber(envVal(CONFIG_KEYS.WEIGHT_WANTS_CALL, "35")),
    WEIGHT_QUESTION_ASKED: parseNumber(envVal(CONFIG_KEYS.WEIGHT_QUESTION_ASKED, "15")),
    WEIGHT_HIGH_INTENT: parseNumber(envVal(CONFIG_KEYS.WEIGHT_HIGH_INTENT, "30")),
    WEIGHT_INBOUND_RESPONSE: parseNumber(envVal(CONFIG_KEYS.WEIGHT_INBOUND_RESPONSE, "25")),
    MAX_RETRY_ATTEMPTS: parseNumber(envVal(CONFIG_KEYS.MAX_RETRY_ATTEMPTS, "3")),
    RETRY_COOLDOWN_HOURS: parseNumber(envVal(CONFIG_KEYS.RETRY_COOLDOWN_HOURS, "24")),
    DAILY_BATCH_SIZE: parseNumber(envVal(CONFIG_KEYS.DAILY_BATCH_SIZE, "2000")),
    SMS_BATCH_SIZE: parseNumber(envVal(CONFIG_KEYS.SMS_BATCH_SIZE, "250")),
    AUTO_ROUTE_TO_CALL_CENTER: parseBool(envVal(CONFIG_KEYS.AUTO_ROUTE_TO_CALL_CENTER, "true"), true),
    AUTO_RESOLVE_THREADS: parseBool(envVal(CONFIG_KEYS.AUTO_RESOLVE_THREADS, "true"), true),
    LOG_LEAD_EVENTS: parseBool(envVal(CONFIG_KEYS.LOG_LEAD_EVENTS, "false"), false),
  };
}

/**
 * Validate that required config values are set
 * Returns list of missing keys (empty = all good)
 */
export function validateInboundConfig(
  config: InboundProcessingConfig,
): string[] {
  const missing: string[] = [];

  // Required for call queue routing
  if (config.CALL_QUEUE_PRIORITY_THRESHOLD === null) {
    missing.push(CONFIG_KEYS.CALL_QUEUE_PRIORITY_THRESHOLD);
  }

  return missing;
}

/**
 * Log config status on startup (for debugging)
 */
export function logConfigStatus(): void {
  const config = getInboundConfig();
  const missing = validateInboundConfig(config);

  console.log("[InboundConfig] Configuration loaded:");
  console.log(
    `  - CALL_QUEUE_PRIORITY_THRESHOLD: ${config.CALL_QUEUE_PRIORITY_THRESHOLD ?? "(not set)"}`,
  );
  console.log(
    `  - CALL_QUEUE_GOLD_LABEL_PRIORITY: ${config.CALL_QUEUE_GOLD_LABEL_PRIORITY ?? "(not set)"}`,
  );
  console.log(
    `  - CALL_QUEUE_GREEN_TAG_PRIORITY: ${config.CALL_QUEUE_GREEN_TAG_PRIORITY ?? "(not set)"}`,
  );
  console.log(
    `  - AUTO_ROUTE_TO_CALL_CENTER: ${config.AUTO_ROUTE_TO_CALL_CENTER}`,
  );
  console.log(`  - AUTO_RESOLVE_THREADS: ${config.AUTO_RESOLVE_THREADS}`);

  if (missing.length > 0) {
    console.warn(`[InboundConfig] Missing config keys: ${missing.join(", ")}`);
  }
}
