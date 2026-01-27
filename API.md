# Outreach Global - API Reference

**Quick API Reference for Developers & Technical Due Diligence**

---

## Base URLs

| Environment | URL |
|-------------|-----|
| **Development** | http://localhost:4000 |
| **Production** | https://api.outreachglobal.com |

---

## Core Endpoints

### Leads Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/rest/leads` | List all leads |
| `GET` | `/rest/leads/:id` | Get single lead |
| `POST` | `/rest/leads` | Create new lead |
| `PUT` | `/rest/leads/:id` | Update lead |
| `DELETE` | `/rest/leads/:id` | Delete lead |

**Request Example:**
```bash
curl -X GET http://localhost:4000/rest/leads \
  -H "Authorization: Bearer $TOKEN"
```

**Response Example:**
```json
{
  "data": [{
    "id": "ulid",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+15551234567",
    "email": "john@example.com",
    "score": 85,
    "status": "qualified",
    "teamId": "demo"
  }],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

### Sectors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/rest/sectors` | List all sectors |
| `GET` | `/rest/sectors/stats` | Get sector statistics |

### Buckets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/buckets` | List all buckets |
| `GET` | `/api/buckets/:id` | Get bucket details |
| `GET` | `/api/buckets/:id/leads` | Get leads in bucket |
| `POST` | `/api/buckets` | Create new bucket |

---

## AI & Automation Endpoints

### GIANNA (AI SDR)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/gianna/opener` | Generate SMS opener |
| `POST` | `/gianna/respond` | Process response |
| `POST` | `/gianna/send` | Send AI-generated SMS |
| `GET` | `/gianna/lead/:leadId` | Get lead context |
| `POST` | `/gianna/classify` | Classify message |
| `GET` | `/gianna/health` | Health check |

**Example: Generate SMS Opener**
```bash
curl -X POST http://localhost:4000/gianna/opener \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "ulid-string",
    "campaignType": "cold_outreach",
    "context": {"industry": "real_estate"}
  }'
```

### CATHY (Nurture Agent)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/cathy/generate` | Generate nurture message |
| `POST` | `/cathy/process-response` | Process response |
| `GET` | `/cathy/leads-to-nurture` | Get leads to nurture |
| `GET` | `/cathy/health` | Health check |

### AI Orchestrator

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/execute` | Execute AI task |
| `POST` | `/ai/classify-sms` | Classify SMS |
| `POST` | `/ai/generate-sms` | Generate SMS |
| `POST` | `/ai/research` | Research task |
| `GET` | `/ai/usage` | Get AI usage stats |

---

## SMS & Communication

### SignalHouse

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signalhouse/test` | Test connection |
| `POST` | `/signalhouse/configure` | Configure API key |
| `GET` | `/signalhouse/stats` | Get SMS stats |
| `POST` | `/signalhouse/send` | Send SMS |

**Example: Send SMS**
```bash
curl -X POST http://localhost:4000/signalhouse/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15559876543",
    "message": "Hello from Outreach Global!",
    "leadId": "ulid-string"
  }'
```

### Voice Broadcast

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/voice-broadcast/campaigns` | Create campaign |
| `GET` | `/voice-broadcast/campaigns` | List campaigns |
| `POST` | `/voice-broadcast/campaigns/:id/execute` | Execute campaign |
| `POST` | `/voice-broadcast/campaigns/:id/pause` | Pause campaign |
| `POST` | `/voice-broadcast/ringless-vm` | Drop ringless VM |

---

## Campaign Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/luci/campaign/stats` | Get campaign stats |
| `GET` | `/luci/campaign/templates` | Get templates |
| `POST` | `/luci/campaign/execute` | Execute campaign |

---

## Data Enrichment

### LUCI Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/luci/lake/import` | Import to data lake |
| `GET` | `/luci/lake/stats` | Get lake stats |
| `POST` | `/luci/block/pull` | Pull from lake |
| `POST` | `/luci/enrich/run` | Run enrichment |
| `POST` | `/luci/enrich/score` | Score leads |
| `POST` | `/luci/qualify` | Qualify leads |
| `GET` | `/luci/progress` | Get progress |

### NEVA (Research)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/neva/enrich` | Enrich lead data |
| `GET` | `/neva/context/:leadId` | Get context |
| `POST` | `/neva/discovery` | Prepare discovery |
| `POST` | `/neva/evaluate` | Evaluate confidence |

### Property Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/property-search` | Search properties |
| `POST` | `/property-search` | Search properties (POST) |
| `POST` | `/property/skiptrace` | Skip trace property |
| `POST` | `/property/skiptrace/batch` | Batch skip trace |
| `POST` | `/property/detail` | Get property details |

---

## Data Lake

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/raw-data-lake/import` | Import CSV |
| `GET` | `/raw-data-lake/verticals` | Get verticals |
| `GET` | `/raw-data-lake/stats` | Get stats |
| `GET` | `/raw-data-lake/browse` | Browse leads |
| `POST` | `/raw-data-lake/create-block` | Create block |

---

## Webhooks

### SignalHouse Webhook
```
POST /webhook/signalhouse
Content-Type: application/json

{
  "event": "delivery_status",
  "messageId": "msg_123",
  "status": "delivered",
  "timestamp": "2026-01-27T14:00:00Z"
}
```

### Voice Webhook
```
POST /webhook/voice/inbound
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello! How can I help you?</Say>
</Response>
```

### Campaign Webhook
```
POST /webhook/campaign
Content-Type: application/json

{
  "event": "email_opened",
  "campaignId": "camp_123",
  "leadId": "lead_456",
  "timestamp": "2026-01-27T14:00:00Z"
}
```

---

## Authentication

### Bearer Token

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Getting a Token

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

---

## Error Responses

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Error |

---

## Rate Limits

| Tier | Requests/minute |
|------|-----------------|
| Free | 60 |
| Pro | 300 |
| Enterprise | 1000 |

---

## Quick Test Commands

```bash
# Health check
curl http://localhost:4000/health

# List leads
curl http://localhost:4000/rest/leads \
  -H "Authorization: Bearer $TOKEN"

# Send test SMS
curl -X POST http://localhost:4000/signalhouse/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"to": "+15551234567", "message": "Test"}'

# Test AI
curl -X POST http://localhost:4000/gianna/opener \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"leadId": "test", "campaignType": "test"}'
```

---

## Postman Collection

Import this collection for quick testing:

```json
{
  "info": {
    "name": "Outreach Global API",
    "description": "API endpoints for Outreach Global platform"
  },
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:4000"},
    {"key": "token", "value": ""}
  ]
}
```

---

*For complete documentation, see the source code in `apps/api/src/`*
