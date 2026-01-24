---
name: lead-state-manager
description: Manages lead status and state transitions throughout the sales process
---

# Lead State Manager

## Overview
Manages lead lifecycle states and transitions in the OutreachGlobal platform. Provides a state machine for lead progression through qualification, nurturing, conversion, and post-sale phases with automated transitions based on interactions and business rules.

## Key Features
- Finite state machine for lead lifecycle
- Automated state transitions based on triggers
- State history tracking and audit trails
- Custom state workflows per tenant
- Integration with campaign and interaction data
- State-based lead scoring and prioritization

## Current State

### What Already Exists
- **Lead Cards**: `app/enrichment/repositories/lead-card.repository.ts` - Lead data storage
- **Campaign Leads**: `app/campaign/resolvers/campaign-lead.resolver.ts` - Campaign lead associations
- **Inbox Service**: `app/inbox/services/inbox.service.ts` - Lead interaction processing
- **Initial Messages**: `app/initial-messages/models/initial-message.model.ts` - Lead qualification states

### What Still Needs to be Built
- State machine definition and management
- Automated transition logic
- State history persistence
- Custom workflow configuration
- State-based business rules
- Transition validation and guards

## Implementation Steps

### 1. Create State Machine Service
Create `app/lead-state/services/state-machine.service.ts`:

```typescript
--- /dev/null
+++ b/app/lead-state/services/state-machine.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadState } from '../entities/lead-state.entity';
import { StateTransition } from '../entities/state-transition.entity';

@Injectable()
export class StateMachineService {
  constructor(
    @InjectRepository(LeadState)
    private stateRepo: Repository<LeadState>,
    @InjectRepository(StateTransition)
    private transitionRepo: Repository<StateTransition>
  ) {}

  async getLeadState(leadId: string): Promise<LeadState> {
    return await this.stateRepo.findOne({
      where: { leadId },
      relations: ['transitions']
    });
  }

  async transitionLead(
    leadId: string,
    newState: string,
    trigger: string,
    metadata?: any
  ): Promise<boolean> {
    const currentState = await this.getLeadState(leadId);
    
    // Validate transition
    if (!this.canTransition(currentState.currentState, newState)) {
      throw new Error(`Invalid transition from ${currentState.currentState} to ${newState}`);
    }
    
    // Check transition guards
    await this.checkGuards(leadId, currentState.currentState, newState);
    
    // Execute transition
    const transition = this.transitionRepo.create({
      leadId,
      fromState: currentState.currentState,
      toState: newState,
      trigger,
      metadata,
      timestamp: new Date()
    });
    
    await this.transitionRepo.save(transition);
    
    // Update lead state
    currentState.currentState = newState;
    currentState.lastTransition = new Date();
    currentState.transitions.push(transition);
    
    await this.stateRepo.save(currentState);
    
    // Execute transition actions
    await this.executeActions(leadId, newState, metadata);
    
    return true;
  }
  
  private canTransition(fromState: string, toState: string): boolean {
    const validTransitions = {
      'new': ['qualified', 'nurturing', 'disqualified'],
      'qualified': ['nurturing', 'proposal', 'disqualified'],
      'nurturing': ['qualified', 'proposal', 'disqualified'],
      'proposal': ['negotiation', 'won', 'lost'],
      'negotiation': ['won', 'lost', 'on_hold'],
      'won': ['post_sale'],
      'lost': ['re_engage'],
      'disqualified': [],
      'on_hold': ['negotiation', 'lost'],
      're_engage': ['nurturing', 'qualified'],
      'post_sale': []
    };
    
    return validTransitions[fromState]?.includes(toState) || false;
  }
  
  private async checkGuards(leadId: string, fromState: string, toState: string) {
    // Implement business rule guards
    if (toState === 'qualified') {
      await this.checkQualificationCriteria(leadId);
    }
    
    if (toState === 'won') {
      await this.checkConversionRequirements(leadId);
    }
  }
  
  private async executeActions(leadId: string, newState: string, metadata: any) {
    // Execute state-specific actions
    switch (newState) {
      case 'qualified':
        await this.notifySalesTeam(leadId);
        break;
      case 'won':
        await this.createPostSaleProcess(leadId);
        break;
      case 'lost':
        await this.updateLostReason(leadId, metadata.reason);
        break;
    }
  }
  
  private async checkQualificationCriteria(leadId: string) {
    // Check if lead meets qualification criteria
    const lead = await this.leadService.getLead(leadId);
    
    if (!lead.email || !lead.phone) {
      throw new Error('Lead missing required contact information');
    }
    
    if (lead.score < 50) {
      throw new Error('Lead score too low for qualification');
    }
  }
}
```

### 2. Create State Entities
Create `app/lead-state/entities/lead-state.entity.ts`:

