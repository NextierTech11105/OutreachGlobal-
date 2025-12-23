# Nextier Platform - Architecture Audit & Module Mapping

> **Generated**: December 22, 2025  
> **Platform**: Nextier / OutreachGlobal  
> **Status**: Production on DigitalOcean

---

## 🏗️ Complete Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DIGITALOCEAN INFRASTRUCTURE                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│  │    frontend     │   │     nextier     │   │   PostgreSQL    │   │  Upstash Redis  │ │
│  │   Next.js 15    │   │  NestJS GraphQL │   │       17        │   │    200 MB       │ │
│  │  apps/front     │   │    apps/api     │   │   94 tables     │   │   21M commands  │ │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘ │
│           │                     │                     │                     │          │
│           └─────────────────────┴─────────────────────┴─────────────────────┘          │
│                                         │                                               │
│  ┌──────────────────────────────────────┴───────────────────────────────────────────┐  │
│  │                        SERVERLESS FUNCTIONS (7)                                   │  │
│  │  webhooks/sms-inbound │ webhooks/voice-inbound │ ai/generate-sms                 │  │
│  │  enrichment/enrich-lead │ enrichment/batch-enrich │ data/csv-processor │ export  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Frontend Module Architecture

### Route Structure: `apps/front/src/app/`

```
apps/front/src/app/
├── layout.tsx                 # Root layout (auth provider, theme)
├── page.tsx                   # Landing page
├── globals.css                # Global styles
│
├── auth/                      # 🔐 Authentication
│   └── [...nextauth]/         # NextAuth.js routes
│
├── admin/                     # 🔧 Admin Panel (Super Admin Only)
│   ├── layout.tsx             # Admin layout wrapper
│   ├── page.tsx               # Admin dashboard
│   ├── ai-sdr/                # AI SDR configuration
│   ├── api-monitor/           # API health monitoring
│   ├── b2b/                   # B2B data management
│   ├── batch-jobs/            # Background job management
│   ├── billing/               # Billing & invoices
│   ├── campaigns/             # Campaign management
│   ├── data/                  # Data imports/exports
│   ├── digital-workers/       # AI worker config (GIANNA, CATHY, SABRINA)
│   ├── integrations/          # Third-party integrations
│   ├── lucy/                  # LUCY AI assistant
│   ├── mcp/                   # Model Context Protocol
│   ├── message-templates/     # SMS/Email templates
│   ├── prompt-library/        # AI prompt management
│   ├── system/                # System settings
│   ├── users/                 # User management
│   └── workflows/             # Automation workflows
│
├── t/                         # 🏢 Team Routes (Multi-Tenant)
│   ├── page.tsx               # Team selector
│   └── [team]/                # Dynamic team slug
│       ├── layout.tsx         # Team layout (sidebar, header)
│       ├── page.tsx           # Team dashboard
│       │
│       │── 📊 CORE MODULES
│       ├── leads/             # Lead management
│       ├── inbox/             # SMS inbox & threads
│       ├── campaigns/         # Campaign builder
│       ├── properties/        # Property database
│       ├── deals/             # Deal pipeline
│       │
│       │── 📞 COMMUNICATION
│       ├── sms/               # SMS composer
│       ├── call-center/       # Voice calls
│       ├── power-dialers/     # Auto-dialing
│       ├── instant-outreach/  # Quick SMS blast
│       │
│       │── 🤖 AI MODULES
│       ├── ai-sdr/            # AI SDR avatars
│       ├── ai-training/       # Train AI responses
│       ├── prompts/           # Prompt templates
│       │
│       │── 📚 CONTENT
│       ├── library/           # Content library
│       ├── message-templates/ # SMS templates
│       ├── research-library/  # Saved research
│       │
│       │── 🔍 DATA & ENRICHMENT
│       ├── data-hub/          # Data management
│       ├── import/            # CSV import
│       ├── verify-enrich/     # Lead enrichment
│       ├── valuation/         # Property valuation
│       ├── valuation-queue/   # Batch valuations
│       ├── search/            # Property search
│       ├── sectors/           # Industry sectors
│       │
│       │── ⚙️ SETTINGS
│       ├── settings/          # Team settings
│       ├── integrations/      # Team integrations
│       ├── signalhouse/       # SignalHouse config
│       ├── profile/           # User profile
│       │
│       │── 📈 ANALYTICS
│       ├── analytics/         # Dashboard analytics
│       ├── calendar/          # Calendar view
│       └── workspaces/        # Workspace management
│
├── api/                       # 🔌 API Routes (75+ endpoints)
│   ├── admin/                 # Admin APIs
│   ├── ai/                    # AI generation
│   ├── analytics/             # Analytics APIs
│   ├── auth/                  # Auth endpoints
│   ├── buckets/               # Bucket management
│   ├── campaigns/             # Campaign APIs
│   ├── enrichment/            # Lead enrichment
│   ├── gianna/                # GIANNA AI worker
│   ├── cathy/                 # CATHY AI worker
│   ├── sabrina/               # SABRINA AI worker
│   ├── neva/                  # NEVA AI worker
│   ├── inbox/                 # Inbox APIs
│   ├── leads/                 # Lead APIs
│   ├── power-dialer/          # Dialer APIs
│   ├── property/              # Property APIs
│   ├── signalhouse/           # SignalHouse integration
│   ├── sms/                   # SMS APIs
│   ├── valuation-queue/       # Valuation APIs
│   └── webhook/               # Webhook handlers
│
├── library/                   # 📖 Public content library
├── pricing/                   # 💰 Pricing page
├── report/                    # 📄 Report viewer
├── share/                     # 🔗 Shareable links
└── invitations/               # ✉️ Team invitations
```

