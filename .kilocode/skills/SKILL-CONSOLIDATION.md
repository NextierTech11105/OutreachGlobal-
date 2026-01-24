# Skill Consolidation Plan

> **Status**: PROPOSED
> **Current Skills**: 67
> **Target Skills**: 18
> **Reduction**: 73%

---

## Executive Summary

The current `.kilocode/skills/` directory contains 67 skill definitions with significant overlap, redundancy, and generic content not specific to NextTier. This consolidation plan reduces to **18 production-focused skills** organized into 5 tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 0: META ARCHITECT                    │
│              nextier-app-architect (1 skill)                 │
│         Full codebase context for all development           │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TIER 1: AGENTS │  │  TIER 2: DATA   │  │ TIER 3: INFRA   │
│    (5 skills)   │  │   (4 skills)    │  │   (4 skills)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               TIER 4: ORCHESTRATION (2 skills)               │
│       workflow-orchestration + ai-agent-lifecycle            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                TIER 5: QUALITY (2 skills)                    │
│           code-quality-enforcer + technical-docs             │
└─────────────────────────────────────────────────────────────┘
```

---

## Final 18 Skills

### Tier 0: Meta Architect (1 skill)
| Skill | Purpose | Status |
|-------|---------|--------|
| **nextier-app-architect** | Complete codebase context, patterns, architecture | KEEP |

### Tier 1: AI Agents (5 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| **gianna-sdr-agent** | SMS opener, cold outreach, objection handling | KEEP |
| **cathy-nurture-agent** | Nurture/nudge conversations, human 1:1 | KEEP |
| **luci-enrichment-agent** | Skip tracing, phone validation, lead scoring | KEEP |
| **neva-research-copilot** | Perplexity research, business intel, personalization | KEEP |
| **ai-co-pilot-response-generator** | COPILOT response suggestions, intent classification | KEEP |

### Tier 2: Data Pipeline (4 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| **data-lake-orchestration-agent** | Ingestion, storage, export, CSV processing | KEEP (absorbs 8 skills) |
| **list-management-handler** | Lead list CRUD, segmentation, filtering | KEEP |
| **lead-state-manager** | State machine, lifecycle transitions | KEEP |
| **lead-journey-tracker** | Interaction analytics, attribution | KEEP |

### Tier 3: Infrastructure (4 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| **signalhouse-integration** | SMS delivery, 10DLC, webhooks, number mapping | KEEP (absorbs 4 skills) |
| **devops-platform-engineer** | DO infra, deployment, CI/CD, monitoring | KEEP (absorbs 8 skills) |
| **campaign-optimizer** | Outreach optimization, ML scheduling, A/B testing | KEEP (absorbs 3 skills) |
| **cost-guardian** | Budget control, usage metering, cost tracking | KEEP |

### Tier 4: Orchestration (2 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| **workflow-orchestration-engine** | Multi-step workflows, agent coordination, error recovery | KEEP (absorbs 9 skills) |
| **ai-agent-lifecycle-management** | Agent deployment, scaling, monitoring, versioning | KEEP |

### Tier 5: Quality (2 skills)
| Skill | Purpose | Status |
|-------|---------|--------|
| **code-quality-enforcer** | Pattern validation, initialization fixes, linting | KEEP (absorbs 4 skills) |
| **technical-documentation-agent** | PRDs, SOPs, API docs, skill documentation | KEEP |

---

## Detailed Consolidation Mapping

### Skills Being Merged

#### → data-lake-orchestration-agent (absorbs 8)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
data-lake-manager                   → data-lake-orchestration-agent
data-pipeline-orchestration         → data-lake-orchestration-agent
csv-processing-engine               → data-lake-orchestration-agent
data-export-enrichment-engine       → data-lake-orchestration-agent
data-batching-enrichment-preparer   → luci-enrichment-agent
usbizdata-import-export-handler     → data-lake-orchestration-agent
data-query-optimization-coordinator → data-lake-orchestration-agent
database-management-engine          → data-lake-orchestration-agent
```

#### → signalhouse-integration (absorbs 4)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
sms-integration-module              → signalhouse-integration
signalhouse-number-mapping-manager  → signalhouse-integration
inbound-call-sms-router             → signalhouse-integration
signalhouse-scalability-audit       → signalhouse-integration
```

#### → devops-platform-engineer (absorbs 8)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
devops-infrastructure-expert        → devops-platform-engineer (rename)
digitalocean-hosting-handler        → devops-platform-engineer
infrastructure-as-code-builder      → devops-platform-engineer
cloud-resource-manager              → devops-platform-engineer
infra-capacity                      → devops-platform-engineer
scalability-and-monitoring-hub      → devops-platform-engineer
backup-and-recovery-validator       → devops-platform-engineer
devops-reference-template           → devops-platform-engineer
```

