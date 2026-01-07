# Environment Variables Documentation

**Last Updated:** January 2026

This document lists all environment variables required for the OutreachGlobal platform, their purpose, how to obtain them, and what breaks if they're missing.

---

## 🔴 Critical Variables (Application Won't Start Without These)

### Database Configuration

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | DigitalOcean Database → Connection Details | ❌ **CRITICAL:** App cannot start, all data access fails |
| `DB_HOST` | Database host (legacy) | Extract from DATABASE_URL | ⚠️ Legacy code paths may fail |
| `DB_PORT` | Database port (legacy) | Usually `25060` for DO managed | ⚠️ Legacy code paths may fail |
| `DB_NAME` | Database name (legacy) | Usually `defaultdb` | ⚠️ Legacy code paths may fail |
| `DB_USER` | Database user (legacy) | From DATABASE_URL | ⚠️ Legacy code paths may fail |
| `DB_PASSWORD` | Database password (legacy) | From DATABASE_URL | ⚠️ Legacy code paths may fail |

**How to Get Database Connection:**
1. Go to: https://cloud.digitalocean.com/databases
2. Select your PostgreSQL database
3. Click "Connection Details"
4. Copy "Connection String" → Use as `DATABASE_URL`
5. Set `sslmode=require` at the end

**Format:**
```
DATABASE_URL=postgresql://username:password@host:25060/defaultdb?sslmode=require
```

**Status Check:**
```bash
curl https://your-app.ondigitalocean.app/admin/health | jq '.services.database'
```

---

### Redis Configuration

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `REDIS_URL` | Redis connection for caching & queues | DigitalOcean Database → Redis Connection | ❌ Job queues, caching, session management |

**How to Get Redis Connection:**
1. Go to: https://cloud.digitalocean.com/databases
2. Select your Redis cluster
3. Copy "Connection String"
4. Use TLS format: `rediss://` (note the double 's')

**Format:**
```
REDIS_URL=rediss://default:password@host:25061
```

**What Breaks Without It:**
- Background job processing (SMS campaigns, data imports)
- API response caching
- Rate limiting
- Session storage

**Status Check:**
```bash
curl https://your-app.ondigitalocean.app/admin/health | jq '.services.redis'
```

---

### DigitalOcean Spaces (Object Storage)

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `DO_SPACES_KEY` | Spaces access key ID | DigitalOcean → API → Spaces Keys | ❌ File uploads, datalake, research library |
| `DO_SPACES_SECRET` | Spaces secret access key | Same as above | ❌ File uploads, datalake, research library |
| `DO_SPACES_ENDPOINT` | Spaces endpoint URL | Usually `https://nyc3.digitaloceanspaces.com` | ⚠️ Wrong region = connection failures |
| `DO_SPACES_REGION` | Spaces region | Usually `nyc3` | ⚠️ Wrong region = connection failures |
| `DO_SPACES_BUCKET` | Bucket name | Your bucket name, usually `nextier` | ⚠️ Wrong bucket = file not found |

**Legacy Variable Names** (also supported):
- `SPACES_KEY` → Use `DO_SPACES_KEY` instead
- `SPACES_SECRET` → Use `DO_SPACES_SECRET` instead
- `SPACES_ENDPOINT` → Use `DO_SPACES_ENDPOINT` instead
- `SPACES_REGION` → Use `DO_SPACES_REGION` instead
- `SPACES_BUCKET` → Use `DO_SPACES_BUCKET` instead

**How to Generate Spaces Keys:**
1. Go to: https://cloud.digitalocean.com/account/api/spaces
2. Click "Generate New Key"
3. Name it descriptively: `OutreachGlobal-Production-2024`
4. **IMPORTANT:** Copy both Key and Secret immediately!
5. You cannot retrieve the Secret again after closing the dialog

**Common Errors:**
- `SignatureDoesNotMatch`: Secret is incorrect or key was rotated
- `AccessDenied`: Key doesn't have permissions for the bucket
- `NoSuchBucket`: Bucket name is wrong or doesn't exist

**Status Check:**
```bash
curl -X POST https://your-app.ondigitalocean.app/admin/fix-spaces | jq
```

