/**
 * SMS Campaign Template Library
 *
 * INBOUND RESPONSE GENERATION MACHINE
 * Each stage = Different phone number + Campaign ID
 * All stages service the end goal: 15-minute discovery meeting
 *
 * Stages:
 * 1. INITIAL (GIANNA) - Get ANY response, capture mobile + email → GOLD LABEL
 * 2. RETARGET (CATHY) - Re-engage ghosts after 7+ days
 * 3. NUDGE (CATHY) - Keep conversation alive, stale 2+ days
 * 4. FOLLOW-UP (SABRINA) - Push responded leads to meeting
 * 5. RETENTION - Existing clients, referrals, upsells
 * 6. CONFIRMATION - Appointment reminders, reduce no-shows
 */

export type CampaignStage =
  | "initial"
  | "retarget"
  | "nudge"
  | "followup"
  | "retention"
  | "confirmation";

export type AIWorker =
  | "GIANNA"
  | "CATHY"
  | "SABRINA"
  | "NEVA"
  | "APPOINTMENT_BOT";

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  stage: CampaignStage;
  worker: AIWorker;
  tags: string[];
  variables: string[];
  charCount: number;
}

export interface CampaignStageConfig {
  stage: CampaignStage;
  worker: AIWorker;
  label: string;
  description: string;
  color: string;
  triggerCondition: string;
  goalAction: string;
}

// Stage configuration for the Inbound Response Generation Machine
export const CAMPAIGN_STAGES: CampaignStageConfig[] = [
  {
    stage: "initial",
    worker: "GIANNA",
    label: "Initial Outreach",
    description: "First contact with new leads",
    color: "blue",
    triggerCondition: "New lead imported",
    goalAction: "Capture email + mobile confirmation → GOLD LABEL",
  },
  {
    stage: "retarget",
    worker: "CATHY",
    label: "Retarget",
    description: "Re-engage leads who never responded",
    color: "purple",
    triggerCondition: "No response after 7+ days",
    goalAction: "Get any response to restart conversation",
  },
  {
    stage: "nudge",
    worker: "CATHY",
    label: "Nudge",
    description: "Keep active conversations moving",
    color: "pink",
    triggerCondition: "Responded but stale 2+ days",
    goalAction: "Push toward next step",
  },
  {
    stage: "followup",
    worker: "SABRINA",
    label: "Follow-Up",
    description: "Convert warm leads to meetings",
    color: "amber",
    triggerCondition: "Email captured / positive response",
    goalAction: "Book 15-min discovery meeting",
  },
  {
    stage: "retention",
    worker: "NEVA",
    label: "Retention",
    description: "Nurture existing clients",
    color: "emerald",
    triggerCondition: "Post-meeting / existing client",
    goalAction: "Referrals, reviews, upsells",
  },
  {
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    label: "Confirmation",
    description: "Appointment reminders",
    color: "cyan",
    triggerCondition: "Meeting scheduled",
    goalAction: "Reduce no-shows",
  },
];

// Personalization variables available
export const TEMPLATE_VARIABLES = [
  { key: "{{name}}", label: "Lead Name", example: "John" },
  { key: "{{first_name}}", label: "First Name", example: "John" },
  { key: "{{last_name}}", label: "Last Name", example: "Smith" },
  {
    key: "{{business_name}}",
    label: "Business Name",
    example: "Smith Auto Repair",
  },
  { key: "{{sender_name}}", label: "Sender Name", example: "Gianna" },
  { key: "{{company}}", label: "Your Company", example: "Nextier" },
  { key: "{{city}}", label: "City", example: "Brooklyn" },
  { key: "{{state}}", label: "State", example: "NY" },
  { key: "{{industry}}", label: "Industry", example: "auto repair" },
  { key: "{{revenue_range}}", label: "Revenue Range", example: "$1-5M" },
  {
    key: "{{appointment_date}}",
    label: "Appointment Date",
    example: "Tuesday at 2pm",
  },
  {
    key: "{{appointment_link}}",
    label: "Booking Link",
    example: "cal.com/nextier",
  },
];

// Extract variables from a template
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
}

