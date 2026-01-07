# SECURITY, INFRASTRUCTURE & TELEPHONY AUDIT
## OutreachGlobal Platform - RBAC, SignalHouse, Twilio Analysis
**Date:** 2026-01-06
**Role:** Security Architect & Telephony Infrastructure Lead

---

# PHASE 1: THE SECURITY MATRIX (Roles & Permissions)

## Role Hierarchy

| Role | Scope | Capabilities |
|------|-------|--------------|
| **OWNER** (TB) | Platform | God mode - billing, API keys, all teams |
| **ADMIN** | Team | Manage team settings, users, integrations |
| **MEMBER** | Team | Execute workflows, read data, send messages |

**Location:** `/packages/common/src/enums/team.enum.ts`

## Permission Model

Two-tier system via `TeamPolicy`:

```
READ Permission (any approved team member):
├── View leads, campaigns, messages
├── Query inbox items
├── See analytics
└── Launch campaigns ⚠️

MANAGE Permission (ADMIN + OWNER only):
├── Create/Update/Delete leads
├── Modify team settings
├── Configure integrations
└── Manage team members
```

## 🛡️ ROLES & ACCESS RISKS

| Action | Role Required | Vulnerability Status |
|--------|---------------|---------------------|
| View Leads | READ (any member) | 🟢 Secure |
| Create Lead | MANAGE (admin/owner) | 🟢 Secure |
| Delete Lead | MANAGE (admin/owner) | 🟢 Secure |
| **Launch Campaign** | READ (any member) | 🟡 OPEN - Any member can drain SMS budget |
| **Export Leads** | READ (pagination) | 🟡 OPEN - Can query all leads via GraphQL |
| Send SMS (manual) | READ (any member) | 🟡 OPEN - Can send to any phone |
| Modify Twilio Settings | MANAGE (admin/owner) | 🟢 Secure |
| Create API Key | AUTH (any authenticated) | 🟡 Missing tenant validation TODO |
| Access Billing | OWNER only | 🟢 Secure |

## Unprotected Endpoints

| Endpoint | Protection | Notes |
|----------|------------|-------|
| `POST /webhook/campaign` | Signature validation | SendGrid ECDSA |
| `POST /webhook/voice/inbound` | None (by design) | Twilio webhook |
| `POST /migrate` | AdminGuard (X-Admin-Key) | Internal only |
| `POST /createDemoKey` | None (intentional) | Public trial entry |

---

# PHASE 2: SIGNALHOUSE CAMPAIGN ARCHITECTURE

## Campaign SMS Flow

```
Lead Selection (LUCI Bucket / CSV)
    ↓
Campaign Created (campaignsTable)
    ↓
Leads Synced (campaign.consumer.ts → campaignLeadsTable)
    ↓
Sequence Queued (BullMQ: campaign-sequence)
    ↓
OutboundGate Check ← SUPPRESSION ENFORCEMENT
    ↓
TwilioService.sendSms() ← NOT SIGNALHOUSE
    ↓
campaignExecutionsTable (logged)
```

## 📡 CAMPAIGN INFRASTRUCTURE (SignalHouse)

### Brand/SubGroup Configuration

| Parameter | Status | Location |
|-----------|--------|----------|
| **brand_id** | DYNAMIC (per-tenant) | `teams.signalhouseSettings.brandId` |
| **sub_group_id** | DYNAMIC (per-tenant) | `tenants.signalhouseSubGroupId` |
| **Phone Pool** | DYNAMIC | `teams.signalhouseSettings.phonePool` |

**Live Config (NEXTIER):**
- Brand ID: `BZOYPIH`
- Sub Group ID: `S7ZI7S`
- Primary Phone: `15164079249`

### Opt-Out Mechanical Logic

**Status:** ✅ PASS - Strong enforcement

```typescript
// OutboundGateService checks BEFORE send:
const SUPPRESSION_SIGNALS = [
  "OPTED_OUT",       // STOP keyword
  "DO_NOT_CONTACT",  // Manual DNC
  "WRONG_NUMBER",    // Bad number
];

if (lead.leadState === "suppressed") → BLOCKED
if (hasSuppressionSignal) → BLOCKED
if (!lead.phone && channel === 'sms') → BLOCKED
```

**Enforcement Points:**
- Campaign sequence consumer (line 88)
- Content nurture consumer
- All outbound queues

### STOP Keyword Handling

| Aspect | Status | Notes |
|--------|--------|-------|
| Keywords defined | ✅ | STOP, UNSUBSCRIBE, CANCEL, END, QUIT |
| Local DB update | ⚠️ UNCLEAR | Webhook handler not found in audit scope |
| Signal creation | ✅ Schema exists | `OPTED_OUT` signal type in signals.schema |
| Inbox bucket | ✅ | Moves to `LEGAL_DNC` bucket |

**GAP:** SignalHouse inbound webhook handler (`/api/webhook/signalhouse`) referenced in docs but not found in codebase.

### Deliverability Routing

| Scenario | Handling |
|----------|----------|
| No phone | FAILED - "no phone" |
| Suppressed lead | BLOCKED - logged to campaignExecutions |
| Send error | FAILED - "sending failed" |
| Carrier rejection | ❌ NOT HANDLED - Twilio error not parsed |

---

# PHASE 3: TWILIO CONTACT CENTER SYNERGY

## 📞 CONTACT CENTER SYNERGY (Twilio)

### Global Dialer

