# Claude Code Implementation Prompt

## Codebase Summary
OutreachGlobal is a multi-tenant SaaS platform for AI-powered lead generation and outreach automation. The backend is built with NestJS, TypeScript, and PostgreSQL using Drizzle ORM. The frontend uses Next.js with React and TypeScript. The system includes AI agents (Gianna, LUCI, Cathy) for SDR automation, comprehensive integrations with SignalHouse (SMS/voice), Twilio, SendGrid, and Apollo, and a robust queue system using BullMQ for background processing.

The platform features campaign orchestration with event-driven sagas, lead enrichment pipelines, inbox management, and extensive API integrations. It uses a modular architecture with separate apps for API and frontend, connected through GraphQL resolvers and REST endpoints.

## What Already Exists (Don't Rebuild)
- **AI Orchestrator**: `app/ai-orchestrator/consumers/ai.consumer.ts` - Handles AI processing with usage metering
- **Authentication System**: Complete auth guards, JWT handling, tenant context interceptors
- **Campaign Engine**: Event-driven sagas, scheduled campaigns, lead execution tracking
- **Enrichment Pipeline**: B2B ingestion, lead cards, skip-tracing consumers with BullMQ
- **Integration Framework**: OAuth controllers, task consumers, SignalHouse/Twilio services
- **Inbox Management**: Sabrina SDR service, message processing and routing
- **Queue Infrastructure**: BullMQ setup with Redis, DLQ handling, circuit breakers
- **Database Layer**: Drizzle ORM with transaction management and repositories
- **Email System**: SendGrid integration with React email templates
- **334 Frontend Components**: Extensive React component library in `src/components/`

## What Needs Building (Priority Order)
1. **AI Co-Pilot Response Generator** - `app/ai-co-pilot/` - Generate contextual AI responses for inbound SMS/calls mapped to SignalHouse numbers
2. **Lead Journey Tracker** - `app/lead-journey/` - Track multi-channel lead interactions with analytics and insights
3. **Lead State Manager** - `app/lead-state/` - Finite state machine for lead lifecycle with automated transitions
4. **List Management Handler** - `app/list-management/` - Dynamic lead list creation, segmentation, and campaign targeting
5. **Enhanced UI Components** - Extend existing 334 components with new interactive elements
6. **Real-time WebSocket Integration** - Add live updates for lead states, journeys, and AI responses
7. **Advanced Analytics Dashboard** - Journey visualization, conversion funnels, performance metrics
8. **Automated Workflow Triggers** - Event-driven actions based on lead states and interactions

## Implementation Constraints
- **Multi-tenant**: All queries must filter by `teamId`, use tenant context interceptors
- **Use Existing AI Orchestrator**: Integrate with `apps/api/src/app/ai-orchestrator/` for all AI operations
- **Follow Queue Patterns**: Use existing BullMQ consumers and job options
- **NestJS Patterns**: Follow established resolver, service, entity patterns
- **TypeScript Strict**: Maintain strict typing throughout
- **Database Transactions**: Use Drizzle transaction manager for data consistency
- **Error Handling**: Implement proper error boundaries and logging

## Suggested First Task
Start with the **AI Co-Pilot Response Generator** - this provides immediate value for inbound customer interactions and builds upon existing SignalHouse integration and AI orchestrator infrastructure.

## Files to Read First
- `apps/api/src/app/ai-orchestrator/consumers/ai.consumer.ts` - Understand AI processing patterns
- `lib/signalhouse/signalhouse.service.ts` - Review SignalHouse integration
- `apps/api/src/app/inbox/services/inbox.service.ts` - See message processing flow
- `apps/api/src/app/auth/decorators/tenant-context.decorator.ts` - Understand tenant isolation
- `database/types/drizzle-client.type.ts` - Review database patterns