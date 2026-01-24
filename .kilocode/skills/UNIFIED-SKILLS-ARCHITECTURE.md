# Unified Skills Architecture

> **Purpose**: Bridge documentation (Kilo Code) with executable tools (COPILOT) into a single skills system

## The Problem

Currently OutreachGlobal has TWO disconnected skill systems:

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│      KILO CODE SKILLS           │    │        COPILOT TOOLS            │
│      (.kilocode/skills/)        │    │   (apps/api/.../copilot/tools/) │
├─────────────────────────────────┤    ├─────────────────────────────────┤
│ - Markdown documentation        │    │ - TypeScript executables        │
│ - For AI coding assistants      │    │ - For end-user AI interaction   │
│ - Not executable                │    │ - No documentation context      │
│ - 22+ skills defined            │    │ - ~5 tools defined              │
└─────────────────────────────────┘    └─────────────────────────────────┘
              ↓                                       ↓
        NOT CONNECTED ─────────────────────── NOT CONNECTED
```

## The Solution: Unified Skill Registry

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED SKILL REGISTRY                           │
│                    (.kilocode/skills/registry.json)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│  │   SKILL     │     │   SKILL     │     │   SKILL     │              │
│  │  DEFINITION │     │  DEFINITION │     │  DEFINITION │              │
│  │             │     │             │     │             │              │
│  │ - metadata  │     │ - metadata  │     │ - metadata  │              │
│  │ - docs path │     │ - docs path │     │ - docs path │              │
│  │ - tool path │     │ - tool path │     │ - tool path │              │
│  │ - schema    │     │ - schema    │     │ - schema    │              │
│  └─────────────┘     └─────────────┘     └─────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  KILO CODE    │      │    COPILOT    │      │   FRONTEND    │
│  (reads docs) │      │ (calls tools) │      │ (shows UI)    │
└───────────────┘      └───────────────┘      └───────────────┘
```

## Unified Skill Schema

```typescript
// apps/api/src/app/skills/skill.schema.ts

interface UnifiedSkill {
  // Identity
  id: string;                    // e.g., "luci-research-agent"
  name: string;                  // e.g., "LUCI Research Agent"
  version: string;               // Semantic version

  // Classification
  category: SkillCategory;
  tags: string[];

  // Documentation (for Kilo Code / developers)
  documentation: {
    skillMdPath: string;         // .kilocode/skills/luci-research-agent/SKILL.md
    summary: string;             // One-line description
    capabilities: string[];      // What it can do
  };

  // Execution (for COPILOT / runtime)
  execution: {
    type: 'service' | 'tool' | 'workflow' | 'documentation-only';
    servicePath?: string;        // apps/api/src/app/luci/luci.service.ts
    toolPath?: string;           // apps/api/src/app/copilot/tools/skip-trace.tool.ts
    endpoints?: SkillEndpoint[];
  };

  // Tool Definition (for AI function calling)
  toolDefinition?: {
    name: string;
    description: string;
    parameters: JSONSchema;
    returns: JSONSchema;
  };

  // Dependencies
  dependencies: {
    prerequisiteSkills: string[];
    requiredServices: string[];
    externalApis: string[];
  };

  // Access Control
  access: {
    requiredPermissions: string[];
    tenantIsolated: boolean;
    costPerCall?: number;
  };

  // Status
  status: 'production' | 'beta' | 'planned' | 'deprecated';
}

enum SkillCategory {
  DATA_INGESTION = 'data_ingestion',
  ENRICHMENT = 'enrichment',
  ML_INTELLIGENCE = 'ml_intelligence',
  CAMPAIGN = 'campaign',
  AGENT = 'agent',
  ANALYTICS = 'analytics',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
}
```

## Registry File

