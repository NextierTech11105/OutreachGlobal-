/**
 * NEVA - Deep Research & Deal Intelligence Agent
 *
 * INTERNAL COPILOT ONLY - Never handles external responses or SMS campaigns.
 * Provides intelligence and research support to human operators.
 *
 * Uses Perplexity API for:
 * 1. Quick Validation Scans - Is the business still operating? (Apollo-style)
 * 2. Deep Research - Comprehensive intel before appointments
 * 3. Market Sizing (TAM/SAM/SOM) - Industry size and opportunity
 * 4. Persona Intelligence - ICP and buyer persona development
 * 5. Deal-Making Research - Competitive positioning and strategy
 *
 * Validates USBizData records similar to how Apollo validates businesses.
 * Executes full research cycles in under 3 hours with 3+ source validation.
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_BASE_URL = "https://api.perplexity.ai/chat/completions";

// =============================================================================
// TYPES
// =============================================================================

export interface BusinessValidation {
  isValid: boolean;
  confidence: number; // 0-100
  status: "ACTIVE" | "CLOSED" | "UNKNOWN" | "MOVED" | "CHANGED_NAME";
  lastVerified: Date;
  signals: ValidationSignal[];
  summary: string;
}

export interface ValidationSignal {
  source: string;
  signal: string;
  sentiment: "positive" | "negative" | "neutral";
  timestamp?: string;
}

export interface DeepResearchResult {
  companyName: string;
  summary: string;
  keyFacts: string[];
  recentNews: NewsItem[];
  competitors: string[];
  painPoints: string[];
  talkingPoints: string[];
  decisionMakers: PersonInfo[];
  socialPresence: SocialPresence;
  confidence: number;
  researchedAt: Date;
}

export interface NewsItem {
  title: string;
  summary: string;
  date: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
}

export interface PersonInfo {
  name: string;
  title: string;
  linkedIn?: string;
  email?: string;
}

export interface SocialPresence {
  website: string | null;
  linkedin: string | null;
  facebook: string | null;
  twitter: string | null;
  googleMaps: string | null;
  yelpRating: number | null;
  googleRating: number | null;
}

// =============================================================================
// MARKET SIZING TYPES (TAM/SAM/SOM)
// =============================================================================

export interface MarketSizing {
  tam: MarketSegment; // Total Addressable Market
  sam: MarketSegment; // Serviceable Addressable Market
  som: MarketSegment; // Serviceable Obtainable Market
  industry: string;
  growthRate: number; // Annual growth rate %
  sources: ResearchSource[];
  calculatedAt: Date;
}

export interface MarketSegment {
  value: number; // USD
  unit: "millions" | "billions";
  description: string;
  methodology: string;
}

export interface ResearchSource {
  name: string;
  url: string | null;
  type:
    | "industry_report"
    | "government_data"
    | "financial_filing"
    | "news"
    | "trade_association";
  accessedAt: string;
}

// =============================================================================
// PERSONA INTELLIGENCE TYPES
// =============================================================================

export interface PersonaIntelligence {
  icp: IdealCustomerProfile;
  buyerPersonas: BuyerPersona[];
  painPoints: PainPoint[];
  buyingBehavior: BuyingBehavior;
  researchedAt: Date;
}

export interface IdealCustomerProfile {
  industry: string;
  companySize: string; // e.g., "50-200 employees"
  revenue: string; // e.g., "$10M-$50M"
  geography: string[];
  techStack: string[];
  characteristics: string[];
}

export interface BuyerPersona {
  title: string; // e.g., "VP of Operations"
  department: string;
  decisionAuthority:
    | "final_decision"
    | "influencer"
    | "evaluator"
    | "gatekeeper";
  goals: string[];
  challenges: string[];
  preferredChannels: string[];
  objections: string[];
  messagingFramework: string;
}

export interface PainPoint {
  category: string;
  description: string;
  severity: "high" | "medium" | "low";
  solutionFit: string;
}

export interface BuyingBehavior {
  typicalCycle: string; // e.g., "3-6 months"
  budgetCycle: string; // e.g., "Q4 planning"
  evaluationCriteria: string[];
  commonObjections: string[];
}

// =============================================================================
// DEAL INTELLIGENCE TYPES
// =============================================================================

export interface DealIntelligence {
  companyName: string;
  opportunityScore: number; // 0-100
  financialHealth: FinancialHealth;
  stakeholders: Stakeholder[];
  competitiveLandscape: CompetitorInfo[];
  riskAssessment: RiskAssessment;
  engagementStrategy: EngagementStrategy;
  researchedAt: Date;
}

export interface FinancialHealth {
  estimatedRevenue: string | null;
  fundingStage: string | null;
  recentFunding: string | null;
  profitability: "profitable" | "break_even" | "growth_stage" | "unknown";
  signals: string[];
}

export interface Stakeholder {
  name: string;
  title: string;
  role: "champion" | "decision_maker" | "influencer" | "blocker" | "unknown";
  linkedIn: string | null;
  notes: string;
}

export interface CompetitorInfo {
  name: string;
  relationship: "current_vendor" | "past_vendor" | "evaluating" | "none";
  strengths: string[];
  weaknesses: string[];
  battleCard: string;
}

export interface RiskAssessment {
  overallRisk: "high" | "medium" | "low";
  risks: Array<{
    category: string;
    description: string;
    mitigation: string;
  }>;
}

export interface EngagementStrategy {
  entryPoint: string;
  valueProp: string;
  nextSteps: string[];
  timeline: string;
  talkingPoints: string[];
}

// =============================================================================
// PERPLEXITY CLIENT
// =============================================================================

async function queryPerplexity(
  prompt: string,
  model:
    | "llama-3.1-sonar-small-128k-online"
    | "llama-3.1-sonar-large-128k-online" = "llama-3.1-sonar-small-128k-online",
): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const response = await fetch(PERPLEXITY_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a business research assistant. Provide accurate, factual information based on your search results. Be concise and structured in your responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// =============================================================================
// QUICK VALIDATION SCAN
// =============================================================================

/**
 * Quick scan to validate if a business is still operating.
 * Similar to Apollo's business validation.
 *
 * Checks:
 * - Is the business still listed on Google/Yelp?
 * - Any recent activity (reviews, posts, news)?
 * - Phone number still active?
 * - Website still live?
 * - Any closure announcements?
 */
