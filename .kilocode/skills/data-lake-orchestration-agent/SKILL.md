---
name: data-lake-orchestration-agent
description: Handles import of data from data lakes, manages object spaces and paths, wires into integrated systems, ensures alignment, state management, access gates, and workflow orchestration in cloud-native environments
---

# Data Lake Orchestration Agent Instructions

## Purpose
Develop a specialized AI skills agent designed to handle the import of data from data lakes, manage object spaces and paths, wire them into integrated systems, ensure alignment across components, maintain state management, control gates for logic and access, and orchestrate workflows efficiently. The agent should be adaptable, scalable, and capable of automating these processes in a cloud-native environment, with built-in error handling, logging, and optimization features.

## When to Use This Skill
- Importing large datasets from data lakes (S3, Azure Data Lake, etc.)
- Managing object storage paths and namespaces
- Integrating data pipelines with existing systems
- Ensuring data alignment and consistency across components
- Implementing state management for distributed workflows
- Setting up access control gates and logic gates
- Orchestrating complex data processing workflows
- Troubleshooting data import failures
- Optimizing data transfer and processing performance
- Scaling data operations in cloud environments

## Agent Architecture

### Core Components
- **Data Importer**: Handles extraction from various data lake sources
- **Object Manager**: Manages object spaces, paths, and metadata
- **Integration Engine**: Wires data into target systems
- **Alignment Validator**: Ensures consistency across components
- **State Manager**: Maintains workflow and data state
- **Gate Controller**: Manages access and logic gates
- **Workflow Orchestrator**: Coordinates multi-step processes

### Operational Stages
- **Discovery**: Identify and catalog data sources
- **Import**: Extract and transform data
- **Integration**: Wire into systems and validate alignment
- **Orchestration**: Execute workflows with state management
- **Monitoring**: Track performance and handle errors
- **Optimization**: Scale and improve efficiency

## Data Import Framework

### 1. Source Discovery
**Automatically discover and catalog data lake sources:**
```typescript
const discoverDataSources = async (config: DataLakeConfig) => {
  // Scan data lake for available datasets
  const sources = await dataLakeScanner.scan(config.bucket, config.prefix);

  // Validate data formats and schemas
  const validatedSources = await schemaValidator.validateBatch(sources);

  // Register sources with metadata
  await sourceRegistry.register(validatedSources);

  return validatedSources;
};
```

### 2. Incremental Import
**Implement efficient incremental data loading:**
```typescript
const incrementalImport = async (sourceId: string, lastSync: Date) => {
  // Get changed objects since last sync
  const changes = await dataLakeClient.getChanges(sourceId, lastSync);

  // Process changes in batches
  const batches = chunkArray(changes, 1000);

  for (const batch of batches) {
    await importBatch(batch);
    await stateManager.updateProgress(sourceId, batch.length);
  }

  // Update sync timestamp
  await syncTracker.updateLastSync(sourceId, new Date());
};
```

### 3. Data Transformation
**Apply transformations during import:**
- Schema mapping and validation
- Data cleansing and normalization
- Compression and encryption
- Format conversion (JSON, Parquet, etc.)

## Object Space Management

### Path Organization
**Structure object paths for efficient access:**
```typescript
const organizeObjectPaths = (objects: DataObject[]) => {
  const pathStructure = {
    byTenant: new Map<string, DataObject[]>(),
    byType: new Map<string, DataObject[]>(),
    byDate: new Map<string, DataObject[]>()
  };

  objects.forEach(obj => {
    // Organize by tenant
    const tenantKey = obj.metadata.tenantId;
    if (!pathStructure.byTenant.has(tenantKey)) {
      pathStructure.byTenant.set(tenantKey, []);
    }
    pathStructure.byTenant.get(tenantKey)!.push(obj);

    // Organize by data type
    const typeKey = obj.metadata.dataType;
    if (!pathStructure.byType.has(typeKey)) {
      pathStructure.byType.set(typeKey, []);
    }
    pathStructure.byType.get(typeKey)!.push(obj);

    // Organize by date partitions
    const dateKey = obj.metadata.createdAt.toISOString().split('T')[0];
    if (!pathStructure.byDate.has(dateKey)) {
      pathStructure.byDate.set(dateKey, []);
    }
    pathStructure.byDate.get(dateKey)!.push(obj);
  });

  return pathStructure;
};
```

### Metadata Management
- Object versioning and lineage tracking
- Access patterns and usage statistics
- Retention policies and lifecycle management
- Cross-references between related objects

## System Integration Engine

### API Wiring
**Connect data flows to integrated systems:**
```typescript
const wireDataToSystems = async (dataStream: DataStream, targets: SystemTarget[]) => {
  const integrationPromises = targets.map(async target => {
    try {
      // Transform data for target system
      const transformedData = await transformer.transform(dataStream, target.schema);

      // Establish connection
      const connection = await connectionManager.getConnection(target.id);

      // Wire data with error handling
      await dataWirer.wire(transformedData, connection, {
        retryPolicy: target.retryPolicy,
        batchSize: target.batchSize
      });

      return { target: target.id, status: 'success' };
    } catch (error) {
      await errorHandler.logIntegrationError(target.id, error);
      return { target: target.id, status: 'failed', error: error.message };
    }
  });

  return await Promise.allSettled(integrationPromises);
};
```

### Alignment Validation
- Schema consistency checks
- Data integrity validation
- Cross-system reference validation
- Business rule enforcement

## State Management

