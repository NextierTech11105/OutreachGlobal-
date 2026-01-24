---
name: list-management-handler
description: Handles lead list creation, segmentation, and management
---

# List Management Handler

## Overview
Provides comprehensive lead list management capabilities for the OutreachGlobal platform. Enables creation, segmentation, filtering, and maintenance of lead lists with advanced criteria, dynamic updates, and integration with campaigns and workflows.

## Key Features
- Dynamic list creation with complex filtering
- Real-time list updates based on lead changes
- List segmentation and sub-list management
- Integration with campaign targeting
- List performance analytics and optimization
- Automated list maintenance and cleanup

## Current State

### What Already Exists
- **Team Business Lists**: `apps/front/src/features/team/components/business-list-settings.tsx` - Basic list management UI
- **Lead Segmentation**: Basic filtering in existing services
- **List Queries**: `apps/front/src/features/team/queries/business-list-settings.query.ts` - List data access

### What Still Needs to be Built
- Advanced list creation with complex criteria
- Dynamic list updates and triggers
- List hierarchy and sub-list management
- Performance optimization for large lists
- List analytics and reporting
- Automated list maintenance rules

## Implementation Steps

### 1. Create List Management Service
Create `app/list-management/services/list-management.service.ts`:

```typescript
--- /dev/null
+++ b/app/list-management/services/list-management.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadList } from '../entities/lead-list.entity';
import { ListCriteria } from '../entities/list-criteria.entity';

@Injectable()
export class ListManagementService {
  constructor(
    @InjectRepository(LeadList)
    private listRepo: Repository<LeadList>,
    @InjectRepository(ListCriteria)
    private criteriaRepo: Repository<ListCriteria>
  ) {}

  async createList(
    tenantId: string,
    name: string,
    criteria: ListCriteriaInput,
    parentListId?: string
  ): Promise<LeadList> {
    const list = this.listRepo.create({
      tenantId,
      name,
      criteria: await this.saveCriteria(criteria),
      parentListId,
      isActive: true,
      createdAt: new Date()
    });
    
    const savedList = await this.listRepo.save(list);
    
    // Populate initial leads
    await this.populateList(savedList.id);
    
    return savedList;
  }
  
  async updateList(
    listId: string,
    updates: Partial<LeadList>
  ): Promise<LeadList> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    
    if (updates.criteria) {
      list.criteria = await this.saveCriteria(updates.criteria);
      // Re-populate list with new criteria
      await this.populateList(listId);
    }
    
    Object.assign(list, updates);
    return this.listRepo.save(list);
  }
  
  async getListLeads(listId: string, pagination?: PaginationInput): Promise<Lead[]> {
    const list = await this.listRepo.findOne({
      where: { id: listId },
      relations: ['criteria']
    });
    
    if (!list) throw new Error('List not found');
    
    const query = this.buildLeadQuery(list.criteria);
    
    if (pagination) {
      query.skip(pagination.offset).take(pagination.limit);
    }
    
    return query.getMany();
  }
  
  async createSegment(
    parentListId: string,
    name: string,
    additionalCriteria: ListCriteriaInput
  ): Promise<LeadList> {
    const parentList = await this.listRepo.findOne({
      where: { id: parentListId },
      relations: ['criteria']
    });
    
    // Combine parent and additional criteria
    const combinedCriteria = this.combineCriteria(parentList.criteria, additionalCriteria);
    
    return this.createList(parentList.tenantId, name, combinedCriteria, parentListId);
  }
  
  private async saveCriteria(criteria: ListCriteriaInput): Promise<ListCriteria> {
    const criteriaEntity = this.criteriaRepo.create({
      filters: criteria.filters,
      sortBy: criteria.sortBy,
      limit: criteria.limit
    });
    
    return this.criteriaRepo.save(criteriaEntity);
  }
  
  private async populateList(listId: string): Promise<void> {
    const list = await this.listRepo.findOne({
      where: { id: listId },
      relations: ['criteria']
    });
    
    const leadIds = await this.buildLeadQuery(list.criteria)
      .select('lead.id')
      .getRawMany();
    
    // Update list-lead associations
    await this.updateListLeads(listId, leadIds.map(row => row.lead_id));
  }
  
  private buildLeadQuery(criteria: ListCriteria) {
    let query = this.leadRepo.createQueryBuilder('lead');
    
    // Apply filters
    criteria.filters.forEach(filter => {
      switch (filter.type) {
        case 'location':
          query.andWhere('lead.location LIKE :location', { location: `%${filter.value}%` });
          break;
        case 'industry':
          query.andWhere('lead.industry = :industry', { industry: filter.value });
          break;
        case 'score':
          query.andWhere('lead.score >= :score', { score: filter.value });
          break;
        case 'lastActivity':
          query.andWhere('lead.lastActivity >= :date', { date: filter.value });
          break;
      }
    });
    
    // Apply sorting
    if (criteria.sortBy) {
      query.orderBy(`lead.${criteria.sortBy.field}`, criteria.sortBy.direction);
    }
    
    // Apply limit
    if (criteria.limit) {
      query.limit(criteria.limit);
    }
    
    return query;
  }
  
  private combineCriteria(parent: ListCriteria, additional: ListCriteriaInput): ListCriteriaInput {
    return {
      filters: [...parent.filters, ...additional.filters],
      sortBy: additional.sortBy || parent.sortBy,
      limit: additional.limit || parent.limit
    };
  }
}
```

