# DATA FLOW MAP

**Generated:** 2024-12-30
**System:** OutreachGlobal / Nextier Platform

---

## Overview

This document maps the complete data lifecycle from source ingestion through response handling and audit.

```
Source → Raw → Canonical → Lead → Campaign → Message → Response → Decision → Audit
```

---

## Master Data Flow Diagram

```mermaid
flowchart TB
    subgraph Sources["📥 DATA SOURCES"]
        USBiz[USDataBiz CSV]
        Apollo[Apollo.io API]
        RealEstate[RealEstateAPI]
        SkipTrace[Skip Trace API]
        Manual[Manual Entry]
    end

    subgraph Raw["📦 RAW INGESTION"]
        DataSources[(data_sources)]
        PropertySearches[(property_searches)]
        SkiptraceResults[(skiptrace_results)]
    end

    subgraph Canonical["🎯 CANONICAL ENTITIES"]
        Personas[(personas)]
        Businesses[(businesses)]
        Properties[(properties)]
        PersonaPhones[(persona_phones)]
        PersonaEmails[(persona_emails)]
    end

    subgraph LeadMgmt["👤 LEAD MANAGEMENT"]
        Leads[(leads)]
        UnifiedCards[(unified_lead_cards)]
        LeadLabels[(lead_labels)]
    end

    subgraph Campaigns["📢 CAMPAIGN ENGINE"]
        CampaignDef[(campaigns)]
        CampaignQueue[(campaign_queue)]
        CampaignSeq[(campaign_sequences)]
        ScheduledEvents[(scheduled_events)]
    end

    subgraph Messaging["💬 MESSAGING"]
        Messages[(messages)]
        SMSMessages[(sms_messages)]
        OutreachLogs[(outreach_logs)]
    end

    subgraph Response["📨 RESPONSE HANDLING"]
        InboxItems[(inbox_items)]
        ResponseBuckets[(response_buckets)]
        BucketMovements[(bucket_movements)]
    end

    subgraph AI["🤖 AI DECISION"]
        AISdrAvatars[(ai_sdr_avatars)]
        IntelligenceLog[(intelligence_log)]
        WorkerPersonalities[(worker_personalities)]
    end

    subgraph Audit["📋 AUDIT TRAIL"]
        LeadActivities[(lead_activities)]
        CampaignEvents[(campaign_events)]
        CampaignExec[(campaign_executions)]
    end

    %% Source to Raw
    USBiz --> DataSources
    Apollo --> Businesses
    RealEstate --> PropertySearches
    SkipTrace --> SkiptraceResults
    Manual --> Leads

    %% Raw to Canonical
    DataSources --> Personas
    DataSources --> Businesses
    PropertySearches --> Properties
    SkiptraceResults --> PersonaPhones
    SkiptraceResults --> PersonaEmails

    %% Canonical to Lead
    Personas --> UnifiedCards
    Businesses --> UnifiedCards
    Properties --> UnifiedCards
    UnifiedCards --> Leads

    %% Lead to Campaign
    Leads --> CampaignQueue
    CampaignDef --> CampaignSeq
    CampaignQueue --> ScheduledEvents

    %% Campaign to Message
    ScheduledEvents --> Messages
    CampaignSeq --> SMSMessages
    Messages --> OutreachLogs

    %% Message to Response
    SMSMessages --> InboxItems
    InboxItems --> ResponseBuckets
    ResponseBuckets --> BucketMovements

    %% Response to AI
    InboxItems --> AISdrAvatars
    AISdrAvatars --> IntelligenceLog
    WorkerPersonalities --> AISdrAvatars

    %% AI to Audit
    AISdrAvatars --> LeadActivities
    Messages --> CampaignEvents
    CampaignQueue --> CampaignExec
```

---

## Stage-by-Stage Breakdown

### Stage 1: SOURCE INGESTION

| Source | Format | Destination Table | Frequency |
|--------|--------|-------------------|-----------|
| USDataBiz | CSV | data_sources → businesses | Batch |
| Apollo.io | API | businesses, persona_emails | On-demand |
| RealEstateAPI | API | properties, property_searches | On-demand |
| Skip Trace | API | skiptrace_results → persona_* | Batch |
| Manual | UI | leads | Real-time |

**Key Files:**
- `/apps/front/src/app/api/enrichment/csv/route.ts`
- `/apps/front/src/app/api/apollo/enrich/route.ts`
- `/apps/front/src/app/api/fdaily/skip-trace/route.ts`

---

### Stage 2: RAW DATA STORAGE

| Table | Purpose | Tenant Isolated |
|-------|---------|-----------------|
| data_sources | Track CSV imports | ❌ NEEDS FIX |
| property_searches | Cache property lookups | ✅ team_id |
| skiptrace_results | Skip trace responses | ✅ team_id |
| property_search_blocks | Paginated results | ❌ Shared |

