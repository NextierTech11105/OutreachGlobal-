import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, teamWorkflows, workflowRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSMS, isConfigured } from "@/lib/signalhouse";

/**
 * WORKFLOW EXECUTION ENGINE
 *
 * Executes workflows triggered by events in the Core Pipeline.
 * Called by webhooks and other event sources.
 *
 * Supported triggers:
 * - message.received (inbound SMS)
 * - lead.created
 * - lead.updated
 * - campaign.started
 * - inactivity_threshold (no response after X days)
 * - scheduled (cron-based)
 *
 * Supported actions:
 * - add_tag
 * - remove_tag
 * - update_status
 * - update_pipeline_status
 * - send_sms
 * - send_email
 * - add_notes
 * - push_to_call_queue
 * - route_to_agent (GIANNA, CATHY, SABRINA)
 */

interface WorkflowExecutionRequest {
  trigger: string;
  teamId: string;
  leadId?: string;
  leadIds?: string[]; // Support batch execution
  campaignId?: string;
  data?: Record<string, unknown>;
}

interface WorkflowStep {
  action: string;
  value?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
}

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: WorkflowStep[];
  active: boolean;
  config?: {
    agent?: string;
    templateIds?: string[];
    delayDays?: number;
    usesDifferentNumber?: boolean;
    campaignType?: string;
  };
}

// Default fallback workflows (used when no DB workflows match)
const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: "wf_default_respond",
    name: "Default - Mark as engaged on response",
    trigger: "message.received",
    active: true,
    steps: [
      { action: "add_tag", value: "responded" },
      { action: "update_status", value: "engaged" },
    ],
  },
  {
    id: "wf_default_hot_lead",
    name: "Default - Hot lead to call queue",
    trigger: "message.received",
    active: true,
    steps: [
      { action: "add_tag", value: "hot" },
      { action: "push_to_call_queue" },
    ],
  },
];

/**
 * Load active workflows from database for a team
 */
async function loadWorkflowsFromDB(
  teamId: string,
  trigger: string,
): Promise<Workflow[]> {
  try {
    const dbWorkflows = await db
      .select()
      .from(teamWorkflows)
      .where(
        and(
          eq(teamWorkflows.teamId, teamId),
          eq(teamWorkflows.status, "active"),
          eq(teamWorkflows.trigger, trigger),
        ),
      );

    // Transform DB workflows to execution format
    return dbWorkflows.map((wf) => {
      const config = wf.config as Workflow["config"];
      const steps: WorkflowStep[] = [];

      // Build steps based on workflow stage and config
      if (config?.agent) {
        steps.push({
          action: "route_to_agent",
          value: config.agent,
          metadata: {
            campaignType: config.campaignType,
            usesDifferentNumber: config.usesDifferentNumber,
            templateIds: config.templateIds,
          },
        });
      }

      // Add default stage transition step
      if (wf.stage) {
        steps.push({
          action: "update_pipeline_status",
          value: wf.stage,
        });
      }

      return {
        id: wf.id,
        name: wf.name,
        trigger: wf.trigger || trigger,
        steps,
        active: true,
        config,
      };
    });
  } catch (error) {
    console.error("[WorkflowEngine] Failed to load workflows from DB:", error);
    return [];
  }
}

