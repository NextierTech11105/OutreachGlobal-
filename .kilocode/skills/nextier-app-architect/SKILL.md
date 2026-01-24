---
name: nextier-app-architect
description: Comprehensive architect agent for the OutreachGlobal Nextier monorepo with NestJS API, Next.js frontend, and enterprise AI integrations
---

# Nextier App Architect

## Overview
A specialized architect agent designed specifically for the OutreachGlobal Nextier monorepo. Provides comprehensive understanding of the NestJS API architecture, Next.js frontend patterns, Nx monorepo structure, Digital Ocean infrastructure, and enterprise integrations. Enables intelligent code generation, refactoring, and feature development that aligns perfectly with the existing codebase patterns, multi-tenant architecture, AI agent ecosystem, and cloud infrastructure best practices.

## Key Features
- Deep understanding of OutreachGlobal's NestJS + Next.js + Nx architecture
- Multi-tenant SaaS patterns with team-based isolation
- AI agent integration (GIANNA, CATHY, NEVA, LUCI, SABRINA)
- Enterprise integrations (SignalHouse, Twilio, Tracerfy, Trestle)
- BullMQ job processing and workflow orchestration
- GraphQL API with Apollo Server
- Drizzle ORM with PostgreSQL and multi-tenant schemas
- Code quality enforcement and automated fixes
- Scalability planning and performance optimization
- Nx monorepo expertise with advanced workspace patterns
- Digital Ocean infrastructure architecture and domain management
- Cloud-native deployment strategies and cost optimization

## Code References
- **API Structure**: `apps/api/src/app/` - 30+ NestJS modules
- **Frontend Structure**: `apps/front/src/` - Next.js with feature-based routing
- **Database**: `apps/api/src/database/` - Drizzle ORM schemas
- **Integrations**: `apps/api/src/lib/` - SignalHouse, Twilio, AI clients
- **Monorepo Config**: `nx.json`, `package.json` - Nx workspace setup
- **Skills Ecosystem**: `.kilocode/skills/` - All agent capabilities

## Current State

### What Already Exists
- **Complete API**: 30+ NestJS modules with full business logic
- **AI Agents**: GIANNA (SDR), CATHY (nudger), NEVA (research), LUCI (enrichment), SABRINA (intelligence)
- **Integrations**: SignalHouse SMS, Twilio voice, Tracerfy tracing, Trestle data orchestration
- **Infrastructure**: BullMQ queues, Redis caching, PostgreSQL with multi-tenancy
- **Frontend**: Next.js with shadcn/ui, feature-based routing, team contexts
- **Skills System**: Comprehensive agent ecosystem for development tasks

### What Still Needs to be Built
- Enhanced AI agent implementations
- Advanced ML intelligence features
- Enterprise scalability optimizations
- Additional integration connectors
- Performance monitoring dashboards

## Architecture Deep Dive

### API Architecture (NestJS + Fastify)
```typescript
// apps/api/src/main.ts - Fastify adapter with Pino logging
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({
    disableRequestLogging: true, // Pino handles logging
    bodyLimit: ONE_HUNDRED_MB,
  })
);

// Global prefix and CORS
app.setGlobalPrefix("api", {
  exclude: ["/", "/graphql", "/version"],
});

// Multi-tenant interceptors
{
  provide: APP_INTERCEPTOR,
  useClass: TenantContextInterceptor, // Team-based isolation
}
```

### Module Structure Pattern
```typescript
// Standard NestJS module pattern used across all 30+ modules
@CustomModule({
  name: 'ModuleName',
  imports: [TeamModule, DatabaseModule, AiOrchestratorModule],
  controllers: [ModuleController],
  providers: [ModuleService, ModuleResolver],
  exports: [ModuleService],
})
export class ModuleNameModule {}

// Key patterns:
// - CustomModule decorator for consistency
// - TeamModule import for multi-tenancy
// - DatabaseModule for data access
// - Service + Controller + Resolver pattern
// - Export services for cross-module usage
```