### 2. Create List Entities
Create `app/list-management/entities/lead-list.entity.ts`:

```typescript
--- /dev/null
+++ b/app/list-management/entities/lead-list.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { ListCriteria } from './list-criteria.entity';

@Entity()
export class LeadList {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  tenantId: string;
  
  @Column()
  name: string;
  
  @Column({ nullable: true })
  description: string;
  
  @ManyToOne(() => ListCriteria)
  criteria: ListCriteria;
  
  @Column({ nullable: true })
  parentListId: string;
  
  @OneToMany(() => LeadList, list => list.parentListId)
  subLists: LeadList[];
  
  @Column({ default: true })
  isActive: boolean;
  
  @Column()
  createdAt: Date;
  
  @Column({ nullable: true })
  updatedAt: Date;
  
  @Column({ type: 'json', nullable: true })
  metadata: any;
}
```

Create `app/list-management/entities/list-criteria.entity.ts`:

```typescript
--- /dev/null
+++ b/app/list-management/entities/list-criteria.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ListCriteria {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column('json')
  filters: ListFilter[];
  
  @Column('json', { nullable: true })
  sortBy: SortCriteria;
  
  @Column({ nullable: true })
  limit: number;
}

export interface ListFilter {
  type: 'location' | 'industry' | 'score' | 'lastActivity' | 'tags';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: any;
}

export interface SortCriteria {
  field: string;
  direction: 'ASC' | 'DESC';
}
```

### 3. Add List Resolver
Create `app/list-management/resolvers/list-management.resolver.ts`:

```typescript
--- /dev/null
+++ b/app/list-management/resolvers/list-management.resolver.ts
import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { ListManagementService } from '../services/list-management.service';

@Resolver('LeadList')
export class ListManagementResolver {
  constructor(private listService: ListManagementService) {}
  
  @Query(() => [LeadList])
  async leadLists(@Args('tenantId') tenantId: string) {
    return this.listService.getListsByTenant(tenantId);
  }
  
  @Query(() => LeadList)
  async leadList(@Args('id') id: string) {
    return this.listService.getList(id);
  }
  
  @Mutation(() => LeadList)
  async createLeadList(
    @Args('tenantId') tenantId: string,
    @Args('name') name: string,
    @Args('criteria') criteria: ListCriteriaInput
  ) {
    return this.listService.createList(tenantId, name, criteria);
  }
  
  @Mutation(() => LeadList)
  async updateLeadList(
    @Args('id') id: string,
    @Args('updates') updates: LeadListUpdateInput
  ) {
    return this.listService.updateList(id, updates);
  }
  
  @Mutation(() => LeadList)
  async createListSegment(
    @Args('parentListId') parentListId: string,
    @Args('name') name: string,
    @Args('criteria') criteria: ListCriteriaInput
  ) {
    return this.listService.createSegment(parentListId, name, criteria);
  }
  
  @ResolveField(() => [Lead])
  async leads(@Parent() list: LeadList, @Args('pagination', { nullable: true }) pagination: PaginationInput) {
    return this.listService.getListLeads(list.id, pagination);
  }
  
  @ResolveField(() => Int)
  async leadCount(@Parent() list: LeadList) {
    return this.listService.getListLeadCount(list.id);
  }
  
  @ResolveField(() => [LeadList])
  async subLists(@Parent() list: LeadList) {
    return this.listService.getSubLists(list.id);
  }
}
```

