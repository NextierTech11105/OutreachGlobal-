# RealEstateAPI Cookbook Overview & Best Practices

This reference summarizes how OutreachGlobal uses RealEstateAPI data and the supporting Next.js routes, so Claude Code, SDRs, and developers can operate safely and consistently.

## 1. What you can accomplish

- **Search properties** – Use `/api/property-search` to translate filters (state, county, MLS flags, zoning, lot size, ownership age, pre-foreclosure, tax liens, etc.) into RealEstateAPI `/v2/PropertySearch` calls. Saved searches capture buckets of up to ~10K IDs for reuse.
- **Hydrate property detail** – `/api/property-detail` supports both `GET?id=` (single record) and `POST` (batch payload) so you can pull valuation, ownership, and skip-trace fields needed for lead enrichment or downstream exports.
- **Skip trace** – `/api/skip-trace` submits arrays of property IDs (250 max per batch, 5K traces/day) to RealEstateAPI `/v2/PropertyDetail` skip-trace fields and returns phones/emails/mailing addresses, plus a `GET` route to track usage.
- **Campaign handoffs** – Results are ultimately funneled into SignalHouse/Twilio via `/api/signalhouse/*` routes after GraphQL lead creation, so list-building + enrichment feeds campaign prep.

## 2. Flow summary (search → enrichment → campaign)

1. **List building** – UI prompts (saved filters, the MCP terminal, or Claude) hit `/api/property-search` and store the resulting ID bucket in `saved_searches` / `saved_search_property_ids`.
2. **Enrichment** – Batch or single `/api/property-detail` calls add contextual data while `/api/skip-trace` adds owner contact info. Apollo.io routes can provide additional firmographic enrichment for B2B lists.
3. **Lead prep & outreach** – Data flows into `apps/api` (NestJS/GraphQL) to persist leads. SignalHouse/Twilio routes (`/api/signalhouse/send`, `/api/signalhouse/stats`) dispatch SMS campaigns (initial, follow-up, retarget) once a Claude- or UI-driven workflow labels the list.

## 3. Best practices

- **Always run through the Next.js API routes** (`/api/property-search`, `/api/property-detail`, `/api/skip-trace`). They centralize the API keys, daily limits, and logging so you can reuse responses safely.
- **Respect the skip-trace limits** – the POST handler caps batches at 250 and enforces a 5K traces/day counter. Use the `GET /api/skip-trace` endpoint before running a large job to avoid hitting the guardrail.
- **Save your filters before exporting** – saved searches capture the exact query and bucket state for reproducibility, change detection, and repeated exports. Export jobs read the saved search metadata when building CSV/object buckets.
- **Handle retries gracefully** – the shared service (`apps/front/src/lib/services/real-estate-api.ts`) already wraps API calls; surfacing `details`/`error` payloads to Claude or the UI helps know whether to retry or adjust filters.
- **Keep API keys and tokens out of git** – RealEstateAPI key lives in environment variables, and Claude’s `.mcp.json` should never ship with secrets (the DO token placeholder must be replaced at runtime).

## 4. Monitoring and diagrams

- The cookbook now includes a Mermaid flowchart showing Claude → Vercel → DigitalOcean → RealEstateAPI → SignalHouse; use it to explain the runtime path for each SDR action.
- The MCP dashboard (`apps/front/src/components/admin/mcp-dashboard.tsx`) and `docs/CLAUDE_CODE_REFERENCE.md` cite the same `/api/property-search`, `/api/property-detail`, and `/api/skip-trace` endpoints so prompts stay in sync.
 - When adding new MCP workflows or Claude prompts, keep the Mermaid timeline and endpoint table together so the diagrams reflect the current behavior.

## 5. Claude / SDR reminders

1. Start with saved searches and the `/api/property-search` filters described in `docs/REAL_ESTATE_SEARCH.md`, then save the query before enrichment.
2. Use `/api/property-detail` to fetch equity/write-down data, and `/api/skip-trace` for contact info—avoid calling RealEstateAPI directly so quotas and logging stay centralized.
3. Feed the enriched records into the NestJS GraphQL mutations (see `apps/api/src/app/lead` modules) and trigger SignalHouse campaigns once leads are labeled for their campaign type.
4. Reference `.mcp.json`, `docs/CLAUDE_CODE_REFERENCE.md`, and the new best practices memo before publishing a new SDR workflow or deployment that touches RealEstateAPI or DigitalOcean.
