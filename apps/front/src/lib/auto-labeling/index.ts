/**
 * AUTO-LABELING ENGINE
 *
 * Config-driven system for applying canonical labels to leads
 * based on response classifications and behavioral signals.
 *
 * HARD RULE: No hardcoded values - everything from config.
 *
 * Canonical Tags:
 * - opted_out: Lead requested no further contact
 * - email_captured: Valid email address received
 * - mobile_captured: Valid mobile phone confirmed
 * - wants_call: Lead requested a callback
 * - not_interested: Lead declined but didn't opt-out
 * - wrong_number: Phone doesn't belong to lead
 * - question_pending: Lead asked question, needs response
 * - high_intent: Strong buying signals detected
 * - qualified: Meets qualification criteria
 * - nurture: Long-term drip candidate
 */

import {
  classifyResponse,
  ClassificationResult,
  extractEmail,
  isOptOut,
} from "@/lib/response-classifications";

// ============================================================================
// CONFIGURATION - All thresholds and mappings in one place
// ============================================================================

export interface AutoLabelConfig {
  // Canonical tag configurations
  tags: Record<string, TagConfig>;
  // Classification to tag mappings
  classificationMappings: ClassificationToTagMapping[];
  // Priority score thresholds for queue ordering
  priorityThresholds: PriorityThresholds;
  // Dedup window (days) - leads contacted within this window are skipped
  dedupWindowDays: number;
  // Call queue thresholds
  callQueueConfig: CallQueueConfig;
}

export interface TagConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  priority: number; // Higher = more important
  mutuallyExclusive?: string[]; // Tags that cannot coexist
  autoActions?: AutoAction[];
}

export interface ClassificationToTagMapping {
  classificationId: string;
  tags: string[]; // Tags to apply
  condition?: (result: ClassificationResult) => boolean;
}

export interface PriorityThresholds {
  gold: number; // Email + mobile captured
  green: number; // Positive response / question
  standard: number; // General response
  low: number; // No response or negative
}

export interface CallQueueConfig {
  // Hours after email capture to schedule call
  followUpDelayHours: number;
  // Max attempts before moving to nurture
  maxCallAttempts: number;
  // Time-of-day preferences (24h format)
  preferredCallWindows: { start: number; end: number }[];
}

