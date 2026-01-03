/**
 * FEATURE SNAPSHOT SERVICE
 * ========================
 * Captures lead features at decision points for offline ML training.
 *
 * Key Triggers:
 * - pre_send: Before SMS/email is sent
 * - post_reply: After receiving a reply
 * - state_change: When lead state transitions
 * - milestone: Campaign block completion (2000 leads)
 *
 * Features are computed from signals and stored as JSONB for
 * flexible schema evolution without migrations.
 *
 * This data is used for:
 * 1. Offline model training
 * 2. Feature importance analysis
 * 3. A/B testing validation
 * 4. Model accuracy tracking
 */

import { redis, isRedisAvailable } from "@/lib/redis";
import type { LeadScore } from "./lead-scoring-service";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Snapshot trigger types
 */
export type SnapshotTrigger =
  | "pre_send" // Before sending outbound message
  | "post_reply" // After receiving reply
  | "state_change" // Lead state transition
  | "milestone" // Campaign block completion
  | "manual"; // Manual capture for debugging

/**
 * Outcome labels for supervised training
 */
export type OutcomeLabel =
  | "converted" // Lead booked meeting/closed deal
  | "responded" // Lead replied positively
  | "no_response" // No response after window
  | "opted_out" // Lead opted out
  | "churned" // Lead went cold
  | "wrong_number"; // Invalid contact

/**
 * Lead features structure
 */
export interface LeadFeatures {
  // Signal counts
  signal_counts: Record<string, number>;

  // Temporal features
  days_since_first_contact?: number;
  days_since_last_contact?: number;
  days_since_last_reply?: number;
  hours_since_last_activity?: number;

  // Engagement metrics
  reply_rate?: number;
  positive_reply_rate?: number;
  avg_response_time_hours?: number;
  total_touches?: number;

  // State tracking
  current_state?: string;
  previous_states?: string[];

  // Lead metadata
  industry?: string;
  source?: string;
  has_email?: boolean;
  has_phone?: boolean;

  // Campaign context
  campaign_id?: string;
  campaign_block?: number;
  template_used?: string;

  // Computed scores
  lead_score?: number;
  intent_score?: number;
  urgency_score?: number;

  // Additional flexible fields
  [key: string]: unknown;
}

/**
 * Feature snapshot record
 */
export interface FeatureSnapshot {
  id: string;
  teamId: string;
  leadId: string;
  snapshotAt: Date;
  snapshotTrigger: SnapshotTrigger;
  features: LeadFeatures;
  outcomeLabel?: OutcomeLabel;
  outcomeAt?: Date;
  modelVersion?: string;
  campaignId?: string;
  templateId?: string;
  createdAt: Date;
}

/**
 * Signal record for feature extraction
 */
