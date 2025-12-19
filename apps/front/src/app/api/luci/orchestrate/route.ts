/**
 * LUCI Orchestrator - Batch Enrichment Pipeline
 *
 * FLOW:
 * 1. Process in BATCHES OF 250 records
 * 2. Build up to 2,000 LEAD BLOCK (enriched leads with Lead IDs)
 * 3. User then decides where to push the lead block:
 *    - Campaign context (drip sequences)
 *    - Instant outreach (immediate SMS/calls)
 *
 * This is the main entry point for batch enrichment.
 * Pushing is a SEPARATE action after enrichment completes.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";

// Import existing Gianna infrastructure - USE THESE, DON'T CREATE NEW ONES
import {
  OPENER_LIBRARY,
  REBUTTAL_LIBRARY,
  getBestOpeners,
} from "@/lib/gianna/knowledge-base/message-library";
import {
  CONVERSATION_FLOWS,
  classifyResponse,
  getFlowForResponse,
  INDUSTRY_OPENERS,
} from "@/lib/gianna/conversation-flows";
import {
  GIANNA_TEMPLATES,
  getGiannaPrompt,
} from "@/lib/gianna/knowledge-base/personality";

// Constants
const BATCH_SIZE = 250; // Process 250 at a time
const LEAD_BLOCK_SIZE = 2000; // Max leads per block
const RATE_LIMIT_DELAY = 500; // ms between batches

// Campaign context types - tracks attempt history and contact status
type CampaignContext =
  | "initial" // First outreach attempt
  | "retarget" // No contact made, trying again (auto-triggered)
  | "follow_up" // Contact made, following up
  | "book_appointment" // Scheduling an appointment
  | "confirm_appointment" // Confirming scheduled appointment
  | "nurture" // Long-term drip sequence
  | "ghost" // Was engaged, went silent
  | "scheduled" // Scheduled for future
  | "instant"; // Immediate outreach

interface CampaignAttemptInfo {
  attemptNumber: number; // 1, 2, 3... (retarget_1, retarget_2, etc.)
  previousAttempts: number; // Total attempts so far
  contactMade: boolean; // Has contact been established?
  lastAttemptDate?: string; // When was last attempt
  lastResponseDate?: string; // When did they last respond (if ever)
  autoRetarget?: boolean; // Should auto-queue for retarget if no response?
}

interface OrchestrateRequest {
  bucketId: string;
  action: "enrich" | "push"; // Separate actions
  // For enrich action:
  batchNumber?: number; // Which batch to process (0-indexed)
  enrichmentTypes?: ("skip_trace" | "apollo" | "property")[];
  filters?: {
    hasAddress?: boolean;
    missingPhone?: boolean;
    sicCodes?: string[];
    states?: string[];
    unenrichedOnly?: boolean;
  };
  // For push action:
  leadBlockId?: string;
  pushTo?: "sms" | "dialer" | "both";
  mode?: "draft" | "immediate";
  templateMessage?: string;
  templateCategory?: "blue_collar" | "property" | "business" | "general";
  agent?: "gianna" | "sabrina";
  campaignName?: string;
  // Campaign context - tracks attempts and contact status
  campaignContext?: CampaignContext;
  attemptInfo?: CampaignAttemptInfo;
}

interface PhoneWithType {
  number: string;
  type?: string;
}

interface LeadRecord {
  id: string;
  uploadId?: string;
  companyName?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  sicCode?: string;
  enriched?: boolean;
  enrichedPhones?: PhoneWithType[];
  mobilePhone?: string;
  _original?: Record<string, unknown>;
}

// Auto-retarget configuration - uses LEARNING_CONFIG from message-library.ts
const RETARGET_CONFIG = {
  defaultThreshold: 3, // Default: auto-retarget after 3 no-contact attempts
  maxRetargets: 5, // Max retarget attempts before moving to nurture
  retargetDelayHours: 48, // Wait 48 hours between retargets
  requireHumanApproval: true, // Human-in-the-loop for Gianna co-pilot (matches LEARNING_CONFIG.human_in_loop)
};

/**
 * Template Selection - USE EXISTING GIANNA LIBRARY
 *
 * DO NOT HARDCODE TEMPLATES HERE
 * Use the existing infrastructure:
 * - OPENER_LIBRARY (property, business, general, ny_direct)
 * - CONVERSATION_FLOWS (ghost_day_3, ghost_day_7, ghost_final, etc.)
 * - GIANNA_TEMPLATES (sms, email, voicemail)
 * - INDUSTRY_OPENERS (restaurant, healthcare, construction, etc.)
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: OrchestrateRequest = await request.json();
    const { action, bucketId } = body;

    if (!bucketId) {
      return NextResponse.json(
        { error: "bucketId is required" },
        { status: 400 },
      );
    }

    // Route to appropriate handler based on action
    if (action === "enrich") {
      return handleEnrichAction(request, body, teamId);
    } else if (action === "push") {
      return handlePushAction(request, body, teamId);
    }

    // Legacy: if no action specified, return error
    return NextResponse.json(
      { error: "action is required: 'enrich' or 'push'" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[LUCI Orchestrate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 },
    );
  }
}

/**
 * ENRICH ACTION
 * Process a single batch of 250 records
 * Client calls this repeatedly until all batches processed
 * Returns progress info so client can continue or complete
 */
