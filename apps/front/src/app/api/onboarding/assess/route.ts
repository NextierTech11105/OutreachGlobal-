/**
 * ONBOARDING ASSESSMENT API
 * ═══════════════════════════════════════════════════════════════════════════
 * Scores uploaded leads using Trestle Real Contact API during onboarding.
 *
 * POST /api/onboarding/assess
 *
 * For onboarding, we sample up to 100 leads to provide a quick assessment
 * of data quality without incurring full Trestle costs.
 *
 * COST: $0.03 per sampled record
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { parse } from "csv-parse/sync";
import {
  getTrestleClient,
  isPhoneContactable,
  calculateContactabilityScore,
  hasLitigatorRisk,
  type TrestleRealContactResponse,
} from "@/lib/trestle";
import {
  TRESTLE_GOOD_ACTIVITY_SCORE,
  TRESTLE_PASSING_GRADES,
} from "@/config/constants";

const MAX_SAMPLE_SIZE = 100; // Maximum records to sample for free assessment
const BATCH_SIZE = 10; // Process in batches to avoid rate limits

interface CSVRecord {
  name?: string;
  Name?: string;
  full_name?: string;
  phone?: string;
  Phone?: string;
  phone_number?: string;
  email?: string;
  Email?: string;
  [key: string]: string | undefined;
}

interface AssessmentResult {
  success: boolean;
  totalRecords: number;
  sampledRecords: number;
  gradeBreakdown: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  qualityMetrics: {
    averageActivityScore: number;
    contactableRate: number;
    mobileRate: number;
    litigatorRiskCount: number;
    validPhoneRate: number;
    validEmailRate: number;
  };
  campaignReadiness: {
    smsReady: number;
    callReady: number;
    emailReady: number;
  };
  dataQuality: {
    validPhones: number;
    invalidPhones: number;
    validEmails: number;
    invalidEmails: number;
    missingNames: number;
    duplicates: number;
  };
  estimatedFullCost: number;
  recommendations: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const assessFull = formData.get("assessFull") === "true"; // If true, assess all (paid)

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    // Parse CSV
    const fileContent = await file.text();
    let records: CSVRecord[];

    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid CSV format" },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Data format audit (quick, no API calls)
    const { dataQuality, validRecords } = auditDataFormat(records);

    // Determine sample size
    const sampleSize = assessFull
      ? validRecords.length
      : Math.min(validRecords.length, MAX_SAMPLE_SIZE);

    // Sample records randomly
    const sampledRecords = sampleRecords(validRecords, sampleSize);

    // Score sampled records with Trestle
    const trestleClient = getTrestleClient();
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let totalActivityScore = 0;
    let validActivityScores = 0;
    let contactableCount = 0;
    let mobileCount = 0;
    let litigatorRiskCount = 0;
    let smsReadyCount = 0;
    let callReadyCount = 0;
    let emailReadyCount = 0;

    // Process in batches
    for (let i = 0; i < sampledRecords.length; i += BATCH_SIZE) {
      const batch = sampledRecords.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (record) => {
          try {
            const result = await trestleClient.realContact({
              name: record.name,
              phone: record.phone,
              email: record.email,
              addOns: ["litigator_checks", "email_checks_deliverability"],
            });
            return { record, result, error: null };
          } catch (error) {
            return { record, result: null, error };
          }
        })
      );

      // Process results
      for (const { result } of results) {
        if (!result || result.error) continue;

        // Grade
        const grade = result.phone.contactGrade;
        if (grade && grade in gradeCounts) {
          gradeCounts[grade as keyof typeof gradeCounts]++;
        }

        // Activity score
        if (result.phone.activityScore !== null) {
          totalActivityScore += result.phone.activityScore;
          validActivityScores++;
        }

        // Contactability
        const contactable = isPhoneContactable(
          result,
          TRESTLE_GOOD_ACTIVITY_SCORE,
          [...TRESTLE_PASSING_GRADES]
        );
        if (contactable) contactableCount++;

        // Line type
        if (result.phone.lineType === "Mobile") mobileCount++;

        // Litigator risk
        if (hasLitigatorRisk(result)) litigatorRiskCount++;

        // Campaign readiness
        if (
          contactable &&
          result.phone.lineType === "Mobile" &&
          !hasLitigatorRisk(result)
        ) {
          smsReadyCount++;
        }
        if (contactable && !hasLitigatorRisk(result)) {
          callReadyCount++;
        }
        if (result.addOns?.emailChecks?.isDeliverable) {
          emailReadyCount++;
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < sampledRecords.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Calculate metrics
    const averageActivityScore =
      validActivityScores > 0
        ? Math.round(totalActivityScore / validActivityScores)
        : 0;
    const contactableRate =
      sampleSize > 0 ? Math.round((contactableCount / sampleSize) * 100) : 0;
    const mobileRate =
      sampleSize > 0 ? Math.round((mobileCount / sampleSize) * 100) : 0;

    // Generate recommendations based on assessment
    const recommendations: string[] = [];

    if (contactableRate < 50) {
      recommendations.push(
        "Consider using our Data Engine to enrich and improve contact quality."
      );
    }
    if (litigatorRiskCount > sampleSize * 0.05) {
      recommendations.push(
        "High litigator risk detected. Consider scrubbing the list before campaigns."
      );
    }
    if (mobileRate < 40) {
      recommendations.push(
        "Low mobile rate. SMS campaigns may have limited reach."
      );
    }
    if (averageActivityScore < 50) {
      recommendations.push(
        "Many phone numbers show low activity. Expect higher bounce rates."
      );
    }
    if (dataQuality.missingNames > records.length * 0.1) {
      recommendations.push(
        "Missing names detected. Personalization will be limited."
      );
    }
    if (dataQuality.duplicates > records.length * 0.05) {
      recommendations.push(
        "Duplicates found. Consider deduplication before campaign."
      );
    }

    // Build response
    const response: AssessmentResult = {
      success: true,
      totalRecords: records.length,
      sampledRecords: sampleSize,
      gradeBreakdown: gradeCounts,
      qualityMetrics: {
        averageActivityScore,
        contactableRate,
        mobileRate,
        litigatorRiskCount,
        validPhoneRate: Math.round(
          (dataQuality.validPhones / records.length) * 100
        ),
        validEmailRate:
          dataQuality.validEmails + dataQuality.invalidEmails > 0
            ? Math.round(
                (dataQuality.validEmails /
                  (dataQuality.validEmails + dataQuality.invalidEmails)) *
                  100
              )
            : 0,
      },
      campaignReadiness: {
        smsReady: Math.round((smsReadyCount / sampleSize) * records.length),
        callReady: Math.round((callReadyCount / sampleSize) * records.length),
        emailReady: Math.round((emailReadyCount / sampleSize) * records.length),
      },
      dataQuality,
      estimatedFullCost: records.length * 0.03,
      recommendations,
    };

    console.log(
      `[Onboarding Assess] Assessed ${sampleSize}/${records.length} records for team ${teamId}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Onboarding Assess] Error:", error);
    return NextResponse.json(
      { error: "Assessment failed" },
      { status: 500 }
    );
  }
}

/**
 * Audit data format without making API calls
 */
