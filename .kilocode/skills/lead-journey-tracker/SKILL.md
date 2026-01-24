---
name: lead-journey-tracker
description: Tracks lead interactions and journey analytics across all touchpoints
---

# Lead Journey Tracker

## Overview
Provides comprehensive tracking and analytics of lead interactions across all communication channels (SMS, email, calls, web visits). Creates detailed journey maps showing lead progression through the sales funnel with timeline visualization and conversion attribution.

## Key Features
- Multi-channel interaction tracking
- Journey timeline visualization
- Conversion funnel analytics
- Touchpoint attribution modeling
- Lead scoring based on engagement
- Automated journey insights and recommendations

## Current State

### What Already Exists
- **Campaign Tracking**: `app/campaign/resolvers/campaign-execution.resolver.ts` - Campaign execution tracking
- **Inbox Service**: `app/inbox/services/inbox.service.ts` - Message interaction logging
- **Lead Cards**: `app/enrichment/repositories/lead-card.repository.ts` - Lead data storage
- **Initial Messages**: `app/initial-messages/services/initial-message.service.ts` - First touch tracking

### What Still Needs to be Built
- Unified journey aggregation across channels
- Timeline visualization components
- Attribution modeling logic
- Automated insights generation
- Journey-based lead scoring
- Predictive analytics for next steps

## Implementation Steps

### 1. Create Journey Tracking Service
Create `app/lead-journey/services/journey-tracker.service.ts`:

```typescript
--- /dev/null
+++ b/app/lead-journey/services/journey-tracker.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadJourney } from '../entities/lead-journey.entity';

@Injectable()
export class JourneyTrackerService {
  constructor(
    @InjectRepository(LeadJourney)
    private journeyRepo: Repository<LeadJourney>
  ) {}

  async trackInteraction(interaction: InteractionEvent) {
    const journey = await this.getOrCreateJourney(interaction.leadId);
    
    // Add interaction to journey
    journey.interactions.push({
      id: interaction.id,
      type: interaction.type,
      channel: interaction.channel,
      timestamp: interaction.timestamp,
      details: interaction.details
    });
    
    // Update journey metrics
    journey.lastInteraction = interaction.timestamp;
    journey.totalInteractions += 1;
    journey.channelsUsed.add(interaction.channel);
    
    // Calculate engagement score
    journey.engagementScore = this.calculateEngagementScore(journey);
    
    await this.journeyRepo.save(journey);
    
    // Trigger journey insights
    await this.generateInsights(journey);
  }
  
  async getJourney(leadId: string): Promise<LeadJourney> {
    return await this.journeyRepo.findOne({
      where: { leadId },
      relations: ['interactions']
    });
  }
  
  private async getOrCreateJourney(leadId: string): Promise<LeadJourney> {
    let journey = await this.journeyRepo.findOne({ where: { leadId } });
    
    if (!journey) {
      journey = this.journeyRepo.create({
        leadId,
        startDate: new Date(),
        interactions: [],
        channelsUsed: new Set(),
        engagementScore: 0,
        totalInteractions: 0
      });
    }
    
    return journey;
  }
  
  private calculateEngagementScore(journey: LeadJourney): number {
    // Calculate based on interaction frequency, recency, channels used
    const recencyScore = this.calculateRecencyScore(journey.lastInteraction);
    const frequencyScore = Math.min(journey.totalInteractions / 10, 1);
    const channelDiversityScore = journey.channelsUsed.size / 5; // Max 5 channels
    
    return (recencyScore * 0.4) + (frequencyScore * 0.4) + (channelDiversityScore * 0.2);
  }
  
  private calculateRecencyScore(lastInteraction: Date): number {
    const daysSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (daysSince / 30)); // Decay over 30 days
  }
  
  private async generateInsights(journey: LeadJourney) {
    // Generate automated insights based on journey patterns
    const insights = [];
    
    if (journey.engagementScore > 0.8) {
      insights.push('High engagement - consider moving to proposal stage');
    }
    
    if (journey.channelsUsed.has('call') && journey.channelsUsed.has('email')) {
      insights.push('Multi-channel engagement - strong buying signals');
    }
    
    // Store insights for dashboard display
    await this.storeInsights(journey.leadId, insights);
  }
}
```

