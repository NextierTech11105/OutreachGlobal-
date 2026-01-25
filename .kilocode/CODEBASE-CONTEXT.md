# OutreachGlobal Codebase Context

This document summarizes the existing services, queues, integrations, and architecture found in the OutreachGlobal codebase.

## Backend Architecture (`apps/api/`)

### Core Services

#### AI Orchestrator
- **Location**: `app/ai-orchestrator/`
- **Components**:
  - `consumers/ai.consumer.ts` - AI processing consumer
  - `usage/usage-meter.service.ts` - AI usage tracking and metering
  - `usage/index.ts` - Usage management exports
- **Purpose**: Handles AI agent orchestration and usage monitoring

#### Authentication & Authorization
- **Location**: `app/auth/`
- **Components**:
  - Guards: `auth.guard.ts`, `jwt.guard.ts`, `roles.guard.ts`, `admin.guard.ts`
  - Services: `auth.service.ts`, `api-key.service.ts`, `tenant-onboarding.service.ts`
  - Decorators: JWT payload, roles, tenant context, correlation ID
  - Models: API keys, personal access tokens
- **Purpose**: Multi-tenant authentication with role-based access control

#### Campaign Management
- **Location**: `app/campaign/`
- **Components**:
  - Sagas: `campaign.saga.ts` - Event-driven campaign orchestration
  - Schedules: `campaign.schedule.ts` - Scheduled campaign operations
  - Services: `campaign.service.ts` - Core campaign logic
  - Resolvers: Campaign, execution, lead, block resolvers
  - Commands: `sync-lead-campaign.ts` - CQRS command handling
- **Purpose**: Automated campaign execution with event sourcing

#### Enrichment Pipeline
- **Location**: `app/enrichment/`
- **Components**:
  - Consumers: `b2b-ingestion.consumer.ts`, `lead-card.consumer.ts`, `skiptrace.consumer.ts`
  - Services: `apollo-enrichment.service.ts`, `skiptrace.service.ts`, `realestate-api.service.ts`
  - Controllers: `business-search.controller.ts`, `skip-tracing.controller.ts`
  - Repositories: Business, lead card, persona data access
- **Purpose**: Data enrichment from external APIs (Apollo, RealEstate API)

#### Integration Framework
- **Location**: `app/integration/`
- **Components**:
  - Consumers: `integration-task.consumer.ts` - Background task processing
  - Services: `integration.service.ts`, `integration-task.service.ts`
  - Controllers: `integration-oauth.controller.ts` - OAuth flows
  - Schedules: `integration.schedule.ts` - Scheduled integration tasks
- **Purpose**: Generic integration framework for external services

#### Inbox Management
- **Location**: `app/inbox/`
- **Components**:
  - Services: `inbox.service.ts`, `sabrina-sdr.service.ts`
  - Resolvers: Inbox and suppression resolvers
- **Purpose**: Universal inbox for lead communications

#### Initial Messages
- **Location**: `app/initial-messages/`
- **Components**:
  - Services: `initial-message.service.ts`
  - Models: Campaign initial messages, SDR campaign configs
- **Purpose**: Automated initial outreach messages

### Infrastructure Services (`lib/`)

#### Queue Management (BullMQ)
- **Location**: `lib/bullmq/`
- **Components**:
  - `index.ts` - Queue exports
  - `job-options.ts` - Job configuration
- **Purpose**: Redis-based job queuing

#### Caching
- **Location**: `lib/cache/`
- **Components**:
  - `cache.service.ts` - Redis caching service
  - `cache.module.ts` - NestJS module
- **Purpose**: Application-level caching

#### Circuit Breaker
- **Location**: `lib/circuit-breaker/`
- **Components**:
  - `circuit-breaker.service.ts` - Fault tolerance
- **Purpose**: Prevent cascade failures

#### Dead Letter Queue (DLQ)
- **Location**: `lib/dlq/`
- **Components**:
  - `dlq.service.ts` - Failed message handling
  - `dlq-retry.schedule.ts` - Retry scheduling
- **Purpose**: Handle and retry failed messages

#### External Integrations

#### SignalHouse
- **Location**: `lib/signalhouse/`
- **Components**:
  - `signalhouse.service.ts` - SMS/calls integration
  - `signalhouse-provisioning.service.ts` (in auth)
- **Purpose**: Multi-channel communication (SMS, voice)

#### Twilio
- **Location**: `lib/twilio/`
- **Components**:
  - `twilio.service.ts` - Telephony integration
  - `twilio-lookup.service.ts` (in enrichment)
- **Purpose**: Voice calls and phone number validation

#### SendGrid (Email)
- **Location**: `lib/mail/`
- **Components**:
  - `mail.service.ts` - Email delivery
  - `sendgrid-mail.enum.ts` - Email templates
- **Purpose**: Transactional and campaign emails

#### Outbound Gate
- **Location**: `lib/outbound/`
- **Components**:
  - `outbound-gate.service.ts` - Message routing
- **Purpose**: Control outbound communication flow

### Database Layer
- **Location**: `database/`
- **Components**:
  - `services/database.service.ts` - Connection management
  - Drizzle ORM client types
- **Purpose**: Multi-tenant database operations

### Email Templates
- **Location**: `emails/`
- **Components**:
  - Components: `body.tsx`, `button.tsx`, `container.tsx`, etc.
  - Pages: `campaign-email.tsx`, `message-email.tsx`, `team-invitation-email.tsx`
- **Purpose**: React-based email template rendering

## Frontend Architecture (`apps/front/`)

### Existing Components
- **Count**: 334+ components in `src/components/`
- **Structure**: Organized by feature domains
- **Technology**: React with TypeScript, Next.js App Router

### Key Features
- Multi-tenant application structure
- Real-time updates via WebSocket
- Comprehensive form handling
- Responsive design patterns

## Queue & Background Processing

### BullMQ Queues
- AI processing queues
- Enrichment pipelines (b2b, lead-card, skiptrace)
- Integration tasks
- Campaign execution
- Email delivery

### Scheduled Jobs
- Campaign schedules
- Integration syncs
- DLQ retry processing

## External API Integrations

### Existing Integrations
- **SignalHouse**: SMS and voice communications
- **Twilio**: Telephony and phone validation
- **SendGrid**: Email delivery
- **Apollo**: Lead enrichment (marked for removal)
- **RealEstate API**: Property data enrichment

### Integration Patterns
- OAuth flows for third-party connections
- Webhook handling for real-time updates
- Batch processing for bulk operations
- Rate limiting and error handling

## Multi-Tenant Architecture

### Tenant Isolation
- Database-level tenant separation
- API key authentication
- Request-scoped tenant context
- Resource quota management

### Shared Services
- AI usage metering across tenants
- Global caching layers
- Centralized logging and monitoring

## Development Tools

### Code Quality
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Jest testing framework

### Build & Deployment
- Nx monorepo management
- Docker containerization
- CI/CD pipelines (GitHub Actions)

This context provides the foundation for updating skill definitions to match the existing implementation and identify gaps that need to be filled.C3ee