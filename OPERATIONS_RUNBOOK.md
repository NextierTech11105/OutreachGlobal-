# Outreach Global - Operations Runbook

**Quick-Start Guide for Platform Demonstrations & Sales**

---

## 🚨 CRITICAL: Get Running in 5 Minutes

### Step 1: Start the Platform

```bash
# Navigate to project
cd OutreachGlobal

# Start all services
pnpm dev
```

**Expected Output:**
- Frontend: http://localhost:3000
- API: http://localhost:4000

### Step 2: Verify Services

```bash
# Check frontend
curl http://localhost:3000/health

# Check API
curl http://localhost:4000/health
```

**Healthy Response:**
```json
{"status":"ok","timestamp":"..."}
```

---

## 📋 Pre-Demo Checklist

Before showing the platform to buyers:

- [ ] **Frontend loads** at localhost:3000
- [ ] **API responds** at localhost:4000/health
- [ ] **Database connected** (no errors in console)
- [ ] **Demo data loaded** (leads, campaigns)
- [ ] **SMS credentials** configured (SignalHouse)
- [ ] **AI credentials** configured (OpenAI, Claude)
- [ ] **Browser opens** without console errors

---

## 🔧 Common Issues & Solutions

### Issue: "Database connection failed"

**Symptoms:**
- API returns 500 errors
- Console shows: "ECONNREFUSED 127.0.0.1:5432"

**Solution:**
```bash
# 1. Check if PostgreSQL is running
# Windows:
net start postgresql

# Or start Docker PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 2. Verify DATABASE_URL in apps/api/.env
cat apps/api/.env | grep DATABASE_URL

# 3. Run migrations
pnpm db:push
```

### Issue: "Module not found" errors

**Symptoms:**
- Console shows: "Cannot find module '@nextier/...'"

**Solution:**
```bash
# 1. Install dependencies
pnpm install

# 2. Build shared packages
pnpm common:build
pnpm dto:build

# 3. Restart development server
```

### Issue: "Port already in use"

**Symptoms:**
- Error: "EADDRINUSE :::3000"

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID [PID] /F

# Or use different port
pnpm dev:api
pnpm dev:front
```

### Issue: "SignalHouse API errors"

**Symptoms:**
- SMS sending fails
- Error: "SignalHouse authentication failed"

**Solution:**
```bash
# 1. Check API key in environment
cat apps/api/.env | grep SIGNALHOUSE

# 2. Verify key is valid
# Test in SignalHouse dashboard

# 3. Update if needed
nano apps/api/.env
# SIGNALHOUSE_API_KEY=your-valid-key
```

### Issue: "AI services not working"

**Symptoms:**
- GIANNA/CATHY responses fail
- Error: "OpenAI API key invalid"

**Solution:**
```bash
# Check API keys
cat apps/api/.env | grep -E "(OPENAI|ANTHROPIC)"

# Test OpenAI
curl -X POST https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Update keys if needed
nano apps/api/.env
```

---

## 🎯 Demo Scripts

### Demo 1: Lead Management (5 minutes)

```bash
# 1. Navigate to Leads page
# URL: http://localhost:3000/t/demo/leads

# 2. Show lead list
- Point out lead count
- Show lead details (name, phone, email)

# 3. Demonstrate lead creation
- Click "Add Lead"
- Enter sample data
- Show validation

# 4. Show lead scoring
- Point out score values
- Explain qualification logic
```

### Demo 2: Campaign Hub (5 minutes)

```bash
# 1. Navigate to Campaign Hub
# URL: http://localhost:3000/t/demo/campaign-hub

# 2. Show campaign overview
- Active campaigns count
- Performance metrics

# 3. Create new campaign
- Click "New Campaign"
- Select template
- Configure settings

# 4. Show analytics
- Click on campaign
- Show engagement metrics
```

### Demo 3: AI SDR (GIANNA) (3 minutes)

```bash
# 1. Navigate to AI SDR http://localhost:
# URL:3000/t/demo/ai-sdr

# 2. Generate SMS opener
- Select lead
- Click "Generate Opener"
- Show AI-generated content

# 3. Process response
- Simulate response
- Show AI classification
```

### Demo 4: SMS Blast (5 minutes)

```bash
# 1. Navigate to SMS Blast
# URL: http://localhost:3000/t/demo/sms-blast

# 2. Select leads
- Filter by criteria
- Select 10-20 leads

# 3. Compose message
- Use template or custom
- Preview message

# 4. Send campaign
- Click "Send"
- Show delivery status
```

---

## 🔐 Credentials & Configuration

### Required Environment Variables

Create `apps/api/.env`:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@localhost:5432/outreach

# Authentication (REQUIRED)
JWT_SECRET=your-32-character-secret-key-here

# SMS - SignalHouse (REQUIRED for SMS features)
SIGNALHOUSE_API_KEY=sk_live_...
SIGNALHOUSE_BASE_URL=https://api.signalhouse.io

# AI - OpenAI (REQUIRED for GIANNA)
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# AI - Anthropic (REQUIRED for CATHY)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Storage - DigitalOcean (OPTIONAL)
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=nextier
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com

# Data Services (OPTIONAL)
TRACERFY_API_KEY=...
REALESTATE_API_KEY=...
APOLLO_API_KEY=...
```

