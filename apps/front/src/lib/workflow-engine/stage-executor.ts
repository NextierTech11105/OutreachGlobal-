// Stage Executor Service
// Executes workflow stages by routing to the appropriate agent (GIANNA, CATHY, SABRINA)

import type { TeamWorkflow } from "@/lib/db/schema";

export interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  state?: string;
  address?: string;
}

export interface StageConfig {
  id: string;
  name: string;
  agent: "GIANNA" | "CATHY" | "SABRINA" | null;
  triggerMode: "automatic" | "manual" | "scheduled";
  delayDays?: number;
  campaignType: string;
  usesDifferentNumber: boolean;
}

export interface ExecutionResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failedCount: number;
  details: ExecutionDetail[];
}

export interface ExecutionDetail {
  leadId: string;
  status: "sent" | "queued" | "failed" | "skipped";
  message?: string;
  error?: string;
}

// Default stage configurations
export const DEFAULT_STAGES: StageConfig[] = [
  {
    id: "initial_message",
    name: "Initial Message",
    agent: "GIANNA",
    triggerMode: "automatic",
    campaignType: "SMS_INITIAL",
    usesDifferentNumber: false,
  },
  {
    id: "retarget",
    name: "Retarget",
    agent: "GIANNA",
    triggerMode: "scheduled",
    delayDays: 3,
    campaignType: "SMS_RETARGET_NC",
    usesDifferentNumber: false,
  },
  {
    id: "nudger",
    name: "Nudger",
    agent: "CATHY",
    triggerMode: "manual",
    delayDays: 14,
    campaignType: "SMS_NUDGE",
    usesDifferentNumber: true, // Uses different number per user spec
  },
  {
    id: "content_nurture",
    name: "Content Nurture",
    agent: "GIANNA",
    triggerMode: "scheduled",
    campaignType: "SMS_NURTURE",
    usesDifferentNumber: false,
  },
  {
    id: "book_appt",
    name: "Book Appointment",
    agent: "SABRINA",
    triggerMode: "manual", // Human discretion
    campaignType: "BOOK_APPOINTMENT",
    usesDifferentNumber: false,
  },
];

export class WorkflowStageExecutor {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Execute a workflow stage for a set of leads
   */
  async executeStage(
    workflow: TeamWorkflow,
    stage: StageConfig,
    leads: Lead[],
    options?: {
      templateId?: string;
      dryRun?: boolean;
    }
  ): Promise<ExecutionResult> {
    const results: ExecutionDetail[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Check if this is a dry run
    if (options?.dryRun) {
      return {
        success: true,
        processedCount: leads.length,
        successCount: leads.length,
        failedCount: 0,
        details: leads.map((lead) => ({
          leadId: lead.id,
          status: "queued" as const,
          message: `[DRY RUN] Would send via ${stage.agent}`,
        })),
      };
    }

    // Execute based on agent type
    switch (stage.agent) {
      case "GIANNA":
        return this.executeGianna(workflow, stage, leads, options?.templateId);
      case "CATHY":
        return this.executeCathy(workflow, stage, leads, options?.templateId);
      case "SABRINA":
        return this.executeSabrina(workflow, stage, leads);
      default:
        return this.executeManual(workflow, stage, leads);
    }
  }

  /**
   * Execute GIANNA stage - Initial SMS, Retarget, Content Nurture
   */
  private async executeGianna(
    workflow: TeamWorkflow,
    stage: StageConfig,
    leads: Lead[],
    templateId?: string
  ): Promise<ExecutionResult> {
    const results: ExecutionDetail[] = [];

    try {
      // Push to LUCI for SMS campaign execution
      const response = await fetch(`${this.baseUrl}/api/luci/push-to-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: leads.map((l) => l.id),
          campaignContext: stage.campaignType.toLowerCase(),
          agent: "gianna",
          templateId,
          workflowId: workflow.id,
          mode: "draft", // Human review by default
        }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          processedCount: leads.length,
          successCount: result.queuedCount || leads.length,
          failedCount: result.failedCount || 0,
          details: leads.map((lead) => ({
            leadId: lead.id,
            status: "queued" as const,
            message: `Queued for GIANNA via ${stage.campaignType}`,
          })),
        };
      } else {
        throw new Error(result.error || "Failed to push to GIANNA");
      }
    } catch (error) {
      console.error("GIANNA execution error:", error);
      return {
        success: false,
        processedCount: leads.length,
        successCount: 0,
        failedCount: leads.length,
        details: leads.map((lead) => ({
          leadId: lead.id,
          status: "failed" as const,
          error: String(error),
        })),
      };
    }
  }

  /**
   * Execute CATHY stage - Nudge with humor, uses different number
   */
  private async executeCathy(
    workflow: TeamWorkflow,
    stage: StageConfig,
    leads: Lead[],
    templateId?: string
  ): Promise<ExecutionResult> {
    const results: ExecutionDetail[] = [];

    // CATHY is human-discretion by default, queue for review
    for (const lead of leads) {
      try {
        const response = await fetch(`${this.baseUrl}/api/cathy/nudge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            attemptNumber: 1, // Get from lead history
            send: false, // Queue for review, don't send immediately
            usesDifferentNumber: stage.usesDifferentNumber,
            templateId,
            workflowId: workflow.id,
          }),
        });

