---
name: code-quality-enforcer
description: Ensures code alignment, compatibility, and fixes initialization issues in the OutreachGlobal Nx monorepo
---

# Code Quality Enforcer

## Overview
An intelligent agent that maintains code quality, detects initialization issues, resolves circular dependencies, and ensures consistent patterns across the OutreachGlobal Nx monorepo. Built specifically for the NextTier NestJS architecture with BullMQ, Drizzle ORM, and multi-tenant patterns.

## Key Features
- Module dependency order validation
- BullMQ queue registration consistency
- Drizzle schema alignment checking
- Circular dependency detection
- NestJS module pattern enforcement
- TypeScript compilation error resolution
- Multi-tenant isolation validation

## Code References
- Module Validator: `apps/api/src/app/code-quality/` (planned)
- App Module: `apps/api/src/app/app.module.ts` - Central module registration
- Agent Modules: `apps/api/src/app/gianna/`, `apps/api/src/app/cathy/`, `apps/api/src/app/luci/`
- Database Schemas: `apps/api/src/database/schema/`
- Custom Decorators: `apps/api/src/app/common/decorators/`

## Current State

### What Already Exists
- **Nx Monorepo**: Proper dependency management
- **Custom Module Decorator**: `@CustomModule` for enhanced NestJS configuration
- **CircuitBreakerModule**: Already in `apps/api/src/lib/circuit-breaker/`
- **DeadLetterQueueModule**: Already in `apps/api/src/lib/dlq/`
- **ESLint/Prettier**: Code formatting and linting
- **Jest**: Unit testing framework

### What Still Needs to be Built
- Automated module dependency validation
- Queue constant pattern enforcement
- Cross-module circular dependency detection
- Runtime initialization order checking

## Pattern Enforcement Rules

### 1. Module Dependency Order
Detected critical dependency from `app.module.ts:87`:
```typescript
// BillingModule MUST come before UserModule (UserService depends on SubscriptionService)
BillingModule,  // Line 88
AuthModule,     // Line 89
UserModule,     // Line 90 - depends on BillingModule
```

**Rule**: Document and validate inter-module dependencies.

### 2. Queue Constant Patterns
Current inconsistency detected:

**LUCI Pattern** (preferred - separate constants file):
```typescript
// luci/constants.ts
export const LUCI_QUEUE = "luci";

// luci.module.ts
import { LUCI_QUEUE } from "./constants";
```

**GIANNA/CATHY Pattern** (inline - should be migrated):
```typescript
// gianna.module.ts (line 10)
export const GIANNA_QUEUE = "gianna";
```

**Recommendation**: Standardize on constants file pattern for all queues.

### 3. CustomModule Pattern Validation
```typescript
// Correct pattern for agent modules
@CustomModule({
  imports: [
    TeamModule,
    InboxModule,
    AiOrchestratorModule,
    ConfigModule,
    BullModule.registerQueue({
      name: QUEUE_NAME,
    }),
  ],
  providers: [AgentService],
  controllers: [AgentController],
  exports: [AgentService],
})
export class AgentModule {}
```

## Module Dependency Analyzer

### Implementation
```typescript
@Injectable()
export class ModuleDependencyAnalyzer {
  private readonly knownDependencies = new Map<string, string[]>([
    ['UserModule', ['BillingModule']], // UserService needs SubscriptionService
    ['GiannaModule', ['TeamModule', 'InboxModule', 'AiOrchestratorModule']],
    ['CathyModule', ['TeamModule', 'InboxModule', 'AiOrchestratorModule']],
    ['LuciModule', ['ConfigModule', 'SignalHouseModule', 'DatabaseModule']],
    ['NevaModule', ['ConfigModule', 'AiOrchestratorModule']],
  ]);

  async validateModuleOrder(appModulePath: string): Promise<ModuleOrderValidation> {
    const moduleImports = await this.extractModuleImports(appModulePath);
    const issues: ModuleOrderIssue[] = [];

    for (const [module, dependencies] of this.knownDependencies) {
      const moduleIndex = moduleImports.indexOf(module);
      if (moduleIndex === -1) continue;

      for (const dep of dependencies) {
        const depIndex = moduleImports.indexOf(dep);
        if (depIndex === -1) {
          issues.push({
            module,
            issue: 'missing_dependency',
            dependency: dep,
            severity: 'critical',
            fix: `Add ${dep} to imports before ${module}`
          });
        } else if (depIndex > moduleIndex) {
          issues.push({
            module,
            issue: 'wrong_order',
            dependency: dep,
            severity: 'critical',
            fix: `Move ${dep} before ${module} in imports array`
          });
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      moduleOrder: moduleImports
    };
  }
}
```

## Queue Pattern Enforcer

