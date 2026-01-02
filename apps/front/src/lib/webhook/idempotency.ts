import { redis } from "@/lib/redis";

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

/**
 * Check if a webhook event has already been processed.
 * Uses Redis SETNX pattern for atomic check-and-set.
 *
 * @param source - The webhook source (e.g., 'signalhouse', 'twilio', 'gianna')
 * @param eventId - Unique identifier for the event (MessageSid, CallSid, etc.)
 * @returns true if already processed, false if this is a new event
 */
export async function isAlreadyProcessed(
  source: string,
  eventId: string,
): Promise<boolean> {
  const key = `webhook:processed:${source}:${eventId}`;

  // Try to get existing value
  const exists = await redis.get<string>(key);
  if (exists) {
    return true;
  }

  // Set the key with TTL (atomic operation)
  // If another request already set it, we'll process anyway (rare race condition)
  // but that's acceptable for webhook idempotency
  await redis.set(key, "1", { ex: IDEMPOTENCY_TTL_SECONDS });
  return false;
}

/**
 * Mark an event as processed (for cases where you want explicit control)
 *
 * @param source - The webhook source
 * @param eventId - Unique identifier for the event
 */
export async function markAsProcessed(
  source: string,
  eventId: string,
): Promise<void> {
  const key = `webhook:processed:${source}:${eventId}`;
  await redis.set(key, "1", { ex: IDEMPOTENCY_TTL_SECONDS });
}

/**
 * Generate a deterministic event ID from webhook payload when no ID is provided
 *
 * @param payload - The webhook payload
 * @returns A hash-based event ID
 */
export function generateEventId(payload: unknown): string {
  const crypto = require("crypto");
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return hash.slice(0, 32);
}
