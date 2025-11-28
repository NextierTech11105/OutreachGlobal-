# Outreach Global - Deployment Architecture

## Overview

Outreach Global uses a **split deployment architecture** with two cloud providers:

| Component | Provider | Purpose |
|-----------|----------|---------|
| Frontend (Next.js) | **Vercel** | Static site generation, Edge functions, CDN |
| Backend API (NestJS) | **DigitalOcean App Platform** | GraphQL API, Background jobs |
| Database (PostgreSQL) | **DigitalOcean Managed Database** | Primary data store |
| Job Queue (Redis) | **DigitalOcean Managed Redis** | BullMQ async job processing |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USERS                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Application                         │  │
│  │  • Server-Side Rendering (SSR)                                │  │
│  │  • Static Site Generation (SSG)                               │  │
│  │  • Apollo Client (GraphQL)                                    │  │
│  │  • React 19 + Tailwind CSS                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  Project: prj_V8yylnwxdVHhUHaUCwPGM1dII5bJ                          │
│  Org: team_izU0ik3G5iBVWWEae5oe9mbv                                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          GraphQL API
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  DIGITALOCEAN APP PLATFORM (Backend)                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    NestJS API Service                          │  │
│  │  • GraphQL Endpoint (Apollo Server)                           │  │
│  │  • REST Webhooks (Twilio, SendGrid)                          │  │
│  │  • Background Job Consumers (BullMQ)                         │  │
│  │  • AI SDK Integration (Anthropic Claude)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  App ID: c61ce74c-eb13-4eaa-b856-f632849111c9                       │
│  Dockerfile: Dockerfile.api                                         │
│  Port: 3001                                                         │
└─────────────────────────────────────────────────────────────────────┘
           │                                        │
           │                                        │
           ▼                                        ▼
┌──────────────────────────┐         ┌──────────────────────────────┐
│  DO MANAGED DATABASE     │         │  DO MANAGED REDIS            │
│  (PostgreSQL 15)         │         │  (Job Queue)                 │
│  ────────────────────    │         │  ────────────────────        │
│  Host: do-user-*         │         │  BullMQ Workers:             │
│  .g.db.ondigitalocean    │         │  • lead queue                │
│  .com:25060              │         │  • campaign queue            │
│  Database: defaultdb     │         │  • campaign-sequence queue   │
│  SSL: Required           │         │                              │
└──────────────────────────┘         └──────────────────────────────┘
```

---

## 1. Vercel (Frontend Hosting)

### Purpose
Vercel hosts the **Next.js frontend application** (`apps/front/`), providing:
- Global CDN for static assets
- Serverless functions for API routes
- Automatic HTTPS
- Preview deployments for PRs
- Edge caching

### Configuration

**Project Details:**
- Project ID: `prj_V8yylnwxdVHhUHaUCwPGM1dII5bJ`
- Organization: `team_izU0ik3G5iBVWWEae5oe9mbv`
- Project Name: `outreach-global`

**Environment Variables (Required):**
```env
NEXT_PUBLIC_API_URL=https://your-api.ondigitalocean.app
NEXT_PUBLIC_APP_NAME=OutreachGlobal
```

### Deployment Commands

```bash
# Link to existing project
npx vercel link

# Deploy to preview
npx vercel

# Deploy to production
npx vercel --prod

# With token (CI/CD)
VERCEL_TOKEN=vck_xxx npx vercel --prod
```

### Build Configuration
- Framework: Next.js
- Build Command: `pnpm --filter front build`
- Output Directory: `apps/front/.next`
- Install Command: `pnpm install`

---

## 2. DigitalOcean App Platform (Backend Hosting)

### Purpose
DigitalOcean App Platform hosts the **NestJS API** (`apps/api/`), providing:
- Container-based deployment via Dockerfile
- Auto-scaling
- Health checks
- Managed TLS certificates
- Direct VPC access to managed databases

### Configuration

**App Details:**
- App ID: `c61ce74c-eb13-4eaa-b856-f632849111c9`
- Region: NYC (default)
- Dockerfile: `Dockerfile.api`
- Exposed Port: `3001`

**Environment Variables (Required):**
```env
APP_ENV=production
PORT=3001
TZ=UTC

# URLs
APP_URL=https://your-api.ondigitalocean.app
FRONTEND_URL=https://your-app.vercel.app

# Security
APP_SECRET=<generate-secure-secret>

# Database (DO Managed)
DATABASE_URL=postgresql://doadmin:xxx@app-xxx.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# Redis (DO Managed)
REDIS_URL=rediss://default:xxx@app-xxx.g.db.ondigitalocean.com:25061

# External Services
ANTHROPIC_API_KEY=sk-ant-xxx
MAIL_PASSWORD=SG.xxx
```

### Deployment Commands

```bash
# Using DigitalOcean CLI (doctl)
doctl apps create --spec do-app-spec.yaml

# Force redeploy
doctl apps create-deployment <app-id> --force-rebuild

# Using API directly
curl -X POST \
  "https://api.digitalocean.com/v2/apps/<app-id>/deployments" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"force_build": true}'
