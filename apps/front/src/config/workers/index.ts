/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEXTIER AI DIGITAL WORKERS - UNIFIED CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           AI WORKER LANES                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  LUCI (Data)      │  No Phone  │  Data Lake → Skip Trace → Lead ID         │
 * │  GIANNA (Outreach)│  Own Phone │  Initial SMS/Call + AI Inbound Response   │
 * │  CATHY (Nudging)  │  Own Phone │  Follow-ups/Nudges + AI Inbound Response  │
 * │  SABRINA (Booking)│  Own Phone │  Appointment Booking + Confirmations      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * CRITICAL RULES:
 * 1. Each worker has ISOLATED lane - no cross-contamination
 * 2. LUCI never touches phones - data scientist only
 * 3. GIANNA & CATHY have AI inbound response centers
 * 4. SABRINA handles booking confirmations only
 * 5. Phone numbers are mapped 1:1 to workers
 */

export type WorkerId = "luci" | "gianna" | "cathy" | "sabrina";

export type WorkerDomain =
  | "data" // LUCI - data lake, enrichment, lead prep
  | "outreach" // GIANNA - initial contact, first touch
  | "nudging" // CATHY - follow-ups, ghost revival
  | "booking"; // SABRINA - appointment setting, closing

export interface WorkerPhoneConfig {
  /** Does this worker have a dedicated phone number? */
  hasPhone: boolean;
  /** Environment variable for phone number */
  phoneEnvVar?: string;
  /** SignalHouse subgroup ID for routing */
  subgroupEnvVar?: string;
  /** Has AI-powered inbound response center? */
  hasInboundResponseCenter: boolean;
}

export interface WorkerConfig {
  id: WorkerId;
  name: string;
  domain: WorkerDomain;
  description: string;

  /** Phone/SMS configuration */
  phone: WorkerPhoneConfig;

  /** Primary responsibilities */
  responsibilities: string[];

  /** What triggers this worker */
  triggers: string[];

  /** What this worker outputs */
  outputs: string[];

  /** Workers this one hands off to */
  handoffTo: WorkerId[];