---

## 🔧 API Module Architecture

### NestJS Modules: `apps/api/src/app/`

```
apps/api/src/app/
├── app.module.ts              # Root module (imports all)
├── app.controller.ts          # Health check endpoints
├── app.runner.ts              # Startup tasks
├── base.controller.ts         # Base controller utilities
│
├── auth/                      # 🔐 Authentication Module
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.resolver.ts
│   ├── jwt.strategy.ts
│   └── guards/
│
├── user/                      # 👤 User Module
│   ├── user.module.ts
│   ├── user.service.ts
│   └── user.resolver.ts
│
├── team/                      # 🏢 Team Module
│   ├── team.module.ts
│   ├── team.service.ts
│   └── team.resolver.ts
│
├── lead/                      # 👥 Lead Module
│   ├── lead.module.ts
│   ├── lead.service.ts
│   └── lead.resolver.ts
│
├── campaign/                  # 🎯 Campaign Module
│   ├── campaign.module.ts
│   ├── campaign.service.ts
│   └── campaign.resolver.ts
│
├── message/                   # 💬 Message Module
│   ├── message.module.ts
│   ├── message.service.ts
│   └── message.resolver.ts
│
├── inbox/                     # 📥 Inbox Module
│   ├── inbox.module.ts
│   ├── inbox.service.ts
│   └── inbox.resolver.ts
│
├── property/                  # 🏠 Property Module
│   ├── property.module.ts
│   ├── property.service.ts
│   └── property.resolver.ts
│
├── enrichment/                # 🔍 Enrichment Module
│   ├── enrichment.module.ts
│   ├── enrichment.service.ts
│   └── enrichment.resolver.ts
│
├── content-library/           # 📚 Content Library Module
│   ├── content-library.module.ts
│   ├── content-library.service.ts
│   └── content-library.resolver.ts
│
├── message-template/          # 📝 Message Template Module
│   ├── message-template.module.ts
│   ├── message-template.service.ts
│   └── message-template.resolver.ts
│
├── prompt/                    # 🤖 Prompt Module
│   ├── prompt.module.ts
│   ├── prompt.service.ts
│   └── prompt.resolver.ts
│
├── power-dialer/              # 📞 Power Dialer Module
│   ├── power-dialer.module.ts
│   ├── power-dialer.service.ts
│   └── power-dialer.resolver.ts
│
├── sdr/                       # 🤖 AI SDR Module
│   ├── sdr.module.ts
│   ├── sdr.service.ts
│   └── sdr.resolver.ts
│
├── voice/                     # 🎙️ Voice Module
│   ├── voice.module.ts
│   └── voice.service.ts
│
├── workflow/                  # ⚙️ Workflow Module
│   ├── workflow.module.ts
│   ├── workflow.service.ts
│   └── workflow.resolver.ts
│
├── achievements/              # 🏆 Achievements Module
├── apollo/                    # 🔮 Apollo.io Integration
├── flow/                      # 🔄 Flow Builder
├── initial-messages/          # 📨 Initial Messages
├── integration/               # 🔌 Integrations
├── recovery/                  # ♻️ Data Recovery
└── resource/                  # 📦 Resource Management
```

