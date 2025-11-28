# Outreach Global Documentation

## Table of Contents

### Deployment & Infrastructure
- [Deployment Architecture](./DEPLOYMENT-ARCHITECTURE.md) - Complete guide to DigitalOcean + Vercel setup
- [Quick Deploy Guide](./QUICK-DEPLOY-GUIDE.md) - Fast reference for deployments

---

## Platform Summary

### Why Two Platforms?

**Vercel (Frontend)**
- Optimized for Next.js/React
- Global Edge Network (faster for users worldwide)
- Automatic preview deployments for PRs
- Serverless functions at the edge
- Zero-config deployment

**DigitalOcean (Backend)**
- Better for long-running Node.js processes
- Direct private network access to managed databases
- Container-based (full control via Dockerfile)
- Cost-effective for 24/7 API servers
- BullMQ/Redis worker support

### Architecture at a Glance

```
┌──────────────┐      GraphQL       ┌──────────────┐
│   VERCEL     │ ◄─────────────────►│ DIGITALOCEAN │
│  (Frontend)  │                    │    (API)     │
│   Next.js    │                    │   NestJS     │
└──────────────┘                    └──────┬───────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                         ┌────▼────┐            ┌────▼────┐
                         │ Postgres│            │  Redis  │
                         │  (DO)   │            │  (DO)   │
                         └─────────┘            └─────────┘
```

---

## Quick Links

| Resource | URL |
|----------|-----|
| Vercel Dashboard | https://vercel.com/team_izU0ik3G5iBVWWEae5oe9mbv |
| DO App Platform | https://cloud.digitalocean.com/apps |
| DO Database | https://cloud.digitalocean.com/databases |

---

## Contact

For deployment issues, check the troubleshooting section in the [Deployment Architecture](./DEPLOYMENT-ARCHITECTURE.md#10-troubleshooting) doc.