```json
// .kilocode/skills/registry.json
{
  "version": "1.0.0",
  "skills": [
    {
      "id": "luci-research-agent",
      "name": "LUCI Research Agent",
      "version": "1.0.0",
      "category": "enrichment",
      "tags": ["skip-trace", "enrichment", "phone-validation"],
      "documentation": {
        "skillMdPath": ".kilocode/skills/luci-research-agent/SKILL.md",
        "summary": "Data enrichment pipeline with skip tracing and phone validation",
        "capabilities": [
          "Skip trace leads via Tracerfy",
          "Validate phone numbers via Trestle",
          "Score and prioritize leads",
          "Push to campaigns"
        ]
      },
      "execution": {
        "type": "service",
        "servicePath": "apps/api/src/app/luci/luci.service.ts",
        "toolPath": "apps/api/src/app/copilot/tools/skip-trace.tool.ts",
        "endpoints": [
          { "method": "POST", "path": "/luci/blocks", "action": "createBlock" },
          { "method": "POST", "path": "/luci/blocks/:id/process", "action": "processBlock" }
        ]
      },
      "toolDefinition": {
        "name": "skip_trace_lead",
        "description": "Enrich a lead with phone numbers and contact info via skip tracing",
        "parameters": {
          "type": "object",
          "properties": {
            "leadId": { "type": "string", "description": "The lead ID to enrich" },
            "includePhoneValidation": { "type": "boolean", "default": true }
          },
          "required": ["leadId"]
        },
        "returns": {
          "type": "object",
          "properties": {
            "phones": { "type": "array" },
            "emails": { "type": "array" },
            "phoneGrade": { "type": "string" }
          }
        }
      },
      "dependencies": {
        "prerequisiteSkills": ["data-lake-orchestration-agent"],
        "requiredServices": ["TracerfyClient", "TrestleClient"],
        "externalApis": ["tracerfy.com", "trestleiq.com"]
      },
      "access": {
        "requiredPermissions": ["leads:enrich"],
        "tenantIsolated": true,
        "costPerCall": 0.05
      },
      "status": "production"
    },
    {
      "id": "ml-intelligence-engine",
      "name": "ML Intelligence Engine",
      "version": "0.1.0",
      "category": "ml_intelligence",
      "tags": ["machine-learning", "lead-scoring", "predictions"],
      "documentation": {
        "skillMdPath": ".kilocode/skills/ml-intelligence-engine/SKILL.md",
        "summary": "Machine learning for lead scoring, response prediction, and campaign optimization",
        "capabilities": [
          "Score leads by conversion probability",
          "Predict optimal send times",
          "Optimize template effectiveness",
          "Detect lead churn"
        ]
      },
      "execution": {
        "type": "service",
        "servicePath": "apps/api/src/app/ml-engine/ml-engine.service.ts",
        "endpoints": [
          { "method": "POST", "path": "/ml/predict/lead-score", "action": "scoreLeads" },
          { "method": "POST", "path": "/ml/models/train", "action": "trainModel" }
        ]
      },
      "toolDefinition": {
        "name": "score_leads",
        "description": "Get AI-powered conversion probability scores for leads",
        "parameters": {
          "type": "object",
          "properties": {
            "leadIds": { "type": "array", "items": { "type": "string" } }
          },
          "required": ["leadIds"]
        },
        "returns": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "leadId": { "type": "string" },
              "score": { "type": "number" },
              "tier": { "type": "string" }
            }
          }
        }
      },
      "dependencies": {
        "prerequisiteSkills": ["luci-research-agent", "data-lake-orchestration-agent"],
        "requiredServices": ["FeatureStore", "ModelRegistry"],
        "externalApis": []
      },
      "access": {
        "requiredPermissions": ["ml:predict"],
        "tenantIsolated": true,
        "costPerCall": 0.001
      },
      "status": "planned"
    }
  ]
}
```

## COPILOT Integration

Update COPILOT to dynamically load skills from registry:

