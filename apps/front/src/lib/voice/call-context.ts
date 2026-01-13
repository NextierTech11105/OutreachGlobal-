/**
 * Call Context Resolver
 *
 * Resolves the correct Twilio voice context (phone number, team, worker)
 * for making outbound calls on behalf of a tenant.
 *
 * Uses EXISTING infrastructure:
 * - teams table: for team lookup
 * - twilio_numbers table: for voice number management (NEW)
 * - worker_phone_assignments table: fallback for SMS numbers that can also do voice
 */

import { db } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { teams, workerPhoneAssignments } from "@/lib/db/schema";

// ============================================================
// TYPES
// ============================================================

export interface CallContext {
  teamId: string;
  teamName: string;
  // Twilio identifiers
  twilioNumber: string;
  twilioSid?: string;
  // Worker info (if applicable)
  workerId?: string;
  workerName?: string;
  // Queue context
  queueId?: string;
  leadId?: string;
}

export interface CallContextError {
  code: "TEAM_NOT_FOUND" | "NO_VOICE_NUMBER" | "NUMBER_INACTIVE";
  message: string;
}

export type CallContextResult =
  | { success: true; context: CallContext }
  | { success: false; error: CallContextError };

// ============================================================
// RESOLVE CALL CONTEXT
// ============================================================

/**
 * Resolve the full Twilio context for making voice calls.
 *
 * @param teamId - The team making the call
 * @param options - Optional preferences for worker
 * @returns CallContext with all identifiers needed for Twilio API
 */