### Standardization Service
```typescript
@Injectable()
export class QueuePatternEnforcer {
  private readonly expectedPattern = {
    location: 'constants.ts',
    naming: 'SCREAMING_SNAKE_CASE',
    suffix: '_QUEUE'
  };

  async enforceQueuePatterns(): Promise<QueuePatternReport> {
    const violations: QueueViolation[] = [];

    // Check all agent modules
    const agentModules = ['gianna', 'cathy', 'luci', 'neva'];

    for (const agent of agentModules) {
      const modulePath = `apps/api/src/app/${agent}/${agent}.module.ts`;
      const constantsPath = `apps/api/src/app/${agent}/constants.ts`;

      const hasConstantsFile = await this.fileExists(constantsPath);
      const moduleDefinesQueue = await this.moduleDefinesQueueInline(modulePath);

      if (!hasConstantsFile && moduleDefinesQueue) {
        violations.push({
          agent,
          issue: 'inline_queue_constant',
          currentLocation: modulePath,
          expectedLocation: constantsPath,
          fix: this.generateMigrationFix(agent)
        });
      }
    }

    return { violations, isCompliant: violations.length === 0 };
  }

  private generateMigrationFix(agent: string): string {
    const queueName = `${agent.toUpperCase()}_QUEUE`;
    return `
// 1. Create apps/api/src/app/${agent}/constants.ts:
export const ${queueName} = "${agent}";

// 2. Update ${agent}.module.ts:
import { ${queueName} } from "./constants";
// Remove: export const ${queueName} = "${agent}";
`;
  }
}
```

## Circular Dependency Detector

### NestJS-Specific Detection
```typescript
@Injectable()
export class CircularDependencyDetector {
  async detectCircularDependencies(): Promise<CircularDependencyReport> {
    const moduleGraph = await this.buildModuleGraph();
    const cycles = this.findCycles(moduleGraph);

    return {
      cycles: cycles.map(cycle => ({
        modules: cycle,
        severity: this.calculateSeverity(cycle),
        resolution: this.suggestResolution(cycle)
      })),
      recommendations: this.generateRecommendations(cycles)
    };
  }

  private async buildModuleGraph(): Promise<Map<string, string[]>> {
    const graph = new Map<string, string[]>();

    // Known agent module dependencies
    graph.set('GiannaModule', ['TeamModule', 'InboxModule', 'AiOrchestratorModule']);
    graph.set('CathyModule', ['TeamModule', 'InboxModule', 'AiOrchestratorModule']);
    graph.set('InboxModule', ['MessageModule', 'LeadModule']);
    graph.set('AiOrchestratorModule', ['ConfigModule']);

    // Add from actual codebase analysis
    const moduleFiles = await this.findAllModuleFiles();
    for (const file of moduleFiles) {
      const imports = await this.extractImports(file);
      graph.set(this.getModuleName(file), imports);
    }

    return graph;
  }

  private suggestResolution(cycle: string[]): string {
    // NestJS-specific resolutions
    if (cycle.includes('forwardRef')) {
      return 'Already using forwardRef - check if injection is actually needed';
    }

    return `
Option 1: Use forwardRef()
  @Inject(forwardRef(() => ${cycle[1]}))

Option 2: Create shared module for common dependencies
  Move shared services to a CommonModule imported by both

Option 3: Event-based communication
  Use CQRS events instead of direct injection
`;
  }
}
```

## Agent Service Validator

