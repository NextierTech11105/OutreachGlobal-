# Skill Dependency Graph

## Visual Architecture

```
                ┌─────────────────────┐
                │   DATA INGESTION    │
                │ data-lake-orchestration │
                └──────────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ list-management │ │    LUCI     │ │ lead-state-mgr  │
│    handler      │ │  enrichment │ │   (tracking)    │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                  │
         └────────────────┼──────────────────┘
                          ▼
                ┌─────────────────────┐
                │  ML Intelligence    │
                │     Engine          │
                │  (lead scoring,     │
                │   predictions)      │
                └──────────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ campaign-       │ │  ai-agent   │ │  workflow-      │
│ optimizer       │ │  lifecycle  │ │  orchestration  │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                  │
         └────────────────┼──────────────────┘
                          ▼
                ┌─────────────────────┐
                │   AGENT EXECUTION   │
                │  GIANNA → CATHY →   │
                │  SABRINA → COPILOT  │
                └─────────────────────┘
```

## Data Flow

### Tier 1: Foundation
1. **data-lake-orchestration-agent** → Raw data import and storage
2. **luci-research-agent** → Lead enrichment and research
3. **ml-intelligence-engine** → AI-powered scoring and predictions

### Tier 2: Data Management
4. **list-management-handler** → Lead list CRUD operations
5. **lead-state-manager** → Lifecycle state transitions
6. **lead-journey-tracker** → Interaction analytics

### Tier 3: Execution
7. **ai-agent-lifecycle-management** → AI agent deployment/scaling
8. **workflow-orchestration-engine** → Multi-step process coordination
9. **campaign-optimizer** → Outreach campaign optimization

### Tier 4: Intelligence
10. **ai-co-pilot-response-generator** → AI response suggestions
11. **contextual-orchestrator** → Skill routing and chaining

## Key Dependencies

| Skill | Depends On | Used By |
|-------|------------|---------|
| data-lake-orchestration-agent | - | list-management-handler, luci-research-agent |
| luci-research-agent | data-lake-orchestration-agent | ml-intelligence-engine, lead-state-manager |
| ml-intelligence-engine | luci-research-agent | campaign-optimizer, list-management-handler, ai-co-pilot-response-generator |
| list-management-handler | data-lake-orchestration-agent, ml-intelligence-engine | campaign-optimizer, lead-journey-tracker |
| lead-state-manager | luci-research-agent | lead-journey-tracker, workflow-orchestration-engine |
| lead-journey-tracker | list-management-handler, lead-state-manager | campaign-optimizer |
| ai-agent-lifecycle-management | - | workflow-orchestration-engine |
| workflow-orchestration-engine | ai-agent-lifecycle-management, lead-state-manager | campaign-optimizer |
| campaign-optimizer | ml-intelligence-engine, list-management-handler, workflow-orchestration-engine | - |
| ai-co-pilot-response-generator | ml-intelligence-engine | - |
| contextual-orchestrator | All skills | User requests |

## Integration Points

### Database Layer
- All skills share multi-tenant database schemas
- Common tables: teams, leads, campaigns, messages
- Shared services: database.service.ts, transaction management

### Message Queue Layer
- BullMQ for background job processing
- Shared queues: enrichment, campaigns, ai-processing
- Event-driven communication between skills

### API Layer
- GraphQL resolvers for skill-specific operations
- Shared authentication and authorization
- Multi-tenant request context

### External APIs
- SignalHouse: SMS delivery
- Twilio: Voice communications
- OpenAI/Anthropic: AI processing
- Tracerfy/Trestle: Data enrichment