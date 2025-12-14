/**
 * 10-Touch 30-Day Outreach Loop
 *
 * The core repeatable workflow for lead engagement:
 * Luci → Enrich → Calendar → Gianna → Cathy
 *
 * Each lead progresses through these touches over 30 days.
 * If no response, moves to cold/archive after completion.
 * If response, routes to appropriate handler.
 */

export type TouchChannel = "sms" | "call" | "email" | "voicemail";
export type TouchStatus = "pending" | "sent" | "responded" | "skipped" | "failed";
export type ResponseType = "positive" | "negative" | "neutral" | "opt_out" | "wrong_number" | "none";

export interface TouchPoint {
  id: string;
  position: number; // 1-10
  name: string;
  channel: TouchChannel;
  dayOffset: number; // Days from campaign start
  timeOfDay: "morning" | "afternoon" | "evening"; // 9-11am, 1-3pm, 5-7pm
  template: string;
  purpose: string;
  escalation?: string; // What happens if no response
}

export interface LeadTouchProgress {
  leadId: string;
  campaignId: string;
  sequenceId: string;
  currentTouch: number; // 0 = not started, 1-10 = current position
  status: "active" | "paused" | "completed" | "converted" | "opted_out" | "dead";
  startedAt: string;
  lastTouchAt?: string;
  nextTouchAt?: string;
  responseType?: ResponseType;
  touches: TouchRecord[];
}

export interface TouchRecord {
  position: number;
  channel: TouchChannel;
  status: TouchStatus;
  sentAt?: string;
  respondedAt?: string;
  responseType?: ResponseType;
  responseText?: string;
  agentHandled?: "gianna" | "cathy" | "human";
}

// THE 10-TOUCH 30-DAY SEQUENCE
export const OUTREACH_SEQUENCE: TouchPoint[] = [
  // WEEK 1: INITIAL CONTACT PHASE
  {
    id: "touch-1",
    position: 1,
    name: "Initial SMS",
    channel: "sms",
    dayOffset: 0,
    timeOfDay: "morning",
    template: "initial_intro",
    purpose: "First contact - introduce yourself, mention property",
    escalation: "If no response → Touch 2 in 2 days",
  },
  {
    id: "touch-2",
    position: 2,
    name: "Follow-up Call",
    channel: "call",
    dayOffset: 2,
    timeOfDay: "afternoon",
    template: "call_script_1",
    purpose: "Voice touchpoint - build rapport, qualify interest",
    escalation: "If no answer → Leave voicemail, proceed to Touch 3",
  },
  {
    id: "touch-3",
    position: 3,
    name: "Value SMS",
    channel: "sms",
    dayOffset: 4,
    timeOfDay: "morning",
    template: "value_prop",
    purpose: "Share market insight or value proposition",
    escalation: "If no response → Touch 4 in 3 days",
  },

  // WEEK 2: ENGAGEMENT PHASE
  {
    id: "touch-4",
    position: 4,
    name: "Email Intro",
    channel: "email",
    dayOffset: 7,
    timeOfDay: "morning",
    template: "email_intro",
    purpose: "Professional email with company info, creates paper trail",
    escalation: "If no response → Touch 5 in 3 days",
  },
  {
    id: "touch-5",
    position: 5,
    name: "Check-in SMS",
    channel: "sms",
    dayOffset: 10,
    timeOfDay: "afternoon",
    template: "check_in",
    purpose: "Casual check-in, show persistence without pressure",
    escalation: "If no response → Touch 6 in 4 days",
  },
  {
    id: "touch-6",
    position: 6,
    name: "Second Call",
    channel: "call",
    dayOffset: 14,
    timeOfDay: "evening",
    template: "call_script_2",
    purpose: "Different time of day, mention previous attempts",
    escalation: "If no answer → Leave voicemail, proceed to Touch 7",
  },

  // WEEK 3: PERSISTENCE PHASE
  {
    id: "touch-7",
    position: 7,
    name: "Urgency SMS",
    channel: "sms",
    dayOffset: 17,
    timeOfDay: "morning",
    template: "urgency_soft",
    purpose: "Create soft urgency - market conditions, timing",
    escalation: "If no response → Touch 8 in 4 days",
  },
  {
    id: "touch-8",
    position: 8,
    name: "Last Value Email",
    channel: "email",
    dayOffset: 21,
    timeOfDay: "morning",
    template: "email_value",
    purpose: "Final value add - report, market data, resource",
    escalation: "If no response → Touch 9 in 4 days",
  },

  // WEEK 4: FINAL TOUCHES
  {
    id: "touch-9",
    position: 9,
    name: "Breakup SMS",
    channel: "sms",
    dayOffset: 25,
    timeOfDay: "afternoon",
    template: "breakup_soft",
    purpose: "Soft breakup - acknowledge timing may be off",
    escalation: "If no response → Final touch in 5 days",
  },
  {
    id: "touch-10",
    position: 10,
    name: "Final Call",
    channel: "call",
    dayOffset: 30,
    timeOfDay: "morning",
    template: "call_final",
    purpose: "Final attempt - offer to reconnect in future",
    escalation: "Sequence complete → Move to cold/archive",
  },
];

