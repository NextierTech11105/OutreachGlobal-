# OutreachGlobal System Architecture & AI Agent Skills

## 1. System Architecture Overview

### Core Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            OUTREACHGLOBAL PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🌐 FRONTEND LAYER (Next.js + Apollo Client)                                   │
│  ├─ React Components (107 pages)                                              │
│  ├─ Apollo GraphQL Client (/graphql)                                          │
│  ├─ Axios REST Client (/api/rest)                                             │
│  └─ State Management (Context + Stores)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🚀 API LAYER (NestJS + Fastify + Apollo Server)                               │
│  ├─ GraphQL Resolvers (Complex queries, relationships)                        │
│  ├─ REST Controllers (File ops, webhooks, integrations)                       │
│  ├─ Business Logic (Services, CQRS, Event Sourcing)                           │
│  └─ Background Jobs (BullMQ + Redis)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🗄️ DATA LAYER (PostgreSQL + Redis + Spaces)                                   │
│  ├─ Primary DB (38+ tables, Drizzle ORM)                                      │
│  ├─ Cache/Queue (Redis/Upstash)                                               │
│  └─ Object Storage (DO Spaces + CDN)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🤖 AI AGENT LAYER (Anthropic + OpenAI + Custom Logic)                         │
│  ├─ LUCI (Data Intelligence Copilot)                                          │
│  ├─ GIANNA/CATHY/SABRINA (SDR Avatars)                                        │
│  ├─ Auto-Labeling Engine                                                      │
│  └─ Content Nurture System                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🔗 EXTERNAL INTEGRATIONS                                                      │
│  ├─ SignalHouse (SMS/Voice infrastructure)                                    │
│  ├─ Twilio (Voice fallback)                                                   │
│  ├─ Apollo.io (Lead enrichment)                                               │
│  ├─ SendGrid (Email campaigns)                                                │
│  └─ RealEstateAPI (Property data)                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
USER REQUEST → FRONTEND → GRAPHQL/REST → BUSINESS LOGIC → DATABASE/CACHE → AI PROCESSING → EXTERNAL APIs → RESPONSE
                    ↓              ↓              ↓              ↓              ↓              ↓
              Apollo Client   NestJS Modules   Services     Drizzle ORM    Agent Skills   SignalHouse
              (Queries)       (Resolvers)      (Domain)     (Migrations)   (Execution)    (Delivery)
```

## 2. REST API Synergies with GraphQL

### Hybrid API Architecture

The platform implements a **strategic hybrid approach** combining GraphQL's flexibility with REST's simplicity:

#### GraphQL Layer (`/graphql`)
- **Purpose:** Complex data operations, relationships, real-time updates
- **Implementation:** Apollo Server with auto-schema generation
- **Features:**
  - Persisted queries (Redis cached, 30-day TTL)
  - DataLoader pattern (N+1 query prevention)
  - JWT authentication with team context
  - Type-safe schema (auto-generated from TypeScript)

#### REST Layer (`/api/rest`)
- **Purpose:** File operations, webhooks, external API proxying
- **Implementation:** Fastify controllers with NestJS decorators
- **Features:**
  - Standard HTTP methods (GET, POST, PUT, DELETE)
  - File upload support (100MB limit)
  - Webhook handling (SignalHouse, Twilio)
  - External service integration

### Synergy Patterns

#### 1. **Lead Management Synergy**
```typescript
// GraphQL Resolver (Complex queries)
@Resolver(Lead)
export class LeadResolver {
  @Query(() => LeadConnection)
  async leads(@Args() args: LeadConnectionArgs, @Context() ctx) {
    return this.leadService.findMany(args, ctx.teamId);
  }
}

