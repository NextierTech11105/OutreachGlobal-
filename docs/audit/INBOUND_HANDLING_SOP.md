# Inbound Response Handling SOP

## HARD RULE

Inbound responses MUST be matched by:
1. `from_phone_number` (lead's phone)
2. `to_phone_number` (our sending number)

---

## Matching Algorithm

### Primary Match (Exact)

```typescript
async function matchInbound(from: string, to: string) {
  // 1. Normalize both numbers
  const fromNorm = from.replace(/\D/g, '').slice(-10);
  const toNorm = to.replace(/\D/g, '').slice(-10);

  // 2. Find most recent outbound to this lead from this number
  const outbound = await db.query.messages.findFirst({
    where: and(
      eq(messages.toAddress, fromNorm),
      eq(messages.fromAddress, toNorm),
      eq(messages.direction, 'outbound')
    ),
    orderBy: desc(messages.createdAt)
  });

  if (outbound) {
    return {
      leadId: outbound.leadId,
      campaignId: outbound.campaignId,
      matchType: 'exact'
    };
  }

  // 3. Fallback: search by sender phone only
  const lead = await db.query.leads.findFirst({
    where: like(leads.phone, `%${fromNorm}%`)
  });

  if (lead) {
    return {
      leadId: lead.id,
      campaignId: lead.campaignId,
      matchType: 'phone_only'
    };
  }

  return null; // No match
}
```

### Worker Routing (by receiving number)

```typescript
function routeToWorker(toPhone: string): AIWorker {
  const norm = toPhone.replace(/\D/g, '').slice(-10);

  if (norm === process.env.GIANNA_PHONE?.slice(-10)) return 'GIANNA';
  if (norm === process.env.CATHY_PHONE?.slice(-10)) return 'CATHY';
  if (norm === process.env.SABRINA_PHONE?.slice(-10)) return 'SABRINA';

  return 'GIANNA'; // Default
}
```

---

## Edge Cases

| Case | Detection | Action |
|------|-----------|--------|
| Lead texts from different number | No match on `from` | Create new inbox item, flag for review |
| Multiple leads share phone | Multiple matches | Use most recent outbound context |
| Provider message ID mismatch | `externalId` not found | Log warning, process anyway |
| Duplicate webhook | Same `message_id` received twice | Idempotent - skip if exists |
| Lead not in any campaign | No `campaignId` | Route to universal inbox |

---

## Conversation Threading

### Thread Identity

A conversation thread is identified by:
```
(lead_id, phone_number, campaign_id)
```

### Message Ordering

```sql
SELECT * FROM messages
WHERE lead_id = :leadId
AND (from_address = :phone OR to_address = :phone)
ORDER BY created_at ASC;
```

### Cross-Campaign Continuity

**Current**: Each campaign starts fresh thread
**Decision needed**: Should threads persist across campaigns?

---

## Webhook Processing Flow

```
SignalHouse Webhook
    ↓
1. Validate token
    ↓
2. Extract: from, to, body, message_id
    ↓
3. Match to lead (matchInbound)
    ↓
4. Route to worker (routeToWorker)
    ↓
5. Create inbound message record
    ↓
6. Create inbox_item
    ↓
7. Classify response (next SOP)
    ↓
8. Return 200 OK
```

---

## Failure Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Webhook timeout | No 200 response | SignalHouse retries (3x) |
| DB write failed | Exception caught | Log to dead letter queue, alert |
| No lead match | matchInbound returns null | Create orphan inbox item |
| Invalid phone format | Normalization fails | Log warning, try partial match |

---

## Nice-to-Haves (DEFER)

1. **Phone number verification** - Validate sender phone is real
2. **Spam detection** - Flag suspicious patterns
3. **Auto-merge conversations** - Combine threads for same person