### GIANNA/CATHY/LUCI Pattern Validation
```typescript
@Injectable()
export class AgentServiceValidator {
  private readonly requiredPatterns = {
    gianna: {
      queueInjection: '@InjectQueue(GIANNA_QUEUE)',
      loggerPattern: "new Logger(GiannaService.name)",
      requiredMethods: ['processIncomingResponse', 'generateOpener', 'sendSms']
    },
    cathy: {
      queueInjection: '@InjectQueue(CATHY_QUEUE)',
      loggerPattern: "new Logger(CathyService.name)",
      requiredMethods: ['handleNurture', 'generateNurtureResponse']
    },
    luci: {
      queueInjection: '@InjectQueue(LUCI_QUEUE)',
      loggerPattern: "new Logger(LuciService.name)",
      requiredMethods: ['processBlock', 'enrichLead']
    }
  };

  async validateAgentService(agent: keyof typeof this.requiredPatterns): Promise<ValidationResult> {
    const pattern = this.requiredPatterns[agent];
    const servicePath = `apps/api/src/app/${agent}/${agent}.service.ts`;

    const issues: ValidationIssue[] = [];
    const content = await this.readFile(servicePath);

    // Validate queue injection
    if (!content.includes(pattern.queueInjection)) {
      issues.push({
        type: 'missing_queue_injection',
        expected: pattern.queueInjection,
        file: servicePath
      });
    }

    // Validate logger pattern
    if (!content.includes(pattern.loggerPattern)) {
      issues.push({
        type: 'missing_logger',
        expected: pattern.loggerPattern,
        file: servicePath
      });
    }

    // Validate required methods
    for (const method of pattern.requiredMethods) {
      if (!content.includes(`async ${method}(`)) {
        issues.push({
          type: 'missing_method',
          expected: method,
          file: servicePath
        });
      }
    }

    return { isValid: issues.length === 0, issues };
  }
}
```

## Drizzle Schema Validator

### Schema Consistency Checking
```typescript
@Injectable()
export class DrizzleSchemaValidator {
  async validateSchemas(): Promise<SchemaValidationReport> {
    const schemaPath = 'apps/api/src/database/schema/';
    const issues: SchemaIssue[] = [];

    // Check for teamId on all multi-tenant tables
    const schemas = await this.findSchemaFiles(schemaPath);

    for (const schema of schemas) {
      const content = await this.readFile(schema);

      // Multi-tenant validation
      if (this.isMultiTenantTable(content) && !content.includes('teamId')) {
        issues.push({
          type: 'missing_tenant_column',
          file: schema,
          fix: "Add teamId: text('team_id').notNull().references(() => teamsTable.id)"
        });
      }

      // Index validation
      if (content.includes('teamId') && !content.includes('index')) {
        issues.push({
          type: 'missing_tenant_index',
          file: schema,
          fix: 'Add index on teamId for RLS performance'
        });
      }
    }

    return { issues, isCompliant: issues.length === 0 };
  }
}
```

## Code Slop Detector

### NextTier-Specific Patterns
```typescript
@Injectable()
export class CodeSlopDetector {
  async detectCodeSlop(): Promise<SlopReport> {
    const patterns: SlopPattern[] = [];

    // Detect console.log in production code
    const consoleLogs = await this.grep('console.log', 'apps/api/src/**/*.ts');
    if (consoleLogs.length > 0) {
      patterns.push({
        type: 'console_logs',
        severity: 'medium',
        count: consoleLogs.length,
        fix: 'Replace with Logger from @nestjs/common'
      });
    }

    // Detect any usage (should use explicit types)
    const anyUsage = await this.grep(': any', 'apps/api/src/**/*.ts');
    if (anyUsage.length > 5) {
      patterns.push({
        type: 'any_type_usage',
        severity: 'low',
        count: anyUsage.length,
        fix: 'Replace with proper TypeScript types'
      });
    }

    // Detect TODO comments older than configured threshold
    const todos = await this.grep('// TODO', 'apps/api/src/**/*.ts');
    patterns.push({
      type: 'todo_comments',
      severity: 'low',
      count: todos.length,
      fix: 'Review and convert to tracked issues'
    });

    // Detect empty catch blocks
    const emptyCatch = await this.grep('catch.*\\{\\s*\\}', 'apps/api/src/**/*.ts');
    if (emptyCatch.length > 0) {
      patterns.push({
        type: 'empty_catch',
        severity: 'high',
        count: emptyCatch.length,
        fix: 'Add proper error handling or re-throw'
      });
    }

    return { patterns, overallScore: this.calculateScore(patterns) };
  }
}
```

## Integration Points

### With ML Intelligence Engine
- **Code Quality Scoring**: ML model predicts code quality issues
- **Pattern Learning**: Learns from successful fixes to improve suggestions
- **Anomaly Detection**: Identifies unusual code patterns

### With Technical Documentation Agent
- **Quality Reports**: Generate documentation of code quality status
- **Fix Documentation**: Document applied fixes and their rationale
- **Standards Generation**: Auto-generate coding standards from patterns

### With Contextual Orchestrator
- **Quality Workflows**: Orchestrate code quality checking in CI/CD
- **Pre-commit Hooks**: Validate code before commits
- **PR Validation**: Check quality before merge

### With AI Agent Lifecycle Management
- **Agent Pattern Validation**: Ensure GIANNA/CATHY/LUCI follow standards
- **Queue Configuration**: Validate BullMQ queue setup
- **Service Interface Compliance**: Check agent services match expected interfaces

## Dependencies

### Prerequisite Skills
- technical-documentation-agent - For generating quality reports
- contextual-orchestrator - For coordinating quality workflows
- ml-intelligence-engine - For pattern recognition (optional)

### Existing Services Used
- Nx workspace configuration - Monorepo dependency analysis
- TypeScript compiler - Type checking and error detection
- ESLint/Prettier - Code formatting and style enforcement
- CircuitBreakerModule - Already exists in `apps/api/src/lib/circuit-breaker/`
- DeadLetterQueueModule - Already exists in `apps/api/src/lib/dlq/`

### External Tools Required
- ESLint - Code linting
- Prettier - Code formatting
- TypeScript Compiler - Type checking
- Nx - Monorepo management

## Testing
- Module order validation with intentionally wrong orders
- Queue pattern detection accuracy
- Circular dependency detection using known cycles
- Agent service validation completeness
- Drizzle schema multi-tenant compliance

## Implementation Priority

Based on Tier 4 placement in IMPLEMENTATION-ORDER.md:

1. **Week 1**: Module dependency validator (addresses real ordering issues)
2. **Week 2**: Queue pattern enforcer (standardize GIANNA/CATHY/LUCI)
3. **Week 3**: Circular dependency detector
4. **Week 4**: Code slop detector and cleanup automation

## Notes
- Runs as part of CI/CD pipeline to prevent deployment issues
- Provides both automated fixes and human-guided recommendations
- Learns from successful fixes to improve future suggestions
- Integrates with existing development workflow
- Focus on NestJS/Drizzle/BullMQ patterns specific to NextTier