### 2. Create Journey Entity
Create `app/lead-journey/entities/lead-journey.entity.ts`:

```typescript
--- /dev/null
+++ b/app/lead-journey/entities/lead-journey.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { JourneyInteraction } from './journey-interaction.entity';

@Entity()
export class LeadJourney {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  leadId: string;
  
  @Column()
  startDate: Date;
  
  @Column({ nullable: true })
  lastInteraction: Date;
  
  @Column('simple-array')
  channelsUsed: string[];
  
  @Column('float', { default: 0 })
  engagementScore: number;
  
  @Column({ default: 0 })
  totalInteractions: number;
  
  @OneToMany(() => JourneyInteraction, interaction => interaction.journey)
  interactions: JourneyInteraction[];
}
```

### 3. Add Journey Resolver
Create `app/lead-journey/resolvers/lead-journey.resolver.ts`:

```typescript
--- /dev/null
+++ b/app/lead-journey/resolvers/lead-journey.resolver.ts
import { Resolver, Query, ResolveField, Parent } from '@nestjs/graphql';
import { JourneyTrackerService } from '../services/journey-tracker.service';

@Resolver('LeadJourney')
export class LeadJourneyResolver {
  constructor(private journeyTracker: JourneyTrackerService) {}
  
  @Query(() => LeadJourney)
  async leadJourney(@Args('leadId') leadId: string) {
    return this.journeyTracker.getJourney(leadId);
  }
  
  @Query(() => [LeadJourney])
  async leadJourneys(@Args('tenantId') tenantId: string) {
    return this.journeyTracker.getJourneysByTenant(tenantId);
  }
  
  @ResolveField(() => [String])
  async insights(@Parent() journey: LeadJourney) {
    return this.journeyTracker.getInsights(journey.leadId);
  }
  
  @ResolveField(() => JourneyAnalytics)
  async analytics(@Parent() journey: LeadJourney) {
    return this.journeyTracker.calculateAnalytics(journey);
  }
}
```

### 4. Integrate with Existing Services
Update `app/inbox/services/inbox.service.ts` to track interactions:

```typescript
--- a/app/inbox/services/inbox.service.ts
+++ b/app/inbox/services/inbox.service.ts
  async processMessage(message: Message) {
    // Existing processing...
    
    // Track journey interaction
    await this.journeyTracker.trackInteraction({
      id: message.id,
      leadId: message.leadId,
      type: 'message',
      channel: message.channel,
      timestamp: message.timestamp,
      details: {
        direction: message.direction,
        content: message.content
      }
    });
  }
```

### 5. Create Analytics Service
Create `app/lead-journey/services/journey-analytics.service.ts`:

```typescript
--- /dev/null
+++ b/app/lead-journey/services/journey-analytics.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class JourneyAnalyticsService {
  calculateConversionRate(journeys: LeadJourney[]): number {
    const converted = journeys.filter(j => j.converted).length;
    return converted / journeys.length;
  }
  
  calculateAverageJourneyLength(journeys: LeadJourney[]): number {
    const lengths = journeys.map(j => {
      const endDate = j.conversionDate || j.lastInteraction;
      return (endDate.getTime() - j.startDate.getTime()) / (1000 * 60 * 60 * 24);
    });
    
    return lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  }
  
  identifyBottlenecks(journeys: LeadJourney[]): BottleneckAnalysis {
    // Analyze where leads get stuck in the journey
    const stageAnalysis = this.analyzeStageTransitions(journeys);
    return {
      bottlenecks: stageAnalysis.filter(stage => stage.dropOffRate > 0.3),
      recommendations: this.generateRecommendations(stageAnalysis)
    };
  }
}
```

## Dependencies
- `lead-management-orchestrator` - For lead data access
- `campaign-execution` - For campaign interaction tracking
- `inbox` - For message interaction data
- `data-export-enrichment-engine` - For journey data export

## Testing
- Unit tests for journey calculation logic
- Integration tests with existing interaction tracking
- Performance tests for large journey datasets
- Analytics accuracy validation

## Notes
- Integrate with existing campaign and inbox tracking
- Provide real-time journey updates via WebSocket
- Support journey visualization in frontend dashboards
- Include predictive analytics for next best actions
- Ensure multi-tenant data isolation in journey tracking