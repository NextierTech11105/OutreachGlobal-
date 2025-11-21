# Nextier Quick Start Guide

## 🚀 Getting Started with Leads & Campaigns

### Step 1: Import Leads

#### Option A: Manual Single Lead
1. Navigate to **Leads** in sidebar
2. Click **Create** button
3. Fill in lead details:
   - First Name
   - Last Name
   - Email
   - Phone
   - Company (optional)
   - Notes (optional)
4. Click **Save**

#### Option B: Bulk Import from Business List
1. Go to **Leads** → **Import Business List**
2. Configure import settings:
   - Select data source/integration
   - Define import criteria (location, industry, etc.)
   - Map fields
3. Click **Import**
4. Leads will be imported via background job

#### Option C: CSV Import (via GraphQL)
Use the `createLead` mutation multiple times or develop a CSV parser

### Step 2: Set Up Integrations

Before campaigns can execute, you need to configure:

#### Twilio Integration (for SMS/Calls)
1. Go to **Integrations** → **Twilio Settings**
2. Enter your Twilio credentials:
   - Account SID
   - Auth Token
   - Phone Number
3. Save configuration

#### SendGrid Integration (for Emails)
1. Go to **Integrations** → **SendGrid Settings**
2. Enter your SendGrid API Key
3. Configure sending email address
4. Save configuration

#### CRM Integration (optional)
1. Go to **Integrations** → **CRM**
2. Connect your CRM (Salesforce, HubSpot, etc.)
3. Map fields for sync

### Step 3: Create AI SDR Avatar

1. Navigate to **AI SDR Avatars**
2. Click **Create Avatar**
3. Configure:
   - **Name:** e.g., "Sales Rep Sarah"
   - **Personality:** Professional, friendly, persistent
   - **Voice Type:** (for calls)
   - **Industry:** Real estate, SaaS, etc.
   - **Mission:** What is this avatar's goal?
   - **Goal:** e.g., "Book meetings", "Qualify leads"
   - **Roles:** What tasks does it perform?
   - **FAQs:** Common questions it should answer
4. Click **Save**

### Step 4: Create Message Templates

1. Go to **Integrations** → **Message Templates**
2. Click **Create Template**
3. Create templates for different channels:

**Email Template:**
```
Subject: {{subject}}

Hi {{firstName}},

{{message}}

Best regards,
{{sdrName}}
```

**SMS Template:**
```
Hi {{firstName}}, {{message}}
```

4. Use variables: `{{firstName}}`, `{{lastName}}`, `{{company}}`, etc.

### Step 5: Create a Campaign

1. Navigate to **Campaigns**
2. Click **Create Campaign**
3. Configure campaign:
   - **Name:** e.g., "Q4 Outreach Campaign"
   - **Description:** Purpose of campaign
   - **SDR Avatar:** Select the AI SDR you created
   - **Target Method:** How to select leads
     - By score range
     - By location
     - By tags
   - **Min Score / Max Score:** Lead quality threshold
   - **Location:** Geographic targeting (optional)
   - **Start Date:** When campaign begins
   - **End Date:** When campaign ends (optional)
4. Click **Create**

### Step 6: Configure Campaign Sequences

After creating a campaign, set up the outreach sequence:

1. Open the campaign
2. Add sequence steps:
   - **Day 1:** Initial email
   - **Day 3:** Follow-up email
   - **Day 5:** SMS message
   - **Day 7:** Phone call
   - **Day 10:** Final email

Each step can include:
- **Type:** Email, SMS, Call
- **Template:** Select message template
- **Delay:** Days after previous step
- **Conditions:** Only send if no response, etc.

### Step 7: Launch Campaign

1. Review campaign settings
2. Check that integrations are configured
3. Verify message templates are set
4. Click **Start Campaign**
5. Campaign will automatically:
   - Select leads matching criteria
   - Execute sequence steps
   - Track responses
   - Update lead statuses

### Step 8: Monitor Performance

#### Campaign Analytics
- Go to **Campaigns** → Select campaign
- View metrics:
  - Leads contacted
  - Response rate
  - Conversion rate
  - Best performing messages