        const result = await response.json();

        results.push({
          leadId: lead.id,
          status: result.success ? "queued" : "failed",
          message: result.success ? "Queued for CATHY nudge review" : undefined,
          error: result.error,
        });
      } catch (error) {
        results.push({
          leadId: lead.id,
          status: "failed",
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.status !== "failed").length;

    return {
      success: successCount > 0,
      processedCount: leads.length,
      successCount,
      failedCount: leads.length - successCount,
      details: results,
    };
  }

  /**
   * Execute SABRINA stage - Book appointment
   */
  private async executeSabrina(
    workflow: TeamWorkflow,
    stage: StageConfig,
    leads: Lead[]
  ): Promise<ExecutionResult> {
    const results: ExecutionDetail[] = [];

    // SABRINA is human-discretion, queue leads for appointment booking
    for (const lead of leads) {
      try {
        // Get available slots first
        const slotsResponse = await fetch(
          `${this.baseUrl}/api/sabrina/book?leadId=${lead.id}&days=5`,
          { method: "GET" }
        );

        const slotsResult = await slotsResponse.json();

        if (slotsResult.success && slotsResult.slots?.length > 0) {
          results.push({
            leadId: lead.id,
            status: "queued",
            message: `Ready for appointment - ${slotsResult.slots.length} slots available`,
          });
        } else {
          results.push({
            leadId: lead.id,
            status: "skipped",
            message: "No available slots or lead not ready",
          });
        }
      } catch (error) {
        results.push({
          leadId: lead.id,
          status: "failed",
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.status === "queued").length;

    return {
      success: true,
      processedCount: leads.length,
      successCount,
      failedCount: results.filter((r) => r.status === "failed").length,
      details: results,
    };
  }

  /**
   * Execute manual stage - no agent assigned
   */
  private async executeManual(
    workflow: TeamWorkflow,
    stage: StageConfig,
    leads: Lead[]
  ): Promise<ExecutionResult> {
    // Manual stages just log for human review
    return {
      success: true,
      processedCount: leads.length,
      successCount: 0,
      failedCount: 0,
      details: leads.map((lead) => ({
        leadId: lead.id,
        status: "queued" as const,
        message: "Queued for manual review",
      })),
    };
  }

  /**
   * Get stage configuration by ID
   */
  getStageConfig(stageId: string): StageConfig | undefined {
    return DEFAULT_STAGES.find((s) => s.id === stageId);
  }

  /**
   * Determine next stage based on current stage and lead response
   */
  getNextStage(
    currentStageId: string,
    response: "no_response" | "positive" | "negative" | "opt_out"
  ): StageConfig | null {
    const currentIndex = DEFAULT_STAGES.findIndex((s) => s.id === currentStageId);
    if (currentIndex === -1) return null;

    switch (response) {
      case "positive":
        // Skip to book appointment
        return DEFAULT_STAGES.find((s) => s.id === "book_appt") || null;

      case "opt_out":
        // Remove from sequence
        return null;

      case "negative":
        // Move to nurture or end
        return DEFAULT_STAGES.find((s) => s.id === "content_nurture") || null;

      case "no_response":
      default:
        // Move to next stage in sequence
        if (currentIndex < DEFAULT_STAGES.length - 1) {
          return DEFAULT_STAGES[currentIndex + 1];
        }
        return null;
    }
  }
}

// Export singleton instance
export const stageExecutor = new WorkflowStageExecutor();

export default WorkflowStageExecutor;
