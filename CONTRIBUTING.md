# Social XPress Engine — Contribution Guardrails
## A product by Nextier (not the Nextier app)

---

## 1. Purpose
This document exists to **protect the product boundary** of Social XPress Engine.
It ensures that:
- scope does not creep
- architecture does not drift
- IP boundaries remain clean
- this system never becomes a CRM, campaign tool, or execution platform

These rules are **non-negotiable**.

---

## 2. What this product is
Social XPress Engine is:
- A **market-acquisition product**
- An **audience-to-infrastructure system**
- A **lead-card + intelligence factory**
- An **enrich-on-demand orchestrator**
- A **clean data provider** to execution platforms

Its role ends **where execution begins**.

---

## 3. What this product is NOT
Social XPress Engine is **not**:
- The Nextier app
- A module of Outreach Global
- A CRM
- A campaign manager
- A messaging system
- A call-routing platform
- A deal pipeline
- A marketing automation engine

If a feature involves:
- sending messages
- running campaigns
- assigning reps
- managing deals
- tracking revenue

…it **does not belong** in this repository.

---

## 4. Hard boundaries (non-negotiable)
### Social XPress Engine MUST NEVER:
- Send SMS, email, or DMs
- Trigger campaigns
- Schedule calls or meetings
- Assign leads to reps
- Store pipeline or deal data
- Score opportunities
- Replace CRMs
- Run sales workflows

### Execution platforms MUST NEVER:
- Enrich leads
- Tag personas or tribes
- Modify lead cards
- Rewrite confidence scores
- Bypass enrichment gates
- Mutate Social XPress data models

**The contract is the boundary.**

---

## 5. IP boundary
This repository is:
- Proprietary IP of **Nextier**
- A **product**, not a feature
- Designed for:
  - licensing
  - white-labeling
  - controlled partnerships
  - long-term platform value

### Rules
- No code from execution platforms is copied in
- No business logic is shared
- No database is shared
- No internal APIs are consumed

Integration happens **only** through:
- versioned handoff contracts
- file/API/queue interfaces

---

## 6. Data handling guardrails
### Data tiers are sacred
1. **Social Data**
   - usernames, bios, platform context
2. **Contact Data**
   - phone, email, business info
3. **Execution Data**
   - labels, personas, tribes, readiness

These tiers **must never collapse** into one another.

### Absolute rules
- No enrichment without explicit gate approval
- No contact data stored in social tables
- No execution metadata written back into acquisition layers

---

## 7. Adapter-only integrations
All third-party services must be implemented as **adapters**.
This means:
- No provider logic in domains
- No credentials in code
- No tight coupling
- No hardcoded assumptions

Adapters must:
- be replaceable
- be auditable
- fail safely

---

## 8. Security posture
- Secrets live only in:
  - DigitalOcean App Platform secrets
  - environment variables
- Never in:
  - source code
  - commit history
  - config files

### Required practices
- Least-privilege access
- Enrichment actions logged
- Audit events emitted
- No outbound messaging functionality
- NDA applies to all contributors

---

## 9. Change control
Any change that affects:
- data model
- enrichment flow
- handoff contract
- system boundaries

…requires:
1. Architecture review
2. Contract impact assessment
3. Version bump if breaking
4. Written approval

No exceptions for:
- “quick fixes”
- “temporary hacks”
- “just for this client”

---

## 10. Forbidden feature list
The following features are **explicitly banned** from this repo:
- SMS sending
- Email sending
- DM automation
- Campaign builders
- Drip sequences
- Call queues
- Dialers
- Appointment schedulers
- CRM pipelines
- Deal stages
- Revenue tracking
- Rep assignment
- Sales dashboards

If it looks like sales execution — it belongs **elsewhere**.

---

## 11. How to contribute safely
Before adding anything, ask:
1. Does this help **build a market**?
2. Does this preserve **product boundaries**?
3. Does this keep **execution elsewhere**?
4. Does this protect **IP separation**?
5. Does this reduce **future coupling**?

If the answer to any is “no” — stop.

---

## 12. Final doctrine
> **Social XPress creates execution-ready assets.\
> Nextier executes.\
> The contract is the boundary.\
> Guardrails protect the future.**
