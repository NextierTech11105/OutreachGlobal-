import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, teamWorkflows } from "@/lib/db/schema";
import { eq, and, lt, isNotNull, sql, inArray } from "drizzle-orm";

/**
 * WORKFLOW SCHEDULER API
 *
 * Processes leads that are due for stage transitions based on timing rules.
 * This is the cron endpoint that automates the pipeline.
 *
 * Call this endpoint periodically (e.g., every 15 minutes) to:
 * 1. Find leads that haven't responded within configured thresholds
 * 2. Trigger workflow execution to move them to the next stage
 *
 * Stage Transitions (based on WORKFLOW_STAGES in workflow-registry.ts):
 * - INITIAL_OUTREACH → RETARGET (3 days no response)
 * - RETARGET → NUDGE (14 days total no response)
 * - NUDGE → CONTENT_NURTURE (21 days total no response)
 */

interface SchedulerConfig {
  // Default thresholds in days
  initialToRetarget: number;
  retargetToNudge: number;
  nudgeToNurture: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  initialToRetarget: 3,
  retargetToNudge: 11, // 14 days total from initial
  nudgeToNurture: 7, // 21 days total from initial
};

interface LeadTransition {
  leadId: string;
  currentStage: string;
  nextStage: string;
  daysSinceLastContact: number;
}

/**
 * Find leads due for stage transition based on inactivity
 */
async function findDueLeads(
  teamId: string,
  config: SchedulerConfig,
): Promise<LeadTransition[]> {
  const transitions: LeadTransition[] = [];
  const now = new Date();

  // Find leads in each stage that are due for transition
  const stageThresholds = [
    {
      currentStage: "sent",
      nextStage: "retarget",
      daysThreshold: config.initialToRetarget,
    },
    {
      currentStage: "retarget",
      nextStage: "nudge",
      daysThreshold: config.retargetToNudge,
    },
    {
      currentStage: "nudge",
      nextStage: "nurture",
      daysThreshold: config.nudgeToNurture,
    },
  ];

  for (const stage of stageThresholds) {
    const thresholdDate = new Date(
      now.getTime() - stage.daysThreshold * 24 * 60 * 60 * 1000,
    );

    // Find leads in this stage that haven't been updated since threshold
    const dueLeads = await db
      .select({
        id: leads.id,
        pipelineStatus: leads.pipelineStatus,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          eq(leads.pipelineStatus, stage.currentStage),
          lt(leads.updatedAt, thresholdDate),
        ),
      )
      .limit(100); // Process in batches

    for (const lead of dueLeads) {
      const daysSince = Math.floor(
        (now.getTime() - lead.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      transitions.push({
        leadId: lead.id,
        currentStage: stage.currentStage,
        nextStage: stage.nextStage,
        daysSinceLastContact: daysSince,
      });
    }
  }

  return transitions;
}

/**
 * Process stage transitions by triggering appropriate workflows
 */
async function processTransitions(
  teamId: string,
  transitions: LeadTransition[],
): Promise<{
  processed: number;
  successful: number;
  failed: number;
  details: Array<{
    leadId: string;
    from: string;
    to: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const details: Array<{
    leadId: string;
    from: string;
    to: string;
    success: boolean;
    error?: string;
  }> = [];

  let successful = 0;
  let failed = 0;

  // Group transitions by target stage for batch processing
  const byStage: Record<string, LeadTransition[]> = {};
  for (const t of transitions) {
    if (!byStage[t.nextStage]) byStage[t.nextStage] = [];
    byStage[t.nextStage].push(t);
  }

  for (const [stage, stageTransitions] of Object.entries(byStage)) {
    const leadIds = stageTransitions.map((t) => t.leadId);

    // Trigger the workflow execution for this stage
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/workflows/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger: "inactivity_threshold",
            teamId,
            leadIds,
            data: {
              targetStage: stage,
              reason: "no_response_threshold",
            },
          }),
        },
      );

      const result = await response.json();

      // Update leads with new pipeline status
      if (result.success) {
        await db
          .update(leads)
          .set({
            pipelineStatus: stage,
            updatedAt: new Date(),
          })
          .where(inArray(leads.id, leadIds));

        for (const t of stageTransitions) {
          details.push({
            leadId: t.leadId,
            from: t.currentStage,
            to: stage,
            success: true,
          });
          successful++;
        }
      } else {
        for (const t of stageTransitions) {
          details.push({
            leadId: t.leadId,
            from: t.currentStage,
            to: stage,
            success: false,
            error: result.error || "Workflow execution failed",
          });
          failed++;
        }
      }
    } catch (error) {
      for (const t of stageTransitions) {
        details.push({
          leadId: t.leadId,
          from: t.currentStage,
          to: stage,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
      }
    }
  }

  return {
    processed: transitions.length,
    successful,
    failed,
    details,
  };
}

// POST - Run the scheduler for a team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, config: customConfig, dryRun = false } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    const config = { ...DEFAULT_CONFIG, ...customConfig };

    console.log(`[WorkflowScheduler] Running for team ${teamId}`, {
      config,
      dryRun,
    });

    // Find leads due for transition
    const transitions = await findDueLeads(teamId, config);

    console.log(
      `[WorkflowScheduler] Found ${transitions.length} leads due for transition`,
    );

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: "Dry run - no changes made",
        transitions: transitions.map((t) => ({
          leadId: t.leadId,
          from: t.currentStage,
          to: t.nextStage,
          daysSinceLastContact: t.daysSinceLastContact,
        })),
        summary: {
          total: transitions.length,
          byStage: transitions.reduce(
            (acc, t) => {
              acc[t.nextStage] = (acc[t.nextStage] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      });
    }

    // Process the transitions
    const result = await processTransitions(teamId, transitions);

    console.log(
      `[WorkflowScheduler] Completed: ${result.successful} successful, ${result.failed} failed`,
    );

    return NextResponse.json({
      success: true,
      ...result,
      summary: {
        total: result.processed,
        successful: result.successful,
        failed: result.failed,
      },
    });
  } catch (error) {
    console.error("[WorkflowScheduler] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Scheduler execution failed",
      },
      { status: 500 },
    );
  }
}

// GET - Get scheduler status and pending transitions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    // Find pending transitions without processing them
    const transitions = await findDueLeads(teamId, DEFAULT_CONFIG);

    // Get pipeline status counts
    const statusCounts = await db
      .select({
        status: leads.pipelineStatus,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(eq(leads.teamId, teamId))
      .groupBy(leads.pipelineStatus);

    return NextResponse.json({
      success: true,
      config: DEFAULT_CONFIG,
      pending: {
        total: transitions.length,
        transitions: transitions.map((t) => ({
          leadId: t.leadId,
          from: t.currentStage,
          to: t.nextStage,
          daysSinceLastContact: t.daysSinceLastContact,
        })),
        byTargetStage: transitions.reduce(
          (acc, t) => {
            acc[t.nextStage] = (acc[t.nextStage] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      pipeline: {
        stages: statusCounts.reduce(
          (acc, s) => {
            acc[s.status || "unknown"] = Number(s.count);
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    });
  } catch (error) {
    console.error("[WorkflowScheduler] GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get scheduler status",
      },
      { status: 500 },
    );
  }
}