  /** Workers that hand off to this one */
  receivesFrom: WorkerId[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUCI - DATA COPILOT (NO PHONE - DATA ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

export const LUCI_CONFIG: WorkerConfig = {
  id: "luci",
  name: "LUCI",
  domain: "data",
  description:
    "Lead Understanding & Classification Intelligence - Data scientist that manages the lead pipeline from raw data to campaign-ready leads",

  phone: {
    hasPhone: false,
    hasInboundResponseCenter: false,
    // LUCI never touches phones - she's pure data
  },

  responsibilities: [
    "Import and classify USBizData records",
    "Execute skip trace enrichment (get mobiles, emails, socials)",
    "Apollo enrichment on-demand for company intel",
    "Cross-reference property ownership",
    "Assign Lead IDs to enriched records",
    "Score and prioritize leads",
    "Batch leads into campaign context buckets (2,000 per category)",
    "Push campaign-ready leads to worker queues",
  ],

  triggers: [
    "Daily scheduled scan of data lake",
    "Manual scan request from admin",
    "New CSV upload to data lake",
    "API call to /api/luci/scan",
  ],

  outputs: [
    "Enriched lead records with Lead IDs",
    "Campaign context buckets (initial, retarget, follow_up, etc.)",
    "Lead scores with reasoning",
    "Skip trace results (phones, emails, addresses)",
  ],

  handoffTo: ["gianna", "cathy", "sabrina"],
  receivesFrom: [], // LUCI is the source
};

// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA - OUTREACH COPILOT (OWN PHONE + AI INBOUND RESPONSE CENTER)
// ═══════════════════════════════════════════════════════════════════════════════

export const GIANNA_CONFIG: WorkerConfig = {
  id: "gianna",
  name: "GIANNA",
  domain: "outreach",
  description:
    "The Opener - Initial outreach specialist with AI-powered inbound response center",

  phone: {
    hasPhone: true,
    phoneEnvVar: "GIANNA_PHONE_NUMBER",
    subgroupEnvVar: "SIGNALHOUSE_GIANNA_SUBGROUP",
    hasInboundResponseCenter: true, // AI responds to inbound messages
  },

  responsibilities: [
    "Send initial SMS outreach",
    "Make initial phone calls",
    "Respond to inbound SMS via AI response center",
    "Capture email addresses (gateway to conversation)",
    "Build initial rapport",
    "Qualify interest level",
    "Route interested leads to SABRINA for booking",
    "Route non-responders to CATHY for nudging",
  ],

  triggers: [
    "LUCI pushes leads to 'initial' bucket",
    "Campaign scheduled execution",
    "Inbound SMS to GIANNA's phone number",
    "Inbound call to GIANNA's phone number",
  ],

  outputs: [
    "Initial outreach sent",
    "Lead status updates (interested, not_interested, no_response)",
    "Email captures",
    "Qualified leads for SABRINA",
    "Non-responders for CATHY",
  ],

  handoffTo: ["sabrina", "cathy"],
  receivesFrom: ["luci"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY - NUDGING COPILOT (OWN PHONE + AI INBOUND RESPONSE CENTER)
// ═══════════════════════════════════════════════════════════════════════════════

export const CATHY_CONFIG: WorkerConfig = {
  id: "cathy",
  name: "CATHY",
  domain: "nudging",
  description:
    "The Nudger - Follow-up specialist with humor-based ghost revival and AI inbound response center",

  phone: {
    hasPhone: true,
    phoneEnvVar: "CATHY_PHONE_NUMBER",
    subgroupEnvVar: "SIGNALHOUSE_CATHY_SUBGROUP",
    hasInboundResponseCenter: true, // AI responds to inbound messages
  },

  responsibilities: [
    "Send follow-up nudge messages",
    "Revive ghost leads with humor",
    "Respond to inbound SMS via AI response center",
    "Re-engage non-responders",
    "Keep leads warm",
    "Route revived leads back to GIANNA or SABRINA",
  ],

  triggers: [
    "GIANNA flags lead as non-responder",
    "LUCI pushes leads to 'retarget' or 'nudger' bucket",
    "Scheduled nudge timing (e.g., 3 days no response)",
    "Inbound SMS to CATHY's phone number",
  ],

  outputs: [
    "Nudge messages sent",
    "Revived leads (back in conversation)",
    "Final disposition (max attempts reached)",
  ],

  handoffTo: ["gianna", "sabrina"],
  receivesFrom: ["luci", "gianna"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SABRINA - BOOKING COPILOT (OWN PHONE - CONFIRMATIONS ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_CONFIG: WorkerConfig = {
  id: "sabrina",
  name: "SABRINA",
  domain: "booking",
  description:
    "The Closer - Appointment booking specialist handling objections and scheduling",

  phone: {
    hasPhone: true,
    phoneEnvVar: "SABRINA_PHONE_NUMBER",
    subgroupEnvVar: "SIGNALHOUSE_SABRINA_SUBGROUP",
    hasInboundResponseCenter: false, // Confirmations only, not full AI responses
  },

  responsibilities: [
    "Set appointments with qualified leads",
    "Handle objections (agree, overcome, close)",
    "Send appointment confirmations",
    "Send appointment reminders",
    "Reschedule requests",
    "Pivot to 'strategy session' or 'ideas discussion'",
  ],

  triggers: [
    "GIANNA qualifies lead as interested",
    "CATHY revives lead ready for booking",
    "LUCI pushes leads to 'book_appointment' bucket",
    "Lead requests callback or meeting",
  ],

  outputs: [
    "Booked appointments",
    "Appointment confirmations sent",
    "Reminder sequences",
    "Objection handling logs",
  ],

  handoffTo: [], // SABRINA is the final step before human handoff
  receivesFrom: ["luci", "gianna", "cathy"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const WORKERS: Record<WorkerId, WorkerConfig> = {
  luci: LUCI_CONFIG,
  gianna: GIANNA_CONFIG,
  cathy: CATHY_CONFIG,
  sabrina: SABRINA_CONFIG,
};

export const WORKER_LIST = Object.values(WORKERS);

/** Get worker config by ID */
export function getWorker(id: WorkerId): WorkerConfig {
  return WORKERS[id];
}

/** Get all workers with phone numbers */
export function getWorkersWithPhones(): WorkerConfig[] {
  return WORKER_LIST.filter((w) => w.phone.hasPhone);
}

/** Get all workers with AI inbound response centers */
export function getWorkersWithInboundCenter(): WorkerConfig[] {
  return WORKER_LIST.filter((w) => w.phone.hasInboundResponseCenter);
}

/** Get worker by phone number (for webhook routing) */
export function getWorkerByPhone(phoneNumber: string): WorkerConfig | null {
  const normalized = phoneNumber.replace(/\D/g, "");

  for (const worker of WORKER_LIST) {
    if (!worker.phone.hasPhone || !worker.phone.phoneEnvVar) continue;

    const workerPhone = process.env[worker.phone.phoneEnvVar];
    if (workerPhone && workerPhone.replace(/\D/g, "") === normalized) {
      return worker;
    }
  }

  return null;
}

/** Get the workflow path for a lead */
export function getWorkflowPath(startWorker: WorkerId): WorkerId[] {
  const path: WorkerId[] = [startWorker];
  let current = WORKERS[startWorker];

  // Follow the primary handoff chain
  while (current.handoffTo.length > 0) {
    const next = current.handoffTo[0];
    if (path.includes(next)) break; // Prevent cycles
    path.push(next);
    current = WORKERS[next];
  }

  return path;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHONE NUMBER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkerPhoneMapping {
  workerId: WorkerId;
  workerName: string;
  phoneNumber: string | null;
  subgroupId: string | null;
  hasInboundCenter: boolean;
}

/** Get all phone number mappings for deployment verification */
export function getPhoneMappings(): WorkerPhoneMapping[] {
  return WORKER_LIST.map((worker) => ({
    workerId: worker.id,
    workerName: worker.name,
    phoneNumber: worker.phone.phoneEnvVar
      ? process.env[worker.phone.phoneEnvVar] || null
      : null,
    subgroupId: worker.phone.subgroupEnvVar
      ? process.env[worker.phone.subgroupEnvVar] || null
      : null,
    hasInboundCenter: worker.phone.hasInboundResponseCenter,
  }));
}

/** Verify all required phone numbers are configured */
export function verifyPhoneConfiguration(): {
  valid: boolean;
  missing: string[];
  configured: string[];
} {
  const missing: string[] = [];
  const configured: string[] = [];

  for (const worker of getWorkersWithPhones()) {
    const phoneVar = worker.phone.phoneEnvVar!;
    const phone = process.env[phoneVar];

    if (!phone) {
      missing.push(`${worker.name}: ${phoneVar}`);
    } else {
      configured.push(`${worker.name}: ${phone}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    configured,
  };
}
