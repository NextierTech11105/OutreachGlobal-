# Platform Invariants

**Rules That Must Never Be Broken**

These invariants protect data integrity, tenant isolation, compliance, and system reliability. Violations of these rules can result in data breaches, compliance failures, or system outages.

---

## 1. Tenant Isolation Invariants

### INV-001: Every Tenant-Scoped Query MUST Include teamId
```typescript
// CORRECT
await db.query.leads.findMany({
  where: and(
    eq(leadsTable.teamId, teamId),  // ✓ REQUIRED
    eq(leadsTable.status, "ACTIVE")
  )
});

// VIOLATION - Will leak data across tenants
await db.query.leads.findMany({
  where: eq(leadsTable.status, "ACTIVE")  // ✗ Missing teamId
});
```

### INV-002: New Database Tables MUST Have teamId
Every table storing tenant data MUST include:
```typescript
teamId: teamsRef({ onDelete: "cascade" }).notNull()
```
Exceptions require explicit security review and documentation.

### INV-003: Foreign Keys to Tenant Data MUST Cascade
When referencing tenant-scoped tables, use cascade delete to prevent orphaned records:
```typescript
leadId: ulidColumn()
  .references(() => leads.id, { onDelete: "cascade" })
  .notNull()
```

### INV-004: Never Trust User Input for teamId
Always derive teamId from authenticated user's team membership:
```typescript
// CORRECT - Derived from authenticated context
const team = await this.teamService.findById(args.teamId);
await this.teamPolicy.can().read(user, team);  // Validates membership

// VIOLATION - Trusting user input
const data = await this.service.findAll(req.body.teamId);  // ✗ Unvalidated
```

---

## 2. API & External Service Invariants

### INV-005: External API Calls MUST Have Credit Pre-Validation
Before calling any credit-consuming API (Apollo, RealEstateAPI, SkipTrace):
1. Check team's available credits
2. Reserve credits before call
3. Deduct on success, release on failure

### INV-006: External API Calls MUST Have Timeout
All external HTTP calls must specify explicit timeout:
```typescript
// CORRECT
await axios.get(url, { timeout: 30000 });

// VIOLATION
await axios.get(url);  // ✗ No timeout - can hang indefinitely
```

### INV-007: Batch Operations MUST Track Progress
Operations processing multiple records must:
1. Track which records were processed
2. Support resumption from failure point
3. Not mark batch as complete if any records failed

---

## 3. Queue & Job Invariants

### INV-008: Queue Jobs MUST Have Idempotency Keys
Jobs that can be retried or duplicated must use deduplication:
```typescript
await queue.add("PROCESS", data, {
  deduplication: {
    id: `${entityType}_${entityId}_${operationType}`
  }
});
```

### INV-009: Failed Jobs MUST Route to Dead Letter Queue
Never silently drop failed jobs. All failures must be:
1. Logged with full context
2. Routed to DLQ for analysis
3. Alertable via monitoring

### INV-010: Jobs MUST NOT Have Side Effects Before Completion
All database writes in jobs must be atomic:
```typescript
// CORRECT - Transaction ensures atomicity
await db.transaction(async (tx) => {
  await tx.insert(records);
  await tx.update(status);
});

// VIOLATION - Partial writes possible
await db.insert(records);  // If this succeeds...
await db.update(status);   // ...but this fails, inconsistent state
```

---

## 4. Compliance Invariants

### INV-011: DNC/Opt-Out Requests MUST Be Immediate
When a user requests opt-out (texts "STOP"):
1. Immediately add to suppression list (no human approval)
2. Cancel all pending messages to that number
3. Confirm removal to user

**This is legally mandated by TCPA. No exceptions.**

### INV-012: All Outbound Messages MUST Have Audit Trail
Every sent message must record:
- Timestamp
- Recipient (lead ID, phone/email)
- Content (or template reference)
- Sender (campaign ID, user ID)
- Delivery status

### INV-013: Message Content MUST Be Versioned
Before sending, message content must be frozen:
```typescript
{
  originalContent: "...",
  finalContent: "...",
  editedBy: userId,
  editedAt: timestamp,
  approvedBy: userId,
  approvedAt: timestamp
}
```

---

## 5. Security Invariants

### INV-014: Secrets MUST Come From Environment Variables
Never hardcode secrets in source code:
```typescript
// CORRECT
const apiKey = this.configService.get("APOLLO_API_KEY");

// VIOLATION
const apiKey = "sk-live-abc123...";  // ✗ Hardcoded secret
```

### INV-015: Authentication MUST Be Validated on Every Request
Every API request (except public endpoints) must:
1. Validate JWT token
2. Verify token not revoked (JTI check)
3. Confirm user has required role

### INV-016: Input MUST Be Validated Before Processing
All user input must pass schema validation:
```typescript
// CORRECT
const validated = parseSchema(createLeadSchema, req.body);
await this.service.create(validated);

// VIOLATION
await this.service.create(req.body);  // ✗ Unvalidated input
```

---

## 6. Observability Invariants

### INV-017: Errors MUST Be Logged With Context
Every error log must include:
```typescript
this.logger.error(`Operation failed`, {
  correlationId,
  teamId,
  userId,
  operation: "enrichLead",
  leadId,
  error: error.message,
  stack: error.stack
});
```

### INV-018: External API Calls MUST Be Logged
Log entry and exit for all external calls:
```typescript
this.logger.log(`Apollo API call starting`, { teamId, domain });
// ... call ...
this.logger.log(`Apollo API call completed`, { teamId, domain, duration, status });
```

### INV-019: Job Processing MUST Log State Transitions
```typescript
this.logger.log(`Job started`, { jobId, type, data });
// ... process ...
this.logger.log(`Job completed`, { jobId, type, result, duration });
// or
this.logger.error(`Job failed`, { jobId, type, error, attempts });
```

---

## 7. Data Integrity Invariants

### INV-020: IDs MUST Use ULID Format
All primary keys must use ULID with prefix:
```typescript
id: primaryUlid("lead")  // Generates: lead_01HXYZ...
id: primaryUlid("camp")  // Generates: camp_01HXYZ...
```

### INV-021: Timestamps MUST Be UTC
All timestamps stored and processed in UTC:
```typescript
createdAt: timestamp({ withTimezone: true }).defaultNow()
```

### INV-022: Phone Numbers MUST Be E.164 Format
All phone numbers normalized before storage:
```typescript
// CORRECT: +12125551234
// VIOLATION: (212) 555-1234, 212-555-1234
```

---

## 8. Object Storage Invariants

### INV-023: Uploads MUST Have Content Hash
Before storing, compute hash to detect duplicates:
```typescript
const contentHash = crypto.createHash("sha256").update(content).digest("hex");
const key = `${prefix}/${contentHash}_${timestamp}.csv`;
```

### INV-024: Index Updates MUST Be Atomic
Use optimistic locking or atomic operations:
```typescript
// Check current version, update with new version
// Retry if version mismatch
```

### INV-025: Large Files MUST Use Multipart Upload
Files > 5MB must use multipart upload with checksum verification per part.

---

## Enforcement

### Pre-Commit Hooks
- Schema changes must include teamId check
- New services must implement logging
- External API calls must have timeout

### Code Review Checklist
- [ ] teamId filtering on all queries
- [ ] Input validation on all endpoints
- [ ] Error handling with context
- [ ] Idempotency for queue jobs
- [ ] Audit trail for sensitive operations

### Automated Testing
- Tenant isolation integration tests
- DNC compliance verification
- API timeout tests
- Idempotency verification tests