**Mutations:**
- INSERT: New imports create data_sources records
- UPDATE: Status updates (pending → completed → failed)
- DELETE: Cleanup of stale imports

---

### Stage 3: CANONICAL ENTITIES

```mermaid
flowchart LR
    subgraph Persona["Persona Entity"]
        P[personas]
        PP[persona_phones]
        PE[persona_emails]
        PA[persona_addresses]
        PD[persona_demographics]
        PS[persona_socials]
    end

    subgraph Business["Business Entity"]
        B[businesses]
        BO[business_owners]
    end

    subgraph Property["Property Entity"]
        PR[properties]
        PO[property_owners]
        PDS[property_distress_scores]
    end

    P --> PP
    P --> PE
    P --> PA
    P --> PD
    P --> PS
    P --> BO
    P --> PO
    B --> BO
    PR --> PO
    PR --> PDS
```

| Table | Purpose | Dedup Key |
|-------|---------|-----------|
| personas | Unified contact entity | normalized_name + dob |
| businesses | Company records | normalized_name + state |
| properties | Property records | external_id + source |

**Key Files:**
- `/apps/api/src/database/schema/personas.schema.ts`
- `/apps/api/src/database/schema/businesses.schema.ts`
- `/apps/api/src/database/schema/properties.schema.ts`

---

### Stage 4: LEAD MANAGEMENT

```mermaid
flowchart TD
    subgraph LeadCreation["Lead Creation"]
        Import[CSV Import]
        Enrichment[Enrichment Pipeline]
        Manual[Manual Creation]
    end

    subgraph LeadEntity["Lead Entity"]
        Leads[(leads)]
        LeadPhones[(lead_phone_numbers)]
        LeadFlags[(lead_flags)]
        LeadLabels[(lead_labels)]
        LeadLabelLinks[(lead_label_links)]
    end

    subgraph UnifiedView["Unified View"]
        ULC[(unified_lead_cards)]
    end

    Import --> Leads
    Enrichment --> Leads
    Manual --> Leads
    Leads --> LeadPhones
    Leads --> LeadFlags
    Leads --> LeadLabelLinks
    LeadLabels --> LeadLabelLinks
    Leads --> ULC
```

**Lead Status Flow:**
```
new → contacted → qualified → customer
                ↘ churned
```

**Key Files:**
- `/apps/front/src/app/api/leads/bulk-create/route.ts`
- `/apps/front/src/app/api/luci/orchestrate/route.ts`
- `/apps/front/src/lib/ai-workers/campaign-workflow.ts`

---

### Stage 5: CAMPAIGN PREPARATION

```mermaid
flowchart LR
    subgraph Selection["Lead Selection"]
        Query[Filter Query]
        Score[Score Threshold]
        Tags[Tag Filters]
    end

    subgraph CampaignSetup["Campaign Setup"]
        Camp[(campaigns)]
        Seq[(campaign_sequences)]
        Init[(initial_messages)]
    end

    subgraph Queue["Queue Management"]
        CQ[(campaign_queue)]
        SE[(scheduled_events)]
    end

    Selection --> Camp
    Camp --> Seq
    Camp --> Init
    Camp --> CQ
    CQ --> SE
```

**Campaign States:**
```
draft → scheduled → active → paused → completed
                         ↘ cancelled
```

**Key Files:**
- `/apps/front/src/app/api/campaign/push/route.ts`
- `/apps/front/src/lib/campaign/contexts.ts`
- `/apps/front/src/lib/ai-workers/scheduling-engine.ts`

---

### Stage 6: MESSAGE EXECUTION

```mermaid
flowchart TD
    subgraph Execution["Message Execution"]
        SE[(scheduled_events)]
        Queue[Message Queue]
        Provider{Provider}
    end

    subgraph Providers["SMS Providers"]
        SH[SignalHouse]
        TW[Twilio]
    end

    subgraph Storage["Message Storage"]
        Msg[(messages)]
        SMS[(sms_messages)]
        Logs[(outreach_logs)]
    end

    SE --> Queue
    Queue --> Provider
    Provider --> SH
    Provider --> TW
    SH --> SMS
    TW --> SMS
    SMS --> Msg
    Msg --> Logs
```

**Message Flow:**
1. scheduled_events triggers at send time
2. Message pulled from campaign_queue
3. Sent via SignalHouse or Twilio
4. Response stored in sms_messages
5. Audit logged to outreach_logs

**Key Files:**
- `/apps/front/src/app/api/sms/batch/route.ts`
- `/apps/front/src/app/api/signalhouse/send/route.ts`
- `/apps/front/src/lib/signalhouse/client.ts`

---

### Stage 7: RESPONSE HANDLING

