# Production Readiness Gate Checklist

Use this checklist before deploying any new feature to production. All items must be checked or explicitly waived with documented rationale.

---

## Gate 1: Security

### Authentication & Authorization
- [ ] Feature is protected by `@UseAuthGuard()` decorator
- [ ] Role-based access is enforced where needed (`@Roles()`)
- [ ] Team membership is validated before data access
- [ ] No hardcoded credentials in code

### Input Validation
- [ ] All user inputs validated with Zod schema
- [ ] File uploads have size limits and type validation
- [ ] SQL injection prevented (using Drizzle ORM, no raw queries)
- [ ] XSS prevention for any HTML rendering

### Data Protection
- [ ] Sensitive data encrypted at rest (API keys, tokens)
- [ ] PII is masked in logs
- [ ] CORS configured for specific origins (not `*`)

---

## Gate 2: Tenant Isolation

### Database Layer
- [ ] All new tables have `teamId` column with NOT NULL
- [ ] Foreign keys use CASCADE delete appropriately
- [ ] Indexes include `teamId` for query performance

### Query Layer
- [ ] All queries filter by `teamId`
- [ ] No cross-tenant data leakage possible
- [ ] Tested with multi-tenant scenarios

### Cache Layer
- [ ] Cache keys include `teamId`
- [ ] No shared cache entries across tenants

---

## Gate 3: Reliability

### Error Handling
- [ ] All errors caught and logged with context
- [ ] No unhandled promise rejections
- [ ] Graceful degradation for external service failures
- [ ] User-friendly error messages (no stack traces in production)

### Retry & Recovery
- [ ] External API calls have timeout
- [ ] Retryable operations use exponential backoff
- [ ] Failed queue jobs route to DLQ
- [ ] Idempotency keys for critical operations

### Circuit Breaker
- [ ] External service failures don't cascade
- [ ] Rate limits respected
- [ ] Bulkhead pattern for resource isolation (if applicable)

---

## Gate 4: Observability

### Logging
- [ ] All entry points logged (API endpoints, job start)
- [ ] All exit points logged (success, failure)
- [ ] External API calls logged (request/response summary)
- [ ] Correlation ID propagated through request lifecycle

### Metrics (if metrics system exists)
- [ ] Request latency tracked
- [ ] Error rates tracked
- [ ] Queue depth monitored
- [ ] External API response times tracked

### Alerting
- [ ] Error rate threshold alert defined
- [ ] Latency threshold alert defined
- [ ] Queue backlog alert defined

---

## Gate 5: Performance

### Database
- [ ] New queries have execution plan reviewed
- [ ] Indexes exist for WHERE/JOIN columns
- [ ] No N+1 query patterns
- [ ] Batch operations for bulk data

### Memory
- [ ] Large datasets streamed, not loaded to memory
- [ ] No memory leaks in long-running processes
- [ ] File uploads don't buffer entire file

### Concurrency
- [ ] Database transactions used appropriately
- [ ] Optimistic locking for concurrent updates (if needed)
- [ ] Queue concurrency limits set appropriately

---

## Gate 6: Compliance

### TCPA/DNC
- [ ] Opt-out requests honored immediately
- [ ] Suppression list checked before sending
- [ ] Consent tracked for outbound communication

### Audit Trail
- [ ] Sensitive operations logged (who, what, when)
- [ ] Message content versioned before send
- [ ] Data deletions logged

### Data Retention
- [ ] Retention policy documented for new data
- [ ] Cleanup mechanism exists (if needed)

---

## Gate 7: Documentation

### Code Documentation
- [ ] Complex logic has inline comments
- [ ] Public APIs have JSDoc comments
- [ ] README updated if new setup required

### Operational Documentation
- [ ] Runbook for common issues
- [ ] Configuration options documented
- [ ] Deployment steps documented

---

## Gate 8: Testing

### Unit Tests
- [ ] Happy path covered
- [ ] Error cases covered
- [ ] Edge cases covered
- [ ] Tenant isolation tested

### Integration Tests
- [ ] End-to-end flow tested
- [ ] External service mocks in place
- [ ] Database state verified

### Load Testing (for high-traffic features)
- [ ] Performance under expected load verified
- [ ] Degradation behavior under high load documented
- [ ] Resource limits identified

---

## Gate 9: Deployment

### Configuration
- [ ] All environment variables documented
- [ ] Secrets stored in secure location (not in code)
- [ ] Feature flag for gradual rollout (if high risk)

### Rollback Plan
- [ ] Database migration is reversible (or forward-only documented)
- [ ] Previous version can be deployed if needed
- [ ] Data migration has rollback strategy

### Monitoring
- [ ] Dashboards updated for new metrics
- [ ] Alerts configured
- [ ] On-call team notified of deployment

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Code Reviewer | | | |
| QA Engineer | | | |
| Security Review | | | |
| Product Owner | | | |

---

## Waiver Process

If any item cannot be completed, document:

1. **Item being waived:** Which checklist item
2. **Reason for waiver:** Why it cannot be completed
3. **Risk assessment:** What could go wrong
4. **Mitigation plan:** How risk will be addressed
5. **Timeline:** When the item will be addressed
6. **Approver:** Who approved the waiver

---

## Quick Pre-Deploy Checklist

Before clicking "Deploy":

- [ ] All tests passing
- [ ] No console.log statements in code
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Feature flag configured (if applicable)
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented
- [ ] Team notified