export type AutoAction =
  | { type: "add_to_suppression"; reason: string }
  | { type: "queue_for_call"; priority: "high" | "medium" | "low" }
  | { type: "send_value_x"; deliverableType: string }
  | { type: "move_to_bucket"; bucketId: string }
  | { type: "notify_operator"; message: string }
  | { type: "cancel_pending_messages" }
  | { type: "schedule_nurture"; delayDays: number };

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_AUTO_LABEL_CONFIG: AutoLabelConfig = {
  tags: {
    opted_out: {
      id: "opted_out",
      name: "Opted Out",
      description: "Lead requested to be removed from contact list",
      color: "#dc2626", // red-600
      priority: 200,
      mutuallyExclusive: ["high_intent", "qualified", "wants_call"],
      autoActions: [
        { type: "add_to_suppression", reason: "opt_out" },
        { type: "cancel_pending_messages" },
      ],
    },
    wrong_number: {
      id: "wrong_number",
      name: "Wrong Number",
      description: "Phone number does not belong to the intended lead",
      color: "#f97316", // orange-500
      priority: 185,
      mutuallyExclusive: ["email_captured", "mobile_captured", "qualified"],
      autoActions: [
        { type: "add_to_suppression", reason: "wrong_number" },
        { type: "cancel_pending_messages" },
        { type: "move_to_bucket", bucketId: "invalid-leads" },
      ],
    },
    not_interested: {
      id: "not_interested",
      name: "Not Interested",
      description: "Lead declined but may be contactable later",
      color: "#a3a3a3", // neutral-400
      priority: 180,
      autoActions: [{ type: "schedule_nurture", delayDays: 90 }],
    },
    email_captured: {
      id: "email_captured",
      name: "Email Captured",
      description: "Lead provided email address for content delivery",
      color: "#22c55e", // green-500
      priority: 100,
      autoActions: [
        { type: "send_value_x", deliverableType: "property-valuation-report" },
        { type: "queue_for_call", priority: "high" },
        {
          type: "notify_operator",
          message: "New email capture - Value X queued",
        },
      ],
    },
    mobile_captured: {
      id: "mobile_captured",
      name: "Mobile Verified",
      description: "Mobile phone number confirmed as valid",
      color: "#3b82f6", // blue-500
      priority: 95,
    },
    wants_call: {
      id: "wants_call",
      name: "Wants Call",
      description: "Lead explicitly requested a phone call",
      color: "#8b5cf6", // violet-500
      priority: 90,
      autoActions: [
        { type: "queue_for_call", priority: "high" },
        { type: "notify_operator", message: "Lead requested callback" },
      ],
    },
    question_pending: {
      id: "question_pending",
      name: "Question Pending",
      description: "Lead asked a question that needs response",
      color: "#f59e0b", // amber-500
      priority: 85,
      autoActions: [
        { type: "notify_operator", message: "Question needs response" },
      ],
    },
    high_intent: {
      id: "high_intent",
      name: "High Intent",
      description: "Lead shows strong buying/engagement signals",
      color: "#10b981", // emerald-500
      priority: 80,
      autoActions: [{ type: "queue_for_call", priority: "high" }],
    },
    qualified: {
      id: "qualified",
      name: "Qualified",
      description: "Lead meets qualification criteria",
      color: "#06b6d4", // cyan-500
      priority: 75,
    },
    nurture: {
      id: "nurture",
      name: "Nurture",
      description: "Long-term content drip candidate",
      color: "#6366f1", // indigo-500
      priority: 30,
    },
  },

  classificationMappings: [
    // Opt-out classifications
    {
      classificationId: "opt-out",
      tags: ["opted_out"],
    },
    // Wrong number
    {
      classificationId: "wrong-number",
      tags: ["wrong_number"],
    },
    // Not interested
    {
      classificationId: "not-interested",
      tags: ["not_interested"],
    },
    // Email capture - highest priority conversion
    {
      classificationId: "email-capture",
      tags: ["email_captured", "high_intent"],
      condition: (result) => !!result.extracted?.email,
    },
    // Called phone line - very high intent
    {
      classificationId: "called-phone-line",
      tags: ["high_intent", "wants_call", "mobile_captured"],
    },
    // Question - needs response
    {
      classificationId: "question",
      tags: ["question_pending"],
    },
    // Assistance request
    {
      classificationId: "assistance",
      tags: ["question_pending", "high_intent"],
    },
    // Interested
    {
      classificationId: "interested",
      tags: ["high_intent"],
    },
    // Thank you - usually follows email capture
    {
      classificationId: "thank-you",
      tags: [], // No auto-tag, just acknowledgment
    },
    // Other - needs review
    {
      classificationId: "other",
      tags: [], // Manual review required
    },
  ],

  priorityThresholds: {
    gold: 100, // Email + mobile = highest priority
    green: 75, // Positive engagement
    standard: 50, // General responses
    low: 25, // No response or negative
  },

  dedupWindowDays: 7,

  callQueueConfig: {
    followUpDelayHours: 24,
    maxCallAttempts: 3,
    preferredCallWindows: [
      { start: 9, end: 12 }, // Morning
      { start: 14, end: 17 }, // Afternoon
    ],
  },
};

// ============================================================================
// LABELING ENGINE
// ============================================================================

export interface LabelingResult {
  leadId: string;
  appliedTags: string[];
  removedTags: string[];
  triggeredActions: AutoAction[];
  priorityScore: number;
  classification: ClassificationResult | null;
}

export interface LeadContext {
  id: string;
  existingTags: string[];
  phone?: string;
  email?: string;
  responseCount?: number;
}

/**
 * Apply auto-labels to a lead based on inbound message
 */
