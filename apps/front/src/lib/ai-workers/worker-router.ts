/**
 * AI WORKER ROUTER
 * Routes inbound SMS to the correct AI worker based on phone number.
 * Each worker has their own dedicated phone number and unique ID.
 */

export type AIWorkerName = "GIANNA" | "CATHY" | "SABRINA";

export interface AIWorker {
  id: string;
  name: AIWorkerName;
  displayName: string;
  role: string;
  description: string;
  phoneNumber: string;
  signalhouseSubGroupId?: string;
  signalhouseCampaignId?: string;
  personality: {
    tone: string;
    style: string;
    signOff: string;
  };
  capabilities: string[];
  responseTemplates: {
    emailCaptured: string;
    mobileCaptured: string;
    contentLink: string;
    scheduleCall: string;
    followUp: string;
    objectionHandle: string;
  };
}

export interface WorkerRouteResult {
  worker: AIWorker;
  matchedBy: "phone" | "campaign" | "default";
}

export const AI_WORKERS: Record<AIWorkerName, AIWorker> = {
  GIANNA: {
    id: "worker_gianna_001",
    name: "GIANNA",
    displayName: "Gianna",
    role: "Opener",
    description: "First contact specialist - email capture, valuation offers",
    phoneNumber: process.env.GIANNA_PHONE_NUMBER || "",
    signalhouseSubGroupId: process.env.GIANNA_SUBGROUP_ID,
    signalhouseCampaignId: process.env.GIANNA_CAMPAIGN_ID,
    personality: {
      tone: "friendly, professional, curious",
      style: "conversational, asks questions",
      signOff: "- Gianna",
    },
    capabilities: ["email_capture", "valuation_offer", "content_link", "initial_qualification"],
    responseTemplates: {
      emailCaptured: "{firstName}, got it! I'll have the valuation report sent to {email} shortly. - Gianna",
      mobileCaptured: "{firstName}, got it! I've noted {phone} as your preferred contact number. - Gianna",
      contentLink: "Great! Here's the article I mentioned: {contentUrl} - Gianna",
      scheduleCall: "Perfect! I'll have our advisor give you a call. What time works best? - Gianna",
      followUp: "Hi {firstName}, just circling back on the property. Still interested in getting a valuation? - Gianna",
      objectionHandle: "I completely understand, {firstName}. No pressure at all. - Gianna",
    },
  },
  CATHY: {
    id: "worker_cathy_001",
    name: "CATHY",
    displayName: "Cathy",
    role: "Nudger",
    description: "Re-engagement specialist - follow-up on ghosts, warm leads",
    phoneNumber: process.env.CATHY_PHONE_NUMBER || "",
    signalhouseSubGroupId: process.env.CATHY_SUBGROUP_ID,
    signalhouseCampaignId: process.env.CATHY_CAMPAIGN_ID,
    personality: {
      tone: "warm, understanding, patient",
      style: "empathetic, low-pressure",
      signOff: "- Cathy",
    },
    capabilities: ["ghost_followup", "re_engagement", "status_check", "nurture_sequence"],
    responseTemplates: {
      emailCaptured: "Thanks {firstName}! Sending that info to {email} now. - Cathy",
      mobileCaptured: "Got it, {firstName}! I'll make sure we reach you at {phone}. - Cathy",
      contentLink: "Here's that resource you might find helpful: {contentUrl} - Cathy",
      scheduleCall: "Would it help to have a quick chat? I can set something up. - Cathy",
      followUp: "Hi {firstName}, just wanted to check in. No rush! - Cathy",
      objectionHandle: "Totally get it, {firstName}. Whenever you're ready, I'm here. - Cathy",
    },
  },
  SABRINA: {
    id: "worker_sabrina_001",
    name: "SABRINA",
    displayName: "Sabrina",
    role: "Closer",
    description: "Booking specialist - scheduling calls, strategy sessions",
    phoneNumber: process.env.SABRINA_PHONE_NUMBER || "",
    signalhouseSubGroupId: process.env.SABRINA_SUBGROUP_ID,
    signalhouseCampaignId: process.env.SABRINA_CAMPAIGN_ID,
    personality: {
      tone: "confident, direct, action-oriented",
      style: "professional, results-focused",
      signOff: "- Sabrina",
    },
    capabilities: ["schedule_call", "book_appointment", "calendar_integration", "hot_lead_handling"],
    responseTemplates: {
      emailCaptured: "Perfect {firstName}! Sending your report to {email} now. Let's schedule a call to review. - Sabrina",
      mobileCaptured: "Great, {firstName}! I'll give you a call at {phone} shortly. - Sabrina",
      contentLink: "Here's the info: {contentUrl}. Ready to book a call when you've reviewed? - Sabrina",
      scheduleCall: "Let's get you on the calendar, {firstName}. Here's my booking link: {bookingUrl} - Sabrina",
      followUp: "Hi {firstName}, you mentioned interest in a call. I have availability - shall I send times? - Sabrina",
      objectionHandle: "I hear you, {firstName}. When would be a better time to connect? - Sabrina",
    },
  },
};

