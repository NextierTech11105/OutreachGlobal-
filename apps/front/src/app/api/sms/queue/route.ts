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

      // Human-in-loop GET actions
      case "preview": {
        const limit = parseInt(searchParams.get("limit") || "50");
        const campaignId = searchParams.get("campaignId") || undefined;
        const agent = searchParams.get("agent") as "gianna" | "sabrina" | undefined;
        const messages = smsQueueService.getPreviewQueue({ limit, campaignId, agent });

        return NextResponse.json({
          success: true,
          count: messages.length,
          messages: messages.map((m) => ({
            id: m.id,
            leadId: m.leadId,
            to: m.to,
            message: m.message,
            originalMessage: m.originalMessage,
            variables: m.variables,
            priority: m.priority,
            agent: m.agent,
            campaignId: m.campaignId,
            createdAt: m.createdAt,
            edited: !!m.editedAt,
          })),
        });
      }

      case "approved": {
        const limit = parseInt(searchParams.get("limit") || "50");
        const campaignId = searchParams.get("campaignId") || undefined;
        const messages = smsQueueService.getApprovedQueue({ limit, campaignId });

        return NextResponse.json({
          success: true,
          count: messages.length,
          messages: messages.map((m) => ({
            id: m.id,
            leadId: m.leadId,
            to: m.to,
            message: m.message,
            approvedAt: m.approvedAt,
            approvedBy: m.approvedBy,
            agent: m.agent,
            campaignId: m.campaignId,
          })),
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

      // ═══════════════════════════════════════════════════════════════════════
      // HUMAN-IN-LOOP: PREVIEW, APPROVE, EDIT, DEPLOY
      // ═══════════════════════════════════════════════════════════════════════

      case "add_draft_batch": {
        // Add batch as drafts for human review (NOT auto-send)
        const { leads, templateCategory, templateMessage, personality, campaignId, priority, agent } = body;

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

        const result = smsQueueService.addToDraftQueue(leads, {
          templateCategory: templateCategory || "sms_initial",
          templateMessage,
          personality,
          campaignId,
          priority,
          agent: agent || "gianna", // Default to Gianna for SMS campaigns
        });

        return NextResponse.json({
          success: true,
          status: "draft",
          added: result.added,
          skipped: result.skipped,
          queueIds: result.queueIds,
          message: `${result.added} messages queued for review`,
        });
      }

      case "preview": {
        // Get messages awaiting review
        const { limit, campaignId, agent } = body;
        const messages = smsQueueService.getPreviewQueue({ limit, campaignId, agent });

        return NextResponse.json({
          success: true,
          count: messages.length,
          messages: messages.map((m) => ({
            id: m.id,
            leadId: m.leadId,
            to: m.to,
            message: m.message,
            originalMessage: m.originalMessage,
            variables: m.variables,
            priority: m.priority,
            agent: m.agent,
            campaignId: m.campaignId,
            createdAt: m.createdAt,
            edited: !!m.editedAt,
          })),
        });
      }

      case "approve": {
        // Approve specific messages
        const { messageIds, approvedBy } = body;

        if (!messageIds || !Array.isArray(messageIds)) {
          return NextResponse.json(
            { success: false, error: "messageIds array required" },
            { status: 400 }
          );
        }

        const result = smsQueueService.approveMessages(
          messageIds,
          approvedBy || "admin"
        );

        return NextResponse.json({
          success: true,
          approved: result.approved,
          notFound: result.notFound,
        });
      }

      case "approve_all": {
        // Approve all messages in a campaign
        const { campaignId, approvedBy } = body;

        if (!campaignId) {
          return NextResponse.json(
            { success: false, error: "campaignId required" },
            { status: 400 }
          );
        }

        const approved = smsQueueService.approveAllInCampaign(
          campaignId,
          approvedBy || "admin"
        );

        return NextResponse.json({
          success: true,
          approved,
        });
      }

      case "reject": {
        // Reject specific messages
        const { messageIds, reason } = body;

        if (!messageIds || !Array.isArray(messageIds)) {
          return NextResponse.json(
            { success: false, error: "messageIds array required" },
            { status: 400 }
          );
        }

        const result = smsQueueService.rejectMessages(messageIds, reason);

        return NextResponse.json({
          success: true,
          rejected: result.rejected,
          notFound: result.notFound,
        });
      }

      case "edit": {
        // Edit a message before approval
        const { messageId, newMessage, editedBy } = body;

        if (!messageId || !newMessage) {
          return NextResponse.json(
            { success: false, error: "messageId and newMessage required" },
            { status: 400 }
          );
        }

        const success = smsQueueService.editMessage(
          messageId,
          newMessage,
          editedBy || "admin"
        );

        if (!success) {
          return NextResponse.json(
            { success: false, error: "Message not found or cannot be edited" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          messageId,
          message: "Message updated successfully",
        });
      }

      case "deploy": {
        // Deploy approved messages (move to pending for send)
        const { campaignId, limit, scheduledAt } = body;

        const result = smsQueueService.deployApproved({
          campaignId,
          limit,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        });

        return NextResponse.json({
          success: true,
          deployed: result.deployed,
          messageIds: result.ids,
          message: `${result.deployed} messages deployed for sending`,
        });
      }

      case "get_approved": {
        // Get approved messages ready for deployment
        const { limit, campaignId } = body;
        const messages = smsQueueService.getApprovedQueue({ limit, campaignId });

        return NextResponse.json({
          success: true,
          count: messages.length,
          messages: messages.map((m) => ({
            id: m.id,
            leadId: m.leadId,
            to: m.to,
            message: m.message,
            approvedAt: m.approvedAt,
            approvedBy: m.approvedBy,
            agent: m.agent,
            campaignId: m.campaignId,
          })),
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
