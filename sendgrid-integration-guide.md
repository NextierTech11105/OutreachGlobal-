# SendGrid MCP Integration Guide

## Overview
This guide walks through integrating SendGrid with your Nextier platform using the SendGrid MCP server.

## Prerequisites
- ✅ SendGrid MCP installed in Claude Desktop
- ✅ SendGrid account (free tier works)
- ✅ Database access to Nextier
- ✅ API server access

---

## Step 1: Get SendGrid API Key

1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Name: `Nextier Production`
5. Permissions: **Full Access** (or Mail Send + Marketing)
6. Copy the API key (you only see it once!)

---

## Step 2: Verify Sender Identity

SendGrid requires you to verify your "From" email address.

### Option A: Single Sender Verification (Recommended for getting started)

1. In Claude Desktop (with SendGrid MCP active), run:
```
Can you help me create a verified sender in SendGrid with:
- From Email: noreply@yourdomain.com
- From Name: Nextier Global
- API Key: <YOUR_KEY>
```

2. Check your email and click the verification link

### Option B: Domain Authentication (Recommended for production)

1. Add your domain's DNS records (SendGrid provides them)
2. Improves deliverability and removes "via sendgrid.net"

---

## Step 3: Create Email Templates

### Campaign Email Template

Ask Claude Desktop:
```
Create a SendGrid dynamic template for campaign emails with these sections:
- Header with company logo
- Main content area (variable: content)
- Unsubscribe link
- Footer with company info
Template name: "Nextier Campaign Email"
```

### Message Email Template

Ask Claude Desktop:
```
Create a SendGrid dynamic template for direct messages with:
- Personal greeting (variable: name)
- Message body (variable: content)
- Reply instructions
Template name: "Nextier Direct Message"
```

**Save the Template IDs** - you'll need them!

---

## Step 4: Configure Suppression Groups

Suppression groups manage unsubscribes.

Ask Claude Desktop:
```
Create a SendGrid suppression group:
- Name: "Marketing Campaigns"
- Description: "Real estate investment opportunities and updates"
```

---

## Step 5: Set Up Event Webhook

Track email events (opens, clicks, bounces).

### Webhook URL
```
https://your-domain.ondigitalocean.app/webhooks/sendgrid
```

### Events to Track
- `processed` - Email sent to SendGrid
- `delivered` - Successfully delivered
- `open` - Email opened
- `click` - Link clicked
- `bounce` - Email bounced
- `dropped` - Email dropped (invalid)
- `spam_report` - Marked as spam
- `unsubscribe` - Unsubscribed

Ask Claude Desktop:
```
Set up a SendGrid event webhook at:
URL: https://monkfish-app-mb7h3.ondigitalocean.app/webhooks/sendgrid
Events: all (processed, delivered, open, click, bounce, dropped, spam_report, unsubscribe)
```

---

## Step 6: Update Database Settings

### SQL Query

Run this in your PostgreSQL database (or use Postgres MCP):

```sql
-- Option 1: Update specific team
UPDATE team_settings
SET
  sendgrid_api_key = 'SG.your-api-key-here',
  sendgrid_from_email = 'noreply@yourdomain.com',
  sendgrid_from_name = 'Nextier Global'
WHERE team_id = 'your-team-id';

-- Option 2: Update all teams (for single-tenant)
UPDATE team_settings
SET
  sendgrid_api_key = 'SG.your-api-key-here',
  sendgrid_from_email = 'noreply@yourdomain.com',
  sendgrid_from_name = 'Nextier Global';
```

### Alternative: Use GraphQL Mutation

```graphql
mutation UpdateSendGridSettings($teamId: String!) {
  updateSendGridSettings(teamId: $teamId, input: {
    apiKey: "SG.your-api-key-here"
    fromEmail: "noreply@yourdomain.com"
    fromName: "Nextier Global"
  }) {
    success
  }
}
```

---

## Step 7: Update Environment Variables

Edit `.env` or DigitalOcean App environment:

```env
# SendGrid SMTP (legacy, optional)
MAIL_HOST="smtp.sendgrid.net"
MAIL_PORT=587
MAIL_USER="apikey"
MAIL_PASSWORD="SG.your-api-key-here"
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="Nextier Global"
```

---

## Step 8: Test Email Sending

### Test 1: Direct Send via MCP

Ask Claude Desktop:
```
Send a test email via SendGrid:
- To: your-email@example.com
- From: noreply@yourdomain.com
- Subject: Nextier SendGrid Test
- Body: "This is a test from Nextier Global!"
```

### Test 2: Send via API

```bash
curl -X POST https://your-api.ondigitalocean.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "mutation { createMessage(input: { type: EMAIL, toAddress: \"test@example.com\", toName: \"Test User\", subject: \"Test\", body: \"Hello!\" }) { message { id } } }"
  }'
```

### Test 3: Trigger Campaign

1. Go to Nextier frontend
2. Create a test campaign with one lead
3. Add an email sequence
4. Start the campaign
5. Check SendGrid Activity Feed

---

