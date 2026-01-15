# NEXTIER — AI Architecture Documentation

> Last Updated: 2026-01-15
> Maintainer: Claude Code (Opus)

## Agent Registry

| Agent | Purpose | Model | Transport | Human-in-Loop |
|-------|---------|-------|-----------|---------------|
| **GIANNA** | SMS opener & conversation handler | Template-based (no AI) | SignalHouse SMS | Yes (<70% confidence) |
| **CATHY** | Nurture agent with humor | GPT-4o-mini (optional) | SignalHouse SMS | No (template fallback) |
| **SABRINA** | Closer & scheduling | None (slot generation) | SignalHouse SMS + Calendly | Yes (100% approval) |
| **LUCI** | Research & enrichment | None (API integrations) | Tracerfy + RealEstateAPI | No |
| **COPILOT** | Central brain & classifier | GPT-4o-mini | Internal routing | Yes (confidence-based) |

## Perplexity Integration Points

| Location | Usage | Model |
|----------|-------|-------|
| `/lib/ai/perplexity-scanner.ts` | Business verification, owner research, competitive intel | llama-3.1-sonar-small-128k-online |
| `/api/research/deep/route.ts` | Deep company research | llama-3.1-sonar-small-128k-online |

**Status**: Direct API calls, NO shared client, NO retry/timeout logic.

## Shared AI Infrastructure Modules

### Existing (But Underutilized)
- `lib/services/llm-service.ts` — Singleton router (Claude/GPT/Gemini/Grok) — **NOT USED**
- `lib/ai/openai-client.ts` — Direct OpenAI calls (bypasses llm-service)
- `lib/ai/copilot-engine.ts` — Decision routing engine
- `lib/ai/cadence-engine.ts` — THE LOOP 30-day cadence

### Missing
- [ ] Centralized AI Orchestrator
- [ ] Perplexity shared client with retry/timeout
- [ ] Token usage tracking
- [ ] Cost metering per tenant
- [ ] Circuit breaker pattern
- [ ] Prompt versioning system

## Model Routing (Current)

```
Task                    → Model              → Provider
─────────────────────────────────────────────────────────
SMS Classification      → gpt-4o-mini        → OpenAI (direct)
Response Generation     → gpt-4o-mini        → OpenAI (direct)
Business Research       → sonar-small-128k   → Perplexity (direct)
Deep Research           → sonar-small-128k   → Perplexity (direct)
Suggest Reply           → claude-3-haiku     → Anthropic (fallback to OpenAI)
```

**Gap**: No cost-aware routing, no fallback chains, no model selection criteria.

## RAG & Knowledge Base

**Status**: NOT IMPLEMENTED
- No vector store
- No embeddings pipeline
- No document ingestion
- Knowledge is hardcoded in `lib/gianna/knowledge-base/`

## Queue Architecture

| Queue | Purpose | Status |
|-------|---------|--------|
| SMS Outbound | Campaign execution | ✅ Exists |
| Enrichment | Skip trace jobs | ✅ Exists |
| AI Tasks | Model calls | ❌ Missing |
| Research | Perplexity calls | ❌ Missing |

## Critical TODOs

1. **Immediate**: Route all AI calls through `llm-service.ts`
2. **Week 1**: Add timeout + retry to OpenAI/Perplexity calls
3. **Week 2**: Implement token usage logging
4. **Week 3**: Add circuit breaker for AI providers
5. **Month 1**: Build shared Perplexity research service
6. **Month 2**: Implement AI orchestrator layer