async function handleEnrichAction(
  request: NextRequest,
  body: OrchestrateRequest,
  teamId: string | null,
): Promise<NextResponse> {
  const {
    bucketId,
    batchNumber = 0,
    enrichmentTypes = ["skip_trace"],
    filters = {},
  } = body;

  console.log(
    `[LUCI Orchestrate] ENRICH batch ${batchNumber} for bucket: ${bucketId}`,
  );

  // STEP 1: Get ALL leads from bucket to calculate totals
  const bucketResponse = await fetch(
    `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/buckets/${bucketId}`,
    { headers: { Cookie: request.headers.get("cookie") || "" } },
  );
  const bucketData = await bucketResponse.json();

  if (bucketData.error) {
    return NextResponse.json(
      { error: `Failed to fetch bucket: ${bucketData.error}` },
      { status: 400 },
    );
  }

  let allLeads: LeadRecord[] =
    bucketData.records || bucketData.properties || [];

  // Apply filters first
  if (filters.hasAddress) {
    allLeads = allLeads.filter((l) => l.address && l.city && l.state);
  }
  if (filters.missingPhone) {
    allLeads = allLeads.filter((l) => !l.phone && !l.mobilePhone);
  }
  if (filters.sicCodes?.length) {
    allLeads = allLeads.filter((l) =>
      filters.sicCodes!.some((sic) => l.sicCode?.startsWith(sic)),
    );
  }
  if (filters.states?.length) {
    allLeads = allLeads.filter((l) =>
      filters.states!.includes(l.state?.toUpperCase() || ""),
    );
  }
  if (filters.unenrichedOnly) {
    allLeads = allLeads.filter((l) => !l.enriched);
  }

  const totalLeads = allLeads.length;
  const totalBatches = Math.ceil(totalLeads / BATCH_SIZE);

  // Check if we've hit the lead block limit
  const maxBatchesForBlock = Math.ceil(LEAD_BLOCK_SIZE / BATCH_SIZE); // 8 batches for 2000 leads
  const effectiveTotalBatches = Math.min(totalBatches, maxBatchesForBlock);

  if (batchNumber >= effectiveTotalBatches) {
    return NextResponse.json({
      success: true,
      complete: true,
      message: "Lead block complete - all batches processed",
      leadBlockId: `lb_${bucketId}_${Date.now()}`,
      stats: {
        totalLeads: Math.min(totalLeads, LEAD_BLOCK_SIZE),
        batchesProcessed: effectiveTotalBatches,
        readyForPush: true,
      },
    });
  }

  // Get THIS batch (250 records)
  const batchStart = batchNumber * BATCH_SIZE;
  const batchEnd = Math.min(
    batchStart + BATCH_SIZE,
    totalLeads,
    LEAD_BLOCK_SIZE,
  );
  const batchLeads = allLeads.slice(batchStart, batchEnd);

  console.log(
    `[LUCI Orchestrate] Processing batch ${batchNumber + 1}/${effectiveTotalBatches}: records ${batchStart}-${batchEnd}`,
  );

  // STEP 2: Enrich THIS BATCH ONLY
  const enrichmentResults = {
    skipTraced: 0,
    apolloEnriched: 0,
    failed: 0,
  };

  const enrichedLeads: Array<
    LeadRecord & {
      leadId?: string;
      enrichedPhones?: PhoneWithType[];
      enrichedEmails?: string[];
      mobilePhone?: string;
      socials?: Record<string, string | null>;
    }
  > = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK SKIP TRACE - Process entire batch in one API call
  // ═══════════════════════════════════════════════════════════════════════════
  if (enrichmentTypes.includes("skip_trace")) {
    // Filter leads that have address data for skip tracing
    const skipTraceableLeads = batchLeads.filter(
      (lead) => lead.address && lead.city && lead.state,
    );

    if (skipTraceableLeads.length > 0) {
      console.log(
        `[LUCI Orchestrate] Bulk skip tracing ${skipTraceableLeads.length} leads`,
      );

      try {
        // Build bulk skip trace payload
        const bulkPayload = {
          leads: skipTraceableLeads.map((lead) => ({
            id: lead.id,
            firstName: lead.firstName || lead.contactName?.split(" ")[0] || "",
            lastName:
              lead.lastName ||
              lead.contactName?.split(" ").slice(1).join(" ") ||
              "",
            companyName: lead.companyName,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
          })),
          batchId: `batch_${batchNumber}_${Date.now()}`,
          teamId: teamId,
          // Webhook for async completion (optional - can also poll)
          webhookUrl: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/webhook/skip-trace`,
        };

        const bulkSkipTraceResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/enrichment/bulk-skip-trace`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify(bulkPayload),
          },
        );

        const bulkResult = await bulkSkipTraceResponse.json();

        if (bulkResult.success) {
          if (bulkResult.mode === "sync" && bulkResult.results) {
            // Synchronous results - process immediately
            for (const result of bulkResult.results) {
              if (result.success) {
                enrichmentResults.skipTraced++;
                // Find and update the lead in our batch
                const leadIndex = batchLeads.findIndex(
                  (l) => l.id === result.id,
                );
                if (leadIndex >= 0) {
                  const mobilePhone = result.phones?.find(
                    (p: { isMobile: boolean }) => p.isMobile,
                  );
                  batchLeads[leadIndex] = {
                    ...batchLeads[leadIndex],
                    leadId: result.leadId,
                    enrichedPhones: result.phones,
                    enrichedEmails: result.emails?.map(
                      (e: { email: string }) => e.email,
                    ),
                    mobilePhone:
                      mobilePhone?.number || result.phones?.[0]?.number,
                    socials: result.socials,
                    enriched: true,
                  } as (typeof batchLeads)[0];
                }
              } else {
                enrichmentResults.failed++;
              }
            }
          } else {
            // Async mode - job submitted, will be processed via webhook
            console.log(
              `[LUCI Orchestrate] Bulk skip trace job submitted: ${bulkResult.jobId}`,
            );
            // Mark as pending - webhook will update when complete
            enrichmentResults.skipTraced = skipTraceableLeads.length; // Optimistic
          }
        } else {
          console.error(
            `[LUCI Orchestrate] Bulk skip trace failed:`,
            bulkResult.error,
          );
          enrichmentResults.failed += skipTraceableLeads.length;
        }
      } catch (error) {
        console.error(`[LUCI Orchestrate] Bulk skip trace error:`, error);
        enrichmentResults.failed += skipTraceableLeads.length;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APOLLO ENRICHMENT - Still done per-lead (they don't have bulk)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const lead of batchLeads) {
    let enrichedLead: (typeof enrichedLeads)[0] = { ...lead };

    // Apollo enrichment (no bulk API available)
    if (
      enrichmentTypes.includes("apollo") &&
      (lead.email || (lead.contactName && lead.companyName))
    ) {
      try {
        const apolloResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/enrichment/apollo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              recordId: lead.id,
              bucketId,
              email: lead.email,
              firstName: lead.firstName || lead.contactName?.split(" ")[0],
              lastName:
                lead.lastName ||
                lead.contactName?.split(" ").slice(1).join(" "),
              companyName: lead.companyName,
            }),
          },
        );

        const apolloData = await apolloResponse.json();
        if (apolloData.success && apolloData.enrichedData) {
          enrichmentResults.apolloEnriched++;
          enrichedLead = {
            ...enrichedLead,
            enriched: true,
          };
        }
      } catch (error) {
        console.error(
          `[LUCI Orchestrate] Apollo enrichment failed for ${lead.id}:`,
          error,
        );
      }

      // Rate limit between Apollo calls
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    enrichedLeads.push(enrichedLead);
  }

  console.log(
    `[LUCI Orchestrate] Batch ${batchNumber + 1} complete:`,
    enrichmentResults,
  );

  // Return batch results with progress info
  const isLastBatch = batchNumber + 1 >= effectiveTotalBatches;

  return NextResponse.json({
    success: true,
    complete: isLastBatch,
    batch: {
      number: batchNumber,
      size: batchLeads.length,
      enriched: enrichmentResults.skipTraced + enrichmentResults.apolloEnriched,
      failed: enrichmentResults.failed,
    },
    progress: {
      currentBatch: batchNumber + 1,
      totalBatches: effectiveTotalBatches,
      recordsProcessed: batchEnd,
      totalRecords: Math.min(totalLeads, LEAD_BLOCK_SIZE),
      percentComplete: Math.round(
        (batchEnd / Math.min(totalLeads, LEAD_BLOCK_SIZE)) * 100,
      ),
    },
    // Include enriched leads from this batch for client-side aggregation
    enrichedLeads: enrichedLeads.filter((l) => l.leadId),
    nextBatch: isLastBatch ? null : batchNumber + 1,
    leadBlockId: isLastBatch ? `lb_${bucketId}_${Date.now()}` : null,
  });
}

