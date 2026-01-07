# CAMPAIGN ID MAPPING AUDIT
## Nextier ↔ SignalHouse Data Integrity Analysis
**Date:** 2026-01-06
**Role:** Architecture & Data Integrity Auditor - SMS Campaign Isolation

---

# EXECUTIVE SUMMARY

## 🔴 CRITICAL FINDING: BROKEN ISOLATION MODEL

The campaign isolation model has **THREE CRITICAL GAPS**:

1. **NO SignalHouse Campaign ID on Campaigns Table** - Individual campaigns have NO direct link to SignalHouse
2. **Direct Messages Skip Campaign Enforcement** - Users can send SMS without any campaign association
3. **Campaign SMS Doesn't Validate Lead Membership** - System sends SMS even if lead isn't enrolled

**Risk Level:** HIGH - Messages can be orphaned, cross-contaminated, and misattributed.

---

# 🗺️ ID MAPPING SCHEMA

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            SIGNALHOUSE MASTER ACCOUNT                        │
│              (company_admin API key)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ 1:1
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXTIER TENANT                                  │
│  └── signalhouse_subgroup_id (tenant isolation)             │
└─────────────────────────┬───────────────────────────────────┘
                          │ 1:1
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXTIER TEAM                                    │
│  ├── signalhouse_subgroup_id                                │
│  ├── signalhouse_brand_id                                   │
│  ├── signalhouse_campaign_ids  ← JSON Array                 │
│  └── signalhouse_phone_pool    ← JSON Array                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ 1:Many
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         NEXTIER CAMPAIGNS (NO SH ID!)                        │
│  ├── id (internal ULID)                                     │
│  ├── teamId (FK to teams)                                   │
│  └── [NO signalhouse_campaign_id column]                    │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Mapping

| Internal Entity | SignalHouse Field | Storage Level | Indexed? |
|-----------------|-------------------|---------------|----------|
| Tenant | `signalhouse_subgroup_id` | tenants table | ✅ Yes |
| Team | `signalhouse_subgroup_id` | teams table | ✅ Yes |
| Team | `signalhouse_brand_id` | teams table | ❌ No |
| Team | `signalhouse_campaign_ids` | teams table (JSONB) | ❌ No |
| Team | `signalhouse_phone_pool` | teams table (JSONB) | ❌ No |
| **Campaign** | **NONE** | **N/A** | ⚠️ **MISSING** |

## The Problem

```typescript
// teams.schema.ts - SignalHouse mapping at TEAM level
signalhouseCampaignIds: jsonb("signalhouse_campaign_ids").$type<string[]>()

// campaigns.schema.ts - NO SignalHouse mapping
// NO signalhouse_campaign_id column exists!
```

**Impact:** Cannot determine which SignalHouse campaign ID corresponds to which Nextier campaign.

---

# 🚧 ISOLATION MECHANICS

## Outbound Strictness

### Path 1: Campaign Sequence (Automated)

| Check | Enforced? | Location |
|-------|-----------|----------|
| campaignId in job data | ✅ Yes | campaign-sequence.consumer.ts:67 |
| Lead membership validated | ❌ **NO** | Missing validation |
| OutboundGate check | ✅ Yes | campaign-sequence.consumer.ts:88 |
| SignalHouse campaign passed | ❌ **NO** | Not included in Twilio call |

```typescript
// CRITICAL GAP: No lead membership check
const lead = await this.db.query.leads.findFirst({
  where: (t) => eq(t.id, leadId),  // Just finds lead
});
// Should also check: campaignLeads.where(campaignId, leadId)
```

### Path 2: Direct Message (Manual)

| Check | Enforced? | Location |
|-------|-----------|----------|
| campaignId mandatory | ❌ **NO** | Always NULL |
| leadId mandatory | ❌ **NO** | Optional |
| OutboundGate check | ❌ **NO** | Not called |
| Team ownership | ✅ Yes | message.resolver.ts:40 |

```typescript
// message.service.ts - campaignId NEVER populated
const value: MessageInsert = {
  campaignId: null,  // Always null for direct messages!
};
```

## Inbound Routing Strategy

| Method | Used? | Reliability |
|--------|-------|-------------|
| Phone number to AI Worker | ✅ Yes | Medium - routes by receiving number |
| SignalHouse `campaign_id` in payload | ✅ Yes | Low - can be missing |
| Phone assignment reverse lookup | ❌ No | Not implemented |
| Lead → campaign_leads lookup | ❌ No | Not implemented |

```typescript
// signalhouse/route.ts - Relies on webhook payload
campaignId: payload.campaign_id as string  // Can be undefined!
```

## Orphan Risk Assessment

