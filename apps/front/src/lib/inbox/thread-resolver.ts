/**
 * THREAD RESOLVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * Auto-resolves inbox threads when data capture requirements are satisfied.
 * NO human gate required when requested data is captured.
 *
 * Resolution Logic:
 * - Thread requesting email → Resolve when email captured
 * - Thread requesting phone → Resolve when phone captured
 * - Thread requesting both → Resolve when both captured
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import {
  getInboundConfig,
  type InboundProcessingConfig,
} from "../config/inbound-processing.config";
import { CANONICAL_LABELS, type CanonicalLabel } from "../labels/canonical-labels";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type RequestedData = "email" | "phone" | "both" | "none";

export interface CapturedData {
  email?: string | null;
  phone?: string | null;
}

export interface ThreadResolutionResult {
  resolved: boolean;
  reason: string;
  missingData?: RequestedData;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect what data the outbound message was requesting
 * Analyzes the last outbound message in the thread
 */
export function detectRequestedData(outboundMessage: string): RequestedData {
  const normalized = outboundMessage.toLowerCase();

  const asksEmail =
    normalized.includes("email") ||
    normalized.includes("e-mail") ||
    normalized.includes("send me your email") ||
    normalized.includes("what's your email") ||
    normalized.includes("best email");

  const asksPhone =
    normalized.includes("phone") ||
    normalized.includes("number") ||
    normalized.includes("call you") ||
    normalized.includes("mobile") ||
    normalized.includes("cell");

  if (asksEmail && asksPhone) {
    return "both";
  } else if (asksEmail) {
    return "email";
  } else if (asksPhone) {
    return "phone";
  }

  return "none";
}

/**
 * Check if captured data satisfies the request
 */
