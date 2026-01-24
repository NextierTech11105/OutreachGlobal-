---
name: neva-research-copilot
description: Research copilot providing business intelligence and context for outreach campaigns
---

# NEVA Research Copilot

## Overview
NEVA is an AI-powered research copilot that provides business intelligence and contextual insights for outreach campaigns. It serves as an advisory system that enhances lead qualification and personalization without overriding core LUCI research data. NEVA uses Perplexity API for comprehensive business research, evaluates confidence levels, and recommends optimal engagement strategies.

## Key Features
- Business intelligence research using Perplexity API
- Personalization recommendations for outreach
- Discovery call question preparation
- Confidence and risk assessment
- Worker recommendation (GIANNA/CATHY/SABRINA)
- Advisory-only architecture (never overrides LUCI)
- Multi-tenant research caching
- Real-time context enrichment

## Code References
- Backend Module: `apps/api/src/app/neva/neva.module.ts` (planned)
- Backend Service: `apps/api/src/app/neva/neva.service.ts` (planned)
- Backend Controller: `apps/api/src/app/neva/neva.controller.ts` (planned)
- AI Orchestrator Integration: `apps/api/src/app/ai-orchestrator/` - Perplexity API access
- Research Cache: `apps/api/src/app/neva/entities/research-cache.entity.ts` (planned)
- Confidence Engine: `apps/api/src/app/neva/services/confidence-engine.service.ts` (planned)

## Current State

### What Already Exists
- **AI Orchestrator**: Perplexity integration for research capabilities
- **LUCI Research Agent**: Core data enrichment (Tracerfy, Trestle)
- **Lead Management**: Basic lead data structures
- **Multi-tenant Architecture**: Team isolation patterns

### What Still Needs to be Built
- NEVA research service with Perplexity integration
- Research result caching and optimization
- Confidence scoring algorithms
- Worker recommendation engine
- Discovery question generation
- Risk assessment framework

## Research Capabilities

### Business Intelligence Research
```typescript
interface BusinessResearch {
  company: {
    overview: string;
    industry: string;
    size: string;
    funding: string;
    recentNews: string[];
    competitors: string[];
  };
  leadership: {
    keyExecutives: Executive[];
    organizationalStructure: string;
    decisionMakers: DecisionMaker[];
  };
  market: {
    position: string;
    challenges: string[];
    opportunities: string[];
    trends: string[];
  };
  technology: {
    stack: string[];
    digitalPresence: DigitalPresence;
    innovation: string[];
  };
}
```

### Personalization Recommendations
```typescript
interface PersonalizationProfile {
  communicationStyle: 'formal' | 'casual' | 'technical' | 'executive';
  keyPainPoints: string[];
  valuePropositions: string[];
  industryContext: string;
  competitivePositioning: string;
  recommendedTone: PersonalityTrait[];
  triggerEvents: string[];
  optimalTiming: TimingRecommendation;
}
```

### Confidence & Risk Assessment
```typescript
interface ConfidenceAnalysis {
  overallConfidence: number; // 0-1
  dataFreshness: number; // days since last update
  sourceReliability: number; // 0-1
  completeness: number; // 0-1
  riskFlags: RiskFlag[];
  recommendations: string[];
}

enum RiskFlag {
  STALE_DATA = 'stale_data',
  LIMITED_SOURCES = 'limited_sources',
  CONTRADICTORY_INFO = 'contradictory_info',
  HIGHLY_COMPETITIVE = 'highly_competitive',
  ECONOMIC_UNCERTAINTY = 'economic_uncertainty',
  REGULATORY_RISKS = 'regulatory_risks'
}
```

## Implementation Steps

### 1. Create NEVA Module Structure
```typescript
apps/api/src/app/neva/
├── neva.module.ts
├── neva.service.ts
├── neva.controller.ts
├── neva.resolver.ts
├── dto/
│   ├── research-request.dto.ts
│   ├── enrichment-response.dto.ts
│   └── discovery-prep.dto.ts
├── entities/
│   ├── research-cache.entity.ts
│   ├── confidence-score.entity.ts
│   └── worker-recommendation.entity.ts
├── services/
│   ├── research-engine.service.ts
│   ├── confidence-engine.service.ts
│   ├── personalization-engine.service.ts
│   └── worker-recommendation.service.ts
└── strategies/
    ├── perplexity-research.strategy.ts
    ├── confidence-calculation.strategy.ts
    └── recommendation-engine.strategy.ts
```