| Scenario | Orphan Created? | Impact |
|----------|-----------------|--------|
| Direct message without campaignId | ✅ YES | Message has no campaign parent |
| SignalHouse payload missing campaign_id | ✅ YES | Inbound reply not attributed |
| Gianna conversational SMS | ✅ YES | Not stored to DB at all |
| Voice callback | ✅ YES | No campaign attribution on calls |
| Campaign deleted | ✅ YES | Inbox items become NULL (SET NULL) |

---

# 🔄 NEXTIER → SIGNALHOUSE DATA FLOW

## Current Flow (Broken)

```
1. SELECTION: User selects Campaign X in UI
   └── Campaign X has: id='camp_abc123', teamId='team_xyz'

2. LOOKUP: System should fetch SignalHouse ID
   └── ❌ BROKEN: No signalhouse_campaign_id on campaigns table!
   └── ❌ System fetches team.signalhouseCampaignIds (array)
   └── ❌ No mapping to determine which array element = this campaign

3. DISPATCH: API sends to Twilio (NOT SignalHouse!)
   └── twilioService.sendSms({ from, to, body })
   └── ❌ No campaign_id parameter passed
   └── ❌ No SignalHouse context included

4. LOGGING: System saves to DB
   └── ✅ campaignExecutionsTable gets campaignId (internal)
   └── ❌ No external campaign_id tracked
```

## Expected Flow (Not Implemented)

```
1. SELECTION: User selects Campaign X
   └── Campaign X has: signalhouse_campaign_id='SH-789'

2. LOOKUP: System fetches SH ID
   └── campaign.signalhouseCampaignId = 'SH-789'

3. DISPATCH: API sends to SignalHouse
   └── signalhouseService.sendSMS({
         to, from, body,
         campaign_id: 'SH-789',  // ← Tracked externally
         subgroup_id: team.signalhouseSubGroupId
       })

4. LOGGING: System saves with external ID
   └── messages.signalhouseCampaignId = 'SH-789'
   └── Can reconcile with SignalHouse analytics
```

---

# 📊 CAMPAIGN ANALYTICS INTEGRITY

## Response Rate Calculation

### Current Implementation

```sql
-- How responses SHOULD be counted
SELECT
  COUNT(*) as total_sent,
  SUM(CASE WHEN has_response THEN 1 ELSE 0 END) as responses
FROM campaign_executions
WHERE campaign_id = $campaignId;
```

### The Problem

```sql
-- But inbox_items.campaign_id can be NULL
SELECT * FROM inbox_items
WHERE campaign_id = 'camp_abc123'  -- Misses orphan replies!
  AND classification = 'POSITIVE';

-- Orphan replies counted globally, not per-campaign
SELECT * FROM inbox_items
WHERE campaign_id IS NULL  -- These should belong to SOME campaign
  AND lead_id IN (SELECT lead_id FROM campaign_leads WHERE campaign_id = 'camp_abc123');
```

### Stats Bleed Risk

| Scenario | Campaign A | Campaign B | Actual |
|----------|------------|------------|--------|
| Lead in both campaigns replies | +1 | +1 | Should be +1 to sender campaign only |
| Orphan reply (no campaign_id) | 0 | 0 | Lost data |
| Voice callback | 0 | 0 | Never attributed |

---

# ⚠️ ATTACK VECTORS

## Vector 1: Cross-Campaign Lead Messaging

```graphql
# Attacker sends SMS to lead in different team's campaign
mutation {
  createMessage(
    teamId: "attacker-team"
    leadId: "victim-lead-id"  # Not validated against team
    type: SMS
    input: { toAddress: "+1555...", body: "Phishing" }
  )
}
```

**Bypasses:**
- Lead ownership not checked
- Campaign membership not validated
- OutboundGate not called

## Vector 2: Campaign Sequence Injection

```typescript
// Malicious job injected to queue
await queue.add({
  name: "PROCESS_NEXT",
  data: {
    teamId: "valid-team",
    campaignId: "valid-campaign",
    leadId: "any-lead-in-system",  // Not enrolled in campaign
    position: 1
  }
});
```

**Bypasses:**
- Lead membership never checked
- Any lead receives SMS from any campaign

---

# 🔧 REMEDIATION PLAN

## Priority 1: CRITICAL (Immediate)

### 1.1 Add campaign-lead validation to sequence consumer

```typescript
// campaign-sequence.consumer.ts - Line 104
const campaignLead = await this.db.query.campaignLeads.findFirst({
  where: and(
    eq(campaignLeadsTable.campaignId, sequence.campaignId),
    eq(campaignLeadsTable.leadId, leadId),
  ),
});

if (!campaignLead || campaignLead.status !== "ACTIVE") {
  this.logger.warn(`Lead ${leadId} not enrolled in campaign`);
  return;  // Block send
}
```

