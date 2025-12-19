/**
 * GIANNA SCHEDULING ENGINE
 *
 * Wires AI Digital Workers into the calendar booking system.
 * Manages pre-windows (optimal send times) and appointment booking flow.
 *
 * FLOW:
 * 1. GIANNA sends initial outreach (scheduled via pre-windows)
 * 2. Lead responds → Classification → Auto-response (up to 3x before human)
 * 3. Email captured → Value X delivery → Call queue (24h)
 * 4. SABRINA books appointment → Calendar integration
 * 5. CATHY nudges non-responders (different time slots)
 */

import type { DigitalWorkerId, DigitalWorkerProfile } from "./digital-workers";
import type {
  CampaignContext,
  DeliverableType,
} from "@/lib/response-classifications";

// ==========================================
// SCHEDULING WINDOWS
// When to send messages for optimal engagement
// ==========================================

export type TimeWindow = {
  id: string;
  name: string;
  startHour: number; // 0-23
  endHour: number; // 0-23
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  priority: number; // Higher = preferred
};

export const DEFAULT_SEND_WINDOWS: TimeWindow[] = [
  {
    id: "morning_prime",
    name: "Morning Prime",
    startHour: 9,
    endHour: 11,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    priority: 100,
  },
  {
    id: "lunch_window",
    name: "Lunch Window",
    startHour: 12,
    endHour: 13,
    daysOfWeek: [1, 2, 3, 4, 5],
    priority: 60,
  },
  {
    id: "afternoon_prime",
    name: "Afternoon Prime",
    startHour: 14,
    endHour: 17,
    daysOfWeek: [1, 2, 3, 4, 5],
    priority: 80,
  },
  {
    id: "evening_casual",
    name: "Evening Casual",
    startHour: 18,
    endHour: 20,
    daysOfWeek: [1, 2, 3, 4, 5],
    priority: 70,
  },
  {
    id: "saturday_morning",
    name: "Saturday Morning",
    startHour: 10,
    endHour: 14,
    daysOfWeek: [6], // Saturday only
    priority: 50,
  },
];

// ==========================================
// AUTO-RESPONSE CONFIG
// 3 templated responses before human alert
// ==========================================

export interface AutoResponseConfig {
  workerId: Exclude<DigitalWorkerId, "neva">;
  maxAutoResponses: number; // Default: 3
  classifications: string[]; // Which classifications get auto-response
  escalateAfter: number; // Escalate to human after N responses
  templatePool: AutoResponseTemplate[];
}

export interface AutoResponseTemplate {
  id: string;
  classification: string;
  attemptNumber: number; // 1, 2, or 3
  template: string;
  variables: string[];
  nextAction?:
    | "ask_for_email"
    | "book_appointment"
    | "send_value_x"
    | "escalate";
}

