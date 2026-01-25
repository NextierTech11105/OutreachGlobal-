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