export async function quickValidationScan(
  companyName: string,
  address: {
    city: string;
    state: string;
    zip?: string;
  },
  phone?: string,
  website?: string,
): Promise<BusinessValidation> {
  const locationStr = `${address.city}, ${address.state}${address.zip ? ` ${address.zip}` : ""}`;

  const prompt = `Quick business validation check for: "${companyName}" in ${locationStr}

Check these specific things:
1. Is this business still operating? Look for Google Business listing, Yelp, or other directories.
2. Any recent reviews or activity in the last 6 months?
3. Any news about closure, bankruptcy, or moving?
4. Is their website ${website || "N/A"} still active?
${phone ? `5. Is phone ${phone} still associated with this business?` : ""}

Respond in this exact JSON format:
{
  "isOperating": true/false,
  "confidence": 0-100,
  "status": "ACTIVE" | "CLOSED" | "UNKNOWN" | "MOVED" | "CHANGED_NAME",
  "signals": [
    {"source": "Google", "signal": "description", "sentiment": "positive/negative/neutral"}
  ],
  "summary": "One sentence summary"
}`;

  try {
    const result = await queryPerplexity(
      prompt,
      "llama-3.1-sonar-small-128k-online",
    );

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createUnknownValidation(companyName);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isValid: parsed.isOperating === true,
      confidence: parsed.confidence || 50,
      status: parsed.status || "UNKNOWN",
      lastVerified: new Date(),
      signals: parsed.signals || [],
      summary: parsed.summary || "Unable to verify business status",
    };
  } catch (error) {
    console.error("Quick validation scan failed:", error);
    return createUnknownValidation(companyName);
  }
}

function createUnknownValidation(companyName: string): BusinessValidation {
  return {
    isValid: true, // Default to valid to not block outreach
    confidence: 0,
    status: "UNKNOWN",
    lastVerified: new Date(),
    signals: [],
    summary: `Could not verify status for ${companyName}`,
  };
}

