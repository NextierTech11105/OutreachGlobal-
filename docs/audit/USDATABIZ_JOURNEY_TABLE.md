# USDataBiz Source-of-Truth Journey Table

## Complete Operational Lifecycle: Raw Ingestion → Inbound Closeout

This document is the **MASTER REFERENCE** for the entire USDataBiz data journey.
Every stage is audited with zero ambiguity.

---

## 11-Stage Journey Table

| # | Stage | Input | Output | Owner | Persisted State | Failure Modes |
|---|-------|-------|--------|-------|-----------------|---------------|
| 1 | **Source Ingestion** | USDataBiz CSV (company, contact, address) | Raw records in `data_sources` + files in DO Spaces | SYSTEM | `data_sources.status = 'uploaded'` | Invalid CSV format, Missing required columns, Upload timeout |
| 2 | **Raw Data Normalization** | Raw CSV records | Normalized `businesses` + `personas` records | SYSTEM | `businesses.id`, `personas.id` created | Phone format invalid, State code unknown, SIC code missing |
| 3 | **Entity Resolution** | Normalized personas | Deduplicated personas with `mergedFromIds` | SYSTEM | `persona_merge_history` audit trail | False positive merge, Missing phone match, Orphaned records |
| 4 | **Data Prep for Outreach** | Personas + businesses | Scored leads with tags | LUCY | `leads.score`, `leads.tags[]` | Scoring model failure, Missing enrichment data |
| 5 | **Enrichment (SkipTrace)** | Leads needing contact info | Enriched phones/emails | SYSTEM (RealEstateAPI) | `skiptrace_results`, `persona_phones` | API timeout, Rate limit hit, No results found |
| 6 | **Campaign Prep** | Enriched lead blocks (2K) | Campaign with assigned leads | HUMAN + LUCI | `campaigns.status = 'STAGED'` | Insufficient leads, No mobile phones, Block formation error |
| 7 | **Initial SMS Execution** | Staged campaign + templates | Sent messages via SignalHouse | SYSTEM | `messages.status = 'SENT'`, `messages.externalId` | Provider error, Invalid number, Rate limit exceeded |
| 8 | **Inbound Response Handling** | Webhook from SignalHouse | Matched message to lead | SYSTEM | `messages.direction = 'inbound'`, `inbox_items.id` | No lead match, Duplicate message, Webhook failure |
| 9 | **Response Classification** | Inbound message text | Classification + extracted data | SYSTEM | `inbox_items.classification`, `inbox_items.extracted` | Misclassification, No pattern match, Confidence too low |
| 10 | **Prioritization & Routing** | Classified inbox items | Prioritized queue entries | SYSTEM | `inbox_items.priorityScore`, `call_queue.priority` | Score calculation error, Queue overflow |
| 11 | **Copilot-Assisted Handling** | Prioritized items + context | Suggested response + action | COPILOT (GIANNA/SABRINA) | `inbox_items.suggestedAction`, `inbox_items.aiNotes` | Wrong suggestion, Approval bypass, Response delay |
| 12 | **Manual Escalation / Closeout** | Items needing human review | Final disposition | HUMAN | `inbox_items.processedBy`, `leads.status = 'closed'` | No follow-up, Lost lead, Incomplete notes |

---

## Stage Details

### Stage 1: Source Ingestion (USDataBiz)

**File**: `apps/front/src/app/api/datalake/upload/route.ts`

```
INPUT:
- USDataBiz CSV file
- Fields: company_name, dba, first_name, last_name, title
- Fields: email, phone, address, city, state, zip
- Fields: employees, revenue, year_founded, sic_code

OUTPUT:
- File stored in DO Spaces: unified-graph/raw/{date}/{filename}
- Metadata JSON: {originalName, size, uploadedAt, schema}

OWNER: SYSTEM (automatic on upload)

PERSISTED STATE:
- data_sources.id = 'ds_...'
- data_sources.status = 'uploaded' | 'processing' | 'completed' | 'failed'
- data_sources.fileUrl = S3/Spaces URL
- data_sources.recordCount = N

FAILURE MODES:
- CSV_PARSE_ERROR: Invalid CSV format or encoding
- MISSING_COLUMNS: Required fields not present
- UPLOAD_TIMEOUT: Network failure during upload
- QUOTA_EXCEEDED: Storage limit reached
```

### Stage 2: Raw Data Normalization

**File**: `apps/front/src/lib/etl/normalizers.ts`

```
INPUT:
- Raw CSV records from Stage 1

OUTPUT:
- businesses table: normalized company records
- personas table: normalized contact records
- businessOwners junction: links personas to businesses

OWNER: SYSTEM (B2B Ingestion Service)

PERSISTED STATE:
- businesses.normalizedName = uppercase, no suffixes
- personas.normalizedFirstName, normalizedLastName
- persona_phones.normalizedNumber = 10 digits

FAILURE MODES:
- INVALID_PHONE: Cannot normalize to 10 digits
- UNKNOWN_STATE: State name/abbrev not recognized
- DUPLICATE_BUSINESS: Normalized name collision
- MISSING_SIC: No SIC code provided
```

