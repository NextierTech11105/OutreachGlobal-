/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY SCANNER - Business Verification & Research (HARDENED)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uses Perplexity AI to:
 * - Verify business is still operating
 * - Find current owner information
 * - Get company details and news
 * - Research industry/competitive intel
 *
 * SECURITY HARDENING (P0):
 * - 30s timeout on all API calls
 * - Input sanitization to prevent prompt injection
 * - Zod schema validation for AI outputs
 * - Token usage logging for cost tracking
 * - Retry with exponential backoff
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { Logger } from "@/lib/logger";
import { perplexityCircuit, CircuitBreakerError } from "./circuit-breaker";
import { trackUsage, checkUsageLimits } from "./usage-tracker";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_INPUT_LENGTH: 500,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BusinessVerification {
  isVerified: boolean;
  isActive: boolean;
  confidence: number;
  companyName: string;
  status: "active" | "inactive" | "unknown" | "closed";
  lastVerified: Date;
  source: string;
  details?: {
    website?: string;
    phone?: string;
    address?: string;
    industry?: string;
    employees?: string;
    yearFounded?: string;
    description?: string;
  };
  owner?: {
    name?: string;
    title?: string;
    linkedIn?: string;
  };
  warnings?: string[];
}

export interface OwnerResearch {
  found: boolean;
  confidence: number;
  ownerName?: string;
  ownerTitle?: string;
  ownerLinkedIn?: string;
  companyRole?: string;
  otherContacts?: Array<{
    name: string;
    title: string;
    source: string;
  }>;
  sources: string[];
}

export interface CompetitiveIntel {
  industry: string;
  competitors: string[];
  marketPosition?: string;
  recentNews?: Array<{
    headline: string;
    date: string;
    source: string;
  }>;
  insights: string[];
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS - Output Validation
// ═══════════════════════════════════════════════════════════════════════════════

const BusinessVerificationSchema = z.object({
  isActive: z.boolean(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["active", "inactive", "unknown", "closed"]),
  details: z
    .object({
      website: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      industry: z.string().optional(),
      employees: z.string().optional(),
      yearFounded: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  owner: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      linkedIn: z.string().optional(),
    })
    .optional(),
  warnings: z.array(z.string()).optional(),
  source: z.string().optional(),
});

const OwnerResearchSchema = z.object({
  found: z.boolean(),
  confidence: z.number().min(0).max(1),
  ownerName: z.string().optional(),
  ownerTitle: z.string().optional(),
  ownerLinkedIn: z.string().optional(),
  companyRole: z.string().optional(),
  otherContacts: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        source: z.string(),
      }),
    )
    .optional(),
  sources: z.array(z.string()).optional(),
});

const CompetitiveIntelSchema = z.object({
  industry: z.string(),
  competitors: z.array(z.string()),
  marketPosition: z.string().optional(),
  recentNews: z
    .array(
      z.object({
        headline: z.string(),
        date: z.string(),
        source: z.string(),
      }),
    )
    .optional(),
  insights: z.array(z.string()),
});

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION - Prompt Injection Prevention
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  if (sanitized.length > CONFIG.MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, CONFIG.MAX_INPUT_LENGTH);
    Logger.warn("Perplexity", "Input truncated", {
      originalLength: input.length,
      maxLength: CONFIG.MAX_INPUT_LENGTH,
    });
  }

  const dangerousPatterns = [
    /ignore (all )?(previous|prior|above) (instructions|prompts?|commands?)/gi,
    /disregard (all )?(previous|prior|above)/gi,
    /new instructions?:/gi,
    /system prompt:/gi,
    /\[INST\]/gi,
    /<<SYS>>/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      Logger.warn("Perplexity", "Potential prompt injection", {
        pattern: pattern.source,
      });
      sanitized = sanitized.replace(pattern, "[FILTERED]");
    }
  }

  return sanitized
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("timeout") ||
      message.includes("aborted")
    );
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