function auditDataFormat(records: CSVRecord[]) {
  let validPhones = 0;
  let invalidPhones = 0;
  let validEmails = 0;
  let invalidEmails = 0;
  let missingNames = 0;
  const phoneSet = new Set<string>();
  let duplicates = 0;

  const validRecords: { name: string; phone: string; email?: string }[] = [];

  for (const record of records) {
    const name =
      record.name || record.Name || record.full_name || "";
    const phone =
      record.phone || record.Phone || record.phone_number || "";
    const email = record.email || record.Email;

    // Check name
    if (!name || name.trim() === "") {
      missingNames++;
    }

    // Phone validation
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length >= 10 && normalizedPhone.length <= 11) {
        if (phoneSet.has(normalizedPhone)) {
          duplicates++;
        } else {
          phoneSet.add(normalizedPhone);
          validPhones++;

          // Add to valid records for sampling
          if (name.trim()) {
            validRecords.push({
              name: name.trim(),
              phone: normalizedPhone,
              email: email || undefined,
            });
          }
        }
      } else {
        invalidPhones++;
      }
    } else {
      invalidPhones++;
    }

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        validEmails++;
      } else {
        invalidEmails++;
      }
    }
  }

  return {
    dataQuality: {
      validPhones,
      invalidPhones,
      validEmails,
      invalidEmails,
      missingNames,
      duplicates,
    },
    validRecords,
  };
}

/**
 * Randomly sample records for assessment
 */
function sampleRecords<T>(records: T[], sampleSize: number): T[] {
  if (sampleSize >= records.length) {
    return [...records];
  }

  // Fisher-Yates shuffle and take first N
  const shuffled = [...records];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, sampleSize);
}