#### Lead Activity
- Go to **Leads** → Select lead
- View interaction history:
  - Emails sent/opened
  - SMS delivered/replied
  - Calls made/connected
  - Meetings booked

#### Inbox
- Check **Inbox** for incoming messages
- Respond manually or let AI SDR handle
- Mark leads as qualified/unqualified

---

## 🔧 API Access (For Developers)

### GraphQL Mutations

#### Create Single Lead
```graphql
mutation CreateLead($teamId: String!, $input: CreateLeadInput!) {
  createLead(teamId: $teamId, input: $input) {
    lead {
      id
      firstName
      lastName
      email
      phone
    }
  }
}
```

#### Import from Business List
```graphql
mutation ImportLeads($teamId: String!, $input: ImportBusinessListInput!) {
  importLeadFromBusinessList(teamId: $teamId, input: $input)
}
```

#### Create Campaign
```graphql
mutation CreateCampaign($teamId: String!, $input: CreateCampaignInput!) {
  createCampaign(teamId: $teamId, input: $input) {
    campaign {
      id
      name
      status
    }
  }
}
```

### Access GraphQL Playground
**URL:** https://monkfish-app-mb7h3.ondigitalocean.app/graphql

**Authentication:**
Add header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

Get JWT token from login response or browser localStorage.

---

## 📊 Example Workflow

### Real Estate Lead Campaign

**1. Import Properties**
- Import property listings from MLS or CSV
- Properties stored in **Properties** table

**2. Generate Leads**
- Each property owner becomes a lead
- Automatically populated:
  - Owner name
  - Property address
  - Assessed value
  - Owner-occupied status

**3. Create AI SDR Avatar**
- Name: "Real Estate Rachel"
- Personality: "Friendly, knowledgeable about real estate"
- Mission: "Connect with property owners to discuss investment opportunities"

**4. Create Campaign**
- Name: "Owner-Occupied Outreach"
- Target: Properties valued $200K-$500K, owner-occupied
- Location: Specific zip codes

**5. Launch Sequence**
- Day 1: Email introduction
- Day 3: Follow-up with market analysis
- Day 5: SMS asking about selling interest
- Day 7: Phone call to discuss
- Day 10: Final email with offer

**6. Track Results**
- Monitor response rates
- AI SDR automatically responds to inquiries
- Qualified leads marked for human follow-up

---

## 🔐 Client Fork Setup (hasaas.app)

### Creating a Client Instance

To set up a separate instance for your client (hasaas.app):

**1. Fork Repository**
```bash
# On GitHub, fork the repository
# Or create a new repo from template
```

**2. Create New DigitalOcean App**
- Go to DigitalOcean App Platform
- Create New App → From GitHub
- Select forked repository
- Configure similar to main instance

**3. Set Up Separate Database**
- Create new PostgreSQL database
- Update DATABASE_URL for client app
- Run migrations

**4. Configure Environment Variables**
```bash
# Client-specific variables
NEXT_PUBLIC_APP_NAME=HasSaaS
NEXT_PUBLIC_GRAPHQL_URL=https://hasaas-app.ondigitalocean.app/graphql
DATABASE_URL=[client-database-url]
JWT_SECRET=[unique-client-secret]
```

**5. Brand for Client**
- Update app name
- Customize colors/logo
- Configure client-specific domains

**6. Separate Admin**
- Create client admin user
- Give client access only to their instance
- They cannot see your data

### Multi-Tenant vs. Separate Instances

**Current Setup:** Separate instances (recommended)
- Complete data isolation
- Independent scaling
- Easier to manage per-client
- No risk of data leaks

**Alternative:** Multi-tenant
- One app, multiple teams
- Teams can only see their data
- More complex to manage
- More cost-effective at scale

---

## 📞 Support

For questions:
1. Check CHECKPOINT.md for configuration details
2. Review DigitalOcean logs for errors
3. Check GraphQL playground for API testing

---

**Last Updated:** November 20, 2025
