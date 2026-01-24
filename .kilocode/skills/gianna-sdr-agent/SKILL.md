---
name: gianna-sdr-agent
description: AI-powered SDR agent for intelligent SMS outreach, conversation handling, and lead qualification
---

# Gianna SDR Agent

## Overview
Implements the backend GIANNA service for AI-powered SDR operations in OutreachGlobal. Based on the sophisticated frontend personality system, this agent handles outbound SMS campaigns, inbound response processing, and intelligent conversation flows. Features 8 personality archetypes, 15+ conversation flows, objection handling, and seamless integration with SignalHouse SMS delivery.

## Key Features
- Personality-driven SMS generation (8 archetypes)
- Intent classification and response routing
- Objection handling with contextual replies
- Lead type-specific conversation strategies
- Human-in-the-loop escalation for low confidence
- A/B testing for message optimization
- Multi-tenant personality customization
- Integration with ML scoring and lead state management

## Code References
- Frontend Service: `apps/front/src/lib/gianna/gianna-service.ts`
- Knowledge Base: `apps/front/src/lib/gianna/knowledge-base.ts`
- Conversation Flows: `apps/front/src/lib/gianna/conversation-flows.ts`
- Backend Module: `apps/api/src/app/gianna/gianna.module.ts` (planned)
- Backend Service: `apps/api/src/app/gianna/gianna.service.ts` (planned)
- Backend Controller: `apps/api/src/app/gianna/gianna.controller.ts` (planned)
- SignalHouse Integration: `apps/api/src/lib/signalhouse/signalhouse.service.ts`

## Current State

### What Already Exists
- **Frontend GIANNA Service**: Complete personality system with 8 archetypes
- **Knowledge Base**: 160+ message templates, objection responses, lead type approaches
- **Conversation Flows**: 15+ flows for different response intents
- **SignalHouse Integration**: SMS delivery infrastructure
- **AI Orchestrator**: For AI-powered message generation

### What Still Needs to be Built
- Backend GIANNA module and service
- SMS webhook processing for inbound responses
- Personality persistence and team customization
- Conversation state management
- Integration with lead state transitions
- Human-in-the-loop workflows

## Personality System

### 8 Archetypes (from Frontend)
```typescript
export interface GiannaPersonality {
  warmth: number;        // 0-100: cold to warm
  directness: number;    // 0-100: indirect to direct
  humor: number;         // 0-100: serious to playful
  formality: number;     // 0-100: casual to formal
  urgency: number;       // 0-100: relaxed to time-sensitive
  nudging: number;       // 0-100: one-time to persistent
  assertiveness: number; // 0-100: passive to confident
  empathy: number;       // 0-100: transactional to emotionally attuned
  curiosity: number;     // 0-100: scripted to discovery-focused
  closingPush: number;   // 0-100: soft close to hard close
}
```

### Preset Personalities
- **balanced**: Default Gianna (warmth: 70, directness: 60, humor: 40)
- **cold_outreach**: For new leads (warmth: 75, directness: 70)
- **nurture**: For warming up cold leads (warmth: 85, directness: 40)
- **closing**: For final push (closingPush: 80, assertiveness: 75)
- **professional**: For enterprise leads (formality: 80, warmth: 60)
- **casual**: For startup/small business (formality: 20, humor: 60)

## Conversation Flows

### Response Intent Classification
```typescript
export type ResponseIntent =
  | "interested"      // "Yes, tell me more"
  | "question"        // "What's this about?"
  | "request_info"    // "Send me details"
  | "request_call"    // "Call me"
  | "soft_no"         // "Not right now"
  | "hard_no"         // "Not interested"
  | "objection_busy"  // "I'm too busy"
  | "objection_price" // "Too expensive"
  | "objection_timing"// "Bad timing"
  | "objection_trust" // "Who are you?"
  | "objection_competitor" // "Already working with someone"
  | "anger"           // "Stop texting me"
  | "opt_out"         // "STOP"
  | "confusion"       // "What?"
  | "ghost";          // No response
```

