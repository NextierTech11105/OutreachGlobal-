---
name: workflow-orchestration-engine
description: Manages complex multi-step workflows involving multiple AI agents, integrations, and conditional logic (e.g., LUCI → Gianna → Cathy pipeline)
---

# Workflow Orchestration Engine Instructions

## Purpose
EXTEND existing BullMQ queues and AI Orchestrator at `apps/api/src/app/ai-orchestrator/` to orchestrate complex, multi-step workflows that coordinate AI agents with external integrations, ensuring reliable execution, state management, and conditional logic in OutreachGlobal's multi-tenant platform.

## When to Use This Skill
- Designing new agent interaction flows
- Implementing conditional branching in workflows
- Managing state across multiple agent handoffs
- Troubleshooting workflow failures
- Optimizing workflow performance
- Adding new integration points to existing flows

## Workflow Architecture

### Core Workflow Types
- **Sequential**: LUCI research → AI Orchestrator processing → Sabrina follow-up
- **Parallel**: Multiple agents processing different aspects simultaneously
- **Conditional**: Branch based on agent responses or external events
- **Event-driven**: Triggered by webhooks or scheduled events

### Workflow Components
- **Triggers**: Events that start workflows
- **Steps**: Individual agent or integration calls
- **Conditions**: Decision points for branching
- **State**: Data passed between steps
- **Handlers**: Error and timeout management

## Orchestration Framework

### 1. Workflow Definition
**Define workflows in declarative format:**
```typescript
const outreachWorkflow = {
  id: 'outreach-campaign',
  teamId: 'team_123',
  steps: [
    {
      id: 'research',
      agent: 'LUCI',
      action: 'research_lead',
      inputs: { leadId: '{{trigger.leadId}}' },
      timeout: 30000
    },
    {
      id: 'outreach',
      agent: 'AI_ORCHESTRATOR',
      action: 'generate_message',
      inputs: { research: '{{steps.research.output}}' },
      condition: '{{steps.research.output.confidence > 0.7}}'
    },
    {
      id: 'followup',
      agent: 'SABRINA',
      action: 'schedule_followup',
      inputs: { conversation: '{{steps.outreach.output}}' },
      dependsOn: ['research', 'outreach']
    }
  ],
  errorHandler: 'rollback_workflow'
};
```

### 2. State Management
**Maintain workflow state across steps:**
```typescript
class WorkflowEngine {
  async executeStep(workflowId: string, stepId: string, state: WorkflowState) {
    const step = this.getStep(workflowId, stepId);
    const agent = await aiOrchestrator.getAgent(step.agent, state.teamId);

    try {
      const result = await agent.execute(step.action, step.inputs, state);
      await bullMQStateManager.update(workflowId, { [stepId]: result });
      return result;
    } catch (error) {
      await errorHandler.handle(step, error, state);
      throw error;
    }
  }
}
```

### 3. Conditional Logic
**Implement branching based on results:**
```typescript
const evaluateCondition = (condition: string, state: WorkflowState) => {
  // Simple expression evaluator
  const context = {
    steps: state.steps,
    trigger: state.trigger,
    team: state.teamId
  };

  return evaluateExpression(condition, context);
};
```

## Integration Coordination

### External Service Integration
- **SignalHouse**: SMS delivery coordination at `apps/api/src/lib/signalhouse/signalhouse.service.ts`
- **Twilio**: Voice call orchestration at `apps/api/src/lib/twilio/`
- **Tracerfy**: Data enrichment workflows at `apps/api/src/app/luci/clients/tracerfy.client.ts`
- **Trestle**: Data enrichment workflows at `apps/api/src/app/luci/clients/trestle.client.ts`

### Data Flow Management
**Ensure data consistency across integrations:**
```typescript
const dataCoordinator = {
  transformData: (source: string, target: string, data: any) => {
    const transformer = transformationRegistry.get(source, target);
    return transformer ? transformer(data) : data;
  },

  validateData: (schema: ZodSchema, data: any) => {
    return schema.safeParse(data);
  }
};
```

## Error Handling & Recovery

### Retry Logic
**Implement exponential backoff for failed steps:**
```typescript
const retryStep = async (step: WorkflowStep, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeStep(step);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
      await sleep(delay);

      // Log retry attempt
      logger.warn(`Step ${step.id} retry ${attempt}`, { error, delay });
    }
  }
};
```

### Compensation Actions
- Rollback completed steps on failure
- Notify stakeholders of workflow failures
- Trigger alternative workflows

## Monitoring & Observability

### Workflow Metrics
- Execution time per workflow
- Step success/failure rates
- Bottleneck identification
- Resource utilization

### Logging Standards
- Structured logs with correlation IDs
- Step-by-step execution tracing
- Error context and stack traces
- Performance timing data

## Performance Optimization

### Parallel Execution
**Run independent steps concurrently:**
```typescript
const executeParallel = async (steps: WorkflowStep[]) => {
  const promises = steps.map(step => executeStep(step));
  return Promise.allSettled(promises);
};
```

### Caching Strategies
- Cache agent responses for repeated inputs
- Pre-compute common workflow paths
- Use Redis for state persistence

## Security Considerations

### Data Isolation
- [ ] Tenant data never mixed between workflows
- [ ] Encrypted state storage
- [ ] Access controls on workflow definitions
- [ ] Audit trails for all executions

### Input Validation
- [ ] All inputs validated with schemas
- [ ] Prevent injection attacks in conditions
- [ ] Rate limiting on workflow triggers

## Testing Framework

### Unit Tests
- Individual step execution
- Condition evaluation logic
- State management operations
- Error handling paths

### Integration Tests
- End-to-end workflow execution
- Multi-agent coordination
- External integration mocking
- Load testing with concurrent workflows

### Chaos Testing
- Simulate agent failures
- Network partition testing
- Resource exhaustion scenarios

## Response Format
When orchestrating workflows, provide:
1. **Execution status** for each workflow instance
2. **Step performance** metrics
3. **Error analysis** with failure points
4. **Optimization recommendations** for bottlenecks
5. **Security assessment** of data flows

## Dependencies

### Prerequisite Skills
- ai-agent-lifecycle-management - For AI agent coordination and scaling
- data-lake-orchestration-agent - For data access and querying

### Existing Services Used
- apps/api/src/app/ai-orchestrator/ - AI processing and agent management
- BullMQ queues - For job processing and workflow state management

### External APIs Required
- OpenAI API ($0.002/1K tokens) - For AI agent processing
- SignalHouse API - For SMS coordination
- Twilio API - For voice orchestration

## Related Skills
- Use with `event-driven-coordination` for trigger management
- Combine with `orchestration-failure-recovery` for error handling
- Reference `ai-performance-optimizer` for workflow tuning