| Aspect | Status |
|--------|--------|
| Persistent across nav | ✅ YES - Root layout `<CallStateProvider>` |
| Floating modal | ✅ YES - `<CallModal />` in layout.tsx |
| State preservation | ✅ YES - localStorage persistence |
| Minimizable | ✅ YES - Bottom-right corner |

### Token Management

| Parameter | Value |
|-----------|-------|
| Endpoint | `POST /api/twilio/token` |
| TTL | 1 hour (hardcoded) |
| Refresh | ❌ None - Must re-request |
| Grants | voice.incoming, voice.outgoing |
| Identity | "inbound-agent" (default) |

### Click-to-Call Latency

```
Click phone icon
    ↓ (immediate)
POST /api/twilio/click-to-call
    ↓ (100-300ms)
Twilio creates outbound call
    ↓ (network)
TwiML server routes call
    ↓
Recipient phone rings

Total: ~500ms from click to ring
```

### Activity Logging

| Event | Auto-Logged | Location |
|-------|-------------|----------|
| Inbound call | ✅ YES | inboxItemsTable (HOT priority) |
| Outbound click-to-call | ❌ TODO | Console only |
| Power dialer call | ❌ COMMENTED | callHistories creation disabled |
| Deal pipeline update | ❌ NO | No integration |

---

# PHASE 4: THE SYNERGY MATRIX

## Page-by-Page Communication Check

| Page | Missed Call Widget | SMS Unified | Click-to-SMS | Bulk SMS |
|------|-------------------|-------------|--------------|----------|
| **Dashboard** | ⚠️ Pending Replies badge only | N/A | N/A | N/A |
| **Inbox** | ✅ Inbound Call Panel | ⚠️ Partial (separate sources) | ✅ Via actions dropdown | ✅ Bulk select → SMS |
| **Deal Pipeline** | ❌ None | N/A | ❌ Must open modal | N/A |
| **Leads List** | ❌ None | N/A | ✅ Row action | ✅ Bulk select → SMS |
| **Lead Detail** | ❌ None | N/A | ✅ Button present | N/A |

## 🔗 INTEROPERABILITY SCORE

| Integration | Score | Notes |
|-------------|-------|-------|
| **Inbox Unification** | 🟡 60% | Both sources write to inboxItems, but no source indicator |
| **SignalHouse ↔ Twilio** | 🔴 30% | Campaign uses Twilio, not SignalHouse dispatch |
| **Call ↔ Deal Pipeline** | 🔴 10% | No auto-logging to deals |
| **SMS ↔ Campaign Tracking** | 🟡 50% | Campaigns track internally, manual SMS doesn't |

---

# SMS CONTROLLER TRACE

## Three SMS Dispatch Paths

### 1. Manual SMS (`createMessage` mutation)

```graphql
mutation createMessage(
  teamId: ID!        # Required - team context
  leadId: ID         # Optional - associate with lead
  type: SMS          # Required
  input: {
    toAddress: String!  # Phone number
    toName: String
    body: String!
  }
)
```

**Dispatcher:** `TwilioService.sendSms()`
**Campaign ID:** ❌ NONE
**Tracking:** messagesTable only

### 2. Campaign SMS (BullMQ Job)

```typescript
// Job: PROCESS_NEXT
{
  campaignId: string,  // Required
  leadId: string,      // Required
  position: number,    // Sequence step
  teamId: string       // Validated by tenant gate
}
```

**Dispatcher:** `TwilioService.sendSms()`
**Campaign ID:** ✅ YES - tracked in campaignExecutionsTable
**Tracking:** campaignExecutionsTable, campaignEventsTable

### 3. SignalHouse Direct (`POST /signalhouse/send`)

```json
{
  "to": "+1XXXXXXXXXX",
  "from": "+1XXXXXXXXXX",
  "message": "Hello",
  "mediaUrl": "optional"
}
```

**Dispatcher:** SignalHouse API
**Campaign ID:** ❌ NONE
**Tracking:** ❌ NONE - raw send

---

# CRITICAL FINDINGS

## Security Risks

1. **Any team MEMBER can launch campaigns** - Budget drain risk
2. **Lead export via pagination** - No bulk export but data accessible
3. **Manual SMS has no suppression check** - Can text opted-out leads
4. **API key creation lacks tenant validation** - TODO in code

## Infrastructure Gaps

1. **Campaign SMS uses Twilio, not SignalHouse** - 10DLC tracking mismatch
2. **No campaign_id in SMS metadata** - Can't trace SMS back to campaign via provider
3. **SignalHouse inbound webhook missing** - STOP handling unclear
4. **Token refresh not implemented** - 1-hour calls will fail

## Telephony Issues

1. **Outbound calls not logged to DB** - TODO in click-to-call
2. **Power dialer call history commented out** - Not persisting
3. **No deal pipeline integration** - Calls don't update deals
4. **Inbox doesn't show SMS source** - SignalHouse vs Twilio unclear

---

# RECOMMENDATIONS

## Immediate (Security)

1. Add MANAGE permission to `createCampaign` mutation
2. Add OutboundGate check to `MessageService.create()`
3. Implement API key tenant validation
4. Create SignalHouse inbound webhook handler

## Short-term (Infrastructure)

1. Route campaign SMS through SignalHouse (not Twilio) for 10DLC compliance
2. Add campaign_id to SMS metadata for provider tracking
3. Implement token refresh mechanism for long calls
4. Enable call history logging in power dialer

## Medium-term (Synergy)

1. Unify inbox with SMS source indicator
2. Auto-log calls to deal pipeline
3. Add missed call widget to dashboard
4. Enable click-to-SMS from kanban cards

---

*Security & Infrastructure Audit Complete*
