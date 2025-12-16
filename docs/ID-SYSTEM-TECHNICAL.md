# Outreach Global ID System
## Technical Specification & Architecture

---

## Overview

The Outreach Global ID system uses **ULID (Universally Unique Lexicographically Sortable Identifier)** with semantic prefixes for type-safe, traceable entity identification.

```
Format: {prefix}_{ulid}
Example: persona_01HX7KDEF9A8B7C6D5E4F3G2H1

Prefix:  2-8 chars (semantic, readable)
ULID:    26 chars (sortable, unique, timestamp-encoded)
Total:   max 36 chars
```

---

## Why ULID Over UUID?

| Feature | UUID v4 | ULID |
|---------|---------|------|
| Sortable by time | No | Yes |
| Readable | `550e8400-e29b-41d4...` | `01HX7KDEF...` |
| Timestamp extractable | No | Yes (first 48 bits) |
| Collision probability | Same | Same (128-bit) |
| Database indexing | Random, slow | Sequential, fast |

---

## Complete ID Registry

### Core Identity Layer
```typescript
user: 'user'           // Platform users
team: 'team'           // Organizations
persona: 'persona'     // Unified contact identity
```

### Campaign Layer
```typescript
campaign: 'camp'       // Parent omni-channel campaign
calendar: 'cal'        // Calling campaign type
sequence: 'seq'        // Scheduled SMS type
blast: 'blt'           // Instant SMS type
retarget: 'rt'         // Retarget NC campaign
```

### Execution Layer
```typescript
touch: 'tch'           // Individual outbound attempt
response: 'res'        // Inbound response
conversation: 'conv'   // Threaded response chain
nudge: 'ndg'           // Contextual retarget message
```

### Communication Layer
```typescript
message: 'msg'         // SMS/Email content (rendered)
template: 'tpl'        // Reusable message template
lane: 'lane'           // Signalhouse number allocation
```

### AI/Agent Layer
```typescript
sdr: 'sdr'             // Gianna, LUCI, Cathy configs
prompt: 'prmt'         // AI prompt templates
action: 'act'          // Gianna action taken
```

### Enrichment Layer
```typescript
skipTraceJob: 'stj'    // Batch enrichment job
skipTraceResult: 'str' // Individual enrichment result
phone: 'ph'            // Enriched phone number
email: 'em'            // Enriched email
```

### Data Layer
```typescript
property: 'prop'       // Real estate property
bucket: 'bkt'          // Saved search / export bucket
sector: 'sec'          // Industry vertical classification
```

---

## Usage

### Basic ID Creation

```typescript
import { ids, createId } from '@/lib/ids';

// Using the factory (recommended)
const personaId = ids.persona();    // persona_01HX7KDEF...
const touchId = ids.touch();        // tch_01HX7KV01...
const campaignId = ids.campaign();  // camp_01HX7KMNO...

// Using createId directly
const customId = createId('tpl');   // tpl_01HX7KXYZ...
```

### Type-Safe ID Handling

```typescript
import type { PersonaID, CampaignID, TouchID } from '@/lib/ids';

interface Touch {
  id: TouchID;
  personaId: PersonaID;
  campaignId: CampaignID;
  status: 'pending' | 'delivered' | 'failed';
}

// TypeScript will enforce correct ID types
const touch: Touch = {
  id: ids.touch(),           // OK
  personaId: ids.persona(),  // OK
  campaignId: ids.campaign(),// OK
  // campaignId: ids.touch(), // ERROR: Type 'tch_...' not assignable
};
```

### ID Validation

```typescript
import { isValidId, getPrefix, getTimestamp, isPersonaId } from '@/lib/ids';

const id = 'persona_01HX7KDEF9A8B7C6D5E4F3G2H1';

isValidId(id);        // true
getPrefix(id);        // 'persona'
getTimestamp(id);     // Date object (when created)
isPersonaId(id);      // true (type guard)
```

### Qualified Persona Creation

```typescript
import { createQualifiedPersonaId, meetsPersonaQualification } from '@/lib/ids';

// Check if record qualifies
const requirements = {
  fullName: true,
  fullAddress: true,
  mobilePhone: true,
  mainLineIdentified: true,
};

if (meetsPersonaQualification(requirements)) {
  const personaId = createQualifiedPersonaId(requirements);
  // persona_01HX7K... created
}

// Or let it throw
try {
  const personaId = createQualifiedPersonaId({
    fullName: true,
    fullAddress: false,  // Missing!
    mobilePhone: true,
    mainLineIdentified: true,
  });
} catch (e) {
  // "Record does not meet persona qualification requirements..."
}
```

---

## Database Schema Integration

### Drizzle Example

```typescript
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const personas = pgTable('personas', {
  id: varchar('id', { length: 36 }).primaryKey(),  // persona_...
  teamId: varchar('team_id', { length: 36 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  // ...
  createdAt: timestamp('created_at').defaultNow(),
});

export const touches = pgTable('touches', {
  id: varchar('id', { length: 36 }).primaryKey(),  // tch_...
  personaId: varchar('persona_id', { length: 36 }).notNull(),
  campaignId: varchar('campaign_id', { length: 36 }).notNull(),
  campaignTypeId: varchar('campaign_type_id', { length: 36 }).notNull(), // cal_/seq_/blt_/rt_
  messageId: varchar('message_id', { length: 36 }).notNull(),
  laneId: varchar('lane_id', { length: 36 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  executedAt: timestamp('executed_at'),
});
```

---

## Entity Relationships

