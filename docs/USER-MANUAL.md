# OutreachGlobal User Manual

## Complete Guide to Every Feature

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Data Hub & Lead Management](#data-hub--lead-management)
4. [AI Workspaces](#ai-workspaces)
   - [Initial Message (GIANNA)](#initial-message-workspace-gianna)
   - [Retarget (SABRINA)](#retarget-workspace-sabrina)
   - [Nudger (CATHY)](#nudger-workspace-cathy)
5. [Power Dialer & Call Center](#power-dialer--call-center)
6. [Copilot Next-Step Logic](#copilot-next-step-logic)
7. [SMS Queue & 2-Bracket Flows](#sms-queue--2-bracket-flows)
8. [Pipeline Heat Map & Analytics](#pipeline-heat-map--analytics)
9. [Content Library](#content-library)
10. [Calendar & Scheduling](#calendar--scheduling)
11. [End-to-End Workflows](#end-to-end-workflows)

---

## System Overview

OutreachGlobal is a full-stack outreach automation platform designed to maximize your team's capacity utilization through AI-powered digital workers and intelligent workflow automation.

### Core Concept: The Deal Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE DEAL MACHINE FLOW                                │
│                                                                              │
│  [INGESTION]  →  [CAMPAIGN]  →  [VALUE CONV]  →  [PROPOSAL]  →  [DEAL]     │
│                                                                              │
│   USBizData      GIANNA           Responses        Sent         Closed      │
│   CSV Imports    SABRINA          Meetings         Viewed       Revenue     │
│   Skip Trace     CATHY            Demos            Signed                   │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│  VISIBLE  •  REPEATABLE  •  PREDICTABLE  •  COMPOUNDING                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AI Digital Workers

| Worker | Role | Best For |
|--------|------|----------|
| **GIANNA** | Initial Opener | First touch, value delivery, meeting confirmation |
| **SABRINA** | Re-engagement | Cold leads, different angles, channel switching |
| **CATHY** | Warm Nudger | Humor-based follow-ups, pattern interrupts |

---

## Getting Started

### 1. Access Your Team Dashboard

Navigate to: `https://app.outreachglobal.com/t/[your-team]`

### 2. Main Navigation

The sidebar is organized into logical groups:

- **Home**: Dashboard, Analytics, Pipeline Heat Map
- **Data**: Leads, Data Hub, Properties, Sectors
- **Outreach**: Campaigns, Call Center, SMS Queue, Calendar
- **AI**: Gianna AI, Content Library
- **Workspaces**: Initial Message, Retarget, Nudger

### 3. Global Calendar Widget

A floating calendar appears on every team page (bottom-right). Click to:
- View upcoming appointments
- Quick-schedule new events
- See today's call schedule

---

## Data Hub & Lead Management

### Importing Data

**Location**: Data → Data Hub

#### From USBizData
1. Click "Import from USBizData"
2. Select SIC codes or industry filters
3. Choose geographic region
4. Import records (auto skip-traced)

#### From CSV
1. Click "Upload CSV"
2. Map columns to lead fields
3. Enable "Skip Trace on Import" for phone enrichment
4. Review and confirm import

### Lead Enrichment

Leads are automatically enriched with:
- Phone numbers (mobile prioritized)
- Email addresses
- Company information
- Line type detection (mobile/landline/VoIP)

### Lead Statuses

| Status | Meaning |
|--------|---------|
| **New** | Just imported, never contacted |
| **Contacted** | At least one touch |
| **Engaged** | Responded or showed interest |
| **Qualified** | Ready for proposal |
| **Won** | Deal closed |
| **Lost** | Not interested/dead |

---

## AI Workspaces

### Initial Message Workspace (GIANNA)

**Location**: Workspaces → Initial Message

**Purpose**: Stage and send first-touch messages to new leads with AI-powered opener templates.

#### How to Use

1. **View Queue**: See all leads ready for initial contact
2. **Review Copilot Suggestions**: GIANNA suggests the best opener based on:
   - Lead source
   - Industry
   - Previous similar leads' response rates
3. **Select Template**: Choose from proven opener templates:
   - **Free Valuation** - Real estate focused
   - **AI Blueprint** - Tech/automation focused
   - **Medium Article** - Content-driven
   - **Newsletter** - Permission-based
4. **Personalize**: Review and adjust the message
5. **Send or Schedule**: Execute immediately or queue for optimal time

#### Opener Templates (2-Bracket Flow)

```
Template Structure:
┌──────────────────────────────────────────────────────────┐
│ Hey {{firstName}}! Quick question - would you be open   │
│ to receiving {{value_offer}}? Just reply YES or NO.     │
└──────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────┴────────────────┐
         ↓                                 ↓
    [YES Response]                    [NO Response]
         ↓                                 ↓
    Deliver Value                    Move to Retarget
    + Capture Email                  Queue for SABRINA
```

#### Next Step Logic

After each contact attempt, GIANNA suggests:

| Attempts | Hours Since | Suggested Action |
|----------|-------------|------------------|
| 0 | N/A | Send Initial Message (HIGH priority) |
| 1 | <24h | Wait - too soon |
| 1 | 24-48h | Send Follow-Up |
| 2-3 | 48h+ | Try Different Angle |
| 4+ | Any | Move to Retarget (SABRINA) |

---

### Retarget Workspace (SABRINA)

**Location**: Workspaces → Retarget

**Purpose**: Re-engage cold or unresponsive leads with new angles and strategies.

#### When Leads Arrive Here

- Marked "Not Interested" on initial contact
- 4+ attempts with no response
- Went cold after initial engagement
- Manual move from other workspaces

#### SABRINA's Re-engagement Strategies

| Strategy | Best For | Example |
|----------|----------|---------|
| **New Angle** | Previous offer didn't resonate | Try different value prop |
| **Different Value** | Wrong pain point identified | Research and reposition |
| **Channel Switch** | SMS not working | Try email or call |
| **Pattern Interrupt** | Over-contacted | Surprising, unexpected message |

#### How to Use

1. **Review Lead History**: See all previous touchpoints
2. **Check Re-engagement Score**: AI-calculated likelihood of response
3. **Select Strategy**: SABRINA recommends based on lead data
4. **Choose Template**: Customize the retarget message
5. **Set Timing**: Schedule for optimal re-engagement window (typically 14-30 days after last contact)

#### Retarget Templates

```
Casual Check-In:
"Hey {{firstName}}, hope all's well! Circling back on {{topic}} -
any updates on your end?"

New Value Angle:
"{{firstName}}, I know {{previous_offer}} wasn't quite right.
But I thought you might find {{new_value}} more relevant..."

Pattern Interrupt:
"{{firstName}} - I'm not going to pretend this isn't a follow-up
(it totally is). But I genuinely think {{value}} could help.
Quick call?"
```

---

### Nudger Workspace (CATHY)

**Location**: Workspaces → Nudger

**Purpose**: Send warm, human-feeling follow-ups with timing intelligence and humor.

#### CATHY's Approach

CATHY uses casual, humor-based messaging to:
- Break the "sales-y" pattern
- Feel more human and relatable
- Increase response rates through authenticity

#### Timing Intelligence

CATHY analyzes optimal send times:

| Window | Hours | Rating |
|--------|-------|--------|
| **Peak Engagement** | 9-11 AM | Best time to send |
| **Afternoon Window** | 2-4 PM | Good alternative |
| **Lunch Hours** | 11 AM - 2 PM | Okay, lower engagement |
| **Off Hours** | 5 PM - 9 AM | Avoid - schedule instead |

#### Nudge Templates

| Template | Tone | Response Rate |
|----------|------|---------------|
| **Coffee Check-In** | Casual | 18% |
| **Honest Follow-Up** | Direct | 22% |
| **Pattern Breaker** | Witty | 15% |
| **Light Humor** | Playful | 16% |
| **Value Reminder** | Helpful | 14% |
| **Timing Hook** | Strategic | 21% |

#### How to Use

1. **Check Timing Indicator**: Top-right shows if now is optimal
2. **Browse Queue**: Sorted by readiness and confidence
3. **Select Lead**: View CATHY's recommendation
4. **Choose Template**: Pick suggested or override
5. **Send or Schedule**: Execute now or queue for optimal window

#### Confidence Scoring

CATHY calculates confidence based on:
- Days since last contact (2+ days needed)
- Previous sentiment (positive = higher confidence)
- Engagement score
- Number of previous touches

```
Confidence Thresholds:
75%+ = High confidence (green) - Send now
50-74% = Medium confidence (yellow) - Consider timing
<50% = Low confidence (red) - May need different approach
```

---

## Power Dialer & Call Center

**Location**: Outreach → Call Center → Power Dialer

### Setting Up a Dialing Session

1. **Select Contact List**: Choose which leads to call
2. **Select Campaign**: Pick campaign type and script
3. **Select AI SDR** (if applicable): Choose AI avatar for AI-assisted calls
4. **Schedule Campaign**: Set timing parameters:
   - Calls per day limit
   - Call window (start/end times)
   - Timezone
   - Max attempts per lead
   - Retry interval
   - Days of week

### During a Call

The Power Dialer provides:

- **Dial Pad**: For DTMF tones during calls
- **Call Timer**: Track call duration
- **Notes Tab**: Take call notes (AI can auto-generate)
- **Transcription Tab**: Real-time call transcription
- **AI Assistant**: Contextual suggestions during call

### Call Dispositions

After each call, select a disposition:

| Disposition | Next Action |
|-------------|-------------|
| **Interested** | Send value content, schedule demo |
| **Callback** | Set reminder, send pre-call SMS |
| **Not Interested** | Queue for retarget (SABRINA) |
| **Meeting Set** | Send confirmation, add to calendar |
| **Voicemail** | Send follow-up SMS |
| **No Answer** | Schedule retry, send intro text |
| **Wrong Number** | Run skip trace, try email |
| **Follow Up** | Add to nurture sequence |

### Call Transfer

During an active call:
1. Click "Transfer" button
2. Select available agent
3. Warm transfer: "Hold on for Tommy"
4. Agent receives context and takes over

---

## Copilot Next-Step Logic

**Integrated Into**: Power Dialer (Notes Tab)

### What It Does

After every call ends, the Copilot analyzes:
- Call disposition selected
- Lead history and previous attempts
- Call duration
- Notes taken

Then suggests the optimal next action.

### How to Use

1. **End Call**: Disposition selection appears
2. **Select Disposition**: Choose what happened
3. **Review Copilot Suggestions**: AI shows recommended next steps
4. **Execute or Queue**:
   - **Execute Now**: AI immediately performs action
   - **Queue for Later**: Schedules for optimal time
   - **Warm Transfer**: Hands off to human agent
   - **Skip**: Move to next lead

### Suggestion Examples

**After "Interested" Disposition:**
```
┌─────────────────────────────────────────────────────────┐
│ 🧠 Copilot Next Steps                                   │
│                                                          │
│ PRIMARY RECOMMENDATION (92% confidence):                │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 📤 Send Value Content                    [GIANNA]  │  │
│ │ Deliver relevant content from library              │  │
│ │ Timing: Within 1 hour                              │  │
│ │                                                    │  │
│ │ [Execute Now]  [Queue for Later]                   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ OTHER OPTIONS:                                           │
│ • Schedule Demo/Meeting (88% conf) [MANUAL]             │
│ • Add to nurture sequence (75% conf) [GIANNA]           │
└─────────────────────────────────────────────────────────┘
```

### AI Worker Routing

The Copilot routes actions to the appropriate AI worker:

| Action Type | Routed To |
|-------------|-----------|
| Initial messages, confirmations | GIANNA |
| Re-engagement, new angles | SABRINA |
| Casual nudges, humor follow-ups | CATHY |
| Calls, transfers, meetings | MANUAL |

---

## SMS Queue & 2-Bracket Flows

**Location**: Outreach → SMS Queue

### Understanding 2-Bracket Flows

The 2-bracket system creates conversational permission-based outreach:

```
BRACKET 1: Permission Request
┌─────────────────────────────────────────────────────────┐
│ "Hey {{firstName}}! Quick question - would you be      │
│ open to receiving a free {{value}}? Just YES or NO"    │
└─────────────────────────────────────────────────────────┘
                         ↓
              [Wait for Response]
                         ↓
BRACKET 2: Value Delivery (on YES)
┌─────────────────────────────────────────────────────────┐
│ "Awesome! Where should I send the {{value}}?"          │
│ (Captures email or delivers content link)              │
└─────────────────────────────────────────────────────────┘
```

### Flow Types

#### Email Capture Flow
1. User replies YES
2. System asks for email
3. User provides email
4. System delivers content to email
5. Lead is enriched with email

#### Direct Content Link Flow
1. User replies YES
2. System sends content link immediately
3. Tracks engagement (click, download)

### How to Set Up

1. **Create Campaign**: Select "2-Bracket SMS" type
2. **Choose Value Offer**: Free valuation, guide, etc.
3. **Select Flow**: Email capture or direct link
4. **Pick Content**: From Content Library
5. **Set Schedule**: When to send initial bracket
6. **Activate**: Campaign begins sending

### Response Classifications

Inbound responses are automatically classified:

| Classification | Action |
|----------------|--------|
| **YES/Affirmative** | Proceed to Bracket 2 |
| **NO/Negative** | Mark as not interested, queue for retarget |
| **Question** | Route to human or AI response |
| **Email Address** | Capture and deliver content |
| **Phone Number** | Capture mobile for future contact |
| **Objection** | Handle with objection template |

---

## Pipeline Heat Map & Analytics

**Location**: Home → Analytics → Pipeline Heat Map

### Understanding the Heat Map

The Pipeline Heat Map visualizes your entire deal machine:

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ INGESTION  │ → │ CAMPAIGNS  │ → │ VALUE CONV │ → │ PROPOSALS  │ → │   DEALS    │
│            │    │            │    │            │    │            │    │            │
│ 🔥 HOT     │    │ 🌡️ WARM    │    │ 🌡️ WARM    │    │ ❄️ COLD    │    │ 🌡️ WARM    │
│ 2,450      │    │ 2,448      │    │ 124        │    │ 18         │    │ 7          │
│ records    │    │ touches    │    │ responses  │    │ sent       │    │ won        │
│            │    │            │    │            │    │            │    │            │
│   72% →    │    │   12% →    │    │   58% →    │    │   44% →    │    │  $84.5K    │
└────────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘
```

### Heat Levels

| Level | Color | Meaning | Action |
|-------|-------|---------|--------|
| 🔥 **Hot** | Green | Hitting 80%+ of target | Maintain or scale |
| 🌡️ **Warm** | Yellow | 50-79% of target | Monitor closely |
| ❄️ **Cold** | Red | Below 50% of target | Immediate attention |

### Metrics Tracked

**Ingestion Stage:**
- Records imported
- Skip traced count
- Campaign-ready leads

**Campaign Stage:**
- SMS sent
- Calls made
- Emails sent

**Value Conversation Stage:**
- Responses received
- Meetings set
- Demos given

**Proposal Stage:**
- Proposals sent
- Viewed/opened
- In review

**Deal Stage:**
- Deals won
- Revenue generated
- Average deal size

### Bottleneck Analysis

The system identifies where capacity is being wasted:

1. **Primary Bottleneck**: Stage with highest risk score
2. **Conversion Drop-offs**: Where leads are getting stuck
3. **Optimization Suggestions**: AI-generated recommendations

### Weekly Activity Heatmap

Shows when your team is most active:

```
        12a  2a  4a  6a  8a  10a 12p  2p  4p  6p  8p  10p
Mon     ░░  ░░  ░░  ░░  ▓▓  ██  ██  ▓▓  ▓▓  ░░  ░░  ░░
Tue     ░░  ░░  ░░  ░░  ▓▓  ██  ██  ▓▓  ▓▓  ░░  ░░  ░░
Wed     ░░  ░░  ░░  ░░  ▓▓  ██  ██  ▓▓  ▓▓  ░░  ░░  ░░
Thu     ░░  ░░  ░░  ░░  ▓▓  ██  ██  ▓▓  ▓▓  ░░  ░░  ░░
Fri     ░░  ░░  ░░  ░░  ▓▓  ██  ▓▓  ▓▓  ░░  ░░  ░░  ░░
Sat     ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░
Sun     ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░

Legend: ░░ Low  ▓▓ Medium  ██ High
```

### Webhook Health Monitor

Track integration health:

| Source | Event | Status | Latency |
|--------|-------|--------|---------|
| SignalHouse | sms.delivered | ✅ Healthy | 45ms |
| SignalHouse | sms.response | ✅ Healthy | 52ms |
| Twilio | call.completed | ✅ Healthy | 38ms |
| SendGrid | email.opened | ✅ Healthy | 120ms |
| Calendly | meeting.scheduled | ✅ Healthy | 95ms |

---

## Content Library

**Location**: AI → Content Library

### Content Types

| Type | Purpose | Delivery |
|------|---------|----------|
| **PDF Guides** | Educational value | Email attachment or link |
| **Valuations** | Property/business assessment | Dynamic generation |
| **Articles** | Thought leadership | Link to Medium/blog |
| **Videos** | Demos, testimonials | Embedded or linked |
| **Templates** | Message templates | Inline insertion |

### Using Content in Campaigns

1. **Create/Upload Content**: Add to library with metadata
2. **Categorize**: Tag with industries, use cases
3. **Link to Templates**: Reference in message templates
4. **Track Engagement**: See opens, clicks, downloads

### Content Categories

- Free Valuations
- AI Blueprints
- Industry Reports
- Case Studies
- Newsletter Subscriptions
- Video Demos

---

## Calendar & Scheduling

### Global Calendar Widget

Available on every page (bottom-right corner):

- **Quick View**: See today's and upcoming events
- **One-Click Scheduling**: Add events without leaving current page
- **Call Reminders**: Integrated with power dialer callbacks

### Calendar Integration

Syncs with:
- Google Calendar
- Outlook/Microsoft 365
- Calendly (for meeting scheduling)

### Scheduling Meetings from Copilot

When Copilot suggests "Schedule Demo/Meeting":

1. Click "Execute Now"
2. Select available time slot
3. Send invite to lead
4. Auto-add to your calendar
5. Pre-meeting reminder set

---

## End-to-End Workflows

### Workflow 1: New Lead to First Meeting

```
1. IMPORT
   └→ USBizData import with SIC code filter
   └→ Auto skip-trace for phone numbers
   └→ Leads appear in Data Hub

2. INITIAL OUTREACH (GIANNA)
   └→ Leads queue in Initial Message Workspace
   └→ Select opener template (2-bracket flow)
   └→ Send permission request SMS

3. RESPONSE HANDLING
   └→ YES response → Deliver value content
   └→ Capture email if using email flow
   └→ NO response → Queue for SABRINA

4. VALUE CONVERSATION
   └→ Engaged lead → Power Dialer call
   └→ Use AI Assistant for talk track
   └→ Select disposition after call

5. COPILOT NEXT STEP
   └→ "Interested" → Send content + Schedule meeting
   └→ Execute via Copilot
   └→ Meeting appears on calendar

6. MEETING
   └→ Pre-meeting agenda sent (GIANNA)
   └→ Conduct meeting
   └→ Move to proposal stage
```

### Workflow 2: Re-engaging Cold Leads

```
1. IDENTIFY COLD LEADS
   └→ No response after 4+ attempts
   └→ Auto-queued to Retarget Workspace

2. SABRINA ANALYSIS
   └→ Reviews previous touchpoints
   └→ Calculates re-engagement score
   └→ Suggests new angle

3. RETARGET CAMPAIGN
   └→ Wait 14-30 days since last contact
   └→ Select different value proposition
   └→ Try different channel (email if SMS failed)

4. RE-ENGAGEMENT
   └→ Response received → Move to Value Conversation
   └→ No response → Queue for CATHY (30+ days)

5. CATHY NUDGE
   └→ Light, humor-based follow-up
   └→ Pattern interrupt messaging
   └→ Final attempt before archiving
```

### Workflow 3: Maximizing Dialing Sessions

```
1. PREPARE SESSION
   └→ Power Dialer → Setup tab
   └→ Select high-priority contact list
   └→ Configure call parameters

2. EXECUTE CALLS
   └→ Launch dialer
   └→ System auto-dials next lead
   └→ Use AI Assistant for context

3. AFTER EACH CALL
   └→ Take notes (or generate with AI)
   └→ Select disposition
   └→ Copilot shows next step

4. COPILOT ACTIONS
   └→ Execute Now → Immediate action
   └→ Queue → Scheduled for later
   └→ Warm Transfer → Hand to colleague
   └→ Skip → Move to next lead

5. END OF SESSION
   └→ Review stats in Analytics
   └→ Check Pipeline Heat Map
   └→ Identify bottlenecks
```

### Workflow 4: Monitoring Pipeline Health

```
1. DAILY CHECK
   └→ Analytics → Pipeline Heat Map
   └→ Review overall health score
   └→ Check each stage's heat level

2. IDENTIFY ISSUES
   └→ Cold stages need attention
   └→ Check bottleneck analysis
   └→ Review conversion rates

3. TAKE ACTION
   └→ Low ingestion → Import more data
   └→ Low campaign velocity → Activate more sends
   └→ Low responses → Adjust messaging
   └→ Low proposals → Speed up qualification

4. MONITOR WEBHOOKS
   └→ Check integration health
   └→ Verify latency is acceptable
   └→ Address any degraded services

5. COMPOUND IMPROVEMENTS
   └→ Week 1: Establish baseline
   └→ Week 2: Identify patterns
   └→ Week 3: Optimize weak stages
   └→ Week 4+: Continuous improvement
```

---

## Quick Reference

### Keyboard Shortcuts (Power Dialer)

| Key | Action |
|-----|--------|
| `Enter` | Dial/End call |
| `M` | Mute/Unmute |
| `N` | Switch to Notes tab |
| `T` | Switch to Transcription tab |
| `Esc` | Cancel current action |

### Status Colors

| Color | Meaning |
|-------|---------|
| 🟢 Green | Healthy/Active/Ready |
| 🟡 Yellow | Warning/Moderate |
| 🔴 Red | Alert/Needs Attention |
| 🟣 Purple | AI-assisted/Automated |
| 🩷 Pink | CATHY-related |
| 🔵 Blue | GIANNA-related |

### Support

For help:
- In-app: Click `/help` in any page
- Documentation: `/docs` folder
- Issues: GitHub repository

---

*Last Updated: December 2024*
*Version: 1.0*
