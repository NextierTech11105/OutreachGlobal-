# Digital Ocean Deployment Audit Report

**Date:** 2026-01-25
**App URL:** https://monkfish-app-mb7h3.ondigitalocean.app

---

## CRITICAL ISSUES

### 1. NEXT_PUBLIC_API_URL Has Wrong Value

**Status:** BROKEN - Causes all GraphQL requests to fail

**Current Value (WRONG):**
```
NEXT_PUBLIC_API_URL=https://monkfish-app-mb7h3.ondigitalocean.app/api
```

**Correct Value:**
```
NEXT_PUBLIC_API_URL=https://monkfish-app-mb7h3.ondigitalocean.app
```

**Impact:**
- Apollo client builds GraphQL URL as `/api/graphql`
- Ingress only routes `/graphql` to API server
- All GraphQL calls hit frontend (catch-all `/`) instead of API
- Result: "Authentication required" error, 0 leads shown

**Fix:**
1. Go to DO App Platform Console
2. Navigate to: Settings → Environment Variables → frontend
3. Edit `NEXT_PUBLIC_API_URL`
4. Remove the `/api` suffix
5. Save and Redeploy

---

## ARCHITECTURE VERIFICATION

### Services
| Service | Port | Build Command | Run Command |
|---------|------|---------------|-------------|
| api | 3001 | `pnpm install && pnpm nx build api` | `node apps/api/dist/main.js` |
| frontend | 3000 | `pnpm install && pnpm nx build front` | `pnpm nx start front` |

### Ingress Rules
| Path | Routes To | Preserves Prefix |
|------|-----------|------------------|
| `/graphql` | api | Yes |
| `/` | frontend | No (catch-all) |

**Verification:** Ingress rules are correct. `/graphql` goes to API, everything else to frontend.

---

## DATABASE

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 17 |
| Cluster | app-98cd0402-e1d4-48ef-9adf-173580806a89 |
| Database | defaultdb |
| User | doadmin |
| Pool | nextier-pool |

**Database URL Pattern:**
- API uses direct URL at RUN_TIME
- Frontend uses pooled connection `${app-98cd0402-e1d4-48ef-9adf-1735.nextier-pool.DATABASE_URL}`

**Verification:** Database configuration is correct.

---

## AUTHENTICATION

| Variable | Service | Value |
|----------|---------|-------|
| JWT_SECRET | api | nextier-super-secret-jwt-key-2024 |
| APP_SECRET | api | nextier-super-secret-jwt-key-2024 |

**Verification:** JWT secrets match. API uses `APP_SECRET` for token signing/verification.

---

## REDIS / CACHE

| Variable | Value |
|----------|-------|
| REDIS_URL | rediss://default:...@improved-donkey-20354.upstash.io:6379 |
| UPSTASH_REDIS_REST_URL | https://improved-donkey-20354.upstash.io |

**Verification:** Both API and Frontend have Redis configured correctly.

---

## EXTERNAL SERVICES

### SignalHouse SMS
- `SIGNALHOUSE_API_KEY`: Configured (encrypted)
- `SIGNALHOUSE_AUTH_TOKEN`: Configured (encrypted)

### Twilio
- `TWILIO_ACCOUNT_SID`: Configured (encrypted)
- `TWILIO_AUTH_TOKEN`: Configured (encrypted)
- `TWILIO_PHONE_NUMBER`: +16312123195

### AI Services
- `OPENAI_API_KEY`: Configured (encrypted)
- `ANTHROPIC_API_KEY`: Configured (encrypted)
- `APOLLO_API_KEY`: Configured (encrypted)

### Stripe
- `STRIPE_SECRET_KEY`: Configured (encrypted)
- `STRIPE_PUBLIC_KEY`: pk_test_gFAlkXvlTMRVZJ7qGftJEvd7
- `STRIPE_WEBHOOK_SECRET`: Configured (encrypted)

### DO Spaces (Object Storage)
- `DO_SPACES_KEY`: DO00E8EJBTYU36XW9T8L
- `DO_SPACES_SECRET`: Configured (encrypted)

### Mapbox
- `MAPBOX_ACCESS_TOKEN`: Configured

**Verification:** All external service credentials are present.

---

## FIXES APPLIED IN CODE

