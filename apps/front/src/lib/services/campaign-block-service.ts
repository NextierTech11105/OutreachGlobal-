/**
 * CAMPAIGN BLOCK SERVICE
 * ======================
 * Manages the core 10K execution pattern for SMS campaigns.
 *
 * Core Execution Pattern:
 * - 2,000 leads per campaign block
 * - 5 touches per lead max (Touch 1 → Touch 5)
 * - 10,000 sends per block (2K × 5)
 * - PAUSE & PIVOT at block completion
 * - Capture metrics, then REPEAT
 *
 * Lead Exhaustion Rule:
 * After 5 touches with NO CONTACT → Auto-pivot that lead:
 * 1. Push to Call Queue (Gianna)
 * 2. Push to Email Sequence
 * 3. Archive (cold bucket)
 *
 * This is the NUMBERS GAME - systematic multi-touch sequences
 * with human-in-loop approval at every step.
 *
 * Architecture:
 * - Nextier Team = SignalHouse SubGroup (1:1)
 * - Like Perplexity/Lovable piggybacking on OpenAI, we piggyback on SignalHouse
 */

import { db } from "@/lib/db";
import { redis, isRedisAvailable } from "@/lib/redis";
import { eq, and, lt, sql, desc, asc, count } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (Matching ml-predictions.schema.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export type CampaignBlockStatus =
  | "preparing" // Loading leads
  | "active" // Executing touches
  | "paused" // Manually paused
  | "completed" // All 10K sends done
  | "pivoted"; // Pivoted to next campaign/channel

export type TouchStatus = "pending" | "sent" | "delivered" | "failed";

export type ReplyIntent =
  | "positive"
  | "negative"
  | "question"
  | "opt_out"
  | null;

export type PivotTarget =
  | "call_queue"
  | "email_sequence"
  | "archive"
  | "next_campaign";

/**
 * Campaign Block configuration
 */
export interface BlockConfig {
  maxLeads: number; // Default: 2000
  maxTouchesPerLead: number; // Default: 5
  targetSends: number; // Default: 10000 (2000 × 5)
  delayBetweenTouchesHours: number; // Default: 24 (1 day between touches)
}

/**
 * Campaign Block metrics
 */
export interface BlockMetrics {
  // Delivery
  total_sent: number;
  total_delivered: number;
  delivery_rate: number;

  // Engagement
  total_replies: number;
  positive_replies: number;
  negative_replies: number;
  reply_rate: number;
  positive_rate: number;

  // Conversions
  emails_captured: number;
  calls_scheduled: number;
  meetings_booked: number;

  // Suppression
  opt_outs: number;
  wrong_numbers: number;
  opt_out_rate: number;

  // By touch (1-5)
  by_touch: Array<{
    touch: number;
    sent: number;
    delivered: number;
    replies: number;
    conversions: number;
  }>;

  // Cost
  total_cost_cents: number;
  cost_per_reply_cents: number;
  cost_per_conversion_cents: number;
}

/**
 * Lead touch record
 */
export interface LeadTouchRecord {
  id: string;
  leadId: string;
  campaignBlockId: string;
  touchNumber: number;
  channel: "sms" | "email" | "call";
  templateId?: string;
  messageId?: string;
  status: TouchStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  replied: boolean;
  repliedAt?: Date;
  replyIntent?: ReplyIntent;
  shouldPivot: boolean;
  createdAt: Date;
}

/**
 * Campaign block record
 */
export interface CampaignBlockRecord {
  id: string;
  teamId: string;
  campaignId: string;
  campaignName?: string;
  blockNumber: number;
  maxLeads: number;
  maxTouchesPerLead: number;
  targetSends: number;
  leadsLoaded: number;
  totalTouches: number;
  currentTouch: number;
  status: CampaignBlockStatus;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  pivotedAt?: Date;
  pivotTo?: string;
  pivotReason?: string;
  metrics?: BlockMetrics;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lead with touch status
 */
export interface LeadTouchStatus {
  leadId: string;
  touchCount: number;
  lastTouchAt?: Date;
  lastReplyAt?: Date;
  hasReplied: boolean;
  replyIntent?: ReplyIntent;
  shouldPivot: boolean;
  nextTouchEligible: boolean;
  nextTouchAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCK_CACHE_PREFIX = "campaign_block:";
const TOUCH_CACHE_PREFIX = "lead_touch:";
const ACTIVE_BLOCKS_KEY = "campaign_blocks:active";

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_BLOCK_CONFIG: BlockConfig = {
  maxLeads: 2000,
  maxTouchesPerLead: 5,
  targetSends: 10000, // 2000 × 5
  delayBetweenTouchesHours: 24, // 1 day between touches
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN BLOCK SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class CampaignBlockService {
  private static instance: CampaignBlockService;
  private config: BlockConfig = DEFAULT_BLOCK_CONFIG;
  private redisAvailable = false;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  /**
   * Initialize service
   */
  private async initialize(): Promise<void> {
    try {
      this.redisAvailable = isRedisAvailable();
      this.initialized = true;
      console.log("[CampaignBlock] Service initialized");
    } catch (error) {
      console.error("[CampaignBlock] Initialization error:", error);
      this.initialized = true;
    }
  }

  public static getInstance(): CampaignBlockService {
    if (!CampaignBlockService.instance) {
      CampaignBlockService.instance = new CampaignBlockService();
    }
    return CampaignBlockService.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────

  public updateConfig(config: Partial<BlockConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): BlockConfig {
    return { ...this.config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CAMPAIGN BLOCK MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new campaign block
   * Each block contains up to 2000 leads with 5 touches each = 10K sends
   */
  public async createBlock(options: {
    teamId: string;
    campaignId: string;
    campaignName?: string;
    blockNumber?: number;
    config?: Partial<BlockConfig>;
  }): Promise<CampaignBlockRecord> {
    const blockConfig = { ...this.config, ...options.config };

    // Generate block ID
    const blockId = `cblk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get next block number if not provided
    let blockNumber = options.blockNumber;
    if (!blockNumber) {
      const existingBlocks = await this.getBlocksForCampaign(
        options.teamId,
        options.campaignId,
      );
      blockNumber = existingBlocks.length + 1;
    }

    const block: CampaignBlockRecord = {
      id: blockId,
      teamId: options.teamId,
      campaignId: options.campaignId,
      campaignName: options.campaignName,
      blockNumber,
      maxLeads: blockConfig.maxLeads,
      maxTouchesPerLead: blockConfig.maxTouchesPerLead,
      targetSends: blockConfig.targetSends,
      leadsLoaded: 0,
      totalTouches: 0,
      currentTouch: 1,
      status: "preparing",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Cache in Redis
    await this.cacheBlock(block);

    console.log(
      `[CampaignBlock] Created block ${blockId} for campaign ${options.campaignId}`,
    );

    return block;
  }

  /**
   * Add leads to a campaign block
   */
  public async addLeadsToBlock(
    blockId: string,
    leadIds: string[],
  ): Promise<{ added: number; skipped: number; full: boolean }> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    if (block.status !== "preparing") {
      throw new Error(`Block ${blockId} is not in preparing state`);
    }

    const remainingCapacity = block.maxLeads - block.leadsLoaded;
    const leadsToAdd = leadIds.slice(0, remainingCapacity);
    const skipped = leadIds.length - leadsToAdd.length;

    // Create initial touch records for each lead
    for (const leadId of leadsToAdd) {
      await this.createInitialTouch(blockId, leadId, block.teamId);
    }

    // Update block
    block.leadsLoaded += leadsToAdd.length;
    block.updatedAt = new Date();

    await this.cacheBlock(block);

    const full = block.leadsLoaded >= block.maxLeads;

    console.log(
      `[CampaignBlock] Added ${leadsToAdd.length} leads to block ${blockId}. ` +
        `Total: ${block.leadsLoaded}/${block.maxLeads}`,
    );

    return {
      added: leadsToAdd.length,
      skipped,
      full,
    };
  }

  /**
   * Start a campaign block (move from preparing to active)
   */
  public async startBlock(blockId: string): Promise<CampaignBlockRecord> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    if (block.status !== "preparing") {
      throw new Error(`Block ${blockId} is not in preparing state`);
    }

    if (block.leadsLoaded === 0) {
      throw new Error(`Block ${blockId} has no leads loaded`);
    }

    block.status = "active";
    block.startedAt = new Date();
    block.updatedAt = new Date();

    await this.cacheBlock(block);
    await this.addToActiveBlocks(blockId);

    console.log(
      `[CampaignBlock] Started block ${blockId} with ${block.leadsLoaded} leads`,
    );

    return block;
  }

  /**
   * Pause a campaign block
   */
  public async pauseBlock(blockId: string): Promise<CampaignBlockRecord> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    if (block.status !== "active") {
      throw new Error(`Block ${blockId} is not active`);
    }

    block.status = "paused";
    block.pausedAt = new Date();
    block.updatedAt = new Date();

    await this.cacheBlock(block);
    await this.removeFromActiveBlocks(blockId);

    console.log(`[CampaignBlock] Paused block ${blockId}`);

    return block;
  }

  /**
   * Resume a paused campaign block
   */
  public async resumeBlock(blockId: string): Promise<CampaignBlockRecord> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    if (block.status !== "paused") {
      throw new Error(`Block ${blockId} is not paused`);
    }

    block.status = "active";
    block.pausedAt = undefined;
    block.updatedAt = new Date();

    await this.cacheBlock(block);
    await this.addToActiveBlocks(blockId);

    console.log(`[CampaignBlock] Resumed block ${blockId}`);

    return block;
  }

  /**
   * Complete a campaign block
   */
  public async completeBlock(
    blockId: string,
    metrics?: Partial<BlockMetrics>,
  ): Promise<CampaignBlockRecord> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    block.status = "completed";
    block.completedAt = new Date();
    block.updatedAt = new Date();

    // Calculate final metrics
    if (metrics) {
      block.metrics = this.calculateBlockMetrics(block, metrics);
    } else {
      block.metrics = await this.computeBlockMetrics(blockId);
    }

    await this.cacheBlock(block);
    await this.removeFromActiveBlocks(blockId);

    console.log(
      `[CampaignBlock] Completed block ${blockId}. ` +
        `Sent: ${block.totalTouches}/${block.targetSends}`,
    );

    return block;
  }

  /**
   * Pivot a campaign block to next phase
   */
  public async pivotBlock(
    blockId: string,
    pivotTo: PivotTarget,
    reason?: string,
  ): Promise<CampaignBlockRecord> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    block.status = "pivoted";
    block.pivotedAt = new Date();
    block.pivotTo = pivotTo;
    block.pivotReason = reason;
    block.updatedAt = new Date();

    // Calculate final metrics before pivot
    block.metrics = await this.computeBlockMetrics(blockId);

    await this.cacheBlock(block);
    await this.removeFromActiveBlocks(blockId);

    console.log(
      `[CampaignBlock] Pivoted block ${blockId} to ${pivotTo}. Reason: ${reason}`,
    );

    return block;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOUCH MANAGEMENT (The 5-Touch Rule)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create initial touch record for a lead
   */
  private async createInitialTouch(
    blockId: string,
    leadId: string,
    teamId: string,
  ): Promise<LeadTouchRecord> {
    const touchId = `ltch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const touch: LeadTouchRecord = {
      id: touchId,
      leadId,
      campaignBlockId: blockId,
      touchNumber: 1,
      channel: "sms",
      status: "pending",
      replied: false,
      shouldPivot: false,
      createdAt: new Date(),
    };

    await this.cacheTouch(touch);

    return touch;
  }

  /**
   * Record a touch being sent
   */
  public async recordTouchSent(options: {
    blockId: string;
    leadId: string;
    touchNumber: number;
    templateId?: string;
    messageId?: string;
  }): Promise<LeadTouchRecord> {
    const touchKey = this.getTouchKey(
      options.blockId,
      options.leadId,
      options.touchNumber,
    );
    let touch = await this.getTouch(touchKey);

    if (!touch) {
      // Create new touch record
      const touchId = `ltch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      touch = {
        id: touchId,
        leadId: options.leadId,
        campaignBlockId: options.blockId,
        touchNumber: options.touchNumber,
        channel: "sms",
        templateId: options.templateId,
        messageId: options.messageId,
        status: "sent",
        sentAt: new Date(),
        replied: false,
        shouldPivot: false,
        createdAt: new Date(),
      };
    } else {
      touch.templateId = options.templateId;
      touch.messageId = options.messageId;
      touch.status = "sent";
      touch.sentAt = new Date();
    }

    await this.cacheTouch(touch);

    // Update block touch count
    const block = await this.getBlock(options.blockId);
    if (block) {
      block.totalTouches++;
      block.currentTouch = Math.max(block.currentTouch, options.touchNumber);
      block.updatedAt = new Date();
      await this.cacheBlock(block);

      // Check if block is complete
      if (block.totalTouches >= block.targetSends) {
        await this.completeBlock(options.blockId);
      }
    }

    console.log(
      `[CampaignBlock] Touch ${options.touchNumber} sent for lead ${options.leadId}`,
    );

    return touch;
  }

  /**
   * Record a touch delivery confirmation
   */
  public async recordTouchDelivered(options: {
    blockId: string;
    leadId: string;
    touchNumber: number;
    messageId: string;
  }): Promise<LeadTouchRecord | null> {
    const touchKey = this.getTouchKey(
      options.blockId,
      options.leadId,
      options.touchNumber,
    );
    const touch = await this.getTouch(touchKey);

    if (!touch) {
      console.warn(`[CampaignBlock] Touch not found for delivery: ${touchKey}`);
      return null;
    }

    touch.status = "delivered";
    touch.deliveredAt = new Date();

    await this.cacheTouch(touch);

    return touch;
  }

  /**
   * Record a reply to a touch
   */
  public async recordReply(options: {
    blockId: string;
    leadId: string;
    touchNumber: number;
    intent: ReplyIntent;
  }): Promise<LeadTouchRecord | null> {
    const touchKey = this.getTouchKey(
      options.blockId,
      options.leadId,
      options.touchNumber,
    );
    const touch = await this.getTouch(touchKey);

    if (!touch) {
      console.warn(`[CampaignBlock] Touch not found for reply: ${touchKey}`);
      return null;
    }

    touch.replied = true;
    touch.repliedAt = new Date();
    touch.replyIntent = options.intent;

    // If replied (any intent), don't continue touching this lead
    // Positive/question = nurture, Negative/opt_out = stop
    touch.shouldPivot = true;

    await this.cacheTouch(touch);

    console.log(
      `[CampaignBlock] Reply recorded for lead ${options.leadId}, ` +
        `touch ${options.touchNumber}, intent: ${options.intent}`,
    );

    return touch;
  }

  /**
   * Get lead's current touch status
   */
  public async getLeadTouchStatus(
    blockId: string,
    leadId: string,
  ): Promise<LeadTouchStatus> {
    const touches: LeadTouchRecord[] = [];

    // Get all touches for this lead in this block
    for (let i = 1; i <= this.config.maxTouchesPerLead; i++) {
      const touchKey = this.getTouchKey(blockId, leadId, i);
      const touch = await this.getTouch(touchKey);
      if (touch) {
        touches.push(touch);
      }
    }

    const touchCount = touches.length;
    const lastTouch = touches[touches.length - 1];
    const replied = touches.some((t) => t.replied);
    const replyIntent = touches.find((t) => t.replied)?.replyIntent;

    // Should pivot if:
    // 1. Already replied (any intent)
    // 2. Hit 5 touches with no reply
    const shouldPivot = replied || touchCount >= this.config.maxTouchesPerLead;

    // Next touch eligible if:
    // 1. Haven't replied
    // 2. Haven't hit max touches
    // 3. Enough time since last touch
    const nextTouchEligible =
      !shouldPivot && touchCount < this.config.maxTouchesPerLead;

    // Calculate next touch time
    let nextTouchAt: Date | undefined;
    if (nextTouchEligible && lastTouch?.sentAt) {
      nextTouchAt = new Date(
        lastTouch.sentAt.getTime() +
          this.config.delayBetweenTouchesHours * 60 * 60 * 1000,
      );
    }

    return {
      leadId,
      touchCount,
      lastTouchAt: lastTouch?.sentAt,
      lastReplyAt: touches.find((t) => t.replied)?.repliedAt,
      hasReplied: replied,
      replyIntent,
      shouldPivot,
      nextTouchEligible,
      nextTouchAt,
    };
  }

  /**
   * Get leads ready for next touch
   * Returns leads that:
   * 1. Haven't hit max touches
   * 2. Haven't replied
   * 3. Delay since last touch has passed
   */
  public async getLeadsForNextTouch(
    blockId: string,
    limit: number = 250,
  ): Promise<Array<{ leadId: string; nextTouchNumber: number }>> {
    const block = await this.getBlock(blockId);
    if (!block || block.status !== "active") {
      return [];
    }

    const eligibleLeads: Array<{ leadId: string; nextTouchNumber: number }> =
      [];
    const now = new Date();
    const delayMs = this.config.delayBetweenTouchesHours * 60 * 60 * 1000;

    // This is a simplified version - in production, this would query the database
    // For now, we use Redis to track touch state
    // TODO: Integrate with database for durable touch tracking

    // Get all leads from the block's touch cache
    if (this.redisAvailable) {
      const pattern = `${TOUCH_CACHE_PREFIX}${blockId}:*:1`;
      // Note: In production, use SCAN instead of KEYS
      try {
        const keys = await redis.keys(pattern);
        for (const key of keys.slice(0, limit * 2)) {
          // Get double to account for filtering
          const parts = key.split(":");
          const leadId = parts[2];

          const status = await this.getLeadTouchStatus(blockId, leadId);

          if (
            status.nextTouchEligible &&
            (!status.nextTouchAt || status.nextTouchAt <= now)
          ) {
            eligibleLeads.push({
              leadId,
              nextTouchNumber: status.touchCount + 1,
            });

            if (eligibleLeads.length >= limit) break;
          }
        }
      } catch (error) {
        console.error(
          "[CampaignBlock] Error getting leads for next touch:",
          error,
        );
      }
    }

    return eligibleLeads;
  }

  /**
   * Get leads that should be pivoted (exhausted or replied)
   */
  public async getLeadsToPivot(
    blockId: string,
    limit: number = 100,
  ): Promise<
    Array<{
      leadId: string;
      reason: "exhausted" | "replied_positive" | "replied_negative" | "opt_out";
      touchCount: number;
      replyIntent?: ReplyIntent;
    }>
  > {
    const pivotLeads: Array<{
      leadId: string;
      reason: "exhausted" | "replied_positive" | "replied_negative" | "opt_out";
      touchCount: number;
      replyIntent?: ReplyIntent;
    }> = [];

    // Similar pattern - query Redis for leads in this block
    if (this.redisAvailable) {
      const pattern = `${TOUCH_CACHE_PREFIX}${blockId}:*:1`;
      try {
        const keys = await redis.keys(pattern);
        for (const key of keys) {
          const parts = key.split(":");
          const leadId = parts[2];

          const status = await this.getLeadTouchStatus(blockId, leadId);

          if (status.shouldPivot) {
            let reason:
              | "exhausted"
              | "replied_positive"
              | "replied_negative"
              | "opt_out";

            if (status.replyIntent === "opt_out") {
              reason = "opt_out";
            } else if (
              status.replyIntent === "positive" ||
              status.replyIntent === "question"
            ) {
              reason = "replied_positive";
            } else if (status.replyIntent === "negative") {
              reason = "replied_negative";
            } else {
              reason = "exhausted";
            }

            pivotLeads.push({
              leadId,
              reason,
              touchCount: status.touchCount,
              replyIntent: status.replyIntent,
            });

            if (pivotLeads.length >= limit) break;
          }
        }
      } catch (error) {
        console.error("[CampaignBlock] Error getting leads to pivot:", error);
      }
    }

    return pivotLeads;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Calculate block metrics from touch data
   */
  private calculateBlockMetrics(
    block: CampaignBlockRecord,
    partial?: Partial<BlockMetrics>,
  ): BlockMetrics {
    const defaults: BlockMetrics = {
      total_sent: block.totalTouches,
      total_delivered: 0,
      delivery_rate: 0,
      total_replies: 0,
      positive_replies: 0,
      negative_replies: 0,
      reply_rate: 0,
      positive_rate: 0,
      emails_captured: 0,
      calls_scheduled: 0,
      meetings_booked: 0,
      opt_outs: 0,
      wrong_numbers: 0,
      opt_out_rate: 0,
      by_touch: [],
      total_cost_cents: 0,
      cost_per_reply_cents: 0,
      cost_per_conversion_cents: 0,
    };

    const metrics = { ...defaults, ...partial };

    // Calculate rates
    if (metrics.total_sent > 0) {
      metrics.delivery_rate = metrics.total_delivered / metrics.total_sent;
      metrics.reply_rate = metrics.total_replies / metrics.total_sent;
      metrics.opt_out_rate = metrics.opt_outs / metrics.total_sent;
    }

    if (metrics.total_replies > 0) {
      metrics.positive_rate = metrics.positive_replies / metrics.total_replies;
      metrics.cost_per_reply_cents =
        metrics.total_cost_cents / metrics.total_replies;
    }

    const totalConversions =
      metrics.emails_captured +
      metrics.calls_scheduled +
      metrics.meetings_booked;
    if (totalConversions > 0) {
      metrics.cost_per_conversion_cents =
        metrics.total_cost_cents / totalConversions;
    }

    return metrics;
  }

  /**
   * Compute block metrics from touch records
   */
  private async computeBlockMetrics(blockId: string): Promise<BlockMetrics> {
    const metrics: BlockMetrics = {
      total_sent: 0,
      total_delivered: 0,
      delivery_rate: 0,
      total_replies: 0,
      positive_replies: 0,
      negative_replies: 0,
      reply_rate: 0,
      positive_rate: 0,
      emails_captured: 0,
      calls_scheduled: 0,
      meetings_booked: 0,
      opt_outs: 0,
      wrong_numbers: 0,
      opt_out_rate: 0,
      by_touch: [],
      total_cost_cents: 0,
      cost_per_reply_cents: 0,
      cost_per_conversion_cents: 0,
    };

    // Initialize by_touch array
    for (let i = 1; i <= this.config.maxTouchesPerLead; i++) {
      metrics.by_touch.push({
        touch: i,
        sent: 0,
        delivered: 0,
        replies: 0,
        conversions: 0,
      });
    }

    // Aggregate from Redis touch cache
    // TODO: In production, this would query the database
    if (this.redisAvailable) {
      try {
        const pattern = `${TOUCH_CACHE_PREFIX}${blockId}:*`;
        const keys = await redis.keys(pattern);

        for (const key of keys) {
          const touch = await redis.get<LeadTouchRecord>(key);
          if (!touch) continue;

          const touchIdx = touch.touchNumber - 1;
          if (touchIdx < 0 || touchIdx >= this.config.maxTouchesPerLead)
            continue;

          if (
            touch.status === "sent" ||
            touch.status === "delivered" ||
            touch.status === "failed"
          ) {
            metrics.total_sent++;
            metrics.by_touch[touchIdx].sent++;
          }

          if (touch.status === "delivered") {
            metrics.total_delivered++;
            metrics.by_touch[touchIdx].delivered++;
          }

          if (touch.replied) {
            metrics.total_replies++;
            metrics.by_touch[touchIdx].replies++;

            if (
              touch.replyIntent === "positive" ||
              touch.replyIntent === "question"
            ) {
              metrics.positive_replies++;
            } else if (touch.replyIntent === "negative") {
              metrics.negative_replies++;
            } else if (touch.replyIntent === "opt_out") {
              metrics.opt_outs++;
            }
          }
        }
      } catch (error) {
        console.error("[CampaignBlock] Error computing metrics:", error);
      }
    }

    // Calculate rates
    return this.calculateBlockMetrics(
      { totalTouches: metrics.total_sent } as CampaignBlockRecord,
      metrics,
    );
  }

  /**
   * Get block progress percentage
   */
  public async getBlockProgress(blockId: string): Promise<{
    percentage: number;
    sent: number;
    target: number;
    currentTouch: number;
    leadsLoaded: number;
    leadsRemaining: number;
    leadsReplied: number;
    leadsPivoted: number;
  }> {
    const block = await this.getBlock(blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    // Get aggregated status
    const metrics = await this.computeBlockMetrics(blockId);
    const pivotLeads = await this.getLeadsToPivot(blockId, 10000);

    const leadsReplied = pivotLeads.filter(
      (l) => l.reason !== "exhausted",
    ).length;
    const leadsPivoted = pivotLeads.length;
    const leadsRemaining = block.leadsLoaded - leadsPivoted;

    return {
      percentage: Math.min(
        100,
        Math.round((block.totalTouches / block.targetSends) * 100),
      ),
      sent: block.totalTouches,
      target: block.targetSends,
      currentTouch: block.currentTouch,
      leadsLoaded: block.leadsLoaded,
      leadsRemaining,
      leadsReplied,
      leadsPivoted,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get a campaign block by ID
   */
  public async getBlock(blockId: string): Promise<CampaignBlockRecord | null> {
    if (this.redisAvailable) {
      try {
        const cached = await redis.get<CampaignBlockRecord>(
          `${BLOCK_CACHE_PREFIX}${blockId}`,
        );
        if (cached) {
          // Parse dates
          return {
            ...cached,
            createdAt: new Date(cached.createdAt),
            updatedAt: new Date(cached.updatedAt),
            startedAt: cached.startedAt
              ? new Date(cached.startedAt)
              : undefined,
            completedAt: cached.completedAt
              ? new Date(cached.completedAt)
              : undefined,
            pausedAt: cached.pausedAt ? new Date(cached.pausedAt) : undefined,
            pivotedAt: cached.pivotedAt
              ? new Date(cached.pivotedAt)
              : undefined,
          };
        }
      } catch (error) {
        console.error("[CampaignBlock] Error getting block from cache:", error);
      }
    }
    return null;
  }

  /**
   * Get all blocks for a campaign
   */
  public async getBlocksForCampaign(
    teamId: string,
    campaignId: string,
  ): Promise<CampaignBlockRecord[]> {
    const blocks: CampaignBlockRecord[] = [];

    if (this.redisAvailable) {
      try {
        const pattern = `${BLOCK_CACHE_PREFIX}cblk_*`;
        const keys = await redis.keys(pattern);

        for (const key of keys) {
          const block = await redis.get<CampaignBlockRecord>(key);
          if (
            block &&
            block.teamId === teamId &&
            block.campaignId === campaignId
          ) {
            blocks.push({
              ...block,
              createdAt: new Date(block.createdAt),
              updatedAt: new Date(block.updatedAt),
              startedAt: block.startedAt
                ? new Date(block.startedAt)
                : undefined,
              completedAt: block.completedAt
                ? new Date(block.completedAt)
                : undefined,
              pausedAt: block.pausedAt ? new Date(block.pausedAt) : undefined,
              pivotedAt: block.pivotedAt
                ? new Date(block.pivotedAt)
                : undefined,
            });
          }
        }
      } catch (error) {
        console.error(
          "[CampaignBlock] Error getting blocks for campaign:",
          error,
        );
      }
    }

    // Sort by block number
    return blocks.sort((a, b) => a.blockNumber - b.blockNumber);
  }

  /**
   * Get all active blocks for a team
   */
  public async getActiveBlocks(teamId: string): Promise<CampaignBlockRecord[]> {
    const blocks: CampaignBlockRecord[] = [];

    if (this.redisAvailable) {
      try {
        const activeIds = await redis.smembers(ACTIVE_BLOCKS_KEY);

        for (const blockId of activeIds) {
          const block = await this.getBlock(blockId);
          if (block && block.teamId === teamId && block.status === "active") {
            blocks.push(block);
          }
        }
      } catch (error) {
        console.error("[CampaignBlock] Error getting active blocks:", error);
      }
    }

    return blocks;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CACHE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async cacheBlock(block: CampaignBlockRecord): Promise<void> {
    if (!this.redisAvailable) return;
    try {
      await redis.set(
        `${BLOCK_CACHE_PREFIX}${block.id}`,
        JSON.stringify(block),
        { ex: 86400 * 30 }, // 30 days TTL
      );
    } catch (error) {
      console.error("[CampaignBlock] Error caching block:", error);
    }
  }

  private async cacheTouch(touch: LeadTouchRecord): Promise<void> {
    if (!this.redisAvailable) return;
    try {
      const key = this.getTouchKey(
        touch.campaignBlockId,
        touch.leadId,
        touch.touchNumber,
      );
      await redis.set(key, JSON.stringify(touch), { ex: 86400 * 30 }); // 30 days TTL
    } catch (error) {
      console.error("[CampaignBlock] Error caching touch:", error);
    }
  }

  private async getTouch(key: string): Promise<LeadTouchRecord | null> {
    if (!this.redisAvailable) return null;
    try {
      const cached = await redis.get<LeadTouchRecord>(key);
      if (cached) {
        return {
          ...cached,
          createdAt: new Date(cached.createdAt),
          sentAt: cached.sentAt ? new Date(cached.sentAt) : undefined,
          deliveredAt: cached.deliveredAt
            ? new Date(cached.deliveredAt)
            : undefined,
          repliedAt: cached.repliedAt ? new Date(cached.repliedAt) : undefined,
        };
      }
    } catch (error) {
      console.error("[CampaignBlock] Error getting touch from cache:", error);
    }
    return null;
  }

  private getTouchKey(
    blockId: string,
    leadId: string,
    touchNumber: number,
  ): string {
    return `${TOUCH_CACHE_PREFIX}${blockId}:${leadId}:${touchNumber}`;
  }

  private async addToActiveBlocks(blockId: string): Promise<void> {
    if (!this.redisAvailable) return;
    try {
      await redis.sadd(ACTIVE_BLOCKS_KEY, blockId);
    } catch (error) {
      console.error("[CampaignBlock] Error adding to active blocks:", error);
    }
  }

  private async removeFromActiveBlocks(blockId: string): Promise<void> {
    if (!this.redisAvailable) return;
    try {
      await redis.srem(ACTIVE_BLOCKS_KEY, blockId);
    } catch (error) {
      console.error(
        "[CampaignBlock] Error removing from active blocks:",
        error,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS (Exported for use elsewhere)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a lead should be pivoted (5 touches exhausted)
   */
  public shouldPivotLead(touchCount: number, maxTouches: number = 5): boolean {
    return touchCount >= maxTouches;
  }

  /**
   * Calculate block progress percentage
   */
  public calculateBlockProgressPercent(
    totalTouches: number,
    targetSends: number = 10000,
  ): number {
    return Math.min(100, Math.round((totalTouches / targetSends) * 100));
  }

  /**
   * Check if block is complete
   */
  public isBlockComplete(
    totalTouches: number,
    targetSends: number = 10000,
  ): boolean {
    return totalTouches >= targetSends;
  }
}

// Export singleton instance
export const campaignBlockService = CampaignBlockService.getInstance();