export function routeByPhoneNumber(toNumber: string): WorkerRouteResult {
  const normalized = toNumber.replace(/\D/g, "").slice(-10);

  for (const [, worker] of Object.entries(AI_WORKERS)) {
    const workerNormalized = worker.phoneNumber.replace(/\D/g, "").slice(-10);
    if (workerNormalized && workerNormalized === normalized) {
      return { worker, matchedBy: "phone" };
    }
  }

  return { worker: AI_WORKERS.GIANNA, matchedBy: "default" };
}

export function routeByCampaignId(campaignId: string): WorkerRouteResult {
  for (const [, worker] of Object.entries(AI_WORKERS)) {
    if (worker.signalhouseCampaignId === campaignId) {
      return { worker, matchedBy: "campaign" };
    }
  }
  return { worker: AI_WORKERS.GIANNA, matchedBy: "default" };
}

export function getWorkerByName(name: AIWorkerName): AIWorker {
  return AI_WORKERS[name];
}

export function getAllWorkers(): AIWorker[] {
  return Object.values(AI_WORKERS);
}

export function formatWorkerResponse(
  worker: AIWorker,
  templateKey: keyof AIWorker["responseTemplates"],
  data: Record<string, string>
): string {
  let template = worker.responseTemplates[templateKey];
  for (const [key, value] of Object.entries(data)) {
    template = template.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
  }
  return template;
}

export function getWorkerForLeadStage(stage: string, tags: string[] = []): AIWorker {
  if (
    stage === "hot_lead" ||
    stage === "scheduled" ||
    tags.includes("gold_label") ||
    tags.includes("wants_call")
  ) {
    return AI_WORKERS.SABRINA;
  }

  if (
    stage === "ghost" ||
    stage === "no_response" ||
    tags.includes("ghost") ||
    tags.includes("needs_nudge")
  ) {
    return AI_WORKERS.CATHY;
  }

  return AI_WORKERS.GIANNA;
}

export async function logWorkerActivity(
  worker: AIWorker,
  action: string,
  leadId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  console.log(
    `[AI Worker: ${worker.name}] ${action}`,
    JSON.stringify({ leadId, ...details })
  );
}

export function validateWorkerPhoneNumbers(): { valid: boolean; missing: AIWorkerName[] } {
  const missing: AIWorkerName[] = [];
  for (const [name, worker] of Object.entries(AI_WORKERS)) {
    if (!worker.phoneNumber) {
      missing.push(name as AIWorkerName);
    }
  }
  return { valid: missing.length === 0, missing };
}

export function getWorkerPhoneE164(name: AIWorkerName): string | null {
  const worker = AI_WORKERS[name];
  if (!worker.phoneNumber) return null;
  const digits = worker.phoneNumber.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return worker.phoneNumber;
}
