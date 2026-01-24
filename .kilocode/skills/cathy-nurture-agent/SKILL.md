---
name: cathy-customer-support
description: AI-powered customer support agent for complex conversations and relationship building
---

# Cathy Nudger Agent

## Overview
CATHY is a conversational AI nudger that maintains persistent, human-like follow-up conversations with leads. Mapped 1:1 with real human Cathy for oversight, CATHY specializes in gentle relationship nurturing, timely check-ins, and strategic conversation re-engagement. Unlike GIANNA's aggressive SDR approach, CATHY focuses on building rapport through consistent, empathetic communication with human-in-the-loop supervision.

## Key Features
- Persistent follow-up conversations with human-like rapport
- Strategic check-ins and relationship nurturing
- Conversation re-engagement for stalled leads
- Human-in-the-loop oversight (1:1 mapping with real Cathy)
- Gentle nudging without being pushy
- Context-aware conversation continuation
- Multi-channel follow-up coordination
- Lead warming and relationship building
- Escalation to human Cathy for complex situations

## Code References
- Backend Module: `apps/api/src/app/cathy/cathy.module.ts` (planned)
- Backend Service: `apps/api/src/app/cathy/cathy.service.ts` (planned)
- Backend Controller: `apps/api/src/app/cathy/cathy.controller.ts` (planned)
- Frontend Service: `apps/front/src/lib/gianna/gianna-service.ts` (shared personality system)
- Knowledge Base: `apps/front/src/lib/gianna/knowledge-base.ts` (shared response strategies)
- Conversation Flows: `apps/front/src/lib/gianna/conversation-flows.ts` (shared flow logic)

## Current State

### What Already Exists
- **Frontend Personality System**: Shared with GIANNA (8 archetypes, configurable traits)
- **Knowledge Base**: Response strategies and objection handling
- **Conversation Flows**: Intent classification and flow management
- **AI Orchestrator**: For AI-powered response generation
- **Support Ticket Integration**: Basic CRM connections

### What Still Needs to be Built
- CATHY-specific backend service
- Support conversation state management
- CRM integration for customer context
- Escalation workflow automation
- Sentiment analysis and response adaptation
- Multi-channel support coordination

## Support Conversation Architecture

### Conversation Context Management
```typescript
interface SupportConversation {
  conversationId: string;
  customerId: string;
  teamId: string;
  channel: SupportChannel;
  status: ConversationStatus;
  priority: PriorityLevel;
  sentiment: SentimentScore;
  topics: SupportTopic[];
  history: Message[];
  context: ConversationContext;
  escalation: EscalationInfo;
  resolution: ResolutionInfo;
}

enum SupportChannel {
  CHAT = 'chat',
  EMAIL = 'email',
  PHONE = 'phone',
  SOCIAL = 'social',
  TICKET = 'ticket'
}

enum ConversationStatus {
  ACTIVE = 'active',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}
```

### Sentiment Analysis Engine
```typescript
@Injectable()
export class SentimentAnalysisEngine {
  async analyzeSentiment(message: string, context: ConversationContext): Promise<SentimentAnalysis> {
    // Multi-factor sentiment analysis
    const textSentiment = await this.analyzeTextSentiment(message);
    const contextualSentiment = await this.analyzeContextualSentiment(message, context);
    const historicalSentiment = await this.analyzeHistoricalSentiment(context.conversationId);

    // Weighted combination
    const overallSentiment = this.combineSentimentScores({
      text: textSentiment,
      contextual: contextualSentiment,
      historical: historicalSentiment
    });

    // Detect urgency and priority
    const urgency = this.detectUrgency(message, overallSentiment);
    const priority = this.calculatePriority(urgency, context.customerTier);

    return {
      overall: overallSentiment,
      components: {
        text: textSentiment,
        contextual: contextualSentiment,
        historical: historicalSentiment
      },
      urgency,
      priority,
      recommendations: this.generateSentimentRecommendations(overallSentiment, urgency)
    };
  }

  private async analyzeTextSentiment(text: string): Promise<SentimentScore> {
    // Use AI for sentiment classification
    const aiAnalysis = await this.aiOrchestrator.analyzeSentiment(text);

    return {
      score: aiAnalysis.score, // -1 to 1
      confidence: aiAnalysis.confidence,
      emotions: aiAnalysis.emotions,
      keywords: aiAnalysis.keywords
    };
  }

  private detectUrgency(text: string, sentiment: SentimentScore): UrgencyLevel {
    // Check for urgent keywords
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'immediately'];
    const hasUrgentKeywords = urgentKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );

    // Check sentiment extremes
    const extremeSentiment = Math.abs(sentiment.score) > 0.7;

    // Check for repeated messages or follow-ups
    const repeatedContact = this.detectRepeatedContact(text);

    if (hasUrgentKeywords || extremeSentiment || repeatedContact) {
      return UrgencyLevel.HIGH;
    }

    return UrgencyLevel.NORMAL;
  }
}
```