// Execute a single action step
async function executeAction(
  step: WorkflowStep,
  context: { teamId: string; leadId?: string; data?: Record<string, unknown> },
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const { action, value, templateId } = step;
  const { teamId, leadId, data } = context;

  console.log(`[WorkflowEngine] Executing action: ${action}`, {
    value,
    leadId,
  });

  try {
    switch (action) {
      case "add_tag": {
        if (!leadId || !value)
          return { success: false, error: "Missing leadId or tag value" };
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
        if (!lead) return { success: false, error: "Lead not found" };

        const currentTags = (lead.tags as string[]) || [];
        if (!currentTags.includes(value)) {
          await db
            .update(leads)
            .set({ tags: [...currentTags, value] })
            .where(eq(leads.id, leadId));
        }
        return { success: true, result: { tag: value, added: true } };
      }

      case "remove_tag": {
        if (!leadId || !value)
          return { success: false, error: "Missing leadId or tag value" };
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
        if (!lead) return { success: false, error: "Lead not found" };

        const currentTags = (lead.tags as string[]) || [];
        await db
          .update(leads)
          .set({ tags: currentTags.filter((t) => t !== value) })
          .where(eq(leads.id, leadId));
        return { success: true, result: { tag: value, removed: true } };
      }

      case "update_status": {
        if (!leadId || !value)
          return { success: false, error: "Missing leadId or status value" };
        await db
          .update(leads)
          .set({ status: value })
          .where(eq(leads.id, leadId));
        return { success: true, result: { status: value } };
      }

      case "send_sms": {
        if (!leadId) return { success: false, error: "Missing leadId" };
        if (!isConfigured())
          return { success: false, error: "SignalHouse not configured" };

        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
        if (!lead?.phone) return { success: false, error: "Lead has no phone" };

        // For now, use a simple message. TODO: Resolve templateId from CARTRIDGE_LIBRARY
        const message =
          value || `Hi ${lead.firstName || "there"}! Thanks for reaching out.`;
        const fromNumber = process.env.SIGNALHOUSE_FROM_NUMBER || "";

        const result = await sendSMS({
          to: lead.phone,
          from: fromNumber,
          message,
        });
        return { success: result.success, result };
      }

      case "push_to_call_queue": {
        if (!leadId) return { success: false, error: "Missing leadId" };
        // Set priority flag for call queue
        await db
          .update(leads)
          .set({
            priority: 100,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
        return { success: true, result: { queued: true, priority: 100 } };
      }

      case "add_notes": {
        if (!leadId || !value)
          return { success: false, error: "Missing leadId or note value" };
        const [lead] = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
        if (!lead) return { success: false, error: "Lead not found" };

        const currentNotes = (lead.notes as string) || "";
        const newNote = `[${new Date().toISOString()}] ${value}`;
        await db
          .update(leads)
          .set({ notes: currentNotes + "\n" + newNote })
          .where(eq(leads.id, leadId));
        return { success: true, result: { note: value } };
      }

      case "update_pipeline_status": {
        if (!leadId || !value)
          return { success: false, error: "Missing leadId or pipeline status" };
        await db
          .update(leads)
          .set({
            pipelineStatus: value,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
        return { success: true, result: { pipelineStatus: value } };
      }

      case "route_to_agent": {
        if (!leadId || !value)
          return { success: false, error: "Missing leadId or agent name" };

        const agent = value.toUpperCase();
        const metadata = step.metadata || {};

        // Route to the appropriate agent API
        let apiUrl = "";
        switch (agent) {
          case "GIANNA":
            apiUrl = "/api/gianna/send-batch";
            break;
          case "CATHY":
            apiUrl = "/api/cathy/nudge";
            break;
          case "SABRINA":
            apiUrl = "/api/sabrina/auto-book";
            break;
          default:
            return { success: false, error: `Unknown agent: ${agent}` };
        }

        // Queue for agent processing
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || ""}${apiUrl}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                leadIds: [leadId],
                teamId,
                templateId: metadata.templateIds?.[0],
                campaignType: metadata.campaignType,
                usesDifferentNumber: metadata.usesDifferentNumber,
              }),
            },
          );
          const result = await response.json();
          return {
            success: result.success || response.ok,
            result: { agent, queued: true, ...result },
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to route to ${agent}: ${error}`,
          };
        }
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error(`[WorkflowEngine] Action failed: ${action}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Action failed",
    };
  }
}

// Execute all matching workflows for a trigger
async function executeWorkflows(
  trigger: string,
  context: {
    teamId: string;
    leadId?: string;
    leadIds?: string[];
    data?: Record<string, unknown>;
  },
): Promise<{
  executed: number;
  results: Array<{ workflowId: string; success: boolean; steps: unknown[] }>;
}> {
  const { teamId, leadId, leadIds, data } = context;

  // Load workflows from database first, fall back to defaults
  let matchingWorkflows = await loadWorkflowsFromDB(teamId, trigger);

  // If no DB workflows, use defaults for common triggers
  if (matchingWorkflows.length === 0) {
    matchingWorkflows = DEFAULT_WORKFLOWS.filter(
      (wf) => wf.trigger === trigger && wf.active,
    );
  }

  console.log(
    `[WorkflowEngine] Found ${matchingWorkflows.length} workflows for trigger: ${trigger}`,
  );

  const results = [];

  // Get all lead IDs to process
  const allLeadIds = leadIds || (leadId ? [leadId] : []);

  for (const workflow of matchingWorkflows) {
    const stepResults = [];
    let workflowSuccess = true;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // Create a workflow run record
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      await db.insert(workflowRuns).values({
        id: runId,
        workflowId: workflow.id,
        teamId,
        status: "running",
        inputData: { trigger, leadIds: allLeadIds, data },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e) {
      // Table might not exist yet, continue anyway
      console.log("[WorkflowEngine] Could not create run record:", e);
    }

    // Process each lead
    for (const lid of allLeadIds) {
      processedCount++;
      let leadSuccess = true;

      for (const step of workflow.steps) {
        const result = await executeAction(step, { teamId, leadId: lid, data });
        stepResults.push({ leadId: lid, action: step.action, ...result });
        if (!result.success) {
          leadSuccess = false;
          workflowSuccess = false;
          break; // Stop steps for this lead on first failure
        }
      }

      if (leadSuccess) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    // Update workflow run with results
    try {
      await db
        .update(workflowRuns)
        .set({
          status: workflowSuccess ? "completed" : "failed",
          leadsProcessed: processedCount,
          leadsSuccessful: successCount,
          leadsFailed: failedCount,
          outputData: { steps: stepResults },
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, runId));

      // Update workflow stats
      await db
        .update(teamWorkflows)
        .set({
          runsCount: (workflow as any).runsCount
            ? (workflow as any).runsCount + 1
            : 1,
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(teamWorkflows.id, workflow.id));
    } catch (e) {
      console.log("[WorkflowEngine] Could not update run/workflow:", e);
    }

    results.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      runId,
      success: workflowSuccess,
      processed: processedCount,
      successful: successCount,
      failed: failedCount,
      steps: stepResults,
    });
  }

  return { executed: results.length, results };
}

export async function POST(request: NextRequest) {
  try {
    const body: WorkflowExecutionRequest = await request.json();
    const { trigger, teamId, leadId, leadIds, campaignId, data } = body;

    if (!trigger) {
      return NextResponse.json(
        { error: "trigger is required" },
        { status: 400 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    const targetLeads = leadIds || (leadId ? [leadId] : []);
    console.log(`[WorkflowEngine] Processing trigger: ${trigger}`, {
      teamId,
      leadCount: targetLeads.length,
    });

    const result = await executeWorkflows(trigger, {
      teamId,
      leadId,
      leadIds,
      data,
    });

    return NextResponse.json({
      success: true,
      trigger,
      ...result,
    });
  } catch (error) {
    console.error("[WorkflowEngine] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 },
    );
  }
}

// GET - List available workflows and triggers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    // If teamId provided, load from DB
    let workflows: Workflow[] = [];
    if (teamId) {
      const dbWorkflows = await db
        .select()
        .from(teamWorkflows)
        .where(eq(teamWorkflows.teamId, teamId));

      workflows = dbWorkflows.map((wf) => ({
        id: wf.id,
        name: wf.name,
        trigger: wf.trigger || "",
        steps: [],
        active: wf.status === "active",
        config: wf.config as Workflow["config"],
      }));
    }

    // Include defaults
    const allWorkflows = [...workflows, ...DEFAULT_WORKFLOWS];

    return NextResponse.json({
      success: true,
      workflows: allWorkflows.map((wf) => ({
        id: wf.id,
        name: wf.name,
        trigger: wf.trigger,
        active: wf.active,
        stepsCount: wf.steps?.length || 0,
        config: wf.config,
      })),
      triggers: [
        "message.received",
        "lead.created",
        "lead.updated",
        "campaign.started",
        "inactivity_threshold",
        "scheduled",
      ],
      actions: [
        "add_tag",
        "remove_tag",
        "update_status",
        "update_pipeline_status",
        "send_sms",
        "send_email",
        "add_notes",
        "push_to_call_queue",
        "route_to_agent",
      ],
    });
  } catch (error) {
    console.error("[WorkflowEngine] GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflows",
      },
      { status: 500 },
    );
  }
}

// PATCH - Toggle workflow active status (updates DB)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, active, teamId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 },
      );
    }

    // Check if it's a default workflow (can't toggle)
    const isDefault = DEFAULT_WORKFLOWS.some((wf) => wf.id === workflowId);
    if (isDefault) {
      return NextResponse.json(
        { error: "Cannot toggle default workflows" },
        { status: 400 },
      );
    }

    // Update in database
    const newStatus = active ? "active" : "draft";
    const [updated] = await db
      .update(teamWorkflows)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(teamWorkflows.id, workflowId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    console.log(`[WorkflowEngine] Workflow ${workflowId} set to ${newStatus}`);

    return NextResponse.json({
      success: true,
      workflow: {
        id: updated.id,
        name: updated.name,
        active: updated.status === "active",
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("[WorkflowEngine] Toggle error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Toggle failed" },
      { status: 500 },
    );
  }
}
