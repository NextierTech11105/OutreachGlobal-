# 🏛️ STABILITY MAP: What Must Stay Stable vs What Can Stay Messy

> **Philosophy:** Stability where money flows. Flexibility where iteration happens.

---

## 🔴 CRITICAL PATH — MUST STAY STABLE (Break = Money Loss / Data Loss)

These components are **load-bearing walls**. Breaking them = immediate revenue impact or data corruption.

### 1. **Database Schema (Source of Truth)**
```
apps/api/src/database/schema/          ← AUTHORITATIVE (API owns schema)
├── leads.schema.ts                    ← Core entity, 100% stable
├── teams.schema.ts                    ← Multi-tenant isolation, 100% stable
├── campaigns.schema.ts                ← Revenue path, 100% stable
├── signalhouse.schema.ts              ← 10DLC compliance, 100% stable
└── users.schema.ts                    ← Auth foundation, 100% stable

apps/front/src/lib/db/schema.ts        ← MIRROR (must match API schema exactly)
```

**Why Critical:**
- Schema changes require migrations
- Data loss is permanent
- All features depend on data model
- Multi-tenant isolation (teamId) is non-negotiable

**Stability Rule:** NO schema changes without migration script AND rollback plan.

---

### 2. **Lead Lifecycle State Machine**
```
Lead Status Flow:
new → contacted → engaged → qualified → proposal → deal → closed_won/closed_lost
         ↓           ↓          ↓
      ghost      not_interested  stalled
```

**Tables:**
- `leads` (status field)
- `campaign_attempts` (tracks all touches)
- `sms_messages` / `call_logs` (communication history)

**Why Critical:**
- All workflows depend on lead status
- Campaign targeting uses status
- Reports aggregate by status
- Breaking this = broken pipelines

---

### 3. **SignalHouse Integration (Revenue Path)**
```
apps/front/src/lib/signalhouse/client.ts   ← API wrapper
apps/api/src/database/schema/signalhouse.schema.ts
├── signalhouseBrands      ← 10DLC brand registration
├── signalhouseCampaigns   ← 10DLC campaign registration  
└── teamPhoneNumbers       ← Provisioned numbers per team
```

**Why Critical:**
- SMS = primary outreach channel
- 10DLC compliance = legal requirement
- Phone number provisioning = costs money
- Message delivery = revenue

**Stability Rule:** Test in dev before any change. Never mock in prod.

---

### 4. **Multi-Tenant Isolation (teamId)**
```typescript
// EVERY query MUST include teamId filter
SELECT * FROM leads WHERE team_id = :teamId  ← REQUIRED

// Tables with teamId (NEVER remove):
leads, campaigns, buckets, deals, sms_messages, call_logs,
campaign_attempts, team_phone_numbers, signalhouse_brands
```

**Why Critical:**
- Data leakage = security breach
- Legal liability
- Trust destruction

**Stability Rule:** NEVER allow cross-tenant queries. Always filter by teamId.

---

### 5. **Authentication & Authorization**
```
apps/api/src/database/schema/users.schema.ts
apps/api/src/database/schema/teams.schema.ts
├── teams
├── team_members  
└── team_invitations
```

**Why Critical:**
- User identity = everything
- Team membership = access control
- Breaking auth = system unusable

---

### 6. **Billing & Payments (Stripe Integration)**
```
Front Schema Tables:
├── plans           ← Pricing tiers
├── subscriptions   ← Active subscriptions
├── usage          ← Feature usage per period
├── usage_events   ← Granular usage tracking
├── invoices       ← Billing documents
└── payments       ← Payment transactions

Stripe Fields (NEVER change names):
├── stripeCustomerId
├── stripeSubscriptionId
├── stripePriceIdMonthly
├── stripePaymentIntentId
└── stripeInvoiceId
```

**Why Critical:**
- Wrong charge = refund + reputation damage
- Lost subscription = lost customer
- Stripe webhook mishandling = billing chaos

---

### 7. **Campaign Attempts (TCPA Compliance)**
```
campaign_attempts table:
├── leadId, teamId           ← Links
├── campaignContext          ← initial | retarget | follow_up | nurture
├── campaignType             ← initial | nudger | nurture (ML label)
├── attemptNumber            ← Which attempt (1, 2, 3...)
├── totalAttemptsSinceInception ← Cumulative for ML
├── channel                  ← sms | dialer | email
├── status                   ← queued | sent | delivered | failed
├── scheduledAt, sentAt      ← Timestamps (UTC)
└── mlLabels                 ← Full context for training
```

**Why Critical:**
- TCPA violations = $500-$1,500 per message fine
- Must track opt-outs
- Must have audit trail
- ML training needs consistent labels

---

## 🟡 IMPORTANT — SHOULD BE CLEAN (Break = Degraded Experience)

These affect user experience but won't lose money or data immediately.

### 1. **API Routes (Contracts)**
```
apps/front/src/app/api/
├── leads/         ← CRUD operations
├── campaigns/     ← Campaign management
├── signalhouse/   ← SMS operations
├── luci/          ← Data AI pipelines
└── gianna/        ← AI SDR

Rule: Don't break request/response shapes without versioning.
```

