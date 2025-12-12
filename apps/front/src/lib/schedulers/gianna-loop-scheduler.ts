/**
 * Gianna Loop Scheduler
 *
 * Cron-based scheduler for processing Gianna's perpetual escalation loop.
 * Runs periodically to send queued messages based on delay configurations.
 *
 * Usage:
 * - Initialize the scheduler on app start
 * - Scheduler checks every hour for leads ready for next message
 * - Respects 24-hour delay between messages
 * - Auto-pauses at step 10
 */

import {
  giannaLoopEngine,
  LeadEscalationState,
  SendResult,
} from "@/lib/engines/gianna-loop-engine";

interface SchedulerConfig {
  check_interval_minutes: number;
  batch_size: number;
  enabled: boolean;
}

interface SchedulerStats {
  last_run_at: string | null;
  next_run_at: string | null;
  total_processed_today: number;
  total_sent_today: number;
  total_errors_today: number;
  is_running: boolean;
}

interface QueuedLead extends LeadEscalationState {
  priority: number; // 1-5, higher = more priority
}

const DEFAULT_CONFIG: SchedulerConfig = {
  check_interval_minutes: 60, // Run every hour
  batch_size: 100, // Process up to 100 leads per run
  enabled: true,
};

class GiannaLoopScheduler {
  private config: SchedulerConfig;
  private stats: SchedulerStats;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      last_run_at: null,
      next_run_at: null,
      total_processed_today: 0,
      total_sent_today: 0,
      total_errors_today: 0,
      is_running: false,
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log("[Gianna Scheduler] Already running");
      return;
    }

    if (!this.config.enabled) {
      console.log("[Gianna Scheduler] Scheduler is disabled");
      return;
    }

    console.log(
      `[Gianna Scheduler] Starting - checking every ${this.config.check_interval_minutes} minutes`,
    );

    // Run immediately on start
    this.runScheduledJob();

    // Schedule recurring runs
    this.intervalId = setInterval(
      () => this.runScheduledJob(),
      this.config.check_interval_minutes * 60 * 1000,
    );

    this.updateNextRunTime();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[Gianna Scheduler] Stopped");
    }
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get scheduler stats
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Get scheduler config
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Update scheduler config
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if running to apply new interval
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  /**
   * Main scheduled job - fetches leads and processes them
   */
  private async runScheduledJob(): Promise<void> {
    if (this.isProcessing) {
      console.log("[Gianna Scheduler] Previous job still running, skipping");
      return;
    }

    this.isProcessing = true;
    this.stats.is_running = true;
    this.stats.last_run_at = new Date().toISOString();

    console.log(
      `[Gianna Scheduler] Running scheduled job at ${this.stats.last_run_at}`,
    );

    try {
      // Fetch leads ready for next message
      const leadsToProcess = await this.fetchQueuedLeads();

      if (leadsToProcess.length === 0) {
        console.log("[Gianna Scheduler] No leads ready for processing");
        return;
      }

      console.log(
        `[Gianna Scheduler] Processing ${leadsToProcess.length} leads`,
      );

      // Process each lead
      const results = await this.processLeads(leadsToProcess);

      // Update stats
      this.stats.total_processed_today += leadsToProcess.length;
      this.stats.total_sent_today += Array.from(results.values()).filter(
        (r) => r.success,
      ).length;
      this.stats.total_errors_today += Array.from(results.values()).filter(
        (r) => !r.success,
      ).length;

      // Log results summary
      const successful = Array.from(results.values()).filter(
        (r) => r.success,
      ).length;
      const failed = Array.from(results.values()).filter(
        (r) => !r.success,
      ).length;
      console.log(
        `[Gianna Scheduler] Completed: ${successful} sent, ${failed} failed`,
      );

      // Persist updated lead states to database
      await this.persistLeadStates(leadsToProcess, results);
    } catch (error) {
      console.error("[Gianna Scheduler] Job error:", error);
      this.stats.total_errors_today++;
    } finally {
      this.isProcessing = false;
      this.stats.is_running = false;
      this.updateNextRunTime();
    }
  }

  /**
   * Update next run time
   */
  private updateNextRunTime(): void {
    this.stats.next_run_at = new Date(
      Date.now() + this.config.check_interval_minutes * 60 * 1000,
    ).toISOString();
  }

  /**
   * Fetch leads that are ready for their next message
   * In production, this would query the database
   */
  private async fetchQueuedLeads(): Promise<QueuedLead[]> {
    // TODO: Replace with actual database query
    // Query should find leads where:
    // - is_paused = false
    // - is_completed = false
    // - current_step < max_steps
    // - last_sent_at is null OR (NOW() - last_sent_at) >= delay_hours

    // Mock implementation for demonstration
    const mockLeads: QueuedLead[] = [
      {
        lead_id: "lead-001",
        campaign_id: "campaign-001",
        phone: "+15551234567",
        first_name: "John",
        company_name: "Acme Corp",
        current_step: 3,
        last_sent_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        is_paused: false,
        is_completed: false,
        created_at: "2024-01-10T10:00:00Z",
        updated_at: "2024-01-14T10:00:00Z",
        priority: 3,
      },
      {
        lead_id: "lead-002",
        campaign_id: "campaign-001",
        phone: "+15559876543",
        first_name: "Sarah",
        company_name: "Tech Solutions",
        current_step: 1,
        last_sent_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), // 26 hours ago
        is_paused: false,
        is_completed: false,
        created_at: "2024-01-12T14:00:00Z",
        updated_at: "2024-01-14T14:00:00Z",
        priority: 5, // High priority
      },
    ];

    // Sort by priority (highest first)
    return mockLeads
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.batch_size);
  }

  /**
   * Process a batch of leads
   */
  private async processLeads(
    leads: QueuedLead[],
  ): Promise<Map<string, SendResult>> {
    const results = new Map<string, SendResult>();

    for (const lead of leads) {
      try {
        const result = await giannaLoopEngine.sendNextMessage(lead);
        results.set(lead.lead_id, result);

        // Update lead state if successful
        if (result.success && result.step_sent) {
          lead.current_step = result.step_sent;
          lead.last_sent_at = new Date().toISOString();
          lead.updated_at = new Date().toISOString();

          // Check if loop is complete
          if (result.is_loop_complete) {
            lead.is_completed = true;
          }
        }

        // Add delay between sends to avoid rate limiting
        await this.delay(500);
      } catch (error) {
        console.error(
          `[Gianna Scheduler] Error processing lead ${lead.lead_id}:`,
          error,
        );
        results.set(lead.lead_id, {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Persist updated lead states to database
   * In production, this would update the database
   */
  private async persistLeadStates(
    leads: QueuedLead[],
    results: Map<string, SendResult>,
  ): Promise<void> {
    // TODO: Replace with actual database update
    // Update each lead with new current_step, last_sent_at, is_completed

    for (const lead of leads) {
      const result = results.get(lead.lead_id);
      if (result?.success) {
        console.log(
          `[Gianna Scheduler] Updated lead ${lead.lead_id}: step ${lead.current_step}, completed: ${lead.is_completed}`,
        );
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset daily stats (call at midnight)
   */
  resetDailyStats(): void {
    this.stats.total_processed_today = 0;
    this.stats.total_sent_today = 0;
    this.stats.total_errors_today = 0;
    console.log("[Gianna Scheduler] Daily stats reset");
  }

  /**
   * Force run the scheduler immediately (for testing/manual triggers)
   */
  async forceRun(): Promise<{
    processed: number;
    sent: number;
    errors: number;
  }> {
    await this.runScheduledJob();
    return {
      processed: this.stats.total_processed_today,
      sent: this.stats.total_sent_today,
      errors: this.stats.total_errors_today,
    };
  }
}

// Export singleton instance
export const giannaLoopScheduler = new GiannaLoopScheduler();

// Export class for custom instances
export { GiannaLoopScheduler };

// Export types
export type { SchedulerConfig, SchedulerStats, QueuedLead };
