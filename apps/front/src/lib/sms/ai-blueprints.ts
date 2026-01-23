/**
 * AI-MANAGED SMS BLUEPRINTS
 * =========================
 *
 * Pre-configured outreach sequences with capacity management,
 * worker assignment, and auto-optimization rules.
 *
 * SignalHouse Compliance:
 * - Campaign ID: CJRCU60
 * - Max TPM: 75 SMS/min (AT&T), ~2,000/day (T-Mobile)
 * - Use-Case: LOW_VOLUME
 */

import type { AIWorker, CampaignStage } from "./template-cartridges";

// ═══════════════════════════════════════════════════════════════════════════════
// BLUEPRINT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ToneType = "authority" | "curiosity" | "direct" | "humor" | "warm" | "final" | "value" | "friendly";

export interface BlueprintStage {
  day: number;                    // Day in sequence (1 = first contact)
  worker: AIWorker;               // Which AI worker handles this stage
  stage: CampaignStage;           // Campaign stage type
  tone: ToneType;                 // Message tone
  templateCategory?: string;      // Optional: specific template category to use
  skipIfResponded?: boolean;      // Skip this stage if lead already responded
}

export interface OptimizationRule {
  id: string;
  name: string;
  condition: string;              // e.g., "responseRate < 0.05"
  action: string;                 // e.g., "increaseBatchDelay"
  threshold?: number;
  enabled: boolean;
}

export interface BlueprintMetrics {
  responseRate: number;           // % of leads who responded
  optOutRate: number;             // % who opted out (STOP)
  bookingRate: number;            // % who booked a call
  avgResponseTime?: number;       // Average time to first response (hours)
  lastUpdated?: string;           // ISO timestamp
}

export interface AIBlueprint {
  id: string;
  name: string;
  description: string;

  // Capacity Management
  dailyCapacity: number;          // Max sends per day (SignalHouse limit: 2000)
  batchSize: number;              // Records per batch (recommended: 250)
  batchDelayMinutes: number;      // Delay between batches
  sendWindow: {
    start: string;                // "09:00" (local time)
    end: string;                  // "17:00" (local time)
    timezone: string;             // "America/New_York"
    excludeWeekends: boolean;
  };

  // Sequence Configuration
  stages: BlueprintStage[];
  toneProgression: ToneType[];    // Tone changes throughout sequence

  // Targeting
  industries?: string[];          // Optional: restrict to specific industries
  sicCodes?: string[];            // Optional: restrict to specific SIC codes
  minContactabilityScore?: number; // Minimum contactability score (0-100)

  // Performance Tracking
  metrics: BlueprintMetrics;

  // Auto-Optimization
  autoOptimize: boolean;
  optimizationRules: OptimizationRule[];

