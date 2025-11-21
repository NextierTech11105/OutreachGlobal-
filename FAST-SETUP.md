# ⚡ FAST SETUP - Get Running NOW

## 1. Get API Keys (Do This First!)

### SendGrid (for emails)
1. Go to: https://signup.sendgrid.com
2. Sign up (FREE - 100 emails/day)
3. Once logged in:
   - Click **Settings** → **API Keys**
   - Click **Create API Key**
   - Name it "Nextier"
   - Give it **Full Access**
   - Copy the API key (you won't see it again!)

**Save this:** `SG.xxxxxxxxxxxxxxxxx`

### Twilio (for SMS/calls)
1. Go to: https://www.twilio.com/try-twilio
2. Sign up (FREE $15 trial credit)
3. Once logged in:
   - **Account SID:** (on dashboard)
   - **Auth Token:** (click to reveal)
   - **Phone Number:** Get a free trial number

**Save these:**
- Account SID: `ACxxxxxxxxxxxxxxxxx`
- Auth Token: `xxxxxxxxxxxxxxxxx`
- Phone Number: `+1234567890`

---

## 2. Add to DigitalOcean (5 minutes)

### Go to App Settings
https://cloud.digitalocean.com/apps/98cd0402-e1d4-48ef-9adf-173580806a89/settings

### Click on "nextier" service → Environment Variables → Edit

### Add These Variables:

```bash
# SendGrid
SENDGRID_API_KEY=SG.your_key_here

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Click SAVE

**App will automatically redeploy (takes 5 min)**

---

## 3. Test Immediately

### Once Redeployed:

**Test Email:**
1. Go to your app: https://monkfish-app-mb7h3.ondigitalocean.app/t/admin-team
2. Try inviting a team member
3. Should work now!

**Test SMS:**
1. Go to Campaigns
2. Create a test campaign
3. Add SMS step
4. Should send via Twilio!

---

## 4. Import Leads (3 options)

### Option A: Manual (Fastest - Start Now!)
1. Go to **Leads** → **Create**
2. Add leads one by one
3. Good for testing

### Option B: CSV Import Script (15 min)

Create `import-leads.csv`:
```csv
firstName,lastName,email,phone,company,city,state,zipCode
John,Doe,john@example.com,+15551234567,Acme Inc,New York,NY,10001
Jane,Smith,jane@example.com,+15559876543,Tech Co,Los Angeles,CA,90001
```

Then run this script:

```javascript
// import-leads-from-csv.js
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const csvContent = fs.readFileSync('./import-leads.csv', 'utf-8');
const leads = parse(csvContent, { columns: true });

console.log('Import this via GraphQL:');
leads.forEach(lead => {
  console.log(`
mutation {
  createLead(teamId: "YOUR_TEAM_ID", input: {
    firstName: "${lead.firstName}"
    lastName: "${lead.lastName}"
    email: "${lead.email}"
    phone: "${lead.phone}"
    company: "${lead.company}"
    city: "${lead.city}"
    state: "${lead.state}"
    zipCode: "${lead.zipCode}"
  }) {
    lead { id }
  }
}
  `);
});
```

### Option C: Real Estate API (If you have access)
Tell me which API you use:
- MLS Direct?
- PropStream?
- REIPro?
- Other?

I'll create the integration immediately.

---

## 5. Create Your First Campaign (5 min)

### Go to Campaigns → Create Campaign

**Settings:**
- **Name:** "Test Outreach"
- **Description:** "Testing the system"
- **Target:** All leads
- **Start Date:** Today

### Add Sequence Steps:

**Step 1: Email**
- Type: Email
- Delay: 0 days
- Template: "Hi {{firstName}}, testing our new system!"

**Step 2: SMS**
- Type: SMS
- Delay: 1 day
- Template: "Hi {{firstName}}, quick follow up!"

**Step 3: Call**
- Type: Call
- Delay: 2 days
- Script: "Connect with {{firstName}} about their property"

### Click START CAMPAIGN

---

## 6. Monitor Results

### Check Inbox
- See responses coming in
- AI will auto-respond

### Check Analytics
- See open rates
- See response rates
- See conversions

---

## ⚡ CLIENT FORK (hasaas.app)

To clone this for your client:

### 1. Fork on GitHub
- Go to your repo
- Click **Fork** or create new from template

### 2. Create New DigitalOcean App
- New App → From GitHub
- Select forked repo
- Use same app spec

### 3. Create New Database
- New PostgreSQL database
- Update DATABASE_URL

### 4. Deploy
- Auto-deploys
- Create separate admin user
- Done!

### 5. Brand for Client
Update environment variable:
```bash
NEXT_PUBLIC_APP_NAME=HasSaaS
```

---

## 🆘 TROUBLESHOOTING

### Emails not sending?
Check:
1. SendGrid API key is correct
2. Environment variables saved
3. App redeployed
4. Check DigitalOcean logs

### SMS not sending?
Check:
1. Twilio credentials correct
2. Phone number is verified
3. Trial account limitations
4. Check Twilio console logs

### Can't import leads?
- Start with manual entry
- Use GraphQL Playground to test
- Check lead data format

---

## 📞 READY TO GO?

**Your checklist:**
- [ ] SendGrid API key added
- [ ] Twilio credentials added
- [ ] App redeployed
- [ ] Test email sent
- [ ] Test SMS sent
- [ ] Leads imported
- [ ] Campaign created
- [ ] System running!

**You're now live!** 🎉

Need Real Estate API integration? Tell me which service and I'll code it in 10 minutes.
