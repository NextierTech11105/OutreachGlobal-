# 🚀 ULTIMATE PLATFORM ENGINEERING MEGA AUDIT PROMPT

> **Purpose**: Comprehensive platform audit covering architecture, capabilities, capacity, cognitive UX, and gap analysis for strategic refactoring planning.
> 
> **Target**: Claude Code / AI Engineering Assistant
> 
> **Platform**: Nextier / OutreachGlobal Multi-Tenant Lead Generation Platform

---

## 📋 AUDIT EXECUTION INSTRUCTIONS

Execute this audit in phases. After each phase, document findings before proceeding. Create structured output files in `/audit/` directory.

---

# PART A: ARCHITECTURE & INFRASTRUCTURE AUDIT

## Phase 1: Repository Cartography

**Objective**: Build complete mental model of repository structure and ownership.

```
TASKS:
1. Map all workspaces in pnpm-workspace.yaml
2. Document each app's purpose and current state:
   - apps/api → Backend API (Express/Hono)
   - apps/front → Main Nextier frontend (Next.js)
   - apps/fdaily-pro → ForeclosuresDaily Pro tool
   - functions/ → DigitalOcean Functions (NOT DEPLOYED)
3. List all packages/* and their consumers
4. Identify shared dependencies vs duplicated code
5. Map nx.json task graph and build order
6. Document all entry points (package.json scripts)

OUTPUT: AUDIT_REPO_MAP.md with:
- Visual tree of all workspaces
- Dependency graph between packages
- Build/deploy pipeline flow
- Dead code / unused packages
```

---

## Phase 2: Database & Schema Archaeology

**Objective**: Complete data layer understanding.

```
TASKS:
1. Read all Drizzle schema files in apps/api/src/db/schema/
2. Map tenant isolation patterns (workspace_id foreign keys)
3. Document all tables with:
   - Purpose
   - Tenant-scoped (yes/no)
   - Row count estimates
   - Missing indexes
4. Find schema drift between code and migrations
5. Identify orphaned tables or deprecated columns
6. Map all enum types and their usage
7. Document soft-delete patterns vs hard-delete

OUTPUT: AUDIT_DATA_LAYER.md with:
- Complete ERD (text-based)
- Tenant isolation gaps
- Index recommendations
- Migration health status
```

---

## Phase 3: API Surface Audit

**Objective**: Document all API endpoints and their health.

```
TASKS:
1. Scan all route files in apps/api/src/app/*/
2. For each endpoint document:
   - Method + Path
   - Auth required (yes/no/optional)
   - Tenant-scoped (yes/no)
   - Request/Response types
   - Error handling quality
3. Find endpoints missing:
   - Input validation
   - Rate limiting
   - Audit logging
4. Identify duplicate endpoints or route conflicts
5. Map WebSocket/SSE endpoints separately
6. Document all middleware chains

OUTPUT: AUDIT_API_SURFACE.md with:
- Complete endpoint inventory
- Security gap matrix
- Missing validation checklist
- Breaking change candidates
```

---

## Phase 4: Frontend Component Audit

**Objective**: Map UI architecture and reuse patterns.

```
TASKS:
1. Scan apps/front/src/components/ for all components
2. Categorize by type:
   - Layout components
   - Feature components
   - Shared/atomic components
   - Page components
3. Find duplicate components (same logic, different files)
4. Map component prop drilling chains
5. Identify missing TypeScript types
6. Document state management patterns:
   - React Context usage
   - Zustand stores
   - Server state (React Query/SWR)
7. Find orphaned components (not imported anywhere)

OUTPUT: AUDIT_FRONTEND_ARCHITECTURE.md with:
- Component tree visualization
- Consolidation opportunities
- State management gaps
- Type safety issues
```

---

## Phase 5: Agent Framework Deep Dive

**Objective**: Audit all AI agents and their orchestration.

```
TASKS:
1. Document Gianna Agent:
   - Read apps/front/src/lib/gianna/gianna-service.ts
   - Map all 8 personality archetypes
   - Document intent classification logic
   - Find hardcoded responses vs dynamic
   
2. Document Sabrina SDR Agent:
   - Read apps/api/src/app/inbox/services/sabrina-sdr.service.ts
   - Map priority scoring algorithm
   - Document email classification flow
   
3. Document LUCI Agent:
   - Read apps/front/src/config/agents/luci.ts
   - Verify if scheduled jobs are running (THEY'RE NOT)
   - Document all defined skills
   
4. Find missing agent orchestration:
   - No agent router exists
   - No job scheduler exists
   - No cross-agent communication

OUTPUT: AUDIT_AGENT_FRAMEWORK.md with:
- Agent capability matrix
- Missing infrastructure list
- Integration gap analysis
- Recommended agent router design
```

