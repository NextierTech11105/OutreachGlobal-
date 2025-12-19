/**
 * ════════════════════════════════════════════════════════════════════════════════
 * CAMPAIGN WORKFLOW ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * LUCY fills up campaign buckets and auto-tags them. This engine manages:
 *
 * 1. BATCHED SKIP TRACING
 *    - 250 leads per batch
 *    - Up to 2,000 per campaign workflow
 *    - Rate-limited to respect API limits
 *
 * 2. CAMPAIGN WORKFLOWS
 *    - 2,000 Initial SMS (GIANNA)
 *    - 2,000 Initial Call (voice dialer)
 *    - Retarget flows triggered by staleness
 *    - Follow-up flows triggered by engagement
 *
 * 3. LIFECYCLE MANAGEMENT
 *    - Initial → Retarget (after X days no response)
 *    - Initial → Follow-up (after positive response)
 *    - Retarget → Nudger (after ghosting)
 *    - Follow-up → Book Appointment (after email capture)
 *
 * 4. AUTO-TAGGING (by LUCY)
 *    - acquisition-target, blue-collar, property-owner
 *    - high-equity, mature-ownership, exit-prep-timing
 *    - SMS-ready, call-ready, email-ready
 */

import { DigitalWorkerId } from "./digital-workers";

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export type CampaignChannel = "sms" | "call" | "email";
export type CampaignStage =
  | "initial"
  | "retarget"
  | "follow_up"
  | "book_appointment"
  | "nurture"
  | "nudger";
export type CampaignStatus =
  | "draft"
  | "staged"
  | "running"
  | "paused"
  | "completed";

export interface CampaignWorkflow {
  id: string;
  name: string;
  channel: CampaignChannel;
  stage: CampaignStage;
  status: CampaignStatus;
  worker: DigitalWorkerId;

  // Capacity
  maxLeads: number; // 2,000 default
  currentLeads: number;
  leadsSkipTraced: number;
  leadsReady: number; // Have phone/email for this channel

  // Batching
  batchSize: number; // 250 default
  batchesCompleted: number;
  batchesTotal: number;
  currentBatchStatus: "idle" | "processing" | "completed" | "failed";

  // Timing
  createdAt: string;
  lastBatchAt: string | null;
  scheduledAt: string | null;
  completedAt: string | null;

  // Tags (auto-applied by LUCY)
  autoTags: string[];
  tagFilters: string[];

  // Stats
  stats: {
    sent: number;
    delivered: number;
    responses: number;
    positive: number;
    optOuts: number;
    booked: number;
  };
}

export interface CampaignLead {
  id: string;
  workflowId: string;
  businessId: string;
  companyName: string;

  // Owner info
  ownerFirstName: string;
  ownerLastName: string;
  ownerFullName: string;

  // Contact info (from skip trace)
  phones: {
    number: string;
    type: "mobile" | "landline" | "voip" | "unknown";
    verified: boolean;
  }[];
  emails: { address: string; verified: boolean }[];
  mailingAddress: string | null;

  // Properties (from cross-reference)
  propertiesOwned: number;
  totalEquity: number | null;

  // Campaign state
  stage: CampaignStage;
  status:
    | "pending"
    | "skip_traced"
    | "ready"
    | "sent"
    | "responded"
    | "booked"
    | "opted_out"
    | "failed";
  attemptNumber: number;
  lastContactAt: string | null;
  nextContactAt: string | null;

  // Auto-tags
  autoTags: string[];
  score: number; // 0-100

  // Skip trace metadata
  skipTracedAt: string | null;
  skipTraceSource: "realestateapi" | "apollo" | "manual" | null;
  skipTraceStatus: "pending" | "completed" | "failed" | "skipped";
}

