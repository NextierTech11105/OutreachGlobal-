# Prioritization Engine

## Priority Scoring Formula

```
priority_score = BASE_SCORE
  + (has_email × WEIGHT_EMAIL)
  + (has_mobile × WEIGHT_MOBILE)
  + (wants_call × WEIGHT_WANTS_CALL)
  + (asked_question × WEIGHT_QUESTION)
  - (not_reached × WEIGHT_NOT_REACHED)
```

### Config Keys (NO VALUES - Operator Sets)

```yaml
# Priority weights - values set by operator
PRIORITY_BASE_SCORE: _
WEIGHT_EMAIL: _
WEIGHT_MOBILE: _
WEIGHT_WANTS_CALL: _
WEIGHT_QUESTION: _
WEIGHT_NOT_REACHED: _

# Thresholds
CALL_QUEUE_PRIORITY_THRESHOLD: _
HIGH_PRIORITY_THRESHOLD: _
```

---

## Priority Tiers

| Tier | Score Range | Label | SLA |
|------|-------------|-------|-----|
| GOLD | 90-100 | Hot Lead | < 15 min |
| GREEN | 70-89 | Warm Lead | < 1 hour |
| STANDARD | 40-69 | Normal | < 4 hours |
| LOW | 0-39 | Cold | Best effort |

---

## Queue Ordering

```sql
SELECT * FROM inbox_items
WHERE team_id = :teamId
AND is_processed = false
ORDER BY
  priority_score DESC,
  CASE WHEN classification = 'EMAIL_CAPTURE' THEN 0 ELSE 1 END,
  created_at ASC
LIMIT 50;
```

### Hot Lead Surfacing

Leads with these conditions surface IMMEDIATELY:

```typescript
const isHotLead = (item: InboxItem): boolean => {
  return (
    item.classification === 'EMAIL_CAPTURE' ||
    item.classification === 'WANTS_CALL' ||
    item.priorityScore >= config.HIGH_PRIORITY_THRESHOLD
  );
};
```

### Noise Deprioritization

Leads with these tags are deprioritized:

```typescript
const isNoise = (item: InboxItem): boolean => {
  const noiseTags = ['not_interested', 'wrong_number', 'no_response'];
  return item.tags.some(t => noiseTags.includes(t));
};
```

---

## Call Queue Eligibility

A lead is eligible for the Phone Center queue IFF:

```typescript
const isCallQueueEligible = (lead: Lead): boolean => {
  return (
    lead.tags.includes('mobile_captured') &&
    (
      lead.tags.includes('wants_call') ||
      lead.priorityScore >= config.CALL_QUEUE_PRIORITY_THRESHOLD
    ) &&
    !lead.tags.includes('opted_out') &&
    !lead.tags.includes('do_not_contact')
  );
};
```

When eligible:
1. Apply tags: `push_to_call_center`, `call_ready`
2. Set state: `in_call_queue`
3. Create `call_queue` entry with priority

---

## Priority Update Events

Priority recalculates on these events:

| Event | Score Change |
|-------|--------------|
| Email captured | + WEIGHT_EMAIL |
| Mobile captured | + WEIGHT_MOBILE |
| Said "call me" | + WEIGHT_WANTS_CALL |
| Asked question | + WEIGHT_QUESTION |
| No response (3+ attempts) | - WEIGHT_NOT_REACHED |
| Opted out | Set to 0, suppress |

---

## Nothing Gets Lost

### Guaranteed Processing

Every inbox item MUST be either:
1. Processed by human (processedBy NOT NULL)
2. Auto-processed by system (classification action)
3. In a queue awaiting action

### Orphan Detection

```sql
-- Find items stuck > 24 hours without action
SELECT * FROM inbox_items
WHERE is_processed = false
AND created_at < NOW() - INTERVAL '24 hours'
AND current_bucket = 'universal';
```

---

## Nice-to-Haves (DEFER)

1. **Time-based decay** - Priority decreases over time
2. **Agent workload balancing** - Route to less busy agents
3. **Priority boost rules** - Increase priority on repeat contact