### 1. Cookie Name Mismatch (FIXED)
**File:** `apps/front/src/lib/apollo-client.ts`
**Issue:** Was reading `session` cookie, but login stores in `nextier_session`
**Fix:** Now uses `$cookie.get("session")` which correctly reads `nextier_session`

### 2. GraphQL Query Schema Mismatch (FIXED)
**File:** `apps/front/src/app/t/[team]/data-browser/page.tsx`
**Issue:** Used wrong parameters (`limit`, `offset`, `search`)
**Fix:** Now uses correct API schema (`first`, `after`, `searchQuery`, `edges.node`)

---

## REQUIRED MANUAL ACTION

### In Digital Ocean Console:

1. **Change NEXT_PUBLIC_API_URL**
   - Go to: Apps → nextier-app → Settings → Components → frontend → Environment Variables
   - Find: `NEXT_PUBLIC_API_URL`
   - Change from: `https://monkfish-app-mb7h3.ondigitalocean.app/api`
   - Change to: `https://monkfish-app-mb7h3.ondigitalocean.app`
   - Click Save

2. **Redeploy**
   - After saving, trigger a new deployment
   - Or push any commit to trigger auto-deploy

---

---

## DO FUNCTIONS (SERVERLESS)

**Namespace:** sea-turtle-fn-namespace
**Region:** NYC1
**ID:** fn-44110ae1-dbf0-4680-b90b-3d9e342bd433

### Deployed Functions

| Function | Runtime | Timeout | Memory | Status |
|----------|---------|---------|--------|--------|
| enrichment/batch-enrich | nodejs:18 | 5min | 512 MB | DEPLOYED |
| neva/context | nodejs:18 | 30sec | 256 MB | DEPLOYED |
| data/csv-processor | nodejs:18 | 5min | 1024 MB | DEPLOYED |
| neva/enrich | nodejs:18 | 1min | 256 MB | DEPLOYED |
| enrichment/enrich-lead | nodejs:18 | 30sec | 256 MB | DEPLOYED |
| data/export-csv | nodejs:18 | 2min | 512 MB | DEPLOYED |
| ai/generate-sms | nodejs:18 | 1min | 256 MB | DEPLOYED |
| neva/monthly-refresh | nodejs:18 | 1min | 256 MB | DEPLOYED |
| neva/research | nodejs:18 | 2min | 512 MB | DEPLOYED |
| webhooks/sms-inbound | nodejs:18 | 10sec | 256 MB | DEPLOYED |
| webhooks/voice-inbound | nodejs:18 | 10sec | 256 MB | DEPLOYED |

### Issue #5: Functions Not Being Invoked

**Activation Count:** 0
**Average Duration:** 0ms

**Status:** UNUSED - Functions are deployed but never called

**Possible Causes:**
1. App is not configured to use DO Functions
2. Function URLs not wired to app
3. Triggers not configured

**Questions to Verify:**
- Are these functions supposed to be called by the app?
- Is there a trigger configuration needed?
- Should webhooks/sms-inbound be handling SignalHouse callbacks?

---

## DO SPACES OBJECT STORAGE ISSUES

### Issue #2: Access Key Mismatch

| Source | Access Key ID |
|--------|---------------|
| DO Spaces Console (new) | `DO801TC67EC63QGUFCFW` |
| App Environment Variable | `DO00E8EJBTYU36XW9T8L` |

**Status:** POTENTIALLY BROKEN - App may be using old/revoked key

**Fix:**
1. Verify which key is valid in DO Spaces → Access Keys
2. If `DO00E8EJBTYU36XW9T8L` is revoked, update `DO_SPACES_KEY` in app env to `DO801TC67EC63QGUFCFW`
3. Also update `DO_SPACES_SECRET` with the corresponding secret

### Issue #3: Missing DO_SPACES_BUCKET

**Code expects:** `DO_SPACES_BUCKET` (defaults to `nextier-data` if missing)
**Actual bucket:** `nextier`

**Fix:** Add to BOTH api and frontend environment variables:
```
DO_SPACES_BUCKET=nextier
```

### Issue #4: Missing DO_SPACES_ENDPOINT and DO_SPACES_REGION