```

---

## 3. DigitalOcean Managed Database (PostgreSQL)

### Purpose
Stores all application data using **Drizzle ORM** with PostgreSQL.

### Connection Details
```
Host: app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com
Port: 25060
Database: defaultdb
User: doadmin
SSL: Required (sslmode=require)
```

### Connection String Format
```
postgresql://doadmin:<password>@<host>:25060/defaultdb?sslmode=require
```

### Database Migrations

```bash
# Generate migrations from schema changes
pnpm db:push

# Or individually:
pnpm --filter api db:generate  # Generate migration files
pnpm --filter api db:migrate   # Apply migrations
```

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `teams` | Team/workspace entities |
| `team_members` | User-team associations |
| `leads` | Lead/contact records |
| `campaigns` | SMS/email campaigns |
| `messages` | Message history |
| `inbox_items` | Response pipeline items |
| `suppression_list` | DNC/blacklist entries |
| `user_achievements` | Gamification badges |
| `initial_messages` | Message template library |

---

## 4. DigitalOcean Managed Redis

### Purpose
Powers **BullMQ** for asynchronous job processing:
- Lead import jobs
- Campaign sequence execution
- Message sending queues
- Scheduled tasks

### Job Queues

| Queue Name | Purpose |
|------------|---------|
| `lead` | Lead import, sync operations |
| `campaign` | Campaign execution |
| `campaign-sequence` | Scheduled message sequences |

---

## 5. Data Flow

### Request Flow (User Action)

```
1. User interacts with Frontend (Vercel)
2. Frontend sends GraphQL query/mutation to API (DigitalOcean)
3. API authenticates request (JWT)
4. API queries/updates PostgreSQL (DigitalOcean Managed DB)
5. For async work, API queues job to Redis (BullMQ)
6. API returns response to Frontend
7. Frontend updates UI
```

### Background Job Flow

```
1. API queues job to Redis
2. BullMQ worker picks up job
3. Worker processes (e.g., send SMS via Twilio)
4. Worker updates PostgreSQL with results
5. Optional: Emit WebSocket event to Frontend
```

---

## 6. Environment Configuration

### Local Development

```bash
# Root .env
NX_NO_CLOUD=true

# apps/api/.env
APP_ENV=local
PORT=3001
DATABASE_URL=postgresql://localhost:5432/outreach_dev
REDIS_URL=redis://localhost:6379

# apps/front/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production

```bash
# apps/api (DigitalOcean App Platform env vars)
APP_ENV=production
DATABASE_URL=postgresql://doadmin:xxx@xxx.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
REDIS_URL=rediss://default:xxx@xxx.ondigitalocean.com:25061

# apps/front (Vercel env vars)
NEXT_PUBLIC_API_URL=https://your-api.ondigitalocean.app
```

---

## 7. Deployment Checklist

### Initial Setup

- [ ] Create DigitalOcean App Platform app with `Dockerfile.api`
- [ ] Create DigitalOcean Managed PostgreSQL database
- [ ] Create DigitalOcean Managed Redis cluster
- [ ] Link Vercel project to repository
- [ ] Configure environment variables in both platforms
- [ ] Run database migrations

### For Each Release

1. **Push to main branch**
2. **Vercel**: Auto-deploys frontend
3. **DigitalOcean**: Auto-deploys API (or trigger manually)
4. **Verify**: Check health endpoints

### Health Checks

```bash
# API health
curl https://your-api.ondigitalocean.app/health

# Frontend
curl https://your-app.vercel.app
```

---

## 8. Cost Breakdown (Estimated)

| Service | Plan | Est. Monthly Cost |
|---------|------|-------------------|
| Vercel (Frontend) | Pro | $20/user |
| DO App Platform (API) | Basic | $12-24 |
| DO Managed PostgreSQL | Basic | $15 |
| DO Managed Redis | Basic | $15 |
| **Total** | | **~$62-74/mo** |

---

## 9. Security Considerations

1. **Database**: Only accessible via private VPC from App Platform
2. **API**: All traffic over HTTPS, JWT authentication
3. **Frontend**: Served over HTTPS via Vercel CDN
4. **Secrets**: Stored in platform environment variables (not in code)
5. **CORS**: API configured to only accept requests from Vercel domain

---

## 10. Troubleshooting

### API Not Responding
```bash
# Check DO app logs
doctl apps logs <app-id> --type=run

# Check deployment status
doctl apps get <app-id>
```

### Database Connection Issues
- Verify SSL mode is set to `require`
- Check if IP is whitelisted in DO trusted sources
- Verify connection string format

### Frontend Build Failures
```bash
# Check Vercel build logs
npx vercel logs <deployment-url>

# Local build test
pnpm --filter front build
```

---

## 11. API Reference

### DigitalOcean API

```bash
# List apps
curl -H "Authorization: Bearer $DO_TOKEN" \
  https://api.digitalocean.com/v2/apps

# Get app details
curl -H "Authorization: Bearer $DO_TOKEN" \
  https://api.digitalocean.com/v2/apps/<app-id>

# Trigger deployment
curl -X POST \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.digitalocean.com/v2/apps/<app-id>/deployments \
  -d '{"force_build": true}'
```

### Vercel API

```bash
# List deployments
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v6/deployments

# Trigger deployment
npx vercel --prod --token=$VERCEL_TOKEN
```

---

## Document Info

- **Last Updated**: 2025-11-28
- **Version**: 1.0.0
- **Maintainer**: Development Team
