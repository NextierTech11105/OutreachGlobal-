# PROMPT: USBIZDATA INGESTION & CAMPAIGN REFINERY

**CONTEXT**:  
You are the **Data Supply Chain Engineer**. One of our primary fuel sources is **USBizData** (raw CSVs containing 300k+ records/file).  
These files are the "Crude Oil". We need to refine them into high-octane "Campaign Blocks" (ready-to-call lists).

**THE RAW MATERIAL (SCHEMA)**:  
The generic USBizData CSV structure contains:  
- **Identity**: `Company Name`, `Contact Name`, `Email Address`  
- **Location**: `Street Address`, `City`, `State`, `Zip Code`, `County`  
- **Comms**: `Area Code`, `Phone Number`, `Website URL`  
- **Firmographics**: `Number of Employees`, `Annual Revenue`, `SIC Code`, `SIC Description`  
*(Note: We filter for Decision Makers via Role/Title, assuming the CSV provides it or we infer it).*

**THE GOAL**:  
Build a robust **Ingestion Pipeline** that takes a raw CSV upload and outputs structured **Campaign Blocks**.

---

## LAYER 1: THE "LOADING DOCK" (Object Storage)
We do not parse 50MB CSVs in the browser.
**Action**:
1. Check `apps/api/src/modules/storage` (or similar).
2. Ensure we have a `UploadService` that streams the file strictly to **DigitalOcean Spaces** (S3 compatible).
3. **Naming Convention**: `raw_uploads/{date}/{filename}_{uuid}.csv`.

## LAYER 2: THE REFINERY (Worker Queues)
We need a background worker (BullMQ/Redis) to process the file line-by-line using a stream (to save RAM).
**Action**:
1. Audit `IngestionWorker`.
2. **Schema Mapping**: Map the USBizData columns to our `RawProspect` table.
   - *Critical*: Store the `SIC Code` and `SIC Description`! These are vital for niche targeting.
3. **Deduplication Strategy**:
   - Create a `fingerprint` column: `hash(email + normalized_phone)`.
   - On insert, `ON CONFLICT (fingerprint) DO NOTHING` (or update metadata).

## LAYER 3: THE UNIVERSAL MERGE (Skip Trace Fusion)
**The Core Requirement**: We standardize *all* enrichment (RealEstateAPI, TLO, Idiodata) into a single "Universal" format before merging into our `Persona` identity graph.

**Action**:
1.  **Define the Interface**: Create `apps/api/src/app/enrichment/interfaces/UniversalSkipResult.ts`
    ```typescript
    interface UniversalSkipResult {
      mobiles: { number: string; score: number }[];
      emails: { address: string; type: 'personal' | 'work' }[];
      socials: { network: string; url: string }[];
      demographics: { age?: number; income?: string };
    }
    ```
2.  **The Adapter Pattern**:
    - `RealEstateApiAdapter` implements `SkipTraceProvider`.
    - `ApolloAdapter` implements `SkipTraceProvider`.
3.  **Merge Strategy (The "Persona" Link)**:
    - Don't just update a `lead` row.
    - Upsert into `Personas` (Identity).
    - Insert into `PersonaPhones` (Normalized numbers).
    - Insert into `PersonaEmails` (Validated addresses).
    - Insert into `SocialProfiles` (LinkedIn, FB).
    - *Crucial*: Respect existing data. If `Mobile A` exists, don't duplicate, just update metadata (e.g., `last_verified_at`).

## LAYER 4: THE "DECISION MAKER" FILTER
The user wants to sort/filter by **Role/Title**.
**Action**:
1. If the CSV excludes explicit Titles, we must infer logic or flag "Generic Contacts" vs "Likely Decision Makers".
2. Create a database view or query scope: `scopeDecisionMakers()`.
   - Logic: Filter out "generic" emails (info@, sales@) if a personal email exists.

## LAYER 5: CAMPAIGN BLOCK GENERATION
This is the unique requirement: **"Create Initial Campaign Blocks"**.
Instead of just a pool of leads, we need **Cohorts**.
**Action**:
1. Create a logical entity `CampaignBlock` (or `LeadBatch`).
2. **Auto-Segmentation**:
   - "Plumbing Contractors - TX - High Rev" (Group by SIC + State + Revenue).
   - "HVAC - Small Biz" (Group by SIC + Employee Count < 10).
3. These blocks are then "Pushed Up" to the `CampaignService` as ready-to-run lists.

---

## YOUR AUDIT TASKS (Execute in order):

1.  **Schema Check**:
    - Look at `postgres/schema.prisma` (or Drizzle/TypeORM). Do we have fields for `sic_code`, `revenue`, `employee_count`?
    - If not, generate a migration to add them to the `Lead` or `Prospect` table.

2.  **Ingestion Script**:
    - Create/Audit `scripts/ingest-usbizdata.ts` or the API endpoint handling the upload.
    - Ensure it uses **Streams**, not `fs.readFileSync`.

3.  **Dedup Logic**:
    - Verify we aren't creating duplicates. Show me the code that prevents it.

4.  **Batching Logic**:
    - Propose a function `generateCampaignBlocks(criteria: Criteria)` that selects unassigned leads and bundles them into a new Campaign ID.

**OUTPUT**:
- `IngestionArchitecture.mermaid`: Visual flow from CSV -> S3 -> DB -> Campaign.
- `SchemaMigration.sql`: Necessary changes to support USBizData fields.
- `BatchingService.ts`: The logic to slice the database into actionable campaign blocks.

** COMMAND**: Start by reading the `schema.prisma` (or equivalent) to see where we store these leads today.