async function queryPerplexity(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    operation?: string;
    teamId?: string;
  } = {},
): Promise<{ content: string; usage: TokenUsage | null }> {
  const {
    model = "llama-3.1-sonar-small-128k-online",
    maxTokens = 1000,
    operation = "unknown",
    teamId,
  } = options;

  // Check usage limits if teamId provided
  if (teamId) {
    const limitCheck = await checkUsageLimits(teamId);
    if (!limitCheck.allowed) {
      Logger.warn("Perplexity", "Usage limit exceeded", {
        teamId,
        reason: limitCheck.reason,
        percentUsed: limitCheck.percentUsed,
      });
      throw new Error(`AI usage limit exceeded: ${limitCheck.reason}`);
    }
  }

  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  // Check circuit breaker before attempting call
  if (!perplexityCircuit.canExecute()) {
    Logger.warn("Perplexity", "Circuit breaker OPEN, rejecting request", {
      operation,
      stats: perplexityCircuit.getStats(),
    });
    throw new CircuitBreakerError(
      "Perplexity circuit breaker is OPEN. Service temporarily unavailable.",
      "perplexity",
      perplexityCircuit.getStats().state
    );
  }

  let lastError: Error | null = null;
  let startTime = Date.now();

  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    try {
      startTime = Date.now();

      const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a business research assistant. Provide factual, current information about businesses. Always respond with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
          return_citations: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Perplexity API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      const usage: TokenUsage | null = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : null;

      if (usage) {
        Logger.info("Perplexity", "Query completed", {
          operation,
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          latencyMs,
          attempt: attempt + 1,
        });

        // Track usage in database if teamId provided
        if (teamId) {
          trackUsage({
            teamId,
            provider: "perplexity",
            model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            latencyMs,
            success: true,
          }).catch((err) => {
            Logger.error("Perplexity", "Failed to track usage", { error: err.message });
          });
        }
      }

      // Record success with circuit breaker
      perplexityCircuit.recordSuccess();

      return {
        content: data.choices[0]?.message?.content || "",
        usage,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < CONFIG.MAX_RETRIES - 1 && isRetryableError(error)) {
        const delayMs = CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        Logger.warn("Perplexity", "Query failed, retrying", {
          operation,
          attempt: attempt + 1,
          delayMs,
          error: lastError.message,
        });
        await sleep(delayMs);
        continue;
      }

      Logger.error("Perplexity", "Query failed", {
        operation,
        attempt: attempt + 1,
        error: lastError.message,
      });

      // Track failed usage if teamId provided
      if (teamId) {
        trackUsage({
          teamId,
          provider: "perplexity",
          model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: Date.now() - startTime,
          success: false,
        }).catch(() => {});
      }

      // Record failure with circuit breaker
      perplexityCircuit.recordFailure(lastError);
      throw lastError;
    }
  }

  // Record failure with circuit breaker if all retries exhausted
  if (lastError) {
    perplexityCircuit.recordFailure(lastError);
  }
  throw lastError || new Error("Perplexity query failed after retries");
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify if a business is still active and operating
 */
