# NEXTIER DATABASE SCHEMA DRAFT (Drizzle ORM)

## Overview
This schema implements the data model architecture for multi-tenant pipeline traceability.

---

## Core Tables

### 1. Tenants
```typescript
// apps/api/src/database/schema/tenant.schema.ts
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { ulidId } from '../columns/ulid';

export const tenants = pgTable('tenants', {
  id: ulidId('id', 'tenant').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').default('free'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 2. Actors (Users & System Identities)
```typescript
// apps/api/src/database/schema/actor.schema.ts
export const actors = pgTable('actors', {
  id: ulidId('id', 'actor').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),
  type: text('type').notNull(), // 'user' | 'system' | 'automation'
  email: text('email'),
  name: text('name'),
  role: text('role').default('member'),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const actorsTenantIdx = index('actors_tenant_idx').on(actors.tenantId);
```

### 3. Leads (Business/Property Entities)
```typescript
// apps/api/src/database/schema/lead.schema.ts
export const leads = pgTable('leads', {
  id: ulidId('id', 'lead').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),
  sectorId: text('sector_id'), // bucket/sector reference

  // Immutable source tracking
  sourceType: text('source_type').notNull(), // 'csv_import' | 'api' | 'enrichment'
  sourceId: text('source_id'), // original record ID
  importRunId: ulidId('import_run_id', 'run'), // which pipeline created this

  // Core data
  companyName: text('company_name'),
  contactName: text('contact_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),

  // Contact info (mutable via enrichment)
  phone: text('phone'),
  mobilePhone: text('mobile_phone'),
  email: text('email'),
  phones: jsonb('phones').default([]), // all discovered phones
  emails: jsonb('emails').default([]), // all discovered emails

  // Address
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  county: text('county'),

  // Business info
  sicCode: text('sic_code'),
  sicDescription: text('sic_description'),
  employeeCount: integer('employee_count'),
  annualRevenue: bigint('annual_revenue', { mode: 'number' }),
  website: text('website'),

  // Enrichment tracking
  enrichmentStatus: text('enrichment_status').default('pending'), // pending | in_progress | completed | failed
  lastEnrichedAt: timestamp('last_enriched_at'),
  enrichmentArtifactId: ulidId('enrichment_artifact_id', 'art'),

  // Workflow status
  status: text('status').default('new'), // new | contacted | qualified | converted | dnc
  campaignStatus: text('campaign_status'), // initial | retarget | follow_up | nurture | ghost
  attemptCount: integer('attempt_count').default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  lastResponseAt: timestamp('last_response_at'),

  // Scoring
  priorityScore: integer('priority_score').default(0),
  isDecisionMaker: boolean('is_decision_maker').default(false),
  propertyOwnerLikelihood: text('property_owner_likelihood'),

  // Metadata
  rawData: jsonb('raw_data'), // original CSV row
  tags: text('tags').array(),
  flags: jsonb('flags').default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const leadsTenantIdx = index('leads_tenant_idx').on(leads.tenantId);
export const leadsSectorIdx = index('leads_sector_idx').on(leads.tenantId, leads.sectorId);
export const leadsStatusIdx = index('leads_status_idx').on(leads.tenantId, leads.status);
export const leadsEnrichmentIdx = index('leads_enrichment_idx').on(leads.tenantId, leads.enrichmentStatus);
```

### 4. Contacts (Individuals linked to Leads)
```typescript
// apps/api/src/database/schema/contact.schema.ts
export const contacts = pgTable('contacts', {
  id: ulidId('id', 'contact').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),
  leadId: ulidId('lead_id', 'lead').references(() => leads.id),

  // Identity
  firstName: text('first_name'),
  lastName: text('last_name'),
  fullName: text('full_name'),
  title: text('title'),

  // Contact info
  phones: jsonb('phones').default([]),
  emails: jsonb('emails').default([]),
  primaryPhone: text('primary_phone'),
  primaryEmail: text('primary_email'),

  // Social
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),

  // Skip trace data
  dateOfBirth: date('date_of_birth'),
  age: integer('age'),
  addressHistory: jsonb('address_history').default([]),

  // Source
  sourceType: text('source_type').notNull(),
  skipTraceArtifactId: ulidId('skiptrace_artifact_id', 'art'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 5. Pipeline Runs
```typescript
// apps/api/src/database/schema/pipeline-run.schema.ts
export const pipelineRuns = pgTable('pipeline_runs', {
  id: ulidId('id', 'run').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),

  // Definition
  blueprintId: ulidId('blueprint_id', 'bp'),
  blueprintVersion: integer('blueprint_version'),
  pipelineName: text('pipeline_name').notNull(), // 'luci_enrich', 'gianna_respond', etc.

  // Tracing
  correlationId: ulidId('correlation_id', 'corr').notNull(),
  parentRunId: ulidId('parent_run_id', 'run'), // for nested pipelines
  replayedFromRunId: ulidId('replayed_from_run_id', 'run'), // if this is a replay

  // Trigger
  triggeredBy: text('triggered_by').notNull(), // 'actor:{id}' | 'automation:{id}' | 'webhook:{id}' | 'system'
  triggerType: text('trigger_type').notNull(), // 'manual' | 'automation' | 'webhook' | 'scheduled' | 'replay'
  triggerContext: jsonb('trigger_context'), // additional context

  // State
  status: text('status').notNull().default('queued'), // queued | running | completed | failed | cancelled
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // Stats
  stats: jsonb('stats').default({}), // {totalRecords, processed, enriched, failed, etc.}

  // Input/Output
  inputArtifactId: ulidId('input_artifact_id', 'art'),
  outputArtifactId: ulidId('output_artifact_id', 'art'),

  // Error handling
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  retryCount: integer('retry_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pipelineRunsTenantIdx = index('pipeline_runs_tenant_idx').on(pipelineRuns.tenantId);
export const pipelineRunsCorrelationIdx = index('pipeline_runs_correlation_idx').on(pipelineRuns.correlationId);
export const pipelineRunsStatusIdx = index('pipeline_runs_status_idx').on(pipelineRuns.tenantId, pipelineRuns.status);
```

### 6. Block Executions
```typescript
// apps/api/src/database/schema/block-execution.schema.ts
export const blockExecutions = pgTable('block_executions', {
  id: ulidId('id', 'block').primaryKey(),
  pipelineRunId: ulidId('pipeline_run_id', 'run').notNull().references(() => pipelineRuns.id),

  // Block identity
  blockName: text('block_name').notNull(), // 'skip_trace', 'apollo_enrich', 'push_sms', etc.
  blockIndex: integer('block_index').notNull(), // order in pipeline

  // Tracing (inherited from run)
  correlationId: ulidId('correlation_id', 'corr').notNull(),

  // State
  status: text('status').notNull().default('pending'), // pending | running | completed | failed | skipped
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // I/O References
  inputArtifactId: ulidId('input_artifact_id', 'art'),
  outputArtifactId: ulidId('output_artifact_id', 'art'),

  // Stats
  recordsProcessed: integer('records_processed').default(0),
  recordsSucceeded: integer('records_succeeded').default(0),
  recordsFailed: integer('records_failed').default(0),

  // Error handling
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  retryCount: integer('retry_count').default(0),
  lastRetryAt: timestamp('last_retry_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const blockExecutionsRunIdx = index('block_executions_run_idx').on(blockExecutions.pipelineRunId);
```

### 7. Artifacts
```typescript
// apps/api/src/database/schema/artifact.schema.ts
export const artifacts = pgTable('artifacts', {
  id: ulidId('id', 'art').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),

  // Lineage
  pipelineRunId: ulidId('pipeline_run_id', 'run').references(() => pipelineRuns.id),
  blockExecutionId: ulidId('block_execution_id', 'block').references(() => blockExecutions.id),
  correlationId: ulidId('correlation_id', 'corr'),

  // Parent artifacts (for lineage tracking)
  parentArtifactIds: text('parent_artifact_ids').array(),

  // Type
  artifactType: text('artifact_type').notNull(), // 'skiptrace_result', 'apollo_result', 'sms_message', 'csv_import', etc.
  mimeType: text('mime_type').default('application/json'),

  // Storage
  storageType: text('storage_type').notNull().default('object'), // 'inline' | 'object'
  inlineData: jsonb('inline_data'), // for small artifacts (<100KB)
  objectPath: text('object_path'), // S3/DO Spaces path for large artifacts
  sizeBytes: integer('size_bytes'),
  checksum: text('checksum'), // SHA-256 for integrity

  // Versioning
  version: integer('version').notNull().default(1),
  supersededBy: ulidId('superseded_by', 'art'), // if this artifact was replaced

  // Metadata
  metadata: jsonb('metadata').default({}),

  // Immutable - no updatedAt
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const artifactsTenantIdx = index('artifacts_tenant_idx').on(artifacts.tenantId);
export const artifactsRunIdx = index('artifacts_run_idx').on(artifacts.pipelineRunId);
export const artifactsCorrelationIdx = index('artifacts_correlation_idx').on(artifacts.correlationId);
```

### 8. Blueprints (Pipeline Definitions)
```typescript
// apps/api/src/database/schema/blueprint.schema.ts
export const blueprints = pgTable('blueprints', {
  id: ulidId('id', 'bp').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),

  name: text('name').notNull(),
  description: text('description'),
  version: integer('version').notNull().default(1),

  // Pipeline definition
  steps: jsonb('steps').notNull(), // array of block definitions
  /*
    steps: [
      { name: 'skip_trace', type: 'enrichment', config: {...} },
      { name: 'apollo_enrich', type: 'enrichment', config: {...} },
      { name: 'push_sms', type: 'output', config: {...} }
    ]
  */

  // Trigger configuration
  triggerConfig: jsonb('trigger_config'),

  // State
  isActive: boolean('is_active').default(true),
  isSystem: boolean('is_system').default(false), // system blueprints can't be deleted

  createdBy: ulidId('created_by', 'actor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 9. Automations (Triggers)
```typescript
// apps/api/src/database/schema/automation.schema.ts
export const automations = pgTable('automations', {
  id: ulidId('id', 'auto').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),
  blueprintId: ulidId('blueprint_id', 'bp').notNull().references(() => blueprints.id),

  name: text('name').notNull(),
  description: text('description'),

  // Trigger
  triggerType: text('trigger_type').notNull(), // 'lead_created', 'message_received', 'schedule', 'webhook'
  triggerConfig: jsonb('trigger_config').notNull(),
  /*
    { event: 'lead_created', conditions: { sectorId: 'xyz' } }
    { schedule: '0 9 * * *', timezone: 'America/New_York' }
    { webhookPath: '/api/webhook/custom/abc' }
  */

  // Conditions
  conditions: jsonb('conditions').default([]),

  // State
  isEnabled: boolean('is_enabled').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0),

  createdBy: ulidId('created_by', 'actor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 10. Webhook Events
```typescript
// apps/api/src/database/schema/webhook-event.schema.ts
export const webhookEvents = pgTable('webhook_events', {
  id: ulidId('id', 'wh').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),

  // Source
  source: text('source').notNull(), // 'signalhouse', 'twilio', 'stripe', etc.
  eventType: text('event_type').notNull(), // 'sms.inbound', 'payment.completed', etc.

  // Correlation
  correlationId: ulidId('correlation_id', 'corr').notNull(),

  // Payload (immutable)
  payload: jsonb('payload').notNull(),
  headers: jsonb('headers'),
  signature: text('signature'), // for verification
  signatureValid: boolean('signature_valid'),

  // Processing
  processedAt: timestamp('processed_at'),
  pipelineRunId: ulidId('pipeline_run_id', 'run'), // if this triggered a pipeline

  // Immutable
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});

export const webhookEventsTenantIdx = index('webhook_events_tenant_idx').on(webhookEvents.tenantId);
export const webhookEventsSourceIdx = index('webhook_events_source_idx').on(webhookEvents.source, webhookEvents.eventType);
```

### 11. Attempt Logs (Campaign Tracking)
```typescript
// apps/api/src/database/schema/attempt-log.schema.ts
export const attemptLogs = pgTable('attempt_logs', {
  id: ulidId('id', 'atm').primaryKey(),
  tenantId: ulidId('tenant_id', 'tenant').notNull().references(() => tenants.id),

  leadId: ulidId('lead_id', 'lead').notNull().references(() => leads.id),
  contactId: ulidId('contact_id', 'contact').references(() => contacts.id),

  // Campaign context
  campaignContext: text('campaign_context').notNull(), // initial | retarget | follow_up | nurture | ghost
  attemptNumber: integer('attempt_number').notNull(),

  // Channel
  channel: text('channel').notNull(), // sms | email | call
  direction: text('direction').notNull(), // outbound | inbound

  // Message
  templateUsed: text('template_used'),
  messageArtifactId: ulidId('message_artifact_id', 'art'),

  // Status
  status: text('status').notNull(), // queued | sent | delivered | failed | responded
  deliveredAt: timestamp('delivered_at'),
  respondedAt: timestamp('responded_at'),

  // Response (if any)
  responseType: text('response_type'), // positive | negative | neutral | dnc
  responseArtifactId: ulidId('response_artifact_id', 'art'),

  // Pipeline reference
  pipelineRunId: ulidId('pipeline_run_id', 'run'),
  correlationId: ulidId('correlation_id', 'corr'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const attemptLogsLeadIdx = index('attempt_logs_lead_idx').on(attemptLogs.leadId);
export const attemptLogsTenantIdx = index('attempt_logs_tenant_idx').on(attemptLogs.tenantId);
```

---

## ULID Generator Column

```typescript
// apps/api/src/database/columns/ulid.ts
import { text, customType } from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

// Prefixes for each entity type
export const ID_PREFIXES = {
  tenant: 'tenant',
  actor: 'actor',
  lead: 'lead',
  contact: 'contact',
  run: 'run',
  block: 'block',
  art: 'art',
  bp: 'bp',
  auto: 'auto',
  wh: 'wh',
  corr: 'corr',
  atm: 'atm',
  lbl: 'lbl',
  tag: 'tag',
  flg: 'flg',
} as const;

export type IdPrefix = keyof typeof ID_PREFIXES;

export function generateId(prefix: IdPrefix): string {
  return `${ID_PREFIXES[prefix]}_${ulid()}`;
}

export function ulidId(columnName: string, prefix: IdPrefix) {
  return text(columnName).$defaultFn(() => generateId(prefix));
}
```

---

## Migration Strategy

1. **Phase 1**: Create new tables alongside existing
2. **Phase 2**: Dual-write to both old and new tables
3. **Phase 3**: Migrate read queries to new tables
4. **Phase 4**: Stop writing to old tables
5. **Phase 5**: Archive old tables

**Never delete data. Only supersede.**
