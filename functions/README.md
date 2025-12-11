# DO Functions - Serverless Pipeline

Namespace: `sea-turtle-fn-namespace` (NYC1)

## Deployed Functions

### Enrichment Package
| Function | Endpoint | Timeout | Memory | Purpose |
|----------|----------|---------|--------|---------|
| `enrich-lead` | `/enrichment/enrich-lead` | 30s | 256MB | Single lead Apollo + Property enrichment |
| `batch-enrich` | `/enrichment/batch-enrich` | 5min | 512MB | Batch enrich up to 100 leads |

### Data Package
| Function | Endpoint | Timeout | Memory | Purpose |
|----------|----------|---------|--------|---------|
| `csv-processor` | `/data/csv-processor` | 5min | 1GB | Process CSV from DO Spaces |
| `export-csv` | `/data/export-csv` | 2min | 512MB | Export leads to downloadable CSV |

### Webhooks Package
| Function | Endpoint | Timeout | Memory | Purpose |
|----------|----------|---------|--------|---------|
| `sms-inbound` | `/webhooks/sms-inbound` | 10s | 256MB | SignalHouse/Twilio SMS webhooks |
| `voice-inbound` | `/webhooks/voice-inbound` | 10s | 256MB | Twilio voice call webhooks |

### AI Package
| Function | Endpoint | Timeout | Memory | Purpose |
|----------|----------|---------|--------|---------|
| `generate-sms` | `/ai/generate-sms` | 60s | 256MB | AI-powered SMS generation |

## Deployment

```bash
# Install DO CLI
brew install doctl

# Authenticate
doctl auth init

# Deploy all functions
doctl serverless deploy functions/

# Deploy single package
doctl serverless deploy functions/packages/enrichment
```

## Environment Variables Required

```env
# Apollo
APOLLO_API_KEY=

# RealEstateAPI
REALESTATE_API_KEY=

# DO Spaces
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=nextier

# SMS/Voice
SIGNALHOUSE_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=
```

## Usage Examples

### Enrich Single Lead
```bash
curl -X POST https://faas-nyc1-xxx.doserverless.co/api/v1/web/sea-turtle-fn-namespace/enrichment/enrich-lead \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "company": "Acme Corp",
      "firstName": "John",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY"
    }
  }'
```

### Batch Enrich
```bash
curl -X POST https://faas-nyc1-xxx.doserverless.co/api/v1/web/sea-turtle-fn-namespace/enrichment/batch-enrich \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [...],
    "options": {
      "apolloEnabled": true,
      "propertyEnabled": true,
      "concurrency": 5
    },
    "bucketId": "b2b-leads",
    "jobId": "job-123"
  }'
```

### Process CSV
```bash
curl -X POST https://faas-nyc1-xxx.doserverless.co/api/v1/web/sea-turtle-fn-namespace/data/csv-processor \
  -H "Content-Type: application/json" \
  -d '{
    "bucketKey": "uploads/leads.csv",
    "options": {
      "normalize": true,
      "dedupe": true,
      "filterDecisionMakers": true
    }
  }'
```

### Generate AI SMS
```bash
curl -X POST https://faas-nyc1-xxx.doserverless.co/api/v1/web/sea-turtle-fn-namespace/ai/generate-sms \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "firstName": "John",
      "company": "Acme Corp",
      "city": "Brooklyn",
      "state": "NY",
      "estimatedValue": 850000
    },
    "template": "Property investment opportunity",
    "context": "Owner of high-equity property in Brooklyn"
  }'
```

## Cost Estimate

- Free tier: 25 GB-hours/month (~90,000 GB-seconds)
- Beyond free: $0.0000185/GB-second

Typical monthly usage for 10,000 enrichments:
- ~500 GB-seconds → Still within free tier
