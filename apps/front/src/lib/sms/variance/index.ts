/**
 * Cold SMS Variance Engine
 *
 * Complete system for generating varied, compliant cold SMS messages.
 *
 * Components:
 * - Message Groups: 7 psychological message categories (A-G)
 * - Templates: 175+ pre-written templates across all groups
 * - Variance Rules: Dynamic selection and rendering logic
 * - Scheduling: Time-optimized send scheduling
 * - Reply Gates: Post-reply conversation handoff logic
 *
 * @example
 * ```typescript
 * import {
 *   generateVariantMessage,
 *   calculateOptimalSendTime,
 *   processReply,
 * } from '@/lib/sms/variance';
 *
 * // Generate a varied cold SMS
 * const lead = {
 *   firstName: 'John',
 *   businessName: 'Johns Plumbing',
 *   city: 'Austin',
 *   industry: 'plumbing',
 * };
 *
 * const variant = generateVariantMessage(lead);
 * console.log(variant.renderedMessage);
 * // "Hi John, Gianna from Nextier. I work with plumbing businesses. Still running Johns Plumbing?"
 *
 * // Schedule the message
 * const schedule = calculateOptimalSendTime(lead);
 * console.log(schedule.sendAt, schedule.reason);
 *
 * // Process a reply
 * const replyResult = processReply("Yes, that's me!");
 * console.log(replyResult.action); // "handoff_cathy"
 * ```
 *
 * @see docs/COLD_SMS_VARIANCE_ENGINE.md
 */

// Message Groups & Templates
export {
  MESSAGE_GROUPS,
  GROUP_A_TEMPLATES,
  GROUP_B_TEMPLATES,
  GROUP_C_TEMPLATES,
  GROUP_D_TEMPLATES,
  GROUP_E_TEMPLATES,
  GROUP_F_TEMPLATES,
  GROUP_G_TEMPLATES,
  getAllTemplates,
  getTemplatesByGroup,
  getGroupById,
  getTotalTemplateCount,
  type MessageGroup,
  type ColdSMSTemplate,
} from "./message-groups";

// Variance Rules
export {
  selectMessageGroup,
  selectTemplate,
  renderTemplate,
  generateVariantMessage,
  validateRenderedMessage,
  getVarianceStats,
  DEFAULT_VARIANCE_CONFIG,
  type LeadContext,
  type VarianceConfig,
  type VarianceResult,
  type ValidationResult,
} from "./variance-rules";

// Scheduling
export {
  TIME_BANDS,
  DAY_CONFIGS,
  INDUSTRY_TIMING_PROFILES,
  getCurrentTimeBand,
  getCurrentDayConfig,
  isWithinSendingWindow,
  getIndustryProfile,
  calculateOptimalSendTime,
  generateBatchSchedule,
  canSendNow,
  getNextSendTime,
  DEFAULT_SCHEDULING_CONFIG,
  type TimeBand,
  type TimeBandConfig,
  type DayOfWeek,
  type DayConfig,
  type IndustryTimingProfile,
  type SchedulingConfig,
  type ScheduledSend,
  type BatchSchedule,
} from "./scheduling";

// Reply Gates
export {
  REPLY_GATES,
  AUTO_RESPONSES,
  classifyReplyIntent,
  getGateForIntent,
  processReply,
  generateCathyHandoff,
  getReplyStats,
  type ReplyIntent,
  type GateAction,
  type ReplyGate,
  type ReplyProcessingResult,
  type CathyHandoffContext,
} from "./reply-gates";

import { getVarianceStats as getStats } from "./variance-rules";
import {
  TIME_BANDS as timeBands,
  INDUSTRY_TIMING_PROFILES as industryProfiles,
} from "./scheduling";
import { REPLY_GATES as replyGates } from "./reply-gates";

/**
 * Variance Engine Summary Statistics
 */
export function getVarianceEngineSummary(): {
  templateStats: {
    total: number;
    byGroup: Record<string, number>;
    byTone: Record<string, number>;
  };
  scheduleStats: {
    timeBands: number;
    industryProfiles: number;
  };
  gateStats: {
    totalGates: number;
    intents: string[];
  };
} {
  const { totalTemplates, groupCounts, toneDistribution } = getStats();

  return {
    templateStats: {
      total: totalTemplates,
      byGroup: groupCounts,
      byTone: toneDistribution,
    },
    scheduleStats: {
      timeBands: timeBands.length,
      industryProfiles: industryProfiles.length,
    },
    gateStats: {
      totalGates: replyGates.length,
      intents: replyGates.map((g) => g.intent),
    },
  };
}
