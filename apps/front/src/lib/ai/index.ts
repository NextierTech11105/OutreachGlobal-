/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI MODULE - Centralized AI Infrastructure
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This module exports all AI-related utilities:
 * - OpenAI client (classification, response generation)
 * - Perplexity scanner (business verification, research)
 * - Circuit breaker (fault tolerance)
 * - Usage tracker (token metering per tenant)
 * - Provider wrapper (hardened API calls for custom routes)
 *
 * Usage:
 * ```ts
 * import { classifyMessage, verifyBusiness, trackUsage } from "@/lib/ai";
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// OpenAI Client - SMS Classification & Response Generation
export {
  classifyMessage,
  generateResponse,
  quickClassify,
  batchClassify,
  checkOpenAIHealth,
  type Classification,
  type Priority,
  type ClassificationResult,
  type GeneratedResponse,
} from "./openai-client";

// Perplexity Scanner - Business Verification & Research
export {
  verifyBusiness,
  researchOwner,
  getCompetitiveIntel,
  batchVerifyBusinesses,
  checkPerplexityHealth,
  type BusinessVerification,
  type OwnerResearch,
  type CompetitiveIntel,
} from "./perplexity-scanner";

// Circuit Breaker - Fault Tolerance
export {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitState,
  openaiCircuit,
  perplexityCircuit,
  anthropicCircuit,
} from "./circuit-breaker";

// Usage Tracker - Token Metering
export {
  trackUsage,
  checkUsageLimits,
  getUsageSummary,
  setUsageLimits,
  type UsageRecord,
  type UsageSummary,
  type UsageLimitCheck,
} from "./usage-tracker";

// Provider Wrapper - Hardened API Calls for Custom Routes
export {
  callOpenAIHardened,
  callAnthropicHardened,
  type OpenAICallOptions,
  type AnthropicCallOptions,
  type AICallResult,
} from "./provider-wrapper";