// TOUCH TEMPLATES
export const TOUCH_TEMPLATES: Record<string, { subject?: string; message: string }> = {
  initial_intro: {
    message: "Hi {firstName}! This is {agentName} with {company}. I noticed your property at {address} and wanted to reach out about opportunities in {city}. Would you be open to a quick chat?",
  },
  call_script_1: {
    message: "[CALL SCRIPT] Hi {firstName}, this is {agentName} calling about your property at {address}. I sent you a text a couple days ago - just wanted to introduce myself and see if you had any questions about the market in your area.",
  },
  value_prop: {
    message: "Hey {firstName}! Quick market update: Properties in {city} are seeing {marketTrend}. Your property at {address} could be well-positioned. Interested in a free analysis?",
  },
  email_intro: {
    subject: "Re: Your property at {address}",
    message: "Hi {firstName},\n\nI've tried reaching out via text - wanted to follow up with more details about who we are.\n\n{company} specializes in helping property owners explore their options. Whether you're considering selling, refinancing, or just curious about your property's value, we're here to help.\n\nWould you have 15 minutes this week for a quick call?\n\nBest,\n{agentName}\n{agentPhone}",
  },
  check_in: {
    message: "Hi {firstName}, just checking in! I know timing is everything - whenever you're ready to chat about {address}, I'm here. No pressure at all.",
  },
  call_script_2: {
    message: "[CALL SCRIPT] Hi {firstName}, {agentName} again from {company}. I've reached out a few times about your property - wanted to try you at a different time. Is now okay for a quick chat?",
  },
  urgency_soft: {
    message: "{firstName}, quick heads up - market conditions in {city} are shifting. If you've been thinking about exploring options for {address}, now might be a good time. Happy to share what we're seeing.",
  },
  email_value: {
    subject: "Free Market Report for {address}",
    message: "Hi {firstName},\n\nI put together a quick market analysis for your area. Properties like yours at {address} are currently valued at {estimatedValue}.\n\nAttached is a brief report with:\n- Current market trends in {city}\n- Recent comparable sales\n- Equity position estimates\n\nLet me know if you'd like to discuss!\n\n{agentName}",
  },
  breakup_soft: {
    message: "Hey {firstName} - I've reached out a few times and haven't heard back, so I'll take the hint! If timing changes or you ever want to chat about {address}, my door's always open. Take care!",
  },
  call_final: {
    message: "[CALL SCRIPT] Hi {firstName}, {agentName} one last time. I'm closing out your file for now, but wanted to offer - if things change in the future, feel free to reach out. We're always here to help.",
  },
};

// SEQUENCE STATISTICS
export interface SequenceStats {
  totalActive: number;
  byTouch: Record<number, number>; // Count of leads at each touch
  completedThisWeek: number;
  convertedThisWeek: number;
  responseRate: number; // Percentage that responded at any point
  avgTouchesToResponse: number;
  optOutRate: number;
}

// HELPER FUNCTIONS
export function getNextTouchDate(currentTouch: number, startDate: Date): Date {
  const touch = OUTREACH_SEQUENCE.find(t => t.position === currentTouch + 1);
  if (!touch) return new Date(); // No more touches

  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + touch.dayOffset);

  // Set time of day
  switch (touch.timeOfDay) {
    case "morning":
      nextDate.setHours(9, 30, 0, 0);
      break;
    case "afternoon":
      nextDate.setHours(14, 0, 0, 0);
      break;
    case "evening":
      nextDate.setHours(17, 30, 0, 0);
      break;
  }

  return nextDate;
}

export function getTouchByPosition(position: number): TouchPoint | undefined {
  return OUTREACH_SEQUENCE.find(t => t.position === position);
}

export function getTemplate(templateId: string): { subject?: string; message: string } | undefined {
  return TOUCH_TEMPLATES[templateId];
}

export function calculateSequenceProgress(progress: LeadTouchProgress): number {
  return (progress.currentTouch / OUTREACH_SEQUENCE.length) * 100;
}

export function shouldEscalate(lastTouchAt: Date, currentTouch: number): boolean {
  const nextTouch = getTouchByPosition(currentTouch + 1);
  if (!nextTouch) return false;

  const daysSinceLastTouch = Math.floor(
    (Date.now() - lastTouchAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Allow for touch if we're past the scheduled day
  return daysSinceLastTouch >= (nextTouch.dayOffset - getTouchByPosition(currentTouch)!.dayOffset);
}

// COLOR CODING FOR UI
export const TOUCH_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
  2: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
  3: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/50" },
  4: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/50" },
  5: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50" },
  6: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50" },
  7: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
  8: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/50" },
  9: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50" },
  10: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50" },
};

export const CHANNEL_ICONS: Record<TouchChannel, string> = {
  sms: "MessageSquare",
  call: "Phone",
  email: "Mail",
  voicemail: "Voicemail",
};
