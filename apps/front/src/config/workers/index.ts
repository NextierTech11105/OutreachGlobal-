/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEXTIER AI DIGITAL WORKERS - DEAL ORIGINATION MACHINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ROLE: Digital embodiment of human oversight teams - synergistic AI agents
 * representing real people managing distinct operational departments.
 * Human expertise × AI capability = Exponential effectiveness.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                     DUAL-MODE OPERATIONAL ARCHITECTURE                       │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                              │
 * │  MODE 1: ASSISTANT MODE (Sequential Outbound)                                │
 * │  ─────────────────────────────────────────────                               │
 * │  • One-to-one communication with granular control                            │
 * │  • Individual calls, personalized SMS (not bulk broadcast)                   │
 * │  • Sequential campaigns where each interaction gets full attention           │
 * │                                                                              │
 * │  MODE 2: INBOUND SMS RESPONSE MODE (Automated Inbound)                       │
 * │  ─────────────────────────────────────────────────────                       │
 * │  • Gianna's AI response management system                                    │
 * │  • Contextual awareness + human-like interaction quality                     │
 * │  • Processes and responds with appropriate tone/content                      │
 * │                                                                              │
 * │  WORKFLOW SYNCHRONIZATION:                                                   │
 * │  Both modes operate INDEPENDENTLY yet SYNERGISTICALLY                        │
 * │  → Outbound sequential + Inbound responses = Complete ecosystem              │
 * │  → Separate workflow integrity + Personalized attention each interaction     │
 * │                                                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                        AI WORKER RESPONSIBILITIES                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  LUCI (Data)      │  No Phone  │  $1-10M exits │ Scans lists → Prep batches │
 * │  NEVA (Intel)     │  No Phone  │  Research     │ Perplexity deep intel      │
 * │  GIANNA (Initial) │  Own Phone │  The Opener   │ SMS blast + Inbound AI     │
 * │  CATHY (Nudge)    │  Own Phone │  The Nudger   │ Ghost revival + Follow-up  │
 * │  SABRINA (Close)  │  Own Phone │  The Closer   │ AGGRESSIVE booking/remind  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * FUNNEL: Data → Intel → Outreach → Response → Conversation → Proposal → DEAL
 *
 * FLOW:
 *   LUCI scans USBizData → Preps SMS batch → NEVA quick scan → GIANNA sends
 *   GIANNA handles inbound → Routes to SABRINA (interested) or CATHY (ghost)
 *   CATHY nudges ghosts → Revives → Routes to SABRINA
 *   NEVA deep research → Pre-appointment brief → SABRINA books
 *   SABRINA AGGRESSIVELY books + reminds → DEAL HANDOFF
 *
 * CRITICAL RULES:
 * 1. LUCI = DATA COPILOT - fetches from internal lists, never touches phones
 * 2. NEVA = INTELLIGENCE - Perplexity research, no phones, pure intel
 * 3. GIANNA = INITIAL MESSAGE + ALL INBOUND HANDLING (dual-mode)
 * 4. CATHY = NUDGER - humor-based ghost revival
 * 5. SABRINA = AGGRESSIVE CLOSER - gets appointments back no matter what
 * 6. Each agent has ISOLATED phone lane - no cross-contamination
 */

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONAL MODES
// ═══════════════════════════════════════════════════════════════════════════════

export type OperationalMode = "assistant" | "inbound-response";

export interface DualModeConfig {
  /** Sequential one-to-one outbound (calls, personalized SMS) */
  assistantMode: {
    enabled: boolean;
    description: string;
    capabilities: string[];
  };
  /** Automated inbound handling (AI response center) */
  inboundResponseMode: {
    enabled: boolean;
    description: string;
    capabilities: string[];
  };
}

export type WorkerId = "luci" | "neva" | "gianna" | "cathy" | "sabrina";