#### → workflow-orchestration-engine (absorbs 9)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
contextual-orchestrator             → workflow-orchestration-engine
service-orchestration-hub           → workflow-orchestration-engine
event-driven-coordination           → workflow-orchestration-engine
multi-channel-integration-hub       → workflow-orchestration-engine
orchestration-failure-recovery      → workflow-orchestration-engine
orchestration-quality-assurance     → code-quality-enforcer
platform-engineering-orchestrator   → workflow-orchestration-engine
inbound-response-handler            → gianna-sdr-agent
auto-response-engine                → ai-co-pilot-response-generator
cadence-scheduler                   → campaign-optimizer
```

#### → campaign-optimizer (absorbs 3)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
sms-campaign-data-preparator        → campaign-optimizer
lead-management-orchestrator        → lead-state-manager + lead-journey-tracker
ml-intelligence-engine              → campaign-optimizer (ML features)
```

#### → code-quality-enforcer (absorbs 4)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
code-quality                        → code-quality-enforcer
schema-audit                        → code-quality-enforcer
security-scan                       → code-quality-enforcer
api-integration-test                → code-quality-enforcer
```

#### → cost-guardian (absorbs 2)
```
DEPRECATED                          → ABSORBED INTO
─────────────────────────────────────────────────────
ai-cost-guardian                    → cost-guardian
ai-resource-capacity-planning       → cost-guardian
```

---

### Skills Being Deprecated (Full Removal)

#### Frontend Skills (6) - Not Production Critical
```
front-end-routing-engine          → DEPRECATED (standard Next.js patterns)
ui-component-library              → DEPRECATED (use shadcn/ui docs)
state-management-coordinator      → DEPRECATED (standard React patterns)
responsive-design-validator       → DEPRECATED (not business-critical)
wireframe-to-code-converter       → DEPRECATED (not business-critical)
cross-platform-compatibility-checker → DEPRECATED (not business-critical)
```

#### Generic/Redundant Skills (10)
```
ai-performance-optimizer          → DEPRECATED (too generic)
ai-service-integration-validator  → DEPRECATED (in api-integration-test)
multi-tenant-ai-isolation         → DEPRECATED (in multi-tenant-audit)
multi-tenant-audit                → DEPRECATED (in code-quality-enforcer)
back-end-api-bridge               → DEPRECATED (standard patterns)
```

---

## Directory Structure After Consolidation

```
.kilocode/skills/
├── registry.json                       # Unified skill registry
├── SKILL-CONSOLIDATION.md              # This document
├── SKILL-GRAPH.md                      # Visual dependency map
├── IMPLEMENTATION-ORDER.md             # Priority ordering
├── UNIFIED-SKILLS-ARCHITECTURE.md      # Architecture overview
│
├── nextier-app-architect/              # Tier 0: Meta
│   └── SKILL.md
│
├── gianna-sdr-agent/                   # Tier 1: Agents
│   └── SKILL.md
├── cathy-nurture-agent/                # Tier 1
│   └── SKILL.md
├── luci-enrichment-agent/              # Tier 1
│   └── SKILL.md
├── neva-research-copilot/              # Tier 1
│   └── SKILL.md
├── ai-co-pilot-response-generator/     # Tier 1
│   └── SKILL.md
│
├── data-lake-orchestration-agent/      # Tier 2: Data
│   └── SKILL.md
├── list-management-handler/            # Tier 2
│   └── SKILL.md
├── lead-state-manager/                 # Tier 2
│   └── SKILL.md
├── lead-journey-tracker/               # Tier 2
│   └── SKILL.md
│
├── signalhouse-integration/            # Tier 3: Infra
│   └── SKILL.md
├── devops-platform-engineer/           # Tier 3
│   └── SKILL.md
├── campaign-optimizer/                 # Tier 3
│   └── SKILL.md
├── cost-guardian/                      # Tier 3
│   └── SKILL.md
│
├── workflow-orchestration-engine/      # Tier 4: Orchestration
│   └── SKILL.md
├── ai-agent-lifecycle-management/      # Tier 4
│   └── SKILL.md
│
├── code-quality-enforcer/              # Tier 5: Quality
│   └── SKILL.md
└── technical-documentation-agent/      # Tier 5
    └── SKILL.md