### Stage 3: Entity Resolution & Deduplication

**File**: `apps/api/src/app/enrichment/services/identity-graph.service.ts`

```
INPUT:
- Normalized personas from Stage 2

OUTPUT:
- Deduplicated personas with confidence scores
- Merge history for audit

OWNER: SYSTEM (Identity Graph Service)

PERSISTED STATE:
- personas.confidenceScore = 0.0-1.0
- personas.mergedFromIds = ['persona_1', 'persona_2']
- persona_merge_history.survivorId, .mergedId, .matchScore

FAILURE MODES:
- FALSE_POSITIVE_MERGE: Merged two different people
- FALSE_NEGATIVE: Missed duplicate (same person, not merged)
- ORPHAN_RECORDS: Contact records pointing to merged persona
- CIRCULAR_MERGE: A → B → A loop
```

### Stage 4: Data Prep for Outreach

**File**: `apps/front/src/app/api/lucy/prepare/route.ts`

```
INPUT:
- Deduplicated personas + businesses

OUTPUT:
- Scored leads with enrichment status
- Auto-generated tags

OWNER: LUCY (Lead Prep Agent)

PERSISTED STATE:
- leads.score = 0-100 (based on SIC, revenue, years)
- leads.tags = ['industry:plumbing', 'size:small', 'priority:high']
- leads.enrichmentStatus = 'pending' | 'completed'

FAILURE MODES:
- SCORING_MODEL_ERROR: Score calculation failed
- MISSING_DATA: Cannot score without key fields
- TAG_CONFLICT: Contradictory tags applied
```

### Stage 5: Enrichment (SkipTrace)

**File**: `apps/api/src/app/enrichment/services/skiptrace.service.ts`

```
INPUT:
- Leads with enrichmentStatus = 'pending'
- Batch size: 250 per job

OUTPUT:
- Enriched contact info (phones, emails, addresses)
- Skip trace results stored

OWNER: SYSTEM (RealEstateAPI integration)

PERSISTED STATE:
- skiptrace_results.id, .personaId, .rawResponse
- persona_phones.phoneType = 'mobile' | 'landline' | 'voip'
- persona_phones.isValid, .isConnected

FAILURE MODES:
- API_TIMEOUT: RealEstateAPI not responding
- RATE_LIMIT: Too many requests (429)
- NO_RESULTS: Person not found in database
- PARTIAL_RESPONSE: Only some fields returned
```

### Stage 6: Campaign Prep

**File**: `apps/front/src/app/api/luci/orchestrate/route.ts`

```
INPUT:
- Enriched lead block (2,000 leads)
- Campaign configuration

OUTPUT:
- Campaign in STAGED status
- Leads assigned to campaign

OWNER: HUMAN (approval) + LUCI (orchestration)

PERSISTED STATE:
- campaigns.id, .name, .status = 'STAGED'
- campaigns.leadBlockId = 'lb_...'
- campaign_leads junction: campaignId → leadId

FAILURE MODES:
- INSUFFICIENT_LEADS: Not enough qualified leads
- NO_MOBILE_PHONES: Leads missing mobile contact
- BLOCK_FORMATION_ERROR: Cannot create 2K block
- TEMPLATE_MISSING: No message template selected
```

### Stage 7: Initial SMS Execution

**File**: `apps/front/src/app/api/signalhouse/send/route.ts`

```
INPUT:
- Staged campaign with leads
- Message template with merge fields

OUTPUT:
- Sent messages via SignalHouse
- Provider message IDs stored

OWNER: SYSTEM (SignalHouse integration)

PERSISTED STATE:
- messages.id, .direction = 'outbound'
- messages.externalId = SignalHouse SID
- messages.status = 'SENT' | 'DELIVERED' | 'FAILED'
- messages.metadata = {templateId, worker, campaignContext}

FAILURE MODES:
- PROVIDER_ERROR: SignalHouse API failure
- INVALID_NUMBER: Phone not reachable
- RATE_LIMIT: Exceeded SMS throughput
- LANDLINE_BLOCKED: Cannot send SMS to landline
```

### Stage 8: Inbound Response Handling

**File**: `apps/front/src/app/api/webhook/signalhouse/route.ts`

```
INPUT:
- SignalHouse webhook payload
- Fields: from, to, text, message_id, timestamp

OUTPUT:
- Inbound message matched to lead
- Inbox item created

OWNER: SYSTEM (webhook processor)

PERSISTED STATE:
- messages.direction = 'inbound'
- messages.leadId = matched lead
- inbox_items.id, .responseText, .phoneNumber

FAILURE MODES:
- NO_LEAD_MATCH: Cannot find lead by phone
- DUPLICATE_WEBHOOK: Same message received twice
- WEBHOOK_TIMEOUT: Processing took too long
- TOKEN_INVALID: Security token mismatch
```

### Stage 9: Response Classification