### Multi-Tenant Architecture
```typescript
// Team-based isolation throughout the system
interface TeamContext {
  teamId: string;
  userId: string;
  role: 'admin' | 'manager' | 'rep';
}

// Database RLS (Row Level Security)
const tenantQuery = this.db
  .select()
  .from(table)
  .where(eq(table.teamId, teamId));

// API routes with team validation
@Post('teams/:teamId/resource')
async createResource(@Param('teamId') teamId: string, @Body() data) {
  // Automatic team validation via interceptors
}
```

### AI Agent Integration Pattern
```typescript
// All AI agents follow this integration pattern
@Injectable()
export class AgentService {
  constructor(
    private aiOrchestrator: AiOrchestratorService, // Multi-provider AI
    private personalityService: PersonalityService, // Shared personality system
    private queueService: BullQueueService,        // Async processing
    private metricsService: MetricsService         // Performance tracking
  ) {}

  async processRequest(teamId: string, request: AgentRequest) {
    // 1. Validate team access
    await this.validateTeamAccess(teamId, request);

    // 2. Get personality/context
    const context = await this.buildContext(teamId, request);

    // 3. Process with AI orchestrator
    const result = await this.aiOrchestrator.process({
      teamId,
      agent: this.agentType,
      context,
      request
    });

    // 4. Queue follow-up actions
    await this.queueService.addJob('agent-followup', {
      teamId,
      agentType: this.agentType,
      result
    });

    // 5. Track metrics
    await this.metricsService.trackAgentUsage(teamId, this.agentType);

    return result;
  }
}
```

### Database Patterns (Drizzle ORM)
```typescript
// Multi-tenant schema pattern
export const teams = pgTable('teams', {
  id: ulidPrimaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamps().createdAt,
  updatedAt: timestamps().updatedAt,
});

// Team-scoped tables
export const campaigns = pgTable('campaigns', {
  id: ulidPrimaryKey(),
  teamId: ulidForeignKey('teams.id'), // Multi-tenant relationship
  name: varchar('name', { length: 255 }).notNull(),
  status: campaignStatusEnum('status').default('draft'),
  createdAt: timestamps().createdAt,
  updatedAt: timestamps().updatedAt,
});

// RLS queries
const teamCampaigns = await db
  .select()
  .from(campaigns)
  .where(eq(campaigns.teamId, teamId));
```

### Queue Processing (BullMQ)
```typescript
// Job processing pattern used throughout
@Injectable()
export class QueueProcessor {
  @Process('agent-task')
  async processAgentTask(job: Job<AgentTaskData>) {
    const { teamId, taskType, data } = job.data;

    try {
      // Process with team context
      const result = await this.processWithTeamContext(teamId, taskType, data);

      // Update job progress
      await job.updateProgress(50);

      // Complete processing
      await job.updateProgress(100);

      return result;
    } catch (error) {
      // Handle failures with retry logic
      await this.handleJobFailure(job, error);
      throw error;
    }
  }
}

// Queue registration in modules
BullModule.registerQueue({
  name: 'agent-queue',
}),
```

### Integration Patterns
```typescript
// SignalHouse SMS integration
@Injectable()
export class SignalHouseService {
  async sendSMS(teamId: string, phoneNumber: string, message: string) {
    // Get team SignalHouse config
    const config = await this.getTeamSignalHouseConfig(teamId);

    // Send via SignalHouse API
    const result = await this.signalHouseApi.sendMessage({
      apiKey: config.apiKey,
      phoneNumber,
      message,
      campaignId: config.campaignId
    });

    // Track delivery
    await this.trackDelivery(teamId, result);

    return result;
  }
}

// Webhook processing
@Post('webhooks/signalhouse')
async processSignalHouseWebhook(@Body() webhook: SignalHouseWebhook) {
  // Extract team from phone number
  const teamId = await this.phoneMappingService.getTeamForNumber(webhook.to);

  // Route to appropriate agent
  await this.agentRouter.routeWebhook(teamId, 'signalhouse', webhook);
}
```

