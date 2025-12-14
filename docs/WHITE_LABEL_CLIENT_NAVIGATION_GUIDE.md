# White Label Client Navigation Guide

## Outreach Global Platform - Complete User Manual

This guide provides white label clients with a comprehensive overview of all platform features, navigation, and workflows. Use this as your primary reference for onboarding and daily operations.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Getting Started](#2-getting-started)
3. [Main Navigation Structure](#3-main-navigation-structure)
4. [Core Features](#4-core-features)
5. [Lead Management](#5-lead-management)
6. [Campaign Management](#6-campaign-management)
7. [Data Hub & Enrichment](#7-data-hub--enrichment)
8. [Communications Center](#8-communications-center)
9. [AI SDR (Sales Development Rep)](#9-ai-sdr-sales-development-rep)
10. [Analytics & Reporting](#10-analytics--reporting)
11. [Integrations](#11-integrations)
12. [Settings & Configuration](#12-settings--configuration)
13. [Admin Panel](#13-admin-panel)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)
15. [Best Practices](#15-best-practices)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Platform Overview

### What is Outreach Global?

Outreach Global is a comprehensive **Sales Automation and Lead Management Platform** designed for multi-channel outreach campaigns. The platform combines:

- **Lead Management** - Capture, score, and qualify leads
- **Multi-Channel Campaigns** - Email (SendGrid), SMS (SignalHouse), Voice (Twilio)
- **AI-Powered SDR** - Intelligent sales development assistant
- **Data Enrichment** - Apollo.io, RealEstateAPI, SkipTrace integration
- **Real Estate Features** - Property valuation, ownership lookup
- **Analytics** - ROI reporting and performance dashboards

### The Core Pipeline

```
Data → Enrichment → Contact Discovery → Outreach → Response → Deal
```

| Stage | What Happens | Your Action |
|-------|-------------|-------------|
| **Data** | Leads enter the system | Import CSVs or search |
| **Enrichment** | Add company info, revenue, employee count | Click "Enrich" |
| **Contact** | Find phone numbers and emails | Click "Skip Trace" |
| **Outreach** | Send messages via SMS/Email/Voice | Select template, send |
| **Response** | Lead replies | Review in inbox |
| **Deal** | Conversation becomes opportunity | Schedule meeting |

---

## 2. Getting Started

### First Login

1. Navigate to your platform URL
2. Sign in with your credentials (via Clerk authentication)
3. Select your team/workspace
4. You'll land on the main dashboard

### Platform URL Structure

```
https://[your-domain]/t/[team-slug]/[feature]
```

Example: `https://app.example.com/t/acme-sales/leads`

---

## 3. Main Navigation Structure

### Primary Navigation (Left Sidebar)

| Icon | Section | Path | Description |
|------|---------|------|-------------|
| 📊 | Dashboard | `/t/[team]` | Overview and quick stats |
| 👥 | Leads | `/t/[team]/leads` | Lead management |
| 📧 | Campaigns | `/t/[team]/campaigns` | Outreach campaigns |
| 🏷️ | Deals | `/t/[team]/deals` | Deal pipeline |
| 🏠 | Properties | `/t/[team]/properties` | Property database |
| 📱 | Power Dialers | `/t/[team]/power-dialers` | Auto-dialing system |
| 💬 | Inbox | `/t/[team]/inbox` | Message inbox |
| 📆 | Calendar | `/t/[team]/calendar` | Schedule & follow-ups |
| 🔍 | Search | `/t/[team]/search` | Advanced search |
| 📈 | Analytics | `/t/[team]/analytics` | Performance metrics |
| 🤖 | AI SDR | `/t/[team]/ai-sdr` | AI assistant config |
| ⚙️ | Settings | `/t/[team]/settings` | Team settings |

### Secondary Navigation

| Section | Path | Description |
|---------|------|-------------|
| Data Hub | `/t/[team]/data-hub` | Data import & enrichment |
| SMS Queue | `/t/[team]/sms-queue` | Outbound SMS management |
| Call Center | `/t/[team]/call-center` | Voice operations |
| Message Templates | `/t/[team]/message-templates` | Template library |
| Saved Searches | `/t/[team]/saved-searches` | Quick search access |
| Sectors | `/t/[team]/sectors` | Industry segments |
| Partnerships | `/t/[team]/partnerships` | Partner management |

---

## 4. Core Features

### Dashboard (`/t/[team]`)

Your command center showing:

- **Active Campaigns** - Currently running campaigns
- **Today's Activity** - Messages sent, responses received
- **Lead Pipeline** - Funnel visualization
- **AI Activity** - SDR assistant actions
- **Quick Actions** - Common tasks

### Quick Stats Cards

| Metric | Description |
|--------|-------------|
| New Leads | Leads added today |
| Responses | Replies received |
| Meetings | Scheduled appointments |
| Deals Won | Closed deals |

---

## 5. Lead Management

### Leads Page (`/t/[team]/leads`)

The central hub for all your leads.

#### Views Available

| View | Description |
|------|-------------|
| Table View | Spreadsheet-style list |
| Kanban Board | Pipeline stages |
| Map View | Geographic visualization |
| List View | Simple listing |

#### Lead Actions

| Action | Icon | Description |
|--------|------|-------------|
| View Details | Eye | Open lead detail page |
| Quick Edit | Pencil | Edit inline |
| Send SMS | Phone | Compose SMS |
| Send Email | Mail | Compose email |
| Call | Phone | Initiate call |
| Add to Campaign | Plus | Assign to campaign |
| Skip Trace | Sparkle | Get contact info |
| Enrich | Star | Add company data |

#### Filtering & Search

- **Search bar** - Free text search
- **Status filter** - New, Contacted, Qualified, etc.
- **Tag filter** - Filter by tags
- **Score filter** - Filter by lead score
- **Date range** - Filter by creation date
- **Has phone** - Filter by contact info

#### Bulk Actions

Select multiple leads to:
- Add to campaign
- Update status
- Assign to user
- Add/remove tags
- Delete
- Export to CSV
- Bulk enrich
- Bulk skip trace

### Lead Detail Page (`/t/[team]/leads/[id]`)

Full lead profile with:

- **Contact Information** - Name, phone, email, address
- **Property Details** - For real estate leads
- **Activity Timeline** - All interactions
- **Notes** - Internal notes
- **Tags** - Categorization
- **Score** - Lead quality score
- **Related Campaigns** - Campaign membership
- **Communication History** - Messages sent/received

---

## 6. Campaign Management

### Campaigns Page (`/t/[team]/campaigns`)

Create and manage outreach campaigns.

#### Campaign Types

| Type | Channel | Best For |
|------|---------|----------|
| SMS Campaign | Text | High volume initial outreach |
| Email Campaign | Email | Professional communications |
| Voice Campaign | Phone | High-value lead follow-up |
| Multi-Channel | All | Comprehensive outreach |

#### Creating a Campaign

1. Click **New Campaign**
2. Enter campaign name
3. Select campaign type
4. Choose target leads (by filter, saved search, or import)
5. Select message template
6. Configure schedule:
   - **Send Now** - Immediate delivery
   - **Schedule** - Specific date/time
   - **Drip** - Spread over time
7. Review preview
8. Launch campaign

#### Campaign Statuses

| Status | Description |
|--------|-------------|
| Draft | Not yet launched |
| Scheduled | Queued for future |
| Active | Currently running |
| Paused | Temporarily stopped |
| Completed | Finished |
| Cancelled | Stopped permanently |

#### Campaign Analytics

- Messages sent
- Delivery rate
- Response rate
- Positive responses
- Negative responses
- Opt-outs

### Message Templates (`/t/[team]/message-templates`)

Pre-written message templates for campaigns.

#### Template Categories

| Category | Purpose |
|----------|---------|
| Initial Outreach | First contact messages |
| Follow-up | Nurture sequences |
| Meeting Request | Booking appointments |
| Re-engagement | Cold lead revival |

#### Template Variables

Use variables for personalization:

```
{{first_name}} - Lead's first name
{{last_name}} - Lead's last name
{{company}} - Company name
{{property_address}} - Property address
{{property_value}} - Property value
```

---

## 7. Data Hub & Enrichment

### Data Hub (`/t/[team]/data-hub`)

Central location for data import and enrichment.

#### 3-Step Workflow

**Step 1: Get Data**
- Upload CSV files
- Search Apollo database
- Import from integrations

**Step 2: Enrich (Skip Trace)**
- Find personal cell phones
- Find personal emails
- Get property portfolio
- Get address history
- Cost: ~$0.05 per successful match

**Step 3: Execute**
- Send SMS/Email
- Make calls
- Schedule follow-ups

#### Data Sources

| Source | Type | Data Provided |
|--------|------|---------------|
| Apollo | B2B | Company info, contacts, LinkedIn |
| RealEstateAPI | Property | Owner info, property details |
| USBizData | Lists | Pre-built industry databases |
| Manual Import | CSV | Your own data |

### Skip Trace

Skip tracing finds current contact information.

**What you get:**
- Current phone numbers (landline + cell)
- Current email addresses
- Property ownership verification
- Mailing address confirmation
- Associated persons at address

**Hit Rates:**
- 80-90% return at least one phone
- 60-70% return a mobile number
- 40-50% return an email

### Apollo Enrichment

Business data enrichment provides:

| Field | Description |
|-------|-------------|
| Company Name | Official business name |
| Industry | Business sector |
| Revenue | Annual revenue range |
| Employee Count | Company size |
| LinkedIn URL | Company/person profile |
| Job Title | Contact's role |
| Technologies | Tech stack used |

---

## 8. Communications Center

### Inbox (`/t/[team]/inbox`)

Unified inbox for all communications.

#### Inbox Features

- **All Messages** - Complete history
- **Unread** - New messages
- **SMS** - Text messages only
- **Email** - Emails only
- **Voice** - Call logs

#### Response Handling

| Response Type | Indicator | Action |
|--------------|-----------|--------|
| Positive | Green | Prioritize follow-up |
| Neutral | Yellow | Standard follow-up |
| Negative | Red | Mark as closed |
| Opt-out | Gray | Respect unsubscribe |

### SMS Queue (`/t/[team]/sms-queue`)

Manage outbound SMS messages.

- View queued messages
- Check delivery status
- Retry failed messages
- Cancel pending messages

### Call Center (`/t/[team]/call-center`)

Voice operations hub.

- Inbound call management
- Outbound call campaigns
- Call recording playback
- Voicemail management

### Power Dialers (`/t/[team]/power-dialers`)

Automated calling system.

**Features:**
- Auto-dial lead lists
- Local presence dialing
- Call disposition logging
- Agent performance tracking

---

## 9. AI SDR (Sales Development Rep)

### AI SDR Manager (`/t/[team]/ai-sdr`)

Configure and train your AI sales assistant.

#### AI Avatars

Create different AI personalities for various use cases.

**Avatar Settings:**
- Name & description
- Industry focus
- Communication tone
- Response style
- Escalation rules

#### Training Mode

| Mode | Description |
|------|-------------|
| Human-in-the-Loop | AI drafts, you approve |
| Semi-Automatic | AI handles routine, escalates complex |
| Full Auto | AI handles all responses |

#### Gianna's Escalation Loop

Automated follow-up sequence:

1. **Steps 1-3**: Professional, helpful
2. **Steps 4-6**: Light humor, persistence
3. **Steps 7-9**: More creative approaches
4. **Step 10**: Graceful exit

24-hour delay between steps. Pauses when lead responds.

### AI Training (`/t/[team]/ai-training`)

Train the AI on your communication style.

**How to train:**
1. Upload example conversations
2. Highlight successful messages
3. Mark responses that got results
4. Click "Train on Examples"

---

## 10. Analytics & Reporting

### Analytics Dashboard (`/t/[team]/analytics`)

Performance metrics and insights.

#### Available Reports

| Report | Shows |
|--------|-------|
| Campaign Performance | Success rates by campaign |
| Lead Conversion | Funnel analysis |
| Response Rates | Engagement metrics |
| Agent Activity | Team performance |
| ROI Calculator | Return on investment |

### Calendar Dashboard (`/t/[team]/calendar`)

- Monthly/weekly/daily views
- Scheduled follow-ups
- Meeting tracking
- Task management

---

## 11. Integrations

### Integration Hub (`/t/[team]/settings/integrations`)

Connect third-party services.

#### Available Integrations

| Service | Type | Purpose |
|---------|------|---------|
| SendGrid | Email | Email delivery |
| SignalHouse | SMS | Text messaging |
| Twilio | Voice | Phone calls |
| Apollo.io | Data | B2B enrichment |
| RealEstateAPI | Data | Property data |
| Zoho CRM | CRM | Lead sync |
| Google Calendar | Calendar | Meeting sync |

#### Setting Up Integrations

1. Go to Settings → Integrations
2. Click on the integration you want
3. Enter API credentials
4. Configure settings
5. Test connection
6. Enable integration

### CRM Integration (`/t/[team]/integrations/crm`)

Sync leads with your CRM.

**Supported CRMs:**
- Zoho CRM (native)
- Others via webhooks/API

---

## 12. Settings & Configuration

### Team Settings (`/t/[team]/settings`)

#### General Settings (`/t/[team]/settings/account`)

- Team name
- Team slug
- Timezone
- Default currency

#### User Management (`/t/[team]/settings/users`)

- Add/remove team members
- Set user roles
- Manage permissions

#### API Integrations (`/t/[team]/settings/api-integrations`)

- API key management
- Webhook configuration
- Rate limit settings

#### Call Center Settings (`/t/[team]/settings/call-center`)

- Phone numbers
- Call routing
- Voicemail settings
- Business hours

#### Data Schema (`/t/[team]/settings/data-schema`)

- Custom fields
- Field mappings
- Import templates

#### Workflows (`/t/[team]/settings/workflows`)

- Automation rules
- Trigger actions
- Workflow builder

#### Auto-Reply Settings (`/t/[team]/auto-reply-settings`)

- Auto-response templates
- Response triggers
- Out-of-office settings

---

## 13. Admin Panel

### Admin Access (`/admin`)

Administrative functions (requires admin role).

#### Admin Sections

| Section | Path | Purpose |
|---------|------|---------|
| Dashboard | `/admin` | Admin overview |
| Users | `/admin/users` | User management |
| Integrations | `/admin/integrations` | System integrations |
| API Monitor | `/admin/api-monitor` | API health & usage |
| Batch Jobs | `/admin/batch-jobs` | Bulk operations |
| AI SDR Config | `/admin/ai-sdr` | AI configuration |
| B2B Settings | `/admin/b2b` | B2B data settings |

#### API Monitor (`/admin/api-monitor`)

Monitor system health and API usage.

**Tabs:**
- **Live Pulse** - Real-time activity
- **Endpoints** - API status
- **Webhooks** - Incoming events
- **Usage & Limits** - Quota tracking
- **Heatmaps** - Activity patterns

#### Batch Jobs (`/admin/batch-jobs`)

Run bulk operations.

**Job Types:**
- Skip Trace Batch
- SMS Campaign
- Email Campaign
- Data Enrichment
- CSV Export

---

## 14. Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + /` | Help menu |
| `Ctrl/Cmd + N` | New lead |
| `Ctrl/Cmd + E` | Quick edit |
| `Esc` | Close modal |

### Lead Page Shortcuts

| Shortcut | Action |
|----------|--------|
| `S` | Send SMS |
| `E` | Send Email |
| `C` | Call lead |
| `N` | Add note |
| `T` | Add tag |

---

## 15. Best Practices

### Lead Management

1. **Import clean data** - Remove duplicates before importing
2. **Enrich strategically** - Skip trace high-value leads first
3. **Use tags** - Organize leads by criteria
4. **Score leads** - Prioritize by quality
5. **Regular cleanup** - Archive stale leads

### Campaign Management

1. **Start small** - Test with 50-100 leads first
2. **A/B test templates** - Find what works
3. **Monitor response rates** - Adjust messaging
4. **Respect opt-outs** - Comply immediately
5. **Stagger sends** - Don't overwhelm recipients

### AI SDR Usage

1. **Train thoroughly** - Provide many examples
2. **Start with human-in-the-loop** - Approve AI responses initially
3. **Review regularly** - Check AI performance
4. **Update training** - Add new successful examples
5. **Set clear escalation rules** - Know when AI should escalate

### Data Hygiene

1. **Validate imports** - Check data quality
2. **Update regularly** - Re-enrich stale records
3. **Remove duplicates** - Merge duplicate leads
4. **Archive inactive** - Keep database clean
5. **Backup exports** - Regular data exports

---

## 16. Troubleshooting

### Common Issues

#### "Skip trace returned no results"

- Verify address format (full street, city, state)
- Check that the property/person exists
- Try again later (occasional API hiccups)

#### "Messages aren't sending"

1. Check API Monitor → Endpoints
2. Verify SignalHouse/SendGrid status
3. Check daily quota limits
4. Verify API credentials

#### "Enrichment is slow"

- Apollo has rate limits
- Large batches take time
- Check batch job progress - it's probably still running

#### "AI responses sound wrong"

1. Go to AI Training Hub
2. Switch to Human-in-the-Loop mode
3. Provide more training examples
4. Be patient - AI learns over time

#### "Out of API quota"

- Quotas reset at midnight UTC
- Prioritize highest-value leads
- Check API Monitor → Usage for details

### Daily Limits Reference

| Service | Daily Limit | Check At |
|---------|-------------|----------|
| Skip Trace | 5,000 | API Monitor → Usage |
| SMS | 50,000 | API Monitor → Usage |
| Apollo | 1,000 | API Monitor → Usage |
| AI Calls | 10,000 | API Monitor → Usage |

### Getting Support

1. Check API Monitor for error messages
2. Review browser console for errors
3. Check Activity Log for recent changes
4. Contact your account manager
5. Submit support ticket

---

## Quick Reference

### Essential URLs

| Page | URL |
|------|-----|
| Dashboard | `/t/[team]` |
| Leads | `/t/[team]/leads` |
| Campaigns | `/t/[team]/campaigns` |
| Data Hub | `/t/[team]/data-hub` |
| Inbox | `/t/[team]/inbox` |
| Analytics | `/t/[team]/analytics` |
| Settings | `/t/[team]/settings` |
| AI SDR | `/t/[team]/ai-sdr` |
| Admin | `/admin` |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leads` | GET/POST | Lead operations |
| `/api/campaigns` | GET/POST | Campaign operations |
| `/api/realestate/skip-trace` | POST | Skip trace |
| `/api/apollo/enrich` | POST | B2B enrichment |
| `/api/signalhouse/send` | POST | Send SMS |
| `/api/templates` | GET | Fetch templates |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial release |

---

*This guide is maintained by the Outreach Global platform team. For the latest updates, check the documentation portal.*