---

## 🔄 Module Synergy Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              MODULE SYNERGY DIAGRAM                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │    USER     │
                                    │   LOGIN     │
                                    └──────┬──────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────┐
                    │              TEAM CONTEXT                 │
                    │         /t/[team-slug]/...               │
                    └──────────────────┬───────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│   DATA HUB    │            │    LEADS      │            │   CAMPAIGNS   │
│               │            │               │            │               │
│ • CSV Import  │───────────▶│ • Lead List   │◀───────────│ • Sequences   │
│ • Enrichment  │            │ • Pipeline    │            │ • Scheduling  │
│ • Valuation   │            │ • Scoring     │            │ • Templates   │
└───────┬───────┘            └───────┬───────┘            └───────┬───────┘
        │                            │                            │
        │                            ▼                            │
        │                   ┌───────────────┐                     │
        │                   │     INBOX     │                     │
        │                   │               │◀────────────────────┘
        │                   │ • Threads     │
        │                   │ • Labels      │
        │                   │ • AI Replies  │
        │                   └───────┬───────┘
        │                           │
        │              ┌────────────┴────────────┐
        │              │                         │
        │              ▼                         ▼
        │     ┌───────────────┐         ┌───────────────┐
        │     │  AI WORKERS   │         │  SIGNALHOUSE  │
        │     │               │         │               │
        │     │ • GIANNA      │────────▶│ • SMS Send    │
        │     │ • CATHY       │         │ • SMS Receive │
        │     │ • SABRINA     │         │ • Voice       │
        │     │ • NEVA        │         │ • 10DLC       │
        │     └───────────────┘         └───────────────┘
        │              │
        │              ▼
        │     ┌───────────────┐
        └────▶│   CONTENT     │
              │   LIBRARY     │
              │               │
              │ • Templates   │
              │ • Prompts     │
              │ • Snippets    │
              └───────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW PATTERNS                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

PATTERN 1: Lead Import → Enrichment → Campaign
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CSV Upload → /api/import → leads table → /api/enrichment → 
persona_phones + persona_emails → Campaign Selection → sms_messages

PATTERN 2: Inbound SMS → AI Response
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SignalHouse Webhook → /api/signalhouse/webhook → Worker Router →
GIANNA/CATHY/SABRINA → LLM Service → SignalHouse Send

PATTERN 3: Property Valuation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Address Input → /api/valuation → RealEstateAPI → PropertyDetail →
Comps Analysis → Valuation Report → research_library table

