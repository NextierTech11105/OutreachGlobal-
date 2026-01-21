/**
 * NEXTIER State Definitions
 *
 * Primary dots (ONE per object) - The truth state
 * Tags (MANY per object) - Dimensions/context
 * Flags (RARE) - Interrupts that override everything
 */

import { DOT_COLORS, TAG_COLORS, FLAG_COLORS, getContrastText } from "./colors";

// =============================================================================
// PRIMARY STATES (DOTS)
// =============================================================================

export type PrimaryState =
  | "RAW"        // Imported, untouched
  | "VERIFIED"   // LUCI approved
  | "CONTEXTED"  // NEVA enriched
  | "ACTIVE"     // In campaign
  | "ENGAGED"    // Responded
  | "FRICTION"   // Objection/delay
  | "BLOCKED"    // Compliance stop
  | "ARCHIVED";  // Dead/stored

export const PRIMARY_STATES: Record<
  PrimaryState,
  { label: string; dot: string; color: string; description: string }
> = {
  RAW: {
    label: "Raw",
    dot: "⚪",
    color: DOT_COLORS.RAW,
    description: "Imported, untouched",
  },
  VERIFIED: {
    label: "Verified",
    dot: "🔵",
    color: DOT_COLORS.VERIFIED,
    description: "LUCI approved for outreach",
  },
  CONTEXTED: {
    label: "Contexted",
    dot: "🟣",
    color: DOT_COLORS.CONTEXTED,
    description: "NEVA research complete",
  },
  ACTIVE: {
    label: "Active",
    dot: "🟡",
    color: DOT_COLORS.ACTIVE,
    description: "In active campaign",
  },
  ENGAGED: {
    label: "Engaged",
    dot: "🟢",
    color: DOT_COLORS.ENGAGED,
    description: "Lead responded",
  },
  FRICTION: {
    label: "Friction",
    dot: "🟠",
    color: DOT_COLORS.FRICTION,
    description: "Objection or delay",
  },
  BLOCKED: {
    label: "Blocked",
    dot: "🔴",
    color: DOT_COLORS.BLOCKED,
    description: "Compliance stop",
  },
  ARCHIVED: {
    label: "Archived",
    dot: "⚫",
    color: DOT_COLORS.ARCHIVED,
    description: "Dead or stored",
  },
};

// =============================================================================
// TAGS (SECONDARY DIMENSIONS)
// =============================================================================

export type TagCategory =
  | "COMPLIANCE"
  | "DATA_QUALITY"
  | "INTELLIGENCE"
  | "WORKER";

export type ComplianceTag =
  | "MOBILE_VERIFIED"
  | "DNC"
  | "LITIGATOR"
  | "OPT_IN"
  | "STOPPED";

export type DataQualityTag =
  | "TRACED"
  | "VERIFIED"
  | "LOW_SCORE"
  | "HIGH_SCORE"
  | "PARTIAL";

export type IntelligenceTag =
  | "RECENT_SIGNAL"
  | "NEGATIVE_PRESS"
  | "EXPANSION";

export type WorkerTag =
  | "GIANNA"
  | "CATHY"
  | "SABRINA"
  | "CALL_QUEUE";

export type TagType = ComplianceTag | DataQualityTag | IntelligenceTag | WorkerTag;

export const TAGS: Record<
  TagType,
  { label: string; category: TagCategory; color: string; icon?: string }