**What Breaks Without It:**
- CSV uploads for B2B data ingestion
- File attachments in campaigns
- Research library document storage
- Sector statistics data storage
- User avatar uploads

---

## 🟡 Important Variables (Features Break Without These)

### Authentication & Security

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `JWT_SECRET` | Signs authentication tokens | Generate: `openssl rand -base64 32` | ❌ Login/logout, all authenticated endpoints |
| `DEFAULT_ADMIN_EMAIL` | Initial admin account email | Set to your email | ⚠️ Cannot create admin user automatically |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin account password | Set strong password | ⚠️ Cannot login as admin |
| `DEFAULT_ADMIN_NAME` | Admin display name | Your name | ⚠️ Minor UI issue only |

**Generating JWT Secret:**
```bash
openssl rand -base64 32
```

**Security Notes:**
- Use different JWT_SECRET for dev/staging/prod
- Never commit secrets to git
- Rotate JWT_SECRET periodically (invalidates all sessions)

---

### SignalHouse SMS Integration

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `SIGNALHOUSE_API_KEY` | SignalHouse API authentication | SignalHouse dashboard | ❌ All SMS sending/receiving |
| `SIGNALHOUSE_AUTH_TOKEN` | Additional auth token | SignalHouse dashboard | ❌ All SMS sending/receiving |
| `SIGNALHOUSE_FROM_NUMBER` | Default SMS sender number | SignalHouse dashboard | ⚠️ SMS sent from wrong number |
| `SIGNALHOUSE_TENANT_ID` | Your SignalHouse tenant ID | SignalHouse dashboard | ❌ All SMS operations |
| `SIGNALHOUSE_EMAIL` | SignalHouse account email | Your SignalHouse email | ⚠️ Some API operations |
| `SIGNALHOUSE_PASSWORD` | SignalHouse account password | Your SignalHouse password | ⚠️ Some API operations |
| `SIGNALHOUSE_WEBHOOK_TOKEN` | Webhook authentication | Generate secure random string | ⚠️ Webhook security compromised |
| `SIGNALHOUSE_WEBHOOK_SECRET` | Webhook signature validation | SignalHouse webhook settings | ⚠️ Cannot verify webhook authenticity |

**How to Get SignalHouse Credentials:**
1. Log in to SignalHouse dashboard
2. Go to API Settings
3. Copy API Key and Auth Token
4. Get your tenant ID from account settings
5. Configure webhook URL in SignalHouse to point to your API

**What Breaks Without It:**
- Cannot send SMS messages
- Cannot receive SMS replies
- AI SDR workers cannot communicate
- Campaign automation stops
- Inbound message webhooks fail

---

### Twilio (Voice & Lookup)

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Twilio Console → Account Info | ⚠️ Voice calls, phone validation |
| `TWILIO_AUTH_TOKEN` | Twilio authentication | Twilio Console → Account Info | ⚠️ Voice calls, phone validation |
| `TWILIO_API_KEY` | API key for some services | Twilio Console → API Keys | ⚠️ Advanced voice features |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Twilio Console → Phone Numbers | ⚠️ Outbound voice calls |

**How to Get Twilio Credentials:**
1. Go to: https://console.twilio.com/
2. Dashboard shows Account SID and Auth Token
3. For API keys: Console → Account → API Keys
4. Phone numbers: Console → Phone Numbers → Manage

**What Breaks Without It:**
- Voice calling features
- Phone number validation/lookup
- Carrier lookup for SMS optimization

---

### AI Services

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `OPENAI_API_KEY` | OpenAI GPT API access | OpenAI dashboard → API keys | ⚠️ AI SDR responses, content generation |
| `PERPLEXITY_API_KEY` | Perplexity AI search | Perplexity dashboard | ⚠️ AI-powered research features |

**How to Get OpenAI Key:**
1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy immediately (shown only once)

**What Breaks Without It:**
- AI SDR conversation intelligence
- Automated message generation
- Lead scoring algorithms
- Content suggestions

---

### Apollo.io (B2B Lead Enrichment)

