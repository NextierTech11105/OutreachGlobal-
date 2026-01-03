/**
 * ML SUPPORT LAYER
 * ================
 * Advisory-only services for lead scoring and feature tracking.
 *
 * Key Principles:
 * - ML is SUPPORTING, not authoritative
 * - Human-in-loop at every decision point
 * - Predictions are advisory, never autonomous
 * - All features derived from signals (append-only log)
 *
 * Services:
 * - LeadScoringService: Advisory lead scoring (0-100)
 * - FeatureSnapshotService: Captures features for offline training
 *
 * Architecture:
 * - Nextier Team = SignalHouse SubGroup (1:1)
 * - Like Perplexity/Lovable piggybacking on OpenAI, we piggyback on SignalHouse
 */

// Lead Scoring (Advisory Only)
export {
  LeadScoringService,
  leadScoringService,
  type LeadScore,
  type LeadRecommendation,
  type ScoringFactors,
  type ScoringConfig,
  type SignalType,
  type LeadSignalRecord,
} from "./lead-scoring-service";

// Feature Snapshots (For Training)
export {
  FeatureSnapshotService,
  featureSnapshotService,
  type FeatureSnapshot,
  type LeadFeatures,
  type SnapshotTrigger,
  type OutcomeLabel,
  type SignalRecord,
} from "./feature-snapshot-service";