```mermaid
flowchart TD
    subgraph Inbound["Inbound Processing"]
        Webhook[SignalHouse Webhook]
        Match[Phone Matching]
        Create[Create Inbox Item]
    end

    subgraph Classification["Classification"]
        Classify[Response Classifier]
        Confidence[Confidence Score]
        Labels[(conversation_labels)]
    end

    subgraph Routing["Routing"]
        Buckets[(response_buckets)]
        Priority[Priority Score]
        Queue[Response Queue]
    end

    Webhook --> Match
    Match --> Create
    Create --> Classify
    Classify --> Confidence
    Classify --> Labels
    Confidence --> Buckets
    Buckets --> Priority
    Priority --> Queue
```

**Classification Types:**
- STOP / OPT_OUT → Suppression list
- POSITIVE → Hot lead queue
- QUESTION → AI response queue
- EMAIL_CAPTURE → Gold label
- UNCLEAR → Human review

**Key Files:**
- `/apps/front/src/app/api/signalhouse/webhook/route.ts`
- `/apps/front/src/lib/sms/response-mapping.ts`
- `/apps/front/src/lib/response-classifications.ts`

---

### Stage 8: AI DECISION ENGINE

```mermaid
flowchart TD
    subgraph Input["Input"]
        Inbox[(inbox_items)]
        Context[Lead Context]
        History[Conversation History]
    end

    subgraph AI["AI Workers"]
        Gianna[GIANNA - Initial]
        Cathy[CATHY - Nudge]
        Sabrina[SABRINA - Close]
        Neva[NEVA - Support]
    end

    subgraph Decision["Decision Output"]
        Response[Suggested Response]
        Action[Recommended Action]
        Confidence[Confidence Score]
    end

    subgraph Approval["Approval Flow"]
        Auto[Auto-Send Rules]
        Human[Human Review]
        Send[Execute Send]
    end

    Inbox --> AI
    Context --> AI
    History --> AI
    AI --> Response
    AI --> Action
    AI --> Confidence
    Response --> Auto
    Response --> Human
    Auto --> Send
    Human --> Send
```

**AI Worker Assignment:**
| Stage | Worker | Role |
|-------|--------|------|
| initial | GIANNA | First contact |
| retarget | GIANNA | Follow-up |
| nudge | CATHY | Gentle push |
| nurture | GIANNA | Long-term |
| book | SABRINA | Appointment |
| reminder | APPOINTMENT_BOT | Confirmations |

**Key Files:**
- `/apps/front/src/lib/ai-workers/digital-workers.ts`
- `/apps/front/src/lib/gianna/gianna-service.ts`
- `/apps/front/src/lib/campaign/contexts.ts`

---

### Stage 9: AUDIT & COMPLIANCE

```mermaid
flowchart LR
    subgraph Events["Event Sources"]
        Lead[Lead Actions]
        Campaign[Campaign Actions]
        Message[Message Actions]
        AI[AI Decisions]
    end

    subgraph Storage["Audit Storage"]
        LA[(lead_activities)]
        CE[(campaign_events)]
        CX[(campaign_executions)]
        IL[(intelligence_log)]
    end

    subgraph Compliance["Compliance"]
        TCPA[TCPA Tracking]
        OptOut[Opt-Out Log]
        Consent[Consent Trail]
    end

    Lead --> LA
    Campaign --> CE
    Campaign --> CX
    AI --> IL
    LA --> TCPA
    CE --> OptOut
    Message --> Consent
```

**Audit Requirements:**
- Every outbound message logged with timestamp
- Every AI decision logged with confidence
- Every opt-out logged immediately
- Every human approval tracked

**Key Files:**
- `/apps/front/src/lib/audit-log.ts`
- `/apps/api/src/database/schema/intelligence-log.schema.ts`

---

## Read-Only Boundaries

| Stage | Read-Only Tables |
|-------|------------------|
| Source | N/A |
| Raw | property_search_blocks |
| Canonical | properties, property_distress_scores |
| Lead | N/A |
| Campaign | campaign_sequences (after start) |
| Message | messages (after send) |
| Response | N/A |
| AI | intelligence_log |
| Audit | ALL audit tables |

---

## Mutation Checkpoints

| Checkpoint | Table | Action | Audit |
|------------|-------|--------|-------|
| Lead Created | leads | INSERT | lead_activities |
| Lead Enriched | personas | UPDATE | intelligence_log |
| Campaign Started | campaigns | UPDATE status | campaign_events |
| Message Sent | messages | INSERT | outreach_logs |
| Response Received | inbox_items | INSERT | lead_activities |
| AI Decision | intelligence_log | INSERT | Self-audit |
| Lead Converted | leads | UPDATE status | lead_activities |

---

## Tenant Isolation Checkpoints

Every stage MUST verify `team_id`:

```typescript
// Pattern for all queries
const data = await db.query.tableName.findMany({
  where: and(
    eq(tableName.teamId, currentTeamId),  // REQUIRED
    // other filters
  )
});
```

**Critical Paths Requiring Verification:**
1. Lead selection for campaigns
2. Message sending
3. Response matching
4. AI context loading
5. Audit log queries
