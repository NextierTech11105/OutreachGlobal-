import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/api-auth";
import {
  blueprintManager,
  BLUEPRINT_LIBRARY,
  isWithinSendWindow,
  calculateDailyRemaining,
  getNextStage,
  type AIBlueprint,
} from "@/lib/sms/ai-blueprints";

/**
 * AI BLUEPRINTS API
 * =================
 *
 * GET  /api/blueprints           - List all blueprints
 * GET  /api/blueprints?id=xxx    - Get specific blueprint
 * POST /api/blueprints/execute   - Execute blueprint on a batch
 * POST /api/blueprints/create    - Create custom blueprint from template
 */

export async function GET(request: NextRequest) {
  try {
    const { teamId } = await requireTenantContext();
    const { searchParams } = new URL(request.url);
    const blueprintId = searchParams.get("id");

    if (blueprintId) {
      // Get specific blueprint
      const blueprint = blueprintManager.getBlueprint(blueprintId);
      if (!blueprint) {
        return NextResponse.json(
          { error: `Blueprint not found: ${blueprintId}` },
          { status: 404 }
        );
      }

      // Add runtime info
      return NextResponse.json({
        success: true,
        blueprint,
        runtime: {
          withinSendWindow: isWithinSendWindow(blueprint),
          recommendedBatchDelay: blueprintManager.getRecommendedBatchDelay(blueprintId),
          shouldPause: blueprintManager.shouldPause(blueprintId),
        },
      });
    }

    // List all blueprints
    const blueprints = blueprintManager.listBlueprints();

    return NextResponse.json({
      success: true,
      blueprints: blueprints.map((bp) => ({
        id: bp.id,
        name: bp.name,
        description: bp.description,
        active: bp.active,
        dailyCapacity: bp.dailyCapacity,
        batchSize: bp.batchSize,
        stageCount: bp.stages.length,
        metrics: bp.metrics,
        autoOptimize: bp.autoOptimize,
      })),
      total: blueprints.length,
      active: blueprints.filter((b) => b.active).length,
    });
  } catch (error) {
    console.error("[Blueprints API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get blueprints" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await requireTenantContext();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "execute":
        return handleExecute(body, teamId, userId);

      case "create":
        return handleCreate(body, teamId);

      case "updateMetrics":
        return handleUpdateMetrics(body);

      case "setActive":
        return handleSetActive(body);

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
            validActions: ["execute", "create", "updateMetrics", "setActive"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Blueprints API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Blueprint operation failed" },
      { status: 500 }
    );
  }
}

/**
 * Execute blueprint on a batch of leads
 */
async function handleExecute(
  body: { blueprintId: string; batchId?: string; leadIds?: string[]; dryRun?: boolean },
  teamId: string | null,
  userId: string
) {
  const { blueprintId, batchId, leadIds, dryRun = true } = body;

  const blueprint = blueprintManager.getBlueprint(blueprintId);
  if (!blueprint) {
    return NextResponse.json(
      { error: `Blueprint not found: ${blueprintId}` },
      { status: 404 }
    );
  }

  if (!blueprint.active) {
    return NextResponse.json(
      { error: `Blueprint is not active: ${blueprintId}` },
      { status: 400 }
    );
  }

  // Check send window
  if (!isWithinSendWindow(blueprint)) {
    return NextResponse.json({
      success: false,
      error: "Outside send window",
      sendWindow: blueprint.sendWindow,
      message: `Sends only allowed ${blueprint.sendWindow.start} - ${blueprint.sendWindow.end} ${blueprint.sendWindow.timezone}`,
    });
  }

  // Check optimization rules
  const pauseCheck = blueprintManager.shouldPause(blueprintId);
  if (pauseCheck.pause) {
    return NextResponse.json({
      success: false,
      error: "Blueprint paused by optimization rules",
      reason: pauseCheck.reason,
    });
  }

  // In dry run mode, just return what would happen
  if (dryRun) {
    const estimatedCost = (leadIds?.length || 0) * 0.02; // $0.02/lead enrichment
    const batchCount = Math.ceil((leadIds?.length || 0) / blueprint.batchSize);

    return NextResponse.json({
      success: true,
      dryRun: true,
      blueprint: {
        id: blueprint.id,
        name: blueprint.name,
        stages: blueprint.stages,
      },
      execution: {
        leadCount: leadIds?.length || 0,
        batchCount,
        batchSize: blueprint.batchSize,
        batchDelayMinutes: blueprintManager.getRecommendedBatchDelay(blueprintId),
        estimatedDuration: `${batchCount * blueprint.batchDelayMinutes} minutes`,
        estimatedEnrichmentCost: `$${estimatedCost.toFixed(2)}`,
        firstStage: blueprint.stages[0],
      },
      message: "Dry run complete. Set dryRun: false to execute.",
    });
  }

  // TODO: Actual execution would integrate with SignalHouse ExecutionRouter
  // For now, return execution plan
  return NextResponse.json({
    success: true,
    message: "Blueprint execution queued",
    executionId: `exec-${Date.now()}`,
    blueprint: {
      id: blueprint.id,
      name: blueprint.name,
    },
    leadCount: leadIds?.length || 0,
    nextStep: "Leads will be processed through SignalHouse ExecutionRouter",
  });
}

/**
 * Create custom blueprint from template
 */
async function handleCreate(
  body: { templateId: string; customizations: Partial<AIBlueprint> },
  teamId: string | null
) {
  const { templateId, customizations } = body;

  if (!templateId) {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 }
    );
  }

  const newBlueprint = blueprintManager.createFromTemplate(templateId, {
    ...customizations,
    id: `${teamId || "default"}-${customizations.name?.toLowerCase().replace(/\s+/g, "-") || templateId}-${Date.now()}`,
  });

  if (!newBlueprint) {
    return NextResponse.json(
      { error: `Template not found: ${templateId}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Custom blueprint created",
    blueprint: newBlueprint,
  });
}

/**
 * Update blueprint metrics
 */
async function handleUpdateMetrics(body: {
  blueprintId: string;
  metrics: { responseRate?: number; optOutRate?: number; bookingRate?: number };
}) {
  const { blueprintId, metrics } = body;

  if (!blueprintId || !metrics) {
    return NextResponse.json(
      { error: "blueprintId and metrics are required" },
      { status: 400 }
    );
  }

  const success = blueprintManager.updateMetrics(blueprintId, metrics);
  if (!success) {
    return NextResponse.json(
      { error: `Blueprint not found: ${blueprintId}` },
      { status: 404 }
    );
  }

  const blueprint = blueprintManager.getBlueprint(blueprintId);
  return NextResponse.json({
    success: true,
    message: "Metrics updated",
    blueprint: {
      id: blueprint?.id,
      metrics: blueprint?.metrics,
      shouldPause: blueprintManager.shouldPause(blueprintId),
    },
  });
}

/**
 * Activate/deactivate blueprint
 */
async function handleSetActive(body: { blueprintId: string; active: boolean }) {
  const { blueprintId, active } = body;

  if (!blueprintId || typeof active !== "boolean") {
    return NextResponse.json(
      { error: "blueprintId and active (boolean) are required" },
      { status: 400 }
    );
  }

  const success = blueprintManager.setActive(blueprintId, active);
  if (!success) {
    return NextResponse.json(
      { error: `Blueprint not found: ${blueprintId}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Blueprint ${active ? "activated" : "deactivated"}`,
    blueprintId,
    active,
  });
}
