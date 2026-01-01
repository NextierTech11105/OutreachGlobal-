/**
 * NEXTIER CARTRIDGE EXECUTION MODEL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "A cartridge is a stage-scoped, versioned execution loop capped at five attempts
 *  that selects approved templates, pauses on silence, halts on reply, and may never
 *  override STOP, human intervention, or stage truth."
 *
 * Philosophy:
 * - Stopping is a feature, not a failure
 * - Silence is information, not absence
 * - Learning happens between runs, never mid-flight
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================
// STAGE DEFINITIONS
// ============================================

/**
 * NEXTIER OUTREACH STAGES
 * These define the CONTEXT for which cartridge type to use.
 *
 * NOTE: This is COMPLEMENTARY to LeadStatus (new, enriching, ready, contacted, etc.)
 * - LeadStatus = Lead's lifecycle state (where they are in the funnel)
 * - LeadStage = Outreach context (which messaging approach to use)
 */
export type LeadStage =
  | "initial" // First contact
  | "retarget" // Re-engagement after silence
  | "nudge" // Low-pressure follow-up
  | "follow_up" // After positive signal
  | "book_appointment" // Calendar booking
  | "nurture" // Long-term relationship
  | "holster" // Stopped/archived
  | "opted_out"; // STOP compliance

export const STAGE_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  initial: ["follow_up", "retarget", "holster", "opted_out"],
  retarget: ["follow_up", "nudge", "holster", "opted_out"],
  nudge: ["follow_up", "nurture", "holster", "opted_out"],
  follow_up: ["book_appointment", "nurture", "holster", "opted_out"],
  book_appointment: ["nurture", "holster", "opted_out"],
  nurture: ["initial", "holster", "opted_out"], // Can re-enter cycle
  holster: ["initial", "opted_out"], // Can be reactivated
  opted_out: [], // Terminal state
};

// ============================================
// STAGE ↔ LEADSTATUS MAPPING
// ============================================

/**
 * Maps existing LeadStatus to appropriate Nextier LeadStage
 *
 * LeadStatus (existing)      →  LeadStage (outreach context)
 * ─────────────────────────────────────────────────────────────
 * 'new'                      →  null (not ready for outreach)
 * 'enriching'                →  null (not ready for outreach)
 * 'ready'                    →  'initial' (ready for first contact)
 * 'contacted'                →  'retarget' or 'nudge' (waiting for response)
 * 'responded'                →  'follow_up' (signal received)
 * 'qualified'                →  'book_appointment' (ready to book)
 * 'converted'                →  null (deal closed, no outreach needed)
 * 'dead'                     →  'holster' (archived)
 */
export type ExistingLeadStatus =
  | "new"
  | "enriching"
  | "ready"
  | "contacted"
  | "responded"
  | "qualified"
  | "converted"
  | "dead";

export function getOutreachStageForLeadStatus(
  status: ExistingLeadStatus,
  context?: { silenceDays?: number; hasOptedOut?: boolean },
): LeadStage | null {
  // STOP compliance always wins
  if (context?.hasOptedOut) return "opted_out";

  switch (status) {
    case "new":
    case "enriching":
      return null; // Not ready for outreach

    case "ready":
      return "initial"; // Ready for first contact

    case "contacted":
      // Silence duration determines stage
      if (context?.silenceDays && context.silenceDays > 14) {
        return "holster"; // Too long, archive
      } else if (context?.silenceDays && context.silenceDays > 7) {
        return "retarget"; // Re-engagement needed
      }
      return "nudge"; // Low-pressure follow-up

    case "responded":
      return "follow_up"; // Positive signal, advance conversation

    case "qualified":
      return "book_appointment"; // Ready to book

    case "converted":
      return null; // Deal closed, no outreach

    case "dead":
      return "holster"; // Archived

    default:
      return null;
  }
}

/**
 * Reverse mapping: Get recommended LeadStatus update after stage transition
 */
export function getLeadStatusForStageTransition(
  fromStage: LeadStage,
  toStage: LeadStage,
): ExistingLeadStatus | null {
  // Only suggest status changes for significant transitions
  switch (toStage) {
    case "follow_up":
      return "responded"; // Signal received

    case "book_appointment":
      return "qualified"; // Ready to book

    case "holster":
    case "opted_out":
      return "dead"; // Archived

    default:
      return null; // No status change needed
  }
}

// ============================================
// CARTRIDGE DEFINITIONS
// ============================================

export type CartridgeStatus =
  | "pending" // Not yet started
  | "active" // Currently executing
  | "paused" // Waiting for reply/event
  | "completed" // Finished successfully
  | "holstered" // Stopped after max attempts
  | "interrupted"; // Reply received

