# Copilot Handling SOP

## HARD RULE

Copilot NEVER sends without traceable approval (human or rule).
Approval MUST be logged.

---

## AI Workers

| Worker | Role | Phone Env Var | Trigger Conditions |
|--------|------|---------------|-------------------|
| **GIANNA** | Opener | `GIANNA_PHONE_NUMBER` | Initial outreach, retarget, email capture confirmation |
| **CATHY** | Nudger | `CATHY_PHONE_NUMBER` | Ghost leads, no response, humor re-engagement |
| **SABRINA** | Closer | `SABRINA_PHONE_NUMBER` | Hot leads, wants_call, appointment booking |
| **NEVA** | Researcher | N/A | Pre-appointment context, background intel |

---

## Decision Tree by Classification

### EMAIL_CAPTURE → GIANNA confirms

```
Input: Lead sends "john@email.com"
    ↓
1. Extract email
2. Store in lead record
3. GIANNA sends confirmation:
   "Got it! I'll have that sent to {email} shortly. - Gianna"
4. Push to call_queue (priority 100)
5. Queue Value X delivery
    ↓
Approval: AUTOMATIC (rule-based)
Logged: { approvalMethod: 'auto', rule: 'email_capture_confirm' }
```

### WANTS_CALL → SABRINA routes

```
Input: Lead says "Call me"
    ↓
1. Add tags: wants_call, push_to_call_center
2. Create call_queue entry
3. SABRINA notified (or auto-response if configured)
    ↓
Approval: AUTOMATIC (priority threshold met)
Logged: { approvalMethod: 'auto', rule: 'wants_call_route' }
```

### QUESTION → Worker responds

```
Input: Lead asks "What do you offer?"
    ↓
1. Classify as QUESTION
2. Route to assigned worker (GIANNA by default)
3. Worker generates suggested response
4. HUMAN reviews and approves
5. Message sent
    ↓
Approval: HUMAN REQUIRED
Logged: { approvalMethod: 'human', approvedBy: 'user_123' }
```

### OPT_OUT → System handles

```
Input: Lead says "STOP"
    ↓
1. Classify as OPT_OUT
2. Add to suppression_list
3. Cancel all pending messages
4. NO response sent
    ↓
Approval: AUTOMATIC (compliance rule)
Logged: { approvalMethod: 'auto', rule: 'opt_out_compliance' }
```

### UNCLEAR → Human review

```
Input: Lead says "hmm maybe"
    ↓
1. Classify as UNCLEAR
2. Flag requiresReview = true
3. Add to review bucket
4. HUMAN classifies and responds
    ↓
Approval: HUMAN REQUIRED
Logged: { approvalMethod: 'human', approvedBy: 'user_123' }
```

---

## Approval Audit Schema

```sql
-- Add to messages table
ALTER TABLE messages ADD COLUMN approval_method TEXT;  -- 'auto' | 'human'
ALTER TABLE messages ADD COLUMN approved_by TEXT;      -- user_id or 'system'
ALTER TABLE messages ADD COLUMN approval_rule TEXT;    -- which rule triggered auto-approval
ALTER TABLE messages ADD COLUMN approved_at TIMESTAMP;
```

### Approval Types

| Type | Description | Logged As |
|------|-------------|-----------|
| `auto` | Rule-based automatic approval | `{ method: 'auto', rule: 'rule_name' }` |
| `human` | Human clicked approve | `{ method: 'human', userId: '...' }` |
| `scheduled` | Pre-approved scheduled message | `{ method: 'scheduled', scheduledBy: '...' }` |

---

## UI Controls Required

### For Auto-Approved Messages

- Show "Auto-sent" badge
- Show which rule triggered
- Allow human to review post-hoc

### For Human-Approval Messages

- Show suggested response (editable)
- Show confidence score
- "Approve & Send" button
- "Edit" button
- "Reject" button (mark as handled without sending)

### For All Messages

- Show approval trail in message detail
- Allow undo within 5 seconds (if not delivered)

---

## Worker Suggestion Logic

```typescript
async function getSuggestedResponse(
  worker: AIWorker,
  context: LeadContext,
  classification: Classification
): Promise<Suggestion> {
  // 1. Get worker personality
  const personality = WORKER_PERSONALITIES[worker];

  // 2. Get relevant templates
  const templates = await getTemplatesForClassification(classification);

  // 3. Generate personalized response
  const response = personalizeTemplate(templates[0], context);

  return {
    text: response,
    confidence: templates[0].matchScore,
    templateId: templates[0].id,
    worker,
    requiresApproval: classification.type === 'UNCLEAR' || classification.type === 'QUESTION'
  };
}
```

---

## Nice-to-Haves (DEFER)

1. **Approval delegation** - Auto-approve for trusted workers
2. **Bulk approval** - Approve multiple similar responses
3. **Response templates** - Pre-approved canned responses
4. **AI confidence threshold** - Auto-approve if confidence > X
