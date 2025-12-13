# Monorepo Architecture Overview

This document gives a **single-page, non-technical** explanation of how the Outreach Global workspace is organized, why it uses a monorepo, and how the major pieces (frontend, backend, shared packages) relate to one another. The goal is to make the structure easy to understand when you are jumping between files or designing new features.

## 1. Why the monorepo exists

- **Shared context**: Both the Next.js frontend (`apps/front`) and the NestJS backend (`apps/api`) lean on shared types, services, and constants. Keeping them together avoids version drift and duplication.
- **Consistent toolchain**: Nx orchestrates builds, linting, and testing across apps + packages so commands like `nx build front` or `nx test api` just work and reuse cached outputs.
- **Coordinated deployments**: The root `package.json` and Nx configuration allow you to run both apps together (`npm run dev`) or separately while still accessing the same `packages/*` utilities.
- **Scalability**: As new apps (mobile, CLI, worker) land, they can join the monorepo and immediately reuse `packages/common`, `packages/dto`, or whatever new shared libraries arise.

## 2. Top-level layout

```
outreachglobal/
├── apps/
│   ├── api/     # NestJS backend & Drizzle ORM data access
│   └── front/   # Next.js frontend (App Router + shadcn UI)
├── packages/
│   ├── common/  # Cross-cutting utilities (helpers, constants, formats)
│   ├── dto/     # Shared Request/response DTOs and validation helpers
│   └── tsconfig/
│       └── base tsconfigs consumed by packages & apps
├── docs/        # Playbooks, architecture narratives, guides (this is one)
├── .nx.json     # Nx runner defaults, caching, target dependency graph
├── pnpm-workspace.yaml
└── README.md
```

## 3. Core applications

- **`apps/front`** – Next.js (React) App Router front-end that hosts admin panels, property search, dashboards, and the UI blocks consumers interact with. It references shared UI components, API integrations, and services from `packages/common` and `packages/dto`.
- **`apps/api`** – NestJS backend that exposes REST/GraphQL endpoints, orchestrates RealEstateAPI calls, manages saved searches, and persists data via Drizzle ORM. It exposes public APIs that the frontend consumes (e.g., `/api/property-search`, `/api/saved-searches`).

These apps live side-by-side so Nx can understand dependencies between them and their shared libraries.

## 4. Shared packages

- **`packages/common`** provides helpers (formatters, logging, data transformations) used by both apps so the same logic powers API responses and UI display.
- **`packages/dto`** defines typed contracts (`PropertySearchQuery`, `SavedSearch`, etc.) so both backend validation and frontend forms align without copy/paste.
- **`packages/tsconfig`** hosts base TypeScript configurations (`tsconfig.base.json`) that keep compiler options uniform across apps and packages.

These packages are built once per change and consumed via local file references (`"@/lib/services"` on the frontend, relative imports on the backend).

## 5. Monorepo workflow (diagram)

```mermaid
flowchart TB
  subgraph Nx Workspace
    direction TB
    FE[Next.js Frontend<br/>(apps/front)]
    BE[NestJS Backend<br/>(apps/api)]
    PK[Shared Packages<br/>(common, dto, tsconfig)]
  end
  FE --> PK
  BE --> PK
  FE --> BE
  BE --> FE
  FE -.-> Docs[Guides + API Docs]
  BE -.-> Docs
  class FE,BE,PK rounded
  style Nx Workspace fill:#f3f4f6,stroke-dasharray: 5 5
```

This flow shows:

1. Both apps depend on shared packages (`PK`) for types and utilities.
2. The frontend and backend communicate (HTTP/REST) so UI actions call NestJS APIs.
3. Documentation sits alongside code and references both layers.

## 6. External Integrations & Services

### Communication Stack
| Channel | Provider | Purpose |
|---------|----------|---------|
| **SMS** | **SignalHouse.io** | SMS sending, receiving, and queue management |
| **Voice** | Twilio | Voice calls, power dialer, call recordings |
| **Email** | SendGrid | Transactional and campaign emails |

### AI/LLM Providers
- **OpenAI** (GPT-4o-mini, GPT-4o) - Primary LLM
- **Anthropic** (Claude) - Alternative LLM
- **Google** (Gemini) - Alternative LLM

### Real Estate Data
- **RealEstateAPI v2** - Property search, valuation, ownership, mortgage data

### B2B Data Enrichment
- **Apollo.io** - Company/person search and enrichment
- **Business List API** - Company directory

### Maps & Location
- **Mapbox GL** - Interactive maps, address autocomplete
- **Google Maps API** - Property location visualization

### Storage & Infrastructure
- **DigitalOcean App Platform** - App hosting (frontend + backend)
- **DigitalOcean Spaces** - S3-compatible file storage
- **Neon** - PostgreSQL database
- **Upstash** - Redis cache and job queues

## 7. How to explore the repo quickly

1. Run `npx nx run-many --target=build --all` to build both apps via Nx.
2. Use `pnpm --filter front dev` or `pnpm --filter api dev` to start each app in isolation while still sharing the workspace dependencies.
3. Jump into `apps/front/src/components` for UI work and `apps/api/src/modules` for backend logic, then look at `packages/common`/`dto` when you need shared helpers.

Let me know if you want this diagram converted into a Visio-style image or synced with your Postman collection for reference.
