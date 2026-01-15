/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY SCANNER - Business Verification & Research
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uses Perplexity AI to:
 * - Verify business is still operating
 * - Find current owner information
 * - Get company details and news
 * - Research industry/competitive intel
 *
 * Perfect for pre-enrichment validation before skip tracing.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

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

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

async function queryPerplexity(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const { model = "llama-3.1-sonar-small-128k-online", maxTokens = 1000 } = options;

  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
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
  website?: string
): Promise<BusinessVerification> {
  const locationContext = address ? ` located at or near ${address}` : "";
  const websiteContext = website ? ` (website: ${website})` : "";

  const prompt = `Research the company "${companyName}"${locationContext}${websiteContext}.

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
    const result = await queryPerplexity(prompt);

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
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
    console.error("[Perplexity Scanner] Verification error:", error);
    return {
      isVerified: false,
      isActive: false,
      confidence: 0,
      companyName,
      status: "unknown",
      lastVerified: new Date(),
      source: "perplexity",
      warnings: [error instanceof Error ? error.message : "Verification failed"],
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
  existingOwnerName?: string
): Promise<OwnerResearch> {
  const ownerContext = existingOwnerName
    ? ` Verify if "${existingOwnerName}" is still associated with this company.`
    : "";

  const prompt = `Find the current owner, CEO, or primary decision maker of "${companyName}".${ownerContext}

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
    const result = await queryPerplexity(prompt);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        found: false,
        confidence: 0,
        sources: ["perplexity"],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

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
    console.error("[Perplexity Scanner] Owner research error:", error);
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
  industry?: string
): Promise<CompetitiveIntel> {
  const industryContext = industry ? ` in the ${industry} industry` : "";

  const prompt = `Research "${companyName}"${industryContext} for sales intelligence.

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
    const result = await queryPerplexity(prompt);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        industry: industry || "Unknown",
        competitors: [],
        insights: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      industry: parsed.industry || industry || "Unknown",
      competitors: parsed.competitors || [],
      marketPosition: parsed.marketPosition,
      recentNews: parsed.recentNews || [],
      insights: parsed.insights || [],
    };
  } catch (error) {
    console.error("[Perplexity Scanner] Intel error:", error);
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
  concurrency: number = 3
): Promise<Map<string, BusinessVerification>> {
  const results = new Map<string, BusinessVerification>();

  // Process in parallel batches
  for (let i = 0; i < businesses.length; i += concurrency) {
    const batch = businesses.slice(i, i + concurrency);

    const promises = batch.map(async (biz) => {
      const result = await verifyBusiness(biz.companyName, biz.address, biz.website);
      results.set(biz.companyName, result);
    });

    await Promise.all(promises);

    // Rate limit - wait 1 second between batches
    if (i + concurrency < businesses.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
    await queryPerplexity('Reply with: {"status": "ok"}', { maxTokens: 50 });
    return { configured: true, working: true };
  } catch (error) {
    return {
      configured: true,
      working: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

console.log("[Perplexity Scanner] Loaded - Business verification ready");
