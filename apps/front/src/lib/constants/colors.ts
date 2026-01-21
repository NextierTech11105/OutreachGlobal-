/**
 * NEXTIER Color System
 *
 * 1 color = 1 meaning
 * Used consistently across Sales, Ops, Engineering views.
 *
 * For paid onboarding - operational truth, not marketing.
 */

// =============================================================================
// COLOR PALETTE (TAILWIND-COMPATIBLE)
// =============================================================================

export const COLORS = {
  // Primary States
  CHARCOAL: "#374151",    // gray-700 - Inactive/Archived
  STEEL_BLUE: "#3B82F6",  // blue-500 - System-ready/Verified
  GREEN: "#22C55E",       // green-500 - Revenue-positive
  AMBER: "#F59E0B",       // amber-500 - Attention required
  ORANGE: "#F97316",      // orange-500 - Risk/Friction
  RED: "#EF4444",         // red-500 - Blocked/Non-compliant
  PURPLE: "#8B5CF6",      // violet-500 - AI/Intelligence
  WHITE: "#F9FAFB",       // gray-50 - Unprocessed

  // Shades for hover/active states
  CHARCOAL_LIGHT: "#4B5563",
  STEEL_BLUE_LIGHT: "#60A5FA",
  GREEN_LIGHT: "#4ADE80",
  AMBER_LIGHT: "#FBBF24",
  ORANGE_LIGHT: "#FB923C",
  RED_LIGHT: "#F87171",
  PURPLE_LIGHT: "#A78BFA",
} as const;

// Tailwind class mappings
export const TAILWIND_COLORS = {
  CHARCOAL: "gray-700",
  STEEL_BLUE: "blue-500",
  GREEN: "green-500",
  AMBER: "amber-500",
  ORANGE: "orange-500",
  RED: "red-500",
  PURPLE: "violet-500",
  WHITE: "gray-50",
} as const;

// =============================================================================
// SEMANTIC COLOR MAPPINGS
// =============================================================================

export const SEMANTIC_COLORS = {
  // States
  inactive: COLORS.CHARCOAL,
  archived: COLORS.CHARCOAL,
  ready: COLORS.STEEL_BLUE,
  verified: COLORS.STEEL_BLUE,
  success: COLORS.GREEN,
  revenue: COLORS.GREEN,
  attention: COLORS.AMBER,
  warning: COLORS.AMBER,
  risk: COLORS.ORANGE,
  friction: COLORS.ORANGE,
  blocked: COLORS.RED,
  error: COLORS.RED,
  ai: COLORS.PURPLE,
  intelligence: COLORS.PURPLE,
  raw: COLORS.WHITE,
  unprocessed: COLORS.WHITE,
} as const;

// =============================================================================
// DOT COLORS (Primary state indicator)
// =============================================================================

export const DOT_COLORS = {
  RAW: COLORS.WHITE,
  VERIFIED: COLORS.STEEL_BLUE,
  CONTEXTED: COLORS.PURPLE,
  ACTIVE: COLORS.AMBER,
  ENGAGED: COLORS.GREEN,
  FRICTION: COLORS.ORANGE,
  BLOCKED: COLORS.RED,
  ARCHIVED: COLORS.CHARCOAL,
} as const;

// =============================================================================
// TAG COLORS (Secondary dimensions)
// =============================================================================

export const TAG_COLORS = {
  // Compliance tags
  MOBILE_VERIFIED: COLORS.STEEL_BLUE,
  DNC: COLORS.RED,
  LITIGATOR: COLORS.RED,
  OPT_IN: COLORS.GREEN,
  STOPPED: COLORS.CHARCOAL,

  // Data quality tags (LUCI)
  TRACED: COLORS.STEEL_BLUE,
  VERIFIED: COLORS.STEEL_BLUE,
  LOW_SCORE: COLORS.ORANGE,
  HIGH_SCORE: COLORS.GREEN,
  PARTIAL: COLORS.AMBER,

  // Intelligence tags (NEVA)
  RECENT_SIGNAL: COLORS.PURPLE,
  NEGATIVE_PRESS: COLORS.ORANGE,
  EXPANSION: COLORS.GREEN,

  // Worker tags
  GIANNA: COLORS.STEEL_BLUE,
  CATHY: COLORS.AMBER,
  SABRINA: COLORS.GREEN,
  CALL_QUEUE: COLORS.PURPLE,
} as const;

// =============================================================================
// FLAG COLORS (Interrupts - rare, loud)
// =============================================================================

export const FLAG_COLORS = {
  COMPLIANCE: COLORS.RED,      // Hard stop
  HUMAN: COLORS.ORANGE,        // Needs review
  PRIORITY: COLORS.GREEN,      // Revenue-critical
  AI_LOW_CONF: COLORS.PURPLE,  // Copilot unsure
  COOLDOWN: COLORS.CHARCOAL,   // Pause outreach
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get contrasting text color for a background
 */
export function getContrastText(bgColor: string): string {
  // Simple luminance check
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#111827" : "#FFFFFF";
}

/**
 * Get Tailwind class for a color
 */
export function getTailwindBg(color: keyof typeof COLORS): string {
  return `bg-${TAILWIND_COLORS[color]}`;
}

/**
 * Get Tailwind text class for a color
 */
export function getTailwindText(color: keyof typeof COLORS): string {
  return `text-${TAILWIND_COLORS[color]}`;
}
