/**
 * Phone Pool Rotation Service
 *
 * Enables automatic round-robin rotation through SignalHouse SMS phone numbers.
 * Benefits:
 * - Distributes sending load across numbers
 * - Avoids carrier rate limits (10DLC throughput caps)
 * - Improves deliverability by not hammering single number
 * - Auto-disables failing numbers to maintain reputation
 *
 * This is ADDITIVE - coexists with worker_phone_assignments.
 * Uses sms_phone_pool table if populated, falls back to legacy.
 */

import { db } from "@/lib/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { smsPhonePool } from "@/lib/db/schema";

// ============================================================
// TYPES
// ============================================================

export type RotationStrategy = "round-robin" | "least-used" | "best-health";

export interface RotationResult {
  phoneNumber: string;
  poolEntryId: string;
  workerId?: string;
  rotationIndex: number;
}

export interface PhoneHealthStats {
  phoneNumber: string;
  sendCount: number;
  successCount: number;
  failureCount: number;
  deliveryRate: number | null;
  isHealthy: boolean;
  consecutiveFailures: number;
  dailySendCount: number;
}

// ============================================================
// PHONE SELECTION (ROTATION)
// ============================================================

/**
 * Select next phone number using rotation strategy.
 * Default: round-robin (LRU - least recently used)
 *
 * @param teamId - Team to select phone for
 * @param workerId - Optional: limit to specific worker's numbers
 * @param strategy - round-robin | least-used | best-health
 * @returns Phone number info or null if none available
 */
export async function selectNextPhone(
  teamId: string,
  workerId?: string,
  strategy: RotationStrategy = "round-robin",
): Promise<RotationResult | null> {
  try {
    // Build where conditions
    const conditions = [
      eq(smsPhonePool.teamId, teamId),
      eq(smsPhonePool.isActive, true),
      eq(smsPhonePool.isHealthy, true),
    ];

    // Filter by worker if specified
    if (workerId) {
      conditions.push(eq(smsPhonePool.workerId, workerId));
    }

    // Determine ordering based on strategy
    let orderBy;
    switch (strategy) {
      case "round-robin":
        // LRU: oldest lastUsedAt first (nulls = never used = highest priority)
        orderBy = [sql`${smsPhonePool.lastUsedAt} ASC NULLS FIRST`];
        break;
      case "least-used":
        // Lowest send count first
        orderBy = [asc(smsPhonePool.sendCount)];
        break;
      case "best-health":
        // Highest delivery rate first (nulls last)
        orderBy = [sql`${smsPhonePool.deliveryRate} DESC NULLS LAST`];
        break;
      default:
        orderBy = [sql`${smsPhonePool.lastUsedAt} ASC NULLS FIRST`];
    }

    // Query for next phone
    const phone = await db.query.smsPhonePool.findFirst({
      where: and(...conditions),
      orderBy,
    });

    if (!phone) {
      return null;
    }

    // Atomically update lastUsedAt and increment counters
    await db
      .update(smsPhonePool)
      .set({
        lastUsedAt: new Date(),
        sendCount: sql`${smsPhonePool.sendCount} + 1`,
        dailySendCount: sql`${smsPhonePool.dailySendCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(smsPhonePool.id, phone.id));

    return {
      phoneNumber: phone.phoneNumber,
      poolEntryId: phone.id,
      workerId: phone.workerId || undefined,
      rotationIndex: phone.rotationIndex,
    };
  } catch (error) {
    console.error("[PhoneRotation] Failed to select next phone:", error);
    return null;
  }
}

// ============================================================
// RESULT TRACKING
// ============================================================

/**
 * Record send result for health tracking.
 * Auto-disables number after 5 consecutive failures.
 *
 * @param poolEntryId - ID from selectNextPhone result
 * @param result - success | failure | rate-limited
 */
export async function recordSendResult(
  poolEntryId: string,
  result: "success" | "failure" | "rate-limited",
): Promise<void> {
  try {
    if (result === "success") {
      // Success: increment counter, reset consecutive failures
      await db
        .update(smsPhonePool)
        .set({
          successCount: sql`${smsPhonePool.successCount} + 1`,
          consecutiveFailures: 0,
          updatedAt: new Date(),
        })
        .where(eq(smsPhonePool.id, poolEntryId));
    } else if (result === "failure") {
      // Failure: increment counters
      await db
        .update(smsPhonePool)
        .set({
          failureCount: sql`${smsPhonePool.failureCount} + 1`,
          consecutiveFailures: sql`${smsPhonePool.consecutiveFailures} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(smsPhonePool.id, poolEntryId));

      // Auto-disable if too many consecutive failures (>= 5)
      await db
        .update(smsPhonePool)
        .set({
          isHealthy: false,
          lastHealthCheckAt: new Date(),
        })
        .where(
          and(
            eq(smsPhonePool.id, poolEntryId),
            sql`${smsPhonePool.consecutiveFailures} >= 5`,
          ),
        );
    }
    // rate-limited: no increment needed, just logged

    // Update delivery rate calculation
    await db.execute(sql`
      UPDATE sms_phone_pool
      SET delivery_rate = CASE
        WHEN send_count > 0 THEN success_count::float / send_count
        ELSE NULL
      END
      WHERE id = ${poolEntryId}
    `);
  } catch (error) {
    // Non-critical: log but don't throw
    console.error("[PhoneRotation] Failed to record send result:", error);
  }
}

