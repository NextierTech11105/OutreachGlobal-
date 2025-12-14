# Environment Variables

This document describes all environment variables required to run the OutreachGlobal platform.

## Quick Start

1. Copy the example files:
   ```bash
   cp apps/front/.env.example apps/front/.env.local
   cp apps/api/.env.example apps/api/.env
   ```
2. Fill in the required values (marked with **Required**)
3. Run `pnpm dev`

---

## Frontend (`apps/front/.env.local`)

### API Connection (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` (dev), `https://api.yourdomain.com` (prod) |
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL endpoint | `http://localhost:3001/graphql` |

### Authentication (Required)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `NEXTAUTH_SECRET` | **Required** - Session encryption key | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL for auth callbacks | `http://localhost:3000` (dev) |

### Third-Party APIs

| Variable | Description | Required? |
|----------|-------------|-----------|
| `REAL_ESTATE_API_KEY` | RealEstateAPI.com key for property search | Yes - for property features |
| `NEXT_PUBLIC_REAL_ESTATE_API_KEY` | Same key, client-side access | Yes |
| `APOLLO_IO_API_KEY` | Apollo.io API for B2B enrichment | Yes - for contact enrichment |
| `NEXT_PUBLIC_APOLLO_IO_API_KEY` | Same key, client-side access | Yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps for property maps | Yes - for maps |

### B2B Data Server

| Variable | Description | Default |
|----------|-------------|---------|
| `B2B_DATA_API_URL` | USBizData droplet URL | `http://146.190.135.158` |
| `B2B_DATA_API_KEY` | API key for B2B server | Required |

### Redis/Queue (Required for enrichment)

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (for enrichment queue) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

### Optional - Monitoring

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID |

---

## Backend API (`apps/api/.env`)

### Core (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Environment | `local`, `staging`, `production` |
| `PORT` | API port | `3001` |
| `TZ` | Timezone | `UTC` |
| `APP_URL` | Backend URL | `http://localhost:3001` |
| `FRONTEND_URL` | Frontend URL (for CORS) | `http://localhost:3000` |
| `APP_SECRET` | **Required** - App secret key | Generate random string |

### Database (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | **Required** - PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Redis (Required)

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | **Required** - Redis connection string |

### Admin Bootstrap (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_ADMIN_EMAIL` | Auto-create admin on boot | `admin@example.com` |
| `DEFAULT_ADMIN_PASSWORD` | Admin password (if set, creates admin) | - |
| `DEFAULT_ADMIN_NAME` | Admin display name | `Admin` |

### Email - SendGrid (Required for email features)

| Variable | Description |
|----------|-------------|
| `MAIL_HOST` | SMTP host | `smtp.sendgrid.net` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP username |
| `MAIL_PASSWORD` | SendGrid API key |
| `MAIL_FROM_NAME` | Sender name |
| `MAIL_FROM_ADDRESS` | Sender email |
| `MAIL_WEBHOOK_KEY` | SendGrid webhook signing key |
| `MAIL_VERIFY_API_KEY` | Email verification API key |

### Real Estate API

| Variable | Description |
|----------|-------------|
| `REALESTATE_API_KEY` | RealEstateAPI.com key |
| `REALESTATE_API_URL` | API base URL (default: `https://api.realestateapi.com/v2`) |

### Zoho CRM (Optional)

| Variable | Description |
|----------|-------------|
| `ZOHO_CLIENT_ID` | Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth client secret |
| `ZOHO_SCOPES` | Required scopes |

### AI/LLM

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |

### B2B Data Sources

| Variable | Description |
|----------|-------------|
| `BUSINESS_LIST_API_URL` | BusinessList API URL |
| `APOLLO_IO_API_KEY` | Apollo.io API key |
| `B2B_DATA_API_URL` | USBizData server URL |
| `B2B_DATA_API_KEY` | USBizData API key |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |

---

## Where to Get API Keys

| Service | Sign Up |
|---------|---------|
| RealEstateAPI | https://realestateapi.com |
| Apollo.io | https://www.apollo.io |
| Google Maps | https://console.cloud.google.com |
| SendGrid | https://sendgrid.com |
| Upstash Redis | https://upstash.com |
| Anthropic Claude | https://console.anthropic.com |
| Sentry | https://sentry.io |
| Zoho CRM | https://www.zoho.com/crm/developer |

---

## Production vs Development

| Setting | Development | Production |
|---------|-------------|------------|
| `APP_ENV` | `local` | `production` |
| `APP_URL` | `http://localhost:3001` | `https://api.yourdomain.com` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://yourdomain.com` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://yourdomain.com` |

---

## Security Notes

- Never commit `.env` files to git (they're in `.gitignore`)
- Use strong, unique values for `APP_SECRET` and `NEXTAUTH_SECRET`
- Rotate API keys periodically (monthly for high-risk keys)
- Store production secrets in DigitalOcean App Platform environment settings, not in files
