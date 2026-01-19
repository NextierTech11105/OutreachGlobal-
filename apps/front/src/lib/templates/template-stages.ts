/**
 * TEMPLATE STAGES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Define the stage/step progression for SMS sequences.
 * Stages represent the journey from initial contact to conversion.
 *
 * THE LOOP: GIANNA → CATHY → SABRINA
 *   Stage 1-2: GIANNA (Opener) - First contact, value proposition
 *   Stage 3-4: CATHY (Nudger) - Follow-up, humor, engagement
 *   Stage 5: SABRINA (Closer) - Booking, objection handling
 *   Stage 6: Breakup - Final attempt before archive
 *
 * Tone Escalation: Authority → Curiosity → Direct → Humor → Final
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { WorkerType } from "./nextier-defaults";

// =============================================================================
// TYPES
// =============================================================================

export type StageType =
  | "opener" // Initial contact
  | "value" // Value proposition
  | "nudge" // Follow-up
  | "curiosity" // Interest hook
  | "direct" // Straight ask
  | "closer" // Booking push
  | "breakup" // Final attempt
  | "callback"; // Response handling

export type ToneType =
  | "authority" // Professional, credible
  | "curiosity" // Intriguing, hook-based
  | "direct" // Straight to the point
  | "humor" // Light, friendly
  | "final"; // Last attempt

export interface TemplateStage {
  id: string;
  name: string;
  description: string;
  stageNumber: number;
  type: StageType;
  tone: ToneType;
  worker: WorkerType;
  waitDays: number; // Days to wait before this stage
  waitHours?: number; // Optional hours component
  maxAttempts: number; // Max messages at this stage
  escalateTo?: WorkerType; // Who to escalate to if no response
  templateIds: string[]; // Templates to use at this stage
  conditions?: {
    onNoResponse?: "continue" | "escalate" | "archive";
    onReply?: "escalate" | "archive" | "flag";
    onStop?: "optout"; // Always respect stop
  };
  active: boolean;
}

export interface StageSequence {
  id: string;
  name: string;
  description: string;
  stages: TemplateStage[];
  totalDays: number;
  complianceScore: number; // 0-100
  active: boolean;
}

// =============================================================================
// STAGE REGISTRY
// =============================================================================

// Build your own stages per campaign - start empty
export const TEMPLATE_STAGES: TemplateStage[] = [];

// =============================================================================
// DEFAULT STAGE STRUCTURE
// =============================================================================

/**
 * THE LOOP - Stage Progression
 *
 * INITIAL (20 templates) → REMINDER 1 → REMINDER 2 → NUDGE 3 (qualify)
 *    → FOLLOW-UP (20 templates) → RETENTION (20 templates) → COLD CALLS (20 templates)
 *
 * Workers: GIANNA (opener) → CATHY (nudge/qualify) → SABRINA (close)
 */