// ============================================================
// MAINTENANCE FUNCTIONS
// ============================================================

/**
 * Reset daily send counts.
 * Call via cron at midnight (local time or UTC).
 *
 * @param teamId - Optional: reset for specific team only
 */
export async function resetDailyCounts(teamId?: string): Promise<number> {
  try {
    const condition = teamId ? eq(smsPhonePool.teamId, teamId) : undefined;

    const result = await db
      .update(smsPhonePool)
      .set({
        dailySendCount: 0,
        dailyLimitResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(condition);

    console.log(
      `[PhoneRotation] Reset daily counts${teamId ? ` for team ${teamId}` : ""}`,
    );
    return 0; // Drizzle doesn't return affected count easily
  } catch (error) {
    console.error("[PhoneRotation] Failed to reset daily counts:", error);
    throw error;
  }
}

/**
 * Re-enable a phone number after manual fix.
 * Use when admin has resolved the issue causing failures.
 *
 * @param poolEntryId - ID of the phone pool entry
 */
export async function reEnablePhone(poolEntryId: string): Promise<void> {
  await db
    .update(smsPhonePool)
    .set({
      isHealthy: true,
      consecutiveFailures: 0,
      lastHealthCheckAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(smsPhonePool.id, poolEntryId));
}

/**
 * Get health stats for all phones in a team's pool.
 */
export async function getPoolHealthStats(
  teamId: string,
): Promise<PhoneHealthStats[]> {
  const phones = await db.query.smsPhonePool.findMany({
    where: eq(smsPhonePool.teamId, teamId),
    orderBy: [asc(smsPhonePool.rotationIndex)],
  });

  return phones.map((p) => ({
    phoneNumber: p.phoneNumber,
    sendCount: p.sendCount,
    successCount: p.successCount,
    failureCount: p.failureCount,
    deliveryRate: p.deliveryRate,
    isHealthy: p.isHealthy,
    consecutiveFailures: p.consecutiveFailures,
    dailySendCount: p.dailySendCount,
  }));
}

// ============================================================
// POOL MANAGEMENT
// ============================================================

/**
 * Add a phone number to the rotation pool.
 *
 * @param teamId - Team to add phone for
 * @param phoneNumber - E.164 formatted phone number
 * @param workerId - Optional: assign to specific worker
 * @param signalhouseNumberId - Optional: SignalHouse internal ID
 */
export async function addPhoneToPool(
  teamId: string,
  phoneNumber: string,
  workerId?: string,
  signalhouseNumberId?: string,
): Promise<string> {
  // Get current max rotation index for this team/worker
  const existing = await db.query.smsPhonePool.findMany({
    where: and(
      eq(smsPhonePool.teamId, teamId),
      workerId
        ? eq(smsPhonePool.workerId, workerId)
        : sql`${smsPhonePool.workerId} IS NULL`,
    ),
    orderBy: [sql`${smsPhonePool.rotationIndex} DESC`],
    limit: 1,
  });

  const nextIndex = existing.length > 0 ? existing[0].rotationIndex + 1 : 0;

  // Generate ID with spp_ prefix
  const id = `spp_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;

  await db.insert(smsPhonePool).values({
    id,
    teamId,
    phoneNumber,
    workerId: workerId || null,
    signalhouseNumberId: signalhouseNumberId || null,
    rotationIndex: nextIndex,
    isActive: true,
    isHealthy: true,
    sendCount: 0,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    dailySendCount: 0,
  });

  console.log(
    `[PhoneRotation] Added phone ${phoneNumber} to pool for team ${teamId} (index: ${nextIndex})`,
  );

  return id;
}

/**
 * Remove a phone from the rotation pool.
 * Does not delete - just marks inactive.
 */
export async function removePhoneFromPool(poolEntryId: string): Promise<void> {
  await db
    .update(smsPhonePool)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(smsPhonePool.id, poolEntryId));
}

/**
 * Check if rotation pool is configured for a team.
 * Returns true if pool has active numbers.
 */
export async function hasRotationPool(teamId: string): Promise<boolean> {
  const count = await db.query.smsPhonePool.findFirst({
    where: and(
      eq(smsPhonePool.teamId, teamId),
      eq(smsPhonePool.isActive, true),
    ),
  });

  return count !== undefined;
}
