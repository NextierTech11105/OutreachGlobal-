# Architecture Flow

This visual flow highlights how the key layers of the OutreachGlobal/Nextier stack interact inside the pnpm-powered monorepo and run on DigitalOcean.

```mermaid
graph TD
    subgraph Frontend
        UI[Next.js 15 + React 19 (App Router)]
    end

    subgraph Backend
        API[Next.js API Routes]
        Auth[Clerk]
    end

    subgraph Infrastructure
        DB[DigitalOcean PostgreSQL]
        Storage[DigitalOcean Spaces]
        DOApp[DigitalOcean App Platform]
    end

    subgraph Tooling
        Monorepo[pnpm Workspaces (shared code)]
    end

    User[End users / admins]
    User -->|Browses UI| UI
    UI -->|Calls data/actions| API
    API -->|Reads/writes| DB
    API -->|Uploads/downloads| Storage
    API -->|Checks session| Auth
    UI -->|Uses Clerk UI components| Auth
    DOApp -->|Deploys services| UI
    DOApp -->|Deploys services| API
    Monorepo -->|Shares components/types| UI
    Monorepo -->|Shares components/types| API
    DOApp -->|Runs on| Infrastructure
```

## Flow Highlights

- **End user interactions:** Everyone (prospects, agents, admins) uses the Next.js 15 + React 19 UI, which is rendered via the App Router and lives inside the same repo as the APIs.
- **Serverless backend:** Next.js API routes serve data, orchestrate uploads/downloads, and delegate authentication to Clerk, all packaged with the frontend on DigitalOcean App Platform.
- **Storage & data:** DO-managed PostgreSQL stores structured CRM/lead data while Spaces handles CSVs and large media; both are accessed directly from API routes.
- **Shared tooling:** pnpm workspaces link `apps`/`packages/shared` so UI and API layers reuse the same components, types, and utilities without version drift.
- **Hosting layer:** DigitalOcean App Platform deploys multiple services (`nextier`, `frontend`) from the monorepo, auto-detects Next.js, and scales the stack while keeping secrets (Clerk keys, DB creds) stored securely.

Use this flow as a quick reference when explaining the stack to non-technical stakeholders or aligning on deployment discussions.
