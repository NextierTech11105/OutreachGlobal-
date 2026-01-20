/**
 * Trestle Real Contact API Client
 * Contactability scoring and phone grading
 * Powers the A/B/C/D/F lead grading system
 *
 * Trestle Output Fields:
 *   phone.activity_score: int 0-100 (100=active)
 *   phone.contact_grade: char A-F
 *   phone.line_type: string Mobile/Landline/VoIP
 *   phone.name_match: bool
 *   email.contact_grade: char A-F
 *   email.name_match: bool
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PhoneGradeValue, PhoneTypeValue } from "../constants";
import { getCampaignReadyLeads } from "../utils/prioritization";
import { qualifyLead } from "../utils/qualification";

// Trestle API response structure
export interface TrestleApiResponse {
  phone?: {
    activity_score: number;
    contact_grade: string;
    line_type: string;
    name_match: boolean;
    carrier?: string;
    is_valid?: boolean;
    is_reachable?: boolean;
  };
  email?: {
    contact_grade: string;
    name_match: boolean;
    is_valid?: boolean;
  };
}

export interface TrestlePhoneResult {
  phone: string;
  valid: boolean;
  grade: PhoneGradeValue;
  type: PhoneTypeValue;
  carrier?: string;
  lineType: string;
  reachable: boolean;
  activityScore: number; // 0-100 (Trestle activity_score)
  nameMatch: boolean;
}

export interface TrestleContactScore {
  leadId: string;
  phones: TrestlePhoneResult[];
  bestPhone: TrestlePhoneResult | null;
  overallGrade: PhoneGradeValue;
  contactabilityScore: number; // 0-100
  smsReady: boolean; // Meets campaign-ready SMS criteria (A/B mobile + activity >= 70)
  recommendation: "sms" | "call" | "mail" | "skip";
  qualification?: {
    status: "ready" | "rejected" | "review";
    reason: string;
    flags: string[];
  };
}

export interface TrestleBatchResult {
  assessmentId: string;
  processedAt: string;
  totalRecords: number;
  results: TrestleContactScore[];
  summary: {
    gradeDistribution: Record<PhoneGradeValue, number>;
    phoneTypeDistribution: Record<PhoneTypeValue, number>;
    smsReadyCount: number;
    avgContactabilityScore: number;
  };
}

export interface TrestleAssessmentRequest {
  phones: Array<{
    leadId: string;
    phones: string[];
  }>;
}

@Injectable()
export class TrestleClient {
  private readonly logger = new Logger(TrestleClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl =
      this.config.get<string>("TRESTLE_API_URL") ||
      "https://api.trestleiq.com/v1";
    this.apiKey = this.config.get<string>("TRESTLE_API_KEY") || "";
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Score a single phone number via Trestle Real Contact API
   */
  async scorePhone(phone: string): Promise<TrestlePhoneResult> {
    const res = await fetch(`${this.baseUrl}/phone/lookup`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) {
      throw new Error(`Trestle scorePhone failed: ${res.status}`);
    }

    const data: TrestleApiResponse = await res.json();

    return this.mapPhoneResult(phone, data);
  }

  /**
   * Score contact with phone and optionally name/address for name_match
   */
  async scoreContact(input: {
    phone: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }): Promise<TrestlePhoneResult> {
    const res = await fetch(`${this.baseUrl}/contact/lookup`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        phone: input.phone,
        first_name: input.firstName,
        last_name: input.lastName,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
      }),
    });

    if (!res.ok) {
      throw new Error(`Trestle scoreContact failed: ${res.status}`);
    }

    const data: TrestleApiResponse = await res.json();

    return this.mapPhoneResult(input.phone, data);
  }

  /**
   * Batch score multiple leads with their phones
   * This is the core scoring method - takes Tracerfy output
   */
  async batchScore(
    request: TrestleAssessmentRequest,
  ): Promise<TrestleBatchResult> {
    const assessmentId = crypto.randomUUID();
    const results: TrestleContactScore[] = [];

    // Grade distribution tracking
    const gradeDistribution: Record<PhoneGradeValue, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    const phoneTypeDistribution: Record<PhoneTypeValue, number> = {
      mobile: 0,
      landline: 0,
      fixedVoIP: 0,
      nonFixedVoIP: 0,
    };

    let smsReadyCount = 0;
    let totalContactabilityScore = 0;

    // Process each lead
    for (const lead of request.phones) {
      try {
        const phoneResults: TrestlePhoneResult[] = [];

        // Score each phone for this lead
        for (const phone of lead.phones) {
          if (!phone || phone.length < 10) continue;

          try {
            const result = await this.scorePhone(phone);
            phoneResults.push(result);

            // Track distribution
            gradeDistribution[result.grade]++;
            phoneTypeDistribution[result.type]++;
          } catch (err) {
            // Mark as F if scoring fails
            phoneResults.push({
              phone,
              valid: false,
              grade: "F",
              type: "landline",
              lineType: "unknown",
              reachable: false,
              activityScore: 0,
              nameMatch: false,
            });
            gradeDistribution["F"]++;
          }
        }

        // Find best phone (highest grade mobile first)
        const bestPhone = this.findBestPhone(phoneResults);

        // Calculate overall grade for lead
        const overallGrade = this.calculateOverallGrade(phoneResults);

        // Calculate contactability score
        const contactabilityScore =
          this.calculateContactabilityScore(phoneResults);
        totalContactabilityScore += contactabilityScore;

        // Qualification (per spec):
        // - Ready: grade A/B and activity >= 70
        // - Reject: grade D/F OR activity < 50 OR no phone
        // - Otherwise: review
        const qualification = qualifyLead({
          primaryPhone: bestPhone?.phone ?? null,
          phoneContactGrade: bestPhone?.grade ?? null,
          phoneActivityScore: bestPhone?.activityScore ?? null,
        });

        // SMS-ready means: there exists at least one VALID mobile (A/B) with activity >= 70
        const smsReady =
          qualification.status !== "rejected" &&
          phoneResults.some(
            (p) =>
              p.valid &&
              p.type === "mobile" &&
              (p.grade === "A" || p.grade === "B") &&
              p.activityScore >= 70,
          );

        if (smsReady) smsReadyCount++;

        // Determine recommendation (rejects become skip)
        const recommendation =
          qualification.status === "rejected"
            ? "skip"
            : this.getRecommendation(phoneResults, smsReady);

        results.push({
          leadId: lead.leadId,
          phones: phoneResults,
          bestPhone,
          overallGrade,
          contactabilityScore,
          smsReady,
          recommendation,
          qualification,
        });
      } catch (err) {
        this.logger.error(`Failed to score lead ${lead.leadId}: ${err}`);
        results.push({
          leadId: lead.leadId,
          phones: [],
          bestPhone: null,
          overallGrade: "F",
          contactabilityScore: 0,
          smsReady: false,
          recommendation: "skip",
          qualification: {
            status: "rejected",
            reason: "scoring_failed",
            flags: ["error"],
          },
        });
        gradeDistribution["F"]++;
      }
    }

    return {
      assessmentId,
      processedAt: new Date().toISOString(),
      totalRecords: results.length,
      results,
      summary: {
        gradeDistribution,
        phoneTypeDistribution,
        smsReadyCount,
        avgContactabilityScore:
          results.length > 0 ? totalContactabilityScore / results.length : 0,
      },
    };
  }

  /**
   * Filter batch results to only SMS-ready leads
   */
  filterSmsReady(
    results: TrestleContactScore[],
    minGrade: PhoneGradeValue = "B",
  ): TrestleContactScore[] {
    const gradeOrder = ["A", "B", "C", "D", "F"];
    const minGradeIndex = gradeOrder.indexOf(minGrade);

    return results.filter((r) => {
      if (!r.smsReady) return false;
      const gradeIndex = gradeOrder.indexOf(r.overallGrade);
      return gradeIndex <= minGradeIndex;
    });
  }

  /**
   * Get campaign-ready leads up to target count
   * LUCI uses this to hit her 2k/1k/500 targets
   */
  getCampaignReady(
    results: TrestleContactScore[],
    targetCount: number,
  ): TrestleContactScore[] {
    // Tiered prioritization for daily target:
    // 1) A mobile >= 90
    // 2) A mobile >= 70
    // 3) B mobile >= 70
    // (tiering/ordering implemented in utils/prioritization.ts)
    const byLeadId = new Map(results.map((r) => [r.leadId, r] as const));

    const inputs = results
      .map((r) => r.bestPhone)
      .map((bestPhone, idx) => ({ bestPhone, score: results[idx] }))
      .filter((x) => !!x.bestPhone)
      .map((x) => ({
        leadId: x.score.leadId,
        phone: x.bestPhone!.phone,
        phoneType: x.bestPhone!.type,
        grade: x.bestPhone!.grade,
        activityScore: x.bestPhone!.activityScore,
      }));

    const top = getCampaignReadyLeads(inputs, targetCount);
    return top
      .map((p) => byLeadId.get(p.leadId))
      .filter((r): r is TrestleContactScore => !!r);
  }

  private mapPhoneResult(
    phone: string,
    data: TrestleApiResponse,
  ): TrestlePhoneResult {
    // Map Trestle Real Contact API response
    const phoneData = data.phone;

    if (!phoneData) {
      return {
        phone,
        valid: false,
        grade: "F",
        type: "landline",
        lineType: "unknown",
        reachable: false,
        activityScore: 0,
        nameMatch: false,
      };
    }

    const lineType = phoneData.line_type || "unknown";
    const valid = phoneData.is_valid !== false;
    const reachable = phoneData.is_reachable !== false;
    const activityScore = phoneData.activity_score || 0;
    const nameMatch = phoneData.name_match || false;

    // Determine phone type from line_type
    let type: PhoneTypeValue = "landline";
    if (
      lineType.toLowerCase().includes("mobile") ||
      lineType.toLowerCase().includes("wireless")
    ) {
      type = "mobile";
    } else if (lineType.toLowerCase().includes("voip")) {
      type = lineType.toLowerCase().includes("non-fixed")
        ? "nonFixedVoIP"
        : "fixedVoIP";
    }

    // Use Trestle's contact_grade directly (A-F)
    let grade: PhoneGradeValue = "F";
    const trestleGrade = (phoneData.contact_grade || "F").toUpperCase();
    if (["A", "B", "C", "D", "F"].includes(trestleGrade)) {
      grade = trestleGrade as PhoneGradeValue;
    }

    return {
      phone,
      valid,
      grade,
      type,
      carrier: phoneData.carrier,
      lineType,
      reachable,
      activityScore,
      nameMatch,
    };
  }

  private findBestPhone(
    phones: TrestlePhoneResult[],
  ): TrestlePhoneResult | null {
    if (phones.length === 0) return null;

    const gradeOrder = ["A", "B", "C", "D", "F"];

    // Priority: Grade A/B mobiles first (then by activity)
    const mobiles = phones.filter((p) => p.type === "mobile" && p.valid);
    if (mobiles.length > 0) {
      mobiles.sort((a, b) => {
        const gradeDelta =
          gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
        if (gradeDelta !== 0) return gradeDelta;
        return b.activityScore - a.activityScore;
      });
      return mobiles[0];
    }

    // Then any valid phone by grade (then by activity)
    const valid = phones.filter((p) => p.valid);
    if (valid.length > 0) {
      valid.sort((a, b) => {
        const gradeDelta =
          gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
        if (gradeDelta !== 0) return gradeDelta;
        return b.activityScore - a.activityScore;
      });
      return valid[0];
    }

    // Return best of what we have
    phones.sort(
      (a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade),
    );
    return phones[0];
  }

  private calculateOverallGrade(phones: TrestlePhoneResult[]): PhoneGradeValue {
    if (phones.length === 0) return "F";

    const gradeOrder = ["A", "B", "C", "D", "F"];
    let bestGradeIndex = 4; // F

    for (const phone of phones) {
      const gradeIndex = gradeOrder.indexOf(phone.grade);
      if (gradeIndex < bestGradeIndex) {
        bestGradeIndex = gradeIndex;
      }
    }

    return gradeOrder[bestGradeIndex] as PhoneGradeValue;
  }

  private calculateContactabilityScore(phones: TrestlePhoneResult[]): number {
    if (phones.length === 0) return 0;

    // Weight: mobile > voip > landline
    // Weight: grade A > B > C > D > F
    // Use Trestle activity_score as base
    let score = 0;

    for (const phone of phones) {
      let phoneScore = phone.activityScore;

      // Type multiplier
      if (phone.type === "mobile") phoneScore *= 1.5;
      else if (phone.type === "nonFixedVoIP") phoneScore *= 1.2;
      else if (phone.type === "fixedVoIP") phoneScore *= 1.1;

      // Grade multiplier
      switch (phone.grade) {
        case "A":
          phoneScore *= 1.0;
          break;
        case "B":
          phoneScore *= 0.8;
          break;
        case "C":
          phoneScore *= 0.6;
          break;
        case "D":
          phoneScore *= 0.4;
          break;
        case "F":
          phoneScore *= 0.1;
          break;
      }

      // Name match bonus
      if (phone.nameMatch) phoneScore *= 1.1;

      score += phoneScore;
    }

    // Normalize to 0-100
    return Math.min(100, Math.round(score / phones.length));
  }

  private getRecommendation(
    phones: TrestlePhoneResult[],
    smsReady: boolean,
  ): "sms" | "call" | "mail" | "skip" {
    if (smsReady) return "sms";

    // Check for callable phones
    const hasCallable = phones.some(
      (p) =>
        p.valid &&
        p.reachable &&
        (p.grade === "A" || p.grade === "B" || p.grade === "C"),
    );
    if (hasCallable) return "call";

    // Check if we have any valid phones
    const hasValid = phones.some((p) => p.valid);
    if (hasValid) return "mail";

    return "skip";
  }
}
