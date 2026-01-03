/**
 * Cold SMS Variance Engine - Variance Rules
 *
 * Defines rules for dynamically generating message variations
 * to prevent pattern detection and maintain freshness.
 *
 * @see docs/COLD_SMS_VARIANCE_ENGINE.md
 */

import {
  ColdSMSTemplate,
  MESSAGE_GROUPS,
  getAllTemplates,
  getTemplatesByGroup,
} from "./message-groups";

/**
 * Lead data required for template selection and rendering
 */
export interface LeadContext {
  firstName: string;
  lastName?: string;
  businessName: string;
  city?: string;
  state?: string;
  industry?: string;
  leadScore?: number;
  previousAttempts?: number;
  lastContactDate?: Date;
  tags?: string[];
}

/**
 * Template selection configuration
 */
export interface VarianceConfig {
  /** Minimum hours between messages to same lead */
  minIntervalHours: number;
  /** Maximum daily messages per phone number */
  maxDailyPerPhone: number;
  /** Percentage of templates to exclude from rotation (0-1) */
  rotationExclusion: number;
  /** Prefer morning vs afternoon based on industry */
  respectTimePreference: boolean;
  /** Avoid repeating same group within N attempts */
  groupCooldownAttempts: number;
}

export const DEFAULT_VARIANCE_CONFIG: VarianceConfig = {
  minIntervalHours: 72, // 3 days minimum between attempts
  maxDailyPerPhone: 200, // Conservative daily limit
  rotationExclusion: 0.2, // Exclude 20% of templates each day
  respectTimePreference: true,
  groupCooldownAttempts: 3, // Don't use same group for 3 attempts
};

/**
 * Group selection rules based on lead data availability
 */
interface GroupSelectionRule {
  groupId: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  priority: number;
  condition: (lead: LeadContext) => boolean;
  weight: number;
}

/**
 * Rules for selecting which message group to use
 * Higher priority rules are evaluated first
 * Weight determines random selection probability within valid groups
 */
const GROUP_SELECTION_RULES: GroupSelectionRule[] = [
  // Group A: Neighbor/Proximity - requires city
  {
    groupId: "A",
    priority: 1,
    condition: (lead) => !!lead.city && lead.city.length > 0,
    weight: 25,
  },
  // Group B: Industry Relevance - requires industry
  {
    groupId: "B",
    priority: 1,
    condition: (lead) => !!lead.industry && lead.industry.length > 0,
    weight: 25,
  },
  // Group D: Social Proof - requires city or industry (for "similar businesses")
  {
    groupId: "D",
    priority: 2,
    condition: (lead) =>
      (!!lead.city && lead.city.length > 0) ||
      (!!lead.industry && lead.industry.length > 0),
    weight: 15,
  },
  // Group E: Value Curiosity - works for growth-oriented (higher score)
  {
    groupId: "E",
    priority: 2,
    condition: (lead) => (lead.leadScore || 0) >= 50,
    weight: 15,
  },
  // Group G: Direct Qualifying - high-value leads only
  {
    groupId: "G",
    priority: 1,
    condition: (lead) => (lead.leadScore || 0) >= 70,
    weight: 10,
  },
  // Group F: Simple Check-in - re-engagement after non-response
  {
    groupId: "F",
    priority: 3,
    condition: (lead) => (lead.previousAttempts || 0) >= 1,
    weight: 30,
  },
  // Group C: Timing Hook - always available as fallback
  {
    groupId: "C",
    priority: 10,
    condition: () => true,
    weight: 20,
  },
];

/**
 * Select appropriate message group based on lead context
 */
export function selectMessageGroup(
  lead: LeadContext,
  previousGroups: string[] = [],
  config: VarianceConfig = DEFAULT_VARIANCE_CONFIG,
): "A" | "B" | "C" | "D" | "E" | "F" | "G" {
  // Get valid groups based on conditions
  const validRules = GROUP_SELECTION_RULES.filter((rule) =>
    rule.condition(lead),
  );

  // Filter out recently used groups
  const cooldownGroups = previousGroups.slice(0, config.groupCooldownAttempts);
  const availableRules = validRules.filter(
    (rule) => !cooldownGroups.includes(rule.groupId),
  );

  // If all groups are on cooldown, use any valid group
  const rulesToUse = availableRules.length > 0 ? availableRules : validRules;

  // Weight-based random selection
  const totalWeight = rulesToUse.reduce((sum, rule) => sum + rule.weight, 0);
  let random = Math.random() * totalWeight;

  for (const rule of rulesToUse) {
    random -= rule.weight;
    if (random <= 0) {
      return rule.groupId;
    }
  }

  // Fallback to timing group
  return "C";
}

/**
 * Select a specific template from a group
 * Considers time of day, day of week, tone, and recent usage
 */