### 2. Research Engine Service
```typescript
@Injectable()
export class ResearchEngineService {
  constructor(
    private aiOrchestrator: AiOrchestratorService,
    private cacheManager: CacheManager,
    private confidenceEngine: ConfidenceEngineService
  ) {}

  async enrichLead(teamId: string, leadId: string, context: EnrichmentContext): Promise<EnrichmentResult> {
    // Check cache first
    const cached = await this.getCachedResearch(teamId, leadId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Perform research using Perplexity
    const research = await this.performResearch(teamId, leadId, context);

    // Calculate confidence
    const confidence = await this.confidenceEngine.analyzeConfidence(research);

    // Cache results
    await this.cacheResearch(teamId, leadId, research, confidence);

    return {
      research,
      confidence,
      recommendations: await this.generateRecommendations(research, confidence),
      riskFlags: confidence.riskFlags
    };
  }

  private async performResearch(teamId: string, leadId: string, context: EnrichmentContext): Promise<BusinessResearch> {
    const prompt = this.buildResearchPrompt(context);

    const response = await this.aiOrchestrator.queryPerplexity({
      prompt,
      teamId,
      context: {
        leadId,
        company: context.company,
        industry: context.industry
      }
    });

    return this.parseResearchResponse(response);
  }

  private buildResearchPrompt(context: EnrichmentContext): string {
    return `
      Research the following company and provide comprehensive business intelligence:

      Company: ${context.company}
      Industry: ${context.industry}
      Website: ${context.website || 'Unknown'}
      Key Personnel: ${context.keyPersonnel?.join(', ') || 'Unknown'}

      Please provide:
      1. Company overview and current business focus
      2. Industry position and competitive landscape
      3. Key leadership and decision makers
      4. Recent news and developments
      5. Technology stack and digital presence
      6. Market challenges and opportunities
      7. Funding status and financial health (if public)

      Focus on actionable insights for sales outreach and business development.
    `;
  }
}
```

### 3. Personalization Engine Service
```typescript
@Injectable()
export class PersonalizationEngineService {
  async generatePersonalization(teamId: string, leadId: string, research: BusinessResearch): Promise<PersonalizationProfile> {
    // Analyze communication preferences
    const communicationStyle = await this.analyzeCommunicationStyle(research);

    // Identify key pain points
    const painPoints = await this.extractPainPoints(research);

    // Generate value propositions
    const valueProps = await this.createValuePropositions(research, painPoints);

    // Determine optimal engagement strategy
    const strategy = await this.recommendEngagementStrategy(research, communicationStyle);

    return {
      communicationStyle,
      keyPainPoints: painPoints,
      valuePropositions: valueProps,
      industryContext: research.market.position,
      competitivePositioning: this.generatePositioning(research),
      recommendedTone: this.mapToPersonalityTraits(communicationStyle),
      triggerEvents: this.identifyTriggerEvents(research),
      optimalTiming: this.calculateOptimalTiming(research)
    };
  }

  private async analyzeCommunicationStyle(research: BusinessResearch): Promise<CommunicationStyle> {
    // Analyze website, communications, and industry norms
    const signals = {
      formal: this.detectFormalSignals(research),
      casual: this.detectCasualSignals(research),
      technical: this.detectTechnicalSignals(research),
      executive: this.detectExecutiveSignals(research)
    };

    return this.determineDominantStyle(signals);
  }
}
```

### 4. Worker Recommendation Engine
```typescript
@Injectable()
export class WorkerRecommendationService {
  async recommendWorker(teamId: string, leadId: string, research: BusinessResearch, personalization: PersonalizationProfile): Promise<WorkerRecommendation> {
    // Analyze lead characteristics
    const leadProfile = await this.analyzeLeadProfile(research, personalization);

    // Evaluate worker capabilities
    const workerCapabilities = {
      gianna: await this.evaluateGiannaFit(leadProfile),
      cathy: await this.evaluateCathyFit(leadProfile),
      sabrina: await this.evaluateSabrinaFit(leadProfile)
    };

    // Calculate recommendation scores
    const scores = await this.calculateRecommendationScores(workerCapabilities, leadProfile);

    // Select optimal worker
    const recommended = this.selectOptimalWorker(scores);

    return {
      recommendedWorker: recommended.worker,
      confidence: recommended.confidence,
      reasoning: recommended.reasoning,
      alternatives: this.rankAlternatives(scores),
      engagementStrategy: recommended.strategy
    };
  }

  private async evaluateGiannaFit(leadProfile: LeadProfile): Promise<WorkerFit> {
    // GIANNA: AI SDR for outbound campaigns
    return {
      fitScore: this.calculateGiannaScore(leadProfile),
      strengths: ['Cold outreach', 'Personality-driven messaging', 'Multi-channel campaigns'],
      considerations: ['Requires good data quality', 'Best for early-stage outreach']
    };
  }

  private async evaluateCathyFit(leadProfile: LeadProfile): Promise<WorkerFit> {
    // CATHY: Customer support agent (planned)
    return {
      fitScore: this.calculateCathyScore(leadProfile),
      strengths: ['Support interactions', 'Relationship building', 'Complex conversations'],
      considerations: ['Requires established relationship', 'Higher-touch engagement']
    };
  }

  private async evaluateSabrinaFit(leadProfile: LeadProfile): Promise<WorkerFit> {
    // SABRINA: Sales intelligence agent
    return {
      fitScore: this.calculateSabrinaScore(leadProfile),
      strengths: ['Data-driven insights', 'Qualification', 'Intelligence gathering'],
      considerations: ['Focus on research phase', 'Pre-engagement optimization']
    };
  }
}
```