### Relationship Building Engine
```typescript
@Injectable()
export class RelationshipBuildingEngine {
  async buildCustomerRelationship(conversationId: string, customerId: string): Promise<RelationshipProfile> {
    // Analyze interaction history
    const history = await this.getCustomerInteractionHistory(customerId);

    // Calculate relationship metrics
    const metrics = await this.calculateRelationshipMetrics(history);

    // Identify relationship opportunities
    const opportunities = await this.identifyRelationshipOpportunities(metrics);

    // Generate relationship-building recommendations
    const recommendations = await this.generateRelationshipRecommendations(metrics, opportunities);

    return {
      customerId,
      metrics,
      opportunities,
      recommendations,
      nextBestActions: this.prioritizeActions(recommendations)
    };
  }

  private async calculateRelationshipMetrics(history: InteractionHistory[]): Promise<RelationshipMetrics> {
    const totalInteractions = history.length;
    const avgResponseTime = this.calculateAvgResponseTime(history);
    const satisfactionTrend = this.analyzeSatisfactionTrend(history);
    const engagementLevel = this.calculateEngagementLevel(history);
    const loyaltyIndicators = this.identifyLoyaltyIndicators(history);

    return {
      totalInteractions,
      avgResponseTime,
      satisfactionTrend,
      engagementLevel,
      loyaltyIndicators,
      relationshipScore: this.calculateRelationshipScore({
        totalInteractions,
        satisfactionTrend,
        engagementLevel,
        loyaltyIndicators
      })
    };
  }

  private async identifyRelationshipOpportunities(metrics: RelationshipMetrics): Promise<RelationshipOpportunity[]> {
    const opportunities = [];

    // Check for upsell opportunities
    if (metrics.engagementLevel > 0.8 && metrics.loyaltyIndicators.length > 2) {
      opportunities.push({
        type: 'upsell',
        confidence: 0.85,
        reason: 'High engagement and loyalty indicators suggest readiness for premium offerings'
      });
    }

    // Check for advocacy opportunities
    if (metrics.satisfactionTrend > 0.9 && metrics.totalInteractions > 10) {
      opportunities.push({
        type: 'advocacy',
        confidence: 0.75,
        reason: 'Consistently high satisfaction indicates potential for testimonials or referrals'
      });
    }

    // Check for support expansion
    if (metrics.avgResponseTime < 300000 && metrics.relationshipScore > 0.8) { // 5 minutes
      opportunities.push({
        type: 'support_expansion',
        confidence: 0.70,
        reason: 'Quick, effective support suggests opportunity for expanded service offerings'
      });
    }

    return opportunities;
  }
}
```