---

## Phase 6: Integration Audit

**Objective**: Map all external service integrations.

```
TASKS:
1. Find all API keys in .env files and code
2. Document each integration:
   - Apollo.io (enrichment)
   - RealEstateAPI (property data)
   - SignalHouse (SMS/Voice)
   - Twilio (legacy?)
   - OpenAI / Anthropic (LLM)
   - DigitalOcean Spaces (file storage)
   - Resend (email)
   - Clerk (auth)
3. For each integration assess:
   - Error handling quality
   - Retry logic exists?
   - Rate limit handling
   - Fallback behavior
   - Cost tracking
4. Find duplicate integration code
5. Identify unused integrations

OUTPUT: AUDIT_INTEGRATIONS.md with:
- Integration dependency graph
- Error handling gaps
- Cost exposure analysis
- Consolidation opportunities
```

---

## Phase 7: Security & Compliance Audit

**Objective**: Identify security vulnerabilities.

```
TASKS:
1. Scan for NODE_TLS_REJECT_UNAUTHORIZED=0 (CRITICAL)
2. Check all auth middleware for bypasses
3. Verify tenant isolation in every query
4. Find hardcoded secrets or API keys
5. Check for SQL injection vectors
6. Verify CORS configuration
7. Check rate limiting coverage
8. Audit file upload handling
9. Check for sensitive data in logs
10. Verify webhook signature validation

OUTPUT: AUDIT_SECURITY.md with:
- Critical vulnerabilities (MUST FIX)
- High-risk issues
- Medium-risk issues
- Remediation priority list
```

---

## Phase 8: Infrastructure Gap Analysis

**Objective**: Document deployment infrastructure issues.

```
TASKS:
1. Read DigitalOcean app specs (if any)
2. Audit current deployment:
   - Both apps on 512MB RAM (too small)
   - Shared PostgreSQL (no HA)
   - homeowner-advisors has no API service
3. Document missing infrastructure:
   - No Redis for caching/sessions
   - No job queue (BullMQ/etc)
   - No scheduled task runner
   - No monitoring/alerting
   - No log aggregation
4. Identify scaling bottlenecks
5. Check for resource leaks

OUTPUT: AUDIT_INFRASTRUCTURE.md with:
- Current architecture diagram
- Target architecture diagram
- Gap remediation roadmap
- Cost estimates for improvements
```

---

# PART B: CAPABILITIES & CAPACITY AUDIT

## Phase 9: Feature Capability Matrix

**Objective**: Document what the platform CAN do vs SHOULD do.

```
TASKS:
1. Build capability matrix by domain:

LEAD MANAGEMENT:
- [ ] CSV Import → IMPLEMENTED (apps/front)
- [ ] Skip Trace Integration → PARTIAL (manual upload)
- [ ] Auto-Enrichment → IMPLEMENTED but not scheduled
- [ ] Lead Scoring → IMPLEMENTED (Sabrina)
- [ ] Lead Deduplication → MISSING
- [ ] Lead Assignment → PARTIAL

CAMPAIGN MANAGEMENT:
- [ ] Campaign Creation → IMPLEMENTED
- [ ] Multi-Channel (SMS/Email/Voice) → PARTIAL
- [ ] A/B Testing → MISSING
- [ ] Campaign Analytics → PARTIAL
- [ ] Auto-Pause Rules → MISSING

COMMUNICATION:
- [ ] Inbound SMS → IMPLEMENTED (SignalHouse)
- [ ] Outbound SMS → IMPLEMENTED
- [ ] Inbound Voice → IMPLEMENTED (Gianna)
- [ ] Outbound Voice → PARTIAL
- [ ] Email Inbox → IMPLEMENTED (Sabrina)
- [ ] WhatsApp → MISSING
- [ ] Unified Inbox View → PARTIAL

AI AGENTS:
- [ ] Gianna (Voice/Chat) → IMPLEMENTED
- [ ] Sabrina (Email SDR) → IMPLEMENTED
- [ ] LUCI (Data Ops) → CONFIG ONLY, NO SCHEDULER
- [ ] Agent Router → MISSING
- [ ] Agent Analytics → MISSING

DATA OPERATIONS:
- [ ] Property Enrichment → IMPLEMENTED
- [ ] Owner Enrichment → PARTIAL
- [ ] Batch Processing → IMPLEMENTED (DO Functions but NOT DEPLOYED)
- [ ] Export Formats → IMPLEMENTED
- [ ] Data Warehouse → MISSING

TENANT/WORKSPACE:
- [ ] Multi-tenant Isolation → IMPLEMENTED
- [ ] White-label Branding → PARTIAL
- [ ] Custom Domains → MISSING
- [ ] API Keys Management → PARTIAL
- [ ] Usage Metering → MISSING
- [ ] Billing Integration → MISSING

OUTPUT: AUDIT_CAPABILITY_MATRIX.md with:
- Full matrix with status codes
- Priority ranking for missing features
- Effort estimates for each gap
```