export function dataSatisfiesRequest(
  requested: RequestedData,
  captured: CapturedData,
): boolean {
  switch (requested) {
    case "email":
      return !!captured.email && captured.email.length > 0;
    case "phone":
      return !!captured.phone && captured.phone.length > 0;
    case "both":
      return (
        !!captured.email &&
        captured.email.length > 0 &&
        !!captured.phone &&
        captured.phone.length > 0
      );
    case "none":
      // No specific data requested, can't auto-resolve based on data capture
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RESOLUTION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate if a thread should be auto-resolved based on data capture
 *
 * RULE: When requested data is captured, thread auto-resolves (no human gate)
 *
 * @param inboxItemId - The inbox item ID to potentially resolve
 * @param requestedData - What data was being requested (email, phone, both)
 * @param capturedData - What data was captured from inbound message
 * @param config - Optional config (defaults to loaded config)
 * @returns Resolution result with reason
 */
export async function evaluateThreadResolution(
  inboxItemId: string,
  requestedData: RequestedData,
  capturedData: CapturedData,
  config?: InboundProcessingConfig,
): Promise<ThreadResolutionResult> {
  const cfg = config || getInboundConfig();

  // Check if auto-resolution is enabled
  if (!cfg.AUTO_RESOLVE_THREADS) {
    console.log(`[ThreadResolver] Auto-resolve disabled, skipping for ${inboxItemId}`);
    return {
      resolved: false,
      reason: "auto_resolve_disabled",
    };
  }

  // No data requested = can't auto-resolve
  if (requestedData === "none") {
    console.log(`[ThreadResolver] No data requested, cannot auto-resolve ${inboxItemId}`);
    return {
      resolved: false,
      reason: "no_data_requested",
    };
  }

  // Check if captured data satisfies request
  const satisfied = dataSatisfiesRequest(requestedData, capturedData);

  if (!satisfied) {
    const missing =
      requestedData === "both"
        ? !capturedData.email
          ? "email"
          : "phone"
        : requestedData;

    console.log(
      `[ThreadResolver] Data not satisfied for ${inboxItemId}: requested=${requestedData}, missing=${missing}`,
    );
    return {
      resolved: false,
      reason: "data_not_satisfied",
      missingData: missing as RequestedData,
    };
  }

  // Data satisfied - mark as resolved
  try {
    await markInboxItemResolved(inboxItemId, requestedData, capturedData);
    console.log(
      `[ThreadResolver] ✅ Auto-resolved ${inboxItemId}: ${requestedData} captured`,
    );
    return {
      resolved: true,
      reason: "data_captured",
    };
  } catch (error) {
    console.error(`[ThreadResolver] Error resolving ${inboxItemId}:`, error);
    return {
      resolved: false,
      reason: "resolution_error",
    };
  }
}

/**
 * Mark an inbox item as resolved/processed
 */
async function markInboxItemResolved(
  inboxItemId: string,
  requestedData: RequestedData,
  capturedData: CapturedData,
): Promise<void> {
  // Update inbox_items table to mark as processed
  // Using raw SQL since inbox_items may be in API schema
  await db.execute(sql`
    UPDATE inbox_items
    SET
      is_processed = true,
      processed_at = NOW(),
      processed_by = 'auto_resolver',
      current_bucket = 'processed',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{resolution}',
        ${JSON.stringify({
          type: "auto_data_capture",
          requestedData,
          capturedEmail: capturedData.email || null,
          capturedPhone: capturedData.phone || null,
          resolvedAt: new Date().toISOString(),
        })}::jsonb
      ),
      updated_at = NOW()
    WHERE id = ${inboxItemId}
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// LABEL-BASED RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate thread resolution based on detected labels
 * Simpler interface when you have labels but not raw captured data
 */
export async function evaluateThreadResolutionFromLabels(
  inboxItemId: string,
  lastOutboundMessage: string,
  detectedLabels: CanonicalLabel[],
  config?: InboundProcessingConfig,
): Promise<ThreadResolutionResult> {
  const cfg = config || getInboundConfig();

  if (!cfg.AUTO_RESOLVE_THREADS) {
    return {
      resolved: false,
      reason: "auto_resolve_disabled",
    };
  }

  // Detect what was requested
  const requestedData = detectRequestedData(lastOutboundMessage);

  if (requestedData === "none") {
    return {
      resolved: false,
      reason: "no_data_requested",
    };
  }

  // Map labels to captured data
  const capturedData: CapturedData = {
    email: detectedLabels.includes(CANONICAL_LABELS.EMAIL_CAPTURED)
      ? "captured"
      : null,
    phone: detectedLabels.includes(CANONICAL_LABELS.MOBILE_CAPTURED)
      ? "captured"
      : null,
  };

  return evaluateThreadResolution(inboxItemId, requestedData, capturedData, cfg);
}

// ─────────────────────────────────────────────────────────────────────────────
// AWAITING STATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark a thread as awaiting specific data
 * Use this when outbound message asks for email/phone
 */
export async function markThreadAwaiting(
  inboxItemId: string,
  awaiting: "email" | "phone" | "both",
): Promise<void> {
  const awaitingLabel =
    awaiting === "email"
      ? CANONICAL_LABELS.AWAITING_EMAIL
      : awaiting === "phone"
        ? CANONICAL_LABELS.AWAITING_PHONE
        : "awaiting_both";

  await db.execute(sql`
    UPDATE inbox_items
    SET
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{awaiting}',
        ${JSON.stringify({
          type: awaiting,
          markedAt: new Date().toISOString(),
        })}::jsonb
      ),
      updated_at = NOW()
    WHERE id = ${inboxItemId}
  `);

  console.log(`[ThreadResolver] Marked ${inboxItemId} as awaiting: ${awaiting}`);
}

/**
 * Get what data a thread is awaiting
 */
export async function getThreadAwaitingState(
  inboxItemId: string,
): Promise<RequestedData> {
  const result = await db.execute(sql`
    SELECT metadata->>'awaiting' as awaiting
    FROM inbox_items
    WHERE id = ${inboxItemId}
  `);

  const rows = result.rows as { awaiting: string | null }[];
  if (!rows[0]?.awaiting) return "none";

  try {
    const awaiting = JSON.parse(rows[0].awaiting);
    return awaiting.type || "none";
  } catch {
    return "none";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process multiple threads for potential resolution
 * Useful for batch processing after label detection
 */
export async function batchEvaluateResolution(
  items: Array<{
    inboxItemId: string;
    lastOutboundMessage: string;
    detectedLabels: CanonicalLabel[];
  }>,
  config?: InboundProcessingConfig,
): Promise<Map<string, ThreadResolutionResult>> {
  const results = new Map<string, ThreadResolutionResult>();

  for (const item of items) {
    const result = await evaluateThreadResolutionFromLabels(
      item.inboxItemId,
      item.lastOutboundMessage,
      item.detectedLabels,
      config,
    );
    results.set(item.inboxItemId, result);
  }

  const resolved = [...results.values()].filter((r) => r.resolved).length;
  console.log(
    `[ThreadResolver] Batch processed ${items.length} items, resolved ${resolved}`,
  );

  return results;
}

// Log on import
console.log("[ThreadResolver] Loaded with auto-resolution support");