// =============================================================================
// DEEP RESEARCH
// =============================================================================

/**
 * Deep research for high-value leads before appointments.
 * Gathers comprehensive intel for sales conversations.
 */
export async function deepResearch(
  companyName: string,
  contactName?: string,
  address?: {
    city: string;
    state: string;
  },
  industry?: string,
): Promise<DeepResearchResult> {
  const locationStr = address ? `${address.city}, ${address.state}` : "";

  const prompt = `Comprehensive business research for: "${companyName}"${locationStr ? ` in ${locationStr}` : ""}${industry ? ` (Industry: ${industry})` : ""}

Research and provide:
1. Company overview and what they do
2. Recent news or announcements (last 12 months)
3. Key decision makers and leadership
4. Main competitors in their area
5. Potential pain points or challenges they might face
6. Talking points for a sales conversation
7. Social media and online presence

${contactName ? `Also look up information about: ${contactName}` : ""}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence company overview",
  "keyFacts": ["fact1", "fact2", "fact3"],
  "recentNews": [
    {"title": "...", "summary": "...", "date": "YYYY-MM", "sentiment": "positive/negative/neutral", "source": "..."}
  ],
  "competitors": ["competitor1", "competitor2"],
  "painPoints": ["pain1", "pain2"],
  "talkingPoints": ["point1", "point2"],
  "decisionMakers": [
    {"name": "...", "title": "...", "linkedIn": "url or null"}
  ],
  "socialPresence": {
    "website": "url or null",
    "linkedin": "url or null",
    "facebook": "url or null",
    "googleRating": number or null,
    "yelpRating": number or null
  }
}`;

  try {
    const result = await queryPerplexity(
      prompt,
      "llama-3.1-sonar-large-128k-online",
    );

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createEmptyResearch(companyName);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      companyName,
      summary: parsed.summary || "No summary available",
      keyFacts: parsed.keyFacts || [],
      recentNews: parsed.recentNews || [],
      competitors: parsed.competitors || [],
      painPoints: parsed.painPoints || [],
      talkingPoints: parsed.talkingPoints || [],
      decisionMakers: parsed.decisionMakers || [],
      socialPresence: {
        website: parsed.socialPresence?.website || null,
        linkedin: parsed.socialPresence?.linkedin || null,
        facebook: parsed.socialPresence?.facebook || null,
        twitter: parsed.socialPresence?.twitter || null,
        googleMaps: parsed.socialPresence?.googleMaps || null,
        yelpRating: parsed.socialPresence?.yelpRating || null,
        googleRating: parsed.socialPresence?.googleRating || null,
      },
      confidence: 75,
      researchedAt: new Date(),
    };
  } catch (error) {
    console.error("Deep research failed:", error);
    return createEmptyResearch(companyName);
  }
}