## Implementation Guidelines

### Code Generation Rules
```typescript
// ALWAYS follow these patterns:

// 1. Module Structure
@CustomModule({
  name: 'FeatureName',
  imports: [TeamModule, DatabaseModule], // Always include
  controllers: [FeatureController],
  providers: [FeatureService, FeatureResolver], // Service + Resolver pattern
  exports: [FeatureService],
})

// 2. Service Methods
@Injectable()
export class FeatureService {
  async methodName(teamId: string, ...args) {
    // Always validate team access first
    await this.validateTeamAccess(teamId);

    // Use team-scoped queries
    const data = await this.db
      .select()
      .from(table)
      .where(eq(table.teamId, teamId));

    return data;
  }
}

// 3. Controller Methods
@Controller('feature')
export class FeatureController {
  constructor(private featureService: FeatureService) {}

  @Post('teams/:teamId/action')
  async action(@Param('teamId') teamId: string, @Body() data) {
    // Team ID from route params
    return this.featureService.action(teamId, data);
  }
}

// 4. GraphQL Resolvers
@Resolver('Feature')
export class FeatureResolver {
  @Query(() => [Feature])
  async features(@Args('teamId') teamId: string) {
    return this.featureService.getFeatures(teamId);
  }
}
```

### Error Handling Patterns
```typescript
// Consistent error handling
try {
  const result = await this.service.method(teamId, data);
  return result;
} catch (error) {
  // Log with correlation ID
  this.logger.error('Operation failed', {
    teamId,
    error: error.message,
    correlationId: this.correlationId
  });

  // Throw appropriate HTTP exception
  throw new BadRequestException('Operation failed');
}
```

### Testing Patterns
```typescript
// Unit test structure
describe('FeatureService', () => {
  let service: FeatureService;
  let mockDb: MockProxy<DatabaseService>;

  beforeEach(async () => {
    mockDb = mock<DatabaseService>();
    service = new FeatureService(mockDb);
  });

  it('should validate team access', async () => {
    // Test team validation
  });

  it('should return team-scoped data', async () => {
    // Test data isolation
  });
});

// E2E test structure
describe('Feature (e2e)', () => {
  it('should create feature for team', () => {
    return request(app.getHttpServer())
      .post('/api/feature/teams/team-123/action')
      .set('Authorization', 'Bearer token')
      .send({ data: 'test' })
      .expect(201);
  });
});
```

## Skills Integration

### 🤖 AI Agent Ecosystem
- **GIANNA**: SDR campaigns with personality-driven messaging
- **CATHY**: Conversational nudging with human oversight
- **NEVA**: Business research and contextual insights
- **LUCI**: Lead enrichment with Tracerfy/Trestle
- **SABRINA**: Sales intelligence and qualification

### 🛠️ Development Tools
- **Code Quality Enforcer**: Automated fixes for initialization issues
- **Technical Documentation Agent**: PRD/SOP/SDD generation
- **SignalHouse Scalability Audit**: Enterprise integration planning
- **Contextual Orchestrator**: Skill routing and coordination

### 📊 Business Logic
- **List Management Handler**: Lead list CRUD with segmentation
- **Lead State Manager**: Lifecycle state transitions
- **Lead Journey Tracker**: Interaction analytics
- **Campaign Optimizer**: ML-enhanced campaign optimization
- **Cost Guardian**: Usage monitoring and budget control

## Dependencies

### Prerequisite Skills
- All existing skills in `.kilocode/skills/` ecosystem
- Understanding of NestJS, Next.js, Nx monorepo patterns
- Familiarity with multi-tenant SaaS architecture
- Knowledge of AI agent integration patterns

### Existing Services Used
- `apps/api/src/app/` - All 30+ NestJS modules
- `apps/front/src/` - Next.js frontend structure
- `apps/api/src/database/` - Drizzle ORM schemas
- `apps/api/src/lib/` - Integration services
- `.kilocode/skills/` - Development skill ecosystem

