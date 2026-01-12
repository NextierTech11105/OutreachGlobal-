# Nextier Platform - Core Features

## Feature Status Overview

| Status | Count | Meaning |
|--------|-------|---------|
| :white_check_mark: | 32 | Complete & Working |
| :large_orange_diamond: | 8 | Needs Polish |
| :red_circle: | 4 | Not Started |

---

## 1. DATA ACQUISITION

### 1.1 CSV Import :white_check_mark:
Upload CSV files with automatic column mapping.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/upload` | `/t/[team]/import` | :white_check_mark: |

**Capabilities:**
- Drag-and-drop upload
- Auto-detect column headers
- Map to lead fields
- Store in DO Spaces
- Push to leads table

---

### 1.2 B2B Search :white_check_mark:
Search 70M+ US businesses from USBizData registry.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/b2b/search` | `/t/[team]/b2b-search` | :white_check_mark: |

**Capabilities:**
- Filter by SIC code, industry
- Filter by state, city, zip
- Filter by employee count
- Filter by revenue range
- Add to campaign button

---

### 1.3 Skip Trace :white_check_mark:
Find owner's personal cell phone via RealEstateAPI.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/luci/pipeline` action=enrich | `/t/[team]/skip-trace` | :white_check_mark: |

**Capabilities:**
- Skip trace by name + address
- Return mobile vs landline
- Find owner's email
- Cross-reference properties
- 2,000/day limit

---

### 1.4 LUCI Data Engine :white_check_mark:
AI-powered data pipeline for lead enrichment.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/luci/pipeline` | `/t/[team]/data/luci` | :white_check_mark: |

**Actions:**
- `scan` - Auto-tag leads by SIC code
- `enrich` - Skip trace owners
- `generate-campaigns` - Create daily campaigns

**Auto-Tags:**
- `blue-collar` - Construction, manufacturing, trades
- `acquisition-target` - 5-50 employees, $500K-$10M revenue
- `exit-prep-timing` - 5-15 years in business
- `property-owner` - Owns real estate

---

## 2. CAMPAIGN MANAGEMENT

### 2.1 Sequences :white_check_mark:
Multi-step campaign blocks with timing.

| Endpoint | Page | Status |
|----------|------|--------|
| `GET/POST /api/sequences` | `/t/[team]/sequences` | :white_check_mark: |

**Capabilities:**
- Campaign blocks (Initial, Follow-up #1, #2...)
- Multi-channel: SMS, Email, Voice
- Delay configuration (days, hours)
- Skip conditions (responded, opted_out)
- Template selection per step

---

### 2.2 Campaign Builder :white_check_mark:
Create and launch campaigns.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/campaigns` | `/t/[team]/campaign-builder` | :white_check_mark: |

**Capabilities:**
- Select lead source (LUCI bucket, CSV, saved search)
- Choose AI worker
- Pick execution mode (blast, scheduled, auto)
- Configure daily limits
- Review before launch

---

### 2.3 Campaign Launch Wizard :white_check_mark:
5-step wizard for launching campaigns.

| Page | Status |
|------|--------|
| `/t/[team]/campaigns/launch` | :white_check_mark: |

**Steps:**
1. Select Leads
2. Choose AI Worker
3. Execution Mode
4. Configure Settings
5. Review & Launch

---

### 2.4 Templates :white_check_mark:
Message template library.

| Endpoint | Page | Status |
|----------|------|--------|
| `GET /api/templates` | `/t/[team]/message-templates` | :white_check_mark: |

**Capabilities:**
- Industry-specific templates
- Variable substitution ({firstName}, {companyName})
- A/B variants
- Performance tracking

---

## 3. AI WORKERS

### 3.1 GIANNA (Opener) :white_check_mark:
Initial outreach specialist.

**Personality:** Professional, curious, value-focused
**Goals:**
- Capture email address
- Qualify interest
- Build rapport

**Triggers:**
- New lead enters campaign
- First touch in sequence

---

### 3.2 CATHY (Nudger) :white_check_mark:
Re-engagement specialist with humor.

**Personality:** Witty, persistent, disarming
**Goals:**
- Break through ghosting
- Re-engage cold leads
- Get any response

**Triggers:**
- No response after 72 hours
- Lead marked as "ghost"
- 3+ unanswered touches

---

