## Blue-Collar Owner Playbook for Advisors & Brokers

### 1. Target profile and story

- **Revenue band:** $1M–$50M in annual revenue, with proven profitability or clear operational leverage.
- **Roles:** owner/CEO, operations director, controller/accounting lead, and a trusted outside advisor or broker.
- **Industries:** service contractors (HVAC, plumbing, electrical, roofing, painting), specialty trades (concrete, excavation, decking), maintenance/facilities, logistics/distribution support, and contractor-adjacent tech/legal services.
- **Pain points:** recruiting and retaining skilled crews, lagging lead pipeline, quoting delays, inconsistent cash flow, no standardized business data to support valuations or advisory calls.
- **Advisory angle:** position as a deal-flow multiplier and insights engine, combining Apollo firmographics with internal performance signals to give brokers/advisors a single source of truth.

### 2. Apollo integration deep dive

#### Data enrichment

- Use Apollo’s company and contact APIs to pull firmographic data (revenue ranges, employee size, HQ location), key contacts (C-suite and senior ops), and intent signals (recent hires, funding, news, hiring growth).
- Filter/sort companies by revenue band, keywords (service, contractor, maintenance), and recent interactions (e.g., new job openings or fundraising) to keep the pipeline fresh.
- Maintain a synced cache that tags each contact with `revenue_band`, `primary_vertical`, `decision_role`, and `pain_flags` (e.g., “recruiting pressure”).

#### Sync strategy

- **Batch refresh:** schedule nightly `nx run integration:apollo-sync` (or equivalent Nx executor) that fetches updated company/contact info, applies enrichment rules, and writes into your Nx API database. Use pagination and backoff to respect rate limits.
- **Webhook updates:** subscribe to Apollo webhook events (if available) to get near-real-time updates for high-value targets (new fundraising, phone changes, etc.).
- **Change tracking:** log Apollo source (timestamp + entity id) alongside your internal data so UI components can show “Apollo-sourced insight” badges and explain data freshness to advisors/brokers.

#### Workflow automation

- Construct Apollo Workflows to auto-tag prospects by persona: e.g., assign `owner_title` tag when contact title matches “Owner”/“Founder,” assign `exit-ready` when revenue > $5M and profitability flag is true.
- Feed these tags into downstream Nx analytics to trigger notifications (Slack, email) for advisors and to populate UI filters.

#### Messaging and outreach

- Build two outbound sequences: one for business advisors (valuation insights, benchmarks, succession planning) and one for brokers (deal alerts, operational health, acquisition readiness).
- Link Apollo contact activity (emails, LinkedIn updates) to your CRM and Nx dashboards to prioritize follow-ups; record Apollo sequence engagement metrics for iterative improvement.

### 3. Ultimate UI cookbook

#### Layout

- **Dashboard:** hero section with aggregated KPIs (pipeline revenue coverage, average project margin, crew utilization) plus a lead-sentiment timeline driven by Apollo activity.
- **Grid cards:** mix of data-rich cards: “Opportunity Pulse” (Apollo score + last touched + next action), “Crew Status” (jobs in progress, capacity, safety alerts), “Deal Alerts” (Apollo hot companies filtered by revenue + intent) and “Operational Health” (cash conversion, backlog, service level).

#### Components

- **Opportunity Pulse widget:** show Apollo score (color-coded), decision-maker contact info, last outreach, and recommended next step. Inline quick actions (call, text, schedule discovery).
- **Crew status table:** display crews, primary job, scheduled completion, margin target, and operator notes. Allow inline edits to job status directly from the table.
- **Apollo lead card:** include data lineage tags (e.g., `Apollo Firmo`, `signal: hiring surge`), recent activity (last email, LinkedIn lead, Apollo intent), and a “playbook snippet” to coach advisors/brokers on talking points.
- **Sequence composer:** drag-and-drop area for advisors/brokers to choose prebuilt templates (insights, benchmarking, deal alerts) and set Apollo-triggered reminders (e.g., “notify if Apollo activity spikes”).

#### Interactions and accessibility

- Keyboard shortcuts for “next lead,” “mark as contacted,” and “schedule call”.
- Responsive tablet-first layout for advisors who review decks on-site; collapsible nav for mobile crews/brokers in the field.
- Contextual tooltips that explain Apollo fields (source, freshness, confidence), ensuring transparency.
- High-contrast industrial palette with rugged typography for quick scanning under varied lighting; include a “night mode” for site visits.

### 4. Implementation guidance and next steps

- Use Nx to enforce consistency: generate a service/app via `nx g @nrwl/node:app apollo-integration` to host sync jobs and normalize Apollo data before it reaches UI apps.
- Combine Nx workspace libs for shared components (Apollo data formatting, lead cards, UI themes) so dashboards and workflows can reuse logic.
- Create a “Blue Collar Cookbook” reference doc for designers and PMs, covering component usage, messaging prompts, and Apollo tags—link it from main nav.
- Next steps: prototype the Apollo sync service, wireframe the dashboard, craft pipeline-specific outreach templates, and document onboarding steps for advisors/brokers.
