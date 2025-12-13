# Apollo.io Business Advisor Lead Gen Cookbook

Goal: help Claude Code, AI SDRs, and internal users treat Apollo.io as the high-signal lead generation engine for business advisors targeting blue-collar owners/CEOs (auto dealerships, moving companies, and similar service firms) on $1–50 M revenue and ≥5 years in business.

## 1. Why Apollo for Advisors?

- **Audience:** business advisors who want to land opportunities with blue-collar firms (car dealerships, moving companies, transportation contractors, etc.) earning between $1M and $50M, led by owners or CEOs with at least five years of tenure. That combination signals stability, decision-making control, and the budgets to invest in advisory services.
- **Apollo strengths:** firmographic + technographic filters, verified contact data, enrichment on demand, and CRM automation (saving contacts to the Apollo workspace to preserve credits).
- **Workflow surface:** Everything funnels through the Next.js API routes under `/api/apollo-*` (especially `GET/POST /api/apollo-search`), so the UI, Claude, and MCP flows reuse the same query construction, API key handling, and error tracking.

## 2. High-level machine

1. **Build a target list** via `/api/apollo-search` (GET or POST) using Apollo's `mixed_people/search` endpoint and filters tuned to:
   - `person_seniorities`: `owner`, `founder`, `c_suite`, `partner`.
   - `person_titles`: include `CEO`, `President`, `Managing Partner`, `Owner`.
   - `organization_revenue_ranges`: pick the buckets tied to $1–50M (review Apollo revenue ranges / convert revenue to the string values Apollo expects).
   - `organization_num_employees_ranges`: optional filters like `11-50`, `51-200` to match the revenue band.
   - `organization_locations`: state/city focus areas (NY, NJ, FL, etc.).
   - `organization_keyword_tags`: add blue-collar verticals such as `car dealership`, `auto dealership`, `moving company`, `transportation services`, `trucking`, or `construction services`.
   - Add `q_keywords` or `q_organization_name` when targeting known firms.
2. **Enrich every lead** with `/api/apollo-search` action `enrich-person` (Apollo’s `/people/match`), `enrich-organization`, or `searchB2BProspects`. Capture phones, LinkedIn, company tech stack, and revenue metadata.
3. **Create CRM leads** by sending enriched results to the GraphQL `Lead` mutations in `apps/api` (see `apps/api/src/app/lead/resolvers/lead.resolver.ts`). Tag them for follow-up (initial/retarget/follow-up) and mark the campaign type.
4. **Launch outreach** via `/api/signalhouse/send` or `/api/twilio` once the lead list is ready; note the SDR workflow described in `docs/REAL_ESTATE_SEARCH.md` but substitute Apollo for property data.
5. **Track progress** with SignalHouse stats and Apollo saved contacts (the route `apps/front/src/app/api/apollo/route.ts` handles configuration + API key storage).

## 3. Sample query recipe

```json
{
  "action": "search-people",
  "person_seniorities": ["owner", "founder", "c_suite"],
  "person_titles": ["CEO", "President", "Managing Partner", "Owner"],
  "organization_revenue_ranges": ["1000000-50000000"],
  "organization_num_employees_ranges": ["11-50", "51-200"],
  "organization_keyword_tags": ["car dealership", "auto dealership", "moving company", "transportation services", "blue collar services"],
  "organization_locations": ["NY", "NJ", "CT", "FL"],
  "page": 1,
  "per_page": 50
}
```

- Use POST `/api/apollo-search` with this body so the Next.js route wraps the Apollo key and handles errors. The response includes `people`, `contacts`, and `pagination`.
- Save the rich Apollo data into your CRM via GraphQL once you confirm the contact meets the revenue + tenure criteria (Apollo returns `founded_year` and `organization` metadata; calculate years in business as the difference from the current year).

## 4. Best practices

- **Stick to Next.js API routes** so the API key never leaks to the client. All Apollo interactions (search, enrich, contact creation) should call `/api/apollo-search`, `/api/apollo/enrich`, or `/api/apollo/configure`.
- **Reuse Apollo contacts** – after enriching a person, hit `/api/apollo-search` action `createContactFromEnrichedPerson` (or `createContactsBulk`) so Apollo saves the contact and you avoid duplicate credit usage.
- **Limit revenue/age filters** to the 1–50M range and require `founded_year` ≤ currentYear-5. You can verify with `organization.revenue` and `organization.founded_year` inside the enrichment payload.
- **Combine Apollo with saved searches** – once Apollo returns a list, store their IDs via the SDR workflow, add them to a saved search snapshot in Postgres, and treat them as input for SignalHouse SMS sequences or outreach cadences.
- **Automate follow-ups** with CLAUDE prompts referencing `docs/CLAUDE_CODE_REFERENCE.md` and the new Apollo cookbook. Example prompt: “Claude, build a list of car dealership owners and moving company CEOs in the Northeast with $1-50M revenue, enrich their contacts via Apollo, create leads, and queue a SignalHouse initial outreach campaign.”
- **Document quotas** – keep track of Apollo credits/usage (Apollo dashboard) and log each enrichment in `apps/api` for auditing (the `apollo-test` controller already validates connectivity).

## 5. Claude + MCP notes

- Use Claude to compose natural-language queries referencing Apollo-specific filters (actions, revenue ranges, titles). The dashboard in `apps/front/src/components/admin/mcp-dashboard.tsx` now shows MCP connections for Postgres, RealEstateAPI, and DigitalOcean; Apollo prompts combine Postgres data (saved searches) with the Apollo enrichment context.
- When building a “lead gen machine,” chain: saved search master list (Postgres) → Apollo search/enrich call → GraphQL lead creation → SignalHouse campaign.
- Keep `docs/REALESTATE_API_COOKBOOK_OVERVIEW.md` and this Apollo cookbook aligned so SDR teams share the same DAO (data access object) around search/enrichment/campaign flows.

## 6. Troubleshooting

- If `/api/apollo-search` complains about missing API keys, go to `apps/front/src/app/api/apollo/configure` and set the key via the UI (linked from the admin integration page).
- For stalled campaigns, check Apollo’s saved contacts in `apps/front/src/components/admin/apollo` and ensure the `createContactsBulk` helper succeeded (errors log to the console and to `apps/api/src/app/lead/controllers/apollo-search.controller.ts`).
- Re-run the Apollo test route (`apps/front/src/app/api/apollo/test/route.ts`) after rotating keys or when Claude reports “Apollo API key not configured.”