---

## Phase 10: Capacity & Scalability Audit

**Objective**: Document system capacity limits and bottlenecks.

```
TASKS:
1. Database Capacity:
   - Current row counts per table
   - Query performance bottlenecks
   - Missing indexes
   - Connection pool sizing
   - Read replica need

2. API Capacity:
   - Concurrent request handling
   - Memory per request
   - Long-running endpoints
   - Timeout configurations
   - Rate limit thresholds

3. Worker Capacity:
   - Background job processing
   - Queue depths
   - Job failure rates
   - Retry configurations

4. Storage Capacity:
   - File storage usage
   - Blob size limits
   - CDN configuration
   - Cleanup policies

5. Integration Capacity:
   - API rate limits per provider
   - Burst handling
   - Quota tracking
   - Cost per operation

6. Compute Capacity:
   - Current RAM usage (512MB limit)
   - CPU bottlenecks
   - Container scaling rules
   - Cold start times

OUTPUT: AUDIT_CAPACITY.md with:
- Current capacity metrics
- Projected growth curves
- Bottleneck heat map
- Scaling recommendations
- Cost projections at 10x/100x scale
```

---

## Phase 11: Technical Debt Inventory

**Objective**: Catalog and prioritize all technical debt.

```
TASKS:
1. Code Quality Debt:
   - TODO/FIXME/HACK comments
   - Ignored TypeScript errors
   - Any type usage
   - Console.log in production code
   - Dead code / unused exports

2. Architectural Debt:
   - Circular dependencies
   - God classes/files (>500 lines)
   - Missing abstraction layers
   - Hardcoded configuration
   - Environment-specific code paths

3. Testing Debt:
   - Missing unit tests (coverage %)
   - Missing integration tests
   - Missing E2E tests
   - Flaky tests
   - Slow test suites

4. Documentation Debt:
   - Missing API documentation
   - Outdated README files
   - Missing architecture docs
   - Undocumented environment variables
   - Missing runbooks

5. Dependency Debt:
   - Outdated packages (npm outdated)
   - Security vulnerabilities (npm audit)
   - Deprecated APIs in use
   - Version conflicts

OUTPUT: AUDIT_TECH_DEBT.md with:
- Debt inventory by category
- Priority scoring (impact × effort)
- Sprint-sized work packages
- Debt burn-down recommendations
```

---

# PART C: COGNITIVE UX & MENTAL MODEL AUDIT

## Phase 12: User Journey Mapping

**Objective**: Map every user flow and identify friction points.

```
TASKS:
1. Document all user personas:
   - Platform Admin (you/team)
   - Workspace Owner (white-label client)
   - Workspace User (client's team member)
   - Lead/Prospect (receiving outreach)

2. Map critical user journeys:
   ADMIN JOURNEY:
   - Onboard new workspace
   - Configure integrations
   - Monitor system health
   - Manage billing
   
   WORKSPACE OWNER JOURNEY:
   - Initial setup
   - Import first leads
   - Create first campaign
   - Review results
   - Invite team members
   
   USER JOURNEY:
   - Daily workflow
   - Handle inbound leads
   - Manage conversations
   - Track performance

3. For each journey identify:
   - Number of clicks/steps
   - Cognitive load per step
   - Decision points
   - Error recovery paths
   - Help availability

OUTPUT: AUDIT_USER_JOURNEYS.md with:
- Flow diagrams per persona
- Friction score per journey
- Drop-off risk points
- Simplification opportunities
```

---

## Phase 13: Information Architecture Audit

**Objective**: Assess mental model alignment.

