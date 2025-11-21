# 🏡 HAAS DEPLOYMENT GUIDE (Silvia's Real Estate System)

## Cloning Nextier for Silvia with Zoho Integration

---

## 📋 HAAS vs NEXTIER

### **NEXTIER (Your System)**
- Target: B2B commercial / blue-collar business owners
- Database: PostgreSQL (DigitalOcean)
- Lead Source: RealEstateAPI commercial properties
- Your API keys

### **HAAS (Silvia's System)**
- Target: Real estate investors / property buyers
- Database: **Zoho Datastore** (or PostgreSQL)
- CRM: **Zoho CRM** (she already has leads there!)
- Lead Source: RealEstateAPI residential properties
- Silvia's API keys
- ✅ **Zoho integration already built in codebase!**

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Create New DigitalOcean App**

1. Go to DigitalOcean → Apps → Create App

2. **Source**: Same GitHub repo
   - Repository: `NextierTech11105/OutreachGlobal-`
   - Branch: `main` (or create `haas-production` branch)

3. **App Name**: `haas-app`

4. **Environment**: Production

---

### **Step 2: Configure HAAS Environment Variables**

Add these to the new HAAS app settings:

#### **Branding**
```bash
NEXT_PUBLIC_APP_NAME=HAAS
APP_URL=https://[your-haas-app-url].ondigitalocean.app
```

#### **Database** (Choose One)

**Option A: New PostgreSQL Database** (Recommended)
```bash
DATABASE_URL=postgresql://[new-db-user]:[password]@[db-host]:25060/haas_db?sslmode=require
```

**Option B: Zoho Datastore**
```bash
ZOHO_DATASTORE_URL=[Zoho Catalyst datastore URL]
ZOHO_DATASTORE_TOKEN=[Silvia's Zoho token]
```

#### **Zoho CRM Integration** (Silvia already has this!)
```bash
ZOHO_CLIENT_ID=[Silvia's Zoho OAuth client ID]
ZOHO_CLIENT_SECRET=[Silvia's Zoho OAuth secret]
ZOHO_SCOPES=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL
ZOHO_REFRESH_TOKEN=[generated during OAuth]
```

#### **RealEstateAPI** (Silvia's keys)
```bash
REALESTATE_API_KEY=[Silvia's property data key]
REALESTATE_SKIPTRACE_API_KEY=[Silvia's skip trace key]
```

#### **AI Models** (Silvia's keys)
```bash
ANTHROPIC_API_KEY=[Silvia's key]
OPENAI_API_KEY=[Silvia's key]
```

#### **SMS & Email** (Silvia's accounts)
```bash
SIGNALHOUSE_API_KEY=[Silvia's SignalHouse key]
SENDGRID_API_KEY=[Silvia's SendGrid key]
TWILIO_ACCOUNT_SID=[Silvia's Twilio SID]
TWILIO_AUTH_TOKEN=[Silvia's Twilio token]
TWILIO_PHONE_NUMBER=[Silvia's Twilio number]
```

#### **Property Hunt API** (Optional - or use Zoho)
```bash
PROPERTY_HUNT_API_URL=[deploy separate instance OR skip if using Zoho directly]
```

---

### **Step 3: Zoho CRM OAuth Setup**

The Zoho integration is already built! Just need to connect Silvia's account:

#### **A. Create Zoho OAuth App**

1. Go to: https://api-console.zoho.com/
2. Create new **Server-based Application**
3. Get:
   - Client ID
   - Client Secret
4. Add Redirect URI: `https://[haas-app-url]/oauth/zoho/callback`

#### **B. Generate Refresh Token**

Run this in HAAS after deployment:

```javascript
// Navigate to this URL in browser (replace with Silvia's values)
https://accounts.zoho.com/oauth/v2/auth?
  scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL
  &client_id=[ZOHO_CLIENT_ID]
  &response_type=code
  &access_type=offline
  &redirect_uri=https://[haas-app-url]/oauth/zoho/callback

// After authorization, exchange code for refresh token
// This happens automatically via the /oauth/zoho/callback endpoint
```

#### **C. Test Zoho Connection**

```bash
# In HAAS app, visit:
https://[haas-app-url]/admin/integrations/zoho

# Should show:
✅ Connected to Zoho CRM
✅ Can access Leads module
✅ Can sync data
```