// REST Controller (File operations)
@Controller('leads')
export class LeadController {
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importLeads(@UploadedFile() file, @Auth() user) {
    return this.leadService.importFromCSV(file, user.teamId);
  }
}
```

#### 2. **Authentication Synergy**
- **GraphQL:** JWT tokens in `Authorization: Bearer <token>` header
- **REST:** Same JWT tokens via interceptor
- **Shared:** `AuthService` validates tokens, extracts team context
- **Result:** Consistent authentication across both APIs

#### 3. **Tenant Context Synergy**
```typescript
// Shared Interceptor (app/common/interceptors/correlation-id.interceptor.ts)
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const teamId = this.extractTeamId(request);
    request.team = { id: teamId }; // Available in both GraphQL context and REST handlers
    return next;
  }
}
```

#### 4. **Consumer/Event Synergy**
```typescript
// BullMQ Consumer (Background processing)
@Processor('lead-processing')
export class LeadConsumer {
  @Process('enrich-lead')
  async enrichLead(job: Job<EnrichLeadData>) {
    // REST API calls to external services
    const enriched = await this.apolloService.enrich(job.data.leadId);
    // GraphQL mutations to update database
    await this.leadService.update(job.data.leadId, enriched);
  }
}
```

### Asynchronous Synergies

#### Event-Driven Data Flow
```
GraphQL Mutation → Event Published → Consumer Processes → REST API Calls → Database Update → GraphQL Subscription
```

#### Background Job Integration
- **GraphQL:** Initiates long-running operations
- **BullMQ:** Processes jobs asynchronously
- **REST:** External API communications
- **Result:** Non-blocking user experience

## 3. AI Agent Skills & Capabilities

### Core AI Architecture

The platform features a **multi-agent AI ecosystem** with specialized skills for outreach automation:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               AI AGENT ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🎯 EXECUTION ENGINE                                                           │
│  ├─ Execution Chain (execution-chain.ts)                                      │
│  ├─ Execution Flow (execution-flow.ts)                                        │
│  └─ Workflow Orchestration                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🤖 AI WORKERS                                                                 │
│  ├─ GIANNA (Opener) - Initial outreach                                         │
│  ├─ CATHY (Nudger) - Follow-up sequences                                       │
│  ├─ SABRINA (Closer) - Appointment booking                                     │
│  └─ LUCI (Copilot) - Data intelligence                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🏷️ AUTO-LABELING ENGINE                                                       │
│  ├─ Lead Scoring (lead-scoring.ts)                                            │
│  ├─ Persona Detection                                                          │
│  ├─ Intent Classification                                                      │
│  └─ Readiness Assessment                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  📧 CONTENT NURTURE SYSTEM                                                     │
│  ├─ Message Personalization                                                    │
│  ├─ Sequence Optimization                                                      │
│  ├─ A/B Testing Framework                                                      │
│  └─ Performance Analytics                                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Expert Agent Skills Matrix

#### 1. **Lead Intelligence & Scoring**
```typescript
// apps/api/src/app/lead/lead-scoring.ts
export class LeadScoringEngine {
  // ML-ready scoring algorithm
  async calculateScore(lead: Lead, context: ScoringContext): Promise<LeadScore> {
    const factors = {
      recency: this.calculateRecencyScore(lead.createdAt),
      engagement: this.calculateEngagementScore(lead.activities),
      demographics: this.calculateDemographicScore(lead.properties),
      intent: await this.aiIntentClassification(lead.messages),
      market: this.calculateMarketReadiness(lead.sector)
    };
    return this.weightedScore(factors);
  }
}
```

**Capabilities:**
- Real-time lead scoring (0-100 scale)
- Intent classification from message history
- Demographic and market analysis
- Recency and engagement weighting
- ML model training data generation

#### 2. **Content Nurture & Sequencing**
```typescript
// apps/api/src/app/lead/consumers/content-nurture.consumer.ts
@Processor('content-nurture')
export class ContentNurtureConsumer {
  @Process('optimize-sequence')
  async optimizeSequence(job: Job<NurtureJobData>) {
    const lead = await this.leadService.findOne(job.data.leadId);
    const sequence = await this.campaignService.getSequence(job.data.campaignId);

    // AI-powered sequence optimization
    const optimized = await this.aiService.optimizeSequence({
      lead: lead,
      sequence: sequence,
      history: lead.messageHistory,
      performance: sequence.analytics
    });

    await this.campaignService.updateSequence(sequence.id, optimized);
  }
}
```

**Capabilities:**
- Dynamic sequence personalization
- A/B testing of message variants
- Performance-based optimization
- Multi-channel content adaptation
- Automated follow-up timing

#### 3. **Auto-Triggering & Workflow Automation**
```typescript
// apps/api/src/app/lead/consumers/auto-trigger.consumer.ts
@Processor('auto-trigger')
export class AutoTriggerConsumer {
  @Process('evaluate-triggers')
  async evaluateTriggers(job: Job<TriggerEvaluationData>) {
    const triggers = await this.triggerService.findActive(job.data.teamId);

    for (const trigger of triggers) {
      const shouldFire = await this.evaluateCondition(trigger.condition, job.data.context);

      if (shouldFire) {
        await this.executeAction(trigger.action, job.data.context);
        await this.logTriggerExecution(trigger.id, job.data);
      }
    }
  }
}
```

**Capabilities:**
- Event-driven automation
- Conditional logic evaluation
- Multi-step workflow execution
- Integration with external systems
- Audit trail for all automations

#### 4. **LUCI Data Intelligence Copilot**
```typescript
// apps/front/src/app/api/luci/pipeline/route.ts
export async function POST(request: Request) {
  const { data, teamId } = await request.json();

  // Data intelligence pipeline
  const intelligence = await luciPipeline.orchestrate({
    data: data,
    teamId: teamId,
    enrichments: ['apollo', 'skip_trace', 'property_data'],
    scoring: true,
    segmentation: true
  });

  return Response.json(intelligence);
}
```

**Capabilities:**
- Bulk data enrichment (250 records/batch)
- Intelligent data segmentation
- Lead scoring and prioritization
- Property and business intelligence
- Real-time data validation

#### 5. **SDR Avatar Personalization**
```typescript
// AI Worker Configuration
const GIANNA_CONFIG = {
  personality: 'professional_opener',
  tone: 'confident_helpful',
  expertise: 'business_development',
  triggers: ['new_lead', 'cold_outreach'],
  responses: {
    introduction: "Hi {firstName}, I help {businessType} owners like you...",
    objection_handling: "I understand that concern. Many of our clients initially...",
    qualification: "To best serve you, could you tell me about..."
  }
};
```

**Capabilities:**
- Persona-based communication
- Industry-specific messaging
- Objection handling scripts
- Qualification frameworks
- Performance tracking and optimization

### AI Integration Patterns

#### Synchronous AI (Real-time)
- Lead scoring during import
- Intent classification for responses
- Content personalization
- Auto-labeling suggestions

#### Asynchronous AI (Background)
- Bulk data enrichment
- Sequence optimization
- Performance analytics
- ML model training

#### External AI Services
- **Anthropic Claude:** Complex reasoning, content generation
- **OpenAI GPT:** Response generation, classification
- **Custom Models:** Lead scoring, intent detection

### Expert-Level Features

#### 1. **Execution Chain Orchestration**
```typescript
// lib/execution-chain.ts
export class ExecutionChain {
  async execute(chain: ExecutionStep[]): Promise<ExecutionResult> {
    const context = {};
    for (const step of chain) {
      try {
        const result = await this.executeStep(step, context);
        context[step.outputKey] = result;
      } catch (error) {
        await this.handleStepFailure(step, error, context);
      }
    }
    return context;
  }
}
```

#### 2. **Trestle Integration Framework**
```typescript
// lib/trestle.ts
export class TrestleClient {
  async executeWorkflow(workflowId: string, input: any): Promise<any> {
    // Complex workflow orchestration
    const workflow = await this.loadWorkflow(workflowId);
    const execution = await this.orchestrateExecution(workflow, input);
    return execution.result;
  }
}
```

#### 3. **Workflow Engine**
- Conditional branching
- Parallel execution
- Error handling and retries
- State persistence
- Monitoring and logging

This architecture enables sophisticated AI-driven outreach automation while maintaining developer productivity through the hybrid GraphQL/REST approach and modular agent system.