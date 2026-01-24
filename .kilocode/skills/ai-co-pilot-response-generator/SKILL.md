---
name: ai-co-pilot-response-generator
description: Generates co-pilot style AI responses for inbound messages mapped by SignalHouse phone numbers
---

# AI Co-Pilot Response Generator

## Overview
Creates intelligent, context-aware AI responses for inbound communications (SMS/calls) received through SignalHouse integration. Acts as a co-pilot system that assists human agents by generating suggested responses based on conversation history, lead context, and business rules.

## Key Features
- Context-aware response generation using conversation history
- SignalHouse phone number mapping for tenant-specific responses
- Multi-modal response suggestions (SMS, voice scripts)
- Integration with existing AI agents (Gianna, LUCI, Cathy)
- Response quality scoring and human override capabilities
- Real-time response generation with low latency

## Current State

### What Already Exists
- **AI Orchestrator**: `app/ai-orchestrator/consumers/ai.consumer.ts` - Handles AI processing requests
- **SignalHouse Integration**: `lib/signalhouse/signalhouse.service.ts` - SMS/call handling infrastructure
- **Inbound Processing**: `app/inbox/services/inbox.service.ts` - Message processing framework
- **Usage Metering**: `app/ai-orchestrator/usage/usage-meter.service.ts` - AI usage tracking

### What Still Needs to be Built
- Co-pilot response generation logic
- Phone number to response configuration mapping
- Conversation context aggregation
- Response suggestion ranking and filtering
- Human-in-the-loop override mechanisms
- Response performance analytics

## Implementation Steps

### 1. Create Response Generation Service
Create `app/ai-co-pilot/services/response-generator.service.ts`:

```typescript
--- /dev/null
+++ b/app/ai-co-pilot/services/response-generator.service.ts
import { Injectable } from '@nestjs/common';
import { AiOrchestratorService } from '../ai-orchestrator/ai-orchestrator.service';
import { SignalhouseService } from '../../lib/signalhouse/signalhouse.service';

@Injectable()
export class ResponseGeneratorService {
  constructor(
    private aiOrchestrator: AiOrchestratorService,
    private signalhouse: SignalhouseService
  ) {}

  async generateResponses(
    phoneNumber: string,
    message: string,
    conversationHistory: Message[]
  ): Promise<ResponseSuggestion[]> {
    // Get tenant configuration for phone number
    const config = await this.getTenantConfig(phoneNumber);
    
    // Aggregate conversation context
    const context = await this.buildContext(conversationHistory);
    
    // Generate AI responses using existing orchestrator
    const suggestions = await this.aiOrchestrator.generateSuggestions({
      message,
      context,
      config
    });
    
    return this.rankAndFilter(suggestions);
  }
  
  private async getTenantConfig(phoneNumber: string) {
    // Map phone number to tenant response settings
    return await this.signalhouse.getPhoneConfig(phoneNumber);
  }
  
  private async buildContext(history: Message[]) {
    // Build conversation context for AI
    return history.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));
  }
  
  private rankAndFilter(suggestions: any[]): ResponseSuggestion[] {
    // Rank suggestions by relevance and filter inappropriate ones
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .filter(s => s.confidence > 0.7)
      .slice(0, 3); // Top 3 suggestions
  }
}
```

### 2. Add Phone Number Mapping
Enhance `lib/signalhouse/signalhouse.service.ts`:

```typescript
--- a/lib/signalhouse/signalhouse.service.ts
+++ b/lib/signalhouse/signalhouse.service.ts
  async getPhoneConfig(phoneNumber: string) {
    // Map SignalHouse phone number to tenant response configuration
    const mapping = await this.phoneMappingRepository.findByPhone(phoneNumber);
    return {
      tenantId: mapping.tenantId,
      responseStyle: mapping.responseStyle,
      aiAgent: mapping.aiAgent, // Gianna, LUCI, Cathy
      businessRules: mapping.businessRules
    };
  }
```

### 3. Create Co-Pilot Resolver
Create `app/ai-co-pilot/resolvers/co-pilot.resolver.ts`:

```typescript
--- /dev/null
+++ b/app/ai-co-pilot/resolvers/co-pilot.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ResponseGeneratorService } from '../services/response-generator.service';

@Resolver()
export class CoPilotResolver {
  constructor(private responseGenerator: ResponseGeneratorService) {}
  
  @Query(() => [ResponseSuggestion])
  async generateResponses(
    @Args('phoneNumber') phoneNumber: string,
    @Args('message') message: string,
    @Args('conversationId') conversationId: string
  ) {
    const history = await this.getConversationHistory(conversationId);
    return this.responseGenerator.generateResponses(phoneNumber, message, history);
  }
  
  @Mutation(() => Boolean)
  async acceptSuggestion(@Args('suggestionId') suggestionId: string) {
    // Track accepted suggestions for learning
    return await this.trackAcceptance(suggestionId);
  }
  
  private async getConversationHistory(conversationId: string) {
    // Get recent messages from inbox service
    return await this.inboxService.getConversationHistory(conversationId);
  }
}
```

### 4. Integrate with Inbound Processing
Update `app/inbox/services/inbox.service.ts`:

```typescript
--- a/app/inbox/services/inbox.service.ts
+++ b/app/inbox/services/inbox.service.ts
  async processInboundMessage(message: InboundMessage) {
    // Existing processing logic...
    
    // Add co-pilot response generation
    if (this.shouldGenerateSuggestions(message)) {
      const suggestions = await this.responseGenerator.generateResponses(
        message.phoneNumber,
        message.content,
        message.conversationHistory
      );
      
      // Store suggestions for real-time delivery
      await this.storeSuggestions(message.id, suggestions);
    }
  }
  
  private shouldGenerateSuggestions(message: InboundMessage): boolean {
    // Check if co-pilot is enabled for this phone number
    const config = await this.signalhouse.getPhoneConfig(message.phoneNumber);
    return config.coPilotEnabled;
  }
```

## Dependencies
- `ai-agent-lifecycle-management` - For AI agent coordination
- `signalhouse-number-mapping-manager` - For phone number configuration
- `inbound-response-handler` - For message processing integration
- `inbox` - For conversation history access

## Testing
- Unit tests for response generation logic
- Integration tests with SignalHouse webhooks
- E2E tests for co-pilot suggestion flow
- Performance tests for response latency
- Accuracy tests for suggestion quality

## Notes
- Leverage existing AI orchestrator for response generation
- Integrate with SignalHouse phone number mappings
- Provide real-time suggestions via WebSocket
- Include human override and feedback mechanisms
- Track response acceptance rates for continuous improvement