export async function getCallContext(
  teamId: string,
  options?: {
    preferredWorkerId?: string;
    queueId?: string;
    leadId?: string;
  }
): Promise<CallContextResult> {
  try {
    // 1. Get team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return {
        success: false,
        error: {
          code: "TEAM_NOT_FOUND",
          message: `Team not found: ${teamId}`,
        },
      };
    }

    // 2. Try to get voice number from twilio_numbers table
    // Using raw SQL since twilio_numbers may be in API schema
    try {
      const twilioNumberResult = await db.execute(sql`
        SELECT phone_number, twilio_sid, friendly_name, status
        FROM twilio_numbers
        WHERE team_id = ${teamId}
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (twilioNumberResult.rows && twilioNumberResult.rows.length > 0) {
        const row = twilioNumberResult.rows[0] as any;
        return {
          success: true,
          context: {
            teamId,
            teamName: team.name || "Unknown",
            twilioNumber: row.phone_number,
            twilioSid: row.twilio_sid,
            workerId: options?.preferredWorkerId,
            workerName: options?.preferredWorkerId
              ? getWorkerDisplayName(options.preferredWorkerId)
              : undefined,
            queueId: options?.queueId,
            leadId: options?.leadId,
          },
        };
      }
    } catch {
      // twilio_numbers table may not exist yet - fall through to fallback
    }

    // 3. Fallback: Check team_settings for twilioPhoneNumber
    // (Legacy support - teams table may have this field)
    const teamPhoneNumber = (team as any).twilioPhoneNumber;
    if (teamPhoneNumber) {
      return {
        success: true,
        context: {
          teamId,
          teamName: team.name || "Unknown",
          twilioNumber: teamPhoneNumber,
          workerId: options?.preferredWorkerId,
          workerName: options?.preferredWorkerId
            ? getWorkerDisplayName(options.preferredWorkerId)
            : undefined,
          queueId: options?.queueId,
          leadId: options?.leadId,
        },
      };
    }

    // 4. Fallback: Check worker_phone_assignments for a voice-capable number
    // (Some SMS numbers can also do voice)
    const workerQuery = options?.preferredWorkerId
      ? and(
          eq(workerPhoneAssignments.teamId, teamId),
          eq(workerPhoneAssignments.workerId, options.preferredWorkerId),
          eq(workerPhoneAssignments.isActive, true)
        )
      : and(
          eq(workerPhoneAssignments.teamId, teamId),
          eq(workerPhoneAssignments.isActive, true)
        );

    const workerPhone = await db.query.workerPhoneAssignments.findFirst({
      where: workerQuery,
    });

    if (workerPhone) {
      return {
        success: true,
        context: {
          teamId,
          teamName: team.name || "Unknown",
          twilioNumber: workerPhone.phoneNumber,
          workerId: workerPhone.workerId,
          workerName: workerPhone.workerName,
          queueId: options?.queueId,
          leadId: options?.leadId,
        },
      };
    }

    // 5. Last resort: Use env var (not multi-tenant, but prevents total failure)
    const envNumber =
      process.env.SABRINA_PHONE_NUMBER ||
      process.env.TWILIO_PHONE_NUMBER ||
      process.env.DEFAULT_OUTBOUND_NUMBER;

    if (envNumber) {
      console.warn(
        `[CallContext] Team ${teamId} has no dedicated voice number - using env fallback`,
      );
      return {
        success: true,
        context: {
          teamId,
          teamName: team.name || "Unknown",
          twilioNumber: envNumber,
          workerId: options?.preferredWorkerId,
          workerName: options?.preferredWorkerId
            ? getWorkerDisplayName(options.preferredWorkerId)
            : undefined,
          queueId: options?.queueId,
          leadId: options?.leadId,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "NO_VOICE_NUMBER",
        message: "No voice number found for team",
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to resolve call context: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================
// WORKER-SPECIFIC RESOLVERS
// ============================================================

/**
 * Get call context for SABRINA (closer worker - books calls).
 */
export async function getSabrinaCallContext(
  teamId: string,
  options?: { queueId?: string; leadId?: string }
): Promise<CallContextResult> {
  return getCallContext(teamId, {
    preferredWorkerId: "sabrina",
    ...options,
  });
}

// ============================================================
// PHONE NUMBER LOOKUP
// ============================================================

/**
 * Resolve tenant info from an inbound voice number.
 * Used for inbound call routing.
 *
 * @param phoneNumber - E.164 formatted phone number
 * @returns Tenant info if found
 */
export async function resolveTenantFromVoiceNumber(
  phoneNumber: string
): Promise<{
  teamId: string;
  teamName: string;
  twilioSid?: string;
} | null> {
  const normalized = normalizePhoneNumber(phoneNumber);

  // Try twilio_numbers first
  try {
    const result = await db.execute(sql`
      SELECT tn.team_id, tn.twilio_sid, t.name as team_name
      FROM twilio_numbers tn
      JOIN teams t ON t.id = tn.team_id
      WHERE tn.phone_number = ${normalized}
      LIMIT 1
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        teamId: row.team_id,
        teamName: row.team_name || "Unknown",
        twilioSid: row.twilio_sid,
      };
    }
  } catch {
    // twilio_numbers table may not exist yet
  }

  // Fallback: check worker_phone_assignments
  const assignment = await db.query.workerPhoneAssignments.findFirst({
    where: eq(workerPhoneAssignments.phoneNumber, normalized),
  });

  if (assignment) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, assignment.teamId),
    });

    return {
      teamId: assignment.teamId,
      teamName: team?.name || "Unknown",
    };
  }

  return null;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Normalize phone number to E.164 format.
 */
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return phone.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Get display name for a worker ID.
 */
function getWorkerDisplayName(workerId: string): string {
  const names: Record<string, string> = {
    gianna: "GIANNA (Opener)",
    cathy: "CATHY (Nudger)",
    sabrina: "SABRINA (Closer)",
    neva: "NEVA (Research)",
    luci: "LUCI (Coordinator)",
  };
  return names[workerId.toLowerCase()] || workerId;
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Check if a team has voice calling capability.
 */
export async function validateTeamCanCall(teamId: string): Promise<{
  canCall: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    return { canCall: false, issues: ["Team not found"] };
  }

  // Check for Twilio number
  const callContext = await getCallContext(teamId);
  if (!callContext.success) {
    issues.push(callContext.error.message);
  }

  // Check for Twilio credentials (env-based for now)
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    issues.push("Twilio credentials not configured");
  }

  return {
    canCall: issues.length === 0,
    issues,
  };
}