### 2. **Core UI Pages (Workflow Critical)**
```
apps/front/src/app/t/[team]/
├── calendar/          ← Appointment scheduling
├── sms-queue/         ← Message queue management
├── automation-rules/  ← Campaign automation
├── library/           ← Content templates
└── campaigns/         ← Campaign management
```

### 3. **Response Classifications**
```
apps/front/src/lib/response-classifications.ts
├── Classification categories
├── Email capture detection
├── CATHY templates
└── Auto-tagging rules
```

### 4. **LLM Service**
```
apps/front/src/lib/services/llm-service.ts
├── Provider switching (OpenAI, Anthropic, Google)
├── Temperature settings
└── Fallback logic
```

---

## 🟢 CAN STAY MESSY — ITERATE FREELY (Break = Minor Friction)

These are non-critical and can be refactored freely.

### 1. **Documentation**
```
docs/                    ← Can be outdated
├── *.md files          
└── Architecture docs   
```

### 2. **Admin/Dev Tools**
```
apps/front/src/app/api/
├── dev/           ← Development utilities
├── admin/         ← Admin dashboards
└── health/        ← Health checks (nice to have)

scripts/           ← Build/deploy scripts
```

### 3. **UI Components (Non-Critical)**
```
apps/front/src/components/
├── Charts, graphs
├── Analytics dashboards  
├── Settings panels
└── Help/docs UI
```

### 4. **Experimental Features**
```
apps/front/src/app/api/
├── copilot/       ← AI experiments
├── machine/       ← Experimental automation
└── neva/          ← New AI features
```

### 5. **Legacy/Deprecated**
```
Any file with:
├── "// DEPRECATED"
├── "// TODO: Remove"
└── "// Legacy compatibility"
```

### 6. **Tests (Can Be Incomplete)**
```
*.spec.ts, *.test.ts
└── Good to have, not blocking
```

### 7. **Styling/CSS**
```
All Tailwind classes, theme files
└── Visual only, iterate freely
```

---

## 📊 STABILITY DECISION MATRIX

| Component | Break Impact | Recovery Time | Stability Required |
|-----------|-------------|---------------|-------------------|
| Database Schema | 💀 Data loss | Days-weeks | 🔴 CRITICAL |
| Lead Lifecycle | 💰 Revenue loss | Hours | 🔴 CRITICAL |
| SignalHouse API | 💰 SMS down | Hours | 🔴 CRITICAL |
| Tenant Isolation | ⚖️ Legal | Immediate | 🔴 CRITICAL |
| Auth/Users | 🚫 System down | Hours | 🔴 CRITICAL |
| Billing/Stripe | 💰 Charge errors | Hours | 🔴 CRITICAL |
| Campaign Attempts | ⚖️ TCPA risk | Days | 🔴 CRITICAL |
| API Contracts | 😤 Broken features | Hours | 🟡 IMPORTANT |
| Core UI Pages | 😤 Workflow blocked | Hours | 🟡 IMPORTANT |
| LLM Service | 🤖 AI degraded | Minutes | 🟡 IMPORTANT |
| Docs | 📖 Confusion | Never | 🟢 FLEXIBLE |
| Admin Tools | 🔧 Inconvenience | Whenever | 🟢 FLEXIBLE |
| Experiments | 🧪 Learning loss | Never | 🟢 FLEXIBLE |

---

## 🔧 CHANGE MANAGEMENT RULES

### For 🔴 CRITICAL Components:
1. **Never change** column names in database without migration
2. **Always test** with real data in staging
3. **Require code review** from 2+ people
4. **Have rollback plan** before deploy
5. **Monitor for 24hrs** after changes

### For 🟡 IMPORTANT Components:
1. **Test locally** before PR
2. **One review** required
3. **Can hotfix** if broken

### For 🟢 FLEXIBLE Components:
1. **Ship it** — iterate fast
2. **Fix forward** if broken
3. **Refactor freely**

---

## 📁 FILE OWNERSHIP

```
CRITICAL (API Team Owns):
apps/api/src/database/schema/*.schema.ts

CRITICAL (Shared Ownership):
apps/front/src/lib/db/schema.ts           ← Must sync with API
apps/front/src/lib/signalhouse/client.ts  ← Integration layer

IMPORTANT (Feature Teams):
apps/front/src/app/api/*/route.ts         ← API routes
apps/front/src/app/t/[team]/*/page.tsx    ← Core pages

FLEXIBLE (Anyone):
docs/*, scripts/*, components/*
```

---

## 🚨 RED FLAGS — Stop and Think

If you're about to:
- ❌ Add/remove/rename a column in a schema file
- ❌ Change the `teamId` filtering logic
- ❌ Modify SignalHouse API calls
- ❌ Touch Stripe integration code
- ❌ Change lead status values
- ❌ Modify campaign_attempts structure

**STOP.** Get a second opinion. Test in staging. Have a rollback plan.

---

## ✅ GREEN FLAGS — Ship It

If you're:
- ✅ Updating documentation
- ✅ Changing UI styling
- ✅ Adding new experimental features behind flags
- ✅ Refactoring admin/dev tools
- ✅ Improving error messages
- ✅ Adding analytics/logging

**Ship it.** Move fast. Fix forward if needed.
