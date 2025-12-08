/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GIANNA AI - MAIN EXPORT
 * The Ultimate Digital SDR - Trained by Real Gianna, Scaled by AI
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   import { gianna } from '@/lib/gianna';
 *   const response = await gianna.generateResponse(message, context);
 *
 * Or import specific modules:
 *   import { classifyResponse, PERSONALITY_ARCHETYPES } from '@/lib/gianna';
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  GiannaService,
  gianna,
  type GiannaContext,
  type GiannaResponse,
  type GiannaOpenerRequest,
} from "./gianna-service";

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  GIANNA_IDENTITY,
  GIANNA_PRESETS,
  RESPONSE_STRATEGIES,
  OBJECTION_RESPONSES,
  LEAD_TYPE_APPROACHES,
  MESSAGE_RULES,
  personalityToPrompt,
  detectObjection,
  getResponseStrategy,
  getObjectionResponse,
  getLeadTypeApproach,
  type GiannaPersonality,
} from "./knowledge-base";

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY DNA
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PERSONALITY_ARCHETYPES,
  GREETING_DNA,
  TRANSITION_DNA,
  CLOSING_DNA,
  TEXTURE_DNA,
  HUMOR_DNA,
  PSYCHOLOGY_DNA,
  BEST_PERFORMERS,
  getOptimalPersonality,
  selectHumor,
  generateMessageWithDNA,
  type PersonalityArchetype,
  type PersonalityDNA,
  type ConversationContext,
  type GeneratedMessageDNA,
  type HumorStyle,
  type SpeechPattern,
  type RegionalFlavor,
  type ConversationStage,
} from "./personality-dna";

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION FLOWS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  classifyResponse,
  CONVERSATION_FLOWS,
  INDUSTRY_OPENERS,
  REFERRAL_SEQUENCES,
  getFlowForResponse,
  getIndustryOpener,
  getReferralRequest,
  type ResponseIntent,
  type ResponseClassification,
  type FlowStep,
  type ConversationFlow,
} from "./conversation-flows";

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE LIBRARY (from knowledge-base folder)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  OPENER_LIBRARY,
  REBUTTAL_LIBRARY,
  CAPTURE_GOALS,
  LEARNING_CONFIG,
  getBestOpeners,
  recordFeedback,
  type MessagePerformance,
  type RebuttalPerformance,
} from "./knowledge-base/message-library";

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOMATION FLOWS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  AUTOMATION_FLOWS,
  CALENDAR_CONFIG,
  EMAIL_QUEUE_CONFIG,
  LESLIE_NIELSEN_HUMOR,
  processEmailCapture,
} from "./knowledge-base/automation-flows";

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export {
  GIANNA_PERSONALITY,
  GIANNA_SYSTEM_PROMPT,
  GIANNA_TEMPLATES,
  getGiannaPrompt,
} from "./knowledge-base/personality";

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

import { gianna } from "./gianna-service";
export default gianna;
