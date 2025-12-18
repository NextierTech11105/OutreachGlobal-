/**
 * SMS Queue Service
 * Handles drip campaign queue management with:
 * - Batch processing (250 per batch)
 * - Daily limits (2000 max)
 * - Scheduled sending windows
 * - Rate limiting
 * - Opt-out handling
 */

import { signalHouseService } from "./signalhouse-service";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueuedMessage {
  id: string;
  leadId: string;
  to: string;
  message: string;
  originalMessage?: string; // Store original for edit tracking
  templateId?: string;
  templateCategory?: string;
  variables: Record<string, string>;
  personality?: string;
  priority: number;
  scheduledAt?: Date;
  // Human-in-loop statuses: draft -> approved -> pending -> processing -> sent
  status:
    | "draft"
    | "approved"
    | "rejected"
    | "pending"
    | "processing"
    | "sent"
    | "failed"
    | "cancelled";
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  editedAt?: Date;
  editedBy?: string;
  sentAt?: Date;
  errorMessage?: string;
  campaignId?: string;
  batchId?: string;
  // Agent assignment (Gianna for SMS/B2B, Sabrina for Email/Residential)
  agent?: "gianna" | "sabrina";
}

export interface QueueConfig {
  batchSize: number;
  maxPerDay: number;
  maxPerHour: number;
  delayBetweenMessages: number; // ms
  delayBetweenBatches: number; // ms
  retryDelay: number; // ms
  maxRetries: number;
  scheduleHours: { start: number; end: number }; // 24hr format, e.g., { start: 9, end: 17 }
  scheduleDays: number[]; // 0=Sunday, 1=Monday, etc.
  timezone: string;
}

export interface QueueStats {
  // Human-in-loop statuses
  draft: number;
  approved: number;
  rejected: number;
  // Processing statuses
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  // Daily tracking
  sentToday: number;
  sentThisHour: number;
  remainingToday: number;
  nextBatchAt?: Date;
  isWithinSchedule: boolean;
  // Preview ready
  readyForPreview: number;
  readyForDeploy: number;
}