export interface SignalRecord {
  signalType: string;
  createdAt: Date;
  confidence?: number;
  signalValue?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const SNAPSHOT_CACHE_PREFIX = "feature_snapshot:";
const SNAPSHOT_LIST_PREFIX = "feature_snapshots:lead:";

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE SNAPSHOT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class FeatureSnapshotService {
  private static instance: FeatureSnapshotService;
  private redisAvailable = false;

  private constructor() {
    this.redisAvailable = isRedisAvailable();
    console.log("[FeatureSnapshot] Service initialized");
  }

  public static getInstance(): FeatureSnapshotService {
    if (!FeatureSnapshotService.instance) {
      FeatureSnapshotService.instance = new FeatureSnapshotService();
    }
    return FeatureSnapshotService.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SNAPSHOT CAPTURE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Capture features before sending SMS
   */
  public async capturePreSend(options: {
    teamId: string;
    leadId: string;
    signals: SignalRecord[];
    campaignId?: string;
    templateId?: string;
    touchNumber?: number;
    leadScore?: LeadScore;
  }): Promise<FeatureSnapshot> {
    const features = this.extractFeatures(options.signals, {
      campaign_id: options.campaignId,
      template_used: options.templateId,
      total_touches: options.touchNumber,
      lead_score: options.leadScore?.score,
    });

    return this.createSnapshot({
      teamId: options.teamId,
      leadId: options.leadId,
      trigger: "pre_send",
      features,
      campaignId: options.campaignId,
      templateId: options.templateId,
    });
  }

  /**
   * Capture features after receiving reply
   */
  public async capturePostReply(options: {
    teamId: string;
    leadId: string;
    signals: SignalRecord[];
    replyIntent: string;
    campaignId?: string;
  }): Promise<FeatureSnapshot> {
    const features = this.extractFeatures(options.signals, {
      campaign_id: options.campaignId,
      reply_intent: options.replyIntent,
    });

    return this.createSnapshot({
      teamId: options.teamId,
      leadId: options.leadId,
      trigger: "post_reply",
      features,
      campaignId: options.campaignId,
    });
  }

  /**
   * Capture features on state change
   */
  public async captureStateChange(options: {
    teamId: string;
    leadId: string;
    signals: SignalRecord[];
    fromState: string;
    toState: string;
    campaignId?: string;
  }): Promise<FeatureSnapshot> {
    const features = this.extractFeatures(options.signals, {
      campaign_id: options.campaignId,
      current_state: options.toState,
      previous_states: [options.fromState],
      state_transition: `${options.fromState} → ${options.toState}`,
    });

    return this.createSnapshot({
      teamId: options.teamId,
      leadId: options.leadId,
      trigger: "state_change",
      features,
      campaignId: options.campaignId,
    });
  }

  /**
   * Capture features at campaign milestone
   */
  public async captureMilestone(options: {
    teamId: string;
    leadId: string;
    signals: SignalRecord[];
    campaignId: string;
    blockNumber: number;
    metrics?: Record<string, number>;
  }): Promise<FeatureSnapshot> {
    const features = this.extractFeatures(options.signals, {
      campaign_id: options.campaignId,
      campaign_block: options.blockNumber,
      ...options.metrics,
    });

    return this.createSnapshot({
      teamId: options.teamId,
      leadId: options.leadId,
      trigger: "milestone",
      features,
      campaignId: options.campaignId,
    });
  }

  /**
   * Manual feature capture (for debugging)
   */
  public async captureManual(options: {
    teamId: string;
    leadId: string;
    signals: SignalRecord[];
    reason?: string;
  }): Promise<FeatureSnapshot> {
    const features = this.extractFeatures(options.signals, {
      capture_reason: options.reason,
    });

    return this.createSnapshot({
      teamId: options.teamId,
      leadId: options.leadId,
      trigger: "manual",
      features,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OUTCOME LABELING (For Training)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Label past snapshots with outcomes
   * Called when we know the final outcome for a lead
   */
  public async labelOutcome(
    leadId: string,
    outcome: OutcomeLabel,
    outcomeAt?: Date,
  ): Promise<number> {
    if (!this.redisAvailable) return 0;

    try {
      // Get all snapshots for this lead
      const snapshotIds = await redis.smembers(
        `${SNAPSHOT_LIST_PREFIX}${leadId}`,
      );
      let labeled = 0;

      for (const snapshotId of snapshotIds) {
        const snapshot = await redis.get<FeatureSnapshot>(
          `${SNAPSHOT_CACHE_PREFIX}${snapshotId}`,
        );
        if (snapshot && !snapshot.outcomeLabel) {
          snapshot.outcomeLabel = outcome;
          snapshot.outcomeAt = outcomeAt || new Date();

          await redis.set(
            `${SNAPSHOT_CACHE_PREFIX}${snapshotId}`,
            JSON.stringify(snapshot),
          );
          labeled++;
        }
      }

      console.log(
        `[FeatureSnapshot] Labeled ${labeled} snapshots for lead ${leadId}`,
      );
      return labeled;
    } catch (error) {
      console.error("[FeatureSnapshot] Error labeling outcome:", error);
      return 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Extract features from signals
   */
  private extractFeatures(
    signals: SignalRecord[],
    additionalFeatures: Record<string, unknown> = {},
  ): LeadFeatures {
    const now = new Date();

    // Signal counts
    const signalCounts: Record<string, number> = {};
    for (const signal of signals) {
      signalCounts[signal.signalType] =
        (signalCounts[signal.signalType] || 0) + 1;
    }

    // Temporal features
    const firstContact = this.findFirstSignal(signals, "CONTACTED");
    const lastContact = this.findLastSignal(signals, "CONTACTED");
    const lastReply = this.findLastSignal(signals, "REPLIED");
    const lastActivity =
      signals.length > 0
        ? signals.reduce(
            (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
            signals[0].createdAt,
          )
        : undefined;

    // Engagement metrics
    const totalContacted = signalCounts["CONTACTED"] || 0;
    const totalReplied = signalCounts["REPLIED"] || 0;
    const totalPositive = signalCounts["POSITIVE_RESPONSE"] || 0;
    const replyRate = totalContacted > 0 ? totalReplied / totalContacted : 0;
    const positiveReplyRate =
      totalReplied > 0 ? totalPositive / totalReplied : 0;

    // Lead metadata
    const hasEmail = (signalCounts["EMAIL_PROVIDED"] || 0) > 0;
    const hasPhone = true; // We assume phone exists since we're SMS-focused

    return {
      signal_counts: signalCounts,

      // Temporal features
      days_since_first_contact: firstContact
        ? this.daysBetween(firstContact.createdAt, now)
        : undefined,
      days_since_last_contact: lastContact
        ? this.daysBetween(lastContact.createdAt, now)
        : undefined,
      days_since_last_reply: lastReply
        ? this.daysBetween(lastReply.createdAt, now)
        : undefined,
      hours_since_last_activity: lastActivity
        ? this.hoursBetween(lastActivity, now)
        : undefined,

      // Engagement metrics
      reply_rate: replyRate,
      positive_reply_rate: positiveReplyRate,
      total_touches: totalContacted,

      // Lead metadata
      has_email: hasEmail,
      has_phone: hasPhone,

      // Additional features
      ...additionalFeatures,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SNAPSHOT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new snapshot
   */
  private async createSnapshot(options: {
    teamId: string;
    leadId: string;
    trigger: SnapshotTrigger;
    features: LeadFeatures;
    campaignId?: string;
    templateId?: string;
    modelVersion?: string;
  }): Promise<FeatureSnapshot> {
    const snapshotId = `mfs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const snapshot: FeatureSnapshot = {
      id: snapshotId,
      teamId: options.teamId,
      leadId: options.leadId,
      snapshotAt: now,
      snapshotTrigger: options.trigger,
      features: options.features,
      modelVersion: options.modelVersion,
      campaignId: options.campaignId,
      templateId: options.templateId,
      createdAt: now,
    };

    // Cache in Redis
    if (this.redisAvailable) {
      try {
        await redis.set(
          `${SNAPSHOT_CACHE_PREFIX}${snapshotId}`,
          JSON.stringify(snapshot),
          { ex: 86400 * 90 }, // 90 days TTL
        );

        // Add to lead's snapshot list
        await redis.sadd(
          `${SNAPSHOT_LIST_PREFIX}${options.leadId}`,
          snapshotId,
        );
      } catch (error) {
        console.error("[FeatureSnapshot] Error caching snapshot:", error);
      }
    }

    console.log(
      `[FeatureSnapshot] Created ${options.trigger} snapshot for lead ${options.leadId}`,
    );

    return snapshot;
  }

  /**
   * Get snapshots for a lead
   */
  public async getLeadSnapshots(leadId: string): Promise<FeatureSnapshot[]> {
    if (!this.redisAvailable) return [];

    try {
      const snapshotIds = await redis.smembers(
        `${SNAPSHOT_LIST_PREFIX}${leadId}`,
      );
      const snapshots: FeatureSnapshot[] = [];

      for (const snapshotId of snapshotIds) {
        const snapshot = await redis.get<FeatureSnapshot>(
          `${SNAPSHOT_CACHE_PREFIX}${snapshotId}`,
        );
        if (snapshot) {
          snapshots.push({
            ...snapshot,
            snapshotAt: new Date(snapshot.snapshotAt),
            outcomeAt: snapshot.outcomeAt
              ? new Date(snapshot.outcomeAt)
              : undefined,
            createdAt: new Date(snapshot.createdAt),
          });
        }
      }

      // Sort by time (newest first)
      return snapshots.sort(
        (a, b) => b.snapshotAt.getTime() - a.snapshotAt.getTime(),
      );
    } catch (error) {
      console.error("[FeatureSnapshot] Error getting snapshots:", error);
      return [];
    }
  }

  /**
   * Get labeled snapshots for training
   */
  public async getLabeledSnapshots(
    options: {
      teamId?: string;
      trigger?: SnapshotTrigger;
      outcome?: OutcomeLabel;
      limit?: number;
    } = {},
  ): Promise<FeatureSnapshot[]> {
    // This would query the database in production
    // For now, we scan Redis (not efficient for large datasets)
    console.warn(
      "[FeatureSnapshot] getLabeledSnapshots should use database in production",
    );
    return [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Find first signal of a type
   */
  private findFirstSignal(
    signals: SignalRecord[],
    signalType: string,
  ): SignalRecord | undefined {
    const matching = signals.filter((s) => s.signalType === signalType);
    if (matching.length === 0) return undefined;
    return matching.reduce((earliest, s) =>
      s.createdAt < earliest.createdAt ? s : earliest,
    );
  }

  /**
   * Find last signal of a type
   */
  private findLastSignal(
    signals: SignalRecord[],
    signalType: string,
  ): SignalRecord | undefined {
    const matching = signals.filter((s) => s.signalType === signalType);
    if (matching.length === 0) return undefined;
    return matching.reduce((latest, s) =>
      s.createdAt > latest.createdAt ? s : latest,
    );
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate hours between two dates
   */
  private hoursBetween(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();
    return Math.round(ms / (1000 * 60 * 60));
  }
}

// Export singleton instance
export const featureSnapshotService = FeatureSnapshotService.getInstance();
