# Automated Client Provisioning with DigitalOcean MCP

## Overview

This guide automates the creation of new client instances for your multi-tenant SaaS platform.

**Before**: 2-4 hours of manual work per client
**After**: 10 minutes automated provisioning

---

## What Gets Created

For each new client (e.g., "hasaas.app"):

1. ✅ Dedicated PostgreSQL database
2. ✅ Cloned App Platform application
3. ✅ Custom domain configuration
4. ✅ Environment variables (isolated per client)
5. ✅ Database schema initialization
6. ✅ Admin user creation
7. ✅ SSL certificate (automatic)
8. ✅ Monitoring and alerts

---

## Prerequisites

- DigitalOcean MCP installed in Claude Desktop
- DigitalOcean API token with full access
- GitHub repo access (for app deployment)
- Domain registrar access (for DNS)

---

## Client Provisioning Workflow

### Step 1: Prepare Client Information

Create a client configuration file:

```json
// clients/hasaas-config.json
{
  "name": "hasaas",
  "domain": "hasaas.app",
  "companyName": "Hasaas Real Estate",
  "adminEmail": "admin@hasaas.app",
  "adminName": "John Doe",
  "plan": "pro",
  "features": {
    "maxLeads": 10000,
    "maxCampaigns": 50,
    "maxUsers": 10,
    "aiSdrEnabled": true,
    "propertyMonitoring": true
  },
  "integrations": {
    "sendgridApiKey": "SG.xxx",
    "twilioAccountSid": "ACxxx",
    "realestateApiKey": "HASAAS-xxx"
  }
}
```

### Step 2: Use Claude Desktop MCP

Ask Claude Desktop:

```
I need to provision a new client instance using the configuration in clients/hasaas-config.json.

Please use DigitalOcean MCP to:

1. CREATE DATABASE
   - Name: hasaas-db
   - Engine: PostgreSQL 16
   - Size: db-s-2vcpu-4gb (for pro plan)
   - Region: nyc3
   - Nodes: 2 (primary + standby for pro plan)
   - Firewall: Restrict to app cluster only

2. CREATE APP
   - Clone from: monkfish-app-mb7h3
   - New name: hasaas-app
   - Region: nyc
   - Build command: pnpm run build
   - Run command: node dist/apps/api/src/main.js

3. SET ENVIRONMENT VARIABLES
   Copy from template and customize:
   - DATABASE_URL: [new database connection string]
   - APP_URL: https://api.hasaas.app
   - FRONTEND_URL: https://app.hasaas.app
   - APP_SECRET: [generate new 32-char secret]
   - NODE_ENV: production
   - [Copy SendGrid, Twilio, RealEstate API keys from config]

4. CONFIGURE DOMAINS
   - api.hasaas.app → hasaas-app (backend)
   - app.hasaas.app → hasaas-app (frontend via /front route)
   - hasaas.app → redirect to app.hasaas.app

5. DEPLOY APP
   - Wait for successful deployment
   - Verify health check at https://api.hasaas.app/health

6. INITIALIZE DATABASE
   - Run migrations: pnpm run db:push
   - Create admin user with bcrypt password
   - Set up default team

7. VERIFY
   - Test login at https://app.hasaas.app
   - Send test email via SendGrid
   - Check database connectivity

Provide a summary with:
- App URL
- Admin credentials
- Database connection string
- Deployment status
```

---

## Manual Steps (if MCP unavailable)

### 1. Create Database

```bash
# Via DigitalOcean CLI (doctl)
doctl databases create hasaas-db \
  --engine pg \
  --version 16 \
  --size db-s-2vcpu-4gb \
  --region nyc3 \
  --num-nodes 2

# Get connection details
doctl databases connection hasaas-db
```

### 2. Clone App

