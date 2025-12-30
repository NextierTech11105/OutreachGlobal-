# Failure & Safety Playbooks

## HARD RULE

NO silent failure paths allowed.
Every failure must be: Detected → Contained → Recovered → Logged.

---

## Failure Matrix

| Failure | Detection | Containment | Recovery | Operator Control |
|---------|-----------|-------------|----------|------------------|
| Wrong number | `WRONG_NUMBER` classification | Stop contact to this phone | Remove from list, flag lead | "Mark Wrong Number" button |
| Duplicate outreach | **[NEW]** Pre-send dedup check | Skip if sent within 7 days | Log skip reason | View skip reason in logs |
| Misclassification | Human review in inbox | Reclassify, move bucket | Correct tags, update priority | "Reclassify" button |
| Provider outage | HTTP 5xx from SignalHouse | Pause campaign, retry queue | Auto-retry with backoff | "Resume Campaign" button |
| Human error (wrong reply) | User reports | **[DEFER]** Undo capability | Manual correction | "Undo" button (5s window) |
| Rate limit hit | HTTP 429 | Pause sending, queue messages | Exponential backoff | View queue status |
| Invalid phone format | Normalization fails | Skip lead, log error | Manual phone correction | "Edit Lead" phone field |
| Opt-out missed | Suppression list check | Immediate DNC add | Stop all contact | Automatic, no button needed |

---

## Playbook 1: Wrong Number

### Detection
```typescript
if (classification.type === 'WRONG_NUMBER') {
  // Triggered by: "wrong person", "not me", "who is this"
}
```

### Containment
```typescript
// 1. Add to suppression (temporary)
await addToSuppression(phoneNumber, 'WRONG_NUMBER', { leadId });

// 2. Cancel pending messages
await cancelPendingMessages(leadId);

// 3. Remove from campaign
await removeFromCampaign(leadId, campaignId);
```

### Recovery
```typescript
// Mark lead for review
await updateLead(leadId, {
  status: 'invalid',
  tags: [...tags, 'wrong_number'],
  notes: 'Phone number marked as wrong number'
});
```

### Operator Control
- "Mark Wrong Number" button in inbox item
- "Restore" button if marked in error

---

## Playbook 2: Duplicate Outreach Prevention

### Detection (NEW - Must Implement)
```typescript
async function checkDuplicateOutreach(leadId: string, campaignId: string): Promise<boolean> {
  const recent = await db.query.messages.findFirst({
    where: and(
      eq(messages.leadId, leadId),
      eq(messages.direction, 'outbound'),
      gt(messages.createdAt, subDays(new Date(), 7))
    )
  });

  return !!recent;
}
```

### Containment
```typescript
// Before sending
const isDuplicate = await checkDuplicateOutreach(leadId, campaignId);
if (isDuplicate) {
  skippedLeads.push({ leadId, reason: 'recent_outreach', lastSentAt: recent.createdAt });
  continue; // Skip this lead
}
```

### Recovery
- Lead remains in pool for future campaigns
- Log shows skip reason

### Operator Control
- View "Skipped Leads" report
- "Force Send" override (with warning)

---

## Playbook 3: Misclassification

### Detection
```typescript
// Human flags incorrect classification
// Or: confidence score below threshold
if (classification.confidence < 0.6) {
  inbox_item.requiresReview = true;
}
```

### Containment
- Item stays in review bucket
- No auto-action taken

### Recovery
```typescript
// Human reclassifies
await reclassify(inboxItemId, {
  newClassification: 'QUESTION',
  reclassifiedBy: userId,
  reason: 'Original classification incorrect'
});

// Reapply correct actions
await applyClassificationActions(inboxItemId, 'QUESTION');
```

### Operator Control
- "Reclassify" dropdown in inbox item
- Classification history visible

---

## Playbook 4: Provider Outage

### Detection
```typescript
try {
  await signalhouse.send(message);
} catch (error) {
  if (error.status >= 500 || error.code === 'ECONNREFUSED') {
    // Provider outage detected
  }
}
```

### Containment
```typescript
// 1. Pause campaign
await pauseCampaign(campaignId, { reason: 'provider_outage' });

// 2. Queue failed message for retry
await addToRetryQueue(message, { error, attempt: 1 });

// 3. Alert operator
await sendAlert('PROVIDER_OUTAGE', { campaignId, error });
```

### Recovery
```typescript
// Exponential backoff retry
const backoffMs = Math.min(1000 * Math.pow(2, attempt), 60000);
await delay(backoffMs);

// Retry
await processRetryQueue();
```

### Operator Control
- "Campaign Paused: Provider Issue" banner
- "Resume Campaign" button
- "View Failed Messages" link

---

## Playbook 5: Human Error (Wrong Reply Sent)

### Detection
- User clicks "Undo" within window
- User reports "I sent wrong message"

### Containment (DEFER - Nice-to-Have)
```typescript
// 5-second undo window
const message = await sendMessage(content);
setTimeout(async () => {
  message.undoable = false;
  await db.update(messages).set({ undoable: false });
}, 5000);
```

### Recovery
- If not delivered: Cancel message
- If delivered: Log correction, send follow-up

### Operator Control
- "Undo" button (5s window)
- "Send Correction" template

---

## Playbook 6: Rate Limit

### Detection
```typescript
if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
  // Rate limit hit
}
```

### Containment
```typescript
// 1. Pause sending
await pauseSending(campaignId);

// 2. Calculate reset time
const resetAt = error.headers['x-ratelimit-reset'];

// 3. Queue remaining messages
await queueForLater(remainingMessages, resetAt);
```

### Recovery
```typescript
// Auto-resume after reset
await scheduleResume(campaignId, resetAt);
```

### Operator Control
- "Rate Limited" status badge
- "Sending resumes at HH:MM" message
- "View Queue" link

---

## Alerting Rules

| Failure | Alert Type | Recipients |
|---------|------------|------------|
| Provider outage | Urgent | Ops team, campaign owner |
| Rate limit | Warning | Campaign owner |
| High skip rate (>10%) | Warning | Campaign owner |
| Opt-out spike (>5%) | Urgent | Compliance, campaign owner |
| Misclassification rate >20% | Warning | ML team |

---

## Audit Log Requirements

Every failure MUST log:

```sql
INSERT INTO system_events (
  id, team_id, event_type, severity, payload, created_at
) VALUES (
  :id,
  :teamId,
  'failure',
  :severity,  -- 'warning' | 'error' | 'critical'
  jsonb_build_object(
    'failureType', :type,
    'affectedEntity', :entityType,
    'affectedId', :entityId,
    'error', :errorMessage,
    'containmentAction', :action,
    'recoveryStatus', :status
  ),
  NOW()
);
```

---

## Nice-to-Haves (DEFER)

1. **Undo capability** - 5-second window to cancel sent message
2. **Auto-pause on error spike** - Pause if error rate > threshold
3. **Failure dashboard** - Centralized view of all failures
4. **Runbook links** - Link failures to recovery documentation