### Objection Resolution Engine
```typescript
@Injectable()
export class ObjectionResolutionEngine {
  async resolveObjection(conversationId: string, objection: CustomerObjection): Promise<ResolutionStrategy> {
    // Classify objection type
    const objectionType = await this.classifyObjection(objection);

    // Analyze objection context
    const context = await this.analyzeObjectionContext(conversationId, objection);

    // Select resolution strategy
    const strategy = await this.selectResolutionStrategy(objectionType, context);

    // Generate resolution response
    const response = await this.generateResolutionResponse(strategy, context);

    // Prepare escalation path if needed
    const escalation = await this.prepareEscalationPath(strategy, context);

    return {
      objectionType,
      strategy,
      response,
      escalation,
      confidence: strategy.confidence,
      expectedOutcome: strategy.expectedOutcome
    };
  }

  private async classifyObjection(objection: CustomerObjection): Promise<ObjectionType> {
    // Use AI to classify objection
    const classification = await this.aiOrchestrator.classifyObjection(objection.text);

    // Validate against known patterns
    const validatedType = await this.validateObjectionType(classification, objection.context);

    return validatedType;
  }

  private async selectResolutionStrategy(objectionType: ObjectionType, context: ObjectionContext): Promise<ResolutionStrategy> {
    // Get available strategies for objection type
    const strategies = await this.getStrategiesForObjectionType(objectionType);

    // Score strategies based on context
    const scoredStrategies = await Promise.all(
      strategies.map(strategy => this.scoreStrategy(strategy, context))
    );

    // Select highest scoring strategy
    const bestStrategy = scoredStrategies.sort((a, b) => b.score - a.score)[0];

    return bestStrategy.strategy;
  }

  private async generateResolutionResponse(strategy: ResolutionStrategy, context: ObjectionContext): Promise<Response> {
    // Use personality system for response generation
    const personality = await this.getAppropriatePersonality(context.customerProfile);

    // Generate empathetic, solution-focused response
    const response = await this.generateEmpatheticResponse(strategy, personality, context);

    // Include next steps and follow-up
    const enhancedResponse = await this.addResolutionSteps(response, strategy);

    return enhancedResponse;
  }
}
```

### Multi-Channel Coordination
```typescript
@Injectable()
export class MultiChannelCoordinator {
  async coordinateSupportChannels(conversationId: string): Promise<ChannelCoordination> {
    // Get all active channels for customer
    const activeChannels = await this.getActiveChannels(conversationId);

    // Analyze channel effectiveness
    const channelAnalysis = await this.analyzeChannelEffectiveness(activeChannels);

    // Recommend channel transitions
    const recommendations = await this.generateChannelRecommendations(channelAnalysis);

    // Coordinate responses across channels
    const coordination = await this.coordinateResponses(activeChannels, recommendations);

    return {
      activeChannels,
      analysis: channelAnalysis,
      recommendations,
      coordination,
      unifiedView: this.createUnifiedConversationView(activeChannels)
    };
  }

  private async analyzeChannelEffectiveness(channels: ActiveChannel[]): Promise<ChannelAnalysis[]> {
    return Promise.all(
      channels.map(async (channel) => {
        const responseRate = await this.calculateResponseRate(channel);
        const resolutionRate = await this.calculateResolutionRate(channel);
        const satisfactionScore = await this.calculateSatisfactionScore(channel);
        const costEfficiency = await this.calculateCostEfficiency(channel);

        return {
          channel: channel.type,
          metrics: {
            responseRate,
            resolutionRate,
            satisfactionScore,
            costEfficiency
          },
          effectiveness: this.calculateOverallEffectiveness({
            responseRate,
            resolutionRate,
            satisfactionScore,
            costEfficiency
          })
        };
      })
    );
  }

  private async generateChannelRecommendations(analysis: ChannelAnalysis[]): Promise<ChannelRecommendation[]> {
    const recommendations = [];

    // Recommend best channel for immediate response
    const bestChannel = analysis.sort((a, b) => b.effectiveness - a.effectiveness)[0];
    if (bestChannel.effectiveness > 0.8) {
      recommendations.push({
        type: 'primary_channel',
        channel: bestChannel.channel,
        reason: 'Highest effectiveness for customer satisfaction',
        confidence: 0.9
      });
    }

    // Recommend channel transitions for complex issues
    const complexIssueChannels = analysis.filter(a => a.metrics.satisfactionScore > 0.85);
    if (complexIssueChannels.length > 0) {
      recommendations.push({
        type: 'escalation_channel',
        channels: complexIssueChannels.map(a => a.channel),
        reason: 'Better for complex issue resolution',
        confidence: 0.8
      });
    }

    return recommendations;
  }
}
```

