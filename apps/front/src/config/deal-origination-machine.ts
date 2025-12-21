/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEAL ORIGINATION MACHINE - The Big Picture
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A SYSTEMATIC RESPONSE MANUFACTURING MACHINE that:
 * 1. Turns DATA → CONVERSATION OF VALUE
 * 2. Turns CONVERSATION → PROPOSAL
 * 3. Turns PROPOSAL → DEAL
 *
 * It's a NUMBERS GAME with:
 * - Systematic data acquisition
 * - Probabilistic predictable events
 * - Tracking until END (closed won/lost)
 * - Multiplied with capabilities and capacity
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE PIPELINE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │                    DEAL ORIGINATION MACHINE                              │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │                                                                          │
 *   │  STAGE 1: DATA ACQUISITION (LUCI)                                        │
 *   │  ├── USBizData CSV Upload → DO Spaces                                    │
 *   │  ├── Skip Trace (RealEstateAPI) → Mobile/Email                           │
 *   │  ├── Twilio Validation → Verified Mobile                                 │
 *   │  └── Apollo Enrichment → Company Intel                                   │
 *   │           ↓                                                              │
 *   │  STAGE 2: LEAD ID ASSIGNMENT (LUCI)                                      │
 *   │  ├── Auto-tag by SIC code, revenue, employee count                       │
 *   │  ├── Score by acquisition criteria                                       │
 *   │  ├── Assign LeadID (trackable through pipeline)                          │
 *   │  └── Push to Campaign Buckets (2K per bucket)                            │
 *   │           ↓                                                              │
 *   │  STAGE 3: OUTREACH (GIANNA)                                              │
 *   │  ├── Initial SMS via SignalHouse                                         │
 *   │  ├── AI Inbound Response Center                                          │
 *   │  ├── Email capture (gateway)                                             │
 *   │  └── Qualify interest level                                              │
 *   │           ↓                                                              │
 *   │  STAGE 4: NURTURE (CATHY)                                                │
 *   │  ├── Follow-up nudges                                                    │
 *   │  ├── Ghost revival with humor                                            │
 *   │  ├── Re-engagement sequences                                             │
 *   │  └── Route back to GIANNA when revived                                   │
 *   │           ↓                                                              │
 *   │  STAGE 5: BOOKING (SABRINA)                                              │
 *   │  ├── Set appointments                                                    │
 *   │  ├── Handle objections (Straight Line)                                   │
 *   │  ├── Confirmations & reminders                                           │
 *   │  └── Pivot to strategy session                                           │
 *   │           ↓                                                              │
 *   │  STAGE 6: DEAL (Human + AI Assist)                                       │
 *   │  ├── Discovery → Qualification → Proposal → Negotiation                  │
 *   │  ├── Contract → Closing                                                  │
 *   │  └── Closed Won / Closed Lost                                            │
 *   │                                                                          │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  LUCI_CONFIG,
  GIANNA_CONFIG,
  CATHY_CONFIG,
  SABRINA_CONFIG,
  WorkerConfig,
} from "./workers";

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGES - The Funnel
// ═══════════════════════════════════════════════════════════════════════════════

export type PipelineStage =
  | "raw_data" // CSV in DO Spaces
  | "skip_traced" // Has mobile/email from skip trace
  | "validated" // Twilio verified mobile
  | "lead_assigned" // Has LeadID, tagged, scored
  | "campaign_queued" // In campaign bucket (2K max)
  | "outreach_sent" // Initial SMS sent
  | "response_received" // Prospect replied
  | "conversation" // In active dialogue
  | "meeting_booked" // Appointment set
  | "meeting_completed" // Met with prospect
  | "proposal_sent" // Sent proposal/offer
  | "negotiation" // In negotiations
  | "contract" // Contract stage
  | "closed_won" // DEAL DONE 🎉
  | "closed_lost" // Did not close
  | "nurture" // Not ready, keep warm
  | "dnc"; // Do Not Contact

export interface PipelineStageConfig {
  id: PipelineStage;
  name: string;
  description: string;
  owner: "luci" | "gianna" | "cathy" | "sabrina" | "human";
  nextStages: PipelineStage[];
  metrics: string[];
  automationLevel: "full" | "semi" | "manual";
}