export function applyAutoLabels(
  clientId: string,
  message: string,
  leadContext: LeadContext,
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): LabelingResult {
  // Classify the message
  const classification = classifyResponse(clientId, message);

  const appliedTags: string[] = [];
  const removedTags: string[] = [];
  const triggeredActions: AutoAction[] = [];

  if (!classification) {
    return {
      leadId: leadContext.id,
      appliedTags: [],
      removedTags: [],
      triggeredActions: [],
      priorityScore: config.priorityThresholds.standard,
      classification: null,
    };
  }

  // Find matching classification mapping
  const mapping = config.classificationMappings.find(
    (m) =>
      m.classificationId === classification.classificationId &&
      (!m.condition || m.condition(classification)),
  );

  if (mapping) {
    for (const tagId of mapping.tags) {
      const tagConfig = config.tags[tagId];
      if (!tagConfig) continue;

      // Check mutual exclusivity
      const blocked = tagConfig.mutuallyExclusive?.some((excludedTag) =>
        leadContext.existingTags.includes(excludedTag),
      );

      if (blocked) {
        console.log(
          `[AutoLabel] Skipping tag '${tagId}' - blocked by mutual exclusivity`,
        );
        continue;
      }

      // Apply tag
      if (!appliedTags.includes(tagId)) {
        appliedTags.push(tagId);
      }

      // Remove mutually exclusive tags
      if (tagConfig.mutuallyExclusive) {
        for (const excludedTag of tagConfig.mutuallyExclusive) {
          if (
            leadContext.existingTags.includes(excludedTag) &&
            !removedTags.includes(excludedTag)
          ) {
            removedTags.push(excludedTag);
          }
        }
      }

      // Queue auto-actions
      if (tagConfig.autoActions) {
        triggeredActions.push(...tagConfig.autoActions);
      }
    }
  }

  // Special handling: Email extraction
  if (classification.classificationId === "email-capture") {
    const email = extractEmail(message);
    if (email && !appliedTags.includes("email_captured")) {
      appliedTags.push("email_captured");
      const emailTagConfig = config.tags.email_captured;
      if (emailTagConfig?.autoActions) {
        triggeredActions.push(...emailTagConfig.autoActions);
      }
    }
  }

  // Calculate priority score
  const priorityScore = calculatePriorityScore(
    [...leadContext.existingTags, ...appliedTags],
    config,
  );

  console.log(
    `[AutoLabel] Lead ${leadContext.id}: Classification='${classification.classificationId}', Tags=${appliedTags.join(",")}, Priority=${priorityScore}`,
  );

  return {
    leadId: leadContext.id,
    appliedTags,
    removedTags,
    triggeredActions,
    priorityScore,
    classification,
  };
}

/**
 * Calculate priority score based on tags
 */
export function calculatePriorityScore(
  tags: string[],
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): number {
  // Check for GOLD tier (email + mobile)
  if (tags.includes("email_captured") && tags.includes("mobile_captured")) {
    return config.priorityThresholds.gold;
  }

  // Check for GREEN tier (positive signals)
  if (
    tags.includes("email_captured") ||
    tags.includes("high_intent") ||
    tags.includes("wants_call")
  ) {
    return config.priorityThresholds.green;
  }

  // Check for LOW tier (negative signals)
  if (
    tags.includes("opted_out") ||
    tags.includes("wrong_number") ||
    tags.includes("not_interested")
  ) {
    return config.priorityThresholds.low;
  }

  // Default: STANDARD
  return config.priorityThresholds.standard;
}

/**
 * Get priority tier name from score
 */
export function getPriorityTier(
  score: number,
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): "gold" | "green" | "standard" | "low" {
  if (score >= config.priorityThresholds.gold) return "gold";
  if (score >= config.priorityThresholds.green) return "green";
  if (score > config.priorityThresholds.low) return "standard";
  return "low";
}

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

export interface ActionExecutionResult {
  action: AutoAction;
  success: boolean;
  error?: string;
  result?: unknown;
}

/**
 * Execute triggered auto-actions
 * This is a placeholder - actual execution requires database access
 */
