# Outreach Global Monorepo (Plain English)

This is the same story as `MONOREPO_OVERVIEW.md`, but written for someone who wants the big picture without code noise. Think of it as the “everyone can understand it” version.

## 1. Why everything lives together

- We keep the web app and the backend in one repository so they share the same building blocks (like blueprints and helpers). That means fewer mistakes when a change needs to touch both sides.
- Nx is the tool that keeps everything running smoothly; it lets us build both apps at once or separately with simple commands.
- When a new feature (like property search) needs both front-end screens and back-end APIs, the monorepo makes it easy to work on them together.

## 2. What lives where

| Folder | What’s inside | Why it matters |
|-------|---------------|----------------|
| `apps/front` | The React/Next.js web experience | Users interact here; dashboards, search forms, and admin panels live here. |
| `apps/api` | The NestJS backend services | Handles RealEstateAPI calls, saved searches, and database work. |
| `packages/common` and `packages/dto` | Shared helpers & type definitions | Utilities, formats, and contracts that both apps use so they stay aligned. |
| `docs/` | Guides & architecture notes | Reference material like this doc plus deployment guides. |

## 3. How the parts talk

1. The frontend shows filters and buttons; when you search, it calls the backend’s API (`/api/property-search`).
2. The backend forwards the request to RealEstateAPI, returns the data, and can save search definitions or buckets.
3. Shared packages are like the “glue” that keeps the dictionary (types) and toolbox (helpers) consistent across both apps.

## 4. External Services We Use

| Service | What it does |
|---------|-------------|
| **SignalHouse.io** | SMS backend - sending, receiving, queuing text messages |
| **Twilio** | Voice calls and power dialer |
| **SendGrid** | Email delivery |
| **OpenAI / Anthropic / Google** | AI/LLM for content generation |
| **RealEstateAPI v2** | Property data, valuation, ownership info |
| **Apollo.io** | B2B lead enrichment |
| **Mapbox / Google Maps** | Maps and address autocomplete |
| **DigitalOcean** | Hosting everything (App Platform, Spaces, CDN) |
| **Neon** | PostgreSQL database |
| **Upstash** | Redis for caching and job queues |

## 5. Bonus: commands you can run

- `npm run dev` – starts the full experience (frontend + backend).
- `npm run dev:front` or `npm run dev:api` – start each part separately if you only care about one.
- `npx nx build front` or `npx nx build api` – build either app through Nx, which understands their dependencies.

## 6. Why it's easy to understand

- Shared libraries prevent duplication.
- Nx gives predictable commands.
- Everything lives in one place so switching from frontend to backend doesn’t mean opening a new repo.

If you’d like this as a diagram, I can also render the mermaid graphic from `MONOREPO_OVERVIEW.md` in a prettier format. Let me know! 