export const PIPELINE_STAGES: Record<PipelineStage, PipelineStageConfig> = {
  raw_data: {
    id: "raw_data",
    name: "Raw Data",
    description: "CSV uploaded to DO Spaces, not yet processed",
    owner: "luci",
    nextStages: ["skip_traced"],
    metrics: ["total_rows", "valid_rows", "duplicate_rows"],
    automationLevel: "full",
  },
  skip_traced: {
    id: "skip_traced",
    name: "Skip Traced",
    description: "Owner contact info retrieved (mobile, email, address)",
    owner: "luci",
    nextStages: ["validated", "lead_assigned"],
    metrics: ["mobile_found", "email_found", "no_contact_found"],
    automationLevel: "full",
  },
  validated: {
    id: "validated",
    name: "Validated",
    description: "Mobile verified via Twilio Lookup (carrier type confirmed)",
    owner: "luci",
    nextStages: ["lead_assigned"],
    metrics: ["mobile_valid", "landline", "voip", "invalid"],
    automationLevel: "full",
  },
  lead_assigned: {
    id: "lead_assigned",
    name: "Lead Assigned",
    description: "LeadID created, tagged, scored, ready for campaign",
    owner: "luci",
    nextStages: ["campaign_queued"],
    metrics: [
      "high_priority",
      "medium_priority",
      "low_priority",
      "tags_applied",
    ],
    automationLevel: "full",
  },
  campaign_queued: {
    id: "campaign_queued",
    name: "Campaign Queued",
    description: "In campaign bucket (max 2K), awaiting execution",
    owner: "luci",
    nextStages: ["outreach_sent"],
    metrics: ["bucket_size", "scheduled_time", "campaign_type"],
    automationLevel: "semi",
  },
  outreach_sent: {
    id: "outreach_sent",
    name: "Outreach Sent",
    description: "Initial SMS sent via SignalHouse",
    owner: "gianna",
    nextStages: ["response_received", "nurture"],
    metrics: ["delivered", "failed", "pending"],
    automationLevel: "full",
  },
  response_received: {
    id: "response_received",
    name: "Response Received",
    description: "Prospect replied to outreach",
    owner: "gianna",
    nextStages: ["conversation", "meeting_booked", "dnc"],
    metrics: ["positive", "negative", "neutral", "opt_out"],
    automationLevel: "semi",
  },
  conversation: {
    id: "conversation",
    name: "In Conversation",
    description: "Active dialogue with prospect",
    owner: "gianna",
    nextStages: ["meeting_booked", "nurture", "dnc"],
    metrics: ["messages_exchanged", "duration_days", "sentiment"],
    automationLevel: "semi",
  },
  meeting_booked: {
    id: "meeting_booked",
    name: "Meeting Booked",
    description: "Appointment scheduled",
    owner: "sabrina",
    nextStages: ["meeting_completed", "nurture"],
    metrics: ["confirmed", "rescheduled", "no_show"],
    automationLevel: "semi",
  },
  meeting_completed: {
    id: "meeting_completed",
    name: "Meeting Completed",
    description: "Met with prospect, evaluating opportunity",
    owner: "human",
    nextStages: ["proposal_sent", "nurture", "closed_lost"],
    metrics: ["qualified", "not_qualified", "needs_follow_up"],
    automationLevel: "manual",
  },
  proposal_sent: {
    id: "proposal_sent",
    name: "Proposal Sent",
    description: "Sent formal proposal or offer",
    owner: "human",
    nextStages: ["negotiation", "closed_lost"],
    metrics: ["viewed", "not_viewed", "counter_received"],
    automationLevel: "manual",
  },
  negotiation: {
    id: "negotiation",
    name: "Negotiation",
    description: "In active negotiations",
    owner: "human",
    nextStages: ["contract", "closed_lost"],
    metrics: ["rounds", "price_change", "terms_change"],
    automationLevel: "manual",
  },
  contract: {
    id: "contract",
    name: "Contract",
    description: "Contract drafted or signed",
    owner: "human",
    nextStages: ["closed_won", "closed_lost"],
    metrics: ["drafted", "signed", "pending_signatures"],
    automationLevel: "manual",
  },
  closed_won: {
    id: "closed_won",
    name: "Closed Won",
    description: "DEAL DONE! 🎉",
    owner: "human",
    nextStages: [],
    metrics: ["deal_value", "commission", "time_to_close"],
    automationLevel: "manual",
  },
  closed_lost: {
    id: "closed_lost",
    name: "Closed Lost",
    description: "Did not close - log reason",
    owner: "human",
    nextStages: ["nurture"],
    metrics: ["reason", "reactivation_potential"],
    automationLevel: "manual",
  },
  nurture: {
    id: "nurture",
    name: "Nurture",
    description: "Not ready now, keep warm",
    owner: "cathy",
    nextStages: ["outreach_sent", "conversation"],
    metrics: ["nurture_attempts", "last_touch", "reactivation_date"],
    automationLevel: "semi",
  },
  dnc: {
    id: "dnc",
    name: "Do Not Contact",
    description: "Opted out or requested no contact",
    owner: "luci",
    nextStages: [],
    metrics: ["reason", "opt_out_date"],
    automationLevel: "full",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT ENVIRONMENTS - Who Owns What
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgentEnvironment {
  agent: WorkerConfig;
  stages: PipelineStage[];
  dataSources: string[];
  endpoints: string[];
  uiLocations: string[];
  responsibilities: string[];
}

export const AGENT_ENVIRONMENTS: Record<string, AgentEnvironment> = {
  luci: {
    agent: LUCI_CONFIG,
    stages: [
      "raw_data",
      "skip_traced",
      "validated",
      "lead_assigned",
      "campaign_queued",
      "dnc",
    ],
    dataSources: [
      "USBizData CSV (DO Spaces)",
      "RealEstateAPI (Skip Trace)",
      "Twilio Lookup (Validation)",
      "Apollo.io (B2B Enrichment)",
      "PostgreSQL (businesses, contacts, leads, properties)",
    ],
    endpoints: [
      "/api/luci/pipeline",
      "/api/luci/batch",
      "/api/luci/campaigns",
      "/api/luci/push-to-sms",
      "/api/luci/push-to-dialer",
      "/api/luci/orchestrate",
      "/api/ecbb/sectors",
      "/api/ecbb/pipeline",
      "/api/datalake/*",
    ],
    uiLocations: [
      "/t/[team]/data-hub",
      "/t/[team]/sectors",
      "/t/[team]/import",
      "/admin/b2b",
      "LuciDataAgent component",
      "DataLakeCopilot component",
    ],
    responsibilities: [
      "FETCH DATA FROM INTERNAL LISTS (USBizData sectors)",
      "Skip trace owners to get mobile/email",
      "Validate mobiles via Twilio",
      "Auto-tag and score leads",
      "Assign LeadIDs",
      "Batch process (250 at a time, pause at 2000)",
      "Push campaign-ready leads to worker queues",
    ],
  },
  gianna: {
    agent: GIANNA_CONFIG,
    stages: ["outreach_sent", "response_received", "conversation"],
    dataSources: [
      "SMS Queue (pending messages)",
      "SignalHouse (inbound/outbound)",
      "Lead Status Updates",
    ],
    endpoints: [
      "/api/sms/queue",
      "/api/sms/send",
      "/api/webhook/signalhouse",
      "/api/campaigns/*",
    ],
    uiLocations: [
      "/t/[team]/campaigns",
      "/t/[team]/inbox",
      "/t/[team]/sms-queue",
      "/t/[team]/instant-outreach",
    ],
    responsibilities: [
      "Send initial SMS outreach",
      "AI inbound response center",
      "Capture email addresses",
      "Qualify interest level",
      "Route to SABRINA for booking",
      "Route to CATHY for nudging",
    ],
  },
  cathy: {
    agent: CATHY_CONFIG,
    stages: ["nurture"],
    dataSources: [
      "Non-responder queue",
      "Ghost leads (no response 3+ days)",
      "Reactivation queue",
    ],
    endpoints: ["/api/sms/nudge", "/api/campaigns/followup"],
    uiLocations: ["/t/[team]/campaigns", "/t/[team]/inbox"],
    responsibilities: [
      "Send follow-up nudge messages",
      "Revive ghost leads with humor",
      "AI inbound response center",
      "Re-engage non-responders",
      "Route revived leads back",
    ],
  },
  sabrina: {
    agent: SABRINA_CONFIG,
    stages: ["meeting_booked"],
    dataSources: [
      "Qualified leads queue",
      "Booking requests",
      "Calendar availability",
    ],
    endpoints: ["/api/calendar/*", "/api/appointments/*"],
    uiLocations: ["/t/[team]/calendar", "/t/[team]/campaigns"],
    responsibilities: [
      "Set appointments with qualified leads",
      "Handle objections (Straight Line)",
      "Send appointment confirmations",
      "Send reminders",
      "Reschedule requests",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LUCI - THE DATA COPILOT FOR INTERNAL LISTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LUCI_DATA_COPILOT = {
  name: "LUCI",
  fullName: "Lead Understanding & Classification Intelligence",
  role: "DATA COPILOT FOR ALL INTERNAL LIST OPERATIONS",

  // LUCI is the ONLY agent that fetches from internal lists
  exclusiveCapabilities: [
    "Fetch data from USBizData sector CSVs",
    "Query PostgreSQL datalake tables",
    "List DO Spaces bucket contents",
    "Import CSV files to database",
    "Execute skip trace enrichment",
    "Run Twilio mobile validation",
    "Apollo B2B enrichment",
    "Create and assign LeadIDs",
    "Auto-tag based on SIC codes",
    "Score leads by criteria",
    "Batch processing (250/batch, 2000 pause)",
  ],

  // Sectors LUCI manages (ECBB focus)
  sectors: {
    "real-estate-agents": {
      sicCodes: ["6531", "6519"],
      folder: "datalake/business/us/sectors/real-estate-agents",
    },
    plumbing: {
      sicCodes: ["1711"],
      folder: "datalake/business/us/sectors/plumbing",
    },
    hvac: {
      sicCodes: ["1711", "5075"],
      folder: "datalake/business/us/sectors/hvac",
    },
    bakeries: {
      sicCodes: ["5461", "2051", "2052"],
      folder: "datalake/business/us/sectors/bakeries",
    },
    "rv-parks": {
      sicCodes: ["7033", "7011"],
      folder: "datalake/business/us/sectors/rv-parks",
    },
  },

  // Batch processing config
  batchConfig: {
    batchSize: 250, // Process 250 at a time
    pauseThreshold: 2000, // Pause after 2000 total
    pauseDurationMs: 5000, // 5 second pause between batches
    maxConcurrent: 1, // Only 1 batch at a time
  },

  // Handoff points to other agents
  handoffs: {
    toGianna: {
      trigger: "Lead has validated mobile + LeadID",
      bucket: "initial",
      maxPerBatch: 250,
    },
    toCathy: {
      trigger: "Lead marked as no_response after 3 days",
      bucket: "nudger",
      maxPerBatch: 100,
    },
    toSabrina: {
      trigger: "Lead marked as interested + email captured",
      bucket: "book_appointment",
      maxPerBatch: 50,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNNEL METRICS - Probabilistic Tracking
// ═══════════════════════════════════════════════════════════════════════════════

export interface FunnelMetrics {
  stage: PipelineStage;
  count: number;
  conversionRate: number; // % moving to next stage
  avgTimeInStage: number; // hours
  dropOffRate: number; // % that exit funnel here
}

export const EXPECTED_CONVERSION_RATES: Partial<Record<PipelineStage, number>> =
  {
    raw_data: 0.95, // 95% pass initial validation
    skip_traced: 0.6, // 60% yield mobile/email
    validated: 0.8, // 80% are valid mobiles
    lead_assigned: 0.98, // 98% get LeadID
    campaign_queued: 0.95, // 95% get sent
    outreach_sent: 0.85, // 85% delivered
    response_received: 0.05, // 5% respond (industry avg)
    conversation: 0.3, // 30% of responders convert to convo
    meeting_booked: 0.5, // 50% of convos book meeting
    meeting_completed: 0.8, // 80% show up
    proposal_sent: 0.4, // 40% of meetings get proposal
    negotiation: 0.6, // 60% of proposals negotiate
    contract: 0.7, // 70% of negotiations go to contract
    closed_won: 0.8, // 80% of contracts close
  };

// Calculate expected outcomes from X raw leads
export function calculateFunnelProjection(
  rawLeads: number,
): Record<PipelineStage, number> {
  const stages = Object.keys(PIPELINE_STAGES) as PipelineStage[];
  const projection: Record<PipelineStage, number> = {} as any;

  let current = rawLeads;
  for (const stage of stages) {
    projection[stage] = Math.floor(current);
    const rate = EXPECTED_CONVERSION_RATES[stage] || 1;
    current = current * rate;
  }

  return projection;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { LUCI_CONFIG, GIANNA_CONFIG, CATHY_CONFIG, SABRINA_CONFIG };

const DealOriginationMachine = {
  PIPELINE_STAGES,
  AGENT_ENVIRONMENTS,
  LUCI_DATA_COPILOT,
  EXPECTED_CONVERSION_RATES,
  calculateFunnelProjection,
};

export default DealOriginationMachine;
