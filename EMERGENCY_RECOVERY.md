# 🚨 Emergency Recovery Guide

**Last Updated:** January 2026  
**Status:** Production Emergency Tools Active

---

## 🎯 Quick Start (If You're Locked Out)

If you cannot access your OutreachGlobal application, follow these steps **in order**:

### Step 1: Access the Admin Dashboard

The emergency admin dashboard provides visibility into what's working and what's broken.

**Health Check Endpoint:**
```bash
curl https://nextier-bxrzn.ondigitalocean.app/admin/health
```

**System Status Endpoint:**
```bash
curl https://nextier-bxrzn.ondigitalocean.app/admin/status
```

**Spaces Diagnostic:**
```bash
curl -X POST https://nextier-bxrzn.ondigitalocean.app/admin/fix-spaces
```

### Step 2: Run the Emergency Recovery Script

From your project root:

```bash
./emergency-recover.sh
```

This script will:
- ✅ Check if required tools (doctl, curl) are installed
- ✅ Test admin dashboard accessibility
- ✅ Retrieve app status from DigitalOcean
- ✅ Show recent logs
- ✅ Test database connection
- ✅ Test Spaces connection
- ✅ Provide specific fix instructions

---

## 🔧 Common Emergency Fixes

### Problem 1: DigitalOcean Spaces Credentials Broken

**Symptoms:**
- File uploads failing
- Datalake not accessible
- Research library broken
- Error: `SignatureDoesNotMatch`

**Fix:**