```
TASKS:
1. Navigation Analysis:
   - Map all nav items across apps
   - Identify inconsistent terminology
   - Find orphaned pages (no nav link)
   - Measure depth (clicks to reach)

2. Terminology Consistency:
   - "Workspace" vs "Tenant" vs "Organization"
   - "Lead" vs "Contact" vs "Prospect"
   - "Campaign" vs "Sequence" vs "Workflow"
   - "Agent" vs "AI" vs "Bot"
   
3. Mental Model Gaps:
   - Where does user get confused?
   - What requires training?
   - What's counterintuitive?
   
4. Feature Discoverability:
   - Hidden features (no UI access)
   - Buried features (3+ clicks deep)
   - Undocumented features

OUTPUT: AUDIT_INFORMATION_ARCHITECTURE.md with:
- Terminology dictionary (standardize)
- Navigation restructure proposal
- Discoverability improvements
- Onboarding flow recommendations
```

---

## Phase 14: Cognitive Load Assessment

**Objective**: Measure mental bandwidth drain on users.

```
TASKS:
1. Screen Complexity Analysis:
   - Count decisions per screen
   - Count form fields per action
   - Measure information density
   - Identify overwhelming UIs

2. Task Completion Overhead:
   - Steps to complete common tasks
   - Required context switches
   - Manual data entry points
   - Copy/paste operations needed

3. Error Handling UX:
   - Error message clarity
   - Recovery path clarity
   - Undo availability
   - Auto-save behavior

4. Status Visibility:
   - System state indicators
   - Progress feedback
   - Loading states
   - Success/failure confirmation

5. Automation Opportunities:
   - Repetitive manual tasks
   - Predictable decision patterns
   - Default value optimization
   - Smart suggestions potential

OUTPUT: AUDIT_COGNITIVE_LOAD.md with:
- Complexity score per screen
- Task overhead metrics
- Automation ROI estimates
- UX simplification roadmap
```

---

## Phase 15: Operational Burden Analysis

**Objective**: Assess platform operator cognitive load.

```
TASKS:
1. Daily Operations Audit:
   - What must be checked daily?
   - What breaks without intervention?
   - What alerts exist?
   - What's the escalation path?

2. Troubleshooting Complexity:
   - Log accessibility
   - Error traceability
   - Debug tooling available
   - Time to diagnose issues

3. Configuration Overhead:
   - Environment variables count
   - Configuration files count
   - Secrets management
   - Feature flags system

4. Deployment Burden:
   - Deployment frequency
   - Rollback capability
   - Zero-downtime support
   - Database migration risk

5. Monitoring Gaps:
   - What's not monitored?
   - What alerts are missing?
   - What dashboards exist?
   - What SLOs are defined?

OUTPUT: AUDIT_OPS_BURDEN.md with:
- Daily runbook requirements
- Missing automation list
- Observability roadmap
- SRE maturity assessment
```

---

# PART D: GAP ANALYSIS & REMEDIATION PLANNING

## Phase 16: Priority Gap Matrix

**Objective**: Synthesize all findings into actionable gaps.

```
TASKS:
1. Consolidate all gaps from previous phases
2. Score each gap on:
   - Business Impact (1-5)
   - User Impact (1-5)
   - Security Risk (1-5)
   - Effort to Fix (1-5)
   - Dependencies (list)

3. Create priority quadrants:
   - CRITICAL: High impact, manageable effort
   - IMPORTANT: High impact, high effort
   - QUICK WINS: Low effort, visible impact
   - BACKLOG: Lower priority

4. Identify gap clusters (related gaps)

OUTPUT: AUDIT_GAP_MATRIX.md with:
- Master gap inventory
- Priority scores
- Dependency graph
- Cluster analysis
```

---

## Phase 17: Remediation Roadmap

**Objective**: Create actionable fix plan.

```
TASKS:
1. Phase gaps into sprints:
   SPRINT 0 (Immediate - This Week):
   - Critical security fixes
   - Blocking bugs
   - Quick wins
   
   SPRINT 1-2 (Foundation - 2 Weeks):
   - Infrastructure stabilization
   - Core architecture fixes
   - Testing foundation
   
   SPRINT 3-4 (Features - 2 Weeks):
   - Missing capability gaps
   - Agent framework completion
   - Integration improvements
   
   SPRINT 5-6 (Polish - 2 Weeks):
   - UX improvements
   - Performance optimization
   - Documentation

2. Define success criteria per sprint
3. Identify blockers and dependencies
4. Estimate team capacity needed

OUTPUT: AUDIT_REMEDIATION_ROADMAP.md with:
- Sprint-by-sprint plan
- Task breakdown structure
- Resource requirements
- Risk mitigation strategies
```

---