```

---

## Implementation Plan

### Phase 1: Consolidate Core (Week 1)
1. ✅ Update `nextier-app-architect` as the meta skill
2. ✅ Update `code-quality-enforcer` with NextTier patterns
3. [ ] Merge `contextual-orchestrator` → `workflow-orchestration-engine`
4. [ ] Rename `devops-infrastructure-expert` → `devops-platform-engineer`

### Phase 2: Agent Skills (Week 2)
5. [ ] Rename `gianna-sdr-agent` → ensure aligned with [gianna.service.ts](apps/api/src/app/gianna/gianna.service.ts)
6. [ ] Rename `cathy-customer-support` → `cathy-nurture-agent`
7. [ ] Ensure `luci-research-agent` → `luci-enrichment-agent` alignment
8. [ ] Verify `neva-research-copilot` references actual NEVA service

### Phase 3: Data Pipeline (Week 3)
9. [ ] Consolidate 8 data skills into `data-lake-orchestration-agent`
10. [ ] Verify `list-management-handler` covers all list operations
11. [ ] Ensure `lead-state-manager` has proper state machine

### Phase 4: Infrastructure (Week 4)
12. [ ] Consolidate 4 SignalHouse skills into `signalhouse-integration`
13. [ ] Consolidate 8 DevOps skills into `devops-platform-engineer`
14. [ ] Ensure `campaign-optimizer` includes ML features

### Phase 5: Cleanup (Week 5)
15. [ ] Delete deprecated skill directories
16. [ ] Update `registry.json` with final 18 skills
17. [ ] Update `SKILL-GRAPH.md` with new architecture
18. [ ] Update `IMPLEMENTATION-ORDER.md` with new priorities

---

## Skill-to-Code Mapping

### Tier 1: AI Agents → Actual Services

| Skill | Backend Service | Module |
|-------|-----------------|--------|
| gianna-sdr-agent | [gianna.service.ts](apps/api/src/app/gianna/gianna.service.ts) | GiannaModule |
| cathy-nurture-agent | [cathy.service.ts](apps/api/src/app/cathy/cathy.service.ts) | CathyModule |
| luci-enrichment-agent | [luci.service.ts](apps/api/src/app/luci/luci.service.ts) | LuciModule |
| neva-research-copilot | [neva.service.ts](apps/api/src/app/neva/neva.service.ts) | NevaModule |
| ai-co-pilot-response-generator | [copilot.service.ts](apps/api/src/app/copilot/copilot.service.ts) | CopilotModule |

### Tier 2: Data Pipeline → Actual Services

| Skill | Backend Service | Module |
|-------|-----------------|--------|
| data-lake-orchestration-agent | [raw-data-lake.service.ts](apps/api/src/app/raw-data-lake/raw-data-lake.service.ts) | RawDataLakeModule |
| list-management-handler | [lead.service.ts](apps/api/src/app/lead/services/lead.service.ts) | LeadModule |
| lead-state-manager | [lead.service.ts](apps/api/src/app/lead/services/lead.service.ts) | LeadModule |
| lead-journey-tracker | [message.service.ts](apps/api/src/app/message/services/message.service.ts) | MessageModule |

### Tier 3: Infrastructure → Actual Services

| Skill | Backend Service | Module |
|-------|-----------------|--------|
| signalhouse-integration | [signalhouse.service.ts](apps/api/src/lib/signalhouse/signalhouse.service.ts) | SignalHouseModule |
| campaign-optimizer | [campaign.service.ts](apps/api/src/app/campaign/services/campaign.service.ts) | CampaignModule |
| cost-guardian | [subscription.service.ts](apps/api/src/app/billing/services/subscription.service.ts) | BillingModule |

### Tier 4: Orchestration → Actual Services

| Skill | Backend Service | Module |
|-------|-----------------|--------|
| workflow-orchestration-engine | [ai-orchestrator.service.ts](apps/api/src/app/ai-orchestrator/ai-orchestrator.service.ts) | AiOrchestratorModule |
| ai-agent-lifecycle-management | [ai-orchestrator.service.ts](apps/api/src/app/ai-orchestrator/ai-orchestrator.service.ts) | AiOrchestratorModule |

---

## Registry Update

After consolidation, `registry.json` should contain exactly 18 skills:

```json
{
  "version": "2.0.0",
  "consolidatedFrom": "1.0.0 (67 skills)",
  "skills": [
    { "id": "nextier-app-architect", "tier": 0, "status": "production" },
    { "id": "gianna-sdr-agent", "tier": 1, "status": "production" },
    { "id": "cathy-nurture-agent", "tier": 1, "status": "production" },
    { "id": "luci-enrichment-agent", "tier": 1, "status": "production" },
    { "id": "neva-research-copilot", "tier": 1, "status": "production" },
    { "id": "ai-co-pilot-response-generator", "tier": 1, "status": "production" },
    { "id": "data-lake-orchestration-agent", "tier": 2, "status": "production" },
    { "id": "list-management-handler", "tier": 2, "status": "beta" },
    { "id": "lead-state-manager", "tier": 2, "status": "beta" },
    { "id": "lead-journey-tracker", "tier": 2, "status": "beta" },
    { "id": "signalhouse-integration", "tier": 3, "status": "production" },
    { "id": "devops-platform-engineer", "tier": 3, "status": "production" },
    { "id": "campaign-optimizer", "tier": 3, "status": "beta" },
    { "id": "cost-guardian", "tier": 3, "status": "beta" },
    { "id": "workflow-orchestration-engine", "tier": 4, "status": "production" },
    { "id": "ai-agent-lifecycle-management", "tier": 4, "status": "beta" },
    { "id": "code-quality-enforcer", "tier": 5, "status": "production" },
    { "id": "technical-documentation-agent", "tier": 5, "status": "beta" }
  ]
}
```

---

## Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Skills | 67 | 18 | 73% reduction |
| Duplicate Concepts | 25+ | 0 | 100% elimination |
| Skills with Actual Code | ~15 | 18 | All mapped |
| Generic Content | 60% | 5% | 92% reduction |
| Maintenance Burden | High | Low | Significant |

---

## Next Steps

1. **Review this plan** - Get team approval
2. **Execute Phase 1** - Core consolidation
3. **Update skills incrementally** - One tier at a time
4. **Delete deprecated directories** - Clean up
5. **Update registry.json** - Final source of truth
