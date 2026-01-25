---
name: signalhouse-integration
description: SMS/MMS delivery and webhook ingestion via SignalHouse.
---

# SignalHouse Integration

> **Status**: PRODUCTION
> **Location**: `apps/api/src/lib/signalhouse/` and `apps/api/src/app/lead/controllers/`
> **Primary Function**: Send SMS/MMS and ingest inbound SignalHouse webhooks.

## Overview
SignalHouse is the SMS transport for Nextier. The integration includes a service for sending messages, a controller for internal API proxy calls, and a webhook handler for inbound responses and delivery events.

## Verified Code References
- `apps/api/src/lib/signalhouse/signalhouse.service.ts`
- `apps/api/src/lib/signalhouse/signalhouse.module.ts`
- `apps/api/src/app/lead/controllers/signalhouse.controller.ts`
- `apps/api/src/app/lead/controllers/signalhouse-webhook.controller.ts`
- `apps/api/src/app/inbox/services/agent-router.service.ts`

## Current State

### What Already Exists
- SMS/MMS sending with campaign ID support
- Internal proxy endpoints for test/config/send/stats
- Webhook handler that classifies inbound SMS and routes to agents
- Inbox item creation for inbound messages

### What Still Needs to be Built
- Automated 10DLC provisioning workflows
- Full number pool management and UI
- Retry and DLQ handling for webhook processing failures

## Nextier-Specific Example
```typescript
// apps/api/src/lib/signalhouse/signalhouse.service.ts
const endpoint = mediaUrl
  ? `${this.apiBase}/message/sendMMS`
  : `${this.apiBase}/message/sendSMS`;

const payload: Record<string, string> = { to, from, message };
if (mediaUrl) payload.mediaUrl = mediaUrl;
if (campaignId) payload.campaign_id = campaignId;

const response = await axios.post(endpoint, payload, {
  headers: {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  },
});
```

## Integration Points
| Skill | Integration Point |
| --- | --- |
| `gianna-sdr-agent` | Outbound SMS send and message logging |
| `ai-co-pilot-response-generator` | Auto-respond uses SignalHouse sendSms |
| `lead-state-manager` | Webhook-driven state transitions |
| `lead-journey-tracker` | Inbound events populate journey history |
| `campaign-optimizer` | Campaign execution sends SMS via SignalHouse |

## Cost Information
- SignalHouse billing applies per message; costs are not stored in code.

## Multi-Tenant Considerations
- Webhook processing identifies the owning team by lead and phone mapping.
- Internal endpoints require JWT and should enforce team-level access.