### 3.3 SABRINA (Closer) :white_check_mark:
Appointment booking specialist.

**Personality:** Direct, helpful, solution-oriented
**Goals:**
- Book discovery call
- Handle objections
- Confirm appointments

**Triggers:**
- Positive response detected
- Lead asks about pricing
- Interest signal captured

---

### 3.4 NEVA (Researcher) :white_check_mark:
Deep research via Perplexity AI.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/neva/research` | `/t/[team]/research-library` | :white_check_mark: |

**Capabilities:**
- Quick validation (Apollo-style)
- Deep research (pre-appointment intel)
- Market sizing (TAM/SAM/SOM)
- Persona intelligence
- Deal intelligence

---

## 4. SMS INFRASTRUCTURE

### 4.1 SignalHouse Integration :white_check_mark:
10DLC compliant SMS delivery.

| Endpoint | Status |
|----------|--------|
| `POST /api/sms/send` | :white_check_mark: |
| `POST /api/webhook/signalhouse` | :white_check_mark: |

**Capabilities:**
- Send SMS via SignalHouse API
- Receive inbound via webhook
- Track delivery status
- Phone number management
- Usage monitoring

**Limits:**
- 2,000 messages/day (T-Mobile default)
- 100 messages/minute
- A2P 10DLC compliant

---

### 4.2 SMS Queue :white_check_mark:
Message queue with rate limiting.

| Endpoint | Page | Status |
|----------|------|--------|
| `GET /api/sms/queue` | `/t/[team]/sms/queue` | :white_check_mark: |

**Capabilities:**
- Pending, sent, delivered, failed counts
- Daily remaining capacity
- Batch processing (250/batch)
- Priority ordering

---

### 4.3 Pre-Queue Review :white_check_mark:
Human-in-loop message approval.

| Page | Status |
|------|--------|
| `/t/[team]/pre-queue` | :white_check_mark: |

**Capabilities:**
- Review before send
- Edit message content
- Approve/reject
- Bulk actions

---

### 4.4 SMS Command Center :white_check_mark:
Unified conversation view.

| Endpoint | Page | Status |
|----------|------|--------|
| `GET /api/sms/conversations` | `/t/[team]/sms/command-center` | :white_check_mark: |

**Capabilities:**
- Thread view per lead
- Real-time updates
- Quick reply
- Lead details sidebar

---

## 5. INBOUND HANDLING

### 5.1 Webhook Processing :white_check_mark:
Handle SignalHouse inbound messages.

| Endpoint | Status |
|----------|--------|
| `POST /api/webhook/signalhouse` | :white_check_mark: |

**Processing:**
1. Parse message body
2. Match to existing lead
3. Extract email/phone
4. Detect sentiment
5. Route to AI worker
6. Trigger workflows

---

### 5.2 Email Capture :white_check_mark:
Extract emails from SMS replies.

**Regex Patterns:**
- Standard email format
- "email me at..." variations
- Typo corrections

**Storage:**
- `lead.customFields.capturedEmail`
- Lead status update

---

### 5.3 Sentiment Detection :white_check_mark:
Classify response as positive/negative/neutral.

**Positive Signals:**
- "yes", "interested", "tell me more"
- Questions about pricing
- Request for callback

**Negative Signals:**
- "stop", "unsubscribe", "remove"
- "not interested", "no thanks"
- Complaints

---

### 5.4 Unified Inbox :white_check_mark:
All messages in one view.

| Page | Status |
|------|--------|
| `/t/[team]/inbox` | :white_check_mark: |

**Features:**
- Filter by status, worker, date
- Quick actions (reply, tag, archive)
- Lead details panel
- Conversation history

---

## 6. WORKFLOWS & AUTOMATION

### 6.1 Workflow Engine :white_check_mark:
Trigger-based automation.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/workflows/execute` | `/t/[team]/workflows` | :white_check_mark: |

**Triggers:**
- `message.received` - Inbound SMS
- `lead.created` - New lead added
- `lead.updated` - Lead field changed
- `campaign.started` - Campaign launched

**Actions:**
- `add_tag` - Add tag to lead
- `remove_tag` - Remove tag
- `update_status` - Change pipeline status
- `send_sms` - Send message
- `push_to_call_queue` - Add to dialer

---

### 6.2 Automation Rules :white_check_mark:
Simple if/then rules.