1. Go to [App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Select "Import from existing app"
4. Choose "monkfish-app-mb7h3"
5. Name: "hasaas-app"
6. Update environment variables
7. Deploy

### 3. Configure DNS

Add these records at your domain registrar:

```
Type  | Name | Value                          | TTL
------|------|--------------------------------|-----
CNAME | api  | hasaas-app.ondigitalocean.app  | 3600
CNAME | app  | hasaas-app.ondigitalocean.app  | 3600
A     | @    | [App Platform IP]              | 3600
```

### 4. Initialize Database

```bash
# Connect to database
psql "postgresql://doadmin:PASSWORD@hasaas-db-host:port/defaultdb?sslmode=require"

# Run migrations (from your local machine)
DATABASE_URL="postgresql://..." pnpm run db:push

# Create admin user
npm run create-admin -- --email admin@hasaas.app --team hasaas
```

---

## Post-Provisioning Tasks

### 1. Send Welcome Email

```
Subject: Welcome to Nextier Global!

Hi [Client Name],

Your Nextier instance is ready!

🔗 Access your dashboard: https://app.hasaas.app
📧 Admin email: admin@hasaas.app
🔑 Temporary password: [sent separately]

Next steps:
1. Log in and change your password
2. Configure your SendGrid API key (Settings → Integrations)
3. Add team members (Team → Members)
4. Import your first leads (Leads → Import)
5. Create your first campaign (Campaigns → New)

Need help? Contact support@nextier.com

Welcome aboard!
```

### 2. Configure Monitoring

Ask Claude Desktop:

```
Set up monitoring for new client "hasaas":

1. App health checks (https://api.hasaas.app/health)
2. Database metrics (CPU, memory, connections)
3. Alert on deployment failures
4. Cost tracking (budget alert at $200/mo)

Send alerts to: admin@hasaas.app, ops@nextier.com
```

### 3. Document Client

Add to Notion (using Notion MCP):

```
Create a client page in Notion:

Name: Hasaas Real Estate
Status: Active
Plan: Pro
Provisioned: [Today's date]

Infrastructure:
- App ID: [app-id]
- Database ID: [db-id]
- Domain: hasaas.app

Billing:
- Monthly cost: $XX
- Billing email: billing@hasaas.app

Contacts:
- Admin: John Doe (admin@hasaas.app)
- Technical: [contact]
```

---

## Client Configuration Template

This is what gets set for each client:

### Environment Variables

```env
# App Configuration
APP_ENV="production"
APP_URL="https://api.${CLIENT_DOMAIN}"
FRONTEND_URL="https://app.${CLIENT_DOMAIN}"
APP_SECRET="${GENERATED_SECRET}"
PORT=8080
TZ=UTC

# Database
DATABASE_URL="${CLIENT_DB_CONNECTION_STRING}"
REDIS_URL="${SHARED_REDIS_URL}"

# SendGrid (Client-specific)
MAIL_HOST="smtp.sendgrid.net"
MAIL_PORT=587
MAIL_USER="apikey"
MAIL_PASSWORD="${CLIENT_SENDGRID_KEY}"
MAIL_FROM_ADDRESS="noreply@${CLIENT_DOMAIN}"
MAIL_FROM_NAME="${CLIENT_COMPANY_NAME}"

# RealEstateAPI (Client-specific)
REALESTATE_API_KEY="${CLIENT_REALESTATE_KEY}"

# Twilio (Client-specific or shared)
TWILIO_ACCOUNT_SID="${CLIENT_TWILIO_SID}"
TWILIO_AUTH_TOKEN="${CLIENT_TWILIO_TOKEN}"

# Anthropic (Shared across clients)
ANTHROPIC_API_KEY="${SHARED_ANTHROPIC_KEY}"

# Client Metadata
CLIENT_ID="${CLIENT_NAME}"
CLIENT_TIER="${CLIENT_PLAN}"
```

### Database Schema

Each client gets their own database with:

```sql
-- Teams (one per client initially)
INSERT INTO teams (id, name, slug) VALUES
  (gen_ulid(), '${CLIENT_COMPANY_NAME}', '${CLIENT_NAME}');

-- Admin User
INSERT INTO users (id, email, password, name) VALUES
  (gen_ulid(), '${ADMIN_EMAIL}', '${HASHED_PASSWORD}', '${ADMIN_NAME}');

-- Team Member (admin)
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('${TEAM_ID}', '${USER_ID}', 'OWNER');

-- Team Settings
INSERT INTO team_settings (team_id, sendgrid_api_key, ...) VALUES
  ('${TEAM_ID}', '${SENDGRID_KEY}', ...);
```

---

## Client Tiers & Resource Allocation

### Starter Tier ($99/mo)

```
Infrastructure:
├── App: Basic ($12/mo)
├── Database: db-s-1vcpu-1gb ($15/mo)
└── Total: $27/mo infrastructure

Limits:
├── Leads: 1,000
├── Campaigns: 10
├── Users: 3
├── Email sends: 10,000/mo
└── Features: Basic (no AI SDR)
```

### Pro Tier ($299/mo)

```
Infrastructure:
├── App: Professional ($24/mo)
├── Database: db-s-2vcpu-4gb (2 nodes, $60/mo)
└── Total: $84/mo infrastructure

Limits:
├── Leads: 10,000
├── Campaigns: 50
├── Users: 10
├── Email sends: 100,000/mo
└── Features: AI SDR, Property Monitoring
```

### Enterprise Tier ($999/mo)

```
Infrastructure:
├── App: Professional + Load Balancer ($50/mo)
├── Database: db-s-4vcpu-8gb (3 nodes, $180/mo)
├── Redis: Dedicated instance ($15/mo)
└── Total: $245/mo infrastructure

Limits:
├── Leads: Unlimited
├── Campaigns: Unlimited
├── Users: Unlimited
├── Email sends: Custom
└── Features: All + Custom integrations
```

---

## Cost Breakdown per Client

```
Starter Client:
├── Infrastructure: $27/mo
├── Your margin: $72/mo
└── Margin %: 73%

Pro Client:
├── Infrastructure: $84/mo
├── Your margin: $215/mo
└── Margin %: 72%

Enterprise Client:
├── Infrastructure: $245/mo
├── Your margin: $754/mo
└── Margin %: 75%
```

**Shared Costs** (spread across all clients):
- Anthropic API: ~$50/mo per client (based on usage)
- Support & maintenance: $100/mo per client
- Monitoring tools: $10/mo per client

---

## Deprovisioning a Client

When a client cancels:

Ask Claude Desktop:

```
Deprovision client "hasaas":

1. EXPORT DATA
   - Download database backup
   - Export all leads to CSV
   - Save campaign history
   - Store in S3: s3://nextier-client-backups/hasaas/

2. DISABLE ACCESS
   - Disable all user accounts
   - Revoke API keys
   - Mark team as inactive

3. RETAIN FOR 30 DAYS
   - Keep database online (read-only)
   - Keep app in maintenance mode
   - Display cancellation notice

4. AFTER 30 DAYS
   - Delete database
   - Delete app
   - Remove DNS records
   - Delete backups (after 90 days total)

5. NOTIFY
   - Send confirmation to client
   - Update billing system
   - Archive in Notion
```

---

## Troubleshooting

### Issue: App won't deploy

**Check:**
1. GitHub repo access (deploy key configured?)
2. Build command correct
3. Environment variables set
4. Database connection string valid

**Fix via MCP:**
```
Check deployment logs for app hasaas-app.
Show me the last failed build.
What's the error?
```

### Issue: Can't connect to database

**Check:**
1. Firewall rules (app cluster allowed?)
2. SSL mode set to `require`
3. Connection string format
4. Database user credentials

**Fix via MCP:**
```
Show me firewall rules for database hasaas-db.
Add app hasaas-app to allowed sources.
```

### Issue: Domain not resolving

**Check:**
1. DNS records propagated (use `dig api.hasaas.app`)
2. SSL certificate issued (check App Platform)
3. Domain added in App Platform settings

**Wait time**: DNS can take up to 48 hours, usually 15 minutes

---

## Automation Roadmap

### Phase 1: Semi-Automated (Current)
- [X] Manual provisioning with checklist
- [X] MCP commands for individual tasks
- [ ] Documented runbook

### Phase 2: Scripted
- [ ] CLI tool for provisioning
- [ ] Template-based configuration
- [ ] Automated database init

### Phase 3: Fully Automated
- [ ] Self-service portal
- [ ] Instant provisioning (< 5 minutes)
- [ ] Auto-scaling per client
- [ ] Usage-based billing

---

## Next Steps

1. **Test Provisioning**: Create a test client ("test-client.com")
2. **Document Process**: Record screen as you provision
3. **Train Team**: Onboard team members on provisioning
4. **Build Portal**: Self-service client signup (future)

Ready to provision your first client? Use the Claude Desktop commands above!
