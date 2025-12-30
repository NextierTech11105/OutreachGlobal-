# Response Classification Matrix

## HARD RULE

No inbound response may remain unclassified.

---

## Classification Table (Priority Order)

| Priority | Class | Keywords/Pattern | Action | Suppress | Highlight | Immediate |
|----------|-------|------------------|--------|----------|-----------|-----------|
| 200 | **PROFANITY** | [explicit words] | Hide from UI | YES | - | Log only |
| 190 | **OPT_OUT** | STOP, UNSUBSCRIBE, CANCEL | Stop all contact | YES | RED | Add to suppression |
| 185 | **WRONG_NUMBER** | WRONG PERSON, NOT ME | Remove from list | YES | - | Mark invalid |
| 180 | **NOT_INTERESTED** | NO, PASS, NOT INTERESTED | Deprioritize | YES | - | Tag for retarget |
| 100 | **EMAIL_CAPTURE** | `email@domain.com` | Value X + Call Queue | NO | GREEN | **GOLD LABEL** |
| 95 | **MOBILE_CAPTURE** | 10-digit phone | Update lead phone | NO | GREEN | Verify number |
| 90 | **CALLED_BACK** | [CALL] marker | High intent | NO | GREEN | Push to queue |
| 85 | **QUESTION** | Contains `?` | Respond | NO | GREEN | Route to worker |
| 80 | **WANTS_CALL** | CALL ME, GIVE ME A CALL | Push to call queue | NO | GREEN | Immediate route |
| 70 | **NEEDS_HELP** | HELP, SUPPORT, ASSIST | Route to human | NO | YELLOW | Flag for review |
| 50 | **POSITIVE** | YES, INTERESTED, SURE | Follow-up | NO | GREEN | Warm lead |
| 30 | **THANK_YOU** | THANKS, TY, APPRECIATE | Acknowledge | NO | BLUE | No action |
| 10 | **UNCLEAR** | [no match] | Manual review | NO | GRAY | Flag for review |
| 0 | **OTHER** | Catch-all | Manual review | NO | - | Log |

---

## Detection Methods

### OPT_OUT (Highest Priority After Profanity)

```typescript
const OPT_OUT_PATTERNS = [
  /\bSTOP\b/i,
  /\bUNSUBSCRIBE\b/i,
  /\bCANCEL\b/i,
  /\bEND\b/i,
  /\bQUIT\b/i,
  /\bOPT\s*OUT\b/i,
  /\bREMOVE\s*(ME)?\b/i
];

function isOptOut(text: string): boolean {
  return OPT_OUT_PATTERNS.some(p => p.test(text));
}
```

### EMAIL_CAPTURE (GOLD LABEL)

```typescript
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

function extractEmail(text: string): string | null {
  const matches = text.match(EMAIL_REGEX);
  return matches?.[0] || null;
}
```

### MOBILE_CAPTURE

```typescript
const PHONE_REGEX = /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g;

function extractPhone(text: string): string | null {
  const matches = text.match(PHONE_REGEX);
  if (matches) {
    const digits = matches[0].replace(/\D/g, '');
    return digits.length === 10 ? digits : null;
  }
  return null;
}
```

### QUESTION

```typescript
function isQuestion(text: string): boolean {
  return text.includes('?');
}
```

### WANTS_CALL

```typescript
const CALL_PATTERNS = [
  /\bCALL\s*ME\b/i,
  /\bGIVE\s*(ME\s*)?(A\s*)?CALL\b/i,
  /\bRING\s*ME\b/i,
  /\bPHONE\s*ME\b/i
];

function wantsCall(text: string): boolean {
  return CALL_PATTERNS.some(p => p.test(text));
}
```

---

## Classification Flow

```typescript
function classifyResponse(text: string): Classification {
  // Priority order - first match wins
  if (containsProfanity(text)) return { type: 'PROFANITY', priority: 200, suppress: true };
  if (isOptOut(text)) return { type: 'OPT_OUT', priority: 190, suppress: true };
  if (isWrongNumber(text)) return { type: 'WRONG_NUMBER', priority: 185, suppress: true };
  if (isNotInterested(text)) return { type: 'NOT_INTERESTED', priority: 180, suppress: true };

  const email = extractEmail(text);
  if (email) return { type: 'EMAIL_CAPTURE', priority: 100, goldLabel: true, extracted: { email } };

  const phone = extractPhone(text);
  if (phone) return { type: 'MOBILE_CAPTURE', priority: 95, extracted: { phone } };

  if (wantsCall(text)) return { type: 'WANTS_CALL', priority: 80 };
  if (isQuestion(text)) return { type: 'QUESTION', priority: 85 };
  if (isPositive(text)) return { type: 'POSITIVE', priority: 50 };
  if (isThankYou(text)) return { type: 'THANK_YOU', priority: 30 };

  return { type: 'UNCLEAR', priority: 10, requiresReview: true };
}
```

---

## System Actions by Class

| Class | Immediate Action | Lead Update | Queue Action |
|-------|------------------|-------------|--------------|
| OPT_OUT | Add to suppression_list | `status = 'opted_out'` | Remove from all queues |
| EMAIL_CAPTURE | Store email, send confirmation | `email = extracted`, `tags += 'gold_label'` | Push to call_queue (priority 100) |
| MOBILE_CAPTURE | Validate number | `primary_phone = extracted` | - |
| WANTS_CALL | - | `tags += 'wants_call'` | Push to call_queue |
| QUESTION | - | `tags += 'question_asked'` | Route to worker |
| POSITIVE | - | `tags += 'interested'` | Push to follow-up queue |
| UNCLEAR | Flag for review | - | Add to review bucket |

---

## Audit Log Entry

Every classification creates an audit entry:

```sql
INSERT INTO lead_events (
  id, team_id, lead_id, event_type, payload, created_at
) VALUES (
  :id,
  :teamId,
  :leadId,
  'response_classified',
  jsonb_build_object(
    'messageId', :messageId,
    'classification', :classification,
    'confidence', :confidence,
    'extracted', :extracted,
    'classifiedBy', 'system'
  ),
  NOW()
);
```

---

## Nice-to-Haves (DEFER)

1. **ML-based classification** - Train model on labeled data
2. **Confidence scoring** - Fuzzy match confidence
3. **Multi-label support** - Message can have multiple classifications
4. **Language detection** - Handle non-English responses
