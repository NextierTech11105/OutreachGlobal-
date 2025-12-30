/**
 * INBOUND PROCESSING CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALL thresholds and weights are config-driven. Operators fill values.
 * DO NOT hardcode numeric values in processing logic.
 *
 * RULE: If config value is null (not set), SKIP the feature and log warning.
 *       Do NOT throw errors for missing config.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface InboundProcessingConfig {
  // Call Queue Routing
  CALL_QUEUE_PRIORITY_THRESHOLD: number | null;
  CALL_QUEUE_GOLD_LABEL_PRIORITY: number | null;
  CALL_QUEUE_GREEN_TAG_PRIORITY: number | null;

  // Priority Weights (for priority score calculation)
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
  // Call Queue
  CALL_QUEUE_PRIORITY_THRESHOLD: "CALL_QUEUE_PRIORITY_THRESHOLD",
  CALL_QUEUE_GOLD_LABEL_PRIORITY: "CALL_QUEUE_GOLD_LABEL_PRIORITY",
  CALL_QUEUE_GREEN_TAG_PRIORITY: "CALL_QUEUE_GREEN_TAG_PRIORITY",

  // Weights
  WEIGHT_EMAIL_CAPTURED: "WEIGHT_EMAIL_CAPTURED",
  WEIGHT_MOBILE_CAPTURED: "WEIGHT_MOBILE_CAPTURED",
  WEIGHT_CONTACT_VERIFIED: "WEIGHT_CONTACT_VERIFIED",
  WEIGHT_WANTS_CALL: "WEIGHT_WANTS_CALL",
  WEIGHT_QUESTION_ASKED: "WEIGHT_QUESTION_ASKED",
  WEIGHT_HIGH_INTENT: "WEIGHT_HIGH_INTENT",
  WEIGHT_INBOUND_RESPONSE: "WEIGHT_INBOUND_RESPONSE",

  // Retry
  MAX_RETRY_ATTEMPTS: "MAX_RETRY_ATTEMPTS",
  RETRY_COOLDOWN_HOURS: "RETRY_COOLDOWN_HOURS",

  // Batch
  DAILY_BATCH_SIZE: "DAILY_BATCH_SIZE",
  SMS_BATCH_SIZE: "SMS_BATCH_SIZE",

  // Feature Flags
  AUTO_ROUTE_TO_CALL_CENTER: "AUTO_ROUTE_TO_CALL_CENTER",
  AUTO_RESOLVE_THREADS: "AUTO_RESOLVE_THREADS",
  LOG_LEAD_EVENTS: "LOG_LEAD_EVENTS",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

/**
 * Parse environment variable as number or null
 */
function envNumber(key: string): number | null {
  const val = process.env[key];
  if (!val || val.trim() === "") return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse environment variable as boolean (defaults to false if not set)
 */
function envBool(key: string): boolean {
  const val = process.env[key];
  return val === "true" || val === "1";
}

/**
 * Load inbound processing config from environment variables
 *
 * IMPORTANT: All numeric values are null if not set.
 * Processing logic should check for null and skip/warn accordingly.
 */
export function loadInboundConfig(): InboundProcessingConfig {
  const config: InboundProcessingConfig = {
    // Call Queue
    CALL_QUEUE_PRIORITY_THRESHOLD: envNumber(
      CONFIG_KEYS.CALL_QUEUE_PRIORITY_THRESHOLD,
    ),
    CALL_QUEUE_GOLD_LABEL_PRIORITY: envNumber(
      CONFIG_KEYS.CALL_QUEUE_GOLD_LABEL_PRIORITY,
    ),
    CALL_QUEUE_GREEN_TAG_PRIORITY: envNumber(
      CONFIG_KEYS.CALL_QUEUE_GREEN_TAG_PRIORITY,
    ),

    // Weights
    WEIGHT_EMAIL_CAPTURED: envNumber(CONFIG_KEYS.WEIGHT_EMAIL_CAPTURED),
    WEIGHT_MOBILE_CAPTURED: envNumber(CONFIG_KEYS.WEIGHT_MOBILE_CAPTURED),
    WEIGHT_CONTACT_VERIFIED: envNumber(CONFIG_KEYS.WEIGHT_CONTACT_VERIFIED),
    WEIGHT_WANTS_CALL: envNumber(CONFIG_KEYS.WEIGHT_WANTS_CALL),
    WEIGHT_QUESTION_ASKED: envNumber(CONFIG_KEYS.WEIGHT_QUESTION_ASKED),
    WEIGHT_HIGH_INTENT: envNumber(CONFIG_KEYS.WEIGHT_HIGH_INTENT),
    WEIGHT_INBOUND_RESPONSE: envNumber(CONFIG_KEYS.WEIGHT_INBOUND_RESPONSE),

    // Retry
    MAX_RETRY_ATTEMPTS: envNumber(CONFIG_KEYS.MAX_RETRY_ATTEMPTS),
    RETRY_COOLDOWN_HOURS: envNumber(CONFIG_KEYS.RETRY_COOLDOWN_HOURS),

    // Batch
    DAILY_BATCH_SIZE: envNumber(CONFIG_KEYS.DAILY_BATCH_SIZE),
    SMS_BATCH_SIZE: envNumber(CONFIG_KEYS.SMS_BATCH_SIZE),

    // Feature Flags (default false)
    AUTO_ROUTE_TO_CALL_CENTER: envBool(CONFIG_KEYS.AUTO_ROUTE_TO_CALL_CENTER),
    AUTO_RESOLVE_THREADS: envBool(CONFIG_KEYS.AUTO_RESOLVE_THREADS),
    LOG_LEAD_EVENTS: envBool(CONFIG_KEYS.LOG_LEAD_EVENTS),
  };

  // Log warnings for missing critical config (but don't fail)
  if (config.CALL_QUEUE_PRIORITY_THRESHOLD === null) {
    console.warn(
      `[InboundConfig] ${CONFIG_KEYS.CALL_QUEUE_PRIORITY_THRESHOLD} not set - call queue routing will use label-based logic only`,
    );
  }

  return config;
}

/**
 * Singleton config instance
 */
let _config: InboundProcessingConfig | null = null;

/**
 * Get the inbound processing config (cached singleton)
 */
export function getInboundConfig(): InboundProcessingConfig {
  if (!_config) {
    _config = loadInboundConfig();
    console.log(
      "[InboundConfig] Configuration loaded",
      JSON.stringify(
        {
          CALL_QUEUE_PRIORITY_THRESHOLD: _config.CALL_QUEUE_PRIORITY_THRESHOLD,
          AUTO_ROUTE_TO_CALL_CENTER: _config.AUTO_ROUTE_TO_CALL_CENTER,
          AUTO_RESOLVE_THREADS: _config.AUTO_RESOLVE_THREADS,
        },
        null,
        2,
      ),
    );
  }
  return _config;
}

/**
 * Reset config (for testing)
 */
export function resetInboundConfig(): void {
  _config = null;
}

/**
 * Check if a specific config key is set
 */
export function isConfigSet(key: keyof InboundProcessingConfig): boolean {
  const config = getInboundConfig();
  const value = config[key];
  return value !== null && value !== undefined;
}

/**
 * Get config value with type safety, returns null if not set
 */
export function getConfigValue<K extends keyof InboundProcessingConfig>(
  key: K,
): InboundProcessingConfig[K] {
  return getInboundConfig()[key];
}
