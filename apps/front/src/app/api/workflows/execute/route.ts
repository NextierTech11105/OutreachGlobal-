import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
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
 *
 * Supported actions:
 * - add_tag
 * - remove_tag
 * - update_status
 * - send_sms
 * - send_email
 * - add_notes
 * - push_to_call_queue
 */

interface WorkflowExecutionRequest {
  trigger: string;
  teamId: string;
  leadId?: string;
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
}

// In-memory workflow registry (for fast lookups)
// TODO: Replace with DB query when workflows table is wired
const WORKFLOW_REGISTRY: Workflow[] = [
  {
    id: "wf_auto_respond_1",
    name: "Auto-respond to new messages",
    trigger: "message.received",
    active: true,
    steps: [
      { action: "add_tag", value: "responded" },
      { action: "update_status", value: "engaged" },
    ],
  },
  {
    id: "wf_hot_lead_1",
    name: "Hot lead to call queue",
    trigger: "message.received",
    active: true,
    steps: [
      { action: "add_tag", value: "hot" },
      { action: "push_to_call_queue" },
    ],
  },
  {
    id: "wf_new_lead_welcome",
    name: "Welcome new leads",
    trigger: "lead.created",
    active: true,
    steps: [
      { action: "add_tag", value: "new" },
      { action: "send_sms", templateId: "bb-1" },
    ],
  },
];

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
  context: { teamId: string; leadId?: string; data?: Record<string, unknown> },
): Promise<{
  executed: number;
  results: Array<{ workflowId: string; success: boolean; steps: unknown[] }>;
}> {
  const matchingWorkflows = WORKFLOW_REGISTRY.filter(
    (wf) => wf.trigger === trigger && wf.active,
  );

  console.log(
    `[WorkflowEngine] Found ${matchingWorkflows.length} workflows for trigger: ${trigger}`,
  );

  const results = [];

  for (const workflow of matchingWorkflows) {
    const stepResults = [];
    let workflowSuccess = true;

    for (const step of workflow.steps) {
      const result = await executeAction(step, context);
      stepResults.push({ action: step.action, ...result });
      if (!result.success) {
        workflowSuccess = false;
        break; // Stop on first failure
      }
    }

    results.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: workflowSuccess,
      steps: stepResults,
    });
  }

  return { executed: results.length, results };
}

export async function POST(request: NextRequest) {
  try {
    const body: WorkflowExecutionRequest = await request.json();
    const { trigger, teamId, leadId, campaignId, data } = body;

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

    console.log(`[WorkflowEngine] Processing trigger: ${trigger}`, {
      teamId,
      leadId,
    });

    const result = await executeWorkflows(trigger, { teamId, leadId, data });

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
export async function GET() {
  return NextResponse.json({
    success: true,
    workflows: WORKFLOW_REGISTRY.map((wf) => ({
      id: wf.id,
      name: wf.name,
      trigger: wf.trigger,
      active: wf.active,
      stepsCount: wf.steps.length,
    })),
    triggers: [
      "message.received",
      "lead.created",
      "lead.updated",
      "campaign.started",
    ],
    actions: [
      "add_tag",
      "remove_tag",
      "update_status",
      "send_sms",
      "send_email",
      "add_notes",
      "push_to_call_queue",
    ],
  });
}

// PATCH - Toggle workflow active status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, active } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 },
      );
    }

    // Find and update the workflow in the registry
    const workflowIndex = WORKFLOW_REGISTRY.findIndex(
      (wf) => wf.id === workflowId,
    );

    if (workflowIndex === -1) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Toggle the active status
    const newActive =
      typeof active === "boolean"
        ? active
        : !WORKFLOW_REGISTRY[workflowIndex].active;
    WORKFLOW_REGISTRY[workflowIndex].active = newActive;

    console.log(
      `[WorkflowEngine] Workflow ${workflowId} set to ${newActive ? "active" : "paused"}`,
    );

    return NextResponse.json({
      success: true,
      workflow: {
        id: WORKFLOW_REGISTRY[workflowIndex].id,
        name: WORKFLOW_REGISTRY[workflowIndex].name,
        active: WORKFLOW_REGISTRY[workflowIndex].active,
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