export interface Cartridge {
  id: string;
  version: number; // V1, V2, etc. - V1 never mutates
  stage: LeadStage;
  name: string;
  description: string;

  // Execution config
  maxAttempts: 5; // Hard limit - never changes
  currentAttempt: number;
  status: CartridgeStatus;

  // Template sequence (tone escalation)
  templateSequence: string[]; // 5 template IDs for attempts 1-5

  // Timing
  delayBetweenAttempts: number; // Hours
  createdAt: Date;
  lastAttemptAt: Date | null;
  completedAt: Date | null;

  // Audit
  leadId: string;
  assignedBy: string; // System or user ID
}

// ============================================
// STAGE → CARTRIDGE MAPPING
// ============================================

/**
 * IMPORTANT: This is the STRUCTURE for stage-to-cartridge mapping.
 * Each client starts with EMPTY cartridge libraries.
 * Cartridges are built per-client based on their business logic.
 *
 * Only system cartridges (compliance) are pre-defined.
 */
export const STAGE_CARTRIDGE_MAP: Record<LeadStage, string[]> = {
  // Client builds their own cartridges for each stage
  initial: [],
  retarget: [],
  nudge: [],
  follow_up: [],
  book_appointment: [],
  nurture: [],
  // System cartridges - these are always available
  holster: ["CART_SYSTEM_SUPPRESSION"],
  opted_out: ["CART_SYSTEM_COMPLIANCE_STOP"],
};

/**
 * Example cartridge IDs for reference (not pre-loaded):
 *
 * INITIAL Stage:
 * - CART_INITIAL_VALUATION_V1
 * - CART_INITIAL_EXPAND_OR_EXIT_V1
 * - CART_INITIAL_MARKET_CURIOSITY_V1
 *
 * RETARGET Stage:
 * - CART_RETARGET_REMINDER_V1
 * - CART_RETARGET_DID_YOU_KNOW_V1
 * - CART_RETARGET_CONTRAST_V1
 *
 * NUDGE Stage:
 * - CART_NUDGE_SOFT_CHECKIN_V1
 * - CART_NUDGE_TIMING_CLARIFIER_V1
 *
 * FOLLOW_UP Stage:
 * - CART_FOLLOWUP_CLARIFY_INTENT_V1
 * - CART_FOLLOWUP_VALUE_REINFORCE_V1
 *
 * BOOK_APPOINTMENT Stage:
 * - CART_BOOK_APPOINTMENT_PRIMARY_V1
 */

// ============================================
// TONE ESCALATION (5 Attempts)
// ============================================

export const TONE_SEQUENCE = [
  "authority", // Attempt 1
  "curiosity", // Attempt 2
  "direct", // Attempt 3
  "humor", // Attempt 4
  "final", // Attempt 5 - then HOLSTER
] as const;

export type ToneType = (typeof TONE_SEQUENCE)[number];

export function getToneForAttempt(attempt: number): ToneType {
  if (attempt < 1) return "authority";
  if (attempt > 5) return "final";
  return TONE_SEQUENCE[attempt - 1];
}

// ============================================
// CARTRIDGE LIFECYCLE FUNCTIONS
// ============================================

/**
 * Create a new cartridge for a lead entering a stage
 */