### 5. Discovery Preparation Service
```typescript
@Injectable()
export class DiscoveryPreparationService {
  async prepareDiscoveryCall(teamId: string, leadId: string, research: BusinessResearch, personalization: PersonalizationProfile): Promise<DiscoveryPreparation> {
    // Generate strategic questions
    const strategicQuestions = await this.generateStrategicQuestions(research, personalization);

    // Create conversation roadmap
    const conversationRoadmap = await this.buildConversationRoadmap(research, personalization);

    // Prepare objection responses
    const objectionResponses = await this.prepareObjectionHandling(research);

    // Calculate optimal call timing
    const timingRecommendation = await this.recommendCallTiming(personalization);

    return {
      strategicQuestions,
      conversationRoadmap,
      objectionResponses,
      timingRecommendation,
      keyInsights: this.extractKeyInsights(research),
      preparationNotes: this.generatePreparationNotes(personalization)
    };
  }

  private async generateStrategicQuestions(research: BusinessResearch, personalization: PersonalizationProfile): Promise<StrategicQuestion[]> {
    const questions = [];

    // Business-focused questions
    questions.push({
      category: 'business',
      question: `How is ${research.company.overview.split('.')[0]} performing in the current ${research.market.position} market?`,
      purpose: 'Understand current business health',
      followUp: this.generateFollowUps('business', research)
    });

    // Pain point questions
    for (const painPoint of personalization.keyPainPoints.slice(0, 2)) {
      questions.push({
        category: 'pain_points',
        question: `How is ${painPoint.toLowerCase()} impacting your operations?`,
        purpose: 'Identify specific challenges',
        followUp: this.generateFollowUps('pain_points', research)
      });
    }

    // Strategic questions
    questions.push({
      category: 'strategy',
      question: `What are your priorities for ${research.company.industry} innovation over the next 12-24 months?`,
      purpose: 'Understand strategic direction',
      followUp: this.generateFollowUps('strategy', research)
    });

    return questions;
  }
}
```