### External APIs Required
- SignalHouse API - SMS/MMS delivery
- Twilio API - Voice communications
- Tracerfy API - Distributed tracing
- Trestle API - Data orchestration
- OpenAI/Anthropic APIs - AI processing

## Nx Monorepo Expertise

### Advanced Workspace Patterns
```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["{projectRoot}/**/*", "!{projectRoot}/**/*.spec.ts"]
    }
  },
  "namedInputs": {
    "sharedCode": [
      "{workspaceRoot}/libs/shared/src",
      "{workspaceRoot}/libs/shared/assets"
    ]
  },
  "plugins": [
    {
      "plugin": "@nx/next/plugin",
      "options": {
        "buildTargetName": "build",
        "devTargetName": "dev"
      }
    }
  ]
}
```

### Dependency Optimization
- Parallel builds with `parallel: 3`
- Shared library caching
- Affected commands for efficient CI/CD
- Project-specific target configurations

## Digital Ocean Infrastructure Architecture

### Production Deployment Stack
```yaml
services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]

  frontend:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
```

### Domain & SSL Management
```bash
# Automated SSL with certbot
certbot certonly --dns-digitalocean -d outreachglobal.com -d *.outreachglobal.com

# DNS configuration
doctl compute domain records create outreachglobal.com \
  --record-type A --record-name api --record-data YOUR_LOAD_BALANCER_IP
```

### Monitoring & Observability
- Prometheus for metrics collection
- Grafana for visualization
- Node/PostgreSQL exporters
- Alert manager for notifications

### Backup & Disaster Recovery
- Automated PostgreSQL dumps
- Digital Ocean Spaces for storage
- 30-day retention policy
- Point-in-time recovery capabilities

### Cost Optimization
- Rightsizing droplets based on usage
- Reserved instances for predictable workloads
- Auto-scaling to prevent over-provisioning
- Object storage for static assets

## Usage Instructions

### For Feature Development
1. **Analyze Requirements**: Use existing module patterns as reference
2. **Follow Architecture**: Implement team-scoped services with proper isolation
3. **Integrate AI**: Leverage AI Orchestrator for intelligent features
4. **Add Tests**: Include unit and E2E tests following established patterns
5. **Update Skills**: Document new capabilities in appropriate SKILL.md files

### For Integration Development
1. **Check Existing**: Review `apps/api/src/lib/` for similar integrations
2. **Follow Patterns**: Use established service integration patterns
3. **Add Configuration**: Include team-specific config in database schemas
4. **Handle Webhooks**: Implement proper webhook processing with team routing
5. **Add Monitoring**: Include metrics and error tracking

### For AI Agent Development
1. **Use Orchestrator**: Integrate via `AiOrchestratorService`
2. **Share Personality**: Leverage GIANNA's personality system
3. **Queue Processing**: Use BullMQ for async operations
4. **Team Isolation**: Ensure all operations are team-scoped
5. **Metrics Tracking**: Include performance and usage metrics

## Quality Assurance

### Code Standards
- **TypeScript**: Strict typing with interfaces for all data structures
- **Error Handling**: Consistent exception patterns with proper logging
- **Testing**: 80%+ coverage with unit and integration tests
- **Documentation**: Auto-generated API docs and skill documentation

### Performance Standards
- **Response Times**: API responses <500ms, AI operations <2000ms
- **Scalability**: Support 1000+ concurrent teams
- **Reliability**: 99.9% uptime with proper error recovery
- **Efficiency**: Optimized database queries with proper indexing

### Security Standards
- **Multi-Tenant**: Complete data isolation between teams
- **Authentication**: JWT with proper role-based access
- **Input Validation**: Zod schemas for all inputs
- **Audit Logging**: Comprehensive activity tracking

This architect agent provides the complete context needed to work effectively within the OutreachGlobal Nextier monorepo, ensuring all new development aligns with established patterns, maintains code quality, and leverages the full power of the integrated AI agent ecosystem.