/**
 * Log campaign attempt for tracking and analytics
 * All attempts MUST be logged for compliance and performance tracking
 */
interface AttemptLog {
  leadId: string;
  campaignContext: CampaignContext;
  attemptNumber: number;
  timestamp: string;
  channel: "sms" | "dialer" | "email";
  templateUsed: string;
  status: "queued" | "sent" | "delivered" | "failed";
  contactMade: boolean;
  response?: string;
}

async function logAttempt(
  request: NextRequest,
  log: AttemptLog,
): Promise<void> {
  console.log(
    `[LUCI Attempt Log] ${log.campaignContext} #${log.attemptNumber} for ${log.leadId}: ${log.status}`,
  );

  // TODO: Store in database for tracking
  // This creates an audit trail for:
  // - Compliance (TCPA, opt-out tracking)
  // - Performance metrics (response rates by context)
  // - Auto-retarget triggering (no contact after threshold)
  // - Calendar sync (appointments)

  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/leads/attempt-log`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify(log),
      },
    );
  } catch (error) {
    // Log but don't fail the operation
    console.error(`[LUCI Attempt Log] Failed to persist log:`, error);
  }
}

/**
 * Select the appropriate template based on campaign context
 * USES EXISTING GIANNA LIBRARY - DO NOT HARDCODE TEMPLATES
 */
function selectTemplate(
  campaignContext: CampaignContext | undefined,
  attemptInfo: CampaignAttemptInfo | undefined,
  templateCategory: string,
  customTemplate?: string,
  leadContext?: {
    firstName?: string;
    companyName?: string;
    industry?: string;
    city?: string;
  },
): string {
  // Custom template always wins
  if (customTemplate) return customTemplate;

  // Map category to OPENER_LIBRARY key
  const categoryMap: Record<string, keyof typeof OPENER_LIBRARY> = {
    property: "property",
    real_estate: "property",
    blue_collar: "business",
    business: "business",
    general: "general",
    ny_direct: "ny_direct",
  };
  const libraryKey = categoryMap[templateCategory] || "general";

  // Select based on campaign context - use existing Gianna flows
  switch (campaignContext) {
    case "retarget": {
      // Use ghost flows based on attempt number (ghost_day_3, ghost_day_7, ghost_final)
      const ghostFlows = ["ghost_day_3", "ghost_day_7", "ghost_final"];
      const flowIndex = Math.min((attemptInfo?.attemptNumber || 1) - 1, 2);
      const flow = CONVERSATION_FLOWS[ghostFlows[flowIndex]];
      if (flow?.steps?.[0]?.message) {
        return flow.steps[0].message;
      }
      // Fallback to GIANNA_TEMPLATES follow-up
      return GIANNA_TEMPLATES.sms.follow_up_2;
    }

    case "ghost": {
      // Use ghost recovery flows
      const flow = CONVERSATION_FLOWS.ghost_day_3;
      if (flow?.steps?.[0]?.message) {
        return flow.steps[0].message;
      }
      return GIANNA_TEMPLATES.sms.follow_up_2;
    }

    case "nurture": {
      // Use nurture_soft_no flow
      const flow = CONVERSATION_FLOWS.nurture_soft_no;
      if (flow?.steps?.[0]?.message) {
        return flow.steps[0].message;
      }
      return GIANNA_TEMPLATES.sms.follow_up_1;
    }

    case "book_appointment": {
      // Use schedule_call flow
      const flow = CONVERSATION_FLOWS.schedule_call;
      if (flow?.steps?.[0]?.message) {
        return flow.steps[0].message;
      }
      return GIANNA_TEMPLATES.sms.appointment_confirm;
    }

    case "confirm_appointment": {
      return GIANNA_TEMPLATES.sms.appointment_confirm;
    }

    case "follow_up": {
      return GIANNA_TEMPLATES.sms.follow_up_1;
    }

    case "initial":
    case "instant":
    case "scheduled":
    default: {
      // Use OPENER_LIBRARY - get random opener from category
      const openers = OPENER_LIBRARY[libraryKey];
      if (openers && openers.length > 0) {
        return openers[Math.floor(Math.random() * openers.length)];
      }
      return GIANNA_TEMPLATES.sms.initial_outreach;
    }
  }
}

/**
 * PUSH ACTION
 * Push a completed lead block to any campaign context
 * Supports: instant, scheduled, initial, retarget, follow-up, nurture, ghost
 *
 * Campaign contexts:
 * - initial: First outreach, no previous attempts
 * - retarget: No contact made after threshold, auto-queued for retry
 * - follow_up: Contact was made, continuing conversation
 * - nurture: Long-term value drip sequence
 * - ghost: Previously engaged but went silent
 * - scheduled: Future scheduled outreach
 * - instant: Immediate outreach
 */
async function handlePushAction(
  request: NextRequest,
  body: OrchestrateRequest,
  teamId: string | null,
): Promise<NextResponse> {
  const {
    bucketId,
    leadBlockId,
    pushTo,
    mode = "draft",
    templateMessage,
    templateCategory = "general",
    agent = "gianna",
    campaignName,
    campaignContext = "initial",
    attemptInfo,
  } = body;

  if (!leadBlockId) {
    return NextResponse.json(
      { error: "leadBlockId is required for push action" },
      { status: 400 },
    );
  }

  // For retargets, enforce human-in-the-loop if configured
  const effectiveMode =
    campaignContext === "retarget" && RETARGET_CONFIG.requireHumanApproval
      ? "draft"
      : mode;

  console.log(
    `[LUCI Orchestrate] PUSH lead block ${leadBlockId} to ${pushTo} (context: ${campaignContext}, attempt: ${attemptInfo?.attemptNumber || 1})`,
  );

  // Get enriched leads from the bucket (those with leadId)
  const bucketResponse = await fetch(
    `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/buckets/${bucketId}`,
    { headers: { Cookie: request.headers.get("cookie") || "" } },
  );
  const bucketData = await bucketResponse.json();

  if (bucketData.error) {
    return NextResponse.json(
      { error: `Failed to fetch bucket: ${bucketData.error}` },
      { status: 400 },
    );
  }

  // Filter to only enriched leads (those with leadId)
  const allLeads: LeadRecord[] =
    bucketData.records || bucketData.properties || [];
  const enrichedLeads = allLeads.filter((l) => l.enriched);

  if (enrichedLeads.length === 0) {
    return NextResponse.json(
      { error: "No enriched leads found. Run enrich action first." },
      { status: 400 },
    );
  }

  console.log(
    `[LUCI Orchestrate] Found ${enrichedLeads.length} enriched leads to push`,
  );

  const pushResults = {
    smsQueued: 0,
    dialerQueued: 0,
    skipped: 0,
  };

  // Push to SMS
  if (pushTo === "sms" || pushTo === "both") {
    const leadsWithMobile = enrichedLeads.filter(
      (l) =>
        l.mobilePhone ||
        l.enrichedPhones?.some((p) => p.type?.toLowerCase() === "mobile"),
    );

    if (leadsWithMobile.length > 0) {
      // Use selectTemplate with Gianna library - gets appropriate template based on campaign context
      const template = selectTemplate(
        campaignContext,
        attemptInfo,
        templateCategory,
        templateMessage,
      );

      try {
        const pushResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/luci/push-to-sms`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              leads: leadsWithMobile.map((l) => ({
                id: l.id,
                leadId: l.id, // Use record ID as leadId if not set
                name: l.contactName?.split(" ")[0] || "there",
                contactName: l.contactName,
                companyName: l.companyName,
                phone: l.phone,
                mobilePhone: l.mobilePhone,
                enrichedPhones: l.enrichedPhones,
                email: l.email,
                address: l.address,
                city: l.city,
                state: l.state,
                industry:
                  (l._original as Record<string, unknown>)?.[
                    "SIC Description"
                  ] || l.sicCode,
              })),
              templateMessage: template,
              campaignName: campaignName || `LUCI-${bucketId}-${Date.now()}`,
              campaignContext, // Pass context for downstream processing
              attemptInfo, // Pass attempt info for logging
              mode: effectiveMode, // Use effectiveMode (draft for retargets if human-in-loop)
              agent,
            }),
          },
        );

        const pushData = await pushResponse.json();
        pushResults.smsQueued = pushData.queued || leadsWithMobile.length;
      } catch (error) {
        console.error(`[LUCI Orchestrate] Push to SMS failed:`, error);
      }
    }
  }

  // Push to Dialer
  if (pushTo === "dialer" || pushTo === "both") {
    const leadsWithPhone = enrichedLeads.filter(
      (l) => l.phone || l.mobilePhone || l.enrichedPhones?.length,
    );

    if (leadsWithPhone.length > 0) {
      try {
        const pushResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/luci/push-to-dialer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              leads: leadsWithPhone,
              campaignName:
                campaignName || `LUCI-DIALER-${bucketId}-${Date.now()}`,
              priority: "normal",
            }),
          },
        );

        const pushData = await pushResponse.json();
        pushResults.dialerQueued = pushData.queued || leadsWithPhone.length;
      } catch (error) {
        console.error(`[LUCI Orchestrate] Push to dialer failed:`, error);
      }
    }
  }

  console.log(`[LUCI Orchestrate] Push results:`, pushResults);

  return NextResponse.json({
    success: true,
    leadBlockId,
    push: {
      destination: pushTo,
      mode,
      agent,
      campaignName: campaignName || `LUCI-${bucketId}-${Date.now()}`,
    },
    results: pushResults,
    summary: {
      totalEnriched: enrichedLeads.length,
      smsQueued: pushResults.smsQueued,
      dialerQueued: pushResults.dialerQueued,
      skipped: pushResults.skipped,
    },
    nextSteps: [
      pushResults.smsQueued > 0
        ? `Review ${pushResults.smsQueued} messages in SMS Queue`
        : null,
      pushResults.dialerQueued > 0
        ? `${pushResults.dialerQueued} leads ready for dialer`
        : null,
      mode === "draft"
        ? "Messages in draft mode - review before sending"
        : null,
    ].filter(Boolean),
  });
}