### 6. Confidence Engine Service
```typescript
@Injectable()
export class ConfidenceEngineService {
  async analyzeConfidence(research: BusinessResearch, context: ResearchContext): Promise<ConfidenceAnalysis> {
    // Data freshness analysis
    const freshness = this.calculateDataFreshness(research, context);

    // Source reliability assessment
    const reliability = this.assessSourceReliability(research);

    // Completeness evaluation
    const completeness = this.evaluateCompleteness(research);

    // Risk flag identification
    const riskFlags = this.identifyRiskFlags(research, context);

    // Overall confidence calculation
    const overallConfidence = this.calculateOverallConfidence({
      freshness,
      reliability,
      completeness,
      riskCount: riskFlags.length
    });

    return {
      overallConfidence,
      dataFreshness: freshness,
      sourceReliability: reliability,
      completeness,
      riskFlags,
      recommendations: this.generateConfidenceRecommendations(overallConfidence, riskFlags)
    };
  }

  private calculateDataFreshness(research: BusinessResearch, context: ResearchContext): number {
    const now = Date.now();
    const researchDate = context.researchTimestamp || now;

    // Data becomes less fresh over time
    const daysOld = (now - researchDate) / (1000 * 60 * 60 * 24);

    // Exponential decay: 100% fresh for 0 days, 50% fresh after 30 days
    return Math.max(0, Math.exp(-daysOld / 30));
  }

  private assessSourceReliability(research: BusinessResearch): number {
    // Assess reliability based on source diversity and quality
    let reliability = 0.5; // Base reliability

    // Increase for multiple sources
    if (research.company.recentNews && research.company.recentNews.length > 0) {
      reliability += 0.1;
    }

    // Increase for leadership information
    if (research.leadership.keyExecutives && research.leadership.keyExecutives.length > 0) {
      reliability += 0.15;
    }

    // Increase for market analysis
    if (research.market.challenges && research.market.challenges.length > 0) {
      reliability += 0.1;
    }

    // Increase for technology insights
    if (research.technology.stack && research.technology.stack.length > 0) {
      reliability += 0.1;
    }

    return Math.min(1, reliability);
  }

  private identifyRiskFlags(research: BusinessResearch, context: ResearchContext): RiskFlag[] {
    const flags = [];

    // Check for stale data
    if (context.daysSinceLastUpdate > 90) {
      flags.push(RiskFlag.STALE_DATA);
    }

    // Check for limited sources
    if (!research.company.recentNews || research.company.recentNews.length < 2) {
      flags.push(RiskFlag.LIMITED_SOURCES);
    }

    // Check for contradictory information
    if (this.hasContradictoryInfo(research)) {
      flags.push(RiskFlag.CONTRADICTORY_INFO);
    }

    // Industry-specific risks
    if (this.isHighlyCompetitiveIndustry(research.market)) {
      flags.push(RiskFlag.HIGHLY_COMPETITIVE);
    }

    return flags;
  }
}
```

## API Endpoints

### Research Enrichment
```typescript
@Post('enrich')
async enrichLead(@Body() request: EnrichmentRequest): Promise<EnrichmentResponse> {
  return this.nevaService.enrichLead(request.teamId, request.leadId, request.context);
}
```

### Context Retrieval
```typescript
@Get('context/:leadId')
async getContext(@Param('teamId') teamId: string, @Param('leadId') leadId: string): Promise<ContextResponse> {
  return this.nevaService.getContext(teamId, leadId);
}
```

### Discovery Preparation
```typescript
@Post('prepare-discovery')
async prepareDiscovery(@Body() request: DiscoveryRequest): Promise<DiscoveryResponse> {
  return this.nevaService.prepareDiscoveryCall(request.teamId, request.leadId);
}
```

### Worker Recommendation
```typescript
@Post('recommend-worker')
async recommendWorker(@Body() request: WorkerRequest): Promise<WorkerResponse> {
  return this.nevaService.recommendWorker(request.teamId, request.leadId);
}
```

## Integration Points

### With LUCI Research Agent
- **Advisory Only**: NEVA enhances LUCI data without overriding
- **Complementary Research**: Perplexity provides business context, LUCI provides contact data
- **Confidence Integration**: Combined confidence scoring

### With GIANNA SDR Agent
- **Worker Recommendation**: Suggests GIANNA for cold outreach
- **Personalization Data**: Provides personality insights for messaging
- **Context Enhancement**: Business intelligence for conversation flows

### With ML Intelligence Engine
- **Confidence Scoring**: ML-powered confidence analysis
- **Pattern Recognition**: Learns from successful research patterns
- **Recommendation Optimization**: Data-driven worker recommendations

### With Contextual Orchestrator
- **Research Orchestration**: Coordinates research workflows
- **Multi-step Analysis**: Manages complex research pipelines
- **Result Aggregation**: Combines multiple research sources

## Dependencies

### Prerequisite Skills
- ai-orchestrator - For Perplexity API integration and AI processing
- luci-research-agent - For core lead data (NEVA is advisory only)
- ml-intelligence-engine - For confidence scoring and pattern analysis

### Existing Services Used
- apps/api/src/app/ai-orchestrator/ - Perplexity research capabilities
- apps/api/src/app/luci/ - Core research data (advisory enhancement)
- apps/api/src/database/schema/ml-predictions.schema.ts - ML-powered analysis

### External APIs Required
- Perplexity API - Business research and intelligence gathering

## Testing
- Research accuracy validation against known companies
- Confidence scoring calibration
- Worker recommendation success rates
- Discovery question effectiveness
- Multi-tenant isolation testing
- Cache performance and hit rates

## Notes
- NEVA is strictly advisory - never overrides LUCI research data
- Research results are cached with configurable TTL
- Confidence scoring helps prioritize high-quality leads
- Worker recommendations optimize engagement strategy
- Risk flags help identify potentially problematic leads
- All research is multi-tenant isolated and GDPR compliant