## Phase 18: White-Label Readiness Assessment

**Objective**: Assess platform's clone-ability for white-label.

```
TASKS:
1. Branding Extraction:
   - Hardcoded brand names
   - Logo/image references
   - Color theme locations
   - Font configurations
   
2. Configuration Externalization:
   - What's in code vs env vars?
   - What needs tenant config UI?
   - What needs admin config?
   
3. API Key Isolation:
   - Which integrations need per-tenant keys?
   - Which can be shared?
   - Key rotation support?
   
4. Deployment Isolation:
   - Shared infra risks
   - Data isolation verification
   - Custom domain support

OUTPUT: AUDIT_WHITELABEL_READINESS.md with:
- Extraction checklist
- Configuration matrix
- Deployment topology options
- Go-to-market blockers
```

---

# PART E: REPOSITORY HYGIENE & ARCHIVE

## Phase 19: Dead File & Folder Inventory

**Objective**: Identify ALL files/folders not required to run the platform.

```
TASKS:
1. Scan root directory for non-essential files:
   - Old audit files (AUDIT_*.md in root)
   - Test result dumps (*.json test outputs)
   - SQL scripts (clear-mock-data.sql, etc)
   - PowerShell scripts (test_*.ps1, update_*.ps1)
   - Temp files (NUL, temp/, *.log)
   - Old specs (*.yaml that aren't active)
   - Duplicate/versioned files

2. Identify documentation that's outdated:
   - Compare docs/ against actual codebase
   - Find docs referencing deleted features
   - Find docs with wrong file paths
   - Identify redundant overlapping docs

3. Find dead code directories:
   - apps/ folders not in active deployment
   - packages/ not imported by any app
   - functions/ if not being deployed
   - airflow*/ if not using Airflow
   - postman/ if tests not running

4. Scan for orphaned config files:
   - .env.example vs actual .env needs
   - Config files for removed features
   - Docker files for unused services
   - CI/CD configs not in use

5. Check templates/ and scripts/:
   - Which are actively used?
   - Which are one-time setup?
   - Which are obsolete?

OUTPUT: AUDIT_DEAD_FILES.md with:
- Complete inventory of non-essential files
- Categorized: DELETE / ARCHIVE / KEEP
- Reasoning for each decision
```

---

## Phase 20: Repository Cleanup Execution Plan

**Objective**: Create actionable cleanup with archive strategy.

```
TASKS:
1. Create archive structure:
   /archive/
   ├── docs-legacy/          # Outdated documentation
   ├── scripts-legacy/       # One-time/old scripts
   ├── audit-history/        # Old audit files
   ├── experiments/          # POC code never shipped
   └── postman-backup/       # If not actively used

2. Categorize files for action:

   IMMEDIATE DELETE (no value):
   - NUL files
   - .DS_Store, Thumbs.db
   - *.log files
   - node_modules (should be gitignored)
   - .next, dist, build outputs
   - Temp test outputs

   ARCHIVE (historical value):
   - Old audit documents
   - Legacy documentation
   - One-time migration scripts
   - Setup scripts already run
   - Old API specs

   CONSOLIDATE (merge duplicates):
   - Multiple README files
   - Overlapping docs
   - Duplicate configs

   KEEP (required for platform):
   - All apps/* code
   - All packages/* code
   - Active functions/* (if deploying)
   - nx.json, package.json, pnpm-*
   - tsconfig files
   - Active docs (ARCHITECTURE, DEPLOYMENT)
   - .env.example files

3. Generate cleanup commands:
   - Git mv commands for archive
   - Rm commands for delete
   - Update .gitignore

4. Update documentation references:
   - Fix broken links in remaining docs
   - Update README to reflect cleanup
   - Create docs/INDEX.md for navigation

OUTPUT: AUDIT_CLEANUP_PLAN.md with:
- File-by-file action list
- Git commands to execute
- Post-cleanup verification steps
```

---

## Phase 21: Lean Repository Validation

**Objective**: Verify platform still works after cleanup.

```
TASKS:
1. Pre-cleanup checklist:
   - [ ] All changes committed
   - [ ] Branch created for cleanup
   - [ ] Build passes
   - [ ] Tests pass

2. Post-cleanup validation:
   - [ ] pnpm install succeeds
   - [ ] nx build api succeeds
   - [ ] nx build front succeeds
   - [ ] All imports resolve
   - [ ] No broken references
   - [ ] Docs still render

3. Update root README with:
   - Lean folder structure
   - Clear "what goes where"
   - Archive location noted

4. Create CONTRIBUTING.md with:
   - Where to add new files
   - What NOT to add to root
   - Documentation standards
   - Cleanup expectations

OUTPUT: Repository with:
- Clean root (max 10-15 essential files)
- Clear folder structure
- /archive/ for historical items
- Updated documentation
```

