# SignalHouse.io SMS Integration Guide

Complete onboarding guide for SignalHouse SMS/MMS integration with OutreachGlobal.

---

## Table of Contents

1. [Overview](#overview)
2. [Account Setup](#account-setup)
3. [Getting API Credentials](#getting-api-credentials)
4. [10DLC Registration](#10dlc-registration)
5. [Buying Phone Numbers](#buying-phone-numbers)
6. [Configuring Webhooks](#configuring-webhooks)
7. [Sending Your First SMS](#sending-your-first-sms)
8. [Platform Features](#platform-features)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is SignalHouse?

SignalHouse is a modern SMS/MMS provider that offers:
- **Up to 80% cheaper** than Twilio
- **10DLC compliant** A2P messaging
- **Two-way messaging** with webhook support
- **Phone number provisioning** with local area codes
- **MMS support** for media messages
- **Real-time analytics** and delivery tracking

### Why SignalHouse for OutreachGlobal?

| Feature | Benefit |
|---------|---------|
| Cost | $0.005-0.01 per SMS segment (vs $0.0075+ Twilio) |
| 10DLC | Built-in compliance for business messaging |
| Throughput | Up to 3,600 messages/minute per campaign |
| Integration | REST API with webhook callbacks |

---

## Account Setup

### Step 1: Create SignalHouse Account

1. Go to [https://app.signalhouse.io/signup](https://app.signalhouse.io/signup)
2. Enter your business email and create password
3. Verify your email address
4. Complete the business profile:
   - Legal company name
   - DBA (if applicable)
   - Business address
   - Tax ID (EIN) - required for 10DLC

### Step 2: Add Funds to Wallet

SignalHouse uses prepaid credits:

1. Navigate to **Wallet** → **Add Funds**
2. Minimum deposit: $25
3. Recommended starting balance: $100-500

### Pricing Overview

| Service | Cost |
|---------|------|
| SMS Outbound | $0.005-0.01/segment |
| SMS Inbound | $0.005/message |
| MMS Outbound | $0.015-0.02/message |
| Phone Number | $1.50-2.00/month |
| 10DLC Brand | $4/month |
| 10DLC Campaign | $10 one-time |

---

## Getting API Credentials

### Step 1: Generate API Key

1. Log into [SignalHouse Dashboard](https://app.signalhouse.io)
2. Go to **Settings** → **API Keys**
3. Click **Generate New Key**
4. Copy and save:
   - **API Key** (64 characters): `b63df419c4c90433...`
   - **Auth Token** (JWT): `eyJhbGciOiJIUzI1NiIs...`

### Step 2: Configure in OutreachGlobal

Add these environment variables to your deployment:

```bash
# SignalHouse Credentials
SIGNALHOUSE_API_KEY=your_api_key_here
SIGNALHOUSE_AUTH_TOKEN=your_jwt_token_here
```

### For DigitalOcean App Platform:

```bash
doctl apps update YOUR_APP_ID --spec - <<EOF
envs:
- key: SIGNALHOUSE_API_KEY
  scope: RUN_AND_BUILD_TIME
  value: your_api_key_here
- key: SIGNALHOUSE_AUTH_TOKEN
  scope: RUN_AND_BUILD_TIME
  value: your_jwt_token_here
EOF
```

### Verify Connection

Test the connection via API:

```bash
curl -X POST https://your-app.ondigitalocean.app/api/signalhouse/test \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "message": "Connection successful",
  "wallet": { "balance": 100.00, "currency": "USD" }
}
```

---

## 10DLC Registration

### Why 10DLC?

10DLC (10-Digit Long Code) is **required** for A2P (Application-to-Person) business messaging in the US. Without it:
- Messages may be filtered/blocked by carriers
- Throughput is severely limited
- Potential fines for non-compliance

### Step 1: Register Your Brand

1. Go to **10DLC** → **Brands** in SignalHouse dashboard
2. Click **Register New Brand**
3. Fill in required information:

| Field | Example |
|-------|---------|
| Legal Company Name | Outreach Global LLC |
| DBA | OutreachGlobal |
| EIN | 12-3456789 |
| Country | United States |
| Entity Type | PRIVATE_PROFIT |
| Vertical | Real Estate |
| Website | https://outreachglobal.io |

4. Submit for vetting (takes 1-3 business days)

### Step 2: Create Campaign

Once brand is approved:

1. Go to **10DLC** → **Campaigns**
2. Click **Create Campaign**
3. Select your brand
4. Choose use case:

| Use Case | Description | Throughput |
|----------|-------------|------------|
| LOW_VOLUME | General messaging | 75 msg/min |
| MIXED | Marketing + transactional | 2,400 msg/min |
| MARKETING | Promotional content | 3,600 msg/min |

5. Fill in campaign details:

```
Sample Messages:
1. "Hi {{firstName}}, this is {{agentName}} from OutreachGlobal.
    We noticed you own property at {{address}}.
    Would you consider selling? Reply YES or STOP to opt out."

2. "Thanks for your interest! I can offer a no-obligation
    cash offer within 24 hours. When's a good time to chat?"

Message Flow:
- Initial outreach with opt-out instructions
- Follow-up based on response
- Appointment confirmation

Help Message:
"Reply HELP for assistance or call (555) 123-4567"

Opt-Out Message:
"You've been unsubscribed. Reply START to resubscribe."
```

6. Submit campaign (approval takes 1-5 business days)

### Campaign Status Meanings

| Status | Meaning |
|--------|---------|
| PENDING | Under review |
| ACTIVE | Approved, ready to use |
| REJECTED | Fix issues and resubmit |
| SUSPENDED | Compliance violation |

---

## Buying Phone Numbers

### Step 1: Search Available Numbers

1. Go to **Phone Numbers** → **Buy Numbers**
2. Search by:
   - Area code (e.g., 212 for NYC)
   - State (e.g., NY)
   - Capabilities (SMS, MMS, Voice)

### Via API:

```bash
curl https://your-app.ondigitalocean.app/api/signalhouse/numbers?action=available&areaCode=212
```

### Step 2: Purchase Number

1. Select desired number(s)
2. Click **Purchase**
3. Assign friendly name (e.g., "NYC Campaign Line")

### Step 3: Attach to Campaign

**Critical:** Numbers MUST be attached to a 10DLC campaign before sending A2P messages.

1. Go to **Phone Numbers** → **My Numbers**
2. Click on number → **Configure**
3. Select your 10DLC campaign
4. Set webhook URLs:

```
SMS Webhook: https://your-app.ondigitalocean.app/api/webhook/signalhouse
Voice Webhook: https://your-app.ondigitalocean.app/api/gianna/voice-webhook
```

---

## Configuring Webhooks

### What Webhooks Do

Webhooks notify OutreachGlobal when:
- SMS is received (inbound)
- SMS is delivered/failed
- Phone number is provisioned
- Brand/campaign status changes

### Step 1: Create Webhook in SignalHouse

1. Go to **Settings** → **Webhooks**
2. Click **Create Webhook**
3. Configure:

| Field | Value |
|-------|-------|
| Name | NEXTIER |
| URL | `https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse` |
| Events | Select all relevant events |

### Recommended Events:

- `SMS_SENT` - Track outbound delivery
- `SMS_RECEIVED` - Handle inbound messages
- `MMS_SENT` - Track MMS delivery
- `MMS_RECEIVED` - Handle inbound MMS
- `NUMBER_PROVISIONED` - New number ready
- `BRAND_ADD` - Brand registered
- `CAMPAIGN_ADD` - Campaign created
- `CAMPAIGN_UPDATE` - Status changes

### Webhook Payload Example

Inbound SMS:
```json
{
  "event": "SMS_RECEIVED",
  "data": {
    "messageId": "msg_abc123",
    "from": "+15551234567",
    "to": "+15559876543",
    "body": "YES, I'm interested!",
    "receivedAt": "2025-01-15T10:30:00Z"
  }
}
```

### How OutreachGlobal Handles Webhooks

The webhook handler at `/api/webhook/signalhouse` automatically:

1. **Lead Detection** - Flags responses containing:
   - YES, INTERESTED, CALL, INFO, MORE, DETAILS, HELP

2. **Opt-Out Handling** - Auto-processes:
   - STOP, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT
   - Removes from SMS queue
   - Cancels pending messages

3. **Delivery Tracking** - Logs sent/delivered/failed status

4. **Conversation History** - Stores messages for the inbox

---

## Sending Your First SMS

### Via OutreachGlobal UI

1. Navigate to **Messaging** → **Send SMS**
2. Select recipient(s) from leads
3. Choose template or compose message
4. Select sending phone number
5. Click **Send** or **Schedule**

### Via API

Single SMS:
```bash
curl -X POST https://your-app.ondigitalocean.app/api/signalhouse/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "from": "+15559876543",
    "message": "Hi John, this is Sarah from OutreachGlobal..."
  }'
```

Batch SMS:
```bash
curl -X POST https://your-app.ondigitalocean.app/api/signalhouse/bulk-send \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"to": "+15551234567", "message": "Hi John..."},
      {"to": "+15552345678", "message": "Hi Jane..."}
    ],
    "from": "+15559876543",
    "batchSize": 250,
    "delayMs": 5000
  }'
```

### Message Limits

| Limit | Value |
|-------|-------|
| Batch Size | 250 messages |
| Daily Limit | 2,000 messages |
| Rate | Based on 10DLC campaign tier |

### Template Variables

Use these in your messages:
- `{{firstName}}` - Lead's first name
- `{{lastName}}` - Lead's last name
- `{{address}}` - Property address
- `{{agentName}}` - Your name
- `{{companyName}}` - Your company

Example:
```
Hi {{firstName}}, this is {{agentName}} from {{companyName}}.
I noticed you own {{address}}. Would you consider selling?
Reply YES or STOP to opt out.
```

---

## Platform Features

### SMS Dashboard

Access at: **Admin** → **Integrations** → **SignalHouse**

Features:
- Real-time message stats
- Delivery rate tracking
- Cost monitoring
- Conversation inbox

### Analytics Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/signalhouse/analytics` | Dashboard overview |
| `/api/signalhouse/analytics?type=outbound` | Sent message stats |
| `/api/signalhouse/analytics?type=inbound` | Received messages |
| `/api/signalhouse/analytics?type=optout` | Opt-out tracking |
| `/api/signalhouse/analytics?type=wallet` | Balance info |

### SMS Drip Campaigns

Create automated follow-up sequences:

1. Go to **Campaigns** → **SMS Automation**
2. Create drip sequence:

```
Day 0: Initial outreach
Day 3: Follow-up if no response
Day 7: Final attempt
Day 14: Re-engagement
```

3. Set triggers:
   - On lead import
   - On property search save
   - Manual trigger

### Two-Way Conversations

The Universal Inbox (`/inbox`) shows:
- All inbound messages
- Conversation threads
- Quick reply options
- Lead status updates

---

## Troubleshooting

### Common Issues

#### 401 Unauthorized

**Cause:** Invalid or expired API credentials

**Fix:**
1. Generate new API key in SignalHouse
2. Update environment variables
3. Redeploy application

#### Messages Not Delivering

**Causes:**
- Number not attached to 10DLC campaign
- Campaign not approved
- Insufficient wallet balance
- Carrier filtering

**Fix:**
1. Verify campaign status is ACTIVE
2. Check wallet balance
3. Ensure number is attached to campaign
4. Review message content for spam triggers

#### Webhook Not Receiving Events

**Causes:**
- Wrong webhook URL
- Webhook disabled
- Network/firewall issues

**Fix:**
1. Verify URL in SignalHouse dashboard
2. Check webhook status is "Enabled"
3. Test with SignalHouse webhook tester
4. Check application logs

### Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad request | Check request format |
| 401 | Unauthorized | Verify API credentials |
| 403 | Forbidden | Check account permissions |
| 429 | Rate limited | Slow down requests |
| 500 | Server error | Contact SignalHouse support |

### Getting Help

- **SignalHouse Support:** support@signalhouse.io
- **API Documentation:** https://app.signalhouse.io/apidoc
- **Status Page:** https://status.signalhouse.io

---

## Quick Reference

### Environment Variables

```bash
SIGNALHOUSE_API_KEY=b63df419c4c90433467694ef755f015cc1d10ddd3b76ac6a7cf56bfc3681c6d2
SIGNALHOUSE_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs...
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signalhouse` | GET | Connection status |
| `/api/signalhouse/test` | POST | Test credentials |
| `/api/signalhouse/send` | POST | Send single SMS |
| `/api/signalhouse/bulk-send` | POST | Send batch SMS |
| `/api/signalhouse/numbers` | GET | List phone numbers |
| `/api/signalhouse/numbers` | POST | Buy/configure number |
| `/api/signalhouse/analytics` | GET | Get analytics |
| `/api/signalhouse/brand` | GET/POST | Manage brands |
| `/api/signalhouse/campaign` | GET/POST | Manage campaigns |
| `/api/webhook/signalhouse` | POST | Webhook receiver |

### Webhook Events

```
SMS_SENT, SMS_RECEIVED, SMS_DELIVERED, SMS_FAILED
MMS_SENT, MMS_RECEIVED
NUMBER_PROVISIONED, NUMBER_RELEASED
BRAND_ADD, BRAND_DELETE
CAMPAIGN_ADD, CAMPAIGN_UPDATE, CAMPAIGN_EXPIRED
```

---

## Checklist: Going Live

- [ ] SignalHouse account created and verified
- [ ] Wallet funded ($100+ recommended)
- [ ] API credentials generated and configured
- [ ] 10DLC Brand registered and approved
- [ ] 10DLC Campaign created and approved
- [ ] Phone number(s) purchased
- [ ] Numbers attached to campaign
- [ ] Webhooks configured and tested
- [ ] Test SMS sent successfully
- [ ] Opt-out handling verified

---

*Last updated: December 2025*
