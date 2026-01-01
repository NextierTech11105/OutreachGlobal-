/**
 * NEXTIER OUTREACH STAGE ENUMS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * These define the OUTREACH CONTEXT for cartridge selection.
 * Complementary to LeadStatus (funnel position) - these drive messaging approach.
 *
 * Philosophy:
 * - Stopping is a feature, not a failure
 * - Silence is information, not absence
 * - Learning happens between runs, never mid-flight
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Outreach stages determine which cartridge type to use
 */
export enum OutreachStage {
  INITIAL = "initial", // First contact
  RETARGET = "retarget", // Re-engagement after silence
  NUDGE = "nudge", // Low-pressure follow-up
  FOLLOW_UP = "follow_up", // After positive signal
  BOOK_APPOINTMENT = "book_appointment", // Calendar booking
  NURTURE = "nurture", // Long-term relationship
  HOLSTER = "holster", // Stopped/archived
  OPTED_OUT = "opted_out", // STOP compliance (terminal)
}

/**
 * Valid stage transitions - what each stage can move to
 */
export const OUTREACH_STAGE_TRANSITIONS: Record<OutreachStage, OutreachStage[]> =
  {
    [OutreachStage.INITIAL]: [
      OutreachStage.FOLLOW_UP,
      OutreachStage.RETARGET,
      OutreachStage.HOLSTER,
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.RETARGET]: [
      OutreachStage.FOLLOW_UP,
      OutreachStage.NUDGE,
      OutreachStage.HOLSTER,
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.NUDGE]: [
      OutreachStage.FOLLOW_UP,
      OutreachStage.NURTURE,
      OutreachStage.HOLSTER,
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.FOLLOW_UP]: [
      OutreachStage.BOOK_APPOINTMENT,
      OutreachStage.NURTURE,
      OutreachStage.HOLSTER,
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.BOOK_APPOINTMENT]: [
      OutreachStage.NURTURE,
      OutreachStage.HOLSTER,
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.NURTURE]: [
      OutreachStage.INITIAL, // Can re-enter cycle
      OutreachStage.HOLSTER,
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.HOLSTER]: [
      OutreachStage.INITIAL, // Can be reactivated
      OutreachStage.OPTED_OUT,
    ],
    [OutreachStage.OPTED_OUT]: [], // Terminal state - no transitions allowed
  };

/**
 * Cartridge status during execution
 */
export enum CartridgeStatus {
  PENDING = "pending", // Not yet started
  ACTIVE = "active", // Currently executing
  PAUSED = "paused", // Waiting for reply/event
  COMPLETED = "completed", // Finished successfully
  HOLSTERED = "holstered", // Stopped after max attempts
  INTERRUPTED = "interrupted", // Reply received
}

/**
 * Tone escalation sequence for 5 attempts
 */
export enum ToneType {
  AUTHORITY = "authority", // Attempt 1
  CURIOSITY = "curiosity", // Attempt 2
  DIRECT = "direct", // Attempt 3
  HUMOR = "humor", // Attempt 4
  FINAL = "final", // Attempt 5 - then HOLSTER
}

/**
 * The 5-attempt tone sequence
 */
export const TONE_SEQUENCE: ToneType[] = [
  ToneType.AUTHORITY,
  ToneType.CURIOSITY,
  ToneType.DIRECT,
  ToneType.HUMOR,
  ToneType.FINAL,
];

/**
 * Get tone for attempt number (1-5)
 */
export function getToneForAttempt(attempt: number): ToneType {
  if (attempt < 1) return ToneType.AUTHORITY;
  if (attempt > 5) return ToneType.FINAL;
  return TONE_SEQUENCE[attempt - 1];
}

/**
 * Check if stage transition is valid
 */
export function isValidStageTransition(
  from: OutreachStage,
  to: OutreachStage
): boolean {
  return OUTREACH_STAGE_TRANSITIONS[from].includes(to);
}

/**
 * Check if stage is terminal (no further outreach)
 */
export function isTerminalStage(stage: OutreachStage): boolean {
  return (
    stage === OutreachStage.OPTED_OUT || stage === OutreachStage.HOLSTER
  );
}

/**
 * Maximum attempts per cartridge (hard limit)
 */
export const MAX_CARTRIDGE_ATTEMPTS = 5 as const;
