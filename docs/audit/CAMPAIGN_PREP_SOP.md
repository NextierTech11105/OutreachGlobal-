# Campaign Prep SOP

## Campaign Lifecycle States

```
DRAFT → STAGED → APPROVED → RUNNING → PAUSED → COMPLETED
                    ↑
              [NEW - approval gate]
```

### State Transitions

| From | To | Trigger | Required |
|------|-----|---------|----------|
| DRAFT | STAGED | User clicks "Stage Campaign" | Lead block formed |
| STAGED | APPROVED | User clicks "APPROVE" | **[NEW]** Explicit human approval |
| APPROVED | RUNNING | User clicks "Launch" or auto-start | approvedAt NOT NULL |
| RUNNING | PAUSED | User clicks "Pause" | - |
| PAUSED | RUNNING | User clicks "Resume" | - |
| RUNNING | COMPLETED | All leads processed | - |

---

## Block Formation Rules

### MUST HAVE

| Rule | Value | Source |
|------|-------|--------|
| Batch size | 250 records | `lucy/prepare` |
| Lead block | 2,000 records | 8 batches |
| Max per day | 2,000 | Rate limit |
| Max per month | 20,000 | LUCY capacity |

### Lead Selection Criteria

```sql
SELECT * FROM leads
WHERE team_id = :teamId
AND enrichment_status = 'completed'
AND is_sms_ready = true
AND do_not_contact = false
AND campaign_id IS NULL  -- Not already in a campaign
ORDER BY score DESC
LIMIT 2000;
```

---

## Approval Requirements

### MUST HAVE (NEW)

**Database additions:**
```sql
ALTER TABLE campaigns ADD COLUMN approved_by TEXT;
ALTER TABLE campaigns ADD COLUMN approved_at TIMESTAMP;
```

**Logic enforcement:**
```typescript
// In campaign launch endpoint
if (campaign.status === 'STAGED' && !campaign.approvedAt) {
  throw new Error('BLOCKED: Campaign requires approval before launch');
}
```

**UI requirement:**
- Add "APPROVE & LAUNCH" button in campaign detail view
- Button is disabled unless campaign is STAGED
- Clicking records `approvedBy` and `approvedAt`

---

## Guardrails Checklist

### Pre-Stage Checklist

- [ ] At least 250 leads available
- [ ] All leads have mobile phone
- [ ] No leads in suppression list
- [ ] Template selected
- [ ] Worker assigned (GIANNA/CATHY/SABRINA)

### Pre-Approval Checklist (HUMAN)

- [ ] Lead count reviewed
- [ ] Template previewed with sample lead
- [ ] Schedule confirmed (immediate or scheduled)
- [ ] Rate limits understood

### Pre-Launch Checklist (SYSTEM)

- [ ] `approvedAt` is NOT NULL
- [ ] `approvedBy` is NOT NULL
- [ ] Lead block exists
- [ ] Phone numbers assigned
- [ ] Provider (SignalHouse) is healthy

---

## Nice-to-Haves (DEFER)

1. **Campaign preview mode** - Send to 10 leads first, review, then full launch
2. **A/B template testing** - Split leads between templates
3. **Scheduled campaigns** - Launch at future time
4. **Campaign cloning** - Duplicate settings from existing campaign