PATTERN 4: Power Dialer
━━━━━━━━━━━━━━━━━━━━━━━━
Lead Selection → power_dialers table → Twilio/SignalHouse → 
call_histories → Disposition → Lead Stage Update
```

---

## 🗄️ Database Schema Groups

### 94 Tables organized by domain:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA GROUPS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  👤 USERS & TEAMS (8 tables)                                                │
│  ├── users, teams, team_members, team_settings                              │
│  ├── team_invitations, refresh_tokens, sessions, api_keys                   │
│                                                                              │
│  👥 LEADS & CONTACTS (12 tables)                                            │
│  ├── leads, properties, personas, persona_phones, persona_emails            │
│  ├── persona_addresses, persona_socials, address_history                    │
│  ├── demographics, skiptrace_results, lead_notes, lead_activities          │
│                                                                              │
│  🎯 CAMPAIGNS & MESSAGING (10 tables)                                       │
│  ├── campaigns, campaign_leads, campaign_sequences, campaign_stats         │
│  ├── messages, sms_messages, message_templates, inbox_items                │
│  ├── inbox_threads, opt_outs                                                │
│                                                                              │
│  📚 CONTENT (6 tables)                                                      │
│  ├── content_items, content_categories, prompts, prompt_categories         │
│  ├── research_library, saved_searches                                       │
│                                                                              │
│  🤖 AI SDR (5 tables)                                                       │
│  ├── ai_sdr_avatars, ai_sdr_conversations, ai_sdr_responses                │
│  ├── worker_phone_assignments, response_classifications                    │
│                                                                              │
│  📞 CALLING (5 tables)                                                      │
│  ├── power_dialers, dialer_contacts, call_histories                        │
│  ├── call_recordings, call_transcripts                                      │
│                                                                              │
│  🔍 DATA & ENRICHMENT (8 tables)                                            │
│  ├── buckets, bucket_leads, data_sources, data_source_mappings             │
│  ├── enrichment_jobs, enrichment_results, businesses, business_contacts    │
│                                                                              │
│  ⚙️ WORKFLOWS & AUTOMATION (6 tables)                                       │
│  ├── workflows, workflow_steps, workflow_executions                        │
│  ├── automation_rules, achievements, notifications                         │
│                                                                              │
│  🔌 INTEGRATIONS (5 tables)                                                 │
│  ├── integrations, integration_credentials, signalhouse_config             │
│  ├── apollo_enrichments, external_syncs                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 External Integrations

| Integration | Purpose | Module |
|-------------|---------|--------|
| **SignalHouse** | SMS/Voice/10DLC | `/api/signalhouse/*` |
| **OpenAI/Claude** | AI Generation | `/api/ai/*`, `/lib/gianna/*` |
| **Apollo.io** | Lead Enrichment | `/api/apollo/*` |
| **RealEstateAPI** | Property Data | `/api/valuation/*` |
| **Twilio** | Voice Backup | `/api/twilio/*` |
| **Stripe** | Payments | `/api/stripe/*` |
| **Mapbox** | Geocoding | `/api/address/*` |
| **SendGrid** | Email | `/lib/email/*` |

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   git push origin main                                                       │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │              DIGITALOCEAN APP PLATFORM                               │   │
│   │                                                                      │   │
│   │   1. Detect monorepo (pnpm workspace)                               │   │
│   │   2. Build frontend: pnpm --filter front build                      │   │
│   │   3. Build API: pnpm --filter api build                             │   │
│   │   4. Deploy to containers                                           │   │
│   │   5. Health checks pass → traffic routed                            │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ENVIRONMENT VARIABLES (Set in DO App Platform):                           │
│   ├── DATABASE_URL          (PostgreSQL connection string)                  │
│   ├── REDIS_URL             (Upstash Redis)                                 │
│   ├── SIGNALHOUSE_API_KEY   (SMS/Voice)                                     │
│   ├── OPENAI_API_KEY        (AI generation)                                 │
│   ├── ANTHROPIC_API_KEY     (Claude)                                        │
│   ├── REAL_ESTATE_API_KEY   (Property data)                                 │
│   ├── NEXTAUTH_SECRET       (Auth)                                          │
│   └── ... (50+ env vars)                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Module Health Status

| Module | Frontend | API | Database | Status |
|--------|----------|-----|----------|--------|
| Auth | ✅ | ✅ | ✅ | 🟢 Healthy |
| Teams | ✅ | ✅ | ✅ | 🟢 Healthy |
| Leads | ✅ | ✅ | ✅ | 🟢 Healthy |
| Inbox | ✅ | ✅ | ✅ | 🟢 Healthy |
| Campaigns | ✅ | ✅ | ✅ | 🟢 Healthy |
| AI SDR | ✅ | ✅ | ✅ | 🟢 Healthy |
| Power Dialer | ✅ | ✅ | ✅ | 🟢 Healthy |
| Enrichment | ✅ | ✅ | ✅ | 🟢 Healthy |
| Content Library | ✅ | ✅ | ✅ | 🟢 Healthy |
| Valuation | ✅ | ❌ | ✅ | 🟡 Frontend Only |
| Research Library | ✅ | ❌ | ✅ | 🟡 Spaces Error |

---

## 📈 Metrics

| Metric | Value |
|--------|-------|
| Frontend Routes | 35+ pages |
| API Routes | 75+ endpoints |
| NestJS Modules | 25 modules |
| Database Tables | 94 tables |
| Serverless Functions | 7 functions |
| External Integrations | 8 services |
| Monthly Cost | $71.92 |

---

*Generated by Nextier Architecture Audit Tool*