**Required variables (from code analysis):**
```
DO_SPACES_KEY=DO801TC67EC63QGUFCFW        # Use current key from console
DO_SPACES_SECRET=<secret for that key>
DO_SPACES_BUCKET=nextier
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

### Spaces Configuration Summary

| Setting | Value |
|---------|-------|
| Bucket | nextier |
| Region | nyc3 |
| Origin Endpoint | https://nextier.nyc3.digitaloceanspaces.com |
| CDN Enabled | Yes |
| CDN URL | https://nextier.nyc3.cdn.digitaloceanspaces.com |
| File Listing | Restricted |
| Items | 54 items, 10.1 MiB |

---

## INFRASTRUCTURE GAPS (from docs/INFRASTRUCTURE_INVENTORY.md)

### Critical Issues Found

| Issue | Severity | Status |
|-------|----------|--------|
| Secrets in .env.local in git | CRITICAL | EXPOSED |
| No CI/CD pipeline | CRITICAL | MISSING |
| Single-node database (no HA) | CRITICAL | RISK |
| No staging environment | HIGH | MISSING |
| No error tracking (Sentry) | MODERATE | MISSING |
| No DR tested procedures | HIGH | MISSING |

### Missing Environment Variables

| Variable | Required By | Status |
|----------|-------------|--------|
| `DO_SPACES_BUCKET` | Luci, Block Manager | MISSING |
| `DO_SPACES_REGION` | S3 Client | MISSING |
| `DO_SPACES_ENDPOINT` | S3 Client | MISSING |
| `SIGNALHOUSE_WEBHOOK_TOKEN` | Webhook verification | MISSING |
| `GIANNA_WEBHOOK_TOKEN` | Webhook verification | MISSING |

---

## DATABASE PERFORMANCE (from Query Statistics)

### Most Called Queries

| Query | Calls | Mean (ms) | Max (ms) |
|-------|-------|-----------|----------|
| Campaign status checks | 21,324 | 0.09 | 19.7 |
| Lead timer checks | 21,324 | 0.10 | 17.1 |
| Campaign lead sequence | 21,324 | 0.06 | 15.1 |
| Team lookup by slug | 15,557 | 0.03 | 1.8 |
| Schema introspection | 6,194 | 2.02 | 22.0 |

### Slow Queries (>100ms mean)

| Query | Mean (ms) | Max (ms) | Issue |
|-------|-----------|----------|-------|
| Table constraints lookup | 90.68 | 548.58 | Schema introspection |

### Current Status
- **Active Connections:** 0 (no queries running at snapshot time)
- **Total Query Calls:** ~100K+
- **Database Health:** OPERATIONAL

### Observations
1. Polling queries running every few seconds (campaign status, lead timers)
2. Bulk lead inserts with 180 records / 3000+ parameters per query
3. Schema introspection queries could be cached

---

### IaC Readiness Score: 15/100

| Category | Max | Current |
|----------|-----|---------|
| Version-controlled infra | 25 | 5 |
| Secrets management | 20 | 0 |
| CI/CD automation | 20 | 5 |
| Disaster recovery | 15 | 0 |
| Monitoring | 10 | 3 |
| Documentation | 10 | 2 |

---

## COMPLETE FIX CHECKLIST FOR DO CONSOLE

### Environment Variables to ADD/FIX (in both api and frontend):

```bash
# FIX (remove /api suffix)
NEXT_PUBLIC_API_URL=https://monkfish-app-mb7h3.ondigitalocean.app

# ADD
DO_SPACES_BUCKET=nextier
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com

# VERIFY (update if key changed)
DO_SPACES_KEY=<check current active key in Spaces console>
DO_SPACES_SECRET=<secret for that key>
```

---

## VERIFICATION STEPS AFTER FIX

1. **Login Test:**
   - Go to https://monkfish-app-mb7h3.ondigitalocean.app/auth/login
   - Login with Google OAuth
   - Should redirect to dashboard

2. **Data Browser Test:**
   - Navigate to Data Browser from sidebar
   - Should show 104,000+ leads
   - Pagination should work

3. **Leads Page Test:**
   - Go to Leads page
   - Should display leads with proper data

4. **Check Browser DevTools:**
   - Open Network tab
   - GraphQL requests should go to `/graphql` (not `/api/graphql`)
   - Should return 200 OK with data

5. **Spaces Test:**
   - Try to import a CSV file
   - Should upload to DO Spaces successfully
