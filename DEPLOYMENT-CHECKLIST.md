# DEPLOYMENT CHECKLIST - Get Everything Running NOW

## DEPLOYMENT 1: Main App (monkfish-app-mb7h3.ondigitalocean.app)

### Current Status
- ✅ App deployed and working
- ✅ Admin login working (admin@nextier.com / Admin123!)
- ✅ Database connected
- ✅ Branding updated to "Nextier"
- ❌ SendGrid not configured (emails won't work)
- ❌ Twilio not configured (SMS won't work)
- ❌ SignalHouse.io not configured
- ❌ Real Estate API not configured

### Add These Environment Variables NOW

Go to: https://cloud.digitalocean.com/apps/98cd0402-e1d4-48ef-9adf-173580806a89/settings

Click: **nextier** service → **Environment Variables** → **Edit**

```bash
# SendGrid (for emails)
SENDGRID_API_KEY=SG.your_actual_key_here

# Twilio (for SMS/calls)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_actual_token
TWILIO_PHONE_NUMBER=+1234567890

# SignalHouse.io (for SMS)
SIGNALHOUSE_API_KEY=your_actual_key
SIGNALHOUSE_API_URL=https://api.signalhouse.io

# Real Estate API
REAL_ESTATE_API_KEY=your_actual_key
REAL_ESTATE_API_URL=https://api.yourrealestateservice.com
```

Click **SAVE** → App will auto-redeploy (5 minutes)

### Test After Deployment

1. **Test Email**: Go to https://monkfish-app-mb7h3.ondigitalocean.app/t/admin-team → Try inviting a team member
2. **Test SMS**: Create a test campaign with SMS step
3. **Check Logs**: https://cloud.digitalocean.com/apps/98cd0402-e1d4-48ef-9adf-173580806a89/logs

---

## DEPLOYMENT 2: Client Fork (hasaas.app)

### Current Environment Variables (from your screenshot)
```bash
NX_NO_CLOUD=true
NX_CLOUD_ACCESS_TOKEN=supersecret
NEXT_PUBLIC_API_URL=https://api.hasaas.app
BASE_URL=pushbuttoncode  # ← NEEDS TO CHANGE
```

### What Needs to Change

1. **Branding**: Update `BASE_URL=pushbuttoncode` to `BASE_URL=hasaas`
2. **Add App Name**: Add `NEXT_PUBLIC_APP_NAME=HasSaaS`
3. **Add Zoho Integration**: The code is already there! Just add:

```bash
# Zoho CRM Integration (ALREADY BUILT IN CODE!)
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_SCOPES=ZohoCRM.modules.ALL,ZohoCRM.settings.fields.READ

# App URL for OAuth callback
APP_URL=https://api.hasaas.app
```

### How to Get Zoho Credentials

1. Go to: https://api-console.zoho.com/
2. Click **Add Client** → **Server-based Applications**
3. Fill in:
   - **Client Name**: HasSaaS
   - **Homepage URL**: https://hasaas.app
   - **Authorized Redirect URI**: https://api.hasaas.app/oauth/zoho/callback
4. Copy the **Client ID** and **Client Secret**

### Enable Zoho Integration in UI

Once Zoho credentials are added:

1. Login to hasaas.app admin panel
2. Go to **Integrations** → **Connect Zoho CRM**
3. Click **Connect** → OAuth flow will start
4. Authorize the app
5. Done! Leads will sync from Zoho CRM automatically

---

## ZOHO INTEGRATION - How It Works

### Already Built Features

The Zoho integration at [apps/api/src/app/integration/services/zoho.service.ts](apps/api/src/app/integration/services/zoho.service.ts) includes:

1. **OAuth Connection**: `connect()` - Generates OAuth URL
2. **Token Management**: `generateToken()`, `generateRefreshToken()` - Handles auth
3. **Fetch Leads**: `records()` - Pulls leads from Zoho CRM
4. **Field Mapping**: `fields()` - Gets custom fields from Zoho
5. **Auto-Sync**: Background job syncs leads automatically

### Standard Fields Mapped

```typescript
// These Zoho fields automatically map to your leads:
First_Name → firstName
Last_Name → lastName
Company → company
Email → email
Phone → phone
Mobile → phone (fallback)
Lead_Source → source
Lead_Status → status
Street → street
City → city
State → state
Zip_Code → zipCode
Country → country
Website → website
Industry → industry
Annual_Revenue → revenue
No_of_Employees → employeeCount
Description → notes
Rating → rating
```

### How to Use Zoho Integration

**Step 1: Connect in UI**
- Go to Integrations → Zoho CRM
- Click Connect
- Authorize

**Step 2: Import Leads**
- Go to Leads → Import
- Select "Import from Zoho CRM"
- Choose module (Leads, Contacts, etc.)
- Map fields (auto-mapped if using standard fields)
- Click Import

**Step 3: Auto-Sync**
- Enable auto-sync in integration settings
- Set sync interval (hourly, daily, etc.)
- New leads automatically appear in your system

---

## SIGNALHOUSE.IO + REAL ESTATE API

These need custom code added. I already created the implementation in [CUSTOM-INTEGRATIONS-GUIDE.md](CUSTOM-INTEGRATIONS-GUIDE.md).

**To add these:**

1. Copy the service code from CUSTOM-INTEGRATIONS-GUIDE.md
2. Add to [apps/api/src/app/integration/services/](apps/api/src/app/integration/services/)
3. Register in [apps/api/src/app/integration/integration.module.ts](apps/api/src/app/integration/integration.module.ts)
4. Add environment variables
5. Redeploy

**Estimated time**: 15 minutes each

---

## SECURITY REMINDER

🚨 **CRITICAL**: The production .env file you shared earlier contains REAL credentials that are now exposed:

**You MUST rotate these immediately:**

1. **Database Password**: Go to DigitalOcean → Databases → Reset Password
2. **JWT Secret**: Generate new secret, update in DigitalOcean env vars
3. **Real Estate API Key**: Regenerate in their dashboard
4. **Zoho OAuth Tokens**: Revoke and reconnect
5. **Notion Token**: Regenerate in Notion integrations
6. **Redis Password**: Rotate in DigitalOcean

**DO THIS TODAY** - Exposed credentials can be used by anyone who sees them.

---

## NEXT STEPS - IN ORDER

### For Main App (monkfish-app-mb7h3.ondigitalocean.app):

1. ✅ DONE: Login working
2. ✅ DONE: Branding updated
3. ⏳ NOW: Add API keys to DigitalOcean (SendGrid, Twilio)
4. ⏳ NEXT: Test email/SMS sending
5. ⏳ LATER: Add SignalHouse + Real Estate API (15 min each)

### For Client Fork (hasaas.app):

1. ⏳ NOW: Add Zoho credentials to environment variables
2. ⏳ NOW: Update branding (BASE_URL, NEXT_PUBLIC_APP_NAME)
3. ⏳ NEXT: Test Zoho OAuth connection
4. ⏳ NEXT: Import test leads from Zoho
5. ⏳ LATER: Customize for client's branding/needs

### Security (URGENT):

1. ⚠️ NOW: Rotate database password
2. ⚠️ NOW: Regenerate JWT secret
3. ⚠️ NOW: Rotate all API keys from exposed .env file

---

## QUICK REFERENCE

**Main App URL**: https://monkfish-app-mb7h3.ondigitalocean.app/t/admin-team
**Login**: admin@nextier.com / Admin123!
**Settings**: https://cloud.digitalocean.com/apps/98cd0402-e1d4-48ef-9adf-173580806a89/settings
**Logs**: https://cloud.digitalocean.com/apps/98cd0402-e1d4-48ef-9adf-173580806a89/logs

**Client App**: https://hasaas.app (or wherever deployed)
**Zoho Console**: https://api-console.zoho.com/

**All Guides**:
- [FAST-SETUP.md](FAST-SETUP.md) - Quick setup for APIs
- [QUICK-START-GUIDE.md](QUICK-START-GUIDE.md) - How to use the system
- [CUSTOM-INTEGRATIONS-GUIDE.md](CUSTOM-INTEGRATIONS-GUIDE.md) - SignalHouse + Real Estate API code
- [CHECKPOINT.md](CHECKPOINT.md) - Complete system documentation

---

## YOU'RE ALMOST THERE!

The hardest parts are DONE:
- ✅ App deployed and working
- ✅ Login fixed
- ✅ Database connected
- ✅ Zoho integration already built
- ✅ Team dashboard accessible

Just need to:
1. Add API keys (5 minutes)
2. Test integrations (10 minutes)
3. Import leads (5 minutes)
4. Run your first campaign (5 minutes)

**Total time to fully operational: ~25 minutes**

Let's go! 🚀
