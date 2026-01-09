# Feature Contract: [FEATURE_NAME]

## Metadata
- **ID:** FC-YYYY-MM-DD-XXX
- **Author:** [Name/Agent]
- **Status:** Draft | Review | Approved | Implementing | Done
- **Scope:** Backend | Frontend | Infra | Shared

---

## 1. User Intent
> What does the user want to accomplish? One sentence.

---

## 2. System Flow
```
[Trigger] → [Step 1] → [Step 2] → [Outcome]
```

---

## 3. API Contract

### REST Endpoints
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | /api/... | `{ }` | `{ }` |

### GraphQL (if applicable)
```graphql
mutation Example($input: ExampleInput!) {
  example(input: $input) {
    id
    status
  }
}
```

---

## 4. Events
| Event | Payload | When |
|-------|---------|------|
| `thing.created` | `{ id }` | After insert |

---

## 5. State Changes

### Database
| Table | Operation | Fields |
|-------|-----------|--------|
| example | INSERT | id, name |

### Redis (if applicable)
| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `cache:example:{id}` | 1h | Cache |

---

## 6. Acceptance Tests
- [ ] Given X, when Y, then Z
- [ ] Edge case: ...
- [ ] Error case: ...

---

## 7. Sign-off
- [ ] Backend
- [ ] Frontend
- [ ] Human Review (if breaking change)
