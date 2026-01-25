# Nextier Skills SOP

## Introduction
This SOP documents the 5-tier, 18-skill system used in the Nextier OutreachGlobal monorepo. Each skill corresponds to a real code path (service/module/docs) and should be invoked based on the business workflow stage.

Tiers:
- Tier 0: Architecture and global context
- Tier 1: Core AI agents
- Tier 2: Data and lead state
- Tier 3: Integrations and platform services
- Tier 4: Orchestration and lifecycle
- Tier 5: Quality and documentation

## Decision Tree

Lead Management
- import -> `data-lake-orchestration-agent`
- enrich -> `luci-enrichment-agent`
- research -> `neva-research-copilot`
- state -> `lead-state-manager`

Outreach
- cold opener -> `gianna-sdr-agent`
- nurture -> `cathy-nurture-agent`
- reply suggestions -> `ai-co-pilot-response-generator`
- SMS transport -> `signalhouse-integration`

Campaigns
- optimize -> `campaign-optimizer`
- costs -> `cost-guardian`

Development
- patterns -> `nextier-app-architect`
- quality -> `code-quality-enforcer`
- docs -> `technical-documentation-agent`

Infrastructure
- deploy -> `devops-platform-engineer`
- orchestrate -> `workflow-orchestration-engine`
- lifecycle -> `ai-agent-lifecycle-management`

## Practical Workflows

Workflow 1: Lead Import -> Enrichment -> Campaign
1. `data-lake-orchestration-agent` (import CSV, create block)
2. `luci-enrichment-agent` (trace + score + SMS-ready)
3. `lead-state-manager` (set lead lifecycle state)
4. `campaign-optimizer` (create campaign + sequences)
5. `gianna-sdr-agent` (send openers to SMS-ready leads)

Workflow 2: Inbound SMS -> Response
1. `signalhouse-integration` (webhook receives inbound SMS)
2. `ai-co-pilot-response-generator` (suggest replies or auto-respond)
3. `lead-state-manager` (update state based on inbound intent)
4. `gianna-sdr-agent` or `cathy-nurture-agent` (reply and follow up)

Workflow 3: Feature Development
1. `nextier-app-architect` (confirm module locations and patterns)
2. `code-quality-enforcer` (lint/test conventions)
3. `technical-documentation-agent` (update docs and SKILLs)

## Skill Dependencies Matrix

| Skill | Prerequisites |
| --- | --- |
| `nextier-app-architect` | None |
| `gianna-sdr-agent` | `signalhouse-integration`, `workflow-orchestration-engine` |
| `cathy-nurture-agent` | `workflow-orchestration-engine`, `lead-state-manager` |
| `luci-enrichment-agent` | `data-lake-orchestration-agent`, `cost-guardian` |
| `neva-research-copilot` | `workflow-orchestration-engine` |
| `ai-co-pilot-response-generator` | `workflow-orchestration-engine`, `signalhouse-integration` |
| `data-lake-orchestration-agent` | None |
| `list-management-handler` | `data-lake-orchestration-agent` |
| `lead-state-manager` | `signalhouse-integration` |
| `lead-journey-tracker` | `signalhouse-integration`, `campaign-optimizer` |
| `signalhouse-integration` | None |
| `devops-platform-engineer` | None |
| `campaign-optimizer` | `list-management-handler`, `lead-state-manager`, `signalhouse-integration` |
| `cost-guardian` | None |
| `workflow-orchestration-engine` | None |
| `ai-agent-lifecycle-management` | `workflow-orchestration-engine` |
| `code-quality-enforcer` | `nextier-app-architect` |
| `technical-documentation-agent` | `nextier-app-architect`, `code-quality-enforcer` |

## Cost Implications

| Skill | Cost Notes |
| --- | --- |
| `luci-enrichment-agent` | Tracerfy: $0.02/lead (person) or $0.15/lead (company); Trestle: $0.015/phone validation or $0.03/phone Real Contact; full enrichment $0.05/lead |
| `data-lake-orchestration-agent` | No cost until LUCI enrichment runs |
| `gianna-sdr-agent` | SignalHouse SMS cost; AI fallback uses OpenAI pricing table |
| `cathy-nurture-agent` | AI suggestions use OpenAI pricing table; SMS costs via SignalHouse |
| `neva-research-copilot` | Perplexity per-request fee + token costs from provider pricing table |
| `ai-co-pilot-response-generator` | AI suggestions use OpenAI pricing; auto-respond uses SignalHouse SMS |
| `signalhouse-integration` | Per-message SMS/MMS fees and 10DLC charges billed by SignalHouse |
| `workflow-orchestration-engine` | AI cost computed per provider in `provider.types.ts` |
| `ai-agent-lifecycle-management` | Usage limits default to 1M tokens, 10k requests, or $50/month |
| `cost-guardian` | Tracks plan limits and credits; no external API cost |
| `campaign-optimizer` | No direct API cost; SMS cost applies when sending |
| `lead-state-manager` | No external cost |
| `lead-journey-tracker` | No external cost |
| `list-management-handler` | No external cost (business list provider billed separately) |
| `nextier-app-architect` | No external cost |
| `code-quality-enforcer` | No external cost |
| `technical-documentation-agent` | No external cost |
| `devops-platform-engineer` | Infrastructure costs billed by DigitalOcean |

## Multi-Tenant Considerations
- Every service and controller should require `teamId` or use `TenantContext` to ensure isolation.
- Queue jobs must carry `teamId` and validate tenant context before execution.
- Cache keys must include `teamId` (example: NEVA cache keys and AI usage records).
- Database queries must filter by `teamId` on all tenant-owned tables.
- Webhook handlers must map inbound identifiers to a team before processing.
