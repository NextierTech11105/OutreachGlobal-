/**
 * SMS Rate Limiter (Redis-backed)
 *
 * Enforces carrier TPM (transactions per minute) limits to prevent message rejections.
 * Carrier limits (SignalHouse 10DLC):
 * - AT&T: 75 SMS/min
 * - T-Mobile: 60 SMS/min
 * - Verizon: 60 SMS/min
 * - Other: 60 SMS/min (conservative default)
 *
 * Uses Redis sliding window for distributed deployments.
 * Falls back to in-memory if Redis unavailable.
 */

import { redis, isRedisAvailable } from "../redis";

// Window size in seconds (1 minute)
const WINDOW_SECONDS = 60;

// In-memory fallback (for when Redis is down)
const memoryStore: Map<string, number[]> = new Map();

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
 * Redis key for carrier rate limiting (tenant-isolated)
 */
function getRateLimitKey(teamId: string, carrier: string): string {
  const minute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  return `rate:sms:${teamId}:${carrier.toLowerCase()}:${minute}`;
}

/**
 * Check if we can send a message to this carrier (Redis version)
 */
async function canSendRedis(
  teamId: string,
  carrier: string,
): Promise<{
  allowed: boolean;
  remaining: number;
  resetMs: number;
  carrier: string;
  limit: number;
}> {
  const limit = getCarrierLimit(carrier);
  const key = getRateLimitKey(teamId, carrier);

  // Get current count
  const count = (await redis.get<number>(key)) || 0;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count);

  // Calculate reset time (end of current window)
  const currentMinute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const nextMinuteStart = (currentMinute + 1) * WINDOW_SECONDS * 1000;
  const resetMs = nextMinuteStart - Date.now();

  return {
    allowed,
    remaining,
    resetMs: Math.max(0, resetMs),
    carrier,
    limit,
  };
}

/**
 * Record a sent message (Redis version)
 */
async function recordSendRedis(teamId: string, carrier: string): Promise<void> {
  const key = getRateLimitKey(teamId, carrier);

  // Increment counter
  const newCount = await redis.incrby(key, 1);

  // Set expiry on first increment (2 minutes to ensure window cleanup)
  if (newCount === 1) {
    await redis.expire(key, WINDOW_SECONDS * 2);
  }
}

/**
 * In-memory fallback: clean old entries from the window
 */
function cleanMemoryWindow(teamId: string, carrier: string): number[] {
  const now = Date.now();
  const cutoff = now - WINDOW_SECONDS * 1000;
  const key = `${teamId}:${carrier}`;
  const timestamps = memoryStore.get(key) || [];
  const filtered = timestamps.filter((ts) => ts > cutoff);
  memoryStore.set(key, filtered);
  return filtered;
}

/**
 * Check if we can send a message to this carrier (Memory fallback)
 */
function canSendMemory(
  teamId: string,
  carrier: string,
): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  carrier: string;
  limit: number;
} {
  const limit = getCarrierLimit(carrier);
  const timestamps = cleanMemoryWindow(teamId, carrier);
  const count = timestamps.length;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count);
  const resetMs =
    timestamps.length > 0
      ? timestamps[0] + WINDOW_SECONDS * 1000 - Date.now()
      : 0;

  return {
    allowed,
    remaining,
    resetMs: Math.max(0, resetMs),
    carrier,
    limit,
  };
}

/**
 * Record a sent message (Memory fallback)
 */
function recordSendMemory(teamId: string, carrier: string): void {
  const timestamps = cleanMemoryWindow(teamId, carrier);
  timestamps.push(Date.now());
  const key = `${teamId}:${carrier}`;
  memoryStore.set(key, timestamps);
}

/**
 * Check if we can send a message to this carrier
 * @param teamId - Team ID for tenant isolation (defaults to "global")
 * @param carrier - Carrier name for rate limit lookup
 */
export async function canSend(
  teamId: string = "global",
  carrier: string = "default",
): Promise<{
  allowed: boolean;
  remaining: number;
  resetMs: number;
  carrier: string;
  limit: number;
}> {
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

  // Use Redis if available, otherwise fall back to memory
  if (isRedisAvailable()) {
    return canSendRedis(teamId, carrier);
  }

  return canSendMemory(teamId, carrier);
}

/**
 * Record a sent message for rate limiting
 * @param teamId - Team ID for tenant isolation (defaults to "global")
 * @param carrier - Carrier name for rate limit lookup
 */
export async function recordSend(
  teamId: string = "global",
  carrier: string = "default",
): Promise<void> {
  const config = getRateLimitConfig();
  if (!config.SMS_RATE_LIMIT_ENABLED) return;

  // Use Redis if available, otherwise fall back to memory
  if (isRedisAvailable()) {
    await recordSendRedis(teamId, carrier);
  } else {
    recordSendMemory(teamId, carrier);
  }
}

/**
 * Check rate limit and return appropriate response if blocked
 * @param teamId - Team ID for tenant isolation (defaults to "global")
 * @param carrier - Carrier name for rate limit lookup
 */
export async function checkRateLimit(
  teamId: string = "global",
  carrier: string = "default",
): Promise<{
  blocked: boolean;
  response?: {
    error: string;
    retryAfterMs: number;
    carrier: string;
    limit: number;
  };
}> {
  const result = await canSend(teamId, carrier);

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
 * @param teamId - Team ID for tenant isolation (defaults to "global")
 */
export async function getRateLimitStatus(
  teamId: string = "global",
): Promise<
  Record<string, { count: number; limit: number; remaining: number }>
> {
  const carriers = ["att", "tmobile", "verizon", "default"];
  const status: Record<
    string,
    { count: number; limit: number; remaining: number }
  > = {};

  for (const carrier of carriers) {
    const result = await canSend(teamId, carrier);
    status[carrier] = {
      count: result.limit - result.remaining,
      limit: result.limit,
      remaining: result.remaining,
    };
  }

  return status;
}

/**
 * Clear rate limit data (for testing)
 */
export function clearRateLimits(): void {
  memoryStore.clear();
}
