/**
 * Gianna Loop Engine
 *
 * Perpetual escalation loop engine for SMS follow-up sequences.
 * Uses Leslie Nielsen style progression from professional to absurd.
 *
 * Features:
 * - 10-step escalation sequence
 * - Configurable delays between steps
 * - Auto-pause at step 10
 * - Campaign restart capability
 * - Database persistence for tracking
 */

import smsGiannaLoop from "@/lib/templates/sms_gianna_loop.json";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_FROM_NUMBER = process.env.SIGNALHOUSE_FROM_NUMBER || "";

export interface LeadEscalationState {
  lead_id: string;
  campaign_id: string;
  phone: string;
  first_name: string;
  company_name: string;
  current_step: number;
  last_sent_at: string | null;
  is_paused: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendResult {
  success: boolean;
  message_id?: string;
  step_sent?: number;
  error?: string;
  is_loop_complete?: boolean;
}

export interface GiannaLoopConfig {
  delay_between_steps_hours: number;
  max_steps: number;
  pause_after_step: number;
  from_number?: string;
}

const DEFAULT_CONFIG: GiannaLoopConfig = {
  delay_between_steps_hours: 24,
  max_steps: 10,
  pause_after_step: 10,
  from_number: SIGNALHOUSE_FROM_NUMBER,
};

class GiannaLoopEngine {
  private config: GiannaLoopConfig;
  private templates: typeof smsGiannaLoop.templates;

  constructor(config: Partial<GiannaLoopConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.templates = smsGiannaLoop.templates;
  }

  /**
   * Replace template variables with actual lead data
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
    }
    return result;
  }

  /**
   * Get template for a specific step
   */
  getTemplateForStep(step: number): (typeof this.templates)[0] | null {
    return this.templates.find((t) => t.step === step) || null;
  }

  /**
   * Check if it's time to send the next message
   */
  isTimeToSend(lastSentAt: string | null): boolean {
    if (!lastSentAt) return true;

    const lastSent = new Date(lastSentAt);
    const now = new Date();
    const hoursSinceLastSent =
      (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastSent >= this.config.delay_between_steps_hours;
  }

  /**
   * Send next message in the escalation sequence
   */
  async sendNextMessage(state: LeadEscalationState): Promise<SendResult> {
    // Check if paused or completed
    if (state.is_paused || state.is_completed) {
      return {
        success: false,
        error: state.is_paused ? "Lead is paused" : "Sequence is complete",
      };
    }

    // Check if we've reached the max step
    if (state.current_step >= this.config.max_steps) {
      return {
        success: false,
        error: "Loop complete - max steps reached",
        is_loop_complete: true,
      };
    }

    // Check if it's time to send
    if (!this.isTimeToSend(state.last_sent_at)) {
      return {
        success: false,
        error: "Not time to send yet",
      };
    }

    // Get next step (current + 1, or 1 if starting fresh)
    const nextStep = state.current_step === 0 ? 1 : state.current_step + 1;
    const template = this.getTemplateForStep(nextStep);

    if (!template) {
      return {
        success: false,
        error: `No template found for step ${nextStep}`,
      };
    }

    // Build message with variables
    const messageText = this.replaceVariables(template.message, {
      first_name: state.first_name,
      company_name: state.company_name,
    });

    // Send via SignalHouse
    try {
      const response = await fetch(`${SIGNALHOUSE_API_BASE}/message/sendSMS`, {
        method: "POST",
        headers: {
          "x-api-key": SIGNALHOUSE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: state.phone,
          from: this.config.from_number,
          message: messageText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `SignalHouse error: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        message_id: data.messageId || data.id,
        step_sent: nextStep,
        is_loop_complete: nextStep >= this.config.pause_after_step,
      };
    } catch (error) {
      console.error("[Gianna Loop Engine] Send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      };
    }
  }

  /**
   * Process a batch of leads for the loop
   */
  async processLeadBatch(
    leads: LeadEscalationState[]
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    for (const lead of leads) {
      const result = await this.sendNextMessage(lead);
      results.set(lead.lead_id, result);

      // Small delay between sends to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Get loop status for a lead
   */
  getLoopStatus(state: LeadEscalationState): {
    current_step: number;
    max_steps: number;
    progress_percent: number;
    next_send_time: Date | null;
    is_complete: boolean;
    is_paused: boolean;
  } {
    const nextSendTime = state.last_sent_at
      ? new Date(
          new Date(state.last_sent_at).getTime() +
            this.config.delay_between_steps_hours * 60 * 60 * 1000
        )
      : null;

    return {
      current_step: state.current_step,
      max_steps: this.config.max_steps,
      progress_percent: (state.current_step / this.config.max_steps) * 100,
      next_send_time: nextSendTime,
      is_complete: state.is_completed || state.current_step >= this.config.max_steps,
      is_paused: state.is_paused,
    };
  }

  /**
   * Reset loop for campaign restart
   */
  resetLoop(state: LeadEscalationState): LeadEscalationState {
    return {
      ...state,
      current_step: 0,
      last_sent_at: null,
      is_paused: false,
      is_completed: false,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get all templates in the loop
   */
  getAllTemplates() {
    return this.templates;
  }

  /**
   * Preview a specific step's message with sample data
   */
  previewStep(
    step: number,
    variables: { first_name: string; company_name: string }
  ): string | null {
    const template = this.getTemplateForStep(step);
    if (!template) return null;
    return this.replaceVariables(template.message, variables);
  }
}

// Export singleton instance with default config
export const giannaLoopEngine = new GiannaLoopEngine();

// Export class for custom configurations
export { GiannaLoopEngine };
