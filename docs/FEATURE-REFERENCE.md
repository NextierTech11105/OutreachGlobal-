# OutreachGlobal Feature Reference

## Complete Technical Reference for All Features

---

## Table of Contents

1. [AI Workspaces](#ai-workspaces)
2. [Copilot Next-Step Engine](#copilot-next-step-engine)
3. [Pipeline Heat Map](#pipeline-heat-map)
4. [Power Dialer](#power-dialer)
5. [SMS Queue & 2-Bracket Flows](#sms-queue--2-bracket-flows)
6. [Content Library](#content-library)
7. [Data Hub](#data-hub)

---

## AI Workspaces

### File Locations

```
apps/front/src/app/t/[team]/workspaces/
├── initial-message/page.tsx    # GIANNA workspace
├── retarget/page.tsx           # SABRINA workspace
└── nudger/page.tsx             # CATHY workspace
```

### Navigation Path

Sidebar → Workspaces → [Initial Message | Retarget | Nudger]

---

### Initial Message Workspace (GIANNA)

**File**: `apps/front/src/app/t/[team]/workspaces/initial-message/page.tsx`

#### Purpose
Stage and send first-touch messages to new leads with AI-powered opener templates.

#### Key Components

| Component | Description |
|-----------|-------------|
| Lead Queue | Table of leads awaiting initial contact |
| Copilot Suggestions | AI-recommended openers per lead |
| Template Selector | Choose from proven opener templates |
| Priority Indicators | High/Medium/Low based on lead quality |

#### Opener Templates

| ID | Name | Type | Description |
|----|------|------|-------------|
| `valuation_offer` | Free Valuation | Email Capture | Offers property/business valuation |
| `ai_blueprint` | AI Blueprint | Email Capture | Tech/automation focused |
| `medium_article` | Medium Article | Content Link | Thought leadership content |
| `newsletter` | Newsletter | Email Capture | Permission-based subscription |

#### Next Step Logic Algorithm

```typescript
function getCopilotNextStep(lead: InitialMessageLead): NextStepSuggestion {
  const { attempts, lastAttemptAt } = lead;
  const hoursSinceLastAttempt = calculateHours(lastAttemptAt);

  // No attempts yet - send initial message
  if (attempts === 0) {
    return {
      action: "Send Initial Message",
      priority: "high",
      template: "valuation_offer"
    };
  }

  // 1 attempt, no response after 24h - follow up
  if (attempts === 1 && hoursSinceLastAttempt > 24) {
    return {
      action: "Send Follow-Up",
      priority: "high",
      template: "followup_24h"
    };
  }

  // 2-3 attempts, no response after 48h - try different angle
  if (attempts >= 2 && attempts <= 3 && hoursSinceLastAttempt > 48) {
    return {
      action: "Try Different Angle",
      priority: "medium",
      template: "different_value_prop"
    };
  }

  // 4+ attempts - move to retarget
  if (attempts >= 4) {
    return {
      action: "Move to Retarget",
      priority: "low",
      workspace: "SABRINA"
    };
  }

  return { action: "Wait", priority: "low" };
}
```

#### Lead Data Structure

```typescript
interface InitialMessageLead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email?: string;
  source: string;
  status: "new" | "contacted" | "engaged" | "qualified";
  attempts: number;
  lastAttemptAt?: Date;
  nextStepAt?: Date;
  nextStepAction?: string;
  tags: string[];
}
```

---

### Retarget Workspace (SABRINA)

**File**: `apps/front/src/app/t/[team]/workspaces/retarget/page.tsx`

#### Purpose
Re-engage cold or unresponsive leads with new angles and strategies.

#### Key Components

| Component | Description |
|-----------|-------------|
| Retarget Queue | Leads that went cold after initial outreach |
| Strategy Selector | AI-recommended re-engagement approach |
| Re-engagement Score | Calculated likelihood of response |
| Channel Switcher | Try different communication channel |

#### Retarget Strategies

| Strategy | When to Use | Wait Period |
|----------|-------------|-------------|
| `new_angle` | Previous offer didn't resonate | 14-21 days |
| `different_value` | Wrong pain point identified | 21-30 days |
| `channel_switch` | SMS not working, try email | 7-14 days |
| `pattern_interrupt` | Over-contacted lead | 30+ days |

#### SABRINA Suggestion Algorithm

```typescript
function getSabrinaRetargetSuggestion(lead: RetargetLead) {
  const { daysSinceContact, previousAttempts, previousChannel } = lead;

  // Too soon to retarget
  if (daysSinceContact <= 3) {
    return { strategy: "Wait", confidence: 30 };
  }

  // First retarget attempt (3-5 days, 1 previous attempt)
  if (daysSinceContact >= 3 && daysSinceContact <= 5 && previousAttempts === 1) {
    return {
      strategy: "Casual Check-In",
      template: RETARGET_TEMPLATES[0],
      confidence: 75
    };
  }

  // Multiple attempts, try different channel
  if (previousAttempts >= 2 && previousAttempts < 4) {
    const newChannel = previousChannel === "sms" ? "email" : "sms";
    return {
      strategy: "Channel Switch",
      channel: newChannel,
      confidence: 65
    };
  }

  // Many attempts - pattern interrupt needed
  if (previousAttempts >= 4) {
    return {
      strategy: "Pattern Interrupt",
      template: RETARGET_TEMPLATES[3],
      confidence: 50
    };
  }

  return {
    strategy: "New Value Angle",
    confidence: 60
  };
}
```

#### Retarget Templates

```typescript
const RETARGET_TEMPLATES = [
  {
    id: "casual_checkin",
    name: "Casual Check-In",
    template: "Hey {{firstName}}, hope all's well! Circling back on {{topic}}...",
    bestFor: "First retarget attempt"
  },
  {
    id: "new_value",
    name: "New Value Angle",
    template: "{{firstName}}, I know {{previous}} wasn't quite right. But {{new_value}}...",
    bestFor: "Different value proposition"
  },
  {
    id: "resource_share",
    name: "Resource Share",
    template: "{{firstName}}, thought you might find this helpful: {{resource}}",
    bestFor: "Content-driven re-engagement"
  },
  {
    id: "pattern_interrupt",
    name: "Pattern Interrupt",
    template: "{{firstName}} - I'm not going to pretend this isn't a follow-up...",
    bestFor: "Over-contacted leads"
  }
];
```

---

### Nudger Workspace (CATHY)

**File**: `apps/front/src/app/t/[team]/workspaces/nudger/page.tsx`

#### Purpose
Send warm, human-feeling follow-ups with timing intelligence and humor.

#### Key Components

| Component | Description |
|-----------|-------------|
| Nudge Queue | Leads ready for warm follow-up |
| Timing Indicator | Shows if now is optimal send time |
| Template Selector | Humor-based message templates |
| Confidence Score | CATHY's recommendation strength |

#### Timing Windows

```typescript
const TIMING_WINDOWS = {
  optimal: { start: 9, end: 11, label: "Peak Engagement" },
  good: { start: 14, end: 16, label: "Afternoon Window" },
  okay: { start: 11, end: 14, label: "Lunch Hours" },
  avoid: { start: 17, end: 9, label: "Off Hours" }
};

function getCurrentTimingWindow() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 11) return { ...TIMING_WINDOWS.optimal, isOptimal: true };
  if (hour >= 14 && hour < 16) return { ...TIMING_WINDOWS.good, isOptimal: false };
  if (hour >= 11 && hour < 14) return { ...TIMING_WINDOWS.okay, isOptimal: false };
  return { ...TIMING_WINDOWS.avoid, isOptimal: false };
}
```

#### Nudge Templates

| ID | Name | Tone | Response Rate |
|----|------|------|---------------|
| `coffee_check` | Coffee Check-In | Casual | 18% |
| `honest_followup` | Honest Follow-Up | Direct | 22% |
| `pattern_break` | Pattern Breaker | Witty | 15% |
| `light_humor` | Light Humor | Playful | 16% |
| `value_reminder` | Value Reminder | Helpful | 14% |
| `timing_hook` | Timing Hook | Strategic | 21% |

#### CATHY Suggestion Algorithm

```typescript
function getCathyNudgeSuggestion(lead: NudgerLead) {
  const { daysSinceContact, totalTouches, sentiment, engagementScore } = lead;

  // Too soon to nudge
  if (daysSinceContact < 2) {
    return { template: null, confidence: 10, reasoning: "Wait at least 2 days" };
  }

  // Positive sentiment + high engagement = casual approach
  if (sentiment === "positive" && engagementScore > 60) {
    return {
      template: NUDGE_TEMPLATES.coffee_check,
      confidence: 85,
      reasoning: "Casual approach works best for engaged leads"
    };
  }

  // Went dark after interest = honest follow-up
  if (sentiment === "neutral" && totalTouches >= 2 && daysSinceContact > 5) {
    return {
      template: NUDGE_TEMPLATES.honest_followup,
      confidence: 80,
      reasoning: "Direct, honest approach shows respect"
    };
  }

  // Over-contacted = pattern break
  if (totalTouches >= 4) {
    return {
      template: NUDGE_TEMPLATES.pattern_break,
      confidence: 70,
      reasoning: "Need to break the pattern"
    };
  }

  // Light engagement = light humor
  if (totalTouches <= 2 && sentiment !== "negative") {
    return {
      template: NUDGE_TEMPLATES.light_humor,
      confidence: 75,
      reasoning: "Light humor can warm up the conversation"
    };
  }

  return {
    template: NUDGE_TEMPLATES.timing_hook,
    confidence: 60,
    reasoning: "Use timing-based hook"
  };
}
```

---

## Copilot Next-Step Engine

**File**: `apps/front/src/components/copilot-next-step.tsx`

### Purpose
After every call, analyze disposition and suggest optimal next action.

### Integration Points
- Power Dialer (Notes Tab)
- After call completion
- Disposition selection

### Key Types

```typescript
type CallDisposition =
  | "interested"
  | "callback"
  | "not_interested"
  | "meeting_scheduled"
  | "voicemail"
  | "no_answer"
  | "wrong_number"
  | "follow_up";

interface NextStepSuggestion {
  id: string;
  action: string;
  description: string;
  icon: React.ElementType;
  priority: "high" | "medium" | "low";
  aiWorker: "GIANNA" | "SABRINA" | "CATHY" | "MANUAL";
  confidence: number;
  timing: string;
  template?: {
    id: string;
    name: string;
    preview: string;
  };
}

interface LeadContext {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  previousAttempts?: number;
  lastContactAt?: Date;
  campaignId?: string;
}
```

### Disposition → Suggestion Mapping

| Disposition | Primary Suggestion | AI Worker | Confidence |
|-------------|-------------------|-----------|------------|
| `interested` | Send Value Content | GIANNA | 92% |
| `callback` | Set Callback Reminder | MANUAL | 95% |
| `not_interested` | Queue for Retarget | SABRINA | 65% |
| `meeting_scheduled` | Send Confirmation | GIANNA | 98% |
| `voicemail` | Send SMS Follow-Up | GIANNA | 88% |
| `no_answer` | Retry Different Time | MANUAL | 82% |
| `wrong_number` | Run Skip Trace | MANUAL | 70% |
| `follow_up` | Add to Nurture | GIANNA | 90% |

### Component Props

```typescript
interface CopilotNextStepProps {
  disposition: CallDisposition | null;
  lead: LeadContext;
  callDuration?: number;
  notes?: string;
  onExecuteAction: (suggestion: NextStepSuggestion) => void;
  onQueueAction: (suggestion: NextStepSuggestion) => void;
  onWarmTransfer: () => void;
  onSkip: () => void;
  isAssistanceMode?: boolean;
  className?: string;
}
```

### Action Handlers

```typescript
// Execute immediately
onExecuteAction={async (suggestion) => {
  // Route to appropriate AI worker
  switch (suggestion.aiWorker) {
    case "GIANNA":
      await sendGiannaMessage(lead, suggestion.template);
      break;
    case "SABRINA":
      await queueForRetarget(lead, suggestion);
      break;
    case "CATHY":
      await sendCathyNudge(lead, suggestion.template);
      break;
    case "MANUAL":
      await createManualTask(lead, suggestion);
      break;
  }
}}

// Queue for later
onQueueAction={async (suggestion) => {
  await scheduleAction(lead, suggestion, suggestion.timing);
}}

// Warm transfer
onWarmTransfer={() => {
  showTransferPanel();
}}

// Skip to next lead
onSkip={() => {
  moveToNextLead();
}}
```

---

## Pipeline Heat Map

**File**: `apps/front/src/app/t/[team]/analytics/pipeline-heatmap/page.tsx`

### Purpose
Visualize entire deal machine with heat indicators and bottleneck analysis.

### Pipeline Stages

```typescript
interface PipelineStage {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  color: string;
  description: string;
  metrics: {
    label: string;
    value: number;
    previousValue: number;
    target: number;
    unit: string;
  }[];
  conversionToNext: number;
  previousConversion: number;
  heatLevel: "hot" | "warm" | "cold";
  bottleneckRisk: number; // 0-100
}
```

### Heat Level Calculation

```typescript
function calculateHeatLevel(current: number, target: number): "hot" | "warm" | "cold" {
  const ratio = current / target;
  if (ratio >= 0.8) return "hot";   // 80%+ of target
  if (ratio >= 0.5) return "warm";  // 50-79% of target
  return "cold";                     // Below 50%
}
```

### Stage Metrics

| Stage | Key Metrics |
|-------|-------------|
| Ingestion | Records Imported, Skip Traced, Campaign Ready |
| Campaign | SMS Sent, Calls Made, Emails Sent |
| Value Conversation | Responses, Meetings Set, Demos Given |
| Proposals | Proposals Sent, Viewed, In Review |
| Deals | Won, Revenue, Avg Deal Size |

### Webhook Health Structure

```typescript
interface WebhookActivity {
  id: string;
  source: string;           // "SignalHouse", "Twilio", etc.
  event: string;            // "sms.delivered", "call.completed"
  count: number;            // Events in period
  lastFired: Date;
  status: "healthy" | "degraded" | "failing";
  avgLatency: number;       // milliseconds
}
```

### Weekly Activity Heatmap

```typescript
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function generateHeatmapData(): number[][] {
  return DAYS.map((day, dayIdx) =>
    HOURS.map((hour) => {
      // Business hours have higher activity
      if (hour >= 9 && hour <= 17 && dayIdx < 5) {
        return Math.floor(Math.random() * 80) + 20; // 20-100
      }
      return Math.floor(Math.random() * 15); // 0-15
    })
  );
}
```

---

## Power Dialer

**File**: `apps/front/src/components/power-dialer.tsx`

### Purpose
Make outbound calls with AI assistance and automated next-step suggestions.

### Props

```typescript
interface PowerDialerProps {
  leadName?: string;
  leadPhone?: string;
  leadPhoneLineType?: string;
  leadPhoneCarrier?: string;
  leadCompany?: string;
  leadPosition?: string;
  leadLocation?: string;
  leadSource?: string;
  leadStatus?: string;
  campaignId?: string;
  onCallComplete?: (duration: number, notes: string) => void;
  onClose?: () => void;
  inModal?: boolean;
  hideTabsNav?: boolean;
  leadId?: string;
  leadType?: "property" | "b2b";
  autoEnrich?: boolean;
}
```

### Call States

```typescript
type CallStatus =
  | "idle"
  | "connecting"
  | "in-progress"
  | "completed"
  | "transferred"
  | "error";
```

### Twilio Integration

```typescript
// Initialize device
const initDevice = async () => {
  const token = await twilioService.getToken(userId);
  twilioDevice.setup(token);

  twilioDevice.ready(() => setIsDeviceReady(true));
  twilioDevice.connect((conn) => setIsCallActive(true));
  twilioDevice.disconnect(() => {
    setIsCallActive(false);
    setShowCopilotNextStep(true); // Show next step suggestions
  });
};

// Make call
const handleMakeCall = async () => {
  if (!phoneNumber) {
    if (leadId && autoEnrich) {
      phoneNumber = await enrichLead();
    }
  }
  deviceRef.current.connect({ phone: phoneNumber });
};
```

### Copilot Integration

After call ends:
1. `setCallStatus("completed")`
2. `setShowCopilotNextStep(true)`
3. User selects disposition
4. Copilot shows suggestions
5. User executes or queues action

---

## SMS Queue & 2-Bracket Flows

### SMS Service

**File**: `apps/front/src/lib/services/sms-queue-service.ts`

### 2-Bracket Flow Types

```typescript
type BracketFlowType = "email_capture" | "content_link";

interface TwoBracketFlow {
  id: string;
  name: string;
  bracket1Template: string;  // Permission request
  bracket2Template: string;  // Value delivery
  flowType: BracketFlowType;
  contentId?: string;        // If content_link type
}
```

### Response Classifications

```typescript
type ResponseClassification =
  | "affirmative"      // YES, yeah, sure, ok
  | "negative"         // NO, not interested
  | "question"         // What is this? Tell me more
  | "email"            // user@example.com
  | "phone"            // (555) 123-4567
  | "objection"        // I'm busy, not now
  | "unknown";

function classifyResponse(message: string): ResponseClassification {
  const lower = message.toLowerCase().trim();

  if (/^(yes|yeah|yep|sure|ok|okay|yea|y)$/i.test(lower)) {
    return "affirmative";
  }
  if (/^(no|nope|nah|not interested|stop|n)$/i.test(lower)) {
    return "negative";
  }
  if (/@/.test(message)) {
    return "email";
  }
  if (/\d{10}|\(\d{3}\)\s*\d{3}-?\d{4}/.test(message)) {
    return "phone";
  }
  if (/\?/.test(message)) {
    return "question";
  }

  return "unknown";
}
```

---

## Content Library

### Content Types

```typescript
type ContentType =
  | "pdf"
  | "valuation"
  | "article"
  | "video"
  | "template";

interface ContentItem {
  id: string;
  name: string;
  type: ContentType;
  description: string;
  url?: string;
  category: string;
  tags: string[];
  createdAt: Date;
  usageCount: number;
  engagementRate: number;
}
```

### Content Categories

- Free Valuations
- AI Blueprints
- Industry Reports
- Case Studies
- Newsletter Subscriptions
- Video Demos

---

## Data Hub

### Data Sources

```typescript
type DataSource =
  | "usbizdata"
  | "csv_upload"
  | "apollo"
  | "manual"
  | "api";

interface DataImport {
  id: string;
  source: DataSource;
  recordCount: number;
  skipTracedCount: number;
  campaignReadyCount: number;
  importedAt: Date;
  status: "pending" | "processing" | "completed" | "failed";
}
```

### Skip Trace Integration

```typescript
interface SkipTraceResult {
  leadId: string;
  phones: Array<{
    number: string;
    type: "mobile" | "landline" | "voip";
    carrier?: string;
    confidence: number;
  }>;
  emails: Array<{
    email: string;
    type: "personal" | "work";
    confidence: number;
  }>;
}
```

---

## File Structure Summary

```
apps/front/src/
├── app/t/[team]/
│   ├── analytics/
│   │   └── pipeline-heatmap/page.tsx
│   ├── workspaces/
│   │   ├── initial-message/page.tsx
│   │   ├── retarget/page.tsx
│   │   └── nudger/page.tsx
│   └── call-center/
│       └── power-dialer/page.tsx
├── components/
│   ├── power-dialer.tsx
│   ├── copilot-next-step.tsx
│   └── global-calendar-widget.tsx
├── features/team/layouts/
│   └── team-main-nav.tsx
└── lib/services/
    └── sms-queue-service.ts
```

---

*Last Updated: December 2024*