// GET - Check pipeline status and API documentation
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "POST /api/luci/orchestrate",
    description:
      "Unified LUCI → GIANNA pipeline orchestrator with batch processing",
    version: "2.0",
    workflow: {
      step1:
        "ENRICH: Process batches of 250 records, build lead blocks up to 2,000",
      step2:
        "PUSH: User decides where to push enriched lead block (separate action)",
      note: "Enrichment and push are SEPARATE actions. Enrich first, then push.",
    },
    actions: {
      enrich: {
        description:
          "Process a batch of records for enrichment (skip trace, apollo, etc.)",
        parameters: {
          action: "'enrich' (required)",
          bucketId: "string (required) - Data lake bucket ID",
          batchNumber:
            "number - Which batch to process (0-indexed, default: 0)",
          enrichmentTypes:
            "('skip_trace' | 'apollo' | 'property')[] - What to enrich",
          filters: {
            hasAddress: "boolean - Only leads with address",
            missingPhone: "boolean - Only leads missing phone",
            sicCodes: "string[] - Filter by SIC code prefixes",
            states: "string[] - Filter by state codes",
            unenrichedOnly: "boolean - Skip already enriched records",
          },
        },
        response:
          "Returns batch results, progress info, nextBatch number, leadBlockId when complete",
      },
      push: {
        description: "Push completed lead block to campaign context",
        parameters: {
          action: "'push' (required)",
          bucketId: "string (required) - Data lake bucket ID",
          leadBlockId: "string (required) - Lead block ID from enrichment",
          pushTo: "'sms' | 'dialer' | 'both'",
          mode: "'draft' | 'immediate' - Draft requires human review (default for retargets)",
          campaignContext:
            "'initial' | 'retarget' | 'follow_up' | 'book_appointment' | 'confirm_appointment' | 'nurture' | 'ghost' | 'scheduled' | 'instant'",
          attemptInfo: {
            attemptNumber: "number - Which attempt this is (1, 2, 3...)",
            previousAttempts: "number - Total attempts so far",
            contactMade: "boolean - Has contact been established?",
            autoRetarget: "boolean - Auto-queue for retarget if no response?",
          },
          templateCategory:
            "'blue_collar' | 'property' | 'business' | 'general' | 'ny_direct'",
          templateMessage:
            "string - Optional custom message (overrides library templates)",
          agent: "'gianna' | 'sabrina' - AI agent to use",
          campaignName: "string - Optional campaign name",
        },
      },
    },
    campaignContexts: {
      initial: "First outreach attempt - uses OPENER_LIBRARY",
      retarget:
        "No contact made after threshold - uses ghost flows, human-in-loop enforced",
      follow_up:
        "Contact was made, continuing conversation - uses follow-up templates",
      book_appointment: "Scheduling an appointment - uses schedule_call flow",
      confirm_appointment:
        "Confirming scheduled appointment - uses appointment_confirm template",
      nurture: "Long-term value drip sequence - uses nurture_soft_no flow",
      ghost: "Previously engaged but went silent - uses ghost recovery flows",
      scheduled: "Scheduled for future - uses OPENER_LIBRARY",
      instant: "Immediate outreach - uses OPENER_LIBRARY",
    },
    templateLibrary: {
      note: "Templates are pulled from existing GIANNA infrastructure - NOT hardcoded",
      sources: [
        "OPENER_LIBRARY: 150+ openers (property, business, general, ny_direct)",
        "CONVERSATION_FLOWS: 15+ complete flows (hot_lead, ghost_day_3, etc.)",
        "GIANNA_TEMPLATES: SMS, email, voicemail templates",
        "INDUSTRY_OPENERS: Industry-specific openers (restaurant, healthcare, etc.)",
        "REBUTTAL_LIBRARY: Objection handling with human-in-loop",
      ],
    },
    batchConfig: {
      BATCH_SIZE: 250,
      LEAD_BLOCK_SIZE: 2000,
      maxBatchesPerBlock: 8,
      retargetThreshold: 3,
      retargetDelayHours: 48,
      humanInLoopForRetargets: true,
    },
    examples: {
      enrich_batch_0: {
        action: "enrich",
        bucketId: "us-construction-plumbers-hvac",
        batchNumber: 0,
        enrichmentTypes: ["skip_trace"],
        filters: { unenrichedOnly: true },
      },
      push_initial: {
        action: "push",
        bucketId: "us-construction-plumbers-hvac",
        leadBlockId: "lb_us-construction-plumbers-hvac_1703123456789",
        pushTo: "sms",
        campaignContext: "initial",
        templateCategory: "blue_collar",
        mode: "draft",
        agent: "gianna",
      },
      push_retarget: {
        action: "push",
        bucketId: "us-construction-plumbers-hvac",
        leadBlockId: "lb_us-construction-plumbers-hvac_1703123456789",
        pushTo: "sms",
        campaignContext: "retarget",
        attemptInfo: {
          attemptNumber: 2,
          previousAttempts: 1,
          contactMade: false,
        },
        templateCategory: "blue_collar",
        agent: "gianna",
      },
    },
  });
}