export function createCartridge(
  leadId: string,
  stage: LeadStage,
  cartridgeType: string,
  templateSequence: string[],
): Cartridge {
  return {
    id: `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    version: 1,
    stage,
    name: cartridgeType,
    description: `${stage} cartridge for lead ${leadId}`,
    maxAttempts: 5,
    currentAttempt: 0,
    status: "pending",
    templateSequence,
    delayBetweenAttempts: 24, // Default 24 hours
    createdAt: new Date(),
    lastAttemptAt: null,
    completedAt: null,
    leadId,
    assignedBy: "system",
  };
}

/**
 * Execute next attempt in cartridge
 * Returns: template to send, or null if should stop
 */
export function executeAttempt(cartridge: Cartridge): {
  action: "send" | "holster" | "wait";
  templateId?: string;
  tone?: ToneType;
  reason: string;
} {
  // Check if max attempts reached
  if (cartridge.currentAttempt >= cartridge.maxAttempts) {
    return {
      action: "holster",
      reason: "Max attempts (5) reached - stopping is a feature",
    };
  }

  // Check timing
  if (cartridge.lastAttemptAt) {
    const hoursSinceLastAttempt =
      (Date.now() - cartridge.lastAttemptAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAttempt < cartridge.delayBetweenAttempts) {
      return {
        action: "wait",
        reason: `Wait ${Math.ceil(cartridge.delayBetweenAttempts - hoursSinceLastAttempt)} more hours`,
      };
    }
  }

  // Get next template
  const nextAttempt = cartridge.currentAttempt + 1;
  const templateId = cartridge.templateSequence[nextAttempt - 1];
  const tone = getToneForAttempt(nextAttempt);

  return {
    action: "send",
    templateId,
    tone,
    reason: `Attempt ${nextAttempt}/5 - ${tone} tone`,
  };
}

/**
 * Handle inbound reply - interrupts all outbound loops
 */
export function handleReply(cartridge: Cartridge): {
  newStatus: CartridgeStatus;
  nextStage: LeadStage;
  reason: string;
} {
  return {
    newStatus: "interrupted",
    nextStage: "follow_up",
    reason: "Inbound reply - advancing to FOLLOW_UP stage",
  };
}

/**
 * Handle STOP/opt-out - permanent suppression
 */
export function handleOptOut(cartridge: Cartridge): {
  newStatus: CartridgeStatus;
  nextStage: LeadStage;
  reason: string;
} {
  return {
    newStatus: "completed",
    nextStage: "opted_out",
    reason: "STOP received - permanent suppression",
  };
}

/**
 * Check if cartridge should holster (stop)
 */
export function shouldHolster(cartridge: Cartridge): boolean {
  return cartridge.currentAttempt >= cartridge.maxAttempts;
}

// ============================================
// SYSTEM CARTRIDGES (Non-sending)
// ============================================

export const SYSTEM_CARTRIDGES = {
  CART_SYSTEM_COMPLIANCE_STOP: {
    id: "CART_SYSTEM_COMPLIANCE_STOP",
    description: "STOP/opt-out received - permanent suppression",
    action: "suppress",
  },
  CART_SYSTEM_HUMAN_OVERRIDE: {
    id: "CART_SYSTEM_HUMAN_OVERRIDE",
    description: "Human clicked Stop - manual suppression",
    action: "suppress",
  },
  CART_SYSTEM_SUPPRESSION: {
    id: "CART_SYSTEM_SUPPRESSION",
    description: "Lead holstered after max attempts",
    action: "archive",
  },
};

// ============================================
// VERSIONING RULES
// ============================================

/**
 * Version safety rules:
 * - V1 never mutates
 * - V2 requires approval
 * - Active leads finish on original version
 */
export interface CartridgeVersion {
  version: number;
  createdAt: Date;
  approvedBy: string | null;
  isActive: boolean;
  templateSequence: string[];
}

export function canCreateNewVersion(currentVersion: CartridgeVersion): boolean {
  // Only allow new version if current is approved and active
  return currentVersion.approvedBy !== null && currentVersion.isActive;
}

export function upgradeCartridgeVersion(
  cartridge: Cartridge,
  newVersion: number,
  newTemplates: string[],
): Cartridge {
  // Learning happens between runs, never mid-flight
  // Only upgrade if cartridge is pending (not started)
  if (cartridge.status !== "pending") {
    console.warn(
      `Cannot upgrade cartridge ${cartridge.id} - already in progress`,
    );
    return cartridge;
  }

  return {
    ...cartridge,
    version: newVersion,
    templateSequence: newTemplates,
  };
}

// ============================================
// AUDIT & EXPLANATION
// ============================================

export interface CartridgeAuditEntry {
  cartridgeId: string;
  timestamp: Date;
  action: "created" | "attempt" | "reply" | "holster" | "optout" | "upgraded";
  attemptNumber?: number;
  templateId?: string;
  tone?: ToneType;
  reason: string;
  triggeredBy: "system" | "inbound" | "human";
}

/**
 * Generate explainable audit trail
 * Every outcome is observable and logged
 */
export function createAuditEntry(
  cartridge: Cartridge,
  action: CartridgeAuditEntry["action"],
  reason: string,
  triggeredBy: CartridgeAuditEntry["triggeredBy"] = "system",
): CartridgeAuditEntry {
  return {
    cartridgeId: cartridge.id,
    timestamp: new Date(),
    action,
    attemptNumber: cartridge.currentAttempt,
    templateId: cartridge.templateSequence[cartridge.currentAttempt - 1],
    tone: getToneForAttempt(cartridge.currentAttempt),
    reason,
    triggeredBy,
  };
}

// ============================================
// ONE-SENTENCE SYSTEM LAW
// ============================================

export const SYSTEM_LAW = `
A cartridge is a stage-scoped, versioned execution loop capped at five attempts
that selects approved templates, pauses on silence, halts on reply, and may never
override STOP, human intervention, or stage truth.
`;