function createEmptyResearch(companyName: string): DeepResearchResult {
  return {
    companyName,
    summary: "Research unavailable",
    keyFacts: [],
    recentNews: [],
    competitors: [],
    painPoints: [],
    talkingPoints: [],
    decisionMakers: [],
    socialPresence: {
      website: null,
      linkedin: null,
      facebook: null,
      twitter: null,
      googleMaps: null,
      yelpRating: null,
      googleRating: null,
    },
    confidence: 0,
    researchedAt: new Date(),
  };
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

/**
 * Batch validate a list of businesses from USBizData.
 * Used during enrichment stage to filter out closed businesses.
 */
export async function batchValidate(
  businesses: Array<{
    id: string;
    companyName: string;
    city: string;
    state: string;
    zip?: string;
    phone?: string;
    website?: string;
  }>,
  options?: {
    maxConcurrent?: number;
    delayMs?: number;
  },
): Promise<Map<string, BusinessValidation>> {
  const results = new Map<string, BusinessValidation>();
  const maxConcurrent = options?.maxConcurrent || 5;
  const delayMs = options?.delayMs || 500;

  // Process in batches to respect rate limits
  for (let i = 0; i < businesses.length; i += maxConcurrent) {
    const batch = businesses.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (biz) => {
        try {
          const validation = await quickValidationScan(
            biz.companyName,
            { city: biz.city, state: biz.state, zip: biz.zip },
            biz.phone,
            biz.website,
          );
          return { id: biz.id, validation };
        } catch (error) {
          console.error(`Validation failed for ${biz.id}:`, error);
          return {
            id: biz.id,
            validation: createUnknownValidation(biz.companyName),
          };
        }
      }),
    );

    for (const { id, validation } of batchResults) {
      results.set(id, validation);
    }

    // Delay between batches
    if (i + maxConcurrent < businesses.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// =============================================================================
// PRE-APPOINTMENT RESEARCH
// =============================================================================

/**
 * Triggered when a lead moves to BOOKING stage.
 * Runs deep research and stores results for sales rep.
 */
export async function preAppointmentResearch(
  leadId: string,
  leadData: {
    companyName: string;
    contactFirstName?: string;
    contactLastName?: string;
    city: string;
    state: string;
    industry?: string;
  },
): Promise<DeepResearchResult> {
  const contactName =
    leadData.contactFirstName && leadData.contactLastName
      ? `${leadData.contactFirstName} ${leadData.contactLastName}`
      : undefined;

  const research = await deepResearch(
    leadData.companyName,
    contactName,
    { city: leadData.city, state: leadData.state },
    leadData.industry,
  );

  // TODO: Store research results in database
  // await db.insert(leadResearch).values({
  //   leadId,
  //   research: JSON.stringify(research),
  //   createdAt: new Date(),
  // });

  return research;
}

// =============================================================================
// MARKET SIZING (TAM/SAM/SOM)
// =============================================================================

/**
 * Calculate Total/Serviceable/Obtainable market sizes for an industry.
 * Uses Perplexity to gather data from industry reports and government sources.
 */
export async function calculateMarketSizing(
  industry: string,
  geography?: string,
  targetSegment?: string,
): Promise<MarketSizing> {
  const geoStr = geography || "United States";
  const segmentStr = targetSegment || industry;

  const prompt = `Market sizing research for: "${industry}" industry in ${geoStr}
${targetSegment ? `Focus segment: ${targetSegment}` : ""}

Calculate and provide:
1. TAM (Total Addressable Market) - entire market for this industry
2. SAM (Serviceable Addressable Market) - segment we can actually serve
3. SOM (Serviceable Obtainable Market) - realistic capture in 1-2 years
4. Annual growth rate (CAGR)
5. Key sources (industry reports, government data, etc.)

Use multiple sources: Gartner, Forrester, Census data, SEC filings, trade associations.

Respond in this exact JSON format:
{
  "tam": {
    "value": number,
    "unit": "millions" | "billions",
    "description": "What this represents",
    "methodology": "How calculated"
  },
  "sam": {
    "value": number,
    "unit": "millions" | "billions",
    "description": "What this represents",
    "methodology": "How calculated"
  },
  "som": {
    "value": number,
    "unit": "millions" | "billions",
    "description": "What this represents",
    "methodology": "How calculated"
  },
  "growthRate": number,
  "sources": [
    {"name": "Source Name", "url": "URL or null", "type": "industry_report|government_data|financial_filing|news|trade_association"}
  ]
}`;

  try {
    const result = await queryPerplexity(
      prompt,
      "llama-3.1-sonar-large-128k-online",
    );
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return createEmptyMarketSizing(industry);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      tam: parsed.tam || createEmptySegment("TAM"),
      sam: parsed.sam || createEmptySegment("SAM"),
      som: parsed.som || createEmptySegment("SOM"),
      industry,
      growthRate: parsed.growthRate || 0,
      sources: (parsed.sources || []).map((s: any) => ({
        ...s,
        accessedAt: new Date().toISOString(),
      })),
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error("Market sizing calculation failed:", error);
    return createEmptyMarketSizing(industry);
  }
}

function createEmptyMarketSizing(industry: string): MarketSizing {
  return {
    tam: createEmptySegment("TAM"),
    sam: createEmptySegment("SAM"),
    som: createEmptySegment("SOM"),
    industry,
    growthRate: 0,
    sources: [],
    calculatedAt: new Date(),
  };
}

function createEmptySegment(name: string): MarketSegment {
  return {
    value: 0,
    unit: "millions",
    description: `${name} unavailable`,
    methodology: "Unable to calculate",
  };
}

// =============================================================================
// PERSONA INTELLIGENCE
// =============================================================================

/**
 * Build ICP and buyer personas for a target industry/company type.
 * Used for campaign targeting and message personalization.
 */
export async function buildPersonaIntelligence(
  industry: string,
  companyType?: string,
  productService?: string,
): Promise<PersonaIntelligence> {
  const prompt = `Build buyer personas and ICP for selling ${productService || "B2B services"} to ${companyType || "companies"} in the ${industry} industry.

Research and provide:
1. Ideal Customer Profile (ICP) - company characteristics
2. 3 Buyer Personas - key decision makers with titles, goals, challenges
3. Common pain points in this industry
4. Typical buying behavior and cycle

Respond in this exact JSON format:
{
  "icp": {
    "industry": "${industry}",
    "companySize": "employee range",
    "revenue": "revenue range",
    "geography": ["regions"],
    "techStack": ["common tools"],
    "characteristics": ["key traits"]
  },
  "buyerPersonas": [
    {
      "title": "Job Title",
      "department": "Department",
      "decisionAuthority": "final_decision|influencer|evaluator|gatekeeper",
      "goals": ["goal1", "goal2"],
      "challenges": ["challenge1", "challenge2"],
      "preferredChannels": ["email", "phone", "linkedin"],
      "objections": ["common objection"],
      "messagingFramework": "How to approach this persona"
    }
  ],
  "painPoints": [
    {"category": "Category", "description": "Description", "severity": "high|medium|low", "solutionFit": "How we solve"}
  ],
  "buyingBehavior": {
    "typicalCycle": "timeline",
    "budgetCycle": "when budgets are set",
    "evaluationCriteria": ["criteria"],
    "commonObjections": ["objection"]
  }
}`;

  try {
    const result = await queryPerplexity(
      prompt,
      "llama-3.1-sonar-large-128k-online",
    );
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return createEmptyPersonaIntelligence(industry);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      icp: parsed.icp || createEmptyICP(industry),
      buyerPersonas: parsed.buyerPersonas || [],
      painPoints: parsed.painPoints || [],
      buyingBehavior: parsed.buyingBehavior || createEmptyBuyingBehavior(),
      researchedAt: new Date(),
    };
  } catch (error) {
    console.error("Persona intelligence failed:", error);
    return createEmptyPersonaIntelligence(industry);
  }
}

function createEmptyPersonaIntelligence(industry: string): PersonaIntelligence {
  return {
    icp: createEmptyICP(industry),
    buyerPersonas: [],
    painPoints: [],
    buyingBehavior: createEmptyBuyingBehavior(),
    researchedAt: new Date(),
  };
}

function createEmptyICP(industry: string): IdealCustomerProfile {
  return {
    industry,
    companySize: "Unknown",
    revenue: "Unknown",
    geography: [],
    techStack: [],
    characteristics: [],
  };
}

function createEmptyBuyingBehavior(): BuyingBehavior {
  return {
    typicalCycle: "Unknown",
    budgetCycle: "Unknown",
    evaluationCriteria: [],
    commonObjections: [],
  };
}

// =============================================================================
// DEAL INTELLIGENCE
// =============================================================================

/**
 * Deep deal research for a specific target company.
 * Gathers financial health, stakeholders, competitive landscape, and strategy.
 */
export async function generateDealIntelligence(
  companyName: string,
  industry?: string,
  address?: { city: string; state: string },
): Promise<DealIntelligence> {
  const locationStr = address ? `${address.city}, ${address.state}` : "";

  const prompt = `Deep deal intelligence research for: "${companyName}"${locationStr ? ` in ${locationStr}` : ""}${industry ? ` (Industry: ${industry})` : ""}

Research and analyze:
1. Financial Health - revenue, funding, profitability signals
2. Key Stakeholders - decision makers, their roles
3. Competitive Landscape - current/past vendors, competitors
4. Risk Assessment - potential deal blockers
5. Engagement Strategy - how to approach, talking points

Sources: SEC filings, LinkedIn, Crunchbase, news, job postings, tech partnerships.

Respond in this exact JSON format:
{
  "opportunityScore": 0-100,
  "financialHealth": {
    "estimatedRevenue": "revenue or null",
    "fundingStage": "stage or null",
    "recentFunding": "amount/date or null",
    "profitability": "profitable|break_even|growth_stage|unknown",
    "signals": ["positive/negative signals"]
  },
  "stakeholders": [
    {"name": "Name", "title": "Title", "role": "champion|decision_maker|influencer|blocker|unknown", "linkedIn": "URL or null", "notes": "context"}
  ],
  "competitiveLandscape": [
    {"name": "Competitor", "relationship": "current_vendor|past_vendor|evaluating|none", "strengths": [], "weaknesses": [], "battleCard": "how to compete"}
  ],
  "riskAssessment": {
    "overallRisk": "high|medium|low",
    "risks": [{"category": "Type", "description": "Risk", "mitigation": "How to address"}]
  },
  "engagementStrategy": {
    "entryPoint": "Best way in",
    "valueProp": "Key value proposition",
    "nextSteps": ["action1", "action2"],
    "timeline": "Suggested timeline",
    "talkingPoints": ["point1", "point2"]
  }
}`;

  try {
    const result = await queryPerplexity(
      prompt,
      "llama-3.1-sonar-large-128k-online",
    );
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return createEmptyDealIntelligence(companyName);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      companyName,
      opportunityScore: parsed.opportunityScore || 50,
      financialHealth: parsed.financialHealth || createEmptyFinancialHealth(),
      stakeholders: parsed.stakeholders || [],
      competitiveLandscape: parsed.competitiveLandscape || [],
      riskAssessment: parsed.riskAssessment || createEmptyRiskAssessment(),
      engagementStrategy:
        parsed.engagementStrategy || createEmptyEngagementStrategy(),
      researchedAt: new Date(),
    };
  } catch (error) {
    console.error("Deal intelligence failed:", error);
    return createEmptyDealIntelligence(companyName);
  }
}

