# CLAUDE CODE: END-TO-END EXECUTION PROMPT

**ROLE**:  
You are the **Senior Lead Architect** for "OutreachGlobal", a high-frequency revenue generation terminal. You are an expert in **Nx Monorepos**, **NestJS**, **Next.js**, **PostgreSQL**, and **Redis**.

**SYSTEM CONTEXT**: {
  "Project": "Nx Monorepo (Next.js + NestJS)",
  "Database": "PostgreSQL (Digital Ocean Managed) via Drizzle ORM",
  "Queue": "BullMQ (Redis) for high-volume worker jobs",
  "Storage": "Digital Ocean Spaces (S3 Compatible) for raw CSVs",
  "Integrations": [
    "SignalHouse (10DLC SMS)",
    "RealEstateAPI (Skip Trace/Hydration)",
    "Twilio (Voice/1:1 SMS)"
  ]
}

**YOUR MISSION**:  
Execute the **"Revenue Reactor"** upgrade strategies defined in the `docs/` folder. We are transforming this from a CRUD app to a high-frequency trading terminal for leads.

---

## EXECUTION CHECKLIST (Run in Order)

### PHASE 1: THE DATA SUPPLY CHAIN (Ingestion & Hydration)
**Reference**: `docs/USBIZDATA_INGESTION_STRATEGY.md`
1.  **[ ] USBizData Ingestion**:
    -   Map the raw CSV columns (Company, Address, SIC) to the `RawProspect` table.
    -   Implement a **Stream Processing** service in `apps/api` to read from DO Spaces and upsert into Postgres (High performance, low RAM).
2.  **[ ] Skip Trace Hydration**:
    -   Create `RealEstateApiService` (or update existing) to implement the "Universal Skip Result" interface.
    -   Write the logic to take a `LeadID`, call RealEstateAPI, and **Upsert** results into `PersonaPhones`, `PersonaEmails`, and `SocialProfiles`.
    -   *Constraint*: Only hydrate leads flagged as "High Value" (Revenue > $1M or specific Job Title).

### PHASE 2: THE COMPLIANCE REACTOR (Campaigns)
**Reference**: `docs/SIGNALHOUSE_CAMPAIGN_SUBMISSION.md`
3.  **[ ] Routing Logic**:
    -   Audit `CampaignService`. Ensure that **Bulk SMS** jobs *strictly* use `SignalHouseProvider`.
    -   Ensure **1:1 Conversation** replies use `TwilioProvider`.
4.  **[ ] Enrichment Gateways**:
    -   Add a **Circuit Breaker** in Redis. If we spend > $50 in 1 hour on Skip Tracing, pause and alert.

### PHASE 3: THE MECHANICAL FEEL (Frontend)
**Reference**: `docs/CLAUDE_CODE_MEGA_AUDIT_PROMPT.md`
5.  **[ ] Optimistic UI**:
    -   Refactor the `useSendSms` (or equivalent) hook in `apps/front`.
    -   **Requirement**: The UI must update explicitly to "Sent" *before* the API returns. Handle rollback on error.
6.  **[ ] No-Spinner Policy**:
    -   Remove loading spinners on primary actions (Calls/SMS). Use background toasts or subtle status indicators.

---

## CRITICAL RULES
-   **No Broken Builds**: Run `nx build api` and `nx build front` after every major phase.
-   **Type Safety**: Strict Typescript. No `any`. Use the Drizzle Schema definitions in `apps/api/src/database/schema`.
-   **Naming**: Use "Terminal" terminology (e.g., `Ingestor`, `Refinery`, `Broadcaster`).

**START COMMAND**:  
"I am ready. Begin by analyzing `apps/api/src/database/schema/leads.schema.ts` to ensure we can support the USBizData fields (SIC, Revenue, Employee Count). If not, generate a migration."