```typescript
--- /dev/null
+++ b/app/lead-state/entities/lead-state.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { StateTransition } from './state-transition.entity';

@Entity()
export class LeadState {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  leadId: string;
  
  @Column({ default: 'new' })
  currentState: string;
  
  @Column({ nullable: true })
  lastTransition: Date;
  
  @Column({ type: 'json', nullable: true })
  stateMetadata: any;
  
  @OneToMany(() => StateTransition, transition => transition.leadState)
  transitions: StateTransition[];
}
```

Create `app/lead-state/entities/state-transition.entity.ts`:

```typescript
--- /dev/null
+++ b/app/lead-state/entities/state-transition.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { LeadState } from './lead-state.entity';

@Entity()
export class StateTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  leadId: string;
  
  @Column()
  fromState: string;
  
  @Column()
  toState: string;
  
  @Column()
  trigger: string;
  
  @Column()
  timestamp: Date;
  
  @Column({ type: 'json', nullable: true })
  metadata: any;
  
  @ManyToOne(() => LeadState, state => state.transitions)
  leadState: LeadState;
}
```

### 3. Add State Resolver
Create `app/lead-state/resolvers/lead-state.resolver.ts`:

```typescript
--- /dev/null
+++ b/app/lead-state/resolvers/lead-state.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { StateMachineService } from '../services/state-machine.service';

@Resolver()
export class LeadStateResolver {
  constructor(private stateMachine: StateMachineService) {}
  
  @Query(() => LeadState)
  async leadState(@Args('leadId') leadId: string) {
    return this.stateMachine.getLeadState(leadId);
  }
  
  @Mutation(() => Boolean)
  async transitionLead(
    @Args('leadId') leadId: string,
    @Args('newState') newState: string,
    @Args('trigger') trigger: string,
    @Args('metadata', { nullable: true }) metadata: any
  ) {
    return this.stateMachine.transitionLead(leadId, newState, trigger, metadata);
  }
  
  @Query(() => [String])
  async availableTransitions(@Args('leadId') leadId: string) {
    const state = await this.stateMachine.getLeadState(leadId);
    return this.stateMachine.getAvailableTransitions(state.currentState);
  }
}
```

### 4. Integrate with Campaign Service
Update `app/campaign/services/campaign.service.ts`:

```typescript
--- a/app/campaign/services/campaign.service.ts
+++ b/app/campaign/services/campaign.service.ts
  async processCampaignResponse(leadId: string, response: CampaignResponse) {
    // Existing response processing...
    
    // Update lead state based on response
    const newState = this.determineStateFromResponse(response);
    if (newState) {
      await this.stateMachine.transitionLead(
        leadId,
        newState,
        'campaign_response',
        { campaignId: response.campaignId, responseType: response.type }
      );
    }
  }
  
  private determineStateFromResponse(response: CampaignResponse): string | null {
    switch (response.type) {
      case 'interested':
        return 'qualified';
      case 'unsubscribe':
        return 'disqualified';
      case 'converted':
        return 'won';
      default:
        return null;
    }
  }
```

### 5. Add Automated Transitions
Create `app/lead-state/services/automated-transitions.service.ts`:

```typescript
--- /dev/null
+++ b/app/lead-state/services/automated-transitions.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StateMachineService } from './state-machine.service';

@Injectable()
export class AutomatedTransitionsService {
  constructor(private stateMachine: StateMachineService) {}
  
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processStaleLeads() {
    // Move leads that haven't been touched in 30 days to nurturing
    const staleLeads = await this.findStaleLeads(30);
    
    for (const lead of staleLeads) {
      await this.stateMachine.transitionLead(
        lead.id,
        'nurturing',
        'automated_stale',
        { daysStale: 30 }
      );
    }
  }
  
  @Cron(CronExpression.EVERY_WEEK)
  async reEngageLostLeads() {
    // Move lost leads back to re-engage after 90 days
    const lostLeads = await this.findLostLeadsOlderThan(90);
    
    for (const lead of lostLeads) {
      await this.stateMachine.transitionLead(
        lead.id,
        're_engage',
        'automated_reengage',
        { daysSinceLost: 90 }
      );
    }
  }
  
  private async findStaleLeads(days: number) {
    // Find leads in 'new' or 'qualified' state with no recent activity
    return await this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.lastActivity < :date', { date: new Date(Date.now() - days * 24 * 60 * 60 * 1000) })
      .andWhere('lead.state IN (:...states)', { states: ['new', 'qualified'] })
      .getMany();
  }
}
```

## Dependencies
- `lead-management-orchestrator` - For lead data access
- `campaign` - For campaign-based state transitions
- `inbox` - For interaction-based transitions
- `lead-journey-tracker` - For journey context in state decisions

## Testing
- Unit tests for state machine logic
- Integration tests for transition workflows
- Edge case testing for invalid transitions
- Performance tests for bulk state updates

## Notes
- Implement state machine as configurable per tenant
- Provide audit trail for all state changes
- Support custom state definitions and transitions
- Integrate with existing campaign and inbox services
- Ensure atomic state transitions with rollback capability