export async function executeAutoActions(
  leadId: string,
  actions: AutoAction[],
  context: { teamId: string; userId?: string },
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "add_to_suppression":
          // Would call: await addToSuppression(leadId, action.reason, context.teamId)
          console.log(
            `[AutoAction] Add to suppression: ${leadId}, reason: ${action.reason}`,
          );
          results.push({ action, success: true });
          break;

        case "queue_for_call":
          // Would call: await queueForCall(leadId, action.priority, context.teamId)
          console.log(
            `[AutoAction] Queue for call: ${leadId}, priority: ${action.priority}`,
          );
          results.push({ action, success: true });
          break;

        case "send_value_x":
          // Would call: await queueValueXDelivery(leadId, action.deliverableType)
          console.log(
            `[AutoAction] Send Value X: ${leadId}, type: ${action.deliverableType}`,
          );
          results.push({ action, success: true });
          break;

        case "move_to_bucket":
          // Would call: await moveToBucket(leadId, action.bucketId, context.teamId)
          console.log(
            `[AutoAction] Move to bucket: ${leadId}, bucket: ${action.bucketId}`,
          );
          results.push({ action, success: true });
          break;

        case "notify_operator":
          // Would call: await sendOperatorNotification(action.message, { leadId, teamId })
          console.log(
            `[AutoAction] Notify operator: ${action.message} (lead: ${leadId})`,
          );
          results.push({ action, success: true });
          break;

        case "cancel_pending_messages":
          // Would call: await cancelPendingMessages(leadId)
          console.log(`[AutoAction] Cancel pending messages: ${leadId}`);
          results.push({ action, success: true });
          break;

        case "schedule_nurture":
          // Would call: await scheduleNurture(leadId, action.delayDays)
          console.log(
            `[AutoAction] Schedule nurture: ${leadId}, delay: ${action.delayDays} days`,
          );
          results.push({ action, success: true });
          break;

        default:
          results.push({
            action,
            success: false,
            error: `Unknown action type`,
          });
      }
    } catch (error) {
      results.push({
        action,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// ============================================================================
// PHONE CENTER QUEUE INTEGRATION
// ============================================================================

export interface PhoneCenterQueueItem {
  leadId: string;
  firstName: string;
  phone: string;
  email?: string;
  priority: "gold" | "green" | "standard" | "low";
  priorityScore: number;
  reason: string;
  tags: string[];
  scheduledAt: Date;
  source: string;
}

/**
 * Build a phone center queue item from labeling result
 */
export function buildPhoneCenterQueueItem(
  leadId: string,
  leadData: { firstName: string; phone: string; email?: string },
  labelingResult: LabelingResult,
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): PhoneCenterQueueItem | null {
  // Only queue if call action was triggered
  const callAction = labelingResult.triggeredActions.find(
    (a) => a.type === "queue_for_call",
  );

  if (!callAction) {
    return null;
  }

  const priorityTier = getPriorityTier(labelingResult.priorityScore, config);

  // Calculate scheduled time
  const scheduledAt = new Date();
  scheduledAt.setHours(
    scheduledAt.getHours() + config.callQueueConfig.followUpDelayHours,
  );

  // Snap to preferred call window if needed
  const hour = scheduledAt.getHours();
  const inWindow = config.callQueueConfig.preferredCallWindows.some(
    (w) => hour >= w.start && hour < w.end,
  );

  if (!inWindow && config.callQueueConfig.preferredCallWindows.length > 0) {
    const nextWindow = config.callQueueConfig.preferredCallWindows[0];
    if (hour >= nextWindow.end) {
      // Schedule for next day's first window
      scheduledAt.setDate(scheduledAt.getDate() + 1);
    }
    scheduledAt.setHours(nextWindow.start, 0, 0, 0);
  }

  return {
    leadId,
    firstName: leadData.firstName,
    phone: leadData.phone,
    email: leadData.email,
    priority: priorityTier,
    priorityScore: labelingResult.priorityScore,
    reason: labelingResult.classification?.classificationName || "Auto-queued",
    tags: labelingResult.appliedTags,
    scheduledAt,
    source: "auto-labeling",
  };
}

// ============================================================================
// CONFIG HELPERS
// ============================================================================

/**
 * Get tag config by ID
 */
export function getTagConfig(
  tagId: string,
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): TagConfig | undefined {
  return config.tags[tagId];
}

/**
 * Get all available tags
 */
export function getAllTags(
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): TagConfig[] {
  return Object.values(config.tags).sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a tag exists
 */
export function tagExists(
  tagId: string,
  config: AutoLabelConfig = DEFAULT_AUTO_LABEL_CONFIG,
): boolean {
  return tagId in config.tags;
}

// Log on import
console.log(
  `[AutoLabeling] Engine loaded with ${Object.keys(DEFAULT_AUTO_LABEL_CONFIG.tags).length} canonical tags`,
);
console.log(
  `[AutoLabeling] ${DEFAULT_AUTO_LABEL_CONFIG.classificationMappings.length} classification mappings configured`,
);
