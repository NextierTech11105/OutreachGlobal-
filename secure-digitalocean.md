# DigitalOcean MCP Security & Infrastructure Guide

## 🚨 CRITICAL SECURITY ISSUES

Your infrastructure has several security vulnerabilities that need immediate attention:

1. **Database Firewall WIDE OPEN** - Any IP can connect
2. **Exposed credentials** in codebase
3. **No SSL enforcement** on database connections
4. **Missing environment variable encryption**

---

## Priority 1: Secure Database Firewall (IMMEDIATE)

### Current Status
```
Database: dev-db-410147
Firewall: 0.0.0.0/0 (WIDE OPEN - ANYONE CAN CONNECT!)
```

### Fix with DigitalOcean MCP

Ask Claude Desktop:
```
Use DigitalOcean MCP to update database firewall rules for database "dev-db-410147":

1. Remove the 0.0.0.0/0 rule
2. Add these trusted sources:
   - App Platform cluster (automatically detected)
   - Your office IP: [YOUR_IP]/32
   - CI/CD runner IP (if applicable)

Only allow connections from these sources.
```

### Manual Fix (if MCP unavailable)

1. Go to [DigitalOcean Databases](https://cloud.digitalocean.com/databases)
2. Click your database → Settings → Trusted Sources
3. **Remove** "All IPv4 addresses"
4. **Add**:
   - ☑️ Your App Platform apps (monkfish-app-mb7h3)
   - Your IP address (click "Add current IP")
5. Click **Save**

---

## Priority 2: Rotate Exposed Credentials

### Credentials to Rotate

1. **Database Password**
2. **JWT Secret** (`APP_SECRET`)
3. **API Keys** (RealEstateAPI, SendGrid, etc.)

### Using DigitalOcean MCP

Ask Claude Desktop:
```
Help me rotate credentials:

1. Generate a new database password for dev-db-410147
2. Update all apps that use this database:
   - monkfish-app-mb7h3
   - property-hunt-api-yahrg

3. Update environment variables:
   - DATABASE_URL with new password
   - Restart apps automatically
```

### Manual Steps

```bash
# 1. Generate new password
openssl rand -base64 32

# 2. Update database user password in DigitalOcean

# 3. Update environment variables in each app
# Apps → monkfish-app-mb7h3 → Settings → Environment Variables
DATABASE_URL=postgresql://doadmin:NEW_PASSWORD@host:port/db?sslmode=require

# 4. Restart apps
```

---

## Priority 3: Enable SSL Enforcement

### Database SSL Configuration

Ask Claude Desktop:
```
Configure SSL for PostgreSQL database dev-db-410147:
1. Enable "Require SSL connections"
2. Get SSL certificate
3. Update connection strings in all apps to use sslmode=require
```

### Update Connection Strings

```env
# Before
DATABASE_URL=postgresql://user:pass@host:port/db

# After
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

---

## Infrastructure Audit

### Current Setup

```
Apps:
├── monkfish-app-mb7h3 (Main App)
│   ├── Type: Web Service
│   ├── Region: nyc3
│   └── ENV: NODE_ENV=production
│
├── property-hunt-api-yahrg (Property Hunt API)
│   ├── Type: Web Service
│   └── Region: nyc3
│
Databases:
├── dev-db-410147 (PostgreSQL 16)
│   ├── Size: db-s-1vcpu-1gb
│   ├── Nodes: 1 (single point of failure!)
│   └── Firewall: 0.0.0.0/0 ⚠️ INSECURE
│
Droplets:
├── sphinx-usdata-linkedin
├── app.outreachglobal.io
```

### Recommended Architecture

```
Production:
├── App Platform (multi-region)
│   ├── Primary: nyc3
│   └── Failover: sfo3
│
├── Database Cluster (3 nodes)
│   ├── Primary: nyc3
│   ├── Standby: nyc3
│   └── Read Replica: sfo3
│
├── Load Balancer
│   └── SSL termination
│
└── CDN (for static assets)
```

---

## Automated Client Provisioning

### Current Manual Process

When adding a new client (like hasaas.app):
1. Clone app in DigitalOcean ❌ Manual
2. Create new database ❌ Manual
3. Set environment variables ❌ Manual
4. Configure domain ❌ Manual
5. Deploy ❌ Manual

### Automated with DigitalOcean MCP

Ask Claude Desktop:
```
Create a new client instance for "hasaas":

1. Clone app "monkfish-app-mb7h3" to "hasaas-app"
2. Create database "hasaas-db" (same spec as dev-db-410147)
3. Set environment variables:
   - DATABASE_URL: [new database]
   - APP_URL: https://hasaas.app
   - FRONTEND_URL: https://app.hasaas.app
   - APP_SECRET: [generate new]
   - [copy all other vars from template]
4. Configure custom domain: hasaas.app → hasaas-app
5. Deploy and wait for healthy status
6. Create admin user in new database

Return: {
  appId, databaseId, adminCredentials
}
```

### Script for Automation

I'll create a script you can run via MCP:

```typescript
// provision-client.ts
interface ClientConfig {
  name: string; // "hasaas"
  domain: string; // "hasaas.app"
  adminEmail: string;
  plan: 'starter' | 'pro' | 'enterprise';
}

async function provisionClient(config: ClientConfig) {
  // 1. Create database
  const db = await digitalocean.createDatabase({
    name: `${config.name}-db`,
    engine: 'pg',
    version: '16',
    size: 'db-s-1vcpu-1gb',
    region: 'nyc3',
    numNodes: config.plan === 'enterprise' ? 3 : 1
  });

  // 2. Create app
  const app = await digitalocean.createApp({
    spec: {
      name: `${config.name}-app`,
      region: 'nyc',
      services: [{
        name: 'api',
        github: {
          repo: 'your-org/nextier',
          branch: 'main'
        },
        envs: [
          { key: 'DATABASE_URL', value: db.connectionString },
          { key: 'APP_URL', value: `https://${config.domain}` },
          { key: 'APP_SECRET', value: generateSecret() },
          // ... other vars
        ]
      }]
    }
  });

  // 3. Configure domain
  await digitalocean.addDomain({
    appId: app.id,
    domain: config.domain
  });

  // 4. Wait for deployment
  await digitalocean.waitForDeployment(app.id);

  // 5. Create admin user in database
  const adminUser = await createAdminUser({
    database: db.connectionString,
    email: config.adminEmail,
    name: config.name
  });

  return {
    appId: app.id,
    appUrl: `https://${config.domain}`,
    databaseId: db.id,
    adminUser
  };
}
```

---

## Monitoring & Alerts

### Set Up with DigitalOcean MCP

Ask Claude Desktop:
```
Configure monitoring and alerts:

1. App Health Checks:
   - Monitor: monkfish-app-mb7h3
   - Endpoint: /health
   - Interval: 1 minute
   - Alert if: 3 consecutive failures

2. Database Metrics:
   - Monitor: dev-db-410147
   - Metrics: CPU > 80%, Memory > 90%, Connection count > 90
   - Alert: Email to admin@yourdomain.com

3. Deployment Alerts:
   - Notify on: deploy_started, deploy_failed, deploy_succeeded
   - Webhook: https://your-domain.com/webhooks/deployment

4. Cost Alerts:
   - Budget: $500/month
   - Alert at: 80% ($400)
```

---

## Cost Optimization

### Current Monthly Costs (Estimate)

```
App Platform:
├── monkfish-app-mb7h3: $12/mo (Basic)
├── property-hunt-api-yahrg: $12/mo (Basic)

Database:
├── dev-db-410147: $15/mo (db-s-1vcpu-1gb)

Droplets:
├── sphinx-usdata-linkedin: $6/mo
├── app.outreachglobal.io: $6/mo

Total: ~$51/month
```

### Optimization Opportunities

Ask Claude Desktop:
```
Analyze my DigitalOcean infrastructure and suggest cost optimizations:

1. Right-size resources (check CPU/Memory utilization)
2. Identify unused resources
3. Consolidate services where possible
4. Recommend reserved instances if applicable

Maintain performance but reduce costs by 20-30%.
```

---

## Backup & Disaster Recovery

### Current Backup Status

Ask Claude Desktop:
```
Check backup configuration for:
1. Database dev-db-410147
2. App monkfish-app-mb7h3 (source code, environment variables)

Report:
- Backup frequency
- Retention period
- Last successful backup
- Recovery time objective (RTO)
```

### Recommended Backup Strategy

```
Database Backups:
├── Frequency: Daily at 2 AM UTC
├── Retention: 14 days
├── Test restore: Monthly
└── Off-site backup: Weekly to S3

App Configuration:
├── Environment variables: Git repo (encrypted)
├── SSL certificates: Stored in DigitalOcean
└── Custom domains: Documented

Disaster Recovery Plan:
├── RTO: 4 hours
├── RPO: 24 hours (daily backups)
└── Runbook: Step-by-step restoration guide
```

---

## Deployment Best Practices

### Current Deployment Flow

```
1. Push to GitHub main branch
2. DigitalOcean auto-deploys (no staging!)
3. No rollback mechanism
4. No health checks during deployment
```

### Improved Flow with MCP

```typescript
// deploy-with-safety.ts

async function safeDeploy() {
  // 1. Deploy to staging first
  const staging = await digitalocean.deploy({
    appId: 'staging-app',
    wait: true
  });

  // 2. Run smoke tests
  const testsPass = await runSmokeTests(staging.url);

  if (!testsPass) {
    await digitalocean.rollback('staging-app');
    throw new Error('Smoke tests failed');
  }

  // 3. Deploy to production
  const prod = await digitalocean.deploy({
    appId: 'monkfish-app-mb7h3',
    healthCheck: '/health',
    wait: true
  });

  // 4. Monitor for errors
  await monitorDeployment(prod.id, {
    duration: '10m',
    errorThreshold: 5
  });

  // 5. Rollback if issues detected
  if (prod.errorRate > 5) {
    await digitalocean.rollback('monkfish-app-mb7h3');
    alert('Deployment rolled back due to high error rate');
  }
}
```

---

## Security Checklist

### Immediate (Do Now)

- [ ] Secure database firewall (remove 0.0.0.0/0)
- [ ] Enable SSL on database connections
- [ ] Rotate database password
- [ ] Generate new JWT secret
- [ ] Enable 2FA on DigitalOcean account

### Short-term (This Week)

- [ ] Set up monitoring and alerts
- [ ] Configure automated backups
- [ ] Document disaster recovery plan
- [ ] Create staging environment
- [ ] Implement deployment health checks

### Long-term (This Month)

- [ ] Upgrade to database cluster (3 nodes)
- [ ] Add load balancer
- [ ] Implement CDN for static assets
- [ ] Set up log aggregation
- [ ] Security audit by third party

---

## Using DigitalOcean MCP

### Example Commands

```
# Get infrastructure overview
"Show me all my DigitalOcean resources"

# Security audit
"Audit my DigitalOcean setup for security issues"

# Cost analysis
"Analyze my DigitalOcean costs and suggest optimizations"

# Deploy new client
"Provision a new client instance for 'acme-corp'"

# Check app health
"Check the health of app monkfish-app-mb7h3"

# Database metrics
"Show me database metrics for the last 24 hours"

# Rotate credentials
"Help me rotate the database password securely"

# Backup status
"When was the last database backup?"

# Deployment
"Deploy the latest code to production with health checks"
```

---

## Next Steps

1. **IMMEDIATE**: Secure database firewall
2. **TODAY**: Run security audit via MCP
3. **THIS WEEK**: Set up automated client provisioning
4. **THIS MONTH**: Implement monitoring and disaster recovery

**Ready to start?** Use Claude Desktop (with DigitalOcean MCP) to execute any command above!
