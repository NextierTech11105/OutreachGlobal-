# Architecture Overview

This application is a modern full-stack Next.js 15 (App Router) project that pairs React 19-driven UIs with Next.js API routes, PostgreSQL data persistence, and DigitalOcean services for storage and deployment. Clerk handles authentication, while the monorepo is orchestrated with pnpm workspaces so that frontend, backend, and shared code live together and can be deployed as a cohesive unit on DigitalOcean App Platform.

## Stack Highlights

- **Frontend:** Next.js 15 App Router + React 19, with shared components and types between UI and API logic.
- **Backend:** Next.js API routes serve as the serverless backend layer, running in the same codebase and benefiting from Next.js's built-in routing and security primitives.
- **Database:** DigitalOcean-managed PostgreSQL keeps structured lead and property data with connection pooling and serverless scaling.
- **Storage:** DigitalOcean Spaces provides S3-compatible object storage, ideal for the large CSV and bucket workloads tied to outreach and real estate records.
- **Authentication:** Clerk secures the monorepo with a shared configuration surface that works across forms, APIs, and server-rendered pages.
- **Monorepo tooling:** pnpm workspaces (defined in `pnpm-workspace.yaml`) share dependencies through the `workspace:*` protocol, reduce disk usage, and keep versions aligned.
- **Deployment:** DigitalOcean App Platform runs multiple web services (such as `nextier` and `frontend`) from the same repo, auto-detects Next.js apps, and scalably delivers the modern CRM experience.

## Benefits of This Monorepo Architecture on DigitalOcean

- **Code sharing:** Shared directories (for example, `/shared`) allow reuse of components, types, and utilities between frontend and backend, eliminating duplication in this CRM/AI workflow.
- **Consistent dependencies:** pnpm's symlinked `node_modules` and workspace protocol ensure unified Next.js, React, and other package versions, so "dependency hell" is avoided.
- **Collaboration:** One repo for frontend and backend simplifies code reviews, atomic commits, and cross-cutting changes, which maps directly to DigitalOcean's unified deployment pipelines.
- **Scalability:** The monorepo layout is ready for tools like Turborepo caching, accelerating CI/CD for feature-based work and enabling incremental builds alongside a Next.js monolith.
- **Deployment efficiency:** DigitalOcean App Platform automatically handles static, SSR, and API routes, zero-downtime deployments, custom domains, and pay-per-use scaling for all services.

## Best Practices for This Stack on DigitalOcean

- **Monorepo hygiene:** Define packages (for example, `apps/frontend`, `apps/backend`, `packages/shared`) in `pnpm-workspace.yaml`, install via `pnpm install --workspace`, and reference shared types via `workspace:*` to avoid circular dependencies.
- **Build and deploy:** Root-level `pnpm install && pnpm build` followed by component-specific start commands (for example, `pnpm --filter=frontend start`) keeps DigitalOcean build steps deterministic; store secrets such as `CLERK_SECRET_KEY` in App Platform environment variables.
- **Issue handling:** When dependency issues arise, `pnpm update --force` can reset lockfile drift. Run `pnpm run dev --filter=*` locally before pushing feature branches to avoid conflicts.
- **Security and performance:** Leverage Clerk across services, favor Next.js static generation for marketing and lead pages, and audit API routes for authentication and validation before deployment.

## Leveraging the DigitalOcean Ecosystem

- **App Platform:** Host each service (for example, `nextier` and `frontend`) with auto-scaling, custom domains, SSL, and App Platform CI/CD. Right-size instances per environment for cost control and enable auto-deploy on pushes.
- **Spaces storage:** Store CSV buckets, binary assets, and 2.8M+ records in Spaces. Enable CDN and generate presigned URLs from Next.js API routes to offload uploads and downloads from app servers.
- **Managed PostgreSQL:** Use DigitalOcean-managed PostgreSQL with connection pooling to support high-concurrency lead enrichment pipelines. Consider read replicas and backups for analytics workloads.
- **VPC networking:** Keep App Platform services, Spaces, and the database inside a VPC for private data transit, reducing exposure for sensitive broker and lead data.
- **Monitoring and ops:** Enable DigitalOcean Monitoring for CPU and memory alerts, attach load balancers for even traffic distribution, and integrate third-party telemetry if needed. Autoscale or switch to Kubernetes when the monorepo grows more complex.

This reference document captures the key architecture components, operational best practices, and DigitalOcean strategies that keep OutreachGlobal/Nextier efficient and scalable.