// GIANNA's auto-response templates (3 responses before human)
// PERSONALITY: Direct like Lori Greiner, sharp like Candace Owens
// Authoritative, likeable, conversational, REAL. Calls people by name.
export const GIANNA_AUTO_RESPONSE_TEMPLATES: AutoResponseTemplate[] = [
  // ═══════════════════════════════════════════════════════════════
  // INTERESTED RESPONSES - Direct, authoritative, gets to the point
  // ═══════════════════════════════════════════════════════════════
  {
    id: "gianna_interested_1",
    classification: "interested",
    attemptNumber: 1,
    template: `{{first_name}}, perfect. I've got something that'll actually help you. What's your email? I'll send it right over. - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
  {
    id: "gianna_interested_2",
    classification: "interested",
    attemptNumber: 2,
    template: `{{first_name}} - still want to get you that info. Drop your email and I'll have it in your inbox in 5 minutes. - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
  {
    id: "gianna_interested_3",
    classification: "interested",
    attemptNumber: 3,
    template: `{{first_name}}, look - I know you're busy. Email me back or just send your email here and I'll handle the rest. - Gianna`,
    variables: ["first_name"],
    nextAction: "escalate",
  },

  // ═══════════════════════════════════════════════════════════════
  // QUESTION RESPONSES - Sharp, confident, knows her stuff
  // ═══════════════════════════════════════════════════════════════
  {
    id: "gianna_question_1",
    classification: "question",
    attemptNumber: 1,
    template: `{{first_name}}, good question. Let me send you the full breakdown - it'll answer that and then some. Email? - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
  {
    id: "gianna_question_2",
    classification: "question",
    attemptNumber: 2,
    template: `{{first_name}}, I could type it all out but honestly the report explains it better. Just need your email - 2 seconds. - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
  {
    id: "gianna_question_3",
    classification: "question",
    attemptNumber: 3,
    template: `{{first_name}}, here's the deal - I want to help you but I need somewhere to send it. Email works best. - Gianna`,
    variables: ["first_name"],
    nextAction: "escalate",
  },

  // ═══════════════════════════════════════════════════════════════
  // EMAIL CAPTURE - AUTOMATIC RESPONSE (no human needed)
  // Recipient sends email → GIANNA confirms → Value X delivered
  // ═══════════════════════════════════════════════════════════════
  {
    id: "gianna_email_capture_1",
    classification: "email-capture",
    attemptNumber: 1,
    template: `Great {{first_name}}! I will have that {{value_content}} sent to you shortly. Have a great day! - Gianna`,
    variables: ["first_name", "value_content"],
    nextAction: "send_value_x",
  },

  // ═══════════════════════════════════════════════════════════════
  // ASSISTANCE REQUESTS - Helpful but direct
  // ═══════════════════════════════════════════════════════════════
  {
    id: "gianna_assistance_1",
    classification: "assistance",
    attemptNumber: 1,
    template: `{{first_name}}, I got you. Tell me what you need and I'll point you in the right direction. - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
  {
    id: "gianna_assistance_2",
    classification: "assistance",
    attemptNumber: 2,
    template: `{{first_name}}, easiest thing is for me to send you the full rundown. What's your email? - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
  {
    id: "gianna_assistance_3",
    classification: "assistance",
    attemptNumber: 3,
    template: `{{first_name}}, let's make this simple - email me back or drop your email here. I'll take care of the rest. - Gianna`,
    variables: ["first_name"],
    nextAction: "escalate",
  },

  // ═══════════════════════════════════════════════════════════════
  // CALLED BACK - High intent, move fast
  // ═══════════════════════════════════════════════════════════════
  {
    id: "gianna_callback_1",
    classification: "called-phone-line",
    attemptNumber: 1,
    template: `{{first_name}}, saw you called - appreciate that. Let me get you what you need. What's your email? - Gianna`,
    variables: ["first_name"],
    nextAction: "ask_for_email",
  },
];

// SABRINA's auto-response templates (booking focus)
export const SABRINA_AUTO_RESPONSE_TEMPLATES: AutoResponseTemplate[] = [
  {
    id: "sabrina_interested_1",
    classification: "interested",
    attemptNumber: 1,
    template: `Hi {{first_name}}! Great to hear from you. Would you have 15 mins this week for a quick call? I can work around your schedule. - Sabrina`,
    variables: ["first_name"],
    nextAction: "book_appointment",
  },
  {
    id: "sabrina_interested_2",
    classification: "interested",
    attemptNumber: 2,
    template: `{{first_name}}, just circling back - I'm flexible on timing. Morning, afternoon, or evening work best for you? - Sabrina`,
    variables: ["first_name"],
    nextAction: "book_appointment",
  },
  {
    id: "sabrina_interested_3",
    classification: "interested",
    attemptNumber: 3,
    template: `Hey {{first_name}}! Really want to connect with you. Here's my calendar link if easier: {{calendar_link}} - Sabrina`,
    variables: ["first_name", "calendar_link"],
    nextAction: "escalate",
  },
  // Objection handling (3 responses before backing off)
  {
    id: "sabrina_objection_1",
    classification: "objection",
    attemptNumber: 1,
    template: `Totally understand {{first_name}}. No pressure at all - just wanted to make sure you have the info when you're ready. - Sabrina`,
    variables: ["first_name"],
  },
  {
    id: "sabrina_objection_2",
    classification: "objection",
    attemptNumber: 2,
    template: `{{first_name}}, completely get it. Would it help to have a quick no-obligation call just to answer questions? 10 mins max. - Sabrina`,
    variables: ["first_name"],
    nextAction: "book_appointment",
  },
  {
    id: "sabrina_objection_3",
    classification: "objection",
    attemptNumber: 3,
    template: `No worries {{first_name}}! I'll check back another time. In the meantime, feel free to reach out if anything changes. - Sabrina`,
    variables: ["first_name"],
    nextAction: "escalate", // Back off after 3 objection responses
  },
];

// ==========================================
// CALENDAR BOOKING INTEGRATION
// Wire SABRINA into calendar system
// ==========================================

export interface CalendarSlot {
  slotId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  available: boolean;
  worker?: DigitalWorkerId;
}

export interface AppointmentRequest {
  leadId: string;
  firstName: string;
  phone: string;
  email?: string;
  requestedDate?: string;
  requestedTime?: string;
  preferredWindow?: "morning" | "afternoon" | "evening";
  appointmentType: "discovery" | "strategy" | "follow_up";
  worker: Exclude<DigitalWorkerId, "neva">;
  notes?: string;
}

export interface BookedAppointment {
  appointmentId: string;
  leadId: string;
  firstName: string;
  phone: string;
  email?: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  worker: DigitalWorkerId;
  calendarLink?: string;
  googleEventId?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  createdAt: string;
  createdBy: DigitalWorkerId;
  reminders: {
    sms24h: boolean;
    sms1h: boolean;
    email24h: boolean;
  };
}

/**
 * Generate appointment ID
 */
function generateAppointmentId(): string {
  return `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get available calendar slots for a date range
 */
export function getAvailableSlots(
  startDate: string,
  endDate: string,
  appointmentDuration: number = 30, // minutes
): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Default available hours (9 AM - 6 PM)
  const availableHours = [9, 10, 11, 13, 14, 15, 16, 17];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();

    // Skip weekends for now (could be configurable)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (const hour of availableHours) {
      const dateStr = d.toISOString().split("T")[0];
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endMinutes = hour * 60 + appointmentDuration;
      const endTime = `${Math.floor(endMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      slots.push({
        slotId: `slot_${dateStr}_${startTime}`,
        date: dateStr,
        startTime,
        endTime,
        available: true, // Would check against existing appointments in production
      });
    }
  }

  return slots;
}

/**
 * Book an appointment - triggered by SABRINA
 */
export function bookAppointment(
  request: AppointmentRequest,
): BookedAppointment {
  const appointmentId = generateAppointmentId();
  const now = new Date();

  // Default to next available slot if not specified
  const appointmentDate = request.requestedDate || getNextAvailableDate();
  const appointmentTime =
    request.requestedTime || getPreferredTimeSlot(request.preferredWindow);

  // Calculate end time (default 30 min appointments)
  const [hour, minute] = appointmentTime.split(":").map(Number);
  const endHour = minute + 30 >= 60 ? hour + 1 : hour;
  const endMinute = (minute + 30) % 60;
  const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

  const appointment: BookedAppointment = {
    appointmentId,
    leadId: request.leadId,
    firstName: request.firstName,
    phone: request.phone,
    email: request.email,
    date: appointmentDate,
    startTime: appointmentTime,
    endTime,
    appointmentType: request.appointmentType,
    worker: request.worker,
    status: "pending",
    createdAt: now.toISOString(),
    createdBy: request.worker,
    reminders: {
      sms24h: true,
      sms1h: true,
      email24h: !!request.email,
    },
  };

  console.log(`[Calendar] Appointment booked:`);
  console.log(`  Lead: ${request.firstName} (${request.phone})`);
  console.log(`  Date: ${appointmentDate} ${appointmentTime}`);
  console.log(`  Type: ${request.appointmentType}`);
  console.log(`  Worker: ${request.worker}`);

  return appointment;
}

/**
 * Get next available date (skips weekends)
 */
function getNextAvailableDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1); // Start from tomorrow

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
}

/**
 * Get preferred time slot based on window preference
 */
function getPreferredTimeSlot(
  window?: "morning" | "afternoon" | "evening",
): string {
  switch (window) {
    case "morning":
      return "10:00";
    case "afternoon":
      return "14:00";
    case "evening":
      return "17:00";
    default:
      return "10:00";
  }
}

// ==========================================
// AUTO-RESPONSE ENGINE
// Manages 3 templated responses before human alert
// ==========================================

export interface ConversationState {
  leadId: string;
  phone: string;
  firstName: string;
  worker: Exclude<DigitalWorkerId, "neva">;
  responseCount: number; // How many auto-responses sent
  lastClassification?: string;
  emailCaptured?: boolean;
  appointmentBooked?: boolean;
  escalatedToHuman: boolean;
  history: {
    timestamp: string;
    direction: "inbound" | "outbound";
    message: string;
    classification?: string;
    template?: string;
  }[];
}

// In-memory store (would be Redis/DB in production)
const conversationStates = new Map<string, ConversationState>();

/**
 * Get or create conversation state
 */
export function getConversationState(
  phone: string,
  leadId: string,
  firstName: string,
  worker: Exclude<DigitalWorkerId, "neva">,
): ConversationState {
  const key = `${phone}_${worker}`;

  if (!conversationStates.has(key)) {
    conversationStates.set(key, {
      leadId,
      phone,
      firstName,
      worker,
      responseCount: 0,
      escalatedToHuman: false,
      history: [],
    });
  }

  return conversationStates.get(key)!;
}

/**
 * Process inbound message and return auto-response (if within limit)
 */
export function processInboundMessage(
  phone: string,
  leadId: string,
  firstName: string,
  message: string,
  classification: string,
  worker: Exclude<DigitalWorkerId, "neva">,
): {
  autoResponse: string | null;
  shouldEscalate: boolean;
  action?: "send_value_x" | "book_appointment" | "escalate";
  conversationState: ConversationState;
} {
  const state = getConversationState(phone, leadId, firstName, worker);

  // Record inbound message
  state.history.push({
    timestamp: new Date().toISOString(),
    direction: "inbound",
    message,
    classification,
  });
  state.lastClassification = classification;

  // Already escalated? No auto-response
  if (state.escalatedToHuman) {
    return {
      autoResponse: null,
      shouldEscalate: false,
      conversationState: state,
    };
  }

  // Check if we're at the limit (3 auto-responses)
  if (state.responseCount >= 3) {
    state.escalatedToHuman = true;
    console.log(
      `[Auto-Response] Escalating ${phone} to human after 3 auto-responses`,
    );
    return {
      autoResponse: null,
      shouldEscalate: true,
      action: "escalate",
      conversationState: state,
    };
  }

  // Get appropriate template
  const templates =
    worker === "gianna"
      ? GIANNA_AUTO_RESPONSE_TEMPLATES
      : SABRINA_AUTO_RESPONSE_TEMPLATES;

  const attemptNumber = state.responseCount + 1;
  const template = templates.find(
    (t) =>
      t.classification === classification && t.attemptNumber === attemptNumber,
  );

  if (!template) {
    // No template for this classification/attempt - escalate
    console.log(
      `[Auto-Response] No template for ${classification} attempt #${attemptNumber} - escalating`,
    );
    state.escalatedToHuman = true;
    return {
      autoResponse: null,
      shouldEscalate: true,
      action: "escalate",
      conversationState: state,
    };
  }

  // Generate response from template
  let autoResponse = template.template;
  autoResponse = autoResponse.replace(/{{first_name}}/g, firstName);
  autoResponse = autoResponse.replace(
    /{{calendar_link}}/g,
    process.env.CALENDAR_URL || "https://calendly.com/your-team",
  );

  // Record outbound response
  state.history.push({
    timestamp: new Date().toISOString(),
    direction: "outbound",
    message: autoResponse,
    template: template.id,
  });
  state.responseCount++;

  // Check if we should escalate after this response
  const shouldEscalate =
    template.nextAction === "escalate" || state.responseCount >= 3;
  if (shouldEscalate) {
    state.escalatedToHuman = true;
  }

  console.log(
    `[Auto-Response] ${worker} response #${state.responseCount} to ${phone}: ${autoResponse.substring(0, 50)}...`,
  );

  return {
    autoResponse,
    shouldEscalate,
    action: template.nextAction,
    conversationState: state,
  };
}

/**
 * Mark email as captured for a conversation
 */
export function markEmailCaptured(
  phone: string,
  worker: Exclude<DigitalWorkerId, "neva">,
): void {
  const key = `${phone}_${worker}`;
  const state = conversationStates.get(key);
  if (state) {
    state.emailCaptured = true;
    console.log(`[Auto-Response] Email captured for ${phone}`);
  }
}

/**
 * Mark appointment as booked for a conversation
 */
export function markAppointmentBooked(
  phone: string,
  worker: Exclude<DigitalWorkerId, "neva">,
): void {
  const key = `${phone}_${worker}`;
  const state = conversationStates.get(key);
  if (state) {
    state.appointmentBooked = true;
    state.escalatedToHuman = true; // Hand off to human for appointment
    console.log(`[Auto-Response] Appointment booked for ${phone}`);
  }
}

/**
 * Get all conversations pending human review
 */
export function getEscalatedConversations(): ConversationState[] {
  return Array.from(conversationStates.values()).filter(
    (state) =>
      state.escalatedToHuman &&
      !state.emailCaptured &&
      !state.appointmentBooked,
  );
}

/**
 * Get conversations by worker
 */
export function getConversationsByWorker(
  worker: Exclude<DigitalWorkerId, "neva">,
): ConversationState[] {
  return Array.from(conversationStates.values()).filter(
    (state) => state.worker === worker,
  );
}

// ==========================================
// SCHEDULING HELPERS
// ==========================================

/**
 * Check if current time is within send window
 */
export function isWithinSendWindow(
  windows: TimeWindow[] = DEFAULT_SEND_WINDOWS,
): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  return windows.some(
    (w) =>
      w.daysOfWeek.includes(currentDay) &&
      currentHour >= w.startHour &&
      currentHour < w.endHour,
  );
}

