/**
 * SMS Queue API
 * Manages the SMS drip queue for campaigns
 * - GET: Get queue stats and pending messages
 * - POST: Add messages to queue (from skip trace, campaigns, etc.)
 * - DELETE: Remove messages from queue
 */

import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";

// GET - Get queue stats and messages
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";

  try {
    switch (action) {
      case "stats": {
        const stats = smsQueueService.getStats();
        return NextResponse.json({
          success: true,
          stats,
          config: smsQueueService.getConfig(),
        });
      }

      case "lead": {
        const leadId = searchParams.get("leadId");
        if (!leadId) {
          return NextResponse.json(
            { success: false, error: "leadId required" },
            { status: 400 }
          );
        }
        const messages = smsQueueService.getLeadMessages(leadId);
        return NextResponse.json({
          success: true,
          leadId,
          messages,
        });
      }

      case "history": {
        const limit = parseInt(searchParams.get("limit") || "10");
        const history = smsQueueService.getBatchHistory(limit);
        return NextResponse.json({
          success: true,
          history,
        });
      }

      case "optouts": {
        const optOuts = smsQueueService.getOptOutList();
        return NextResponse.json({
          success: true,
          count: optOuts.length,
          optOuts,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[SMS Queue] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue info" },
      { status: 500 }
    );
  }
}

// POST - Add messages to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "add_single": {
        // Add single message to queue
        const { leadId, to, message, templateCategory, variables, personality, priority, scheduledAt } = body;

        if (!leadId || !to || !message) {
          return NextResponse.json(
            { success: false, error: "leadId, to, and message required" },
            { status: 400 }
          );
        }

        const messageId = smsQueueService.addToQueue({
          leadId,
          to,
          message,
          templateCategory,
          variables: variables || {},
          personality,
          priority: priority || 5,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          maxAttempts: 3,
        });

        if (!messageId) {
          return NextResponse.json({
            success: false,
            error: "Phone number is opted out",
          });
        }

        return NextResponse.json({
          success: true,
          messageId,
        });
      }

      case "add_batch": {
        // Add batch of messages (from skip trace results)
        const { leads, templateCategory, templateMessage, personality, campaignId, priority, scheduledAt } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 }
          );
        }

        if (!templateMessage) {
          return NextResponse.json(
            { success: false, error: "templateMessage required" },
            { status: 400 }
          );
        }

        const result = smsQueueService.addBatchToQueue(leads, {
          templateCategory: templateCategory || "sms_initial",
          templateMessage,
          personality,
          campaignId,
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        });

        return NextResponse.json({
          success: true,
          added: result.added,
          skipped: result.skipped,
          queueIds: result.queueIds,
        });
      }

      case "process_batch": {
        // Manually trigger batch processing
        const result = await smsQueueService.processBatch();

        if (!result) {
          const stats = smsQueueService.getStats();
          return NextResponse.json({
            success: false,
            reason: !stats.isWithinSchedule
              ? "Outside scheduled hours"
              : stats.remainingToday <= 0
              ? "Daily limit reached"
              : "No pending messages or already processing",
            stats,
          });
        }

        return NextResponse.json({
          success: true,
          batchId: result.batchId,
          sent: result.sent,
          failed: result.failed,
          duration: result.duration,
        });
      }

      case "update_config": {
        // Update queue configuration
        const { config } = body;
        smsQueueService.updateConfig(config);

        return NextResponse.json({
          success: true,
          config: smsQueueService.getConfig(),
        });
      }

      case "add_optout": {
        // Manually add opt-out
        const { phoneNumber } = body;
        if (!phoneNumber) {
          return NextResponse.json(
            { success: false, error: "phoneNumber required" },
            { status: 400 }
          );
        }

        smsQueueService.addOptOut(phoneNumber);
        return NextResponse.json({
          success: true,
          message: `${phoneNumber} added to opt-out list`,
        });
      }

      case "remove_optout": {
        // Remove from opt-out list
        const { phoneNumber } = body;
        if (!phoneNumber) {
          return NextResponse.json(
            { success: false, error: "phoneNumber required" },
            { status: 400 }
          );
        }

        smsQueueService.removeOptOut(phoneNumber);
        return NextResponse.json({
          success: true,
          message: `${phoneNumber} removed from opt-out list`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[SMS Queue] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// DELETE - Remove messages from queue
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "remove_message": {
        const { messageId } = body;
        if (!messageId) {
          return NextResponse.json(
            { success: false, error: "messageId required" },
            { status: 400 }
          );
        }

        const removed = smsQueueService.removeFromQueue(messageId);
        return NextResponse.json({
          success: removed,
          message: removed ? "Message removed" : "Message not found or already processed",
        });
      }

      case "cancel_lead": {
        const { leadId } = body;
        if (!leadId) {
          return NextResponse.json(
            { success: false, error: "leadId required" },
            { status: 400 }
          );
        }

        const cancelled = smsQueueService.cancelLeadMessages(leadId);
        return NextResponse.json({
          success: true,
          cancelled,
        });
      }

      case "cleanup": {
        const { olderThanDays } = body;
        const cleaned = smsQueueService.cleanup(olderThanDays || 7);
        return NextResponse.json({
          success: true,
          cleaned,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[SMS Queue] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