export function selectTemplate(
  groupId: "A" | "B" | "C" | "D" | "E" | "F" | "G",
  lead: LeadContext,
  usedTemplateIds: string[] = [],
  config: VarianceConfig = DEFAULT_VARIANCE_CONFIG,
): ColdSMSTemplate | null {
  const templates = getTemplatesByGroup(groupId);
  if (templates.length === 0) return null;

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  // Determine current time slot
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const timeSlot: "morning" | "afternoon" | "evening" =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  // Filter templates by time preferences
  let availableTemplates = templates.filter((t) => {
    // Check day of week preference
    if (t.dayOfWeek === "weekday" && isWeekend) return false;
    if (t.dayOfWeek === "weekend" && !isWeekend) return false;

    // Check time of day preference (if config respects it)
    if (config.respectTimePreference && t.timeOfDay !== "any") {
      if (t.timeOfDay !== timeSlot) return false;
    }

    return true;
  });

  // If no time-appropriate templates, use all templates
  if (availableTemplates.length === 0) {
    availableTemplates = templates;
  }

  // Remove recently used templates
  availableTemplates = availableTemplates.filter(
    (t) => !usedTemplateIds.includes(t.id),
  );

  // If all templates used, reset and use all available
  if (availableTemplates.length === 0) {
    availableTemplates = templates;
  }

  // Apply rotation exclusion (daily variance)
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const excludeCount = Math.floor(
    availableTemplates.length * config.rotationExclusion,
  );

  if (excludeCount > 0 && availableTemplates.length > excludeCount) {
    // Deterministically exclude templates based on day
    const sortedByHash = [...availableTemplates].sort((a, b) => {
      const hashA = hashString(a.id + dayOfYear);
      const hashB = hashString(b.id + dayOfYear);
      return hashA - hashB;
    });
    availableTemplates = sortedByHash.slice(excludeCount);
  }

  // Random selection from remaining templates
  const randomIndex = Math.floor(Math.random() * availableTemplates.length);
  return availableTemplates[randomIndex];
}

/**
 * Render template with lead data
 */
export function renderTemplate(
  template: ColdSMSTemplate,
  lead: LeadContext,
): string {
  let rendered = template.text;

  // Replace all variables
  rendered = rendered.replace(/\{\{firstName\}\}/g, lead.firstName);
  rendered = rendered.replace(
    /\{\{lastName\}\}/g,
    lead.lastName || lead.firstName,
  );
  rendered = rendered.replace(/\{\{businessName\}\}/g, lead.businessName);
  rendered = rendered.replace(/\{\{city\}\}/g, lead.city || "your area");
  rendered = rendered.replace(/\{\{state\}\}/g, lead.state || "");
  rendered = rendered.replace(
    /\{\{industry\}\}/g,
    lead.industry || "your industry",
  );

  // Clean up any double spaces
  rendered = rendered.replace(/\s+/g, " ").trim();

  return rendered;
}

/**
 * Full variance pipeline: select group, select template, render
 */
export interface VarianceResult {
  groupId: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  groupName: string;
  templateId: string;
  renderedMessage: string;
  charCount: number;
  template: ColdSMSTemplate;
}

export function generateVariantMessage(
  lead: LeadContext,
  previousGroups: string[] = [],
  usedTemplateIds: string[] = [],
  config: VarianceConfig = DEFAULT_VARIANCE_CONFIG,
): VarianceResult | null {
  // Select group
  const groupId = selectMessageGroup(lead, previousGroups, config);

  // Select template
  const template = selectTemplate(groupId, lead, usedTemplateIds, config);
  if (!template) return null;

  // Render message
  const renderedMessage = renderTemplate(template, lead);

  // Get group name
  const group = MESSAGE_GROUPS.find((g) => g.id === groupId);

  return {
    groupId,
    groupName: group?.name || "Unknown",
    templateId: template.id,
    renderedMessage,
    charCount: renderedMessage.length,
    template,
  };
}

/**
 * Validate rendered message meets A2P requirements
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRenderedMessage(message: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check length
  if (message.length > 160) {
    errors.push(`Message exceeds 160 chars (${message.length})`);
  }

  // Check for ALL CAPS words (excluding common acronyms)
  const capsWords = message.match(/\b[A-Z]{3,}\b/g) || [];
  const allowedAcronyms = ["SMS", "CEO", "USA", "LLC", "INC", "CPA", "HVAC"];
  const badCaps = capsWords.filter((w) => !allowedAcronyms.includes(w));
  if (badCaps.length > 0) {
    warnings.push(`ALL CAPS words detected: ${badCaps.join(", ")}`);
  }

  // Check for promotional language
  const promoPatterns = [
    /free/i,
    /act now/i,
    /limited time/i,
    /exclusive/i,
    /discount/i,
    /sale/i,
    /offer/i,
    /deal/i,
    /urgent/i,
    /expires/i,
  ];
  for (const pattern of promoPatterns) {
    if (pattern.test(message)) {
      errors.push(`Contains promotional language: ${pattern.source}`);
    }
  }

  // Check for sender identification
  const hasIdentification = /gianna/i.test(message) && /nextier/i.test(message);
  if (!hasIdentification) {
    errors.push("Missing sender identification (Gianna from Nextier)");
  }

  // Check for question (permission-seeking)
  if (!message.includes("?")) {
    warnings.push("No question mark - consider adding permission-seeking tone");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get variance statistics
 */
export function getVarianceStats(): {
  totalTemplates: number;
  groupCounts: Record<string, number>;
  toneDistribution: Record<string, number>;
  timeDistribution: Record<string, number>;
} {
  const templates = getAllTemplates();

  const groupCounts: Record<string, number> = {};
  const toneDistribution: Record<string, number> = {};
  const timeDistribution: Record<string, number> = {};

  for (const template of templates) {
    // Group counts
    groupCounts[template.group] = (groupCounts[template.group] || 0) + 1;

    // Tone distribution
    toneDistribution[template.tone] =
      (toneDistribution[template.tone] || 0) + 1;

    // Time distribution
    timeDistribution[template.timeOfDay] =
      (timeDistribution[template.timeOfDay] || 0) + 1;
  }

  return {
    totalTemplates: templates.length,
    groupCounts,
    toneDistribution,
    timeDistribution,
  };
}

/**
 * Simple string hash for deterministic randomization
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
