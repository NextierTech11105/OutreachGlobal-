# OutreachGlobal Commands Reference

Quick reference for all common commands used in this project.

---

## Git Commands

```powershell
# Check status
git status

# Stage all changes
git add -A

# Stage specific files/folders (safer)
git add apps/front/src/ docs/

# Commit with message
git commit -m "Your commit message"

# Push to GitHub (triggers auto-deploy)
git push origin main

# Full deploy workflow
git add apps/front/src/ docs/ && git commit -m "Description" && git push origin main

# Reset last commit (if needed)
git reset --soft HEAD~1

# View recent commits
git log --oneline -10
```

---

## DigitalOcean CLI (doctl)

```powershell
# List all apps
doctl apps list

# Check deployment status
doctl apps list-deployments c61ce74c-eb13-4eaa-b856-f632849111c9

# Get app logs
doctl apps logs c61ce74c-eb13-4eaa-b856-f632849111c9

# Get current app spec
doctl apps spec get c61ce74c-eb13-4eaa-b856-f632849111c9

# Update app from spec file
doctl apps update c61ce74c-eb13-4eaa-b856-f632849111c9 --spec nextier-spec.yaml

# Create new deployment
doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9
```

### App IDs
- **nextier-app**: `c61ce74c-eb13-4eaa-b856-f632849111c9`
- **homeowner-advisors**: `53507b53-168a-413e-ac74-ccbf69e2965f`

### Live URL
- https://monkfish-app-mb7h3.ondigitalocean.app

---

## API Testing (curl)

```powershell
# Test SignalHouse status
curl https://monkfish-app-mb7h3.ondigitalocean.app/api/signalhouse/bulk-send

# Test buckets API
curl https://monkfish-app-mb7h3.ondigitalocean.app/api/buckets

# Test property bucket
curl https://monkfish-app-mb7h3.ondigitalocean.app/api/property/bucket

# Test Apollo search (POST)
curl -X POST https://monkfish-app-mb7h3.ondigitalocean.app/api/apollo/search -H "Content-Type: application/json" -d '{"query":"CEO"}'

# Test B2B search
curl -X POST https://monkfish-app-mb7h3.ondigitalocean.app/api/b2b/search -H "Content-Type: application/json" -d '{"query":"plumber","state":"NY"}'
```

---

## NPM Commands

```powershell
# Install dependencies
npm install

# Run dev server locally
npm run dev

# Build production
npm run build

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

---

## Environment Variables (DO App Platform)

Key environment variables needed:

```
# SignalHouse SMS
SIGNALHOUSE_API_KEY=your_api_key
SIGNALHOUSE_AUTH_TOKEN=your_jwt_token
SIGNALHOUSE_DEFAULT_NUMBER=+1XXXXXXXXXX

# Apollo.io
APOLLO_IO_API_KEY=your_apollo_key

# Real Estate API
REALESTATE_API_KEY=NEXTIER-2906-74a1-8684-d2f63f473b7b

# Twilio (Voice/SMS backup)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# OpenAI/Anthropic
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

---

## Quick Workflows

### Deploy Changes
```powershell
# 1. Stage safe files only (excludes secrets)
git add apps/front/src/ docs/ functions/

# 2. Commit
git commit -m "Your description"

# 3. Push (auto-deploys to DO)
git push origin main

# 4. Monitor deployment
doctl apps list-deployments c61ce74c-eb13-4eaa-b856-f632849111c9 --format Phase,Progress
```

### Check System Health
```powershell
# All in one
curl -s https://monkfish-app-mb7h3.ondigitalocean.app/api/signalhouse/bulk-send | jq .configured
curl -s https://monkfish-app-mb7h3.ondigitalocean.app/api/buckets | jq .count
```

---

## SignalHouse Setup (One-Time)

1. **Register 10DLC Brand**: SignalHouse Dashboard > Brands > Register
2. **Create Campaign**: Dashboard > Campaigns > Create (Real Estate type)
3. **Buy Phone Number**: Dashboard > Numbers > Purchase (local 10DLC)
4. **Set Webhook**: `https://monkfish-app-mb7h3.ondigitalocean.app/api/webhook/signalhouse`
5. **Add to DO**: Set `SIGNALHOUSE_DEFAULT_NUMBER` env var

---

## Troubleshooting

### Git Push Blocked by Secrets
```powershell
# Reset commit
git reset --soft HEAD~1

# Check what has secrets
git diff --cached --name-only | Select-String "\.ps1|\.yaml|\.json"

# Stage only safe files
git add apps/front/src/ docs/
```

### Check Deployment Logs
```powershell
doctl apps logs c61ce74c-eb13-4eaa-b856-f632849111c9 --type=build
doctl apps logs c61ce74c-eb13-4eaa-b856-f632849111c9 --type=run
```

### API Returning 500
```powershell
# Check if env vars are set
doctl apps spec get c61ce74c-eb13-4eaa-b856-f632849111c9 | Select-String "SIGNALHOUSE|APOLLO|REALESTATE"
```

---

*Last updated: December 12, 2025*