### Distributed State
**Maintain state across distributed components:**
```typescript
class StateManager {
  private stateStore: Map<string, WorkflowState> = new Map();

  async updateWorkflowState(workflowId: string, updates: Partial<WorkflowState>) {
    const currentState = await this.getWorkflowState(workflowId);
    const newState = { ...currentState, ...updates, lastUpdated: new Date() };

    // Persist to distributed store
    await this.stateStore.set(workflowId, newState);

    // Broadcast state changes
    await this.eventBus.publish('workflow.state.updated', {
      workflowId,
      state: newState
    });
  }

  async getWorkflowState(workflowId: string): Promise<WorkflowState> {
    return await this.stateStore.get(workflowId) || this.createInitialState(workflowId);
  }
}
```

### State Persistence
- Durable state storage (Redis, DynamoDB, etc.)
- State snapshots for recovery
- Event sourcing for audit trails
- State migration for schema changes

## Access Control Gates

### Logic Gates
**Implement conditional processing gates:**
```typescript
const evaluateLogicGate = async (gateConfig: GateConfig, context: WorkflowContext) => {
  const conditions = gateConfig.conditions.map(async condition => {
    switch (condition.type) {
      case 'data_quality':
        return await qualityChecker.check(context.data, condition.threshold);
      case 'business_rule':
        return await ruleEngine.evaluate(condition.rule, context);
      case 'access_control':
        return await accessManager.checkPermission(context.user, condition.permission);
      default:
        return false;
    }
  });

  const results = await Promise.all(conditions);

  // Evaluate gate logic (AND/OR)
  return gateConfig.operator === 'AND'
    ? results.every(r => r)
    : results.some(r => r);
};
```

### Access Gates
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Multi-tenant isolation
- API rate limiting and throttling

## Workflow Orchestration

### Pipeline Orchestration
**Coordinate complex multi-step workflows:**
```typescript
const orchestrateWorkflow = async (workflowDefinition: WorkflowDefinition) => {
  const executionContext = {
    workflowId: generateId(),
    startTime: new Date(),
    steps: workflowDefinition.steps,
    state: {}
  };

  try {
    for (const step of workflowDefinition.steps) {
      // Check preconditions
      if (step.preconditions) {
        const preconditionsMet = await evaluateConditions(step.preconditions, executionContext);
        if (!preconditionsMet) {
          throw new Error(`Preconditions not met for step: ${step.name}`);
        }
      }

      // Execute step
      const result = await stepExecutor.execute(step, executionContext);

      // Update state
      await stateManager.updateWorkflowState(executionContext.workflowId, {
        currentStep: step.name,
        stepResults: { ...executionContext.state.stepResults, [step.name]: result }
      });

      // Check postconditions
      if (step.postconditions) {
        const postconditionsMet = await evaluateConditions(step.postconditions, executionContext);
        if (!postconditionsMet) {
          await errorHandler.handleStepFailure(step.name, 'Postconditions failed');
        }
      }
    }

    // Mark workflow complete
    await stateManager.updateWorkflowState(executionContext.workflowId, {
      status: 'completed',
      endTime: new Date()
    });

  } catch (error) {
    await errorHandler.handleWorkflowFailure(executionContext.workflowId, error);
  }
};
```

### Event-Driven Processing
- Asynchronous step execution
- Event-based triggers and notifications
- Saga pattern for distributed transactions
- Compensation actions for failures

## Error Handling and Logging

### Comprehensive Error Handling
- Retry mechanisms with exponential backoff
- Circuit breaker patterns
- Dead letter queues for failed messages
- Graceful degradation strategies

### Structured Logging
**Implement detailed logging for troubleshooting:**
```typescript
const logger = {
  logDataImport: (sourceId: string, metrics: ImportMetrics) => {
    logger.info('Data import completed', {
      sourceId,
      recordsProcessed: metrics.recordsProcessed,
      duration: metrics.duration,
      errors: metrics.errors,
      throughput: metrics.throughput
    });
  },

  logIntegrationError: (targetId: string, error: Error, context: any) => {
    logger.error('Integration failed', {
      targetId,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  logWorkflowProgress: (workflowId: string, step: string, progress: number) => {
    logger.info('Workflow progress', {
      workflowId,
      currentStep: step,
      progress,
      timestamp: new Date().toISOString()
    });
  }
};
```

## Optimization Features

### Performance Optimization
- Parallel processing pipelines
- Data compression and caching
- Connection pooling
- Memory-efficient streaming

### Scalability Features
- Horizontal scaling with Kubernetes
- Auto-scaling based on load
- Resource quotas per tenant
- Load balancing across instances

### Cost Optimization
- Spot instance utilization
- Data transfer optimization
- Storage tier management
- Idle resource cleanup

## Security Considerations

### Data Protection
- Encryption at rest and in transit
- Data masking for sensitive information
- Audit trails for all operations
- Compliance with GDPR, CCPA, etc.

### Access Security
- Multi-factor authentication
- API key rotation
- Network segmentation
- Zero-trust architecture

## Testing Framework

### Unit Tests
- Data transformation logic
- State management operations
- Gate evaluation functions
- Orchestration step execution

### Integration Tests
- End-to-end data import flows
- Multi-system integration validation
- Workflow execution scenarios
- Error recovery testing

### Performance Tests
- Load testing with large datasets
- Scalability validation
- Resource utilization monitoring
- Bottleneck identification

## Response Format
When using the data lake orchestration agent, provide:
1. **Import status** with metrics (records processed, duration, errors)
2. **Integration results** for each target system
3. **Alignment validation** outcomes
4. **Workflow progress** with current step and state
5. **Error summary** with actionable remediation steps
6. **Performance metrics** and optimization recommendations
7. **Security audit** results

## Related Skills
- Use with `api-integration-test` for validating system integrations
- Combine with `multi-tenant-audit` for tenant isolation validation
- Reference `workflow-orchestration-engine` for complex pipeline coordination
- Integrate with `cost-guardian` for resource usage monitoring