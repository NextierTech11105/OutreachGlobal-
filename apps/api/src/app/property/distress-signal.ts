// lib/services/distressSignalScoringService.ts
// EXAMPLE ONLY DO NOT USE

export interface DistressSignal {
  signal: string;
  score_value: number;
  tag: string;
  timestamp: string;
  source?: string;
}

export interface PropertyDistressData {
  property_uid: string;
  address: string;
  owner_name: string;
  owner_type?: string;
  equity_percent?: number;
  vacancy_status?: boolean;
  loan_maturity_date?: string;
  reverse_mortgage?: boolean;
  zoning?: string;
  distress_signals: DistressSignal[];
  distress_score: number;
  last_signal_date: string;
  zoho_status: "pending" | "updated" | "failed";
  nextier_status: "pending" | "queued" | "processed";
  campaign_stage: "AutoProcess" | "ManualReview" | "HighPriority";
}

export interface ScoreCalculationResult {
  totalScore: number;
  signals: DistressSignal[];
  tags: string[];
  campaignQueue: "ai" | "sdr" | "nurture" | "manual_review";
  priority: "low" | "medium" | "high" | "urgent";
}

// Scoring matrix configuration
export const DISTRESS_SIGNAL_MATRIX = {
  lis_pendens: { score: 10, tag: "PreForeclosure" },
  reverse_mortgage: { score: 10, tag: "SeniorOwner" },
  vacant_property: { score: 10, tag: "VacantProp" },
  estate_trust_owner: { score: 10, tag: "NonOccupant" },
  high_equity: { score: 10, tag: "HighEquity" },
  low_equity: { score: 10, tag: "LowEquity" },
  negative_equity: { score: 10, tag: "Underwater" },
  loan_maturity_risk: { score: 10, tag: "LoanMaturityRisk" },
  buildable_zoning: { score: 10, tag: "BuildableZoning" },
} as const;

// Queue routing thresholds
export const CAMPAIGN_THRESHOLDS = {
  MANUAL_REVIEW: 50, // 5+ signals = manual review
  HIGH_PRIORITY: 30, // 3+ signals = AI SDR
  MEDIUM_PRIORITY: 20, // 2+ signals = Human SDR
  LOW_PRIORITY: 10, // 1+ signal = Nurture
} as const;

export class DistressSignalScoringService {
  /**
   * Analyze property data and calculate distress score
   */
  async calculateDistressScore(
    propertyData: any,
  ): Promise<ScoreCalculationResult> {
    const signals: DistressSignal[] = [];
    const tags: string[] = [];
    let totalScore = 0;

    // Check each potential distress signal
    const detectedSignals = this.detectDistressSignals(propertyData);

    for (const signal of detectedSignals) {
      signals.push(signal);
      tags.push(signal.tag);
      totalScore += signal.score_value;
    }

    // Determine campaign queue based on score
    const campaignQueue = this.determineCampaignQueue(totalScore);
    const priority = this.determinePriority(totalScore);

    return {
      totalScore,
      signals,
      tags: [...new Set(tags)], // Remove duplicates
      campaignQueue,
      priority,
    };
  }