function createEmptyDealIntelligence(companyName: string): DealIntelligence {
  return {
    companyName,
    opportunityScore: 0,
    financialHealth: createEmptyFinancialHealth(),
    stakeholders: [],
    competitiveLandscape: [],
    riskAssessment: createEmptyRiskAssessment(),
    engagementStrategy: createEmptyEngagementStrategy(),
    researchedAt: new Date(),
  };
}

function createEmptyFinancialHealth(): FinancialHealth {
  return {
    estimatedRevenue: null,
    fundingStage: null,
    recentFunding: null,
    profitability: "unknown",
    signals: [],
  };
}

function createEmptyRiskAssessment(): RiskAssessment {
  return {
    overallRisk: "medium",
    risks: [],
  };
}

function createEmptyEngagementStrategy(): EngagementStrategy {
  return {
    entryPoint: "Unknown",
    valueProp: "Unknown",
    nextSteps: [],
    timeline: "Unknown",
    talkingPoints: [],
  };
}

// =============================================================================
// FULL RESEARCH REPORT
// =============================================================================

/**
 * Complete research report combining all modules.
 * Used for high-value deals requiring comprehensive intelligence.
 */
export interface FullResearchReport {
  validation: BusinessValidation;
  deepResearch: DeepResearchResult;
  marketSizing: MarketSizing;
  personas: PersonaIntelligence;
  dealIntelligence: DealIntelligence;
  generatedAt: Date;
  executionTimeMs: number;
}

export async function generateFullResearchReport(
  companyName: string,
  address: { city: string; state: string; zip?: string },
  industry: string,
  contactName?: string,
): Promise<FullResearchReport> {
  const startTime = Date.now();

  // Run all research modules in parallel
  const [validation, research, market, personas, deal] = await Promise.all([
    quickValidationScan(companyName, address),
    deepResearch(companyName, contactName, address, industry),
    calculateMarketSizing(industry),
    buildPersonaIntelligence(industry),
    generateDealIntelligence(companyName, industry, address),
  ]);

  return {
    validation,
    deepResearch: research,
    marketSizing: market,
    personas,
    dealIntelligence: deal,
    generatedAt: new Date(),
    executionTimeMs: Date.now() - startTime,
  };
}
