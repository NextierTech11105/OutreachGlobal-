/**
 * SMS Rate Limiter
 *
 * Enforces carrier TPM (transactions per minute) limits to prevent message rejections.
 * Carrier limits (SignalHouse 10DLC):
 * - AT&T: 75 SMS/min
 * - T-Mobile: Daily cap (varies)
 * - Verizon: 60 SMS/min
 * - Other: 100 SMS/min (conservative default)
 *
 * Uses in-memory sliding window for simplicity.
 * For distributed deployments, migrate to Redis.
 */

// Carrier rate limits (messages per minute)
const CARRIER_LIMITS: Record<string, number> = {
  att: 75,
  "at&t": 75,
  tmobile: 60,
  "t-mobile": 60,
  verizon: 60,
  sprint: 60,
  default: 60, // Conservative default
};

// Sliding window storage: carrier -> timestamp[]
const windowStore: Map<string, number[]> = new Map();

// Window size in milliseconds (1 minute)
const WINDOW_MS = 60 * 1000;

/**
 * Get rate limit config from environment
 */
export function getRateLimitConfig() {
  return {
    SMS_RATE_LIMIT_ENABLED: process.env.SMS_RATE_LIMIT_ENABLED !== "false", // Default enabled
    SMS_RATE_LIMIT_ATT: parseInt(process.env.SMS_RATE_LIMIT_ATT || "75", 10),
    SMS_RATE_LIMIT_TMOBILE: parseInt(
      process.env.SMS_RATE_LIMIT_TMOBILE || "60",
      10,
    ),
    SMS_RATE_LIMIT_VERIZON: parseInt(
      process.env.SMS_RATE_LIMIT_VERIZON || "60",
      10,
    ),
    SMS_RATE_LIMIT_DEFAULT: parseInt(
      process.env.SMS_RATE_LIMIT_DEFAULT || "60",
      10,
    ),
  };
}

/**
 * Get the limit for a specific carrier
 */
function getCarrierLimit(carrier: string): number {
  const config = getRateLimitConfig();
  const normalizedCarrier = carrier.toLowerCase().replace(/[^a-z]/g, "");

  if (normalizedCarrier.includes("att") || normalizedCarrier.includes("at&t")) {
    return config.SMS_RATE_LIMIT_ATT;
  }
  if (
    normalizedCarrier.includes("tmobile") ||
    normalizedCarrier.includes("t-mobile")
  ) {
    return config.SMS_RATE_LIMIT_TMOBILE;
  }
  if (normalizedCarrier.includes("verizon")) {
    return config.SMS_RATE_LIMIT_VERIZON;
  }

  return config.SMS_RATE_LIMIT_DEFAULT;
}

/**
 * Clean old entries from the window
 */
function cleanWindow(carrier: string): number[] {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = windowStore.get(carrier) || [];
  const filtered = timestamps.filter((ts) => ts > cutoff);
  windowStore.set(carrier, filtered);
  return filtered;
}

/**
 * Check if we can send a message to this carrier
 */
export function canSend(carrier: string = "default"): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  carrier: string;
  limit: number;
} {
  const config = getRateLimitConfig();

  // Rate limiting disabled
  if (!config.SMS_RATE_LIMIT_ENABLED) {
    return {
      allowed: true,
      remaining: 999,
      resetMs: 0,
      carrier,
      limit: 999,
    };
  }

  const limit = getCarrierLimit(carrier);
  const timestamps = cleanWindow(carrier);
  const count = timestamps.length;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count);

  // Calculate reset time (when oldest entry expires)
  const resetMs =
    timestamps.length > 0 ? timestamps[0] + WINDOW_MS - Date.now() : 0;

  return {
    allowed,
    remaining,
    resetMs: Math.max(0, resetMs),
    carrier,
    limit,
  };
}

/**
 * Record a sent message for rate limiting
 */
export function recordSend(carrier: string = "default"): void {
  const config = getRateLimitConfig();
  if (!config.SMS_RATE_LIMIT_ENABLED) return;

  const timestamps = cleanWindow(carrier);
  timestamps.push(Date.now());
  windowStore.set(carrier, timestamps);
}

/**
 * Check rate limit and return appropriate response if blocked
 */
export function checkRateLimit(carrier: string = "default"): {
  blocked: boolean;
  response?: {
    error: string;
    retryAfterMs: number;
    carrier: string;
    limit: number;
  };
} {
  const result = canSend(carrier);

  if (!result.allowed) {
    return {
      blocked: true,
      response: {
        error: `Rate limit exceeded for carrier ${carrier}. Retry after ${Math.ceil(result.resetMs / 1000)}s`,
        retryAfterMs: result.resetMs,
        carrier: result.carrier,
        limit: result.limit,
      },
    };
  }

  return { blocked: false };
}

/**
 * Get current rate limit status for monitoring
 */
export function getRateLimitStatus(): Record<
  string,
  { count: number; limit: number; remaining: number }
> {
  const config = getRateLimitConfig();
  const status: Record<
    string,
    { count: number; limit: number; remaining: number }
  > = {};

  for (const [carrier, timestamps] of windowStore.entries()) {
    const cleaned = timestamps.filter((ts) => ts > Date.now() - WINDOW_MS);
    const limit = getCarrierLimit(carrier);
    status[carrier] = {
      count: cleaned.length,
      limit,
      remaining: Math.max(0, limit - cleaned.length),
    };
  }

  return status;
}

/**
 * Clear rate limit data (for testing)
 */
export function clearRateLimits(): void {
  windowStore.clear();
}