```
team_01HX7K...
│
├── persona_01HX7K...
│   ├── ph_01HX7K... (phones)
│   ├── em_01HX7K... (emails)
│   └── stj_01HX7K... (skip trace job)
│
├── camp_01HX7K... (PARENT CAMPAIGN)
│   │
│   ├── cal_01HX7K... (Calendar/Calling)
│   │   ├── tch_01HX7K... (touch attempt)
│   │   └── tch_01HX7K...
│   │
│   ├── seq_01HX7K... (Sequences/Scheduled SMS)
│   │   ├── tch_01HX7K...
│   │   └── tch_01HX7K...
│   │
│   ├── blt_01HX7K... (Blast/Instant SMS)
│   │   ├── tch_01HX7K...
│   │   └── tch_01HX7K...
│   │
│   └── lane_01HX7K... (assigned Signalhouse number)
│
├── res_01HX7K... (RESPONSE)
│   ├── linked to: persona_01HX7K...
│   ├── source: blt_01HX7K...
│   ├── source_touch: tch_01HX7K...
│   └── conv_01HX7K... (conversation)
│
└── act_01HX7K... (GIANNA ACTION)
    ├── response: res_01HX7K...
    └── action_type: qualified | booked | escalated
```

---

## Full Trace Example

```
TRACE: Response res_01HX7KCCC back to origin
────────────────────────────────────────────────────────────

res_01HX7KCCC... (Response: "Yeah interested")
  │
  ├─ from_persona: persona_01HX7KDEF... (John Smith)
  │    │
  │    ├─ phones: [ph_01HX7K111..., ph_01HX7K222...]
  │    ├─ emails: [em_01HX7K333...]
  │    └─ skip_trace_job: stj_01HX7KGHI... (Batch 47)
  │
  ├─ source_touch: tch_01HX7KBBB...
  │    │
  │    ├─ message: msg_01HX7KAAA... ("Hey John...")
  │    ├─ template: tpl_01HX7KXYZ... ("Hey {firstName}...")
  │    └─ sent_at: 2024-01-15T10:30:00Z
  │
  ├─ campaign_type: blt_01HX7KAAA... (Blast)
  │
  ├─ campaign: camp_01HX7KMNO... (Q1 HVAC Texas)
  │
  ├─ lane: lane_01HX7KPQR... (+1-214-555-9999)
  │
  └─ team: team_01HX7KABC... (Acme Brokers)

────────────────────────────────────────────────────────────
```

---

## API Integration

### Creating a Touch

```typescript
import { ids } from '@/lib/ids';

async function createTouch(params: {
  personaId: PersonaID;
  campaignId: CampaignID;
  campaignTypeId: CampaignTypeID;
  templateId: TemplateID;
  laneId: LaneID;
}) {
  const messageId = ids.message();
  const touchId = ids.touch();

  // 1. Render message from template
  const message = await renderTemplate(params.templateId, params.personaId);

  // 2. Save message
  await db.insert(messages).values({
    id: messageId,
    templateId: params.templateId,
    personaId: params.personaId,
    content: message.content,
  });

  // 3. Create touch record
  await db.insert(touches).values({
    id: touchId,
    personaId: params.personaId,
    campaignId: params.campaignId,
    campaignTypeId: params.campaignTypeId,
    messageId: messageId,
    laneId: params.laneId,
    status: 'pending',
  });

  // 4. Send via Signalhouse
  await signalhouse.send({
    touchId,
    laneId: params.laneId,
    personaId: params.personaId,
    content: message.content,
  });

  return { touchId, messageId };
}
```

---

## Interoperability Notes

### Works With
- **Drizzle ORM** - varchar(36) columns
- **GraphQL** - String scalar, custom ID scalars
- **REST APIs** - Standard string IDs
- **Redis** - Key prefixing (`persona:${id}`)
- **Elasticsearch** - Keyword fields
- **PostgreSQL** - Native varchar, no UUID extension needed

### Migration from Existing IDs
```typescript
// Old: UUID
const oldId = '550e8400-e29b-41d4-a716-446655440000';

// New: Create persona ID and map
const newId = ids.persona();
await db.insert(idMappings).values({
  oldId,
  newId,
  migratedAt: new Date(),
});
```

---

## Future-Proofing

### Adding New Entity Types

```typescript
// Just add to ID_PREFIXES
export const ID_PREFIXES = {
  // ... existing
  invoice: 'inv',      // New entity
  payment: 'pmt',      // New entity
} as const;

// Type system auto-updates
const invoiceId = createId('inv');  // TypeScript knows this is valid
```

### No Breaking Changes Possible
- Prefix is immutable once assigned
- ULID format is standardized
- New prefixes don't affect old IDs
- Old code continues to work

---

## File Location

```
apps/front/src/lib/ids/index.ts
```

## Dependencies

```bash
pnpm add ulid
```

---

## Quick Reference

```typescript
import { ids } from '@/lib/ids';

// PEOPLE
ids.user()      // user_01HX7K...
ids.team()      // team_01HX7K...
ids.persona()   // persona_01HX7K...

// CAMPAIGNS
ids.campaign()  // camp_01HX7K...
ids.calendar()  // cal_01HX7K...
ids.sequence()  // seq_01HX7K...
ids.blast()     // blt_01HX7K...
ids.retarget()  // rt_01HX7K...

// EXECUTION
ids.touch()     // tch_01HX7K...
ids.response()  // res_01HX7K...
ids.message()   // msg_01HX7K...

// ENRICHMENT
ids.skipTraceJob()    // stj_01HX7K...
ids.phone()           // ph_01HX7K...
ids.email()           // em_01HX7K...
```