### 4. Integrate with Campaign Service
Update `app/campaign/services/campaign.service.ts`:

```typescript
--- a/app/campaign/services/campaign.service.ts
+++ b/app/campaign/services/campaign.service.ts
  async createCampaignFromList(
    listId: string,
    campaignData: CampaignInput
  ): Promise<Campaign> {
    const leads = await this.listService.getListLeads(listId);
    
    const campaign = await this.createCampaign({
      ...campaignData,
      targetLeads: leads.map(lead => lead.id)
    });
    
    // Link campaign to list for ongoing updates
    await this.linkCampaignToList(campaign.id, listId);
    
    return campaign;
  }
  
  async updateCampaignFromList(campaignId: string): Promise<void> {
    const listId = await this.getCampaignListId(campaignId);
    if (!listId) return;
    
    const currentLeads = await this.getCampaignLeads(campaignId);
    const listLeads = await this.listService.getListLeads(listId);
    
    // Add new leads from list
    const newLeads = listLeads.filter(
      lead => !currentLeads.some(cl => cl.id === lead.id)
    );
    
    if (newLeads.length > 0) {
      await this.addLeadsToCampaign(campaignId, newLeads);
    }
  }
```

### 5. Add List Analytics
Create `app/list-management/services/list-analytics.service.ts`:

```typescript
--- /dev/null
+++ b/app/list-management/services/list-analytics.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ListAnalyticsService {
  async getListPerformance(listId: string): Promise<ListPerformance> {
    const leads = await this.listService.getListLeads(listId);
    
    return {
      totalLeads: leads.length,
      averageScore: this.calculateAverageScore(leads),
      conversionRate: await this.calculateConversionRate(leads),
      engagementRate: this.calculateEngagementRate(leads),
      topIndustries: this.getTopIndustries(leads),
      topLocations: this.getTopLocations(leads)
    };
  }
  
  async optimizeList(listId: string): Promise<ListOptimization> {
    const performance = await this.getListPerformance(listId);
    
    const recommendations = [];
    
    if (performance.averageScore < 50) {
      recommendations.push('Consider increasing minimum score threshold');
    }
    
    if (performance.engagementRate < 0.2) {
      recommendations.push('List may need re-engagement campaign');
    }
    
    if (performance.conversionRate < 0.05) {
      recommendations.push('Review qualification criteria');
    }
    
    return {
      currentPerformance: performance,
      recommendations,
      suggestedFilters: this.generateOptimizationFilters(performance)
    };
  }
  
  private calculateAverageScore(leads: Lead[]): number {
    return leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length;
  }
  
  private async calculateConversionRate(leads: Lead[]): Promise<number> {
    const converted = leads.filter(lead => lead.converted).length;
    return converted / leads.length;
  }
  
  private calculateEngagementRate(leads: Lead[]): number {
    const engaged = leads.filter(lead => lead.lastActivity > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
    return engaged / leads.length;
  }
}
```

## Dependencies
- `lead-management-orchestrator` - For lead data access
- `data-export-enrichment-engine` - For list export capabilities
- `campaign` - For campaign targeting integration
- `lead-state-manager` - For state-based filtering

## Testing
- Unit tests for list creation and filtering logic
- Integration tests with lead data
- Performance tests for large list operations
- Analytics accuracy validation

## Notes
- Implement list caching for performance
- Support real-time list updates via WebSocket
- Provide list templates for common use cases
- Include list sharing and collaboration features
- Ensure tenant isolation for all list operations