## Integration Points

### With GIANNA SDR Agent
- **Shared Personality System**: Uses same 8 archetypes and traits
- **Conversation Flow Logic**: Leverages intent classification
- **Knowledge Base Access**: Shared response strategies
- **Worker Recommendation**: CATHY recommended for established relationships

### With AI Co-Pilot Response Generator
- **Response Enhancement**: AI fallback for complex support scenarios
- **Context Awareness**: Shared conversation history
- **Quality Validation**: Response appropriateness checking

### With Lead State Manager
- **State Transitions**: Updates lead states based on support interactions
- **Journey Tracking**: Logs support touchpoints in customer journey
- **Scoring Integration**: Support quality affects lead scores

### With Contextual Orchestrator
- **Support Routing**: Directs conversations to appropriate support paths
- **Escalation Coordination**: Manages human handoff workflows
- **Multi-channel Orchestration**: Coordinates responses across channels

### With ML Intelligence Engine
- **Sentiment Prediction**: Anticipates customer mood changes
- **Resolution Prediction**: Predicts successful resolution strategies
- **Personalization Optimization**: Learns optimal support approaches

## API Endpoints

### Support Conversation Management
```typescript
@Post('conversations')
async startConversation(@Body() request: StartConversationRequest): Promise<ConversationResponse> {
  return this.cathyService.startSupportConversation(request.teamId, request.customerId, request.initialMessage);
}

@Get('conversations/:id')
async getConversation(@Param('id') conversationId: string): Promise<ConversationDetails> {
  return this.cathyService.getConversationDetails(conversationId);
}

@Post('conversations/:id/messages')
async sendMessage(@Param('id') conversationId: string, @Body() message: SupportMessage): Promise<MessageResponse> {
  return this.cathyService.processSupportMessage(conversationId, message);
}
```

### Relationship Management
```typescript
@Get('customers/:id/relationship')
async getCustomerRelationship(@Param('id') customerId: string): Promise<RelationshipProfile> {
  return this.cathyService.getCustomerRelationship(customerId);
}

@Post('customers/:id/relationship/actions')
async executeRelationshipAction(@Param('id') customerId: string, @Body() action: RelationshipAction): Promise<ActionResult> {
  return this.cathyService.executeRelationshipAction(customerId, action);
}
```

### Escalation Management
```typescript
@Post('conversations/:id/escalate')
async escalateConversation(@Param('id') conversationId: string, @Body() escalation: EscalationRequest): Promise<EscalationResponse> {
  return this.cathyService.escalateToHuman(conversationId, escalation);
}

@Get('escalations/pending')
async getPendingEscalations(): Promise<PendingEscalation[]> {
  return this.cathyService.getPendingEscalations();
}
```

## Dependencies

### Prerequisite Skills
- gianna-sdr-agent - For shared personality system and conversation flows
- ai-co-pilot-response-generator - For AI-powered response enhancement
- lead-state-manager - For customer journey state management
- ml-intelligence-engine - For sentiment analysis and personalization

### Existing Services Used
- apps/front/src/lib/gianna/gianna-service.ts - Shared personality and response logic
- apps/front/src/lib/gianna/knowledge-base.ts - Shared response strategies
- apps/front/src/lib/gianna/conversation-flows.ts - Shared flow management
- apps/api/src/app/ai-orchestrator/ - AI processing for complex responses

### External APIs Required
- CRM Integration APIs - For customer data access
- Support Ticketing Systems - For escalation management
- Communication Platforms - For multi-channel support

## Testing
- Conversation flow testing with various customer scenarios
- Sentiment analysis accuracy validation
- Escalation workflow testing
- Multi-channel coordination testing
- Relationship building effectiveness measurement
- Objection resolution success rate tracking

## Notes
- Focuses on relationship-building unlike GIANNA's conversion focus
- Uses empathetic, consultative communication style
- Prioritizes customer satisfaction over speed
- Integrates deeply with existing support infrastructure
- Supports complex, multi-turn conversations
- Includes comprehensive escalation intelligence
- Tracks support analytics for continuous improvement