/**
 * Get next available send time
 */
export function getNextSendTime(
  windows: TimeWindow[] = DEFAULT_SEND_WINDOWS,
): Date {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Sort by priority
  const sortedWindows = [...windows].sort((a, b) => b.priority - a.priority);

  // Check today first
  for (const window of sortedWindows) {
    if (
      window.daysOfWeek.includes(currentDay) &&
      currentHour < window.startHour
    ) {
      const nextTime = new Date(now);
      nextTime.setHours(window.startHour, 0, 0, 0);
      return nextTime;
    }
  }

  // Check future days
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDay = futureDate.getDay();

    for (const window of sortedWindows) {
      if (window.daysOfWeek.includes(futureDay)) {
        futureDate.setHours(window.startHour, 0, 0, 0);
        return futureDate;
      }
    }
  }

  // Fallback: tomorrow at 9 AM
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

/**
 * Schedule GIANNA outreach for optimal window
 */
export function scheduleGiannaOutreach(
  leadId: string,
  phone: string,
  firstName: string,
  message: string,
  preferredWindow?: TimeWindow,
): {
  scheduledFor: Date;
  window: TimeWindow;
  message: string;
} {
  const windows = preferredWindow ? [preferredWindow] : DEFAULT_SEND_WINDOWS;
  const scheduledFor = getNextSendTime(windows);
  const window =
    preferredWindow ||
    DEFAULT_SEND_WINDOWS.find((w) => w.startHour === scheduledFor.getHours()) ||
    DEFAULT_SEND_WINDOWS[0];

  console.log(
    `[GIANNA Scheduling] Outreach to ${firstName} (${phone}) scheduled for ${scheduledFor.toISOString()}`,
  );

  return {
    scheduledFor,
    window,
    message,
  };
}

// Log on import
console.log("[Scheduling Engine] Loaded with:");
console.log(`  - ${DEFAULT_SEND_WINDOWS.length} default send windows`);
console.log(
  `  - ${GIANNA_AUTO_RESPONSE_TEMPLATES.length} GIANNA auto-response templates`,
);
console.log(
  `  - ${SABRINA_AUTO_RESPONSE_TEMPLATES.length} SABRINA auto-response templates`,
);
console.log("  - Calendar booking integration ready");