| Page | Status |
|------|--------|
| `/t/[team]/automation-rules` | :white_check_mark: |

**Capabilities:**
- Create rules via UI
- Condition builder
- Action selector
- Enable/disable toggle

---

## 7. VOICE / CALL CENTER

### 7.1 Call Queue :white_check_mark:
Priority-sorted hot leads.

| Endpoint | Page | Status |
|----------|------|--------|
| `GET /api/call-center/queue` | `/t/[team]/call-center` | :white_check_mark: |

**Capabilities:**
- Hot leads first
- Click-to-call
- Call notes
- Disposition logging

---

### 7.2 Appointments :white_check_mark:
Schedule and track calls.

| Endpoint | Page | Status |
|----------|------|--------|
| `GET/POST /api/appointments` | `/t/[team]/appointments` | :white_check_mark: |

**Capabilities:**
- CRUD appointments
- Calendar view
- Today/upcoming/past
- Status tracking

---

### 7.3 Power Dialer :large_orange_diamond:
Auto-dial through list.

| Page | Status |
|------|--------|
| `/t/[team]/call-center/power-dialer` | :large_orange_diamond: |

**Needs:**
- Twilio/SignalHouse voice integration
- Auto-dial logic
- Call recording

---

## 8. ANALYTICS

### 8.1 SMS Analytics :white_check_mark:
Message performance metrics.

| Page | Status |
|------|--------|
| `/t/[team]/analytics/sms` | :white_check_mark: |

**Metrics:**
- Sent, delivered, failed counts
- Response rate
- Positive rate
- By campaign, by worker

---

### 8.2 Pipeline Heatmap :white_check_mark:
Visual deal flow.

| Page | Status |
|------|--------|
| `/t/[team]/analytics/pipeline-heatmap` | :white_check_mark: |

**Visualization:**
- Stage distribution
- Conversion rates
- Time in stage

---

### 8.3 Reports :large_orange_diamond:
Custom report builder.

| Page | Status |
|------|--------|
| `/t/[team]/reports` | :large_orange_diamond: |

**Needs:**
- Report templates
- Export to PDF/CSV
- Scheduled reports

---

## 9. SETTINGS & CONFIGURATION

### 9.1 SignalHouse Settings :white_check_mark:
SMS provider configuration.

| Page | Status |
|------|--------|
| `/t/[team]/settings/signalhouse` | :white_check_mark: |

**Settings:**
- API key configuration
- Default from number
- Webhook URL
- Usage display

---

### 9.2 SMS Configuration :white_check_mark:
Messaging settings.

| Page | Status |
|------|--------|
| `/t/[team]/settings/sms` | :white_check_mark: |

**Settings:**
- Daily limits
- Send window (9 AM - 5 PM)
- Opt-out handling
- Compliance settings

---

### 9.3 Team Management :white_check_mark:
Users and permissions.

| Page | Status |
|------|--------|
| `/t/[team]/users` | :white_check_mark: |

**Capabilities:**
- Invite users
- Set roles (admin, member, viewer)
- Remove users

---

## 10. CONTENT & RESEARCH

### 10.1 Content Library :white_check_mark:
Reusable content assets.

| Page | Status |
|------|--------|
| `/t/[team]/library` | :white_check_mark: |

**Content Types:**
- Message templates
- Email templates
- Scripts
- Objection handlers

---

### 10.2 Research Library :white_check_mark:
NEVA research storage.

| Page | Status |
|------|--------|
| `/t/[team]/research-library` | :white_check_mark: |

**Capabilities:**
- Store research reports
- Search by company
- Pre-call prep

---

### 10.3 Valuation :white_check_mark:
Property evaluation tools.

| Endpoint | Page | Status |
|----------|------|--------|
| `POST /api/property/valuation` | `/t/[team]/valuation` | :white_check_mark: |

**Capabilities:**
- Property lookup
- Value estimation
- Equity calculation
- Owner info

---

## Feature Roadmap

### Q1 2025
- [ ] Voice calling (Twilio integration)
- [ ] Email channel
- [ ] Zapier integration

### Q2 2025
- [ ] Custom AI training
- [ ] Predictive lead scoring
- [ ] API access tier

### Q3 2025
- [ ] White-label option
- [ ] Salesforce integration
- [ ] Multi-language support