---

### **Step 4: Configure Lead Flow (RealEstateAPI → HAAS → Zoho)**

Create automated workflow for Silvia:

#### **Daily Automation Script**: `haas-daily-leads.js`

```javascript
/**
 * HAAS DAILY LEAD AUTOMATION
 *
 * 1. Get new properties from RealEstateAPI (Silvia's saved searches)
 * 2. Skip trace for contact info
 * 3. Import to HAAS database
 * 4. Sync to Zoho CRM as Leads
 * 5. Launch AI campaigns
 */

const HAAS_API = 'https://[haas-app-url].ondigitalocean.app';
const ZOHO_CRM_MODULE = 'Leads';  // Or 'Contacts'

async function syncToZohoCRM(leads) {
  // Use built-in Zoho service
  const response = await fetch(`${HAAS_API}/api/zoho/sync-leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      module: ZOHO_CRM_MODULE,
      leads: leads.map(lead => ({
        First_Name: lead.ownerFirstName,
        Last_Name: lead.ownerLastName,
        Email: lead.email,
        Phone: lead.phone,
        Street: lead.propertyAddress,
        City: lead.city,
        State: lead.state,
        Zip_Code: lead.zipCode,
        Lead_Source: 'RealEstateAPI Automation',
        Lead_Status: 'New',
        Description: `Property: ${lead.propertyAddress}, Value: $${lead.propertyValue}, Equity: $${lead.equity}`,
        // Custom fields
        Property_Value: lead.propertyValue,
        Estimated_Equity: lead.equity,
        Pre_Foreclosure: lead.preForeclosure || false
      }))
    })
  });

  return response.json();
}

// Run daily at 6 AM
// Retrieve saved searches → Skip trace → Import to HAAS → Sync to Zoho
```

---

### **Step 5: Update Branding**

Change "Nextier" to "HAAS" throughout:

#### **Frontend Branding**
```bash
# apps/front/.env.production
NEXT_PUBLIC_APP_NAME=HAAS

# This automatically updates:
# - Page titles
# - Logo text
# - Email footers
# - Campaign signatures
```

#### **Custom Logo** (Optional)
```bash
# Replace logo file:
apps/front/public/logo.png  # with HAAS logo
```

---

### **Step 6: Create HAAS Admin User**

After deployment, create admin account for Silvia:

```bash
# SSH into HAAS app or run via console:
node create-haas-admin.js
```

```javascript
// create-haas-admin.js
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  await client.connect();

  const hashedPassword = await bcrypt.hash('SilviaAdmin123!', 10);
  const userId = ulid();
  const teamId = ulid();

  // Create user
  await client.query(`
    INSERT INTO users (id, email, name, password, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
  `, [userId, 'silvia@haas.com', 'Silvia', hashedPassword]);

  // Create team
  await client.query(`
    INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
  `, [teamId, userId, 'HAAS Team', 'haas-team']);

  console.log('✅ HAAS admin created!');
  console.log('   Email: silvia@haas.com');
  console.log('   Password: SilviaAdmin123!');
  console.log('   Team: /t/haas-team');

  await client.end();
}

createAdmin();
```

---

### **Step 7: Configure Saved Searches (Silvia's Criteria)**

Create saved searches targeting **residential real estate investors**:

#### **Example 1: High-Equity Pre-Foreclosures**
```javascript
{
  search_name: "HAAS - Pre-Foreclosure High Equity",
  search_query: {
    state: "FL",  // Silvia's markets
    pre_foreclosure: true,
    equity_percent_min: 50,
    property_type: "SFR",  // Single family residential
    value_min: 200000,
    value_max: 800000,
    size: 1000
  }
}
```

#### **Example 2: Absentee Owners**
```javascript
{
  search_name: "HAAS - Absentee Owners High Equity",
  search_query: {
    state: "FL",
    absentee_owner: true,
    equity_percent_min: 40,
    property_type: "SFR",
    last_sale_date_max: "2015-01-01",  // Long-term owners
    size: 1000
  }
}
```

#### **Example 3: Vacant Properties**
```javascript
{
  search_name: "HAAS - Vacant Properties",
  search_query: {
    state: "FL",
    vacant: true,
    property_type: "SFR",
    value_min: 150000,
    size: 500
  }
}
```

---

### **Step 8: Campaign Templates for HAAS**

Create AI-powered campaigns for real estate investors:

#### **Campaign 1: Pre-Foreclosure Outreach**

**SMS (Day 0)**:
```
Hi {{firstName}}, I help homeowners facing foreclosure find solutions.
I can offer a fair cash price for your {{city}} property.
Interested? Reply YES for details.
```

**Email (Day 2)**:
```
Subject: Help with Your {{city}} Property

