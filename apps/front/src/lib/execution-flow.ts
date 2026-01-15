/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXECUTION FLOW - USBizData → Skip Trace → SMS → Inbound Response Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE COMPOUNDING INBOUND MACHINE
 *
 * PHILOSOPHY:
 * - Every SMS blast creates systematic curiosity
 * - Curiosity leads to engagement (response)
 * - Engagement leads to permission (email, opt-in)
 * - Permission compounds into pipeline
 * - Pipeline converts to meetings → deals
 *
 * FLOW:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                        DATA → ENRICH → DEPLOY → CAPTURE                     │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
 * │  │  USBizData   │───▶│ Lead Source  │───▶│  1K Blocks   │                  │
 * │  │   CSV File   │    │   Folders    │    │  (Batched)   │                  │
 * │  └──────────────┘    └──────────────┘    └──────────────┘                  │
 * │         │                   │                   │                           │
 * │         ▼                   ▼                   ▼                           │
 * │  ┌──────────────────────────────────────────────────────┐                  │
 * │  │              TRACERFY SKIP TRACE ($0.02/lead)        │                  │
 * │  │  • Mobiles (1-5)     • Emails (1-5)     • Addresses  │                  │
 * │  └──────────────────────────────────────────────────────┘                  │
 * │         │                                                                   │
 * │         ▼                                                                   │
 * │  ┌──────────────────────────────────────────────────────┐                  │
 * │  │              CONTACTABILITY FILTER                    │                  │
 * │  │  • Mobile = CONTACTABLE (SMS ready)                   │                  │
 * │  │  • Landline = NOT CONTACTABLE (skip)                  │                  │
 * │  │  • Email only = EMAIL NURTURE (secondary)             │                  │
 * │  └──────────────────────────────────────────────────────┘                  │
 * │         │                                                                   │
 * │         ▼                                                                   │
 * │  ┌──────────────────────────────────────────────────────┐                  │
 * │  │              SMS TEMPLATE MATCHING                    │                  │
 * │  │  • Sector → Template Group                            │                  │
 * │  │  • Intent → Stage (opener/nudge/value/close)          │                  │
 * │  │  • Auto-tags applied                                  │                  │
 * │  └──────────────────────────────────────────────────────┘                  │
 * │         │                                                                   │
 * │         ▼                                                                   │
 * │  ┌──────────────────────────────────────────────────────┐                  │
 * │  │              DEPLOY MODE                              │                  │
 * │  │  • BLAST: Immediate send all                          │                  │
 * │  │  • SCHEDULE: THE LOOP cadence timing                  │                  │
 * │  │  • IF/THEN: Conditional triggers                      │                  │
 * │  └──────────────────────────────────────────────────────┘                  │
 * │         │                                                                   │
 * │         ▼                                                                   │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
 * │  │   GIANNA     │───▶│    CATHY     │───▶│   SABRINA    │                  │
 * │  │   Opener     │    │   Nurturer   │    │    Closer    │                  │
 * │  │  (Day 1-7)   │    │  (Day 7-21)  │    │  (Day 21+)   │                  │
 * │  └──────────────┘    └──────────────┘    └──────────────┘                  │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * INBOUND RESPONSE ENGINE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                     RESPONSE → CLASSIFY → CAPTURE → CONVERT                 │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
 * │  │  SMS Reply   │───▶│  AI Classify │───▶│   Auto-Tag   │                  │
 * │  │   Webhook    │    │  Sentiment   │    │    Label     │                  │
 * │  └──────────────┘    └──────────────┘    └──────────────┘                  │
 * │         │                   │                   │                           │
 * │         ▼                   ▼                   ▼                           │
 * │  ┌─────────────────────────────────────────────────────────────────────┐   │
 * │  │                    CLASSIFICATION OUTCOMES                          │   │
 * │  ├─────────────────────────────────────────────────────────────────────┤   │
 * │  │  POSITIVE      → HOT label → SABRINA → Book meeting                 │   │
 * │  │  QUESTION      → WARM label → GIANNA → Answer + re-engage           │   │
 * │  │  NEUTRAL       → WARM label → CATHY → Value touch                   │   │
 * │  │  OBJECTION     → COLD label → CATHY → Overcome + nurture            │   │
 * │  │  NEGATIVE      → DNC label → Remove from campaign                   │   │
 * │  │  OPT_OUT       → STOP → Immediate removal + compliance              │   │
 * │  │  BOOKING_REQ   → HOT label → SABRINA → Send calendar link           │   │
 * │  └─────────────────────────────────────────────────────────────────────┘   │
 * │         │                                                                   │
 * │         ▼                                                                   │
 * │  ┌─────────────────────────────────────────────────────────────────────┐   │
 * │  │                    CAPTURE MECHANICS                                │   │
 * │  ├─────────────────────────────────────────────────────────────────────┤   │
 * │  │  Response contains email?  → CAPTURE EMAIL → Tag: email_verified    │   │
 * │  │  Response says "yes"?      → PERMISSION → Tag: opted_in             │   │
 * │  │  Response books meeting?   → APPOINTMENT → Tag: meeting_booked      │   │
 * │  │  Mobile confirmed working? → VERIFIED → Tag: mobile_verified        │   │
 * │  └─────────────────────────────────────────────────────────────────────┘   │
 * │         │                                                                   │
 * │         ▼                                                                   │
 * │  ┌─────────────────────────────────────────────────────────────────────┐   │
 * │  │                    COMPOUNDING EFFECTS                              │   │
 * │  ├─────────────────────────────────────────────────────────────────────┤   │
 * │  │  Curiosity Phase:   Initial SMS creates "who is this?" response    │   │
 * │  │  Engagement Phase:  Follow-up builds familiarity and trust         │   │
 * │  │  Permission Phase:  Engaged leads share email, book calls          │   │
 * │  │  Conversion Phase:  Meetings → Qualified → Deals                   │   │
 * │  └─────────────────────────────────────────────────────────────────────┘   │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { TracerfyClient, extractPhones, extractEmails } from "@/lib/tracerfy";