---

# EXECUTION CHECKLIST

```markdown
## Audit Execution Progress

### Part A: Architecture & Infrastructure
- [ ] Phase 1: Repository Cartography
- [ ] Phase 2: Database & Schema Archaeology
- [ ] Phase 3: API Surface Audit
- [ ] Phase 4: Frontend Component Audit
- [ ] Phase 5: Agent Framework Deep Dive
- [ ] Phase 6: Integration Audit
- [ ] Phase 7: Security & Compliance Audit
- [ ] Phase 8: Infrastructure Gap Analysis

### Part B: Capabilities & Capacity
- [ ] Phase 9: Feature Capability Matrix
- [ ] Phase 10: Capacity & Scalability Audit
- [ ] Phase 11: Technical Debt Inventory

### Part C: Cognitive UX & Mental Model
- [ ] Phase 12: User Journey Mapping
- [ ] Phase 13: Information Architecture Audit
- [ ] Phase 14: Cognitive Load Assessment
- [ ] Phase 15: Operational Burden Analysis

### Part D: Gap Analysis & Remediation
- [ ] Phase 16: Priority Gap Matrix
- [ ] Phase 17: Remediation Roadmap
- [ ] Phase 18: White-Label Readiness Assessment
```

---

# OUTPUT FILE STRUCTURE

After completing the audit, the following files should exist:

```
/audit/
├── AUDIT_REPO_MAP.md
├── AUDIT_DATA_LAYER.md
├── AUDIT_API_SURFACE.md
├── AUDIT_FRONTEND_ARCHITECTURE.md
├── AUDIT_AGENT_FRAMEWORK.md
├── AUDIT_INTEGRATIONS.md
├── AUDIT_SECURITY.md
├── AUDIT_INFRASTRUCTURE.md
├── AUDIT_CAPABILITY_MATRIX.md
├── AUDIT_CAPACITY.md
├── AUDIT_TECH_DEBT.md
├── AUDIT_USER_JOURNEYS.md
├── AUDIT_INFORMATION_ARCHITECTURE.md
├── AUDIT_COGNITIVE_LOAD.md
├── AUDIT_OPS_BURDEN.md
├── AUDIT_GAP_MATRIX.md
├── AUDIT_REMEDIATION_ROADMAP.md
├── AUDIT_WHITELABEL_READINESS.md
└── AUDIT_EXECUTIVE_SUMMARY.md
```

---

# KNOWN CONTEXT (FROM PRIOR ANALYSIS)

## Current State Summary

### ✅ Working Systems
- Gianna AI Agent (19 files, 8 personality archetypes)
- Sabrina SDR Agent (email prioritization)
- Multi-tenant workspace isolation
- Lead import/enrichment pipeline
- SMS/Voice via SignalHouse
- Basic campaign management

### ⚠️ Partial/Degraded
- LUCI Agent (config exists, no scheduler)
- DO Functions (code exists, not deployed)
- homeowner-advisors app (no API service)
- Monitoring (minimal)

### ❌ Missing/Broken
- Agent orchestration router
- Job scheduler for LUCI
- Redis caching layer
- High availability database
- Proper observability stack
- White-label configuration UI
- Usage metering/billing

### 🔴 Critical Issues
- NODE_TLS_REJECT_UNAUTHORIZED=0 in production
- Both apps on 512MB RAM (insufficient)
- Shared PostgreSQL (no failover)
- No rate limiting on many endpoints

---

# FINAL INSTRUCTIONS

1. **Execute phases sequentially** - each builds on prior context
2. **Create output files** - don't just respond, persist findings
3. **Be thorough** - read actual files, don't assume
4. **Prioritize ruthlessly** - not everything needs fixing today
5. **Think white-label** - every finding through lens of "can I clone this?"
6. **Think user** - every finding through lens of "does this confuse people?"
7. **Think operator** - every finding through lens of "is this a maintenance burden?"

**The goal is a platform that is:**
- Rock solid for Nextier (your brand)
- Clone-ready for white-label clients
- Intuitive for end users
- Low-maintenance for operators
- Secure by default
- Scalable by design

---

*Generated: December 2024*
*Platform: Nextier / OutreachGlobal*
*Version: Mega Audit Prompt v1.0*