| Variable | Purpose | How to Get | What Breaks |
|----------|---------|------------|-------------|
| `APOLLO_API_KEY` | Apollo API access (backend) | Apollo.io → Settings → Integrations | ⚠️ B2B lead enrichment |
| `APOLLO_IO_API_KEY` | Alternative Apollo key | Same as above | ⚠️ B2B lead enrichment |
| `NEXT_PUBLIC_APOLLO_IO_API_KEY` | Apollo key for frontend | Same as above | ⚠️ Client-side enrichment |

**How to Get Apollo Key:**
1. Go to: https://app.apollo.io/
2. Settings → Integrations → API
3. Generate or copy existing key

**What Breaks Without It:**
- Company enrichment
- Contact discovery
- Lead validation
- B2B data enhancement

---

## 🟢 Optional Variables (Nice-to-Have)

### Application URLs

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3001` | ⚠️ Frontend cannot reach API in prod |
| `NEXT_PUBLIC_APP_URL` | Frontend base URL | `http://localhost:3000` | ⚠️ OAuth redirects, emails have wrong links |
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL endpoint | `http://localhost:3001/graphql` | ⚠️ GraphQL queries fail |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3001` | ⚠️ Real-time features don't work |

**Production Values:**
```bash
NEXT_PUBLIC_API_URL=https://nextier-bxrzn.ondigitalocean.app
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
NEXT_PUBLIC_GRAPHQL_URL=https://nextier-bxrzn.ondigitalocean.app/graphql
NEXT_PUBLIC_WS_URL=wss://nextier-bxrzn.ondigitalocean.app
```

---

### AI Worker Phone Numbers

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `GIANNA_PHONE_NUMBER` | Opener SDR phone | - | ⚠️ Initial outreach uses default |
| `GIANNA_SUBGROUP_ID` | SignalHouse subgroup | - | ⚠️ Message routing |
| `GIANNA_CAMPAIGN_ID` | SignalHouse campaign | - | ⚠️ Analytics tracking |
| `CATHY_PHONE_NUMBER` | Nudger SDR phone | - | ⚠️ Follow-up uses default |
| `CATHY_SUBGROUP_ID` | SignalHouse subgroup | - | ⚠️ Message routing |
| `CATHY_CAMPAIGN_ID` | SignalHouse campaign | - | ⚠️ Analytics tracking |
| `SABRINA_PHONE_NUMBER` | Closer SDR phone | - | ⚠️ Booking uses default |
| `SABRINA_SUBGROUP_ID` | SignalHouse subgroup | - | ⚠️ Message routing |
| `SABRINA_CAMPAIGN_ID` | SignalHouse campaign | - | ⚠️ Analytics tracking |
| `DEFAULT_OUTBOUND_NUMBER` | Fallback number | - | ⚠️ Must have at least one number |

**Purpose:**
These configure the 3-tier AI SDR system:
- **Gianna:** Initial outreach and opener
- **Cathy:** Follow-up nudging
- **Sabrina:** Appointment booking and closing

---

### Data Providers

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `REALESTATE_API_KEY` | Real estate data API | - | ⚠️ Property data enrichment |
| `REAL_ESTATE_API_KEY` | Alternative RE key | - | ⚠️ Property data enrichment |
| `SKIPTRACE_API_KEY` | Skip tracing service | - | ⚠️ Contact discovery |
| `TRUE_PEOPLE_SEARCH_API_KEY` | People search | - | ⚠️ Contact enrichment |
| `SPOKEO_API_KEY` | People search | - | ⚠️ Contact enrichment |

---

### System Configuration

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `NODE_ENV` | Environment mode | `development` | ⚠️ Wrong logging, caching behavior |
| `PORT` | API server port | `3001` | ⚠️ Wrong port in local dev |
| `APP_MODE` | Application mode | `web` | ⚠️ Worker/web mode detection |
| `LOG_LEVEL` | Logging verbosity | `info` | ⚠️ Too much/little logging |
| `NX_NO_CLOUD` | Disable Nx Cloud | `true` | ⚠️ Build cache behavior |

---

### Monitoring & Integrations

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `MONITORING_WEBHOOK_URL` | Alert webhook | - | ⚠️ No error alerts sent |
| `CALENDAR_URL` | Booking calendar | - | ⚠️ Wrong calendar link in messages |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox maps | - | ⚠️ Map features don't work |
| `NEXT_PUBLIC_TENANT_ID` | Multi-tenant ID | - | ⚠️ Tenant isolation issues |
| `NEXT_PUBLIC_THEME_KEY` | Theme identifier | `nextier-theme` | ⚠️ UI theme doesn't apply |

---

### SMS Rate Limiting

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `SMS_RATE_LIMIT_ENABLED` | Enable rate limiting | `true` | ⚠️ May get carrier blocked if false |
| `SMS_RATE_LIMIT_ATT` | AT&T msgs/sec | `75` | ⚠️ Carrier blocking risk |
| `SMS_RATE_LIMIT_TMOBILE` | T-Mobile msgs/sec | `60` | ⚠️ Carrier blocking risk |
| `SMS_RATE_LIMIT_VERIZON` | Verizon msgs/sec | `60` | ⚠️ Carrier blocking risk |
| `SMS_RATE_LIMIT_DEFAULT` | Default msgs/sec | `60` | ⚠️ Carrier blocking risk |

---

### Batch Processing

| Variable | Purpose | Default | What Breaks |
|----------|---------|---------|-------------|
| `BATCH_SIZE` | Records per batch | `250` | ⚠️ Performance issues |
| `MAX_CONCURRENT_BATCHES` | Parallel batches | `4` | ⚠️ Performance issues |
| `MAX_RECORDS_PER_RUN` | Total records limit | `2000` | ⚠️ Long-running jobs |

---

## 🔍 Checking Environment Variable Status

### Using Admin Dashboard

```bash
curl https://your-app.ondigitalocean.app/admin/status | jq '.services.environmentVariables'
```

This will show:
- `✅ Set` - Variable is configured and looks valid
- `❌ Missing` - Variable is not set
- `⚠️ Too Short` - Variable is set but suspiciously short

### Manual Check in DigitalOcean

1. Go to: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings
2. Scroll to "Environment Variables"
3. Click "Show All"
4. Verify each critical variable is set

---

## 📋 Environment Variable Checklist

Use this checklist when setting up a new environment:

### Minimal Working Setup
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `REDIS_URL` - Redis connection
- [ ] `JWT_SECRET` - Auth token signing
- [ ] `DO_SPACES_KEY` - File storage
- [ ] `DO_SPACES_SECRET` - File storage
- [ ] `SIGNALHOUSE_API_KEY` - SMS functionality
- [ ] `SIGNALHOUSE_TENANT_ID` - SMS functionality

### Full Production Setup
- [ ] All minimal variables above
- [ ] `DEFAULT_ADMIN_EMAIL` - Admin account
- [ ] `DEFAULT_ADMIN_PASSWORD` - Admin account
- [ ] `OPENAI_API_KEY` - AI features
- [ ] `TWILIO_ACCOUNT_SID` - Voice calls
- [ ] `TWILIO_AUTH_TOKEN` - Voice calls
- [ ] `APOLLO_API_KEY` - B2B enrichment
- [ ] `NEXT_PUBLIC_API_URL` - Frontend API URL
- [ ] `NEXT_PUBLIC_APP_URL` - Frontend app URL

---

## 🚨 Emergency: Missing Critical Variables

If you're locked out and missing critical variables:

1. **Check Last Known Good Configuration:**
   - Previous deployment logs
   - Team documentation
   - Infrastructure-as-Code files

2. **Regenerate What You Can:**
   - `JWT_SECRET`: Generate new (logs everyone out)
   - `DO_SPACES_KEY/SECRET`: Generate new keys
   - `DEFAULT_ADMIN_PASSWORD`: Reset and recreate admin

3. **Contact Service Providers:**
   - SignalHouse support for API keys
   - DigitalOcean support for infrastructure
   - Twilio support for credentials

4. **Update and Redeploy:**
   ```bash
   # Update in DigitalOcean console, then:
   doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9
   ```

---

## 📚 Additional Resources

- **DigitalOcean App Settings:** https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings
- **Emergency Recovery Guide:** `EMERGENCY_RECOVERY.md`
- **Environment Template:** `.env.example`
- **Admin Dashboard:** Your app URL + `/admin/health`

---

**Last Updated:** January 2026  
**Maintained By:** Platform Team  
**Review Frequency:** Monthly or after major changes