### Frontend Configuration

Create `apps/front/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 Health Check Commands

### Quick Health Check

```bash
# API Health
curl http://localhost:4000/health

# Expected Response:
{
  "status": "ok",
  "timestamp": "2026-01-27T14:00:00.000Z",
  "services": {
    "database": "connected",
    "cache": "connected",
    "sms": "configured"
  }
}
```

### Detailed Status

```bash
# Get full metrics
curl http://localhost:4000/metrics/json
```

---

## 🚀 Deployment for Demonstrations

### Vercel (Recommended for quick demos)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy Frontend
cd apps/front
vercel --prod

# Deploy API
cd ../api
vercel --prod
```

### DigitalOcean App Platform

```bash
# Using DO CLI
doctl apps create --spec .do/app.yaml
doctl apps update [APP_ID] --spec .do/app.yaml
```

---

## 📞 Support Commands

### View Logs

```bash
# API logs (development)
cd apps/api
pnpm dev 2>&1 | head -100

# Frontend logs
cd apps/front
pnpm dev 2>&1 | head -100
```

### Database Commands

```bash
# Reset database (WARNING: deletes all data)
pnpm --filter api db:drop
pnpm db:push
pnpm --filter api db:seed

# View database schema
pnpm --filter api db:studio
```

### Clear Cache

```bash
# Clear Redis cache (if configured)
redis-cli FLUSHALL

# Or restart the API server
```

---

## 🎪 Demo Data Generation

### Generate Sample Leads

```bash
# Generate 100 demo leads
curl -X POST http://localhost:4000/demo/leads/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 100, "teamId": "demo"}'
```

### Reset Demo Data

```bash
# Clear and regenerate demo data
curl -X POST http://localhost:4000/demo/workflow/full \
  -H "Content-Type: application/json" \
  -d '{"teamId": "demo", "leadCount": 50}'
```

---

## 🔒 Security Checklist for Demos

Before demoing to potential buyers:

- [ ] Remove personal data from demo leads
- [ ] Use test phone numbers (not real contacts)
- [ ] Don't show real customer data
- [ ] Use sandbox API keys for testing
- [ ] Reset demo data after use
- [ ] Document what's been shown

### Demo Data Best Practices

```typescript
// Use these patterns for safe demos:
const demoLead = {
  firstName: "Demo",
  lastName: "User",
  phone: "+15551234567",  // Fake number
  email: "demo@example.com",  // Fake email
  company: "Demo Company",
  address: "123 Demo Street"
};
```

---

## 📈 Performance Benchmarks

| Metric | Value | Notes |
|--------|-------|-------|
| API Response Time | <100ms | Simple queries |
| Page Load Time | <2s | Frontend |
| SMS Delivery | <5s | SignalHouse |
| AI Response | <3s | OpenAI/Claude |

---

## 🆘 Emergency Procedures

### Platform Down - Quick Recovery

```bash
# 1. Check service status
curl http://localhost:4000/health

# 2. Restart services
# Ctrl+C to stop current dev server
pnpm dev

# 3. Check logs for errors
# Look for red error messages
```

### Database Corruption

```bash
# 1. Backup current data (if possible)
pg_dump outreach > backup_$(date +%Y%m%d).sql

# 2. Reset database
pnpm --filter api db:drop
pnpm db:push
pnpm --filter api db:seed
```

### API Key Compromised

```bash
# 1. Rotate key in service dashboard
# (SignalHouse, OpenAI, etc.)

# 2. Update environment variable
nano apps/api/.env

# 3. Restart API server
```

---

## 📝 Demo Recording Tips

### For Video Demos

1. **Clear browser cache** before recording
2. **Use incognito mode** to avoid extensions
3. **Record in 1080p** minimum
4. **Test audio** if using narration
5. **Prepare backup demo** in case of issues

### For Live Demos

1. **Have backup ready** if internet fails
2. **Practice the demo** 2-3 times
3. **Time yourself** (keep under 15 minutes)
4. **Prepare questions** buyers might ask
5. **Have pricing sheet** ready

---

## 💰 Selling Points to Highlight

### For Technical Buyers

- "Built with Next.js 15 and NestJS 10"
- "Nx monorepo architecture"
- "TypeScript throughout"
- "Drizzle ORM for type-safe queries"
- "Serverless-ready design"

### For Business Buyers

- "AI-powered outreach (GIANNA + CATHY)"
- "Multi-channel (SMS, Voice, Email)"
- "Real-time analytics"
- "Integration-ready (8+ services)"
- "Scalable to thousands of leads"

### For Investors

- "60-day development timeline"
- "952 commits of progress"
- "Enterprise-grade architecture"
- "Revenue-ready platform"
- "Low infrastructure costs"

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start all services |
| `pnpm dev:api` | Start API only |
| `pnpm dev:front` | Start frontend only |
| `pnpm db:push` | Run migrations |
| `curl http://localhost:4000/health` | Check API health |

**URLs:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- API Health: http://localhost:4000/health

---

*Last Updated: 2026-01-27*
*For questions, see README.md or create GitHub issue*
