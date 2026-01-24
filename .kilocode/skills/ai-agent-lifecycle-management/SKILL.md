---
name: ai-agent-lifecycle-management
description: Handles deployment, scaling, monitoring, and retirement of AI agents across tenants, ensuring proper resource allocation and version control
---

# AI Agent Lifecycle Management Instructions

## Purpose
EXTEND existing AI Orchestrator at `apps/api/src/app/ai-orchestrator/` to manage the complete lifecycle of AI agents in OutreachGlobal's multi-tenant platform, ensuring reliable deployment, scaling, monitoring, and secure retirement while maintaining tenant isolation and resource efficiency.

## When to Use This Skill
- Deploying new AI agent instances
- Scaling agents based on tenant demand
- Monitoring agent health and performance
- Updating agent versions or configurations
- Retiring deprecated agents
- Troubleshooting agent failures
- Capacity planning for AI resources

## Agent Architecture

### Existing AI Agents
- **LUCI**: Search and research agent (FULLY IMPLEMENTED at `apps/api/src/app/luci/`)
- **Sabrina**: Sales intelligence agent (FULLY IMPLEMENTED at `apps/api/src/app/inbox/services/sabrina-sdr.service.ts`)
- **Cathy**: Customer support agent (PARTIAL - templates only at `apps/front/src/lib/gianna/`)

### Agents Needing Creation
- **Gianna**: AI SDR for outbound campaigns (DOES NOT EXIST - needs creation)
- **Neva**: Negotiation and deal closing agent (DOES NOT EXIST - needs creation)

### Lifecycle Stages
- **Development**: Agent creation and testing
- **Deployment**: Rolling out to production tenants
- **Operation**: Monitoring and maintenance
- **Scaling**: Auto-scaling based on load
- **Retirement**: Graceful shutdown and cleanup

## Deployment Framework

### 1. Agent Registration
**Register new agents with tenant isolation:**
```typescript
const registerAgent = async (agentConfig: AgentConfig) => {
  // Validate tenant permissions
  const teamId = await validateTenantAccess(agentConfig.teamId);

  // Create agent instance
  const agent = await agentFactory.create(agentConfig.type, {
    teamId,
    version: agentConfig.version,
    resources: agentConfig.resources
  });

  // Register with existing AI orchestrator
  await aiOrchestratorService.registerAgent(agent);

  return agent.id;
};
```

### 2. Resource Allocation
**Allocate compute resources per tenant:**
- CPU/GPU cores based on agent complexity
- Memory limits for context windows
- Storage for agent state and models
- Network bandwidth for API calls

### 3. Version Control
**Manage agent versions:**
```typescript
const deployAgentVersion = async (agentId: string, version: string) => {
  // Create canary deployment
  const canary = await deploymentService.createCanary(agentId, version);

  // Monitor canary performance
  const metrics = await monitorService.watchCanary(canary.id, 300000); // 5 minutes

  if (metrics.successRate > 0.95) {
    // Promote to full deployment
    await deploymentService.promoteCanary(canary.id);
  } else {
    // Rollback
    await deploymentService.rollbackCanary(canary.id);
  }
};
```

## Scaling Management

### Auto-Scaling Rules
- Scale up when queue depth > 10
- Scale down when utilization < 30%
- Maximum instances per tenant: 5
- Minimum instances: 1 per agent type

### Load Balancing
**Distribute requests across agent instances:**
```typescript
const loadBalancer = {
  selectInstance: (agentType: string, teamId: string) => {
    const instances = agentPool.getActiveInstances(agentType, teamId);
    return instances.sort((a, b) => a.load - b.load)[0];
  }
};
```

## Monitoring & Health Checks

### Health Metrics
- Response time < 2000ms
- Error rate < 5%
- Memory usage < 80%
- CPU utilization < 70%

### Alerting Rules
- Agent unresponsive for > 30 seconds
- Error rate spikes > 10%
- Resource exhaustion warnings
- Tenant isolation breaches

## Retirement Process

### Graceful Shutdown
**Safely retire agent instances:**
```typescript
const retireAgent = async (agentId: string) => {
  // Stop accepting new requests
  await agentPool.drainConnections(agentId);

  // Wait for active requests to complete
  await waitForDrain(agentId, 60000); // 1 minute timeout

  // Backup agent state
  await stateService.backup(agentId);

  // Terminate instance
  await agentPool.terminate(agentId);

  // Clean up resources
  await resourceManager.cleanup(agentId);
};
```

### Data Migration
- Transfer active conversations to replacement agents
- Archive agent state for compliance
- Update routing rules

## Security Considerations

### Tenant Isolation
- [ ] Agents cannot access other tenant data
- [ ] API keys scoped to tenant
- [ ] Network segmentation enforced
- [ ] Audit logging for all agent actions

### Access Control
- [ ] Role-based permissions for agent management
- [ ] Multi-factor authentication for admin operations
- [ ] Encrypted agent-to-agent communication

## Performance Optimization

### Caching Strategies
- Cache agent responses for similar queries
- Pre-load models for frequently used agents
- Connection pooling for external APIs

### Resource Optimization
- Right-size instances based on usage patterns
- Implement request batching
- Use spot instances for non-critical workloads

## Testing Framework

### Unit Tests
- Agent initialization and configuration
- Resource allocation logic
- Scaling algorithms
- Retirement procedures

### Integration Tests
- End-to-end agent deployment flows
- Multi-tenant isolation validation
- Load testing with concurrent requests
- Failure recovery scenarios

## Response Format
When managing agent lifecycles, provide:
1. **Deployment status** for each agent instance
2. **Resource utilization** metrics
3. **Health assessment** with failure points
4. **Scaling recommendations** based on usage patterns
5. **Security audit** results

## Dependencies

### Prerequisite Skills
- None (extends existing AI Orchestrator)

### Existing Services Used
- apps/api/src/app/ai-orchestrator/ - Full provider management (OpenAI, Anthropic) and AI processing
- apps/api/src/app/luci/ - LUCI agent implementation
- apps/api/src/app/inbox/services/sabrina-sdr.service.ts - Sabrina agent implementation

### External APIs Required
- OpenAI API ($0.002/1K tokens) - For AI agent processing
- Anthropic API - Alternative AI provider

## Related Skills
- Use with `ai-resource-capacity-planning` for infrastructure scaling
- Combine with `multi-tenant-ai-isolation` for security validation
- Reference `orchestration-failure-recovery` for error handling