export interface SkipTraceBatch {
  id: string;
  workflowId: string;
  batchNumber: number;
  size: number;
  status: "pending" | "processing" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  results: {
    total: number;
    phonesFound: number;
    mobilePhones: number;
    emailsFound: number;
    propertiesFound: number;
    errors: number;
  };
  leadIds: string[];
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

export const WORKFLOW_DEFAULTS = {
  maxLeads: 2000,
  batchSize: 250,
  retargetAfterDays: 3,
  nudgerAfterDays: 7,
  maxAttempts: 5,
};

export const CHANNEL_REQUIREMENTS: Record<CampaignChannel, string[]> = {
  sms: ["mobile"], // Need mobile phone
  call: ["mobile", "landline"], // Any phone works
  email: ["email"], // Need email
};

export const STAGE_TO_WORKER: Record<CampaignStage, DigitalWorkerId> = {
  initial: "gianna",
  retarget: "gianna",
  follow_up: "sabrina",
  book_appointment: "sabrina",
  nurture: "gianna",
  nudger: "cathy",
};

// ════════════════════════════════════════════════════════════════════════════════
// WORKFLOW CREATION
// ════════════════════════════════════════════════════════════════════════════════

export function createCampaignWorkflow(
  name: string,
  channel: CampaignChannel,
  stage: CampaignStage,
  options?: {
    maxLeads?: number;
    batchSize?: number;
    tagFilters?: string[];
    scheduledAt?: string;
  },
): CampaignWorkflow {
  const maxLeads = options?.maxLeads || WORKFLOW_DEFAULTS.maxLeads;
  const batchSize = options?.batchSize || WORKFLOW_DEFAULTS.batchSize;

  return {
    id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    channel,
    stage,
    status: "draft",
    worker: STAGE_TO_WORKER[stage],

    maxLeads,
    currentLeads: 0,
    leadsSkipTraced: 0,
    leadsReady: 0,

    batchSize,
    batchesCompleted: 0,
    batchesTotal: Math.ceil(maxLeads / batchSize),
    currentBatchStatus: "idle",

    createdAt: new Date().toISOString(),
    lastBatchAt: null,
    scheduledAt: options?.scheduledAt || null,
    completedAt: null,

    autoTags: [],
    tagFilters: options?.tagFilters || [],

    stats: {
      sent: 0,
      delivered: 0,
      responses: 0,
      positive: 0,
      optOuts: 0,
      booked: 0,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// BATCH CREATION
// ════════════════════════════════════════════════════════════════════════════════

export function createSkipTraceBatch(
  workflowId: string,
  batchNumber: number,
  leadIds: string[],
): SkipTraceBatch {
  return {
    id: `batch_${Date.now()}_${batchNumber}`,
    workflowId,
    batchNumber,
    size: leadIds.length,
    status: "pending",
    startedAt: null,
    completedAt: null,
    results: {
      total: leadIds.length,
      phonesFound: 0,
      mobilePhones: 0,
      emailsFound: 0,
      propertiesFound: 0,
      errors: 0,
    },
    leadIds,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// LEAD SCORING & TAGGING (LUCY's Logic)
// ════════════════════════════════════════════════════════════════════════════════

export interface LeadScoringInput {
  sicCode?: string;
  employeeCount?: number;
  annualRevenue?: number;
  yearsInBusiness?: number;
  ownerIdentified: boolean;
  hasMobilePhone: boolean;
  hasEmail: boolean;
  propertiesOwned?: number;
  totalEquity?: number;
}

export function scoreLead(input: LeadScoringInput): {
  score: number;
  tags: string[];
} {
  let score = 0;
  const tags: string[] = [];

  // SIC code scoring (blue collar businesses)
  const blueCollarSIC = [
    "15",
    "16",
    "17",
    "07",
    "34",
    "35",
    "36",
    "37",
    "42",
    "75",
    "76",
  ];
  const sicPrefix = input.sicCode?.substring(0, 2) || "";

  if (blueCollarSIC.includes(sicPrefix)) {
    score += 15;
    tags.push("blue-collar");
  }

  // Revenue sweet spot ($500K - $10M)
  if (input.annualRevenue) {
    if (input.annualRevenue >= 500000 && input.annualRevenue <= 10000000) {
      score += 20;
      tags.push("sweet-spot-revenue");
      tags.push("acquisition-target");
    } else if (input.annualRevenue > 10000000) {
      score += 10;
      tags.push("enterprise");
    }
  }

  // Employee count (5-50 = acquisition sweet spot)
  if (input.employeeCount) {
    if (input.employeeCount >= 5 && input.employeeCount <= 50) {
      score += 15;
      tags.push("small-business");
    } else if (input.employeeCount > 50 && input.employeeCount <= 200) {
      score += 10;
      tags.push("mid-market");
    }
  }

  // Business maturity
  if (input.yearsInBusiness) {
    if (input.yearsInBusiness >= 20) {
      score += 15;
      tags.push("mature-ownership");
      tags.push("potential-exit");
    } else if (input.yearsInBusiness >= 5 && input.yearsInBusiness <= 15) {
      score += 10;
      tags.push("exit-prep-timing");
    }
  }

  // Contact quality
  if (input.ownerIdentified) {
    score += 10;
    tags.push("owner-identified");
  }
  if (input.hasMobilePhone) {
    score += 10;
    tags.push("sms-ready");
    tags.push("call-ready");
  }
  if (input.hasEmail) {
    score += 5;
    tags.push("email-ready");
  }

  // Property ownership (cross-reference)
  if (input.propertiesOwned && input.propertiesOwned > 0) {
    score += 10;
    tags.push("property-owner");
    if (input.propertiesOwned >= 3) {
      score += 5;
      tags.push("multi-property-owner");
    }
  }

  // High equity
  if (input.totalEquity && input.totalEquity > 100000) {
    score += 10;
    tags.push("high-equity");
  }

  return {
    score: Math.min(score, 100),
    tags,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// CHANNEL READINESS CHECK
// ════════════════════════════════════════════════════════════════════════════════

export function isReadyForChannel(
  lead: CampaignLead,
  channel: CampaignChannel,
): boolean {
  switch (channel) {
    case "sms":
      // Need at least one mobile phone
      return lead.phones.some((p) => p.type === "mobile");
    case "call":
      // Need any phone
      return lead.phones.length > 0;
    case "email":
      // Need at least one email
      return lead.emails.length > 0;
    default:
      return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// LIFECYCLE TRANSITIONS (triggered by staleness or advancement)
// ════════════════════════════════════════════════════════════════════════════════

export type LifecycleEvent =
  | "no_response" // No response after X days
  | "positive_response" // Positive engagement
  | "email_captured" // Email captured
  | "appointment_booked" // Appointment booked
  | "opted_out" // Opt-out received
  | "max_attempts"; // Max attempts reached

export interface LifecycleTransition {
  from: CampaignStage;
  event: LifecycleEvent;
  to: CampaignStage;
  newWorker: DigitalWorkerId;
  daysDelay?: number;
}

export const LIFECYCLE_TRANSITIONS: LifecycleTransition[] = [
  // Initial → Retarget (no response after 3 days)
  {
    from: "initial",
    event: "no_response",
    to: "retarget",
    newWorker: "gianna",
    daysDelay: 3,
  },
  // Initial → Follow-up (positive response)
  {
    from: "initial",
    event: "positive_response",
    to: "follow_up",
    newWorker: "sabrina",
  },
  // Initial → Follow-up (email captured)
  {
    from: "initial",
    event: "email_captured",
    to: "follow_up",
    newWorker: "sabrina",
  },
  // Retarget → Nudger (still no response after 7 days total)
  {
    from: "retarget",
    event: "no_response",
    to: "nudger",
    newWorker: "cathy",
    daysDelay: 4,
  },
  // Follow-up → Book Appointment (positive response)
  {
    from: "follow_up",
    event: "positive_response",
    to: "book_appointment",
    newWorker: "sabrina",
  },
  // Nudger → Nurture (after max attempts)
  {
    from: "nudger",
    event: "max_attempts",
    to: "nurture",
    newWorker: "gianna",
  },
];

export function getNextStage(
  currentStage: CampaignStage,
  event: LifecycleEvent,
): LifecycleTransition | null {
  return (
    LIFECYCLE_TRANSITIONS.find(
      (t) => t.from === currentStage && t.event === event,
    ) || null
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// CAMPAIGN TEMPLATES (pre-configured workflows)
// ════════════════════════════════════════════════════════════════════════════════

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  channel: CampaignChannel;
  stage: CampaignStage;
  tagFilters: string[];
  maxLeads: number;
  batchSize: number;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ═══════════════════════════════════════════════════════════════
  // SMS CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_initial_sms_acquisition",
    name: "Initial SMS - Acquisition Targets",
    description:
      "First touch SMS to blue-collar business owners in acquisition sweet spot",
    channel: "sms",
    stage: "initial",
    tagFilters: ["acquisition-target", "blue-collar", "sms-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },
  {
    id: "tpl_initial_sms_property",
    name: "Initial SMS - Property Owners",
    description: "First touch SMS to business owners who also own real estate",
    channel: "sms",
    stage: "initial",
    tagFilters: ["property-owner", "sms-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },
  {
    id: "tpl_retarget_sms",
    name: "Retarget SMS - Non-Responders",
    description:
      "Re-engagement SMS for leads who didn't respond to initial outreach",
    channel: "sms",
    stage: "retarget",
    tagFilters: ["sms-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },
  {
    id: "tpl_nudger_sms",
    name: "Nudger SMS - Ghost Revival",
    description: "CATHY's humor-based re-engagement for ghosted leads",
    channel: "sms",
    stage: "nudger",
    tagFilters: ["sms-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },

  // ═══════════════════════════════════════════════════════════════
  // CALL CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_initial_call_high_value",
    name: "Initial Call - High Value Leads",
    description: "Voice outreach for high-scoring leads (score 80+)",
    channel: "call",
    stage: "initial",
    tagFilters: ["call-ready", "acquisition-target"],
    maxLeads: 2000,
    batchSize: 250,
  },
  {
    id: "tpl_followup_call",
    name: "Follow-up Call - Post-Interest",
    description: "Voice follow-up for leads who showed interest via SMS/email",
    channel: "call",
    stage: "follow_up",
    tagFilters: ["call-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },
  {
    id: "tpl_booking_call",
    name: "Booking Call - Strategy Session",
    description: "SABRINA's appointment booking calls",
    channel: "call",
    stage: "book_appointment",
    tagFilters: ["call-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },

  // ═══════════════════════════════════════════════════════════════
  // EMAIL CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_nurture_email",
    name: "Nurture Email - Long-term",
    description: "Long-term email nurture for leads not ready to engage",
    channel: "email",
    stage: "nurture",
    tagFilters: ["email-ready"],
    maxLeads: 2000,
    batchSize: 250,
  },
];

export function getCampaignTemplate(
  templateId: string,
): CampaignTemplate | null {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === templateId) || null;
}

export function createWorkflowFromTemplate(
  template: CampaignTemplate,
  customName?: string,
): CampaignWorkflow {
  return createCampaignWorkflow(
    customName || template.name,
    template.channel,
    template.stage,
    {
      maxLeads: template.maxLeads,
      batchSize: template.batchSize,
      tagFilters: template.tagFilters,
    },
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// WORKFLOW SUMMARY (for LUCY dashboard)
// ════════════════════════════════════════════════════════════════════════════════

export interface WorkflowSummary {
  totalWorkflows: number;
  byChannel: Record<CampaignChannel, number>;
  byStage: Record<CampaignStage, number>;
  byStatus: Record<CampaignStatus, number>;
  totalLeadsStaged: number;
  totalLeadsReady: number;
  skipTraceProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export function summarizeWorkflows(
  workflows: CampaignWorkflow[],
): WorkflowSummary {
  const summary: WorkflowSummary = {
    totalWorkflows: workflows.length,
    byChannel: { sms: 0, call: 0, email: 0 },
    byStage: {
      initial: 0,
      retarget: 0,
      follow_up: 0,
      book_appointment: 0,
      nurture: 0,
      nudger: 0,
    },
    byStatus: { draft: 0, staged: 0, running: 0, paused: 0, completed: 0 },
    totalLeadsStaged: 0,
    totalLeadsReady: 0,
    skipTraceProgress: {
      completed: 0,
      total: 0,
      percentage: 0,
    },
  };

  for (const wf of workflows) {
    summary.byChannel[wf.channel]++;
    summary.byStage[wf.stage]++;
    summary.byStatus[wf.status]++;
    summary.totalLeadsStaged += wf.currentLeads;
    summary.totalLeadsReady += wf.leadsReady;
    summary.skipTraceProgress.completed += wf.leadsSkipTraced;
    summary.skipTraceProgress.total += wf.currentLeads;
  }

  if (summary.skipTraceProgress.total > 0) {
    summary.skipTraceProgress.percentage = Math.round(
      (summary.skipTraceProgress.completed / summary.skipTraceProgress.total) *
        100,
    );
  }

  return summary;
}

console.log(
  "[Campaign Workflow] Engine loaded - batched skip trace + lifecycle management",
);
console.log(
  "[Campaign Workflow] Templates available:",
  CAMPAIGN_TEMPLATES.length,
);