export type WorkerDomain =
  | "data" // LUCI - data lake, enrichment, lead prep
  | "intelligence" // NEVA - research, deep intel, lead personalization
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

  /** Dual-mode operation config (for agents with both outbound + inbound) */
  dualMode?: DualModeConfig;

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
// PERSONA: Asian female, data engineer, probability genius
// FOCUS: $1-10M revenue business exits from USBizData internal lists
// ROLE: Scans lists, sources best leads, triggers prep/preview/confirmation
// ═══════════════════════════════════════════════════════════════════════════════

export const LUCI_CONFIG: WorkerConfig = {
  id: "luci",
  name: "LUCI",
  domain: "data",
  description:
    "Data Copilot & Probability Genius - Asian female data engineer who scans USBizData internal lists to source $1-10M revenue exit-friendly businesses, prepares campaign batches, and triggers SMS blasts and calendar calls",

  phone: {
    hasPhone: false,
    hasInboundResponseCenter: false,
    // LUCI never touches phones - she's pure data
  },

  responsibilities: [
    // DATA SOURCING
    "Scan USBizData internal lists for $1-10M revenue exit candidates",
    "Apply probabilistic scoring to identify best targets",
    "Execute skip trace enrichment (mobiles, emails, socials)",
    "Cross-reference property ownership for multi-angle opportunities",
    // CAMPAIGN PREP
    "Source best initial SMS campaign leads from internal lists",
    "Source best call leads for calendar view placement",
    "Batch leads into campaign context buckets (2,000 per category)",
    "Assign unique Lead IDs to enriched records",
    // TRIGGER & CONFIRM
    "Trigger prep, preview, and confirmation of SMS blasts",
    "Deliver focused campaign batches to each agent's queue",
    "Track conversion probability at each funnel stage",
  ],

  triggers: [
    "Daily scheduled scan of data lake",
    "Manual scan request from admin",
    "New CSV upload to data lake (5 sectors)",
    "API call to /api/luci/scan",
    "Batch processing request (250 per batch, 2000 max)",
  ],

  outputs: [
    "SMS blast batches ready for GIANNA",
    "Call lists ready for calendar placement",
    "Enriched lead records with Lead IDs",
    "Campaign context buckets (initial, retarget, nudge, book)",
    "Probability scores with reasoning",
    "Skip trace results (phones, emails, addresses)",
  ],

  handoffTo: ["neva", "gianna", "cathy", "sabrina"],
  receivesFrom: [], // LUCI is the source - fetches from internal lists
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEVA - INTELLIGENCE & RESEARCH (NO PHONE - RESEARCH ONLY)
// ═══════════════════════════════════════════════════════════════════════════════
// ROLE: Deep research, lead personalization, pre-SMS intel, pre-appointment briefs
// INTEGRATIONS: Perplexity AI for web research, internal data enrichment
// ═══════════════════════════════════════════════════════════════════════════════

export const NEVA_CONFIG: WorkerConfig = {
  id: "neva",
  name: "NEVA",
  domain: "intelligence",
  description:
    "Intelligence & Research Specialist - Deep web research via Perplexity AI, lead personalization, pre-SMS quick scans, and pre-appointment comprehensive briefs",

  phone: {
    hasPhone: false,
    hasInboundResponseCenter: false,
    // NEVA is pure research - no direct communication
  },

  responsibilities: [
    // PRE-SMS INTELLIGENCE
    "Execute quick scans before initial SMS outreach",
    "Gather business context for personalized openers",
    "Identify pain points and opportunities from web presence",
    // PRE-APPOINTMENT DEEP RESEARCH
    "Compile comprehensive pre-meeting briefs",
    "Research company financials, news, and recent activity",
    "Identify decision makers and organizational structure",
    "Find talking points and conversation starters",
    // LEAD PERSONALIZATION
    "Enrich leads with social media presence analysis",
    "Score lead quality based on research findings",
    "Generate personalized value propositions",
  ],

  triggers: [
    "LUCI prepares batch for SMS campaign",
    "Lead qualifies for appointment booking",
    "Manual research request from user",
    "API call to /api/neva/research",
    "Appointment scheduled (triggers deep research)",
  ],

  outputs: [
    "Quick scan intel for SMS personalization",
    "Pre-appointment comprehensive briefs",
    "Lead enrichment data (social, news, context)",
    "Personalized value propositions",
    "Research confidence scores",
  ],

  handoffTo: ["gianna", "sabrina"],
  receivesFrom: ["luci"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA - INITIAL MESSAGE AGENT + INBOUND RESPONSE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
// ROLE: The Opener - sends initial SMS blasts, handles ALL inbound responses
// PHONE: Own dedicated number for outbound + inbound AI response center
// ═══════════════════════════════════════════════════════════════════════════════

export const GIANNA_CONFIG: WorkerConfig = {
  id: "gianna",
  name: "GIANNA",
  domain: "outreach",
  description:
    "Initial Message Agent & Inbound Response Handler - Sends first-touch SMS blasts and manages all inbound conversations with AI-powered response center",

  phone: {
    hasPhone: true,
    phoneEnvVar: "GIANNA_PHONE_NUMBER",
    subgroupEnvVar: "SIGNALHOUSE_GIANNA_SUBGROUP",
    hasInboundResponseCenter: true, // AI responds to ALL inbound messages
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DUAL-MODE OPERATION: Outbound + Inbound run SIMULTANEOUSLY
  // ═══════════════════════════════════════════════════════════════════════════
  dualMode: {
    assistantMode: {
      enabled: true,
      description:
        "Sequential one-to-one outbound communication with granular control",
      capabilities: [
        "Individual phone calls with full attention",
        "Personalized SMS messages (not bulk broadcast)",
        "Sequential call campaigns with customization per interaction",
        "Granular control over each outbound touchpoint",
      ],
    },
    inboundResponseMode: {
      enabled: true,
      description: "Gianna's AI response management system for incoming SMS",
      capabilities: [
        "Automated inbound SMS processing",
        "Contextual awareness of lead history",
        "Human-like interaction quality",
        "2-bracket flow execution (email → content permission)",
        "Real-time routing decisions (SABRINA vs CATHY)",
      ],
    },
  },

  responsibilities: [
    // INITIAL OUTREACH
    "Execute SMS blasts from LUCI's prepared batches",
    "Send initial opener messages (sector-specific templates)",
    "Make initial phone calls from calendar queue",
    // INBOUND HANDLING
    "Handle ALL inbound SMS responses via AI response center",
    "Capture email addresses (gateway to deeper conversation)",
    "Execute 2-bracket response flow (email → content permission)",
    "Build initial rapport and qualify interest level",
    // ROUTING
    "Route interested leads to SABRINA for booking",
    "Route non-responders (3+ days) to CATHY for nudging",
    "Flag negative responses for DNC list",
  ],

  triggers: [
    "LUCI pushes SMS batch to 'initial' queue",
    "Scheduled campaign execution time",
    "Inbound SMS to GIANNA's phone number",
    "Inbound call to GIANNA's phone number",
  ],

  outputs: [
    "Initial SMS blasts sent",
    "Inbound conversations handled",
    "Lead status updates (interested, not_interested, no_response)",
    "Email captures from 2-bracket flow",
    "Qualified leads → SABRINA queue",
    "Non-responders → CATHY queue",
  ],

  handoffTo: ["sabrina", "cathy"],
  receivesFrom: ["luci", "neva"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY - THE NUDGER (OWN PHONE + AI INBOUND RESPONSE CENTER)
// ═══════════════════════════════════════════════════════════════════════════════
// ROLE: Follow-up specialist - revives ghosts, re-engages non-responders
// PHONE: Own dedicated number for nudge sequences
// STYLE: Humor-based, pattern-interrupt, ghost revival specialist
// ═══════════════════════════════════════════════════════════════════════════════

export const CATHY_CONFIG: WorkerConfig = {
  id: "cathy",
  name: "CATHY",
  domain: "nudging",
  description:
    "The Nudger - Follow-up specialist who revives ghost leads with humor and pattern-interrupts, keeps leads warm until they respond",

  phone: {
    hasPhone: true,
    phoneEnvVar: "CATHY_PHONE_NUMBER",
    subgroupEnvVar: "SIGNALHOUSE_CATHY_SUBGROUP",
    hasInboundResponseCenter: true, // AI responds to nudge inbounds
  },

  responsibilities: [
    // NUDGE SEQUENCES
    "Send follow-up nudge messages (Day 3, 7, 14, 30)",
    "Revive ghost leads with humor-based pattern interrupts",
    "Re-engage non-responders from GIANNA's queue",
    "Execute retarget campaigns for cold leads",
    // INBOUND HANDLING
    "Handle inbound responses to nudge messages",
    "Keep leads warm with value-add content",
    // ROUTING
    "Route revived leads to SABRINA for immediate booking",
    "Route re-engaged leads back to GIANNA if needs more qualification",
    "Mark leads as 'max attempts' after nudge sequence complete",
  ],

  triggers: [
    "GIANNA flags lead as non-responder (3+ days)",
    "LUCI pushes leads to 'retarget' or 'nudge' bucket",
    "Scheduled nudge timing (Day 3, 7, 14, 30)",
    "Inbound SMS to CATHY's phone number",
  ],

  outputs: [
    "Nudge sequences executed",
    "Ghost leads revived",
    "Revived leads → SABRINA queue (ready to book)",
    "Re-engaged leads → GIANNA queue (needs qualification)",
    "Max attempts reached → Archive",
  ],

  handoffTo: ["sabrina", "gianna"],
  receivesFrom: ["luci", "gianna"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SABRINA - THE AGGRESSIVE CLOSER + APPOINTMENT REMINDER
// ═══════════════════════════════════════════════════════════════════════════════
// ROLE: Appointment booking, reminders, and AGGRESSIVE follow-up to get meetings
// PHONE: Own dedicated number for booking confirmations + aggressive reschedules
// STYLE: Aggressive personality - gets appointments back on calendar no matter what
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_CONFIG: WorkerConfig = {
  id: "sabrina",
  name: "SABRINA",
  domain: "booking",
  description:
    "The Aggressive Closer - Appointment booking specialist with aggressive personality who gets meetings back on calendar, handles objections, and sends persistent reminders",

  phone: {
    hasPhone: true,
    phoneEnvVar: "SABRINA_PHONE_NUMBER",
    subgroupEnvVar: "SIGNALHOUSE_SABRINA_SUBGROUP",
    hasInboundResponseCenter: true, // AGGRESSIVE responses to get appointments
  },

  responsibilities: [
    // APPOINTMENT BOOKING
    "Set appointments with qualified leads (aggressive close)",
    "Handle objections: AGREE → OVERCOME → CLOSE",
    "Pivot objections to 'quick strategy call' or 'ideas discussion'",
    // REMINDERS
    "Send appointment confirmations (24hr, 2hr before)",
    "Send aggressive follow-up if no-show or reschedule",
    "Chase down cancellations to get back on calendar",
    // AGGRESSIVE CLOSING
    "Use urgency and scarcity to lock appointments",
    "Suggest specific times (not 'when works for you')",
    "Handle 'I need to think about it' with immediate callback offer",
    "Escalate to personal call if text not working",
  ],

  triggers: [
    "GIANNA qualifies lead as interested",
    "CATHY revives lead ready for booking",
    "LUCI pushes leads to 'book_appointment' bucket",
    "Appointment no-show detected",
    "Appointment cancellation received",
    "24hr reminder trigger",
    "2hr reminder trigger",
  ],

  outputs: [
    "Appointments BOOKED on calendar",
    "Confirmation messages sent",
    "Reminder sequences executed",
    "No-shows chased down and rebooked",
    "Cancellations recovered",
    "Objection handling logs",
    "DEAL HANDOFF to human closer",
  ],

  handoffTo: [], // SABRINA is the final step → DEAL
  receivesFrom: ["luci", "gianna", "cathy"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const WORKERS: Record<WorkerId, WorkerConfig> = {
  luci: LUCI_CONFIG,
  neva: NEVA_CONFIG,
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