```typescript
// apps/api/src/app/copilot/skill-loader.service.ts

@Injectable()
export class SkillLoaderService {
  private registry: SkillRegistry;

  async loadSkillsAsTools(teamId: string): Promise<CopilotTool[]> {
    const skills = await this.registry.getExecutableSkills();

    return skills
      .filter(skill => skill.execution.type !== 'documentation-only')
      .filter(skill => this.hasPermission(teamId, skill))
      .map(skill => this.skillToTool(skill));
  }

  private skillToTool(skill: UnifiedSkill): CopilotTool {
    return {
      name: skill.toolDefinition.name,
      description: skill.toolDefinition.description,
      parameters: skill.toolDefinition.parameters,

      execute: async (params: any, context: ToolContext) => {
        // Route to appropriate service based on skill execution config
        const service = this.moduleRef.get(skill.execution.servicePath);
        return service.executeFromTool(params, context);
      },
    };
  }
}
```

## Frontend Skills Browser

```typescript
// apps/front/src/features/skills/SkillsBrowser.tsx

export function SkillsBrowser() {
  const { data: skills } = useQuery(['skills'], fetchSkillRegistry);

  return (
    <div className="grid grid-cols-3 gap-4">
      {skills.map(skill => (
        <SkillCard
          key={skill.id}
          skill={skill}
          onInvoke={() => invokeSkillViaCopilot(skill)}
        />
      ))}
    </div>
  );
}

// User clicks "LUCI" card → Opens chat with COPILOT pre-loaded with skill context
```

## Migration Path

### Phase 1: Create Registry (Week 1)
1. Create `registry.json` with existing skills
2. Add `toolDefinition` to skills that have COPILOT tools
3. Mark documentation-only skills appropriately

### Phase 2: Update COPILOT (Week 2)
4. Create `SkillLoaderService`
5. Load tools dynamically from registry
6. Add skill context to COPILOT prompts

### Phase 3: Frontend Integration (Week 3)
7. Create Skills Browser UI
8. Add skill invocation via COPILOT chat
9. Show skill documentation inline

### Phase 4: Sync Automation (Week 4)
10. Build script to validate registry against actual files
11. Auto-generate tool stubs from skill definitions
12. CI check for registry/code sync

## Benefits

| Stakeholder | Current Pain | Unified Solution |
|-------------|--------------|------------------|
| **Kilo Code** | Skills are just docs, can't verify against code | Registry validates paths exist |
| **COPILOT** | Tools hardcoded, no discoverability | Dynamically loads from registry |
| **Developers** | Two places to update (docs + code) | Single source of truth |
| **End Users** | Don't know what AI can do | Skills browser shows capabilities |
| **Admins** | Can't control AI permissions | Registry has access control |

## File Structure After Unification

```
.kilocode/skills/
├── registry.json                    # THE source of truth
├── UNIFIED-SKILLS-ARCHITECTURE.md   # This document
├── SKILL-GRAPH.md                   # Visual dependency map
├── IMPLEMENTATION-ORDER.md          # Priority ordering
│
├── luci-research-agent/
│   ├── SKILL.md                     # Documentation
│   └── tool.schema.json             # Auto-generated from registry
│
├── ml-intelligence-engine/
│   ├── SKILL.md
│   └── tool.schema.json
│
└── ... (other skills)

apps/api/src/app/
├── skills/
│   ├── skill.schema.ts              # TypeScript interfaces
│   ├── skill-registry.service.ts    # Loads registry.json
│   └── skill-validator.service.ts   # Validates paths exist
│
├── copilot/
│   ├── skill-loader.service.ts      # Converts skills → tools
│   └── tools/                       # Actual tool implementations
│       ├── skip-trace.tool.ts
│       └── ...
```

## Next Steps

1. **Create `registry.json`** with all current skills
2. **Add `toolDefinition`** to skills that should be callable
3. **Build `SkillLoaderService`** in COPILOT module
4. **Test** skill invocation via COPILOT chat