### 1.2 Add OutboundGate to direct messages

```typescript
// message.service.ts - Before sending
if (options.leadId) {
  const gateCheck = await this.outboundGate.canContact(options.leadId, channel);
  if (!gateCheck.allowed) {
    throw new ForbiddenException(`Cannot send: ${gateCheck.reason}`);
  }
}
```

### 1.3 Add lead ownership validation

```typescript
// message.service.ts - Validate lead belongs to team
if (options.leadId) {
  const lead = await this.leadService.findOne({
    id: options.leadId,
    teamId: options.teamId,  // Must match
  });
  if (!lead) throw new NotFoundException("Lead not found in team");
}
```

## Priority 2: HIGH (This Week)

### 2.1 Add signalhouse_campaign_id to campaigns table

```sql
ALTER TABLE campaigns
ADD COLUMN signalhouse_campaign_id VARCHAR;

CREATE INDEX campaigns_sh_idx ON campaigns(signalhouse_campaign_id);
```

### 2.2 Pass campaign context to SignalHouse

```typescript
// Use SignalHouse API instead of Twilio for campaigns
await this.signalhouseService.sendSMS({
  to: lead.phone,
  from: settings.phoneNumber,
  body: content,
  campaign_id: campaign.signalhouseCampaignId,  // External tracking
  subgroup_id: team.signalhouseSubGroupId,
});
```

### 2.3 Add phone assignment reverse lookup

```typescript
// Inbound attribution fallback
if (!payload.campaign_id) {
  const assignment = await db.query.campaignPhoneAssignments.findFirst({
    where: eq(campaignPhoneAssignments.phoneNumber, toNumber)
  });
  campaignId = assignment?.campaignId || null;
}
```

## Priority 3: MEDIUM (This Month)

### 3.1 Store Gianna conversations to DB

```typescript
// gianna/sms-webhook/route.ts - Persist to database
await db.insert(messages).values({
  teamId,
  leadId: lead.id,
  campaignId: lookupCampaignFromLead(lead.id),
  body: messageBody,
  direction: "inbound",
});
```

### 3.2 Add voice call campaign attribution

```typescript
// voice.service.ts - Lookup campaign from lead
const campaignLead = await db.query.campaignLeads.findFirst({
  where: eq(campaignLeadsTable.leadId, lead.id),
  orderBy: desc(campaignLeadsTable.createdAt),  // Most recent
});

await db.insert(inboxItems).values({
  leadId: lead.id,
  campaignId: campaignLead?.campaignId || null,  // Now attributed
});
```

### 3.3 Make campaign_id NOT NULL where appropriate

```sql
-- For campaign_executions (always has campaign context)
ALTER TABLE campaign_executions
ALTER COLUMN campaign_id SET NOT NULL;

-- For messages from campaigns (add constraint)
-- Keep NULL allowed for direct messages but track separately
```

---

# 📋 SUMMARY TABLE

| Component | Current State | Required State | Gap Severity |
|-----------|---------------|----------------|--------------|
| Campaign → SH ID mapping | ❌ None | 1:1 column | CRITICAL |
| Direct message campaign enforcement | ❌ None | Mandatory or tagged | CRITICAL |
| Campaign sequence lead validation | ❌ None | Check membership | CRITICAL |
| Inbound campaign attribution | ⚠️ Payload-dependent | Phone lookup fallback | HIGH |
| OutboundGate on direct messages | ❌ Not called | Must be enforced | CRITICAL |
| Gianna SMS persistence | ❌ In-memory only | DB storage | HIGH |
| Voice call attribution | ❌ None | Campaign lookup | MEDIUM |
| Analytics campaign filtering | ⚠️ Partial | Handle orphans | MEDIUM |

---

# 📁 FILES REVIEWED

| File | Purpose | Issues Found |
|------|---------|--------------|
| `teams.schema.ts` | Team-level SH mapping | SH IDs at wrong level |
| `campaigns.schema.ts` | Campaign schema | Missing SH campaign ID |
| `message.service.ts` | Direct message sending | No campaign enforcement |
| `campaign-sequence.consumer.ts` | Campaign SMS | No lead membership check |
| `signalhouse/route.ts` | Inbound SMS | Relies on payload only |
| `gianna/sms-webhook/route.ts` | Conversational SMS | Not persisted |
| `voice.service.ts` | Voice handling | No campaign attribution |
| `inbox.schema.ts` | Inbox storage | Allows NULL campaign |

---

*Campaign ID Mapping Audit Complete*