## Step 9: Monitor & Optimize

### SendGrid Dashboard

Check these sections:
- **Activity** - Real-time email status
- **Statistics** - Opens, clicks, bounces
- **Suppressions** - Unsubscribes, bounces, spam reports

### Database Queries

Check campaign execution status:

```sql
SELECT
  ce.status,
  COUNT(*) as count,
  ce.failed_reason
FROM campaign_executions ce
JOIN campaign_sequences cs ON ce.sequence_id = cs.id
WHERE cs.type = 'EMAIL'
GROUP BY ce.status, ce.failed_reason;
```

---

## Troubleshooting

### Email Not Sending

**Check 1: API Key Valid**
```
Ask Claude: "Validate my SendGrid API key: SG.your-key"
```

**Check 2: Sender Verified**
```sql
SELECT sendgrid_from_email FROM team_settings WHERE team_id = 'your-team';
```
→ Must match verified sender in SendGrid

**Check 3: Check Logs**
```sql
SELECT * FROM campaign_executions
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 10;
```

**Check 4: SendGrid Activity**
- Go to SendGrid → Activity
- Filter by recipient email
- Check delivery status

### High Bounce Rate

1. **Validate emails before sending**
   - Use SendGrid Email Validation API
   - Add validation to lead import

2. **Clean your list**
   ```sql
   -- Find leads with bounced emails
   SELECT l.*
   FROM leads l
   JOIN campaign_executions ce ON ce.lead_id = l.id
   WHERE ce.failed_reason LIKE '%bounce%';
   ```

3. **Check sender reputation**
   - SendGrid → Stats → Reputation

### Low Open Rate

1. **Improve subject lines**
   - Use AI (Claude) to generate subject lines
   - A/B test subjects

2. **Send time optimization**
   - Schedule campaigns for business hours
   - Avoid weekends for B2B

3. **Warm up your domain**
   - Start with small batches
   - Gradually increase volume

---

## Advanced Features

### 1. Dynamic Templates with Handlebars

Create personalized emails:

```html
<h1>Hello {{name}}!</h1>
<p>We found a property at {{property.address}} that matches your criteria.</p>
<p>Estimated Value: {{property.value}}</p>
<a href="{{link}}">View Details</a>
```

### 2. A/B Testing

Test subject lines or content:

```typescript
// In campaign sequence, create variants
{
  "variantA": {
    "subject": "Exclusive Property Deal in {{city}}",
    "content": "..."
  },
  "variantB": {
    "subject": "Limited Time: {{city}} Investment Opportunity",
    "content": "..."
  }
}
```

### 3. Email Validation

Validate before sending:

```typescript
// Use SendGrid Email Validation API
const result = await sendgridMCP.validateEmail({
  email: lead.email,
  source: "import"
});

if (result.verdict === "valid") {
  // Send email
}
```

### 4. Scheduled Sends

SendGrid can schedule emails:

```typescript
await sendgridService.send({
  apiKey: settings.sendgridApiKey,
  data: {
    to: lead.email,
    from: fromEmail,
    subject: subject,
    html: html,
    sendAt: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  }
});
```

---

## Compliance & Best Practices

### CAN-SPAM Compliance

✅ **Required:**
- Accurate "From" name and email
- Clear subject line (no deceptive)
- Physical address in footer
- Unsubscribe link
- Honor unsubscribe within 10 days

### GDPR Compliance

✅ **Required:**
- Consent before sending
- Easy unsubscribe
- Data processing agreement with SendGrid
- Privacy policy link

### Deliverability Best Practices

1. **Authenticate your domain** (SPF, DKIM, DMARC)
2. **Maintain list hygiene** (remove bounces/unsubscribes)
3. **Monitor reputation** (SendGrid sender score)
4. **Avoid spam triggers** (ALL CAPS, too many links)
5. **Warm up new IPs** (gradual volume increase)

---

## Cost Optimization

### SendGrid Pricing Tiers

- **Free**: 100 emails/day (good for testing)
- **Essentials**: $15/mo for 50K emails
- **Pro**: $90/mo for 1.5M emails

### Tips to Reduce Costs

1. **Deduplicate emails** before sending
   ```sql
   -- Find duplicate emails
   SELECT email, COUNT(*)
   FROM leads
   GROUP BY email
   HAVING COUNT(*) > 1;
   ```

2. **Segment lists** (don't send to unengaged users)

3. **Use suppression groups** (honor unsubscribes)

4. **Monitor bounce rate** (remove invalid emails)

---

## Next Steps

1. ✅ Configure SendGrid API
2. ✅ Verify sender domain
3. ✅ Create email templates
4. ✅ Set up webhooks
5. ⬜ Integrate with DigitalOcean MCP (automate deployments)
6. ⬜ Use Postgres MCP (optimize queries)
7. ⬜ Set up Notion MCP (documentation hub)

---

**Questions?**

Ask Claude Desktop (with SendGrid MCP active):
```
Help me troubleshoot my SendGrid integration.
Recent campaign executions are failing with: [error message]
```