  /**
   * Detect distress signals from property data
   */
  private detectDistressSignals(propertyData: any): DistressSignal[] {
    const signals: DistressSignal[] = [];
    const timestamp = new Date().toISOString();

    // 1. Lis Pendens Detection
    if (
      propertyData.lis_pendens ||
      propertyData.foreclosure_status === "pre_foreclosure"
    ) {
      signals.push({
        signal: "Lis Pendens",
        score_value: DISTRESS_SIGNAL_MATRIX.lis_pendens.score,
        tag: DISTRESS_SIGNAL_MATRIX.lis_pendens.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 2. Reverse Mortgage Detection
    if (
      propertyData.reverse_mortgage ||
      propertyData.loan_type_code_first === "REV" ||
      propertyData.currentMortgages?.some((m: any) => m.loanType === "reverse")
    ) {
      signals.push({
        signal: "Reverse Mortgage",
        score_value: DISTRESS_SIGNAL_MATRIX.reverse_mortgage.score,
        tag: DISTRESS_SIGNAL_MATRIX.reverse_mortgage.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 3. Vacant Property Detection
    if (
      propertyData.vacancy_status ||
      propertyData.vacant ||
      propertyData.isVacant
    ) {
      signals.push({
        signal: "Vacant Property",
        score_value: DISTRESS_SIGNAL_MATRIX.vacant_property.score,
        tag: DISTRESS_SIGNAL_MATRIX.vacant_property.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 4. Estate/Trust Owner Detection
    if (
      propertyData.owner_type === "Estate or Trust" ||
      propertyData.ownerType?.toLowerCase().includes("estate") ||
      propertyData.ownerType?.toLowerCase().includes("trust")
    ) {
      signals.push({
        signal: "Estate or Trust Owner Type",
        score_value: DISTRESS_SIGNAL_MATRIX.estate_trust_owner.score,
        tag: DISTRESS_SIGNAL_MATRIX.estate_trust_owner.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 5. High Equity Detection (>80%)
    if (propertyData.equity_percent && propertyData.equity_percent > 80) {
      signals.push({
        signal: "Equity > 80%",
        score_value: DISTRESS_SIGNAL_MATRIX.high_equity.score,
        tag: DISTRESS_SIGNAL_MATRIX.high_equity.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 6. Low Equity Detection (<30%)
    if (
      propertyData.equity_percent &&
      propertyData.equity_percent < 30 &&
      propertyData.equity_percent > 0
    ) {
      signals.push({
        signal: "Equity < 30%",
        score_value: DISTRESS_SIGNAL_MATRIX.low_equity.score,
        tag: DISTRESS_SIGNAL_MATRIX.low_equity.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 7. Negative Equity Detection
    if (propertyData.equity_percent && propertyData.equity_percent < 0) {
      signals.push({
        signal: "Negative Equity",
        score_value: DISTRESS_SIGNAL_MATRIX.negative_equity.score,
        tag: DISTRESS_SIGNAL_MATRIX.negative_equity.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    // 8. Loan Maturity Risk Detection (<12 months)
    if (propertyData.loan_maturity_date) {
      const maturityDate = new Date(propertyData.loan_maturity_date);
      const twelveMonthsFromNow = new Date();
      twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);

      if (maturityDate <= twelveMonthsFromNow) {
        signals.push({
          signal: "Maturity Date < 12 Months",
          score_value: DISTRESS_SIGNAL_MATRIX.loan_maturity_risk.score,
          tag: DISTRESS_SIGNAL_MATRIX.loan_maturity_risk.tag,
          timestamp,
          source: "RealEstateAPI",
        });
      }
    }

    // 9. Buildable Zoning Detection (R6, R7, R8)
    if (
      propertyData.zoning &&
      ["R6", "R7", "R8"].includes(propertyData.zoning)
    ) {
      signals.push({
        signal: "Zoning: R6, R7, R8",
        score_value: DISTRESS_SIGNAL_MATRIX.buildable_zoning.score,
        tag: DISTRESS_SIGNAL_MATRIX.buildable_zoning.tag,
        timestamp,
        source: "RealEstateAPI",
      });
    }

    return signals;
  }

  /**
   * Determine campaign queue based on total score
   */
  private determineCampaignQueue(
    totalScore: number,
  ): "ai" | "sdr" | "nurture" | "manual_review" {
    if (totalScore >= CAMPAIGN_THRESHOLDS.MANUAL_REVIEW) {
      return "manual_review";
    } else if (totalScore >= CAMPAIGN_THRESHOLDS.HIGH_PRIORITY) {
      return "ai";
    } else if (totalScore >= CAMPAIGN_THRESHOLDS.MEDIUM_PRIORITY) {
      return "sdr";
    } else if (totalScore >= CAMPAIGN_THRESHOLDS.LOW_PRIORITY) {
      return "nurture";
    }
    return "nurture"; // Default for any score > 0
  }

  /**
   * Determine priority level based on total score
   */
  private determinePriority(
    totalScore: number,
  ): "low" | "medium" | "high" | "urgent" {
    if (totalScore >= CAMPAIGN_THRESHOLDS.MANUAL_REVIEW) {
      return "urgent";
    } else if (totalScore >= CAMPAIGN_THRESHOLDS.HIGH_PRIORITY) {
      return "high";
    } else if (totalScore >= CAMPAIGN_THRESHOLDS.MEDIUM_PRIORITY) {
      return "medium";
    }
    return "low";
  }

  /**
   * Process property and create distress data object
   */
  async processProperty(propertyData: any): Promise<PropertyDistressData> {
    const scoreResult = await this.calculateDistressScore(propertyData);

    return {
      property_uid: propertyData.id || `REAPI-${Date.now()}`,
      address: this.formatAddress(propertyData),
      owner_name:
        propertyData.owner_name || propertyData.owners?.[0]?.name || "Unknown",
      owner_type: propertyData.owner_type || propertyData.ownerType,
      equity_percent: propertyData.equity_percent || propertyData.equityPercent,
      vacancy_status:
        propertyData.vacancy_status ||
        propertyData.vacant ||
        propertyData.isVacant,
      loan_maturity_date:
        propertyData.loan_maturity_date || propertyData.maturityDate,
      reverse_mortgage:
        propertyData.reverse_mortgage ||
        propertyData.loan_type_code_first === "REV",
      zoning: propertyData.zoning || propertyData.zoningCode,
      distress_signals: scoreResult.signals,
      distress_score: scoreResult.totalScore,
      last_signal_date: new Date().toISOString(),
      zoho_status: "pending",
      nextier_status: "pending",
      campaign_stage: this.determineCampaignStage(scoreResult.totalScore),
    };
  }

  /**
   * Format property address
   */
  private formatAddress(propertyData: any): string {
    if (propertyData.address) return propertyData.address;

    const parts = [
      propertyData.address?.line || propertyData.street,
      propertyData.address?.city || propertyData.city,
      propertyData.address?.state || propertyData.state,
      propertyData.address?.zipCode || propertyData.zip,
    ].filter(Boolean);

    return parts.join(", ") || "Unknown Address";
  }

  /**
   * Determine campaign stage based on score
   */
  private determineCampaignStage(
    totalScore: number,
  ): "AutoProcess" | "ManualReview" | "HighPriority" {
    if (totalScore >= CAMPAIGN_THRESHOLDS.MANUAL_REVIEW) {
      return "ManualReview";
    } else if (totalScore >= CAMPAIGN_THRESHOLDS.HIGH_PRIORITY) {
      return "HighPriority";
    }
    return "AutoProcess";
  }
}

// Export singleton instance
export const distressSignalScoringService = new DistressSignalScoringService();
