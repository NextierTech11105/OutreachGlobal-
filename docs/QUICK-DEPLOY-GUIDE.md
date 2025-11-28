# Quick Deployment Guide

## TL;DR - Platform Roles

| What | Where | Why |
|------|-------|-----|
| **Frontend** | Vercel | Fast global CDN, SSR optimized for Next.js |
| **API** | DigitalOcean App Platform | Container hosting, direct DB/Redis access |
| **Database** | DigitalOcean Managed PostgreSQL | Private network to API, automatic backups |
| **Queue** | DigitalOcean Managed Redis | BullMQ job processing, low latency to API |

---

## Quick Commands

### Deploy Frontend (Vercel)

```bash
# Production deploy
npx vercel --prod

# With token (CI/CD)
VERCEL_TOKEN=vck_xxx npx vercel --prod
```

### Deploy API (DigitalOcean)

```powershell
# PowerShell - Trigger deployment
$headers = @{
    "Authorization" = "Bearer dop_v1_xxx"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://api.digitalocean.com/v2/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/deployments" `
    -Method Post -Headers $headers -Body '{"force_build": true}'
```

```bash
# Bash/Linux
curl -X POST \
  "https://api.digitalocean.com/v2/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/deployments" \
  -H "Authorization: Bearer dop_v1_xxx" \
  -H "Content-Type: application/json" \
  -d '{"force_build": true}'
```

### Database Migrations

```bash
# Push schema changes to production
DATABASE_URL="postgresql://doadmin:xxx@xxx.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require" pnpm db:push
```

---

## Environment Variables Quick Reference

### Vercel (Frontend)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.outreach.app` |
| `NEXT_PUBLIC_APP_NAME` | `OutreachGlobal` |

### DigitalOcean (API)

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://...` |
| `REDIS_URL` | `rediss://...` |
| `APP_SECRET` | `super-secret-key` |
| `FRONTEND_URL` | `https://app.outreach.com` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

---

## MCP Servers (Claude Code Integration)

Your `.mcp.json` enables direct access to:

1. **PostgreSQL** - Query/inspect production database
2. **DigitalOcean API** - Manage deployments, check status

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "<connection-string>"]
    },
    "digitalocean": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {
        "DIGITALOCEAN_API_TOKEN": "dop_v1_xxx"
      }
    }
  }
}
```

---

## Workflow

```
1. Develop locally (pnpm dev)
2. Push to GitHub
3. Vercel auto-deploys frontend
4. Manually trigger DO deployment (or set up auto-deploy)
5. Run migrations if schema changed
```
