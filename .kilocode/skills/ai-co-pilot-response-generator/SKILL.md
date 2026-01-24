---
name: ai-co-pilot-response-generator
description: Generates co-pilot style AI responses for inbound messages mapped by SignalHouse phone numbers
---

# AI Co-Pilot Response Generator

## Overview
Enable COPILOT to suggest context-aware SMS responses in the inbox, integrating AI for personalized outreach. Creates intelligent, context-aware AI responses for inbound communications (SMS/calls) received through SignalHouse integration. Acts as a co-pilot system that assists human agents by generating suggested responses based on conversation history, lead context, and business rules, with user feedback loops and multi-tenant isolation.

## Code References
- Copilot Service: `apps/api/src/app/copilot/copilot.service.ts`
- Copilot Controller: `apps/api/src/app/copilot/copilot.controller.ts`
- Tool Registry: `apps/api/src/app/copilot/tools/`
- AI Orchestrator: `apps/api/src/app/ai-orchestrator/`
- Sabrina SDR Service: `apps/api/src/app/inbox/services/sabrina-sdr.service.ts`
- SignalHouse Integration: `apps/api/src/lib/signalhouse/signalhouse.service.ts`

## Key Features
- Context-aware response generation using conversation history
- SignalHouse phone number mapping for tenant-specific responses
- Multi-modal response suggestions (SMS, voice scripts)
- Integration with existing AI orchestrator and SABRINA SDR service
- Response quality scoring and human override capabilities
- Real-time response generation with low latency
- User feedback loops for continuous improvement
- Multi-tenant isolation with teamId filtering

## Current State

### What Already Exists
- **AI Orchestrator**: `apps/api/src/app/ai-orchestrator/` - Handles AI processing requests
- **SignalHouse Integration**: `apps/api/src/lib/signalhouse/signalhouse.service.ts` - SMS/call handling infrastructure
- **Inbound Processing**: `apps/api/src/app/inbox/services/inbox.service.ts` - Message processing framework
- **SABRINA SDR Service**: `apps/api/src/app/inbox/services/sabrina-sdr.service.ts` - SDR integration
- **Usage Metering**: `apps/api/src/app/ai-orchestrator/usage/usage-meter.service.ts` - AI usage tracking

### What Still Needs to be Built
- Co-pilot response generation logic
- Phone number to response configuration mapping
- Conversation context aggregation
- Response suggestion ranking and filtering
- Human-in-the-loop override mechanisms
- Response performance analytics

## Implementation Steps

### 1. Create Response Generation Service
Create `apps/api/src/app/ai-co-pilot/services/response-generator.service.ts`:

```typescript
--- /dev/null
+++ b/apps/api/src/app/ai-co-pilot/services/response-generator.service.ts
import { Injectable } from '@nestjs/common';
import { AiOrchestratorService } from '@kilo-code/api/ai-orchestrator';
import { SignalhouseService } from '@kilo-code/api/lib/signalhouse';

@Injectable()
export class ResponseGeneratorService {
  constructor(
    private aiOrchestrator: AiOrchestratorService,
    private signalhouse: SignalhouseService
  ) {}

  async generateResponses(
    teamId: string,
    phoneNumber: string,
    message: string,
    conversationHistory: Message[]
  ): Promise<ResponseSuggestion[]> {
    // Ensure multi-tenant isolation
    if (!teamId) throw new Error('teamId required for tenant isolation');

    // Get tenant configuration for phone number
    const config = await this.getTenantConfig(teamId, phoneNumber);

    // Aggregate conversation context
    const context = await this.buildContext(conversationHistory);

    // Generate AI responses using existing orchestrator
    const suggestions = await this.aiOrchestrator.generateSuggestions({
      teamId,
      message,
      context,
      config
    });

    return this.rankAndFilter(suggestions);
  }

  private async getTenantConfig(teamId: string, phoneNumber: string) {
    // Map phone number to tenant response settings with teamId filtering
    return await this.signalhouse.getPhoneConfig(teamId, phoneNumber);
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
Enhance `apps/api/src/lib/signalhouse/signalhouse.service.ts`:

```typescript
--- a/apps/api/src/lib/signalhouse/signalhouse.service.ts
+++ b/apps/api/src/lib/signalhouse/signalhouse.service.ts
  async getPhoneConfig(teamId: string, phoneNumber: string) {
    // Map SignalHouse phone number to tenant response configuration with teamId isolation
    const mapping = await this.phoneMappingRepository.findByPhoneAndTeam(phoneNumber, teamId);
    return {
      teamId: mapping.teamId,
      responseStyle: mapping.responseStyle,
      aiAgent: mapping.aiAgent, // Existing AI orchestrator integration
      businessRules: mapping.businessRules
    };
  }
