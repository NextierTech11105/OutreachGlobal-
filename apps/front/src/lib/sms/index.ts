/**
 * SMS Campaign Library
 *
 * INBOUND RESPONSE GENERATION MACHINE
 *
 * Architecture:
 * 1. FOUNDATIONAL DATABASE (50K+ per client)
 *    - USBizData imports
 *    - Cleaned, deduplicated
 *    - Role/Title prioritized (Owner=100, CEO=90, VP=75...)
 *    - Built to suit per client
 *
 * 2. CAMPAIGN BLOCKS (2K each)
 *    - Drawn from foundation database
 *    - Each block = Campaign ID + Phone Number + AI Worker
 *    - Matches skip trace daily limit (2,000)
 *
 * 3. INITIAL SMS → Response → GOLD LABEL → Follow-up → Meeting
 *    - GIANNA: Initial openers
 *    - CATHY: Retarget + Nudge
 *    - SABRINA: Follow-up closers
 *    - NEVA: Retention/reactivation
 *
 * 4. End Goal: 15-minute discovery meeting
 */

// Campaign Templates
export {
  // Types
  type CampaignStage,
  type AIWorker,
  type SMSTemplate,
  type CampaignStageConfig,
  type CallScript,

  // Stage configuration
  CAMPAIGN_STAGES,

  // Template variables
  TEMPLATE_VARIABLES,

  // Template collections by stage
  INITIAL_TEMPLATES,
  RETARGET_TEMPLATES,
  NUDGE_TEMPLATES,
  FOLLOWUP_TEMPLATES,
  RETENTION_TEMPLATES,
  CONFIRMATION_TEMPLATES,

  // Cold call scripts
  COLD_CALL_SCRIPTS,

  // All templates combined
  ALL_SMS_TEMPLATES,

  // Utility functions
  extractVariables,
  replaceVariables,
  getTemplatesByStage,
  getTemplatesByWorker,
  getTemplatesByTag,
  searchTemplates,
  getStageConfig,
  formatForSignalHouse,
} from "./campaign-templates";

// Response Mapping
export {
  // Types
  type OutboundMessage,
  type InboundMessage,
  type ResponseClassification,
  type ResponseType,
  type ResponseIntent,
  type SuggestedAction,
  type StageProgression,
  type ConversationContext,
  type TemplatePerformance,

  // Classification functions
  classifyResponse,
  extractEmail,
  isOptOut,
  isPositive,
  isGoldLabel,

  // Stage progression
  determineNextStage,

  // Context building
  buildConversationContext,

  // Webhook helpers
  processInboundSMS,

  // Analytics
  calculateTemplatePerformance,
} from "./response-mapping";
