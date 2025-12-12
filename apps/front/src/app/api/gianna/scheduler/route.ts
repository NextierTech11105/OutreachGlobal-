import { NextRequest, NextResponse } from "next/server";
import { giannaLoopScheduler } from "@/lib/schedulers/gianna-loop-scheduler";

// GET /api/gianna/scheduler - Get scheduler status
export async function GET() {
  try {
    const stats = giannaLoopScheduler.getStats();
    const config = giannaLoopScheduler.getConfig();
    const isRunning = giannaLoopScheduler.isRunning();

    return NextResponse.json({
      success: true,
      scheduler: {
        is_running: isRunning,
        config,
        stats,
      },
    });
  } catch (error) {
    console.error("[Gianna Scheduler API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 },
    );
  }
}

// POST /api/gianna/scheduler - Control scheduler (start/stop/force-run)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case "start":
        giannaLoopScheduler.start();
        return NextResponse.json({
          success: true,
          message: "Scheduler started",
          is_running: giannaLoopScheduler.isRunning(),
        });

      case "stop":
        giannaLoopScheduler.stop();
        return NextResponse.json({
          success: true,
          message: "Scheduler stopped",
          is_running: giannaLoopScheduler.isRunning(),
        });

      case "force_run":
        const result = await giannaLoopScheduler.forceRun();
        return NextResponse.json({
          success: true,
          message: "Scheduler ran manually",
          result,
        });

      case "reset_stats":
        giannaLoopScheduler.resetDailyStats();
        return NextResponse.json({
          success: true,
          message: "Daily stats reset",
          stats: giannaLoopScheduler.getStats(),
        });

      case "update_config":
        if (!config) {
          return NextResponse.json(
            { error: "Config object required for update_config action" },
            { status: 400 },
          );
        }
        giannaLoopScheduler.updateConfig(config);
        return NextResponse.json({
          success: true,
          message: "Config updated",
          config: giannaLoopScheduler.getConfig(),
        });

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: start, stop, force_run, reset_stats, update_config`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Gianna Scheduler API] Error:", error);
    return NextResponse.json(
      { error: "Failed to execute scheduler action" },
      { status: 500 },
    );
  }
}
