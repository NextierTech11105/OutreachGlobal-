# Infrastructure Inventory - Nextier Platform

## Executive Summary

| Category | Status | IaC Coverage |
|----------|--------|--------------|
| App Platform | PARTIAL | app-spec.yaml |
| PostgreSQL | CONSOLE ONLY | NOT MANAGED |
| Redis/Upstash | CONSOLE ONLY | NOT MANAGED |
| Spaces (S3) | CONSOLE ONLY | NOT MANAGED |
| CI/CD | MISSING | NOT MANAGED |
| Secrets | IN GIT (CRITICAL) | NOT MANAGED |

---

## A. Networking

| Resource | Current State | IaC Status | Risk |
|----------|---------------|------------|------|
| VPC | DigitalOcean default | NOT MANAGED | LOW |
| Firewall | Console-configured | NOT MANAGED | HIGH |
| Load Balancer | App Platform managed | IMPLICIT | LOW |
| SSL/TLS | Auto (Let's Encrypt) | FULLY MANAGED | LOW |
| DNS | External (Cloudflare?) | NOT MANAGED | MODERATE |

**What breaks if deleted:** Traffic routing, HTTPS termination

---

## B. Managed PostgreSQL

| Setting | Value |
|---------|-------|
| Cluster ID | `app-98cd0402-e1d4-48ef-9adf-173580806a89` |
| Engine | PostgreSQL 17 |
| Database | `defaultdb` |
| User | `doadmin` |
| Region | NYC3 |
| Node Size | Basic (1 vCPU, 1GB RAM) |
| HA Enabled | NO |
| Connection Pooling | YES (via connection string) |

**Shared By:**
- `nextier-app` (main application)
- `homeowner-advisors` (white-label)

**IaC Status:** NOT MANAGED - Console only

**What breaks if deleted:** ALL application data, user accounts, leads, campaigns

**Migration Files:**
```
apps/api/src/database/migrations/
├── 0000_wide_raider.sql (initial)
├── 0001_add_user_role.sql
├── ... (26 more)
└── 0027_tenant_rls_policies.sql (latest)

apps/front/drizzle/
└── 0000_smiling_karnak.sql
```

---

## C. Database Users / Roles

| User | Permissions | Purpose |
|------|-------------|---------|
| `doadmin` | SUPERUSER | Application access |

**Gap:** No separate read-only users, no service-specific credentials

---

## D. Object Spaces (S3-Compatible)

| Setting | Value |
|---------|-------|
| Bucket Name | `nextier` |
| Region | NYC3 |
| Endpoint | `https://nyc3.digitaloceanspaces.com` |
| CDN URL | `https://nextier.nyc3.cdn.digitaloceanspaces.com` |
| Access Key | `DO00E8EJBTYU36XW9T8L` |

**Usage:**
- Lead import CSVs
- Property data files
- Skip trace results
- Media attachments (MMS)

**IaC Status:** NOT MANAGED - Console only

**What breaks if deleted:** All uploaded files, import history, media

---

## E. App Platform Services

### nextier-app (Main Application)

**Spec File:** `app-spec.yaml`

| Component | Type | Instance | Port |
|-----------|------|----------|------|
| `frontend` | Web | apps-s-1vcpu-0.5gb | 3000 |
| `nextier` (API) | Web | apps-s-1vcpu-0.5gb | 3001 |

**Build:**
- Dockerfile.front → frontend
- Dockerfile.api → API

**Auto-deploy:** YES (on push to `main`)

### homeowner-advisors (White-Label)

**Spec File:** `homeowner-advisors-spec.yaml`

| Component | Type | Instance |
|-----------|------|----------|
| `frontend` | Web | apps-s-1vcpu-0.5gb |

**Note:** Shares database with nextier-app

---

## F. Environment Configuration

### Required Variables (from .env.example analysis)

```bash
# === DATABASE ===
DATABASE_URL=postgresql://...

# === REDIS ===
REDIS_URL=rediss://...
# OR
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=xxx

# === SIGNALHOUSE ===
SIGNALHOUSE_API_KEY=xxx
SIGNALHOUSE_AUTH_TOKEN=xxx
SIGNALHOUSE_API_URL=https://api.signalhouse.io
SIGNALHOUSE_WEBHOOK_TOKEN=xxx  # MISSING FROM .env.example

# === TWILIO ===
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
TWILIO_TWIML_APP_SID=xxx

# === AI SERVICES ===
ANTHROPIC_API_KEY=xxx
GOOGLE_API_KEY=xxx
APOLLO_IO_API_KEY=xxx

# === STORAGE ===
DO_SPACES_KEY=xxx
DO_SPACES_SECRET=xxx
DO_SPACES_BUCKET=nextier
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com

# === APP CONFIG ===
NEXT_PUBLIC_APP_URL=https://...
NEXT_PUBLIC_API_URL=https://...
JWT_SECRET=xxx
ADMIN_API_KEY=xxx

# === WEBHOOKS (CRITICAL - UNDOCUMENTED) ===
GIANNA_WEBHOOK_TOKEN=xxx  # MISSING
```

### Current Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Secrets in .env.local | CRITICAL | `.env.local` in git |
| Missing webhook tokens | HIGH | Not in .env.example |
| Redundant variable names | MEDIUM | SPACES_* vs DO_SPACES_* |
| Build-time config | MEDIUM | NEXT_PUBLIC_* hardcoded |

---

## G. Secrets Management

**Current State:** NONE

Secrets are stored in:
1. `.env.local` (committed to git - CRITICAL)
2. DigitalOcean App Platform env vars (console)
3. Hardcoded in `app-spec.yaml`

**Recommendation:**
- DigitalOcean Secrets Manager
- Environment-specific secrets
- Rotation policy (90 days)

---

## H. Webhook Ingress

| Endpoint | Provider | Auth Method |
|----------|----------|-------------|
| `/api/webhook/signalhouse` | SignalHouse | Query token |
| `/api/webhook/twilio` | Twilio | Query token |
| `/api/gianna/sms-webhook` | Internal | Query token |

**Security Issues:**
1. Token in query string (visible in logs)
2. No request signature verification
3. No rate limiting at ingress
4. No WAF protection

---

## I. Observability

| Component | Status |
|-----------|--------|
| Application Logs | DigitalOcean built-in |
| Metrics Endpoint | `/metrics` (Prometheus) |
| Error Tracking | NONE (no Sentry) |
| APM | NONE |
| Alerts | Database CPU/Memory only |

**Gaps:**
- No distributed tracing
- No custom dashboards
- No SLO monitoring
- No anomaly detection

---

## J. Backups & Retention

| Resource | Backup Status | Retention | RTO | RPO |
|----------|---------------|-----------|-----|-----|
| PostgreSQL | DigitalOcean auto | 7 days | Unknown | Unknown |
| Spaces | NONE | N/A | N/A | N/A |
| Redis | NONE | N/A | N/A | N/A |

**Gaps:**
- No documented DR procedure
- No cross-region backup
- No tested restore process

---

## K. CI/CD Hooks

**Current State:** NONE

| Expected | Actual |
|----------|--------|
| `.github/workflows/ci.yml` | MISSING |
| `.github/workflows/deploy.yml` | MISSING |
| Pre-commit hooks | MISSING |
| Automated tests | MISSING |

**Deployment Method:**
- Git push to `main` → Auto-deploy (App Platform)
- Manual PowerShell scripts for env updates

---

## IaC Alignment Matrix

| Infra Domain | Current State | IaC Status | Drift Risk | Notes |
|--------------|---------------|------------|------------|-------|
| App Platform Services | app-spec.yaml | PARTIALLY MANAGED | MODERATE | Secrets in YAML |
| PostgreSQL Database | Console | NOT MANAGED | CRITICAL | Single node, no HA |
| Redis/Upstash | Console | NOT MANAGED | HIGH | External SaaS |
| Spaces Bucket | Console | NOT MANAGED | HIGH | No lifecycle policy |
| Environment Variables | .env.local | NOT MANAGED | CRITICAL | Secrets in git |
| Firewall Rules | Console | NOT MANAGED | HIGH | Unknown config |
| DNS Records | External | NOT MANAGED | MODERATE | Provider unknown |
| SSL Certificates | App Platform | FULLY MANAGED | LOW | Auto-renewed |
| Monitoring/Alerts | Console | NOT MANAGED | MODERATE | Minimal config |
| Backups | Auto (DB only) | NOT MANAGED | HIGH | No tested restore |

---

## Drift & Scale Failure Analysis

### What Would Fail If...

| Scenario | Impact | Components Affected |
|----------|--------|---------------------|
| New developer setup | BLOCKED | No .env.example complete, secrets not documented |
| Second environment needed | BLOCKED | No IaC, manual console work |
| Tenant count 10× | DEGRADED | Single DB node, no read replicas |
| Region change | BLOCKED | Hardcoded NYC3, no multi-region |
| Disaster recovery | UNKNOWN | No tested procedures |

### Risk Summary

| Finding | Severity |
|---------|----------|
| No Terraform/IaC | CRITICAL |
| Secrets in git history | CRITICAL |
| Single-node database | CRITICAL |
| No CI/CD pipeline | CRITICAL |
| No staging environment | HIGH |
| Manual deployment | HIGH |
| Missing webhook tokens | HIGH |
| No error tracking | MODERATE |
| No DR testing | HIGH |

---

## Recommended IaC Structure

```
/infra
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── app-platform/
│   │   ├── postgres/
│   │   ├── spaces/
│   │   └── redis/
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── prod/
└── .github/
    └── workflows/
        ├── ci.yml
        ├── deploy-staging.yml
        └── deploy-prod.yml
```

---

## Immediate Actions Required

### Priority 1 - Security (Week 1)
1. Remove .env.local from git history (BFG Repo Cleaner)
2. Create complete .env.example
3. Move all secrets to DigitalOcean Secrets Manager
4. Generate and configure missing webhook tokens

### Priority 2 - Reliability (Week 2-3)
1. Enable HA for PostgreSQL
2. Create automated backup verification
3. Document DR procedures
4. Add error tracking (Sentry)

### Priority 3 - Operations (Month 1)
1. Create Terraform configuration (shadow mode)
2. Implement GitHub Actions CI/CD
3. Create staging environment
4. Add pre-deployment testing

---

## IaC Readiness Score

**Current Score: 15/100**

| Category | Max Points | Current |
|----------|------------|---------|
| Version-controlled infrastructure | 25 | 5 |
| Secrets management | 20 | 0 |
| CI/CD automation | 20 | 5 |
| Disaster recovery | 15 | 0 |
| Monitoring/observability | 10 | 3 |
| Documentation | 10 | 2 |
