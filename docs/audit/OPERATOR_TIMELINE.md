# Operator Journey Timeline

## End-to-End Human Experience

This documents what the operator SEES and DOES at each step.

---

## Timeline Table

| Step | Operator Sees | Buttons Available | System Does | State Change |
|------|---------------|-------------------|-------------|--------------|
| 1. Upload CSV | "Upload" page, drag-drop zone | Upload, Cancel | Parse CSV, validate format | `data_source.status = 'uploaded'` |
| 2. Processing | Progress bar, record count | Cancel | Normalize, create records | `data_source.status = 'processing'` |
| 3. LUCY Prep | "Preparing leads" status | Pause, Resume | Score leads, create batches | `leads.status = 'preparing'` |
| 4. Enrichment | Batch progress (1/8, 2/8...) | Pause | SkipTrace API calls | `leads.enrichmentStatus = 'pending' → 'completed'` |
| 5. Lead Block Ready | "2,000 leads ready" card | View Leads, Start Campaign | - | `leadBlock.status = 'ready'` |
| 6. Campaign Setup | Template selector, preview | Select Template, Preview | - | `campaign.status = 'DRAFT'` |
| 7. Stage Campaign | Lead count, template preview | Stage Campaign | Assign leads to campaign | `campaign.status = 'STAGED'` |
| 8. **APPROVE** | Approval confirmation modal | **APPROVE & LAUNCH**, Cancel | Record approval | `campaign.approvedAt = NOW()` |
| 9. Running | Sent/Delivered counts updating | Pause | Send messages via SignalHouse | `messages.status = 'SENT'` |
| 10. Inbound Arrives | Notification badge, inbox count | View Inbox | Match, classify, prioritize | `inbox_items.id created` |
| 11. View Response | Message text, lead context | Reply, Move Bucket, Flag | - | - |
| 12. Classify | Classification badge (auto or manual) | Reclassify, Approve | Apply tags, update priority | `inbox_items.classification` |
| 13. Take Action | Suggested response (if applicable) | Approve, Edit, Reject, Call | Send response, update state | `messages.id created` |
| 14. Close Lead | Outcome selector | Mark Closed, Convert, Lost | Update lead status | `leads.status = 'closed'` |

---

## Screen Flow

```
HOME DASHBOARD
    │
    ├─→ UPLOAD CSV
    │       ↓
    │   PROCESSING (progress)
    │       ↓
    │   LEADS READY (count, score distribution)
    │
    ├─→ CREATE CAMPAIGN
    │       ↓
    │   SELECT TEMPLATE
    │       ↓
    │   PREVIEW (sample messages)
    │       ↓
    │   STAGE CAMPAIGN
    │       ↓
    │   **APPROVE & LAUNCH**  ← [NEW GATE]
    │       ↓
    │   RUNNING (live stats)
    │
    └─→ INBOX
            │
            ├─→ UNIVERSAL (all inbound)
            ├─→ HOT LEADS (priority >= 90)
            ├─→ QUESTIONS (needs response)
            ├─→ REVIEW (unclear/flagged)
            └─→ PROCESSED (completed)
                    │
                    └─→ LEAD DETAIL
                            │
                            ├─→ CONVERSATION THREAD
                            ├─→ LEAD PROFILE
                            ├─→ ACTIVITY LOG
                            └─→ ACTIONS (Call, Email, Close)
```

---

## Key Moments

### Moment 1: Campaign Approval

**What operator sees:**
```
┌─────────────────────────────────────┐
│  APPROVE CAMPAIGN                   │
├─────────────────────────────────────┤
│  Campaign: "Plumbers Initial SMS"   │
│  Leads: 2,000                       │
│  Template: "Hey {{name}}..."        │
│  Worker: GIANNA                     │
│                                     │
│  ⚠️ This will send 2,000 messages   │
│                                     │
│  [Cancel]  [APPROVE & LAUNCH]       │
└─────────────────────────────────────┘
```

**What system does on APPROVE:**
1. Set `approvedBy = currentUserId`
2. Set `approvedAt = NOW()`
3. Transition to RUNNING
4. Begin message dispatch

### Moment 2: Hot Lead Notification

**What operator sees:**
```
┌─────────────────────────────────────┐
│  🔥 HOT LEAD                        │
├─────────────────────────────────────┤
│  John Smith captured email          │
│  "john@company.com"                 │
│                                     │
│  Priority: 100 (GOLD)               │
│  Action: Push to Call Queue         │
│                                     │
│  [View Lead]  [Call Now]            │
└─────────────────────────────────────┘
```

### Moment 3: Response Review

**What operator sees:**
```
┌─────────────────────────────────────┐
│  INBOUND MESSAGE                    │
├─────────────────────────────────────┤
│  From: John Smith (555-123-4567)    │
│  "Can you tell me more about this?" │
│                                     │
│  Classification: QUESTION           │
│  Suggested by: GIANNA               │
│                                     │
│  Suggested Response:                │
│  "Of course! Here's a quick..."     │
│                                     │
│  [Edit]  [Reject]  [APPROVE & SEND] │
└─────────────────────────────────────┘
```

---

## Visibility Requirements

| Data Point | Must Be Visible | Location |
|------------|-----------------|----------|
| Campaign status | Always | Campaign list, detail |
| Sent/Delivered counts | Real-time | Campaign detail |
| Inbox count | Always | Sidebar badge |
| Hot lead count | Always | Dashboard, inbox header |
| Pending approvals | Always | Sidebar badge |
| Call queue size | Always | Phone center header |

---

## Nice-to-Haves (DEFER)

1. **Unified dashboard** - Single view of all critical metrics
2. **Keyboard shortcuts** - j/k navigation, a to approve
3. **Bulk actions** - Approve/reject multiple at once
4. **Dark mode** - Because operators work late