export interface BatchResult {
  batchId: string;
  sent: number;
  failed: number;
  duration: number;
  messages: Array<{
    id: string;
    to: string;
    status: "sent" | "failed";
    messageId?: string;
    error?: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: QueueConfig = {
  batchSize: 250,
  maxPerDay: 2000,
  maxPerHour: 500,
  delayBetweenMessages: 100, // 100ms between messages
  delayBetweenBatches: 30000, // 30 seconds between batches
  retryDelay: 60000, // 1 minute retry delay
  maxRetries: 3,
  scheduleHours: { start: 9, end: 17 }, // 9 AM to 5 PM
  scheduleDays: [1, 2, 3, 4, 5], // Monday to Friday
  timezone: "America/New_York",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMS QUEUE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SMSQueueService {
  private static instance: SMSQueueService;
  private queue: QueuedMessage[] = [];
  private config: QueueConfig = DEFAULT_CONFIG;
  private isProcessing = false;
  private sentToday = 0;
  private sentThisHour = 0;
  private lastHourReset = new Date();
  private lastDayReset = new Date();
  private optOutList: Set<string> = new Set();

  private constructor() {
    // Reset counters at appropriate intervals
    this.startCounterResets();
  }

  public static getInstance(): SMSQueueService {
    if (!SMSQueueService.instance) {
      SMSQueueService.instance = new SMSQueueService();
    }
    return SMSQueueService.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────

  public updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): QueueConfig {
    return { ...this.config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // QUEUE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a message to the queue
   */
  public addToQueue(
    message: Omit<QueuedMessage, "id" | "createdAt" | "status" | "attempts">,
  ): string {
    // Check if number is opted out
    if (this.optOutList.has(this.normalizePhone(message.to))) {
      console.log(`Skipping opted-out number: ${message.to}`);
      return "";
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      status: "pending",
      attempts: 0,
      maxAttempts: message.maxAttempts || this.config.maxRetries,
      createdAt: new Date(),
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(
      (m) => m.priority < queuedMessage.priority,
    );
    if (insertIndex === -1) {
      this.queue.push(queuedMessage);
    } else {
      this.queue.splice(insertIndex, 0, queuedMessage);
    }

    return id;
  }

  /**
   * Add multiple messages to the queue (for batch import from skip trace)
   */
  public addBatchToQueue(
    leads: Array<{
      leadId: string;
      phone: string;
      firstName: string;
      lastName?: string;
      companyName?: string;
      industry?: string;
    }>,
    options: {
      templateCategory: string;
      templateMessage: string;
      personality?: string;
      campaignId?: string;
      priority?: number;
      scheduledAt?: Date;
    },
  ): { added: number; skipped: number; queueIds: string[] } {
    const queueIds: string[] = [];
    let skipped = 0;

    for (const lead of leads) {
      // Skip if opted out
      if (this.optOutList.has(this.normalizePhone(lead.phone))) {
        skipped++;
        continue;
      }

      const variables: Record<string, string> = {
        firstName: lead.firstName,
        lastName: lead.lastName || "",
        companyName: lead.companyName || "",
        industry: lead.industry || "",
        fullName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
      };

      // Render message with variables
      const renderedMessage = this.renderTemplate(
        options.templateMessage,
        variables,
      );

      const id = this.addToQueue({
        leadId: lead.leadId,
        to: lead.phone,
        message: renderedMessage,
        templateCategory: options.templateCategory,
        variables,
        personality: options.personality,
        priority: options.priority || 5,
        scheduledAt: options.scheduledAt,
        maxAttempts: this.config.maxRetries,
        campaignId: options.campaignId,
      });

      if (id) {
        queueIds.push(id);
      } else {
        skipped++;
      }
    }

    return {
      added: queueIds.length,
      skipped,
      queueIds,
    };
  }

  /**
   * Remove a message from the queue
   */
  public removeFromQueue(messageId: string): boolean {
    const index = this.queue.findIndex((m) => m.id === messageId);
    if (index !== -1 && this.queue[index].status === "pending") {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Cancel all pending messages for a lead
   */
  public cancelLeadMessages(leadId: string): number {
    let cancelled = 0;
    this.queue.forEach((message) => {
      if (message.leadId === leadId && message.status === "pending") {
        message.status = "cancelled";
        cancelled++;
      }
    });
    return cancelled;
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    const now = new Date();
    const draftCount = this.queue.filter((m) => m.status === "draft").length;
    const approvedCount = this.queue.filter(
      (m) => m.status === "approved",
    ).length;

    const stats: QueueStats = {
      // Human-in-loop statuses
      draft: draftCount,
      approved: approvedCount,
      rejected: this.queue.filter((m) => m.status === "rejected").length,
      // Processing statuses
      pending: this.queue.filter((m) => m.status === "pending").length,
      processing: this.queue.filter((m) => m.status === "processing").length,
      sent: this.queue.filter((m) => m.status === "sent").length,
      failed: this.queue.filter((m) => m.status === "failed").length,
      cancelled: this.queue.filter((m) => m.status === "cancelled").length,
      // Daily tracking
      sentToday: this.sentToday,
      sentThisHour: this.sentThisHour,
      remainingToday: this.config.maxPerDay - this.sentToday,
      isWithinSchedule: this.isWithinSchedule(now),
      // Preview ready
      readyForPreview: draftCount,
      readyForDeploy: approvedCount,
    };

    // Calculate next batch time
    if (!stats.isWithinSchedule) {
      stats.nextBatchAt = this.getNextScheduledTime(now);
    }

    return stats;
  }

  /**
   * Get messages for a specific lead
   */
  public getLeadMessages(leadId: string): QueuedMessage[] {
    return this.queue.filter((m) => m.leadId === leadId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Process the next batch of messages
   */
  public async processBatch(): Promise<BatchResult | null> {
    if (this.isProcessing) {
      console.log("Already processing a batch");
      return null;
    }

    const now = new Date();

    // Check if within schedule
    if (!this.isWithinSchedule(now)) {
      console.log("Outside scheduled hours");
      return null;
    }

    // Check daily limit
    if (this.sentToday >= this.config.maxPerDay) {
      console.log("Daily limit reached");
      return null;
    }

    // Check hourly limit
    if (this.sentThisHour >= this.config.maxPerHour) {
      console.log("Hourly limit reached");
      return null;
    }

    // Get pending messages
    const pendingMessages = this.queue
      .filter(
        (m) =>
          m.status === "pending" && (!m.scheduledAt || m.scheduledAt <= now),
      )
      .slice(
        0,
        Math.min(
          this.config.batchSize,
          this.config.maxPerDay - this.sentToday,
          this.config.maxPerHour - this.sentThisHour,
        ),
      );

    if (pendingMessages.length === 0) {
      console.log("No pending messages");
      return null;
    }

    this.isProcessing = true;
    const batchId = `batch_${Date.now()}`;
    const startTime = Date.now();
    const results: BatchResult["messages"] = [];

    try {
      for (const message of pendingMessages) {
        message.status = "processing";
        message.batchId = batchId;
        message.attempts++;

        try {
          // Send via SignalHouse - pass campaignId as tag for tracking
          // SignalHouse stores all logs - query their API for reports
          const tags: string[] = [];
          if (message.campaignId) tags.push(`campaign:${message.campaignId}`);
          if (message.agent) tags.push(`agent:${message.agent}`);
          if (batchId) tags.push(`batch:${batchId}`);

          const response = await signalHouseService.sendSMS({
            to: message.to,
            message: message.message,
            tags: tags.length > 0 ? tags : undefined,
          });

          message.status = "sent";
          message.sentAt = new Date();
          this.sentToday++;
          this.sentThisHour++;

          results.push({
            id: message.id,
            to: message.to,
            status: "sent",
            messageId: response.messageId,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Check if we should retry
          if (message.attempts < message.maxAttempts) {
            message.status = "pending";
            message.scheduledAt = new Date(Date.now() + this.config.retryDelay);
          } else {
            message.status = "failed";
            message.errorMessage = errorMessage;
          }

          results.push({
            id: message.id,
            to: message.to,
            status: "failed",
            error: errorMessage,
          });
        }

        // Delay between messages
        if (this.config.delayBetweenMessages > 0) {
          await this.sleep(this.config.delayBetweenMessages);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return {
      batchId,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      duration: Date.now() - startTime,
      messages: results,
    };
  }

  /**
   * Start continuous batch processing
   */
  public startProcessing(): void {
    const processLoop = async () => {
      while (true) {
        const stats = this.getStats();

        if (
          stats.pending > 0 &&
          stats.isWithinSchedule &&
          stats.remainingToday > 0
        ) {
          await this.processBatch();
          await this.sleep(this.config.delayBetweenBatches);
        } else {
          // Check again in 1 minute
          await this.sleep(60000);
        }
      }
    };

    // Run in background (this would typically be in a worker/job queue)
    processLoop().catch((error) => {
      console.error("Queue processing error:", error);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HUMAN-IN-LOOP: PREVIEW, APPROVE, DEPLOY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get messages awaiting human review (draft status)
   */
  public getPreviewQueue(
    options: {
      limit?: number;
      campaignId?: string;
      agent?: "gianna" | "sabrina";
    } = {},
  ): QueuedMessage[] {
    let drafts = this.queue.filter((m) => m.status === "draft");

    if (options.campaignId) {
      drafts = drafts.filter((m) => m.campaignId === options.campaignId);
    }
    if (options.agent) {
      drafts = drafts.filter((m) => m.agent === options.agent);
    }

    // Sort by priority (high first) then created date
    drafts.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return options.limit ? drafts.slice(0, options.limit) : drafts;
  }

  /**
   * Get approved messages ready for deployment
   */
  public getApprovedQueue(
    options: {
      limit?: number;
      campaignId?: string;
    } = {},
  ): QueuedMessage[] {
    let approved = this.queue.filter((m) => m.status === "approved");

    if (options.campaignId) {
      approved = approved.filter((m) => m.campaignId === options.campaignId);
    }

    return options.limit ? approved.slice(0, options.limit) : approved;
  }

  /**
   * Approve messages for sending
   */
  public approveMessages(
    messageIds: string[],
    approvedBy: string,
  ): { approved: number; notFound: number } {
    let approved = 0;
    let notFound = 0;

    for (const id of messageIds) {
      const message = this.queue.find((m) => m.id === id);
      if (message && message.status === "draft") {
        message.status = "approved";
        message.approvedAt = new Date();
        message.approvedBy = approvedBy;
        approved++;
      } else {
        notFound++;
      }
    }

    return { approved, notFound };
  }

  /**
   * Approve all draft messages in a campaign
   */
  public approveAllInCampaign(campaignId: string, approvedBy: string): number {
    let approved = 0;
    this.queue.forEach((m) => {
      if (m.campaignId === campaignId && m.status === "draft") {
        m.status = "approved";
        m.approvedAt = new Date();
        m.approvedBy = approvedBy;
        approved++;
      }
    });
    return approved;
  }

  /**
   * Reject messages (won't be sent)
   */
  public rejectMessages(
    messageIds: string[],
    reason?: string,
  ): { rejected: number; notFound: number } {
    let rejected = 0;
    let notFound = 0;

    for (const id of messageIds) {
      const message = this.queue.find((m) => m.id === id);
      if (
        message &&
        (message.status === "draft" || message.status === "approved")
      ) {
        message.status = "rejected";
        if (reason) message.errorMessage = reason;
        rejected++;
      } else {
        notFound++;
      }
    }

    return { rejected, notFound };
  }

  /**
   * Edit a message before approval
   */
  public editMessage(
    messageId: string,
    newMessage: string,
    editedBy: string,
  ): boolean {
    const message = this.queue.find((m) => m.id === messageId);
    if (!message || !["draft", "approved"].includes(message.status)) {
      return false;
    }

    // Store original if not already stored
    if (!message.originalMessage) {
      message.originalMessage = message.message;
    }

    message.message = newMessage;
    message.editedAt = new Date();
    message.editedBy = editedBy;

    return true;
  }

  /**
   * Deploy approved messages (move to pending for processing)
   */
  public deployApproved(
    options: {
      campaignId?: string;
      limit?: number;
      scheduledAt?: Date;
    } = {},
  ): { deployed: number; ids: string[] } {
    let toDeply = this.queue.filter((m) => m.status === "approved");

    if (options.campaignId) {
      toDeply = toDeply.filter((m) => m.campaignId === options.campaignId);
    }

    if (options.limit) {
      toDeply = toDeply.slice(0, options.limit);
    }

    const ids: string[] = [];
    toDeply.forEach((m) => {
      m.status = "pending";
      if (options.scheduledAt) {
        m.scheduledAt = options.scheduledAt;
      }
      ids.push(m.id);
    });

    return { deployed: ids.length, ids };
  }

  /**
   * Add messages to queue as drafts (for human review)
   */
  public addToDraftQueue(
    leads: Array<{
      leadId: string;
      phone: string;
      firstName: string;
      lastName?: string;
      companyName?: string;
      industry?: string;
    }>,
    options: {
      templateCategory: string;
      templateMessage: string;
      personality?: string;
      campaignId?: string;
      priority?: number;
      agent?: "gianna" | "sabrina";
    },
  ): { added: number; skipped: number; queueIds: string[] } {
    const queueIds: string[] = [];
    let skipped = 0;

    for (const lead of leads) {
      // Skip if opted out
      if (this.optOutList.has(this.normalizePhone(lead.phone))) {
        skipped++;
        continue;
      }

      const variables: Record<string, string> = {
        firstName: lead.firstName,
        lastName: lead.lastName || "",
        companyName: lead.companyName || "",
        industry: lead.industry || "",
        fullName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
      };

      // Render message with variables
      const renderedMessage = this.renderTemplate(
        options.templateMessage,
        variables,
      );

      const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const queuedMessage: QueuedMessage = {
        id,
        leadId: lead.leadId,
        to: lead.phone,
        message: renderedMessage,
        templateCategory: options.templateCategory,
        variables,
        personality: options.personality,
        priority: options.priority || 5,
        status: "draft", // Start as draft for human review
        attempts: 0,
        maxAttempts: this.config.maxRetries,
        createdAt: new Date(),
        campaignId: options.campaignId,
        agent: options.agent || "gianna", // Default to Gianna for SMS
      };

      this.queue.push(queuedMessage);
      queueIds.push(id);
    }

    return { added: queueIds.length, skipped, queueIds };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OPT-OUT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a number to opt-out list
   */
  public addOptOut(phoneNumber: string): void {
    this.optOutList.add(this.normalizePhone(phoneNumber));

    // Cancel any pending messages to this number
    this.queue.forEach((message) => {
      if (
        this.normalizePhone(message.to) === this.normalizePhone(phoneNumber) &&
        message.status === "pending"
      ) {
        message.status = "cancelled";
      }
    });
  }

  /**
   * Remove a number from opt-out list
   */
  public removeOptOut(phoneNumber: string): void {
    this.optOutList.delete(this.normalizePhone(phoneNumber));
  }

  /**
   * Check if a number is opted out
   */
  public isOptedOut(phoneNumber: string): boolean {
    return this.optOutList.has(this.normalizePhone(phoneNumber));
  }

  /**
   * Get all opted-out numbers
   */
  public getOptOutList(): string[] {
    return Array.from(this.optOutList);
  }

  /**
   * Handle incoming STOP message
   */
  public handleStopMessage(from: string): void {
    this.addOptOut(from);
    console.log(`Opt-out recorded for: ${from}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").slice(-10);
  }

  private renderTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, "gi"), value);
      rendered = rendered.replace(new RegExp(`{${key}}`, "gi"), value);
    });
    return rendered;
  }

  private isWithinSchedule(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();

    const withinHours =
      hour >= this.config.scheduleHours.start &&
      hour < this.config.scheduleHours.end;

    const withinDays = this.config.scheduleDays.includes(day);

    return withinHours && withinDays;
  }

  private getNextScheduledTime(from: Date): Date {
    const next = new Date(from);

    // Find next valid day
    while (!this.config.scheduleDays.includes(next.getDay())) {
      next.setDate(next.getDate() + 1);
    }

    // Set to start hour
    next.setHours(this.config.scheduleHours.start, 0, 0, 0);

    // If we're past the start time today, check if we're still in window
    if (next <= from) {
      if (from.getHours() < this.config.scheduleHours.end) {
        return from; // We're in the window
      }
      // Move to next day
      next.setDate(next.getDate() + 1);
      while (!this.config.scheduleDays.includes(next.getDay())) {
        next.setDate(next.getDate() + 1);
      }
      next.setHours(this.config.scheduleHours.start, 0, 0, 0);
    }

    return next;
  }

  private startCounterResets(): void {
    // Check every minute for counter resets
    setInterval(() => {
      const now = new Date();

      // Reset hourly counter
      if (now.getHours() !== this.lastHourReset.getHours()) {
        this.sentThisHour = 0;
        this.lastHourReset = now;
      }

      // Reset daily counter at midnight
      if (now.getDate() !== this.lastDayReset.getDate()) {
        this.sentToday = 0;
        this.lastDayReset = now;
      }
    }, 60000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORTING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get batch history
   */
  public getBatchHistory(limit = 10): Array<{
    batchId: string;
    sentAt: Date;
    count: number;
    successRate: number;
  }> {
    const batches = new Map<
      string,
      { sent: number; failed: number; sentAt: Date }
    >();

    this.queue
      .filter(
        (m) => m.batchId && (m.status === "sent" || m.status === "failed"),
      )
      .forEach((m) => {
        const batch = batches.get(m.batchId!) || {
          sent: 0,
          failed: 0,
          sentAt: m.sentAt || m.createdAt,
        };
        if (m.status === "sent") batch.sent++;
        if (m.status === "failed") batch.failed++;
        batches.set(m.batchId!, batch);
      });

    return Array.from(batches.entries())
      .map(([batchId, data]) => ({
        batchId,
        sentAt: data.sentAt,
        count: data.sent + data.failed,
        successRate: data.sent / (data.sent + data.failed),
      }))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
  }

  /**
   * Export queue for persistence
   */
  public exportQueue(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Import queue from persistence
   */
  public importQueue(messages: QueuedMessage[]): void {
    this.queue = messages.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      sentAt: m.sentAt ? new Date(m.sentAt) : undefined,
      scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : undefined,
    }));
  }

  /**
   * Clear completed/failed messages older than specified days
   */
  public cleanup(olderThanDays = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const initialLength = this.queue.length;
    this.queue = this.queue.filter(
      (m) =>
        m.status === "pending" ||
        m.status === "processing" ||
        m.createdAt > cutoff,
    );

    return initialLength - this.queue.length;
  }
}

// Export singleton instance
export const smsQueueService = SMSQueueService.getInstance();