```

### 3. Create Co-Pilot Resolver
Create `apps/api/src/app/ai-co-pilot/resolvers/co-pilot.resolver.ts`:

```typescript
--- /dev/null
+++ b/apps/api/src/app/ai-co-pilot/resolvers/co-pilot.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ResponseGeneratorService } from '../services/response-generator.service';

@Resolver()
export class CoPilotResolver {
  constructor(private responseGenerator: ResponseGeneratorService) {}

  @Query(() => [ResponseSuggestion])
  async generateResponses(
    @Args('teamId') teamId: string,
    @Args('phoneNumber') phoneNumber: string,
    @Args('message') message: string,
    @Args('conversationId') conversationId: string
  ) {
    const history = await this.getConversationHistory(teamId, conversationId);
    return this.responseGenerator.generateResponses(teamId, phoneNumber, message, history);
  }

  @Mutation(() => Boolean)
  async acceptSuggestion(@Args('teamId') teamId: string, @Args('suggestionId') suggestionId: string) {
    // Track accepted suggestions for learning with teamId isolation
    return await this.trackAcceptance(teamId, suggestionId);
  }

  private async getConversationHistory(teamId: string, conversationId: string) {
    // Get recent messages from inbox service with teamId filtering
    return await this.inboxService.getConversationHistory(teamId, conversationId);
  }
}
```

### 4. Integrate with Inbound Processing
Update `apps/api/src/app/inbox/services/inbox.service.ts`:

```typescript
--- a/apps/api/src/app/inbox/services/inbox.service.ts
+++ b/apps/api/src/app/inbox/services/inbox.service.ts
  async processInboundMessage(teamId: string, message: InboundMessage) {
    // Existing processing logic...

    // Add co-pilot response generation with teamId isolation
    if (this.shouldGenerateSuggestions(teamId, message)) {
      const suggestions = await this.responseGenerator.generateResponses(
        teamId,
        message.phoneNumber,
        message.content,
        message.conversationHistory
      );

      // Store suggestions for real-time delivery
      await this.storeSuggestions(teamId, message.id, suggestions);
    }
  }

  private shouldGenerateSuggestions(teamId: string, message: InboundMessage): boolean {
    // Check if co-pilot is enabled for this phone number with teamId filtering
    const config = await this.signalhouse.getPhoneConfig(teamId, message.phoneNumber);
    return config.coPilotEnabled;
  }
```

## Dependencies

### Prerequisite Skills
- ai-agent-lifecycle-management - For AI orchestrator management
- workflow-orchestration-engine - For response workflow coordination

### Existing Services Used
- apps/api/src/app/ai-orchestrator/ - AI processing and response generation
- apps/api/src/app/inbox/services/sabrina-sdr.service.ts - SDR integration
- apps/api/src/lib/signalhouse/signalhouse.service.ts - SMS handling infrastructure
- apps/api/src/app/inbox/services/inbox.service.ts - Message processing framework

### External APIs Required
- OpenAI API ($0.002/1K tokens) - For AI response generation

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