export async function verifyBusiness(
  companyName: string,
  address?: string,
  website?: string,
  teamId?: string,
): Promise<BusinessVerification> {
  const sanitizedName = sanitizeInput(companyName);
  const sanitizedAddress = address ? sanitizeInput(address) : "";
  const sanitizedWebsite = website ? sanitizeInput(website) : "";

  const locationContext = sanitizedAddress
    ? ` located at or near ${sanitizedAddress}`
    : "";
  const websiteContext = sanitizedWebsite
    ? ` (website: ${sanitizedWebsite})`
    : "";

  const prompt = `Research the company "${sanitizedName}"${locationContext}${websiteContext}.

Determine if this business is currently active and operating. Look for:
1. Current website status
2. Recent activity (social media, news, reviews)
3. Current owner/leadership
4. Business registration status if available

Respond with JSON only:
{
  "isActive": true/false,
  "confidence": 0.0-1.0,
  "status": "active" | "inactive" | "unknown" | "closed",
  "details": {
    "website": "url if found",
    "phone": "phone if found",
    "address": "current address",
    "industry": "industry category",
    "employees": "employee count range",
    "yearFounded": "year",
    "description": "brief description"
  },
  "owner": {
    "name": "owner/CEO name if found",
    "title": "their title",
    "linkedIn": "linkedin url if found"
  },
  "warnings": ["any concerns about legitimacy"],
  "source": "main source of information"
}`;

  try {
    const { content } = await queryPerplexity(prompt, {
      operation: "verifyBusiness",
      teamId,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isVerified: false,
        isActive: false,
        confidence: 0,
        companyName,
        status: "unknown",
        lastVerified: new Date(),
        source: "perplexity",
        warnings: ["Could not parse verification result"],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = BusinessVerificationSchema.safeParse(parsed);

    if (validated.success) {
      return {
        isVerified: true,
        isActive: validated.data.isActive,
        confidence: validated.data.confidence,
        companyName,
        status: validated.data.status,
        lastVerified: new Date(),
        source: validated.data.source || "perplexity",
        details: validated.data.details,
        owner: validated.data.owner,
        warnings: validated.data.warnings,
      };
    }

    Logger.warn("Perplexity", "Verification validation failed", {
      errors: validated.error.errors,
    });

    return {
      isVerified: true,
      isActive: parsed.isActive ?? false,
      confidence: parsed.confidence ?? 0.5,
      companyName,
      status: parsed.status || "unknown",
      lastVerified: new Date(),
      source: parsed.source || "perplexity",
      details: parsed.details,
      owner: parsed.owner,
      warnings: parsed.warnings,
    };
  } catch (error) {
    Logger.error("Perplexity", "Verification error", {
      error: error instanceof Error ? error.message : "Unknown",
      companyName,
    });
    return {
      isVerified: false,
      isActive: false,
      confidence: 0,
      companyName,
      status: "unknown",
      lastVerified: new Date(),
      source: "perplexity",
      warnings: [
        error instanceof Error ? error.message : "Verification failed",
      ],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER RESEARCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Research the owner/decision maker of a business
 */
export async function researchOwner(
  companyName: string,
  existingOwnerName?: string,
  teamId?: string,
): Promise<OwnerResearch> {
  const sanitizedName = sanitizeInput(companyName);
  const sanitizedOwner = existingOwnerName
    ? sanitizeInput(existingOwnerName)
    : "";

  const ownerContext = sanitizedOwner
    ? ` Verify if "${sanitizedOwner}" is still associated with this company.`
    : "";

  const prompt = `Find the current owner, CEO, or primary decision maker of "${sanitizedName}".${ownerContext}

Look for:
1. Current owner/CEO name
2. Their title and role
3. LinkedIn profile if available
4. Other key contacts (VP Sales, Marketing, etc.)

Respond with JSON only:
{
  "found": true/false,
  "confidence": 0.0-1.0,
  "ownerName": "full name",
  "ownerTitle": "title",
  "ownerLinkedIn": "linkedin url",
  "companyRole": "owner/ceo/founder/etc",
  "otherContacts": [
    {"name": "name", "title": "title", "source": "where found"}
  ],
  "sources": ["list of sources used"]
}`;

  try {
    const { content } = await queryPerplexity(prompt, {
      operation: "researchOwner",
      teamId,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        found: false,
        confidence: 0,
        sources: ["perplexity"],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = OwnerResearchSchema.safeParse(parsed);

    if (validated.success) {
      return {
        found: validated.data.found,
        confidence: validated.data.confidence,
        ownerName: validated.data.ownerName,
        ownerTitle: validated.data.ownerTitle,
        ownerLinkedIn: validated.data.ownerLinkedIn,
        companyRole: validated.data.companyRole,
        otherContacts: validated.data.otherContacts || [],
        sources: validated.data.sources || ["perplexity"],
      };
    }

    return {
      found: parsed.found ?? false,
      confidence: parsed.confidence ?? 0.5,
      ownerName: parsed.ownerName,
      ownerTitle: parsed.ownerTitle,
      ownerLinkedIn: parsed.ownerLinkedIn,
      companyRole: parsed.companyRole,
      otherContacts: parsed.otherContacts || [],
      sources: parsed.sources || ["perplexity"],
    };
  } catch (error) {
    Logger.error("Perplexity", "Owner research error", {
      error: error instanceof Error ? error.message : "Unknown",
      companyName,
    });
    return {
      found: false,
      confidence: 0,
      sources: ["perplexity"],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITIVE INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get competitive intelligence about a business
 */
export async function getCompetitiveIntel(
  companyName: string,
  industry?: string,
  teamId?: string,
): Promise<CompetitiveIntel> {
  const sanitizedName = sanitizeInput(companyName);
  const sanitizedIndustry = industry ? sanitizeInput(industry) : "";
  const industryContext = sanitizedIndustry
    ? ` in the ${sanitizedIndustry} industry`
    : "";

  const prompt = `Research "${sanitizedName}"${industryContext} for sales intelligence.

Find:
1. Industry and market position
2. Top 3-5 competitors
3. Recent news or announcements
4. Key insights for sales outreach

Respond with JSON only:
{
  "industry": "industry category",
  "competitors": ["competitor 1", "competitor 2"],
  "marketPosition": "brief market position",
  "recentNews": [
    {"headline": "news headline", "date": "date", "source": "source"}
  ],
  "insights": ["insight 1 for sales", "insight 2"]
}`;

  try {
    const { content } = await queryPerplexity(prompt, {
      operation: "getCompetitiveIntel",
      teamId,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        industry: industry || "Unknown",
        competitors: [],
        insights: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = CompetitiveIntelSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    return {
      industry: parsed.industry || industry || "Unknown",
      competitors: parsed.competitors || [],
      marketPosition: parsed.marketPosition,
      recentNews: parsed.recentNews || [],
      insights: parsed.insights || [],
    };
  } catch (error) {
    Logger.error("Perplexity", "Intel error", {
      error: error instanceof Error ? error.message : "Unknown",
      companyName,
    });
    return {
      industry: industry || "Unknown",
      competitors: [],
      insights: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify multiple businesses in batch
 */
export async function batchVerifyBusinesses(
  businesses: Array<{
    companyName: string;
    address?: string;
    website?: string;
  }>,
  concurrency: number = 3,
  teamId?: string,
): Promise<Map<string, BusinessVerification>> {
  const results = new Map<string, BusinessVerification>();

  for (let i = 0; i < businesses.length; i += concurrency) {
    const batch = businesses.slice(i, i + concurrency);

    const promises = batch.map(async (biz) => {
      const result = await verifyBusiness(
        biz.companyName,
        biz.address,
        biz.website,
        teamId,
      );
      results.set(biz.companyName, result);
    });

    await Promise.all(promises);

    if (i + concurrency < businesses.length) {
      await sleep(1000);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkPerplexityHealth(): Promise<{
  configured: boolean;
  working: boolean;
  error?: string;
}> {
  if (!PERPLEXITY_API_KEY) {
    return {
      configured: false,
      working: false,
      error: "PERPLEXITY_API_KEY not set",
    };
  }

  try {
    await queryPerplexity('Reply with: {"status": "ok"}', {
      maxTokens: 50,
      operation: "healthCheck",
    });
    return { configured: true, working: true };
  } catch (error) {
    return {
      configured: true,
      working: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Logger.info(
  "Perplexity",
  "Perplexity Scanner loaded - Hardened business verification ready",
);