### Flow Types
1. **Interest Flow**: Nurture positive responses
2. **Question Flow**: Answer FAQs and objections
3. **Objection Flow**: Handle specific concerns
4. **Closing Flow**: Push for meetings/calls
5. **Nurture Flow**: Stay top-of-mind
6. **Re-engagement Flow**: Win back lost leads

## Implementation Steps

### 1. Create Backend Module Structure
```typescript
apps/api/src/app/gianna/
├── gianna.module.ts
├── gianna.service.ts
├── gianna.controller.ts
├── gianna.resolver.ts
├── dto/
│   ├── send-sms.dto.ts
│   ├── personality.dto.ts
│   └── conversation.dto.ts
├── entities/
│   ├── personality.entity.ts
│   ├── conversation.entity.ts
│   └── message-log.entity.ts
└── strategies/
    ├── personality.strategy.ts
    ├── flow.strategy.ts
    └── objection.strategy.ts
```

### 2. Personality Management Service
```typescript
@Injectable()
export class PersonalityService {
  async getTeamPersonality(teamId: string, leadId?: string): Promise<GiannaPersonality> {
    // Get base team personality
    const teamPersonality = await this.getTeamDefaultPersonality(teamId);

    // Adjust based on lead type and history
    if (leadId) {
      const leadContext = await this.leadService.getLeadContext(teamId, leadId);
      return this.adjustPersonalityForLead(teamPersonality, leadContext);
    }

    return teamPersonality;
  }

  async updateTeamPersonality(teamId: string, personality: GiannaPersonality) {
    // Persist team personality settings
    await this.personalityRepo.save({
      teamId,
      personality,
      updatedAt: new Date()
    });
  }
}
```

### 3. Message Generation Service
```typescript
@Injectable()
export class MessageGenerationService {
  async generateOpener(teamId: string, leadId: string, context: OutreachContext): Promise<string> {
    // Get personality for this lead
    const personality = await this.personalityService.getTeamPersonality(teamId, leadId);

    // Select appropriate flow
    const flow = this.selectFlowForContext(context);

    // Generate message using personality DNA
    const message = await this.generateWithPersonality(flow, personality, context);

    // Log for A/B testing
    await this.logMessageGeneration(teamId, leadId, message, personality);

    return message;
  }

  async generateResponse(teamId: string, conversationId: string, inboundMessage: string): Promise<string> {
    // Classify inbound response
    const classification = await this.classifyResponse(inboundMessage);

    // Get conversation context
    const context = await this.conversationService.getContext(conversationId);

    // Select response strategy
    const strategy = this.selectResponseStrategy(classification.intent);

    // Generate response
    return await this.generateResponseWithStrategy(strategy, context, classification);
  }
}
```

### 4. SMS Delivery Integration
```typescript
@Injectable()
export class SMSDeliveryService {
  async sendOutboundSMS(teamId: string, phoneNumber: string, message: string, campaignId?: string) {
    // Get SignalHouse configuration
    const config = await this.signalhouseService.getTeamConfig(teamId);

    // Send SMS
    const result = await this.signalhouseService.sendSMS({
      to: phoneNumber,
      message,
      campaignId,
      teamId
    });

    // Log delivery
    await this.logSMSDelivery(teamId, phoneNumber, message, result);

    return result;
  }

  async processInboundSMS(webhookData: SignalHouseWebhook) {
    // Extract team from phone number
    const teamId = await this.phoneMappingService.getTeamForNumber(webhookData.to);

    // Classify and route response
    const classification = await this.messageService.classifyResponse(webhookData.message);

    // Generate response using GIANNA
    const response = await this.messageService.generateResponse(
      teamId,
      webhookData.conversationId,
      webhookData.message
    );

    // Send response if confidence > threshold
    if (classification.confidence > 0.7) {
      await this.sendOutboundSMS(teamId, webhookData.from, response);
    } else {
      // Escalate to human
      await this.escalateToHuman(teamId, webhookData);
    }
  }
}
```

