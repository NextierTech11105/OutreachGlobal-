# INFRASTRUCTURE PRODUCTION CHECKLIST
## Nextier Platform - Ready to Monetize Audit
**Date:** 2026-01-06

---

## DEPLOYMENT ARCHITECTURE

| Component | Platform | Status |
|-----------|----------|--------|
| **Frontend** | DO App Platform | `basic-xs` single instance |
| **API** | DO App Platform | Separate deployment needed |
| **Database** | DO Managed Postgres 15 | `db-s-1vcpu-1gb` |
| **Redis** | DO Managed Redis | Via `REDIS_URL` |
| **Storage** | DO Spaces (NYC3) | Bucket: `nextier` |

**No Dockerfiles** - Using native buildpacks (simpler but less control)

---

## STORAGE SECURITY

### Bucket: `nextier` (nyc3)

| File Type | ACL Setting | Risk Level |
|-----------|-------------|------------|
| General uploads | `private` | LOW |
| Inbox attachments | `private` + signed URLs | LOW |
| CSV exports | `public-read` | **MEDIUM** |
| Datalake files | `private` | LOW |

### FINDING: CSV Exports Are Public

```typescript
// spaces.ts:89
return uploadFile(key, csvContent, "text/csv", true); // isPublic = TRUE
```

**Risk:** Exported lead data is publicly accessible via CDN URL.

**Fix:** Change to `false` and use signed URLs for downloads.

---

## REDIS STRATEGY

| Usage | Implementation | Status |
|-------|----------------|--------|
| **Cache** | `CacheService` with ioredis | Tenant-prefixed keys |
| **Queues** | BullMQ with 8 consumers | Tenant-validated jobs |
| **Session** | Not using Redis sessions | N/A |

### Active Queue Consumers

1. `campaign-sequence` - SMS/Email/Voice dispatch
2. `campaign` - Lead syncing
3. `content-nurture` - Drip sequences
4. `auto-trigger` - Event-based automation
5. `lead` - Lead processing
6. `integration-task` - CRM sync
7. `skiptrace` - Enrichment
8. `b2b-ingestion` - Apollo data

**All queues have tenant isolation** via `validateTenantJob()` - GOOD

---

## CRITICAL PRODUCTION GAPS

| Gap | Severity | Fix Time |
|-----|----------|----------|
| CSV exports public | MEDIUM | 5 min |
| No API healthcheck in app spec | LOW | 10 min |
| Single instance (no HA) | LOW | Config change |
| No Redis connection pooling | LOW | Future |

---

## BEFORE CHARGING CUSTOMERS

### Must Have (Day 0)
- [ ] Run database migration: `npm run db:migrate`
- [ ] Set all env vars in DO App Platform
- [ ] Verify `SIGNALHOUSE_API_KEY` is set
- [ ] Test SMS send from campaign

### Should Have (Week 1)
- [ ] Fix CSV export to private + signed URLs
- [ ] Add healthcheck endpoint to API
- [ ] Enable DO Spaces CDN caching
- [ ] Set up monitoring alerts

### Nice to Have (Month 1)
- [ ] Scale to 2+ instances
- [ ] Add Redis connection pooling
- [ ] Enable database connection pooling
- [ ] Set up log aggregation

---

## ENV VARS REQUIRED FOR PRODUCTION

```bash
# CRITICAL - App won't work without these
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
JWT_SECRET=...
SIGNALHOUSE_API_KEY=...

# IMPORTANT - Features degraded without these
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=...
DO_SPACES_KEY=...
DO_SPACES_SECRET=...

# OPTIONAL - Nice to have
OPENAI_API_KEY=...
APOLLO_API_KEY=...
```

---

## VERDICT: READY TO MONETIZE

Infrastructure is **production-capable** with minor fixes needed:

1. **Security:** Fix CSV export ACL (5 min)
2. **Compliance:** Day 1-2 code fixes already done
3. **Scaling:** Single instance is fine for first 100 customers

**Deploy and start charging.**

---

*Infrastructure Audit Complete*