// Replace variables in template with values
export function replaceVariables(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// ============================================================================
// INITIAL SMS TEMPLATES - GIANNA
// Goal: Get ANY response + capture email → GOLD LABEL
// ============================================================================
export const INITIAL_TEMPLATES: SMSTemplate[] = [
  {
    id: "initial-1",
    name: "Valuation Curiosity",
    message:
      "Hey {{name}}, {{sender_name}} with {{company}}. Ever wonder what your business could sell for? I can get you a valuation. Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["valuation", "soft-open"],
    variables: ["name", "sender_name", "company"],
    charCount: 136,
  },
  {
    id: "initial-2",
    name: "Hidden Value",
    message:
      "Hey {{name}}, most owners have no idea what they're sitting on. Want a quick valuation? Best email to send it?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["valuation", "curiosity"],
    variables: ["name"],
    charCount: 120,
  },
  {
    id: "initial-3",
    name: "Expand or Exit",
    message:
      "{{sender_name}} here — thinking about expanding or exiting? I can get you a clean valuation. What's a good email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["exit", "expansion"],
    variables: ["sender_name"],
    charCount: 118,
  },
  {
    id: "initial-4",
    name: "Free Valuation Offer",
    message:
      "Hey {{name}}, I help owners know what their business can sell for. Want a valuation? What email works?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["valuation", "offer"],
    variables: ["name"],
    charCount: 108,
  },
  {
    id: "initial-5",
    name: "Know Your Number",
    message:
      "Curious — do you know what your business would sell for right now? I can show you. Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["valuation", "direct"],
    variables: [],
    charCount: 99,
  },
  {
    id: "initial-6",
    name: "15-Min Chat",
    message:
      "{{sender_name}} from {{company}} — free business valuation, 15-min chat. Worth it? What email should I use?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["meeting", "valuation"],
    variables: ["sender_name", "company"],
    charCount: 107,
  },
  {
    id: "initial-7",
    name: "Growth or Exit Check",
    message:
      "Hey {{name}}, growth mode or stepping back? I can get you a valuation either way. Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["qualification", "valuation"],
    variables: ["name"],
    charCount: 98,
  },
  {
    id: "initial-8",
    name: "Tomorrow's Offer",
    message:
      "If someone made you an offer tomorrow — do you know your number? I can get you a valuation. Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["urgency", "valuation"],
    variables: [],
    charCount: 102,
  },
  {
    id: "initial-9",
    name: "Worth Mapping",
    message:
      "{{sender_name}} here — I help owners map out what they're worth. Quick valuation if you want. Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["valuation", "short"],
    variables: ["sender_name"],
    charCount: 104,
  },
  {
    id: "initial-10",
    name: "1-2 Year Horizon",
    message:
      "Hey {{name}}, thinking expansion or exit in the next year or two? I can get you a valuation. Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["timeline", "valuation"],
    variables: ["name"],
    charCount: 104,
  },
  {
    id: "initial-11",
    name: "This Week",
    message:
      "I can run your business valuation this week. Want it? What's the best email for you?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["urgency", "action"],
    variables: [],
    charCount: 90,
  },
  {
    id: "initial-12",
    name: "Exit Number",
    message:
      "Hey {{name}}, most owners don't know their exit number. Want yours? Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["exit", "curiosity"],
    variables: ["name"],
    charCount: 85,
  },
  {
    id: "initial-13",
    name: "Quick Intro",
    message:
      "{{sender_name}} with {{company}} — I run valuations for business owners. Want yours? Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["intro", "valuation"],
    variables: ["sender_name", "company"],
    charCount: 95,
  },
  {
    id: "initial-14",
    name: "Head Number",
    message:
      "If you ever sold, what number's in your head? I can get you the real one. Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["direct", "valuation"],
    variables: [],
    charCount: 91,
  },
  {
    id: "initial-15",
    name: "Step Back Question",
    message:
      "Quick one — thought about stepping back or selling someday? I can get you a valuation. Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["soft", "exit"],
    variables: [],
    charCount: 98,
  },
  {
    id: "initial-16",
    name: "True Worth",
    message:
      "{{sender_name}} here — I help owners figure out what they're really worth. Want yours? Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["valuation", "worth"],
    variables: ["sender_name"],
    charCount: 99,
  },
  {
    id: "initial-17",
    name: "Market Value",
    message:
      "Hey {{name}}, do you know your current market value? I can get it for you. Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["market", "valuation"],
    variables: ["name"],
    charCount: 91,
  },
  {
    id: "initial-18",
    name: "Buyer Snapshot",
    message:
      "I can get you a valuation + snapshot of what buyers would pay. Want it? Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["buyers", "valuation"],
    variables: [],
    charCount: 84,
  },
  {
    id: "initial-19",
    name: "This Week Batch",
    message:
      "{{sender_name}} at {{company}} — doing valuations this week. Want yours? Email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["batch", "urgency"],
    variables: ["sender_name", "company"],
    charCount: 84,
  },
  {
    id: "initial-20",
    name: "Full Valuation",
    message:
      "Ever thought about expanding or exiting? I can get you a full valuation. Best email?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["complete", "valuation"],
    variables: [],
    charCount: 89,
  },
];

// ============================================================================
// RETARGET SMS TEMPLATES - CATHY
// Goal: Re-engage leads who never responded (7+ days)
// ============================================================================
export const RETARGET_TEMPLATES: SMSTemplate[] = [
  {
    id: "retarget-1",
    name: "Quick Check-In",
    message:
      "Hey {{name}}! Just checking in — still interested in chatting? Let me know if now works better!",
    stage: "retarget",
    worker: "CATHY",
    tags: ["soft", "check-in"],
    variables: ["name"],
    charCount: 99,
  },
  {
    id: "retarget-2",
    name: "Busy Week",
    message:
      "Hey {{name}}, I know things get busy. Still interested in that valuation? Just reply and we can set up a quick call.",
    stage: "retarget",
    worker: "CATHY",
    tags: ["empathy", "follow-up"],
    variables: ["name"],
    charCount: 122,
  },
  {
    id: "retarget-3",
    name: "Making Sure",
    message:
      "Hey {{name}}! Making sure my messages are getting through. If you're still interested, I'm here!",
    stage: "retarget",
    worker: "CATHY",
    tags: ["soft", "confirmation"],
    variables: ["name"],
    charCount: 100,
  },
  {
    id: "retarget-4",
    name: "Different Angle",
    message:
      "{{name}}, maybe timing wasn't right before. Still curious about what your business could sell for?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["timing", "curiosity"],
    variables: ["name"],
    charCount: 100,
  },
  {
    id: "retarget-5",
    name: "No Pressure",
    message:
      "Hey {{name}}, no pressure at all — just wanted to see if you're still thinking about getting a valuation. Thoughts?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["no-pressure", "soft"],
    variables: ["name"],
    charCount: 120,
  },
  {
    id: "retarget-6",
    name: "Circle Back",
    message:
      "{{sender_name}} here again. Wanted to circle back — still interested in knowing what your business is worth?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["follow-up", "direct"],
    variables: ["sender_name"],
    charCount: 110,
  },
  {
    id: "retarget-7",
    name: "Quick Question",
    message:
      "Hey {{name}}, quick question — is now a better time to chat about that valuation? Just say the word.",
    stage: "retarget",
    worker: "CATHY",
    tags: ["timing", "question"],
    variables: ["name"],
    charCount: 105,
  },
  {
    id: "retarget-8",
    name: "Still Here",
    message:
      "Hey {{name}}! Still here if you want that valuation. No rush — just let me know when you're ready.",
    stage: "retarget",
    worker: "CATHY",
    tags: ["patience", "soft"],
    variables: ["name"],
    charCount: 101,
  },
  {
    id: "retarget-9",
    name: "Last Check",
    message:
      "{{name}}, last check-in — still interested in finding out what your business could sell for? Either way, let me know!",
    stage: "retarget",
    worker: "CATHY",
    tags: ["final", "direct"],
    variables: ["name"],
    charCount: 121,
  },
  {
    id: "retarget-10",
    name: "Timing Better",
    message:
      "Hey {{name}}, maybe the timing wasn't great before. Would a quick call work better now?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["timing", "call"],
    variables: ["name"],
    charCount: 93,
  },
  {
    id: "retarget-11",
    name: "Missed Connection",
    message:
      "{{sender_name}} here — we might have missed each other. Still want that business valuation?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["reconnect", "soft"],
    variables: ["sender_name"],
    charCount: 95,
  },
  {
    id: "retarget-12",
    name: "Thinking About It",
    message:
      "Hey {{name}}, been thinking about it? The valuation offer still stands. Just reply when ready.",
    stage: "retarget",
    worker: "CATHY",
    tags: ["patience", "offer"],
    variables: ["name"],
    charCount: 98,
  },
  {
    id: "retarget-13",
    name: "Free Reminder",
    message:
      "Quick reminder — that free valuation I mentioned is still available. Worth 5 mins? Let me know!",
    stage: "retarget",
    worker: "CATHY",
    tags: ["reminder", "value"],
    variables: [],
    charCount: 99,
  },
  {
    id: "retarget-14",
    name: "New Info",
    message:
      "Hey {{name}}, I've got some new market info that might change your mind. Want to hear it?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["curiosity", "value"],
    variables: ["name"],
    charCount: 95,
  },
  {
    id: "retarget-15",
    name: "Changed Mind",
    message:
      "{{name}}, changed your mind? Totally fine — but if you're still curious about your valuation, I'm here.",
    stage: "retarget",
    worker: "CATHY",
    tags: ["understanding", "soft"],
    variables: ["name"],
    charCount: 110,
  },
  {
    id: "retarget-16",
    name: "Back to You",
    message:
      "Hey {{name}}, coming back to you. Still thinking about that valuation? Happy to chat whenever.",
    stage: "retarget",
    worker: "CATHY",
    tags: ["follow-up", "patient"],
    variables: ["name"],
    charCount: 99,
  },
  {
    id: "retarget-17",
    name: "Market Update",
    message:
      "{{name}}, quick market update — valuations in {{industry}} are shifting. Want to know where you stand?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["urgency", "market"],
    variables: ["name", "industry"],
    charCount: 106,
  },
  {
    id: "retarget-18",
    name: "Simple Reply",
    message:
      "Hey {{name}}! Just reply YES if you still want that valuation. No if not. Either works!",
    stage: "retarget",
    worker: "CATHY",
    tags: ["direct", "easy"],
    variables: ["name"],
    charCount: 93,
  },
  {
    id: "retarget-19",
    name: "Week Later",
    message:
      "It's been a week — figured I'd check in. Still want to know what your business could sell for?",
    stage: "retarget",
    worker: "CATHY",
    tags: ["timeline", "check-in"],
    variables: [],
    charCount: 99,
  },
  {
    id: "retarget-20",
    name: "One More Time",
    message:
      "{{sender_name}} here, one more time. Valuation still on the table if you're interested. Just say when!",
    stage: "retarget",
    worker: "CATHY",
    tags: ["final", "offer"],
    variables: ["sender_name"],
    charCount: 107,
  },
];

// ============================================================================
// NUDGE SMS TEMPLATES - CATHY
// Goal: Keep active conversations moving (stale 2+ days)
// ============================================================================
export const NUDGE_TEMPLATES: SMSTemplate[] = [
  {
    id: "nudge-1",
    name: "Just Checking",
    message:
      "Hey {{name}}, just checking in! Any questions about that valuation? Let me know if now works better to chat.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["soft", "check-in"],
    variables: ["name"],
    charCount: 116,
  },
  {
    id: "nudge-2",
    name: "Following Up",
    message:
      "{{sender_name}} here — following up on our conversation. Still thinking about it? Happy to answer questions.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["follow-up", "helpful"],
    variables: ["sender_name"],
    charCount: 114,
  },
  {
    id: "nudge-3",
    name: "Quick Reminder",
    message:
      "Hey {{name}}! Quick reminder — I'm here if you have questions about the valuation. No rush!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["reminder", "patient"],
    variables: ["name"],
    charCount: 96,
  },
  {
    id: "nudge-4",
    name: "Thoughts",
    message:
      "Hey {{name}}, any thoughts since we last chatted? Let me know if you want to discuss further.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["question", "soft"],
    variables: ["name"],
    charCount: 98,
  },
  {
    id: "nudge-5",
    name: "Next Steps",
    message:
      "{{name}}, wanted to check if you're ready for next steps on that valuation. Just say the word!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["action", "direct"],
    variables: ["name"],
    charCount: 99,
  },
  {
    id: "nudge-6",
    name: "Questions",
    message:
      "Hey {{name}}! Got any questions I can answer? Happy to help clarify anything about the process.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["helpful", "questions"],
    variables: ["name"],
    charCount: 99,
  },
  {
    id: "nudge-7",
    name: "Moving Forward",
    message:
      "{{sender_name}} here — ready to move forward whenever you are. Just let me know what you need!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["action", "supportive"],
    variables: ["sender_name"],
    charCount: 99,
  },
  {
    id: "nudge-8",
    name: "Good Time",
    message:
      "Hey {{name}}, is now a good time to continue our conversation? I'm free whenever works for you.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["timing", "flexible"],
    variables: ["name"],
    charCount: 101,
  },
  {
    id: "nudge-9",
    name: "Status Check",
    message:
      "Quick status check — where are you at with the valuation idea? Still interested? Let me know!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["status", "direct"],
    variables: [],
    charCount: 97,
  },
  {
    id: "nudge-10",
    name: "Clarify Anything",
    message:
      "Hey {{name}}, happy to clarify anything about the valuation process. What would help most?",
    stage: "nudge",
    worker: "CATHY",
    tags: ["helpful", "questions"],
    variables: ["name"],
    charCount: 94,
  },
  {
    id: "nudge-11",
    name: "Schedule Call",
    message:
      "{{name}}, want to schedule a quick call to go over next steps? Just 10 mins. What time works?",
    stage: "nudge",
    worker: "CATHY",
    tags: ["call", "scheduling"],
    variables: ["name"],
    charCount: 97,
  },
  {
    id: "nudge-12",
    name: "Gentle Push",
    message:
      "Hey {{name}}! Gentle nudge — I don't want you to miss out on this. Ready to move forward?",
    stage: "nudge",
    worker: "CATHY",
    tags: ["urgency", "soft"],
    variables: ["name"],
    charCount: 95,
  },
  {
    id: "nudge-13",
    name: "Here to Help",
    message:
      "{{sender_name}} here — just want you to know I'm here to help whenever you're ready. No pressure!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["supportive", "patient"],
    variables: ["sender_name"],
    charCount: 103,
  },
  {
    id: "nudge-14",
    name: "Quick Chat",
    message:
      "Hey {{name}}, got 5 mins for a quick chat? Can answer any questions you might have.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["call", "quick"],
    variables: ["name"],
    charCount: 88,
  },
  {
    id: "nudge-15",
    name: "Still Interested",
    message:
      "{{name}}, still interested in getting that valuation done? I can make it super easy. Let me know!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["easy", "action"],
    variables: ["name"],
    charCount: 100,
  },
  {
    id: "nudge-16",
    name: "Thinking It Over",
    message:
      "Hey {{name}}, totally understand if you're thinking it over. Anything I can help clarify?",
    stage: "nudge",
    worker: "CATHY",
    tags: ["understanding", "helpful"],
    variables: ["name"],
    charCount: 95,
  },
  {
    id: "nudge-17",
    name: "Ready When You Are",
    message:
      "{{sender_name}} here — ready when you are! Just reply and we can pick up where we left off.",
    stage: "nudge",
    worker: "CATHY",
    tags: ["patient", "easy"],
    variables: ["sender_name"],
    charCount: 96,
  },
  {
    id: "nudge-18",
    name: "One Quick Thing",
    message:
      "Hey {{name}}, one quick thing — did you get a chance to review what we discussed? Any thoughts?",
    stage: "nudge",
    worker: "CATHY",
    tags: ["follow-up", "question"],
    variables: ["name"],
    charCount: 99,
  },
  {
    id: "nudge-19",
    name: "Move Things Along",
    message:
      "{{name}}, want to move things along? I can send over the next steps right now. Just say yes!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["action", "direct"],
    variables: ["name"],
    charCount: 97,
  },
  {
    id: "nudge-20",
    name: "Final Nudge",
    message:
      "Hey {{name}}! Last nudge from me — still want that valuation? Either way, let me know!",
    stage: "nudge",
    worker: "CATHY",
    tags: ["final", "soft"],
    variables: ["name"],
    charCount: 91,
  },
];

// ============================================================================
// FOLLOW-UP SMS TEMPLATES - SABRINA
// Goal: Convert warm leads to 15-min discovery meeting
// ============================================================================
export const FOLLOWUP_TEMPLATES: SMSTemplate[] = [
  {
    id: "followup-1",
    name: "Value Add",
    message:
      "Hey {{name}}, thought you'd find this interesting — just saw some new data on {{industry}} valuations. Want me to share?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["value", "helpful"],
    variables: ["name", "industry"],
    charCount: 122,
  },
  {
    id: "followup-2",
    name: "Check Progress",
    message:
      "{{sender_name}} here — how are things going with your business? Any updates since we last talked?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["progress", "soft"],
    variables: ["sender_name"],
    charCount: 99,
  },
  {
    id: "followup-3",
    name: "Market Insight",
    message:
      "Hey {{name}}, quick market insight: {{industry}} is seeing increased buyer interest. Thought you'd want to know!",
    stage: "followup",
    worker: "SABRINA",
    tags: ["market", "value"],
    variables: ["name", "industry"],
    charCount: 114,
  },
  {
    id: "followup-4",
    name: "Resource Share",
    message:
      "{{name}}, I have a resource on business valuation you might like. Want me to send it over? No strings attached.",
    stage: "followup",
    worker: "SABRINA",
    tags: ["resource", "helpful"],
    variables: ["name"],
    charCount: 116,
  },
  {
    id: "followup-5",
    name: "Timeline Check",
    message:
      "Hey {{name}}, has your timeline changed at all? Just checking in to see where you're at with everything.",
    stage: "followup",
    worker: "SABRINA",
    tags: ["timeline", "question"],
    variables: ["name"],
    charCount: 108,
  },
  {
    id: "followup-6",
    name: "Success Story",
    message:
      "{{name}}, just helped another {{industry}} owner get a great valuation. Reminded me of you. How are things?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["social-proof", "soft"],
    variables: ["name", "industry"],
    charCount: 111,
  },
  {
    id: "followup-7",
    name: "Quarterly Check",
    message:
      "Hey {{name}}! Quarterly check-in — how's {{business_name}} doing? Any new developments I should know about?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["regular", "business"],
    variables: ["name", "business_name"],
    charCount: 109,
  },
  {
    id: "followup-8",
    name: "Thinking of You",
    message:
      "{{sender_name}} here — saw something about {{industry}} and thought of you. How's business going?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["personal", "soft"],
    variables: ["sender_name", "industry"],
    charCount: 101,
  },
  {
    id: "followup-9",
    name: "Goals Update",
    message:
      "Hey {{name}}, any updates on your goals for this year? I'm here if you want to chat through anything.",
    stage: "followup",
    worker: "SABRINA",
    tags: ["goals", "supportive"],
    variables: ["name"],
    charCount: 107,
  },
  {
    id: "followup-10",
    name: "New Opportunity",
    message:
      "{{name}}, I might have an opportunity that fits your situation. Got a minute to hear about it?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["opportunity", "value"],
    variables: ["name"],
    charCount: 97,
  },
  {
    id: "followup-11",
    name: "Stay Connected",
    message:
      "Hey {{name}}, just staying connected. No agenda — just wanted to see how you're doing!",
    stage: "followup",
    worker: "SABRINA",
    tags: ["personal", "soft"],
    variables: ["name"],
    charCount: 91,
  },
  {
    id: "followup-12",
    name: "Industry News",
    message:
      "{{name}}, big news in {{industry}} this week. Affects valuations. Want me to break it down for you?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["news", "value"],
    variables: ["name", "industry"],
    charCount: 103,
  },
  {
    id: "followup-13",
    name: "Helpful Article",
    message:
      "Hey {{name}}, found an article about growing {{industry}} businesses. Thought of you. Want the link?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["resource", "helpful"],
    variables: ["name", "industry"],
    charCount: 103,
  },
  {
    id: "followup-14",
    name: "Business Check",
    message:
      "{{sender_name}} checking in — how's {{business_name}} doing lately? Any wins to celebrate?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["positive", "business"],
    variables: ["sender_name", "business_name"],
    charCount: 96,
  },
  {
    id: "followup-15",
    name: "Ready Talk",
    message:
      "Hey {{name}}, when you're ready to talk next steps, I'm here. No rush — just wanted you to know!",
    stage: "followup",
    worker: "SABRINA",
    tags: ["patient", "supportive"],
    variables: ["name"],
    charCount: 101,
  },
  {
    id: "followup-16",
    name: "New Data",
    message:
      "{{name}}, got some new valuation data for {{city}} area businesses. Interesting stuff. Want to see it?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["data", "local"],
    variables: ["name", "city"],
    charCount: 105,
  },
  {
    id: "followup-17",
    name: "Quick Update",
    message:
      "Hey {{name}}, quick update from my end — got some new tools that could help you. Want to hear more?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["update", "value"],
    variables: ["name"],
    charCount: 102,
  },
  {
    id: "followup-18",
    name: "Seasonal Check",
    message:
      "{{sender_name}} here — how's business this season? {{industry}} usually picks up around now!",
    stage: "followup",
    worker: "SABRINA",
    tags: ["seasonal", "business"],
    variables: ["sender_name", "industry"],
    charCount: 97,
  },
  {
    id: "followup-19",
    name: "Growth Chat",
    message:
      "Hey {{name}}, any thoughts on growth this year? I've got some ideas if you want to brainstorm.",
    stage: "followup",
    worker: "SABRINA",
    tags: ["growth", "helpful"],
    variables: ["name"],
    charCount: 98,
  },
  {
    id: "followup-20",
    name: "Touch Base",
    message:
      "{{name}}, just touching base. How are things with {{business_name}}? Anything new happening?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["regular", "soft"],
    variables: ["name", "business_name"],
    charCount: 97,
  },
];

// ============================================================================
// RETENTION SMS TEMPLATES - NEVA
// Goal: Nurture existing clients for referrals, reviews, upsells
// ============================================================================
export const RETENTION_TEMPLATES: SMSTemplate[] = [
  {
    id: "retention-1",
    name: "Check-In",
    message:
      "Hey {{name}}, {{sender_name}} here. Just checking in — how's everything going since we last worked together?",
    stage: "retention",
    worker: "NEVA",
    tags: ["check-in", "soft"],
    variables: ["name", "sender_name"],
    charCount: 111,
  },
  {
    id: "retention-2",
    name: "Referral Ask",
    message:
      "{{name}}, quick question — know anyone else who might benefit from what we did for you? Happy to help them too!",
    stage: "retention",
    worker: "NEVA",
    tags: ["referral", "direct"],
    variables: ["name"],
    charCount: 115,
  },
  {
    id: "retention-3",
    name: "New Service",
    message:
      "Hey {{name}}, we just added a new service I think would help {{business_name}}. Got a minute to hear about it?",
    stage: "retention",
    worker: "NEVA",
    tags: ["upsell", "value"],
    variables: ["name", "business_name"],
    charCount: 115,
  },
  {
    id: "retention-4",
    name: "Anniversary",
    message:
      "{{name}}, can't believe it's been a year since we started working together! How's everything going?",
    stage: "retention",
    worker: "NEVA",
    tags: ["milestone", "personal"],
    variables: ["name"],
    charCount: 103,
  },
  {
    id: "retention-5",
    name: "Feedback Request",
    message:
      "Hey {{name}}, quick favor — how would you rate your experience with us? Your feedback means a lot!",
    stage: "retention",
    worker: "NEVA",
    tags: ["feedback", "soft"],
    variables: ["name"],
    charCount: 101,
  },
  {
    id: "retention-6",
    name: "Update Available",
    message:
      "{{sender_name}} here — got an update on {{business_name}}'s valuation. Numbers are looking good. Want to see?",
    stage: "retention",
    worker: "NEVA",
    tags: ["update", "value"],
    variables: ["sender_name", "business_name"],
    charCount: 113,
  },
  {
    id: "retention-7",
    name: "Support Check",
    message:
      "Hey {{name}}, just making sure you have everything you need from us. Anything I can help with?",
    stage: "retention",
    worker: "NEVA",
    tags: ["support", "helpful"],
    variables: ["name"],
    charCount: 97,
  },
  {
    id: "retention-8",
    name: "VIP Offer",
    message:
      "{{name}}, as one of our valued clients, wanted to give you first look at something new. Interested?",
    stage: "retention",
    worker: "NEVA",
    tags: ["exclusive", "value"],
    variables: ["name"],
    charCount: 103,
  },
  {
    id: "retention-9",
    name: "Results Check",
    message:
      "Hey {{name}}, how are the results looking since we worked together? Would love to hear an update!",
    stage: "retention",
    worker: "NEVA",
    tags: ["results", "positive"],
    variables: ["name"],
    charCount: 100,
  },
  {
    id: "retention-10",
    name: "Next Steps",
    message:
      "{{sender_name}} here — ready to take the next step with {{business_name}}? I've got some ideas for you.",
    stage: "retention",
    worker: "NEVA",
    tags: ["action", "growth"],
    variables: ["sender_name", "business_name"],
    charCount: 108,
  },
  {
    id: "retention-11",
    name: "Appreciation",
    message:
      "Hey {{name}}, just wanted to say thanks for trusting us with {{business_name}}. We appreciate you!",
    stage: "retention",
    worker: "NEVA",
    tags: ["gratitude", "personal"],
    variables: ["name", "business_name"],
    charCount: 102,
  },
  {
    id: "retention-12",
    name: "Renewal Reminder",
    message:
      "{{name}}, heads up — your renewal is coming up. Want to chat about what's next?",
    stage: "retention",
    worker: "NEVA",
    tags: ["renewal", "reminder"],
    variables: ["name"],
    charCount: 86,
  },
  {
    id: "retention-13",
    name: "Market Update",
    message:
      "Hey {{name}}, market update for existing clients: {{industry}} valuations are shifting. Want the details?",
    stage: "retention",
    worker: "NEVA",
    tags: ["market", "exclusive"],
    variables: ["name", "industry"],
    charCount: 109,
  },
  {
    id: "retention-14",
    name: "Quick Call",
    message:
      "{{sender_name}} here — got time for a quick call this week? Want to make sure you're getting full value.",
    stage: "retention",
    worker: "NEVA",
    tags: ["call", "support"],
    variables: ["sender_name"],
    charCount: 109,
  },
  {
    id: "retention-15",
    name: "Success Share",
    message:
      "Hey {{name}}, would you be open to sharing your success story? Could help other business owners like you!",
    stage: "retention",
    worker: "NEVA",
    tags: ["testimonial", "social-proof"],
    variables: ["name"],
    charCount: 110,
  },
  {
    id: "retention-16",
    name: "Loyalty Thank You",
    message:
      "{{name}}, thank you for being a loyal client. Anything we can do to make your experience even better?",
    stage: "retention",
    worker: "NEVA",
    tags: ["gratitude", "improvement"],
    variables: ["name"],
    charCount: 106,
  },
  {
    id: "retention-17",
    name: "Exclusive Access",
    message:
      "Hey {{name}}, as a valued client, you get early access to our new {{industry}} report. Want it?",
    stage: "retention",
    worker: "NEVA",
    tags: ["exclusive", "value"],
    variables: ["name", "industry"],
    charCount: 99,
  },
  {
    id: "retention-18",
    name: "Partner Check",
    message:
      "{{sender_name}} checking in — how's our partnership working for you? Any adjustments needed?",
    stage: "retention",
    worker: "NEVA",
    tags: ["partnership", "support"],
    variables: ["sender_name"],
    charCount: 96,
  },
  {
    id: "retention-19",
    name: "Growth Review",
    message:
      "Hey {{name}}, want to schedule a growth review for {{business_name}}? Could uncover new opportunities!",
    stage: "retention",
    worker: "NEVA",
    tags: ["growth", "value"],
    variables: ["name", "business_name"],
    charCount: 107,
  },
  {
    id: "retention-20",
    name: "Stay Connected",
    message:
      "{{name}}, just staying connected! How's {{business_name}} doing? Any big plans coming up?",
    stage: "retention",
    worker: "NEVA",
    tags: ["personal", "business"],
    variables: ["name", "business_name"],
    charCount: 96,
  },
];

// ============================================================================
// CONFIRMATION SMS TEMPLATES - APPOINTMENT_BOT
// Goal: Reduce no-shows for scheduled meetings
// ============================================================================
export const CONFIRMATION_TEMPLATES: SMSTemplate[] = [
  {
    id: "confirm-1",
    name: "Day Before",
    message:
      "Hey {{name}}, just a reminder about our call tomorrow at {{appointment_date}}. Looking forward to it!",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["reminder", "24h"],
    variables: ["name", "appointment_date"],
    charCount: 101,
  },
  {
    id: "confirm-2",
    name: "Same Day Morning",
    message:
      "Good morning {{name}}! Quick reminder — we have a call scheduled for {{appointment_date}}. See you soon!",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["reminder", "same-day"],
    variables: ["name", "appointment_date"],
    charCount: 107,
  },
  {
    id: "confirm-3",
    name: "1 Hour Before",
    message:
      "Hey {{name}}, our call is in 1 hour at {{appointment_date}}. Reply YES to confirm or let me know if you need to reschedule.",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["reminder", "1h", "confirm"],
    variables: ["name", "appointment_date"],
    charCount: 127,
  },
  {
    id: "confirm-4",
    name: "15 Min Before",
    message:
      "{{name}}, starting in 15 mins! Here's the link: {{appointment_link}} — see you there!",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["reminder", "15min", "link"],
    variables: ["name", "appointment_link"],
    charCount: 91,
  },
  {
    id: "confirm-5",
    name: "Reschedule Offer",
    message:
      "Hey {{name}}, if {{appointment_date}} doesn't work anymore, no worries — just reply and we'll find a better time.",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["reschedule", "flexible"],
    variables: ["name", "appointment_date"],
    charCount: 116,
  },
  {
    id: "confirm-6",
    name: "Post-Meeting Thank You",
    message:
      "{{name}}, great chatting with you today! Let me know if you have any follow-up questions. Talk soon!",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["thank-you", "post-meeting"],
    variables: ["name"],
    charCount: 104,
  },
  {
    id: "confirm-7",
    name: "No Show Check",
    message:
      "Hey {{name}}, we missed each other at {{appointment_date}}. Want to reschedule? Just reply with a time that works.",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["no-show", "reschedule"],
    variables: ["name", "appointment_date"],
    charCount: 117,
  },
  {
    id: "confirm-8",
    name: "Booking Confirmation",
    message:
      "Awesome {{name}}! You're booked for {{appointment_date}}. I'll send a reminder before our call. Talk soon!",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["booking", "confirmation"],
    variables: ["name", "appointment_date"],
    charCount: 110,
  },
];

// ============================================================================
// COLD CALL SCRIPTS - For Call Center reference
// ============================================================================
export interface CallScript {
  id: string;
  name: string;
  script: string;
  tags: string[];
  variables: string[];
}

export const COLD_CALL_SCRIPTS: CallScript[] = [
  {
    id: "call-1",
    name: "Quick Question Open",
    script:
      "Hey, it's {{sender_name}} with {{company}}. Quick question — have you thought about expanding or possibly exiting in the next year or two?",
    tags: ["direct", "timeline"],
    variables: ["sender_name", "company"],
  },
  {
    id: "call-2",
    name: "Worth Statement",
    script:
      "{{sender_name}} here with {{company}}. I help owners understand what their business could actually sell for. Worth a quick minute?",
    tags: ["value-prop", "soft"],
    variables: ["sender_name", "company"],
  },
  {
    id: "call-3",
    name: "Direction Check",
    script:
      "Calling to see where you're heading — growth, maintaining, or exploring an exit. Mind if I ask one quick thing?",
    tags: ["qualification", "open"],
    variables: [],
  },
  {
    id: "call-4",
    name: "Valuation Specialty",
    script:
      "{{sender_name}} at {{company}} — I specialize in business valuations. Wanted to see if you've ever wondered what yours could fetch.",
    tags: ["specialty", "curiosity"],
    variables: ["sender_name", "company"],
  },
  {
    id: "call-5",
    name: "Tomorrow Offer",
    script:
      "Quick one — if someone made you an offer tomorrow, do you even know what your business is worth? That's why I'm calling.",
    tags: ["urgency", "direct"],
    variables: [],
  },
  {
    id: "call-6",
    name: "No Selling",
    script:
      "I'm not selling anything — just want to see if you've ever thought about expansion or stepping back at any point.",
    tags: ["disarm", "soft"],
    variables: [],
  },
  {
    id: "call-7",
    name: "Realistic Number",
    script:
      "{{sender_name}} here — I help owners get a realistic number of what they could sell for. Curious if that's ever crossed your mind?",
    tags: ["realistic", "curiosity"],
    variables: ["sender_name"],
  },
  {
    id: "call-8",
    name: "30 Seconds",
    script:
      "Do you have 30 seconds? I'm calling because I can get you a valuation on what your business is worth right now.",
    tags: ["time-bound", "direct"],
    variables: [],
  },
  {
    id: "call-9",
    name: "One Sentence",
    script:
      "I'll be quick — I help owners figure out the true market value of their business. Want me to explain in one sentence?",
    tags: ["brief", "hook"],
    variables: [],
  },
  {
    id: "call-10",
    name: "Ever Wondered",
    script:
      "Have you ever wondered what your business could sell for? That's exactly what I'm calling about.",
    tags: ["simple", "direct"],
    variables: [],
  },
];

// ============================================================================
// CAMPAIGN 1: REAL ESTATE AGENTS - Temp-C21390
// Phone: 15164079249 | Brand: BZOYPIH - NEXTIER
// Pitch: "Stop renting lead gen, own the system"
// ============================================================================
export const REALTOR_INITIAL_TEMPLATES: SMSTemplate[] = [
  {
    id: "realtor-1",
    name: "Stop Renting",
    message:
      "Most agents keep renting their lead generation and never control the system. Nextier changes that. Open to 15 min talk ?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["realtor", "lead-gen", "meeting"],
    variables: [],
    charCount: 124,
  },
  {
    id: "realtor-2",
    name: "System Builds",
    message:
      "The best agents don't chase leads — their system does. That's what we build at Nextier. best email ?",
    stage: "initial",
    worker: "GIANNA",
    tags: ["realtor", "system", "email-capture"],
    variables: [],
    charCount: 104,
  },
];

// Campaign config for Temp-C21390
export const CAMPAIGN_1_CONFIG = {
  campaignId: "Temp-C21390",
  brandName: "BZOYPIH - NEXTIER",
  phoneNumber: "15164079249",
  audience: "Real Estate Agents & Brokers",
  sicCode: "6531",
  pitch: "Stop renting lead gen, own the system",
  templates: REALTOR_INITIAL_TEMPLATES,
  dailyLimit: 2000,
  targetIndustries: [
    "real estate",
    "realtor",
    "broker",
    "realty",
    "property",
    "commercial real estate",
    "residential real estate",
  ],
};

// ============================================================================
// ALL TEMPLATES - Combined export for easy access
// ============================================================================
export const ALL_SMS_TEMPLATES: SMSTemplate[] = [
  ...INITIAL_TEMPLATES,
  ...RETARGET_TEMPLATES,
  ...NUDGE_TEMPLATES,
  ...FOLLOWUP_TEMPLATES,
  ...RETENTION_TEMPLATES,
  ...CONFIRMATION_TEMPLATES,
  ...REALTOR_INITIAL_TEMPLATES,
];

// Get templates by stage
export function getTemplatesByStage(stage: CampaignStage): SMSTemplate[] {
  return ALL_SMS_TEMPLATES.filter((t) => t.stage === stage);
}

// Get templates by AI worker
export function getTemplatesByWorker(worker: AIWorker): SMSTemplate[] {
  return ALL_SMS_TEMPLATES.filter((t) => t.worker === worker);
}

// Get templates by tag
export function getTemplatesByTag(tag: string): SMSTemplate[] {
  return ALL_SMS_TEMPLATES.filter((t) => t.tags.includes(tag));
}

// Search templates
export function searchTemplates(query: string): SMSTemplate[] {
  const q = query.toLowerCase();
  return ALL_SMS_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}

// Get stage config
export function getStageConfig(
  stage: CampaignStage,
): CampaignStageConfig | undefined {
  return CAMPAIGN_STAGES.find((s) => s.stage === stage);
}

// Format template for SignalHouse API
export function formatForSignalHouse(template: SMSTemplate): {
  name: string;
  content: string;
  variables: string[];
} {
  return {
    name: `${template.stage}-${template.id}`,
    content: template.message,
    variables: template.variables,
  };
}
