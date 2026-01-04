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

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL EXPORTS (from template-cartridges.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core Types
  type CampaignStage,
  type AIWorker,
  type SMSTemplate,
  type TemplateCartridge,
  type WorkspaceCartridgeConfig,

  // Lifecycle enum
  TemplateLifecycle,

  // Cartridges (inject when activated)
  BUSINESS_BROKERING_CARTRIDGE,
  CRM_CONSULTANTS_CARTRIDGE,
  BLUE_COLLAR_CARTRIDGE,
  REAL_ESTATE_CARTRIDGE,
  CATHY_NUDGE_CARTRIDGE,
  SABRINA_OBJECTION_CARTRIDGE,
  SABRINA_BOOKING_CARTRIDGE,
  CARTRIDGE_LIBRARY,
  ALL_CARTRIDGES,

  // Management
  cartridgeManager,
  workspaceCartridgeManager,
} from "./template-cartridges";

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (from campaign-templates.ts - DEPRECATED)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types (deprecated - use template-cartridges.ts types)
  type CampaignStageConfig,
  type CallScript,

  // Stage configuration
  CAMPAIGN_STAGES,

  // Template variables
  TEMPLATE_VARIABLES,

  // Template collections by stage (deprecated - use CARTRIDGE_LIBRARY)
  INITIAL_TEMPLATES,
  RETARGET_TEMPLATES,
  NUDGE_TEMPLATES,
  FOLLOWUP_TEMPLATES,
  RETENTION_TEMPLATES,
  CONFIRMATION_TEMPLATES,

  // Cold call scripts
  COLD_CALL_SCRIPTS,

  // All templates combined (deprecated - use CARTRIDGE_LIBRARY)
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

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION ROUTER (Canonical SMS Gateway)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  executeSMS,
  executeBatchSMS,
  previewSMS,
  isRouterConfigured,
  type SMSExecutionRequest,
  type SMSExecutionResult,
  type BatchExecutionRequest,
  type BatchExecutionResult,
  type SMSAuditLog,
} from "./ExecutionRouter";

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION MODES (Blast / Scheduled / Auto)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ExecutionMode,
  type BlastModeConfig,
  type ScheduledModeConfig,
  type AutoModeConfig,
  type SMSTrigger,
  type ExecutionResult,

  // Mode executors
  executeBlast,
  executeScheduled,
  registerAutoTrigger,

  // Unified executor
  executeSMSCampaign,

  // Schedule management
  cancelSchedule,
  getScheduleStatus,

  // Trigger management
  unregisterAutoTrigger,
  getActiveTriggers,
} from "./execution-modes";

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE RESOLUTION (Canonical lookup)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  resolveTemplateById,
  resolveAndRenderTemplate,
  templateExists,
  validateTemplateId,
  validateSendable,
  isTemplateSendable,
  isTemplateDisabled,
  isRawMessage,
  rejectRawMessage,
  type ResolvedTemplate,
  type TemplateResolutionError,
} from "./resolveTemplate";

// NOTE: Template Cartridge exports are now at the top of this file (CANONICAL EXPORTS section)
