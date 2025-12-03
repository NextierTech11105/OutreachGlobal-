# Why Is Everything Structured This Way?

## The Simple Answer

You have **ONE app** deployed to **DigitalOcean** with **TWO parts**:

```
DigitalOcean App (monkfish-app-mb7h3.ondigitalocean.app)
├── Backend (NestJS) - handles /api/* and /graphql
└── Frontend (Next.js) - handles everything else (/, /dashboard, etc.)
```

## Why Property Search Goes Through the Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR DIGITALOCEAN APP                        │
│                                                                  │
│  ┌──────────────┐         ┌──────────────────────────────────┐ │
│  │   FRONTEND   │         │           BACKEND                │ │
│  │   (Next.js)  │ ──────► │          (NestJS)                │ │
│  │              │         │                                  │ │
│  │  - Shows UI  │         │  - Has API keys (secure)         │ │
│  │  - Maps      │         │  - Calls RealEstateAPI           │ │
│  │  - Forms     │         │  - Calls Twilio                  │ │
│  │              │         │  - Stores data in PostgreSQL     │ │
│  └──────────────┘         └──────────────────────────────────┘ │
│                                       │                         │
└───────────────────────────────────────┼─────────────────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │   EXTERNAL SERVICES     │
                          │                         │
                          │  • RealEstateAPI        │
                          │  • Twilio/SignalHouse   │
                          │  • Apollo.io            │
                          │  • PostgreSQL           │
                          └─────────────────────────┘
```

## Why Not Call RealEstateAPI Directly From Frontend?

**SECURITY.** If you put the API key in the frontend:
- Anyone can open browser DevTools
- See your API key
- Use your API key
- You get charged $$$$

**So we do this instead:**
1. Frontend sends request to YOUR backend
2. Backend has the API key (hidden/secure)
3. Backend calls RealEstateAPI
4. Backend sends results to frontend

## The URL Routing (Ingress)

```
https://monkfish-app-mb7h3.ondigitalocean.app/
│
├── /graphql        → NestJS (Backend) - GraphQL API
├── /rest           → NestJS (Backend) - REST endpoints
│
└── /* (everything else) → Next.js (Frontend)
    ├── /                       → Homepage
    ├── /admin                  → Admin dashboard
    ├── /t/[team]               → Team routes
    ├── /api/*                  → Next.js API routes
    │   ├── /api/signalhouse    → SMS integration
    │   ├── /api/twilio/test    → Twilio status
    │   ├── /api/apollo/test    → Apollo.io status
    │   └── /api/enrichment/*   → Data enrichment
    └── ...
```

## Deployment

**Everything runs on DigitalOcean App Platform:**

```
┌─────────────────────────────────────────────┐
│           DIGITALOCEAN APP PLATFORM         │
│                                             │
│  ┌─────────────────┐ ┌───────────────────┐  │
│  │    Frontend     │ │     Backend       │  │
│  │    (Next.js)    │ │     (NestJS)      │  │
│  │    Port 3000    │ │     Port 3001     │  │
│  └─────────────────┘ └───────────────────┘  │
│                                             │
│  Live URL: monkfish-app-mb7h3.              │
│            ondigitalocean.app               │
│                                             │
│  Database: DigitalOcean Managed PostgreSQL  │
│  Redis: DigitalOcean Managed Redis          │
└─────────────────────────────────────────────┘
```

## Summary

| Question | Answer |
|----------|--------|
| Where is property search? | Next.js API routes on DigitalOcean |
| Why not expose API keys? | API keys are in env vars (secure) |
| What calls RealEstateAPI? | Next.js API routes + NestJS services |
| Where do users see results? | Frontend (Next.js) Property Terminal |
| Where is everything deployed? | DigitalOcean App Platform |

## The Flow

```
User clicks "Search"
    │
    ▼
Frontend sends POST to /api/property/search
    │
    ▼
DigitalOcean routes /api/* to NestJS backend
    │
    ▼
NestJS PropertyController receives request
    │
    ▼
RealEstateService calls RealEstateAPI with secret key
    │
    ▼
Results come back
    │
    ▼
Frontend displays on map
```

That's it. Sleep well!