### 5. Conversation State Management
```typescript
@Injectable()
export class ConversationService {
  async trackConversation(teamId: string, leadId: string, message: string, direction: 'inbound' | 'outbound') {
    // Update conversation state
    const conversation = await this.getOrCreateConversation(teamId, leadId);

    conversation.messages.push({
      content: message,
      direction,
      timestamp: new Date(),
      classification: direction === 'inbound' ? await this.classifyResponse(message) : null
    });

    // Update flow state
    conversation.currentFlow = this.updateFlowState(conversation);

    // Update lead state if needed
    if (direction === 'inbound') {
      await this.updateLeadStateFromResponse(teamId, leadId, message);
    }

    await this.conversationRepo.save(conversation);
  }
}
```

### 6. Human-in-the-Loop Escalation
```typescript
@Injectable()
export class HumanEscalationService {
  async escalateLowConfidence(teamId: string, conversationId: string, message: string, classification: ResponseClassification) {
    // Create escalation ticket
    const ticket = await this.createEscalationTicket({
      teamId,
      conversationId,
      message,
      classification,
      priority: this.calculatePriority(classification)
    });

    // Notify team via inbox
    await this.inboxService.createEscalationMessage(teamId, ticket);

    // Log escalation
    await this.logEscalation(teamId, conversationId, classification);
  }

  async resolveEscalation(ticketId: string, resolution: string, approvedResponse?: string) {
    // Update ticket
    await this.updateTicketStatus(ticketId, 'resolved', resolution);

    // Send approved response if provided
    if (approvedResponse) {
      await this.smsService.sendApprovedResponse(ticketId, approvedResponse);
    }

    // Learn from resolution for future
    await this.machineLearningService.learnFromResolution(ticketId, resolution);
  }
}
```

## Integration Points

### With SignalHouse
- **Outbound SMS**: Campaign delivery via SignalHouse API
- **Inbound Webhooks**: Response processing and routing
- **Phone Number Mapping**: Team-specific number allocation

### With AI Orchestrator
- **Fallback Generation**: When template confidence is low
- **Personality Enhancement**: AI-powered personality adjustments
- **Content Optimization**: ML-optimized message selection

### With Lead State Manager
- **State Transitions**: Update lead state based on conversation progress
- **Scoring Integration**: Conversation quality affects lead scores
- **Journey Tracking**: Log conversation events

### With ML Intelligence Engine
- **Response Classification**: ML-powered intent detection
- **Personality Optimization**: Data-driven personality adjustments
- **A/B Testing**: Statistical significance calculation

### With Contextual Orchestrator
- **Skill Routing**: Route conversations to appropriate handlers
- **Flow Orchestration**: Coordinate multi-step conversation flows
- **Escalation Logic**: Determine when to involve humans

## Dependencies

### Prerequisite Skills
- ai-orchestrator - For AI-powered message generation
- signalhouse-integration - For SMS delivery infrastructure
- lead-state-manager - For lead lifecycle management
- ml-intelligence-engine - For response classification and optimization

### Existing Services Used
- apps/api/src/lib/signalhouse/signalhouse.service.ts - SMS delivery
- apps/api/src/app/inbox/services/inbox.service.ts - Message routing
- apps/api/src/app/lead/ - Lead data and state management
- apps/api/src/app/ai-orchestrator/ - AI processing fallback

### External APIs Required
- SignalHouse API - SMS delivery and webhooks
- OpenAI API ($0.002/1K tokens) - AI fallback generation

## Testing
- Unit tests for personality adjustments and flow selection
- Integration tests with SignalHouse SMS delivery
- Conversation flow testing with mock responses
- A/B testing validation for message optimization
- Multi-tenant isolation testing
- Human escalation workflow testing

## Notes
- Start with template-based generation, add AI fallback later
- Implement comprehensive logging for conversation analytics
- Support real-time personality adjustments based on performance
- Include conversation replay for training and optimization
- Ensure GDPR compliance for conversation data retention
- Provide dashboard for conversation analytics and optimization insights