import {
  LEAD_SOURCE_FOLDERS,
  SMS_TEMPLATE_GROUPS,
  BATCH_CONFIG,
  LeadSourceBatch,
  SkipTraceBlock,
  getTemplatesByStage,
} from "@/config/lead-sources";
import { SIGNALHOUSE_10DLC, THE_LOOP } from "@/config/constants";
import { Logger } from "@/lib/logger";

const log = new Logger("ExecutionFlow");

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DeployMode = "BLAST" | "SCHEDULE" | "IF_THEN";

export interface ExecutionPipeline {
  id: string;
  batchId: string;
  folderId: string;
  sector: string;
  templateGroupId: string;
  deployMode: DeployMode;
  stages: PipelineStage[];
  status: "pending" | "running" | "completed" | "error";
  createdAt: Date;
  completedAt?: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  status: "pending" | "running" | "completed" | "error";
  stats: {
    processed: number;
    succeeded: number;
    failed: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface EnrichedLead {
  id: string;
  batchId: string;
  blockNumber: number;
  // Original data
  firstName: string;
  lastName: string;
  companyName: string;
  title?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  // Enriched data (from Tracerfy)
  mobiles: string[];
  primaryMobile?: string;
  emails: string[];
  primaryEmail?: string;
  // Status
  contactable: boolean;
  contactType: "mobile" | "landline" | "email_only" | "none";
  // Tags & Labels
  tags: string[];
  labels: string[];
  // Campaign status
  templateGroupId?: string;
  stage: "pending" | "enriched" | "filtered" | "prepped" | "deployed" | "engaged";
  smsStatus?: "pending" | "sent" | "delivered" | "responded";
  classification?: string;
}

export interface CaptureEvent {
  leadId: string;
  type: "email" | "mobile" | "permission" | "booking";
  value: string;
  source: "sms_response" | "form" | "calendar";
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1: BATCH TO BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

export function createBlocks(
  records: Record<string, string>[],
  batchId: string
): SkipTraceBlock[] {
  const blocks: SkipTraceBlock[] = [];
  const blockSize = BATCH_CONFIG.SKIP_TRACE_BLOCK_SIZE;
  const totalBlocks = Math.ceil(records.length / blockSize);

  for (let i = 0; i < totalBlocks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, records.length);

    blocks.push({
      id: `block_${batchId}_${i + 1}`,
      batchId,
      blockNumber: i + 1,
      size: end - start,
      status: "pending",
      mobileCount: 0,
      emailCount: 0,
    });
  }

  log.info("Created blocks", {
    batchId,
    totalRecords: records.length,
    blockCount: blocks.length,
    blockSize,
  });

  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2: TRACERFY SKIP TRACE
// ═══════════════════════════════════════════════════════════════════════════════

export async function skipTraceBlock(
  block: SkipTraceBlock,
  records: Record<string, string>[]
): Promise<{
  block: SkipTraceBlock;
  leads: EnrichedLead[];
  cost: number;
}> {
  const tracerfy = new TracerfyClient();

  // Prepare trace inputs
  const traceInputs = records.map((r) => ({
    first_name: r.firstName || r["First Name"] || "",
    last_name: r.lastName || r["Last Name"] || "",
    address: r.address || r["Street Address"] || r["Address"] || "",
    city: r.city || r["City"] || "",
    state: r.state || r["State"] || "",
    zip: r.zip || r["Zip Code"] || r["ZIP"] || "",
    mail_address: r.address || r["Street Address"] || r["Address"] || "",
    mail_city: r.city || r["City"] || "",
    mail_state: r.state || r["State"] || "",
    mailing_zip: r.zip || r["Zip Code"] || r["ZIP"] || "",
  }));

  log.info("Starting skip trace", {
    blockId: block.id,
    leadCount: traceInputs.length,
    estimatedCost: `$${(traceInputs.length * BATCH_CONFIG.COST_PER_TRACE).toFixed(2)}`,
  });

  // Start trace job
  const job = await tracerfy.beginTrace(traceInputs, "normal");
  log.info("Trace job started", { queueId: job.queue_id });

  // Wait for completion
  const queue = await tracerfy.waitForQueue(job.queue_id);

  if (!queue.download_url) {
    throw new Error("Trace job did not complete");
  }

  // Get results
  const results = await tracerfy.getQueueResults(queue.id);

  // Process results into enriched leads
  const leads: EnrichedLead[] = results.map((result, idx) => {
    const phones = extractPhones(result);
    const emails = extractEmails(result);
    const mobiles = phones.filter((p) => p.type === "Mobile").map((p) => p.number);
    const landlines = phones.filter((p) => p.type === "Landline").map((p) => p.number);

    // Determine contact type
    let contactType: EnrichedLead["contactType"] = "none";
    if (mobiles.length > 0) {
      contactType = "mobile";
    } else if (landlines.length > 0) {
      contactType = "landline";
    } else if (emails.length > 0) {
      contactType = "email_only";
    }

    return {
      id: `lead_${block.id}_${idx}`,
      batchId: block.batchId,
      blockNumber: block.blockNumber,
      firstName: result.first_name,
      lastName: result.last_name,
      companyName: records[idx]?.companyName || records[idx]?.["Company Name"] || "",
      title: records[idx]?.title || records[idx]?.["Title"] || "",
      address: result.address,
      city: result.city,
      state: result.state,
      zip: records[idx]?.zip || "",
      mobiles,
      primaryMobile: mobiles[0],
      emails,
      primaryEmail: emails[0],
      contactable: mobiles.length > 0,
      contactType,
      tags: ["skip_traced"],
      labels: mobiles.length > 0 ? ["mobile_verified"] : [],
      stage: "enriched",
    };
  });

  // Update block stats
  const updatedBlock: SkipTraceBlock = {
    ...block,
    status: "traced",
    tracedAt: new Date(),
    mobileCount: leads.filter((l) => l.contactable).length,
    emailCount: leads.filter((l) => l.primaryEmail).length,
  };

  const cost = traceInputs.length * BATCH_CONFIG.COST_PER_TRACE;

  log.info("Skip trace complete", {
    blockId: block.id,
    totalLeads: leads.length,
    withMobile: updatedBlock.mobileCount,
    withEmail: updatedBlock.emailCount,
    cost: `$${cost.toFixed(2)}`,
  });

  return { block: updatedBlock, leads, cost };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3: CONTACTABILITY FILTER
// ═══════════════════════════════════════════════════════════════════════════════

export function filterContactable(leads: EnrichedLead[]): {
  contactable: EnrichedLead[];
  emailOnly: EnrichedLead[];
  noContact: EnrichedLead[];
} {
  const contactable = leads.filter((l) => l.contactType === "mobile");
  const emailOnly = leads.filter((l) => l.contactType === "email_only");
  const noContact = leads.filter((l) => l.contactType === "none" || l.contactType === "landline");

  log.info("Contactability filter", {
    total: leads.length,
    contactable: contactable.length,
    emailOnly: emailOnly.length,
    noContact: noContact.length,
    contactableRate: `${Math.round((contactable.length / leads.length) * 100)}%`,
  });

  return { contactable, emailOnly, noContact };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 4: TEMPLATE MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

export function matchTemplate(
  lead: EnrichedLead,
  sector: string,
  stage: "opener" | "nudge" | "value" | "close" = "opener"
): {
  templateGroupId: string;
  template: string;
  charCount: number;
} | null {
  // Find template group for sector
  const group = Object.values(SMS_TEMPLATE_GROUPS).find(
    (g) => g.sector === sector && g.active
  );

  if (!group) {
    log.warn("No template group for sector", { sector });
    return null;
  }

  // Get templates for stage
  const templates = getTemplatesByStage(group.id, stage);
  if (templates.length === 0) {
    log.warn("No templates for stage", { groupId: group.id, stage });
    return null;
  }

  // Pick first template (could add rotation logic)
  const template = templates[0];

  // Replace variables
  let message = template.message;
  message = message.replace("{firstName}", lead.firstName);
  message = message.replace("{lastName}", lead.lastName);
  message = message.replace("{companyName}", lead.companyName);
  message = message.replace("{industry}", sector.replace(/-/g, " "));
  message = message.replace("{link}", process.env.CALENDLY_LINK || "calendly.com/nextier/strategy");

  return {
    templateGroupId: group.id,
    template: message,
    charCount: message.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 5: DEPLOY SMS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeployResult {
  leadId: string;
  phone: string;
  message: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}

export async function deployBatch(
  leads: EnrichedLead[],
  sector: string,
  mode: DeployMode,
  options: {
    dryRun?: boolean;
    stageOverride?: "opener" | "nudge" | "value" | "close";
    limit?: number;
  } = {}
): Promise<{
  results: DeployResult[];
  stats: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  };
}> {
  const { dryRun = false, stageOverride = "opener", limit } = options;
  const results: DeployResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const toProcess = limit ? leads.slice(0, limit) : leads;

  for (const lead of toProcess) {
    // Skip if no mobile
    if (!lead.primaryMobile) {
      skipped++;
      continue;
    }

    // Get template
    const matched = matchTemplate(lead, sector, stageOverride);
    if (!matched) {
      skipped++;
      continue;
    }

    if (dryRun) {
      results.push({
        leadId: lead.id,
        phone: lead.primaryMobile,
        message: matched.template,
        status: "sent",
        messageId: `dry_run_${Date.now()}`,
      });
      sent++;
      continue;
    }

    // Actually send via SignalHouse
    try {
      const response = await fetch("/api/signalhouse/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.primaryMobile,
          message: matched.template,
          campaignId: SIGNALHOUSE_10DLC.campaignId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          leadId: lead.id,
          phone: lead.primaryMobile,
          message: matched.template,
          status: "sent",
          messageId: data.messageId,
        });
        sent++;
      } else {
        const error = await response.text();
        results.push({
          leadId: lead.id,
          phone: lead.primaryMobile,
          message: matched.template,
          status: "failed",
          error,
        });
        failed++;
      }
    } catch (error) {
      results.push({
        leadId: lead.id,
        phone: lead.primaryMobile,
        message: matched.template,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      failed++;
    }

    // Rate limit: 1 SMS per second
    await new Promise((r) => setTimeout(r, 1000));
  }

  log.info("Deploy batch complete", {
    mode,
    dryRun,
    total: toProcess.length,
    sent,
    failed,
    skipped,
  });

  return {
    results,
    stats: {
      total: toProcess.length,
      sent,
      failed,
      skipped,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE CLASSIFICATION (for AI Copilot)
// ═══════════════════════════════════════════════════════════════════════════════

export type Classification =
  | "POSITIVE"
  | "QUESTION"
  | "NEUTRAL"
  | "OBJECTION"
  | "NEGATIVE"
  | "OPT_OUT"
  | "BOOKING_REQUEST";

export interface ClassificationResult {
  classification: Classification;
  confidence: number;
  nextAction: string;
  worker: "GIANNA" | "CATHY" | "SABRINA";
  label: string;
  autoTags: string[];
}

export function getClassificationAction(classification: Classification): ClassificationResult {
  const actions: Record<Classification, ClassificationResult> = {
    POSITIVE: {
      classification: "POSITIVE",
      confidence: 0.9,
      nextAction: "Escalate to SABRINA - book meeting",
      worker: "SABRINA",
      label: "hot",
      autoTags: ["engaged", "positive_response"],
    },
    QUESTION: {
      classification: "QUESTION",
      confidence: 0.85,
      nextAction: "GIANNA answers and re-engages",
      worker: "GIANNA",
      label: "warm",
      autoTags: ["engaged", "has_questions"],
    },
    NEUTRAL: {
      classification: "NEUTRAL",
      confidence: 0.7,
      nextAction: "CATHY sends value touch",
      worker: "CATHY",
      label: "warm",
      autoTags: ["responded", "needs_nurture"],
    },
    OBJECTION: {
      classification: "OBJECTION",
      confidence: 0.8,
      nextAction: "CATHY overcomes objection",
      worker: "CATHY",
      label: "cold",
      autoTags: ["objected", "needs_nurture"],
    },
    NEGATIVE: {
      classification: "NEGATIVE",
      confidence: 0.85,
      nextAction: "Remove from active campaign",
      worker: "CATHY",
      label: "dnc",
      autoTags: ["negative_response", "paused"],
    },
    OPT_OUT: {
      classification: "OPT_OUT",
      confidence: 1.0,
      nextAction: "Immediate removal - compliance",
      worker: "CATHY",
      label: "opted_out",
      autoTags: ["stop", "compliance"],
    },
    BOOKING_REQUEST: {
      classification: "BOOKING_REQUEST",
      confidence: 0.95,
      nextAction: "SABRINA sends calendar link",
      worker: "SABRINA",
      label: "hot",
      autoTags: ["engaged", "booking_requested", "high_intent"],
    },
  };

  return actions[classification];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPTURE MECHANICS
// ═══════════════════════════════════════════════════════════════════════════════

export function detectCaptures(message: string): CaptureEvent["type"][] {
  const captures: CaptureEvent["type"][] = [];

  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(message)) {
    captures.push("email");
  }

  // Permission patterns
  const permissionPatterns = [
    /\byes\b/i,
    /\bsure\b/i,
    /\bok\b/i,
    /\bsounds good\b/i,
    /\binterested\b/i,
    /\btell me more\b/i,
  ];
  if (permissionPatterns.some((p) => p.test(message))) {
    captures.push("permission");
  }

  // Booking patterns
  const bookingPatterns = [
    /\bbook\b/i,
    /\bschedule\b/i,
    /\bcalendar\b/i,
    /\bmeeting\b/i,
    /\bcall\b/i,
    /\bwhen.*available\b/i,
    /\bwhat time\b/i,
  ];
  if (bookingPatterns.some((p) => p.test(message))) {
    captures.push("booking");
  }

  return captures;
}

export function extractEmailFromMessage(message: string): string | null {
  const match = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function executePipeline(
  records: Record<string, string>[],
  config: {
    folderId: string;
    sector: string;
    templateGroupId?: string;
    deployMode: DeployMode;
    dryRun?: boolean;
  }
): Promise<{
  pipelineId: string;
  stages: PipelineStage[];
  results: {
    totalRecords: number;
    blocks: number;
    enriched: number;
    contactable: number;
    deployed: number;
    cost: number;
  };
}> {
  const pipelineId = `pipeline_${Date.now()}`;
  const stages: PipelineStage[] = [];

  log.info("Starting pipeline", { pipelineId, ...config });

  // Stage 1: Create blocks
  stages.push({
    id: "stage_blocks",
    name: "Create Blocks",
    order: 1,
    status: "running",
    stats: { processed: 0, succeeded: 0, failed: 0 },
    startedAt: new Date(),
  });

  const blocks = createBlocks(records, pipelineId);
  stages[0].status = "completed";
  stages[0].completedAt = new Date();
  stages[0].stats.processed = blocks.length;
  stages[0].stats.succeeded = blocks.length;

  // Stage 2: Skip trace (only first block for now)
  stages.push({
    id: "stage_trace",
    name: "Skip Trace",
    order: 2,
    status: "running",
    stats: { processed: 0, succeeded: 0, failed: 0 },
    startedAt: new Date(),
  });

  const firstBlockRecords = records.slice(0, BATCH_CONFIG.SKIP_TRACE_BLOCK_SIZE);
  const traceResult = await skipTraceBlock(blocks[0], firstBlockRecords);
  stages[1].status = "completed";
  stages[1].completedAt = new Date();
  stages[1].stats.processed = traceResult.leads.length;
  stages[1].stats.succeeded = traceResult.leads.filter((l) => l.contactable).length;

  // Stage 3: Filter
  stages.push({
    id: "stage_filter",
    name: "Contactability Filter",
    order: 3,
    status: "running",
    stats: { processed: 0, succeeded: 0, failed: 0 },
    startedAt: new Date(),
  });

  const filtered = filterContactable(traceResult.leads);
  stages[2].status = "completed";
  stages[2].completedAt = new Date();
  stages[2].stats.processed = traceResult.leads.length;
  stages[2].stats.succeeded = filtered.contactable.length;

  // Stage 4: Deploy
  stages.push({
    id: "stage_deploy",
    name: "Deploy SMS",
    order: 4,
    status: "running",
    stats: { processed: 0, succeeded: 0, failed: 0 },
    startedAt: new Date(),
  });

  const deployResult = await deployBatch(
    filtered.contactable,
    config.sector,
    config.deployMode,
    { dryRun: config.dryRun }
  );
  stages[3].status = "completed";
  stages[3].completedAt = new Date();
  stages[3].stats = {
    processed: deployResult.stats.total,
    succeeded: deployResult.stats.sent,
    failed: deployResult.stats.failed,
  };

  return {
    pipelineId,
    stages,
    results: {
      totalRecords: records.length,
      blocks: blocks.length,
      enriched: traceResult.leads.length,
      contactable: filtered.contactable.length,
      deployed: deployResult.stats.sent,
      cost: traceResult.cost,
    },
  };
}

console.log("[ExecutionFlow] Loaded - USBizData → Skip Trace → SMS → Inbound Engine");