1. **Generate New Spaces Keys:**
   - Go to: https://cloud.digitalocean.com/account/api/spaces
   - Find and **DELETE** old keys named "OutreachGlobal"
   - Click **"Generate New Key"**
   - Name: `OutreachGlobal-Production-2024`
   - **Copy BOTH Key and Secret immediately** (you can't view Secret again!)

2. **Update Environment Variables:**
   - Go to: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings
   - Click **"Edit"** on Environment Variables section
   - Update:
     ```
     DO_SPACES_KEY=<your-new-key>
     DO_SPACES_SECRET=<your-new-secret>
     ```
   - Click **"Save"**

3. **Redeploy:**
   - App will auto-redeploy after env var changes
   - Or manually: `doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9`

4. **Verify:**
   - Wait 3-5 minutes for deployment
   - Run: `curl -X POST https://nextier-bxrzn.ondigitalocean.app/admin/fix-spaces`
   - Should see: `✅ Credentials Valid`

---

### Problem 2: Database Schema Missing Column

**Symptoms:**
- API returns 500 errors
- Error mentions `column "from_phone" does not exist`
- SMS messages failing

**Fix:**

1. **Run Migration Locally (Development):**
   ```bash
   cd /path/to/OutreachGlobal
   pnpm nx run api:db:migrate
   ```

2. **Run Migration in Production:**
   
   **Option A: Via App Rebuild** (Recommended)
   ```bash
   doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9 --force-rebuild
   ```

   **Option B: Direct Database Access**
   - Get database credentials from: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings
   - Connect with: `psql <DATABASE_URL>`
   - Run migration SQL from: `apps/api/src/database/migrations/0031_add_from_phone_to_sms.sql`

3. **Verify:**
   ```bash
   curl https://nextier-bxrzn.ondigitalocean.app/admin/status
   ```
   Check that database shows correct table count

---

### Problem 3: Cannot Access Admin Dashboard

**Symptoms:**
- `/admin/health` returns 404 or 500
- Admin endpoints not responding

**Fix:**

1. **Check if App is Running:**
   ```bash
   doctl apps get c61ce74c-eb13-4eaa-b856-f632849111c9
   ```
   Look for status: Should be "ACTIVE"

2. **Check Deployment Logs:**
   ```bash
   doctl apps logs c61ce74c-eb13-4eaa-b856-f632849111c9 nextier --type run --tail 100
   ```

3. **Force Rebuild:**
   ```bash
   doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9 --force-rebuild
   ```

4. **Check Build Logs:**
   ```bash
   doctl apps logs c61ce74c-eb13-4eaa-b856-f632849111c9 nextier --type build --tail 100
   ```

---

### Problem 4: Database Connection Failed

**Symptoms:**
- Health check shows: `❌ Database Failed`
- API cannot start

**Fix:**

1. **Verify DATABASE_URL is Set:**
   - Go to: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings
   - Check that `DATABASE_URL` exists and looks like:
     ```
     postgresql://user:password@host:25060/defaultdb?sslmode=require
     ```

2. **Check Database Status:**
   - Go to: https://cloud.digitalocean.com/databases
   - Verify database is "Online"

3. **Test Connection from Local Machine:**
   ```bash
   psql "postgresql://user:password@host:25060/defaultdb?sslmode=require"
   ```

4. **Check Firewall Rules:**
   - Go to database settings → Trusted Sources
   - Add DigitalOcean App Platform if missing

---

### Problem 5: Redis Connection Failed

**Symptoms:**
- Health check shows: `❌ Redis Failed`
- Job queues not working

**Fix:**

1. **Verify REDIS_URL is Set:**
   - Check: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings
   - Should look like: `rediss://default:password@host:25061`

2. **Check Redis Status:**
   - Go to: https://cloud.digitalocean.com/databases
   - Verify Redis cluster is "Online"

3. **Update Connection String if Needed:**
   - Get latest connection string from database settings
   - Update `REDIS_URL` in app environment variables

---

## 📚 Accessing DigitalOcean Console

### App Platform Console
**URL:** https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9

**What You Can Do:**
- View deployment status
- See runtime logs
- Edit environment variables
- Trigger manual deployments
- View metrics and performance

### Databases Console
**URL:** https://cloud.digitalocean.com/databases

**What You Can Do:**
- Check database health
- Get connection strings
- View metrics
- Manage backups
- Configure trusted sources

### Spaces Console
**URL:** https://cloud.digitalocean.com/spaces

**What You Can Do:**
- Browse uploaded files
- Manage buckets
- View usage statistics
- Generate access keys

### API Spaces Keys
**URL:** https://cloud.digitalocean.com/account/api/spaces

**What You Can Do:**
- Generate new Spaces keys
- Revoke old keys
- View key prefixes (not secrets)

---

## 🛠️ Installing Required Tools

### DigitalOcean CLI (doctl)

**macOS:**
```bash
brew install doctl
```

**Linux:**
```bash
snap install doctl
```

**Manual Installation:**
https://docs.digitalocean.com/reference/doctl/how-to/install/

**Authentication:**
```bash
doctl auth init
```
Follow the prompts to authenticate with your DigitalOcean account.

### Other Tools

**curl** (usually pre-installed):
```bash
# macOS
brew install curl

# Linux
sudo apt-get install curl
```

**jq** (for pretty JSON output):
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

---

## 📊 Understanding the Admin Dashboard

### Health Check (`/admin/health`)

**What It Shows:**
- ✅ Database connection status
- ✅ Spaces connection status
- ✅ Redis connection status
- ✅ Recent errors from logs

**How to Read Results:**
- `✅ Connected` = Service is working
- `❌ Failed` = Service is broken (see error details)
- `⚠️ Not Configured` = Environment variables missing

### System Status (`/admin/status`)

**What It Shows:**
- App version and environment
- Database schema information
- Number of database tables
- Migration history
- Environment variable validation

### Spaces Fix (`/admin/fix-spaces`)

**What It Does:**
- Tests current Spaces credentials
- Attempts to list buckets
- Provides detailed error messages
- Gives step-by-step fix instructions

**Common Results:**
- `✅ Credentials Valid` = Everything working
- `❌ SignatureDoesNotMatch` = Secret is wrong
- `❌ Configuration Missing` = Keys not set

---

## 🔐 Security Notes

### Admin Endpoints

The admin endpoints (`/admin/*`) are **publicly accessible** but provide **read-only diagnostic information**. They do not:
- ❌ Expose credentials (passwords are masked)
- ❌ Allow data modification
- ❌ Execute arbitrary commands
- ❌ Provide authentication bypass

### What IS Exposed:
- ✅ Service health status
- ✅ Masked connection strings (passwords hidden)
- ✅ Error messages
- ✅ Configuration validation

### Production Hardening (Optional)

To add authentication to admin endpoints in the future, update `AdminController` to use `@UseGuards(AdminGuard)`.

---

## 📞 Emergency Contacts

### DigitalOcean Support
- **Email:** support@digitalocean.com
- **Portal:** https://cloud.digitalocean.com/support/tickets
- **Phone:** Available for Business/Professional plans

### Internal Team
- **Platform Team:** [Add your team contact]
- **DevOps Lead:** [Add contact]
- **On-Call Engineer:** [Add contact]

---

## 🧪 Testing Your Recovery

After fixing issues, verify everything is working:

```bash
# 1. Check health
curl https://nextier-bxrzn.ondigitalocean.app/admin/health | jq

# 2. Check status
curl https://nextier-bxrzn.ondigitalocean.app/admin/status | jq

# 3. Test Spaces
curl -X POST https://nextier-bxrzn.ondigitalocean.app/admin/fix-spaces | jq

# 4. Test main app
curl https://nextier-bxrzn.ondigitalocean.app/ | jq
```

All endpoints should return JSON responses without errors.

---

## 📝 Keeping This Guide Updated

**When to Update:**
- ✏️ New emergency endpoints added
- ✏️ App URL changes
- ✏️ New critical services added
- ✏️ Recovery procedures change

**How to Update:**
1. Edit `EMERGENCY_RECOVERY.md`
2. Update "Last Updated" date
3. Test all commands and URLs
4. Commit changes

---

## 🎓 Additional Resources

- **Environment Variables Guide:** `docs/ENVIRONMENT_VARIABLES.md`
- **Database Schema:** `apps/api/src/database/schema/`
- **Migrations:** `apps/api/src/database/migrations/`
- **DigitalOcean Docs:** https://docs.digitalocean.com/
- **NestJS Docs:** https://docs.nestjs.com/

---

**Remember:** The admin dashboard is your first stop for any emergency. It will tell you exactly what's broken and how to fix it.

🚨 **EMERGENCY PRIORITY:** Get visibility first, fix second. Always run the health check before making changes.