  // Status
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT OPTIMIZATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_OPTIMIZATION_RULES: OptimizationRule[] = [
  {
    id: "high-optout-pause",
    name: "High Opt-Out Rate Pause",
    condition: "optOutRate > 0.05",
    action: "pauseBlueprint",
    threshold: 0.05,
    enabled: true,
  },
  {
    id: "low-response-delay",
    name: "Low Response Rate - Increase Delay",
    condition: "responseRate < 0.03",
    action: "increaseBatchDelay",
    threshold: 0.03,
    enabled: true,
  },
  {
    id: "good-response-accelerate",
    name: "Good Response Rate - Accelerate",
    condition: "responseRate > 0.10",
    action: "decreaseBatchDelay",
    threshold: 0.10,
    enabled: false, // Off by default for safety
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT BLUEPRINTS
// ═══════════════════════════════════════════════════════════════════════════════

export const COLD_B2B_BLUEPRINT: AIBlueprint = {
  id: "cold-b2b",
  name: "Cold B2B Outreach",
  description: "Standard cold outreach sequence for B2B business owners. 4-touch sequence over 14 days.",

  dailyCapacity: 2000,
  batchSize: 250,
  batchDelayMinutes: 30,
  sendWindow: {
    start: "09:00",
    end: "17:00",
    timezone: "America/New_York",
    excludeWeekends: true,
  },

  stages: [
    { day: 1, worker: "GIANNA", stage: "initial", tone: "authority", skipIfResponded: false },
    { day: 3, worker: "GIANNA", stage: "nudge", tone: "curiosity", skipIfResponded: true },
    { day: 7, worker: "CATHY", stage: "retarget", tone: "direct", skipIfResponded: true },
    { day: 14, worker: "SABRINA", stage: "followup", tone: "final", skipIfResponded: true },
  ],

  toneProgression: ["authority", "curiosity", "direct", "final"],
  minContactabilityScore: 60,

  metrics: {
    responseRate: 0,
    optOutRate: 0,
    bookingRate: 0,
  },

  autoOptimize: true,
  optimizationRules: DEFAULT_OPTIMIZATION_RULES,

  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const WARM_LEAD_BLUEPRINT: AIBlueprint = {
  id: "warm-lead",
  name: "Warm Lead Nurture",
  description: "Shorter sequence for leads who have shown prior interest. 2-touch over 5 days.",

  dailyCapacity: 500,
  batchSize: 100,
  batchDelayMinutes: 60,
  sendWindow: {
    start: "10:00",
    end: "16:00",
    timezone: "America/New_York",
    excludeWeekends: true,
  },

  stages: [
    { day: 1, worker: "CATHY", stage: "nudge", tone: "friendly", skipIfResponded: false },
    { day: 5, worker: "SABRINA", stage: "followup", tone: "direct", skipIfResponded: true },
  ],

  toneProgression: ["friendly", "direct"],
  minContactabilityScore: 50,

  metrics: {
    responseRate: 0,
    optOutRate: 0,
    bookingRate: 0,
  },

  autoOptimize: true,
  optimizationRules: DEFAULT_OPTIMIZATION_RULES,

  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const RETENTION_BLUEPRINT: AIBlueprint = {
  id: "retention",
  name: "Retention & Re-engagement",
  description: "Re-engage existing clients or lapsed leads. Gentle 2-touch over 60 days.",

  dailyCapacity: 200,
  batchSize: 50,
  batchDelayMinutes: 120,
  sendWindow: {
    start: "10:00",
    end: "14:00",
    timezone: "America/New_York",
    excludeWeekends: true,
  },

  stages: [
    { day: 30, worker: "CATHY", stage: "retention", tone: "warm", skipIfResponded: false },
    { day: 60, worker: "SABRINA", stage: "followup", tone: "value", skipIfResponded: true },
  ],

  toneProgression: ["warm", "value"],
  minContactabilityScore: 40,

  metrics: {
    responseRate: 0,
    optOutRate: 0,
    bookingRate: 0,
  },

  autoOptimize: true,
  optimizationRules: DEFAULT_OPTIMIZATION_RULES,

  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const APPOINTMENT_REMINDER_BLUEPRINT: AIBlueprint = {
  id: "appointment-reminder",
  name: "Appointment Reminder",
  description: "Reduce no-shows with automated reminders. 2 reminders: 24h and 1h before.",

  dailyCapacity: 500,
  batchSize: 100,
  batchDelayMinutes: 15,
  sendWindow: {
    start: "08:00",
    end: "20:00",
    timezone: "America/New_York",
    excludeWeekends: false, // Appointments can be on weekends
  },

  stages: [
    { day: -1, worker: "APPOINTMENT_BOT", stage: "confirmation", tone: "friendly", skipIfResponded: false },
    { day: 0, worker: "APPOINTMENT_BOT", stage: "confirmation", tone: "direct", skipIfResponded: false },
  ],

  toneProgression: ["friendly", "direct"],

  metrics: {
    responseRate: 0,
    optOutRate: 0,
    bookingRate: 0,
  },

  autoOptimize: false, // Reminders should always send
  optimizationRules: [],

  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BLUEPRINT LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

export const BLUEPRINT_LIBRARY: AIBlueprint[] = [
  COLD_B2B_BLUEPRINT,
  WARM_LEAD_BLUEPRINT,
  RETENTION_BLUEPRINT,
  APPOINTMENT_REMINDER_BLUEPRINT,
];

// ═══════════════════════════════════════════════════════════════════════════════
// BLUEPRINT MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class BlueprintManager {
  private blueprints: Map<string, AIBlueprint> = new Map();

  constructor() {
    for (const blueprint of BLUEPRINT_LIBRARY) {
      this.blueprints.set(blueprint.id, { ...blueprint });
    }
  }

  /**
   * Get blueprint by ID
   */
  getBlueprint(blueprintId: string): AIBlueprint | undefined {
    return this.blueprints.get(blueprintId);
  }

  /**
   * List all blueprints
   */
  listBlueprints(): AIBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  /**
   * List active blueprints only
   */
  listActiveBlueprints(): AIBlueprint[] {
    return Array.from(this.blueprints.values()).filter(b => b.active);
  }

  /**
   * Update blueprint metrics
   */
  updateMetrics(blueprintId: string, metrics: Partial<BlueprintMetrics>): boolean {
    const blueprint = this.blueprints.get(blueprintId);
    if (blueprint) {
      blueprint.metrics = { ...blueprint.metrics, ...metrics, lastUpdated: new Date().toISOString() };
      blueprint.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Activate/deactivate blueprint
   */
  setActive(blueprintId: string, active: boolean): boolean {
    const blueprint = this.blueprints.get(blueprintId);
    if (blueprint) {
      blueprint.active = active;
      blueprint.updatedAt = new Date().toISOString();
      console.log(`[BlueprintManager] ${blueprintId} ${active ? "activated" : "deactivated"}`);
      return true;
    }
    return false;
  }

  /**
   * Check if blueprint should pause due to optimization rules
   */
  shouldPause(blueprintId: string): { pause: boolean; reason?: string } {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint || !blueprint.autoOptimize) {
      return { pause: false };
    }

    for (const rule of blueprint.optimizationRules) {
      if (!rule.enabled) continue;

      switch (rule.id) {
        case "high-optout-pause":
          if (blueprint.metrics.optOutRate > (rule.threshold || 0.05)) {
            return { pause: true, reason: `Opt-out rate (${(blueprint.metrics.optOutRate * 100).toFixed(1)}%) exceeds threshold` };
          }
          break;
      }
    }

    return { pause: false };
  }

  /**
   * Get recommended batch delay based on metrics
   */
  getRecommendedBatchDelay(blueprintId: string): number {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) return 30;

    // If response rate is very low, slow down
    if (blueprint.metrics.responseRate < 0.03) {
      return Math.min(blueprint.batchDelayMinutes * 2, 120);
    }

    // If response rate is good and auto-optimize allows, speed up
    if (blueprint.metrics.responseRate > 0.10 && blueprint.autoOptimize) {
      const accelerateRule = blueprint.optimizationRules.find(r => r.id === "good-response-accelerate");
      if (accelerateRule?.enabled) {
        return Math.max(blueprint.batchDelayMinutes / 2, 15);
      }
    }

    return blueprint.batchDelayMinutes;
  }

  /**
   * Create custom blueprint from template
   */
  createFromTemplate(templateId: string, customizations: Partial<AIBlueprint>): AIBlueprint | null {
    const template = this.blueprints.get(templateId);
    if (!template) return null;

    const newBlueprint: AIBlueprint = {
      ...template,
      ...customizations,
      id: customizations.id || `${templateId}-custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: {
        responseRate: 0,
        optOutRate: 0,
        bookingRate: 0,
      },
    };

    this.blueprints.set(newBlueprint.id, newBlueprint);
    return newBlueprint;
  }
}

// Export singleton instance
export const blueprintManager = new BlueprintManager();

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate next stage for a lead based on their current position
 */
export function getNextStage(
  blueprint: AIBlueprint,
  currentDay: number,
  hasResponded: boolean
): BlueprintStage | null {
  const upcomingStages = blueprint.stages.filter(s => s.day > currentDay);

  for (const stage of upcomingStages) {
    // Skip if lead responded and stage says to skip
    if (hasResponded && stage.skipIfResponded) {
      continue;
    }
    return stage;
  }

  return null; // No more stages
}

/**
 * Check if current time is within send window
 */
export function isWithinSendWindow(blueprint: AIBlueprint): boolean {
  const now = new Date();

  // Check weekends
  if (blueprint.sendWindow.excludeWeekends) {
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
  }

  // Parse window times
  const [startHour, startMin] = blueprint.sendWindow.start.split(":").map(Number);
  const [endHour, endMin] = blueprint.sendWindow.end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Calculate sends remaining for today
 */
export function calculateDailyRemaining(
  blueprint: AIBlueprint,
  sentToday: number
): number {
  return Math.max(0, blueprint.dailyCapacity - sentToday);
}

console.log(`[AI Blueprints] Loaded ${BLUEPRINT_LIBRARY.length} blueprints`);
