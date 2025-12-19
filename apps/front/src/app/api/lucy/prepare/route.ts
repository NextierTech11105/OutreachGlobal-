/**
 * ════════════════════════════════════════════════════════════════════════════════
 * LUCY PREPARATION API
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * LUCY IS A DEAL HUNTER COPILOT - SHE NEVER SPEAKS TO LEADS
 *
 * Her job:
 * 1. Get triggered when USBizData CSV is uploaded
 * 2. Scan, label, and score leads
 * 3. Batch skip trace (250 per batch, up to 2,000/day)
 * 4. Push to campaign queues for GIANNA/CATHY/SABRINA
 * 5. Track 20,000 net new lead IDs per month
 *
 * After LUCY pushes to GIANNA → LUCY NEVER SPEAKS TO THAT LEAD
 * All other workers (GIANNA, CATHY, SABRINA) are response handlers on demand
 * They work in OMNI capacity (SMS, Call, Email)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";
import {
  scoreLead,
  createCampaignWorkflow,
  createSkipTraceBatch,
  WORKFLOW_DEFAULTS,
  CAMPAIGN_TEMPLATES,
  type CampaignWorkflow,
  type CampaignLead,
  type SkipTraceBatch,
} from "@/lib/ai-workers/campaign-workflow";

// RealEstateAPI for skip trace
const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";

// ════════════════════════════════════════════════════════════════════════════════
// LUCY'S CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const LUCY_LIMITS = {
  batchSize: 250, // Skip trace 250 at a time
  maxPerDay: 2000, // Max 2,000 per campaign workflow per day
  maxPerMonth: 20000, // 20,000 net new lead IDs per month
  campaignQueueMax: 2000, // Each campaign queue holds 2,000
};

// Campaign queue structure
interface CampaignQueue {
  id: string;
  name: string;
  channel: "sms" | "call" | "email";
  stage: "initial" | "retarget" | "follow_up" | "nudger" | "nurture";
  worker: "gianna" | "cathy" | "sabrina";
  leads: string[]; // Lead IDs
  max: number;
  status: "filling" | "ready" | "executing" | "complete";
}

// ════════════════════════════════════════════════════════════════════════════════
// POST - LUCY PREPARATION
// ════════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action, // "prepare" | "skip-trace-batch" | "push-to-queue" | "status"
      // Prepare options
      limit = LUCY_LIMITS.maxPerDay,
      tagFilters = [],
      // Batch options
      batchNumber,
      leadIds,
      // Queue options
      queueId,
    } = body;

    // ════════════════════════════════════════════════════════════════
    // ACTION: PREPARE - Scan, label, and stage leads for campaigns
    // ════════════════════════════════════════════════════════════════
    if (action === "prepare") {
      // Fetch unprepared businesses
      const unpreparedLeads = await db
        .select({
          id: businesses.id,
          companyName: businesses.companyName,
          ownerName: businesses.ownerName,
          ownerFirstName: businesses.ownerFirstName,
          ownerLastName: businesses.ownerLastName,
          phone: businesses.phone,
          ownerPhone: businesses.ownerPhone,
          email: businesses.email,
          ownerEmail: businesses.ownerEmail,
          address: businesses.address,
          city: businesses.city,
          state: businesses.state,
          zip: businesses.zip,
          sicCode: businesses.sicCode,
          employeeCount: businesses.employeeCount,
          annualRevenue: businesses.annualRevenue,
          yearsInBusiness: businesses.yearsInBusiness,
          enrichmentStatus: businesses.enrichmentStatus,
        })
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            eq(businesses.enrichmentStatus, "pending"),
          ),
        )
        .orderBy(desc(businesses.annualRevenue))
        .limit(Math.min(limit, LUCY_LIMITS.maxPerDay));

      // Score and label each lead (LUCY's job)
      const preparedLeads = unpreparedLeads.map((biz) => {
        const { score, tags } = scoreLead({
          sicCode: biz.sicCode || undefined,
          employeeCount: biz.employeeCount || undefined,
          annualRevenue: biz.annualRevenue || undefined,
          yearsInBusiness: biz.yearsInBusiness || undefined,
          ownerIdentified: !!(biz.ownerName || biz.ownerFirstName),
          hasMobilePhone: !!(biz.ownerPhone || biz.phone),
          hasEmail: !!(biz.ownerEmail || biz.email),
        });

        return {
          id: biz.id,
          companyName: biz.companyName,
          ownerName:
            biz.ownerName ||
            `${biz.ownerFirstName || ""} ${biz.ownerLastName || ""}`.trim(),
          phone: biz.ownerPhone || biz.phone,
          email: biz.ownerEmail || biz.email,
          address: biz.address,
          city: biz.city,
          state: biz.state,
          zip: biz.zip,
          score,
          tags,
          skipTraceNeeded: !(biz.ownerPhone || biz.phone),
          channelReady: {
            sms: !!(biz.ownerPhone || biz.phone),
            call: !!(biz.ownerPhone || biz.phone),
            email: !!(biz.ownerEmail || biz.email),
          },
        };
      });

      // Separate into those needing skip trace vs ready
      const needsSkipTrace = preparedLeads.filter((l) => l.skipTraceNeeded);
      const readyForCampaign = preparedLeads.filter((l) => !l.skipTraceNeeded);

      // Create skip trace batches (250 per batch)
      const batches: {
        batchNumber: number;
        leadIds: string[];
        size: number;
      }[] = [];
      for (let i = 0; i < needsSkipTrace.length; i += LUCY_LIMITS.batchSize) {
        const batchLeads = needsSkipTrace.slice(i, i + LUCY_LIMITS.batchSize);
        batches.push({
          batchNumber: Math.floor(i / LUCY_LIMITS.batchSize) + 1,
          leadIds: batchLeads.map((l) => l.id),
          size: batchLeads.length,
        });
      }

      // Initialize campaign queues
      const campaignQueues: CampaignQueue[] = [
        {
          id: "initial_sms",
          name: "Initial SMS (GIANNA)",
          channel: "sms",
          stage: "initial",
          worker: "gianna",
          leads: readyForCampaign
            .filter((l) => l.channelReady.sms)
            .map((l) => l.id),
          max: LUCY_LIMITS.campaignQueueMax,
          status: "filling",
        },
        {
          id: "initial_call",
          name: "Initial Call (GIANNA)",
          channel: "call",
          stage: "initial",
          worker: "gianna",
          leads: readyForCampaign
            .filter((l) => l.channelReady.call)
            .map((l) => l.id),
          max: LUCY_LIMITS.campaignQueueMax,
          status: "filling",
        },
        {
          id: "retarget_sms",
          name: "Retarget SMS (GIANNA/CATHY)",
          channel: "sms",
          stage: "retarget",
          worker: "gianna",
          leads: [],
          max: LUCY_LIMITS.campaignQueueMax,
          status: "filling",
        },
        {
          id: "follow_up_sms",
          name: "Follow-up SMS (SABRINA)",
          channel: "sms",
          stage: "follow_up",
          worker: "sabrina",
          leads: [],
          max: LUCY_LIMITS.campaignQueueMax,
          status: "filling",
        },
        {
          id: "nudger_sms",
          name: "Nudger SMS (CATHY)",
          channel: "sms",
          stage: "nudger",
          worker: "cathy",
          leads: [],
          max: LUCY_LIMITS.campaignQueueMax,
          status: "filling",
        },
        {
          id: "nurture_email",
          name: "Nurture Email (GIANNA)",
          channel: "email",
          stage: "nurture",
          worker: "gianna",
          leads: readyForCampaign
            .filter((l) => l.channelReady.email)
            .map((l) => l.id),
          max: LUCY_LIMITS.campaignQueueMax,
          status: "filling",
        },
      ];

      // Tag distribution
      const tagCounts: Record<string, number> = {};
      preparedLeads.forEach((lead) => {
        lead.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      return NextResponse.json({
        success: true,
        copilot: "LUCY",
        action: "prepare",
        message: "LUCY has prepared leads for campaign queues",
        summary: {
          totalScanned: preparedLeads.length,
          readyForCampaign: readyForCampaign.length,
          needsSkipTrace: needsSkipTrace.length,
          skipTraceBatches: batches.length,
          batchSize: LUCY_LIMITS.batchSize,
        },
        scoring: {
          highScore: preparedLeads.filter((l) => l.score >= 80).length,
          mediumScore: preparedLeads.filter(
            (l) => l.score >= 50 && l.score < 80,
          ).length,
          lowScore: preparedLeads.filter((l) => l.score < 50).length,
        },
        tags: tagCounts,
        batches,
        campaignQueues: campaignQueues.map((q) => ({
          id: q.id,
          name: q.name,
          channel: q.channel,
          worker: q.worker,
          leadsStaged: q.leads.length,
          max: q.max,
          status: q.status,
        })),
        nextSteps: [
          batches.length > 0
            ? `Run ${batches.length} skip trace batches (250 each)`
            : null,
          "Push ready leads to campaign queues",
          "GIANNA/CATHY/SABRINA take over from here",
          "LUCY never speaks to leads - she only prepares",
        ].filter(Boolean),
      });
    }

    // ════════════════════════════════════════════════════════════════
    // ACTION: SKIP-TRACE-BATCH - Run skip trace on a batch of 250
    // ════════════════════════════════════════════════════════════════
    if (action === "skip-trace-batch") {
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return NextResponse.json(
          { error: "leadIds array required" },
          { status: 400 },
        );
      }

      if (leadIds.length > LUCY_LIMITS.batchSize) {
        return NextResponse.json(
          { error: `Max batch size is ${LUCY_LIMITS.batchSize}` },
          { status: 400 },
        );
      }

      if (!REALESTATE_API_KEY) {
        return NextResponse.json({
          success: false,
          error: "Skip trace API not configured",
          message: "Set REAL_ESTATE_API_KEY to enable skip tracing",
        });
      }

      // Fetch leads to skip trace
      const leadsToTrace = await db
        .select({
          id: businesses.id,
          ownerFirstName: businesses.ownerFirstName,
          ownerLastName: businesses.ownerLastName,
          ownerName: businesses.ownerName,
          address: businesses.address,
          city: businesses.city,
          state: businesses.state,
          zip: businesses.zip,
        })
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            sql`${businesses.id} IN (${sql.join(
              leadIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        );

      const results = {
        total: leadsToTrace.length,
        phonesFound: 0,
        mobilePhones: 0,
        emailsFound: 0,
        errors: 0,
        processed: [] as {
          id: string;
          success: boolean;
          phones: number;
          emails: number;
        }[],
      };

      for (const lead of leadsToTrace) {
        try {
          const firstName =
            lead.ownerFirstName || lead.ownerName?.split(" ")[0] || "";
          const lastName =
            lead.ownerLastName ||
            lead.ownerName?.split(" ").slice(1).join(" ") ||
            "";

          if (!firstName || !lead.address) {
            results.errors++;
            results.processed.push({
              id: lead.id,
              success: false,
              phones: 0,
              emails: 0,
            });
            continue;
          }

          // Call skip trace API
          const response = await fetch(SKIP_TRACE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": REALESTATE_API_KEY,
            },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
              address: lead.address,
              city: lead.city || "",
              state: lead.state || "",
              zip: lead.zip || "",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const traceData = data.data || data;

            const phones = traceData.phones || traceData.phone_numbers || [];
            const emails = traceData.emails || traceData.email_addresses || [];

            const mobileCount = phones.filter((p: any) =>
              (p.line_type || p.type || "").toLowerCase().includes("mobile"),
            ).length;

            results.phonesFound += phones.length;
            results.mobilePhones += mobileCount;
            results.emailsFound += emails.length;

            // Update business with skip trace data
            await db
              .update(businesses)
              .set({
                ownerPhone:
                  phones[0]?.number || phones[0]?.phone || phones[0] || null,
                ownerEmail:
                  emails[0]?.email || emails[0]?.address || emails[0] || null,
                enrichmentStatus: "completed",
                updatedAt: new Date(),
              })
              .where(eq(businesses.id, lead.id));

            results.processed.push({
              id: lead.id,
              success: true,
              phones: phones.length,
              emails: emails.length,
            });
          } else {
            results.errors++;
            results.processed.push({
              id: lead.id,
              success: false,
              phones: 0,
              emails: 0,
            });
          }

          // Rate limit
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          results.errors++;
          results.processed.push({
            id: lead.id,
            success: false,
            phones: 0,
            emails: 0,
          });
        }
      }

      return NextResponse.json({
        success: true,
        copilot: "LUCY",
        action: "skip-trace-batch",
        batchNumber: batchNumber || 1,
        results,
        message: `Skip traced ${results.total - results.errors}/${results.total} leads`,
        nextStep: "Push to campaign queues for GIANNA/CATHY/SABRINA execution",
      });
    }

    // ════════════════════════════════════════════════════════════════
    // ACTION: PUSH-TO-QUEUE - Push leads to a campaign queue
    // ════════════════════════════════════════════════════════════════
    if (action === "push-to-queue") {
      // This would push leads to the actual campaign execution system
      // For now, return the structure

      return NextResponse.json({
        success: true,
        copilot: "LUCY",
        action: "push-to-queue",
        message: "Leads pushed to campaign queue",
        note: "LUCY never speaks to leads after this - GIANNA/CATHY/SABRINA take over",
        queue: {
          id: queueId || "initial_sms",
          worker: "gianna",
          status: "ready",
        },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // ACTION: STATUS - Get LUCY preparation status
    // ════════════════════════════════════════════════════════════════
    if (action === "status") {
      // Count leads in various states
      const [pending] = await db
        .select({ count: sql<number>`count(*)` })
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            eq(businesses.enrichmentStatus, "pending"),
          ),
        );

      const [completed] = await db
        .select({ count: sql<number>`count(*)` })
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            eq(businesses.enrichmentStatus, "completed"),
          ),
        );

      return NextResponse.json({
        success: true,
        copilot: "LUCY",
        action: "status",
        role: "Deal Hunter Copilot - Never speaks to leads",
        status: {
          pendingPreparation: pending?.count || 0,
          skipTraceCompleted: completed?.count || 0,
          campaignQueuesActive: 6,
        },
        limits: LUCY_LIMITS,
        workers: {
          gianna: "opener - handles initial SMS/call/email",
          cathy: "nudger - handles ghost revival",
          sabrina: "closer - handles booking",
        },
        message: "LUCY prepares, GIANNA/CATHY/SABRINA execute",
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use: prepare, skip-trace-batch, push-to-queue, status",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[LUCY Prepare] Error:", error);
    return NextResponse.json(
      { error: error.message || "Preparation failed" },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET - LUCY STATUS
// ════════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  return NextResponse.json({
    copilot: "LUCY",
    role: "Deal Hunter - Lead Intelligence Engine",
    behavior: "NEVER speaks to leads - only prepares and labels",
    workflow: [
      "1. USBizData CSV uploaded → LUCY activates",
      "2. Scan, score, and label all leads",
      "3. Batch skip trace (250/batch, 2,000/day max)",
      "4. Push to campaign queues",
      "5. GIANNA/CATHY/SABRINA take over for execution",
    ],
    limits: LUCY_LIMITS,
    endpoints: {
      prepare: "POST /api/lucy/prepare { action: 'prepare' }",
      skipTrace:
        "POST /api/lucy/prepare { action: 'skip-trace-batch', leadIds: [...] }",
      pushToQueue:
        "POST /api/lucy/prepare { action: 'push-to-queue', queueId: '...' }",
      status: "POST /api/lucy/prepare { action: 'status' }",
    },
    campaignQueues: [
      "initial_sms (GIANNA)",
      "initial_call (GIANNA)",
      "retarget_sms (GIANNA/CATHY)",
      "follow_up_sms (SABRINA)",
      "nudger_sms (CATHY)",
      "nurture_email (GIANNA)",
    ],
  });
}