> = {
  // Compliance (Always Visible)
  MOBILE_VERIFIED: {
    label: "MOBILE✓",
    category: "COMPLIANCE",
    color: TAG_COLORS.MOBILE_VERIFIED,
    icon: "📱",
  },
  DNC: {
    label: "DNC✗",
    category: "COMPLIANCE",
    color: TAG_COLORS.DNC,
    icon: "🚫",
  },
  LITIGATOR: {
    label: "LITIGATOR",
    category: "COMPLIANCE",
    color: TAG_COLORS.LITIGATOR,
    icon: "⚖️",
  },
  OPT_IN: {
    label: "OPT-IN",
    category: "COMPLIANCE",
    color: TAG_COLORS.OPT_IN,
    icon: "✅",
  },
  STOPPED: {
    label: "STOPPED",
    category: "COMPLIANCE",
    color: TAG_COLORS.STOPPED,
    icon: "🛑",
  },

  // Data Quality (LUCI-Owned)
  TRACED: {
    label: "TRACED",
    category: "DATA_QUALITY",
    color: TAG_COLORS.TRACED,
  },
  VERIFIED: {
    label: "VERIFIED",
    category: "DATA_QUALITY",
    color: TAG_COLORS.VERIFIED,
  },
  LOW_SCORE: {
    label: "LOW_SCORE",
    category: "DATA_QUALITY",
    color: TAG_COLORS.LOW_SCORE,
  },
  HIGH_SCORE: {
    label: "HIGH_SCORE",
    category: "DATA_QUALITY",
    color: TAG_COLORS.HIGH_SCORE,
  },
  PARTIAL: {
    label: "PARTIAL",
    category: "DATA_QUALITY",
    color: TAG_COLORS.PARTIAL,
  },

  // Intelligence (NEVA-Owned)
  RECENT_SIGNAL: {
    label: "RECENT_SIGNAL",
    category: "INTELLIGENCE",
    color: TAG_COLORS.RECENT_SIGNAL,
  },
  NEGATIVE_PRESS: {
    label: "NEGATIVE_PRESS",
    category: "INTELLIGENCE",
    color: TAG_COLORS.NEGATIVE_PRESS,
  },
  EXPANSION: {
    label: "EXPANSION",
    category: "INTELLIGENCE",
    color: TAG_COLORS.EXPANSION,
  },

  // Worker Stage
  GIANNA: {
    label: "GIANNA",
    category: "WORKER",
    color: TAG_COLORS.GIANNA,
  },
  CATHY: {
    label: "CATHY",
    category: "WORKER",
    color: TAG_COLORS.CATHY,
  },
  SABRINA: {
    label: "SABRINA",
    category: "WORKER",
    color: TAG_COLORS.SABRINA,
  },
  CALL_QUEUE: {
    label: "CALL_QUEUE",
    category: "WORKER",
    color: TAG_COLORS.CALL_QUEUE,
  },
};

// =============================================================================
// FLAGS (INTERRUPTS)
// =============================================================================

export type FlagType =
  | "COMPLIANCE"
  | "HUMAN"
  | "PRIORITY"
  | "AI_LOW_CONF"
  | "COOLDOWN";

export const FLAGS: Record<
  FlagType,
  { label: string; icon: string; color: string; description: string }
> = {
  COMPLIANCE: {
    label: "COMPLIANCE",
    icon: "🚫",
    color: FLAG_COLORS.COMPLIANCE,
    description: "Hard stop - compliance issue",
  },
  HUMAN: {
    label: "HUMAN",
    icon: "⚠️",
    color: FLAG_COLORS.HUMAN,
    description: "Needs human review",
  },
  PRIORITY: {
    label: "PRIORITY",
    icon: "💰",
    color: FLAG_COLORS.PRIORITY,
    description: "Revenue-critical lead",
  },
  AI_LOW_CONF: {
    label: "AI_LOW_CONF",
    icon: "🧠",
    color: FLAG_COLORS.AI_LOW_CONF,
    description: "Copilot unsure - needs review",
  },
  COOLDOWN: {
    label: "COOLDOWN",
    icon: "🧊",
    color: FLAG_COLORS.COOLDOWN,
    description: "Pause outreach temporarily",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get primary state config
 */
export function getPrimaryState(state: PrimaryState) {
  return PRIMARY_STATES[state];
}

/**
 * Get tag config
 */
export function getTag(tag: TagType) {
  return TAGS[tag];
}

/**
 * Get flag config
 */
export function getFlag(flag: FlagType) {
  return FLAGS[flag];
}

/**
 * Get tags by category
 */
export function getTagsByCategory(category: TagCategory): TagType[] {
  return (Object.keys(TAGS) as TagType[]).filter(
    (tag) => TAGS[tag].category === category
  );
}

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: PrimaryState, to: PrimaryState): boolean {
  const validTransitions: Record<PrimaryState, PrimaryState[]> = {
    RAW: ["VERIFIED", "BLOCKED", "ARCHIVED"],
    VERIFIED: ["CONTEXTED", "ACTIVE", "BLOCKED", "ARCHIVED"],
    CONTEXTED: ["ACTIVE", "BLOCKED", "ARCHIVED"],
    ACTIVE: ["ENGAGED", "FRICTION", "BLOCKED", "ARCHIVED"],
    ENGAGED: ["FRICTION", "BLOCKED", "ARCHIVED"],
    FRICTION: ["ENGAGED", "BLOCKED", "ARCHIVED"],
    BLOCKED: ["ARCHIVED"], // Terminal except archive
    ARCHIVED: [], // Fully terminal
  };

  return validTransitions[from]?.includes(to) ?? false;
}
