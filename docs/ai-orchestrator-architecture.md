# AI ORCHESTRATOR - Architecture Mental Map

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXTIER AI ORCHESTRATOR                             │
│                    Single Entrypoint for All AI Ops                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AiOrchestratorController                          │   │
│  │                    POST /ai/execute                                  │   │
│  │                    POST /ai/classify-sms                             │   │
│  │                    POST /ai/generate-sms                             │   │
│  │                    POST /ai/research                                 │   │
│  │                    GET  /ai/usage                                    │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AiOrchestratorService                             │   │
│  │                                                                      │   │
│  │  execute<TInput, TOutput>(request) ──→ OrchestratorResult           │   │
│  │  classifySms(context, message) ──→ { intent, confidence }           │   │
│  │  generateSmsResponse(context, input) ──→ { response, escalate }     │   │
│  │  researchDeep(context, query) ──→ { summary, findings }             │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                     CORE FLOW                                 │   │   │
│  │  │                                                               │   │   │
│  │  │  1. Check Usage Limits (UsageMeterService)                    │   │   │
│  │  │  2. Load Prompt (ai_prompts table + versioning)               │   │   │
│  │  │  3. Build Messages (system + user)                            │   │   │
│  │  │  4. Route to Provider (task → model mapping)                  │   │   │
│  │  │  5. Execute with Fallback Chain                               │   │   │
│  │  │  6. Record Usage (usage_records table)                        │   │   │
│  │  │  7. Return Result with traceId                                │   │   │
│  │  │                                                               │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                              │
│          ┌───────────────────┼───────────────────┐                         │
│          ▼                   ▼                   ▼                          │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                 │
│  │ OpenAIClient  │   │AnthropicClient│   │PerplexityClient│                 │
│  │               │   │               │   │                │                 │
│  │ gpt-4o-mini   │   │ claude-3-haiku│   │ sonar-small    │                 │
│  │ gpt-4o        │   │ claude-3-5    │   │ sonar-large    │                 │
│  │               │   │ claude-3-opus │   │                │                 │
│  │ SMS tasks     │   │ Meeting briefs│   │ Web research   │                 │
│  │               │   │ Fallback      │   │                │                 │
│  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘                 │
│          │                   │                   │                          │
│          └───────────────────┴───────────────────┘                          │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CircuitBreakerService                             │   │
│  │                                                                      │   │
│  │  CLOSED ──(5 failures)──→ OPEN ──(30s)──→ HALF_OPEN ──(2 success)──→│   │
│  │                              ↑                            │          │   │
│  │                              └────────(1 failure)─────────┘          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Task → Model Routing

```
┌──────────────────┬─────────────┬───────────────────────────────┐
│ Task             │ Provider    │ Model                         │
├──────────────────┼─────────────┼───────────────────────────────┤
│ sms_classify     │ openai      │ gpt-4o-mini                   │
│ sms_generate     │ openai      │ gpt-4o-mini                   │
│ research_verify  │ perplexity  │ llama-3.1-sonar-small-128k    │
│ research_deep    │ perplexity  │ llama-3.1-sonar-small-128k    │
│ meeting_brief    │ anthropic   │ claude-3-haiku                │
└──────────────────┴─────────────┴───────────────────────────────┘
```

## Fallback Chains

```
openai ────→ anthropic (GPT fails → Claude)
anthropic ─→ openai    (Claude fails → GPT)
perplexity → openai    (Research fails → Non-realtime GPT)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       REQUEST FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Incoming SMS                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                │
│  │ SignalHouse │                                                │
│  │  Webhook    │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │ Inbox       │──→│ AI          │──→│ Suggest     │           │
│  │ Service     │   │ Orchestrator│   │ Response    │           │
│  └─────────────┘   └─────────────┘   └──────┬──────┘           │
│                                              │                   │
│                                              ▼                   │
│                                       ┌─────────────┐           │
│                                       │ Human       │           │
│                                       │ Approval    │ (if <70%) │
│                                       └──────┬──────┘           │
│                                              │                   │
│                                              ▼                   │
│                                       ┌─────────────┐           │
│                                       │ Send SMS    │           │
│                                       │ Response    │           │
│                                       └─────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Tables Used

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ai_prompts                        usage_records                │
│  ┌───────────────────────┐        ┌───────────────────────┐    │
│  │ id                    │        │ id                    │    │
│  │ team_id               │        │ team_id               │    │
│  │ prompt_key            │        │ usage_type = 'ai_call'│    │
│  │ version               │        │ quantity              │    │
│  │ system_prompt         │        │ total_cost            │    │
│  │ user_prompt_template  │        │ resource_id           │    │
│  │ model                 │        │ resource_type = task  │    │
│  │ temperature           │        │ metadata: {           │    │
│  │ max_tokens            │        │   task,               │    │
│  │ is_active             │        │   provider,           │    │
│  │ usage_count           │        │   model,              │    │
│  │ avg_latency_ms        │        │   traceId,            │    │
│  │ success_rate          │        │   tokens,             │    │
│  └───────────────────────┘        │   costUsd,            │    │
│                                   │   latencyMs           │    │
│                                   │ }                     │    │
│                                   └───────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
apps/api/src/app/ai-orchestrator/
├── ai-orchestrator.module.ts      # NestJS module
├── ai-orchestrator.service.ts     # Main orchestrator logic
├── ai-orchestrator.controller.ts  # REST endpoints
├── index.ts                       # Public exports
│
├── providers/
│   ├── provider.types.ts          # Core types + pricing
│   ├── openai.client.ts           # OpenAI API client
│   ├── anthropic.client.ts        # Anthropic API client
│   ├── perplexity.client.ts       # Perplexity API client
│   └── index.ts
│
└── usage/
    ├── usage-meter.service.ts     # Usage tracking + limits
    └── index.ts
```

## Key Interfaces

```typescript
// Request
interface OrchestratorRequest<TInput> {
  task: AiTask;                    // sms_classify, research_deep, etc.
  priority: "interactive" | "background";
  context: AiContext;              // teamId, userId, traceId, channel
  input: TInput;                   // Task-specific input
  promptKey?: string;              // Override default prompt
  maxLatencyMs?: number;           // Latency budget
  maxCostUsd?: number;             // Cost budget
}

// Response
interface OrchestratorResult<TOutput> {
  output: TOutput;                 // Task-specific output
  provider: AiProvider;            // Which provider served
  model: string;                   // Which model used
  degraded: boolean;               // Used fallback?
  usage?: AiUsage;                 // Token counts + cost
  traceId: string;                 // Request correlation ID
  latencyMs: number;               // Total latency
}

// Context
interface AiContext {
  teamId: string;                  // Tenant isolation
  userId?: string;                 // Who triggered
  leadId?: string;                 // For SMS context
  conversationId?: string;         // Conversation thread
  traceId: string;                 // Correlation ID
  channel: "sms" | "web" | "system";
}
```

## Hardening Features

| Feature | Implementation |
|---------|---------------|
| **Circuit Breaker** | 5 failures → OPEN, 30s cooldown, 2 successes to close |
| **Retry** | 3 attempts, exponential backoff (1s, 2s, 4s) |
| **Timeout** | 30s (OpenAI/Anthropic), 45s (Perplexity) |
| **Fallback** | Auto-failover to alternate provider |
| **Usage Limits** | Per-tenant monthly caps on tokens/requests/cost |
| **Tracing** | Correlation ID propagated through all calls |

---

Last updated: 2026-01-18
