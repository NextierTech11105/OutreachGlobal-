# Phone-Number-Centric Messaging Model

## HARD RULE

> Every outbound message is permanently bound to the EXACT phone number it was sent from.

---

## Current State

### What EXISTS

- Phone selected from lead at send time
- `messages.fromAddress` stores sending number
- `messages.toAddress` stores recipient number
- `campaignId` in message metadata

### What's MISSING

1. No FK constraint binding phone to campaign
2. Phone selection can vary between sends
3. No explicit `outbound_number_id` column

---

## Required Implementation

### MUST HAVE: campaign_phone_assignments table

```sql
CREATE TABLE campaign_phone_assignments (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  phone_number TEXT NOT NULL,  -- E.164 format
  phone_number_id TEXT,        -- Optional: FK to phone inventory
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT true,

  UNIQUE (campaign_id, phone_number)
);

CREATE INDEX idx_cpa_campaign ON campaign_phone_assignments(campaign_id);
CREATE INDEX idx_cpa_phone ON campaign_phone_assignments(phone_number);
```

### MUST HAVE: outbound_number_id on messages

```sql
ALTER TABLE messages ADD COLUMN outbound_number_id TEXT;
ALTER TABLE messages ADD COLUMN campaign_phone_assignment_id TEXT
  REFERENCES campaign_phone_assignments(id);
```

---

## Phone Assignment Rules

### When a Campaign is STAGED

1. System assigns primary phone number(s) to campaign
2. Creates `campaign_phone_assignments` record
3. All outbound messages MUST use this assigned number

### When a Message is Sent

```typescript
// 1. Look up assigned phone for campaign
const assignment = await db.query.campaignPhoneAssignments.findFirst({
  where: and(
    eq(campaignPhoneAssignments.campaignId, campaignId),
    eq(campaignPhoneAssignments.isPrimary, true)
  )
});

if (!assignment) {
  throw new Error('No phone assigned to campaign');
}

// 2. Send with assigned phone
const result = await signalhouse.send({
  from: assignment.phoneNumber,
  to: lead.phone,
  body: message
});

// 3. Store with FK reference
await db.insert(messages).values({
  ...messageData,
  fromAddress: assignment.phoneNumber,
  campaignPhoneAssignmentId: assignment.id
});
```

---

## Inbound Matching

### Matching Algorithm

```typescript
async function matchInboundToLead(fromPhone: string, toPhone: string) {
  // 1. Normalize phones
  const normalizedFrom = normalizePhone(fromPhone);
  const normalizedTo = normalizePhone(toPhone);

  // 2. Find campaign by receiving phone
  const assignment = await db.query.campaignPhoneAssignments.findFirst({
    where: eq(campaignPhoneAssignments.phoneNumber, normalizedTo)
  });

  // 3. Find lead by sender phone within that campaign
  const lead = await db.query.leads.findFirst({
    where: and(
      eq(leads.phone, normalizedFrom),
      eq(leads.campaignId, assignment?.campaignId)
    )
  });

  // 4. Fallback: search all leads by phone
  if (!lead) {
    return await db.query.leads.findFirst({
      where: like(leads.phone, `%${normalizedFrom}%`)
    });
  }

  return lead;
}
```

---

## Traceability Chain

```
Campaign → campaign_phone_assignments → messages → lead
    ↓              ↓                        ↓        ↓
 camp_123    cpa_456 (+14155551234)    msg_789   lead_012
                                          ↓
                                    externalId: SM_abc
                                    (SignalHouse SID)
```

Every message can trace back to:
- Which campaign it belongs to
- Which phone number sent it
- Which lead it was sent to
- Which provider message ID it has

---

## Nice-to-Haves (DEFER)

1. **Multi-number campaigns** - Rotate between multiple sending numbers
2. **Number reputation tracking** - Track delivery rates per number
3. **Auto-number selection** - Pick best number based on recipient area code
4. **Number cooldown** - Rest numbers that hit rate limits