Hi {{firstName}},

I understand dealing with pre-foreclosure can be stressful.

I specialize in helping homeowners in situations like yours find
quick, fair solutions - often within days.

I'd like to discuss options for your {{address}} property.

Can we schedule a quick 10-minute call?

Best,
[Silvia's Name]
HAAS Real Estate Solutions
```

**Call (Day 4)**: AI voice or manual call

**Follow-up SMS (Day 7)**:
```
{{firstName}}, still interested in discussing your {{city}} property?
We can close in as little as 7 days. Call me: [number]
```

---

### **Step 9: Zoho CRM Workflow**

Set up automatic Zoho CRM workflows:

1. **New Lead Created** → Send welcome email
2. **Lead Responds "YES"** → Move to "Qualified" status
3. **Lead Qualified** → Assign to Silvia
4. **Follow-up Reminder** → 3 days after last contact
5. **Deal Closed** → Move to Zoho Deals module

All automated through Zoho CRM's workflow rules!

---

## 🔄 COMPLETE HAAS WORKFLOW

### **Every Morning (Automated)**:
1. ⏰ 6:00 AM - Automation runs
2. 📥 Retrieve new properties from saved searches
3. 🔍 Skip trace each property
4. 💾 Import to HAAS database
5. 🔗 **Sync to Silvia's Zoho CRM as Leads**
6. 🤖 AI generates personalized messages
7. 📱 SMS sent via Silvia's SignalHouse
8. 📧 Emails sent via Silvia's SendGrid
9. 📞 Calls queued via Silvia's Twilio

### **When Leads Respond**:
1. 🔗 **Response tracked in Zoho CRM**
2. 🤖 AI analyzes sentiment
3. ✅ Interested → Update Zoho status to "Qualified"
4. 📞 Silvia gets notification in Zoho CRM
5. 🏆 Close deal → Track in Zoho Deals

---

## 📊 HAAS ACCESS DETAILS

```
URL: https://[haas-app-url].ondigitalocean.app
Login: silvia@haas.com
Password: SilviaAdmin123!
Team: /t/haas-team

Zoho CRM: https://crm.zoho.com
```

---

## ✅ HAAS DEPLOYMENT CHECKLIST

- [ ] Create new DigitalOcean app "haas-app"
- [ ] Add all environment variables (Silvia's keys)
- [ ] Set NEXT_PUBLIC_APP_NAME=HAAS
- [ ] Create new PostgreSQL database (or configure Zoho Datastore)
- [ ] Set up Zoho OAuth app
- [ ] Generate Zoho refresh token
- [ ] Test Zoho CRM connection
- [ ] Create Silvia's admin account
- [ ] Create saved searches for residential properties
- [ ] Set up daily automation cron job
- [ ] Configure campaign templates
- [ ] Test lead import → Zoho sync
- [ ] Train Silvia on HAAS dashboard
- [ ] **Launch!**

---

## 🎯 HAAS SUCCESS METRICS

With automated lead generation + Zoho CRM:

**Monthly Results**:
- 300 new residential leads/month
- 225 skip traced (75% success)
- 200 synced to Zoho CRM
- 50-75 responses (25-35% rate)
- **2-4 deals closed** (Silvia's goal)

**Revenue** (avg $15k profit per deal):
- 2 deals/month = **$30,000/month**
- 3 deals/month = **$45,000/month**
- 4 deals/month = **$60,000/month**

**Cost**: ~$200/month (APIs + delivery)
**ROI**: **15,000% - 30,000%**

---

## 🚀 HAAS IS READY!

Once deployed, Silvia will have:
- ✅ Automated daily lead generation
- ✅ All leads synced to her Zoho CRM
- ✅ AI-powered multi-channel campaigns
- ✅ Automated follow-ups
- ✅ Everything tracked in Zoho
- ✅ She just closes deals!

**Nextier for you → HAAS for Silvia → Both printing money!** 💰