**File**: `apps/front/src/lib/response-classifications.ts`

```
INPUT:
- Inbound message text

OUTPUT:
- Classification type + confidence
- Extracted data (email, phone, etc.)

OWNER: SYSTEM (classification engine)

PERSISTED STATE:
- inbox_items.classification = 'email_capture' | 'opt_out' | etc.
- inbox_items.classificationConfidence = 0.0-1.0
- inbox_items.extracted = {email: '...', phone: '...'}

FAILURE MODES:
- MISCLASSIFICATION: Wrong category assigned
- NO_MATCH: No pattern matched (falls to 'other')
- LOW_CONFIDENCE: Confidence below threshold
- EXTRACTION_ERROR: Regex failed on valid data
```

### Stage 10: Prioritization & Routing

**File**: `apps/api/src/database/schema/inbox.schema.ts`

```
INPUT:
- Classified inbox items

OUTPUT:
- Priority score assigned
- Call queue entries created

OWNER: SYSTEM (prioritization engine)

PERSISTED STATE:
- inbox_items.priorityScore = 0-100
- inbox_items.priority = 'hot' | 'warm' | 'cold'
- call_queue.id, .priority, .assignedWorker

FAILURE MODES:
- SCORE_CALCULATION_ERROR: Priority formula failed
- QUEUE_OVERFLOW: Too many items in queue
- ROUTING_ERROR: Cannot determine worker
```

### Stage 11: Copilot-Assisted Handling

**File**: `apps/front/src/lib/ai-workers/digital-workers.ts`

```
INPUT:
- Prioritized inbox item
- Lead context and history

OUTPUT:
- Suggested response text
- Recommended action

OWNER: COPILOT (GIANNA, CATHY, SABRINA)

PERSISTED STATE:
- inbox_items.suggestedAction = 'send_reply' | 'call' | etc.
- inbox_items.aiNotes = worker analysis
- inbox_items.assignedSdrId = worker ID

FAILURE MODES:
- WRONG_SUGGESTION: Inappropriate response suggested
- APPROVAL_BYPASS: Auto-sent without review
- RESPONSE_DELAY: Suggestion took too long
- CONTEXT_MISSING: Not enough history for suggestion
```

### Stage 12: Manual Escalation / Closeout

**File**: UI components + API routes

```
INPUT:
- Items flagged for human review
- Copilot suggestions needing approval

OUTPUT:
- Final lead disposition
- Closed conversation

OWNER: HUMAN (operator)

PERSISTED STATE:
- inbox_items.processedBy = user ID
- inbox_items.processedAt = timestamp
- leads.status = 'closed' | 'converted' | 'lost'
- leads.closeReason = 'booked' | 'not_interested' | etc.

FAILURE MODES:
- NO_FOLLOW_UP: Item left unprocessed
- LOST_LEAD: Hot lead went cold
- INCOMPLETE_NOTES: No disposition recorded
- WRONG_BUCKET: Item in wrong bucket
```

---

## Data Flow Diagram

```
USDataBiz CSV
     │
     ▼
┌─────────────────┐
│ 1. INGEST       │ → data_sources, DO Spaces
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. NORMALIZE    │ → businesses, personas
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. DEDUPLICATE  │ → persona_merge_history
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. PREP (LUCY)  │ → leads (scored, tagged)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. ENRICH       │ → skiptrace_results, persona_phones
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. CAMPAIGN     │ → campaigns (STAGED)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. SMS OUT      │ → messages (outbound)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. SMS IN       │ → messages (inbound), inbox_items
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 9. CLASSIFY     │ → inbox_items.classification
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 10. PRIORITIZE  │ → call_queue
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 11. COPILOT     │ → inbox_items.suggestedAction
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 12. CLOSE       │ → leads.status = 'closed'
└─────────────────┘
```

---

## Traceability Requirements

Every record MUST have:

| Field | Purpose | Required At |
|-------|---------|-------------|
| `id` | Unique identifier (ULID) | All stages |
| `teamId` | Tenant isolation | All stages |
| `createdAt` | Audit timestamp | All stages |
| `sourceFile` | Origin CSV | Stage 1-2 |
| `sourceRecordId` | Original row ID | Stage 1-2 |
| `correlationId` | Cross-stage tracking | Stage 6+ |
| `campaignId` | Campaign context | Stage 6+ |
| `externalId` | Provider reference | Stage 7-8 |

---

## SLA Expectations (Recommended)

| Stage | Max Duration | Alert Threshold |
|-------|--------------|-----------------|
| 1. Ingest | 5 minutes | 10 minutes |
| 2. Normalize | 1 minute per 1K records | 2x expected |
| 3. Deduplicate | 5 minutes per 10K | 10 minutes |
| 5. Enrich | 30 minutes per batch | 1 hour |
| 7. SMS Out | Immediate | 5 minute delay |
| 8. SMS In | Real-time | 30 second delay |
| 9. Classify | < 1 second | 5 seconds |
| 11. Copilot | < 5 seconds | 30 seconds |