export const STAGE_STRUCTURE = {
  // Stage 1: INITIAL - First Contact (pick from pool of 20)
  initial: {
    id: "stage-1-initial",
    name: "Initial",
    stageNumber: 1,
    type: "opener" as StageType,
    tone: "authority" as ToneType,
    worker: "gianna" as WorkerType,
    waitDays: 0,
    maxAttempts: 1,
    escalateTo: undefined,
    poolSize: 20, // Select from 20 templates
    conditions: {
      onNoResponse: "continue" as const,
      onReply: "escalate" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 2: REMINDER 1 - First reminder
  reminder1: {
    id: "stage-2-reminder-1",
    name: "Reminder 1",
    stageNumber: 2,
    type: "nudge" as StageType,
    tone: "curiosity" as ToneType,
    worker: "gianna" as WorkerType,
    waitDays: 2,
    maxAttempts: 1,
    escalateTo: undefined,
    conditions: {
      onNoResponse: "continue" as const,
      onReply: "escalate" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 3: REMINDER 2 - Second reminder
  reminder2: {
    id: "stage-3-reminder-2",
    name: "Reminder 2",
    stageNumber: 3,
    type: "nudge" as StageType,
    tone: "direct" as ToneType,
    worker: "cathy" as WorkerType,
    waitDays: 2,
    maxAttempts: 1,
    escalateTo: undefined,
    conditions: {
      onNoResponse: "continue" as const,
      onReply: "escalate" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 4: NUDGE 3 - Qualifying nudge
  nudge3: {
    id: "stage-4-nudge-3",
    name: "Nudge 3 (Qualify)",
    stageNumber: 4,
    type: "direct" as StageType,
    tone: "direct" as ToneType,
    worker: "cathy" as WorkerType,
    waitDays: 3,
    maxAttempts: 1,
    escalateTo: "sabrina" as WorkerType,
    conditions: {
      onNoResponse: "escalate" as const,
      onReply: "escalate" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 5: FOLLOW-UP - Active engagement (pick from pool of 20)
  followUp: {
    id: "stage-5-follow-up",
    name: "Follow-Up",
    stageNumber: 5,
    type: "closer" as StageType,
    tone: "direct" as ToneType,
    worker: "sabrina" as WorkerType,
    waitDays: 2,
    maxAttempts: 1,
    poolSize: 20, // Select from 20 templates
    escalateTo: undefined,
    conditions: {
      onNoResponse: "continue" as const,
      onReply: "flag" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 6: RETENTION - Keep warm (pick from pool of 20)
  retention: {
    id: "stage-6-retention",
    name: "Retention",
    stageNumber: 6,
    type: "nudge" as StageType,
    tone: "humor" as ToneType,
    worker: "cathy" as WorkerType,
    waitDays: 7,
    maxAttempts: 1,
    poolSize: 20, // Select from 20 templates
    escalateTo: undefined,
    conditions: {
      onNoResponse: "continue" as const,
      onReply: "escalate" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 7: COLD CALLS - Call list (pick from pool of 20)
  coldCalls: {
    id: "stage-7-cold-calls",
    name: "Cold Calls",
    stageNumber: 7,
    type: "callback" as StageType,
    tone: "authority" as ToneType,
    worker: "sabrina" as WorkerType,
    waitDays: 0, // Immediate when moved to this stage
    maxAttempts: 1,
    poolSize: 20, // Select from 20 templates/scripts
    escalateTo: undefined,
    conditions: {
      onNoResponse: "archive" as const,
      onReply: "flag" as const,
      onStop: "optout" as const,
    },
  },

  // Stage 8: BREAKUP - Final exit
  breakup: {
    id: "stage-8-breakup",
    name: "Breakup",
    stageNumber: 8,
    type: "breakup" as StageType,
    tone: "final" as ToneType,
    worker: "cathy" as WorkerType,
    waitDays: 14,
    maxAttempts: 1,
    escalateTo: undefined,
    conditions: {
      onNoResponse: "archive" as const,
      onReply: "escalate" as const,
      onStop: "optout" as const,
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a stage with defaults
 */
export function createStage(
  id: string,
  name: string,
  stageNumber: number,
  worker: WorkerType,
  options?: Partial<Omit<TemplateStage, "id" | "name" | "stageNumber" | "worker">>
): TemplateStage {
  return {
    id,
    name,
    stageNumber,
    worker,
    description: options?.description || "",
    type: options?.type || "opener",
    tone: options?.tone || "authority",
    waitDays: options?.waitDays ?? 0,
    waitHours: options?.waitHours,
    maxAttempts: options?.maxAttempts ?? 1,
    escalateTo: options?.escalateTo,
    templateIds: options?.templateIds || [],
    conditions: options?.conditions || {
      onNoResponse: "continue",
      onReply: "escalate",
      onStop: "optout",
    },
    active: options?.active ?? true,
  };
}

/**
 * Create a sequence from stages
 */
export function createSequence(
  id: string,
  name: string,
  stages: TemplateStage[],
  options?: Partial<Omit<StageSequence, "id" | "name" | "stages">>
): StageSequence {
  const totalDays = stages.reduce((sum, stage) => sum + stage.waitDays, 0);

  return {
    id,
    name,
    stages,
    totalDays,
    description: options?.description || "",
    complianceScore: options?.complianceScore ?? 100,
    active: options?.active ?? true,
  };
}

/**
 * Get stage by number
 */
export function getStageByNumber(stages: TemplateStage[], stageNumber: number): TemplateStage | undefined {
  return stages.find((s) => s.stageNumber === stageNumber);
}

/**
 * Get stages by worker
 */
export function getStagesByWorker(stages: TemplateStage[], worker: WorkerType): TemplateStage[] {
  return stages.filter((s) => s.worker === worker);
}

/**
 * Get next stage in sequence
 */
export function getNextStage(stages: TemplateStage[], currentStage: number): TemplateStage | undefined {
  return stages.find((s) => s.stageNumber === currentStage + 1);
}

/**
 * Calculate total sequence days
 */
export function calculateSequenceDays(stages: TemplateStage[]): number {
  return stages.reduce((sum, stage) => sum + stage.waitDays, 0);
}

/**
 * Validate sequence (checks for gaps, compliance)
 */
export function validateSequence(stages: TemplateStage[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for stage number gaps
  const stageNumbers = stages.map((s) => s.stageNumber).sort((a, b) => a - b);
  for (let i = 0; i < stageNumbers.length - 1; i++) {
    if (stageNumbers[i + 1] - stageNumbers[i] > 1) {
      issues.push(`Gap between stage ${stageNumbers[i]} and ${stageNumbers[i + 1]}`);
    }
  }

  // Check for missing breakup stage
  const hasBreakup = stages.some((s) => s.type === "breakup");
  if (!hasBreakup) {
    issues.push("Missing breakup stage - sequences should have a graceful exit");
  }

  // Check max attempts
  const totalAttempts = stages.reduce((sum, s) => sum + s.maxAttempts, 0);
  if (totalAttempts > 5) {
    issues.push(`Total attempts (${totalAttempts}) exceeds recommended max of 5`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// TONE DEFINITIONS
// =============================================================================

export const TONE_DESCRIPTIONS = {
  authority: "Professional, credible, expertise-forward",
  curiosity: "Intriguing, hook-based, creates interest",
  direct: "Straight to the point, no fluff",
  humor: "Light, friendly, self-aware",
  final: "Respectful exit, door open for future",
} as const;

export const STAGE_TYPE_DESCRIPTIONS = {
  opener: "First contact - introduce yourself and value",
  value: "Value proposition - what's in it for them",
  nudge: "Follow-up - gentle reminder",
  curiosity: "Interest hook - create intrigue",
  direct: "Straight ask - yes or no",
  closer: "Booking push - schedule the call",
  breakup: "Final attempt - graceful exit",
  callback: "Response handling - inbound replies",
} as const;
