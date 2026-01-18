/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD LAB ASSESSMENT API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/lead-lab/assess
 *
 * Receives CSV upload and processes through Trestle Real Contact API.
 * This is the NEXTIER wrapper around Trestle that powers Lead Lab.
 *
 * FREE TIER: Up to 10,000 records, aggregate stats only
 * PAID TIER: Unlimited records, per-lead results, CSV export
 */

import { NextRequest, NextResponse } from "next/server";
import {
  processBatch,
  parseCSVForBatch,
  BATCH_CONFIG,
  type BatchRecord,
  type BatchStats,
} from "@/lib/trestle/batch-upload";
import { nanoid } from "nanoid";

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (Replace with Redis/DB in production)
// ═══════════════════════════════════════════════════════════════════════════════

interface Assessment {
  id: string;
  email: string;
  tier: "free" | "paid";
  status: "pending" | "processing" | "complete" | "error";
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  recordCount: number;
  stats?: LeadLabStats;
  results?: any[];
}

// Transform BatchStats to LeadLab format expected by frontend
interface LeadLabStats {
  total: number;
  gradeBreakdown: { A: number; B: number; C: number; D: number; F: number };
  qualityBreakdown: { high: number; medium: number; low: number };
  averageScore: number;
  contactableRate: number;
  litigatorRiskCount: number;
  mobileCount: number;
  landlineCount: number;
  dataFormat: {
    validPhones: number;
    invalidPhones: number;
    validEmails: number;
    invalidEmails: number;
    missingNames: number;
    duplicates: number;
  };
  campaignReadiness: {
    smsReady: number;
    callReady: number;
    emailReady: number;
    notReady: number;
  };
}

// In-memory store - exported so status route can access it
export const assessments = new Map<string, Assessment>();

// Export types for status route
export type { Assessment, LeadLabStats };

// Export getter for status route
export async function getAssessmentJob(assessmentId: string): Promise<Assessment | null> {
  return assessments.get(assessmentId) || null;
}

// Export updater for webhook route
export async function updateAssessmentJob(
  assessmentId: string,
  updates: Partial<Assessment>
): Promise<Assessment | null> {
  const job = assessments.get(assessmentId);
  if (!job) return null;

  const updated = { ...job, ...updates };
  assessments.set(assessmentId, updated);
  return updated;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Submit Assessment
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const email = formData.get("email") as string;
    const file = formData.get("file") as File | null;
    const tier = (formData.get("tier") as string) || "free";

    // Validate inputs
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "CSV file required" },
        { status: 400 }
      );
    }

    // Parse CSV
    const csvContent = await file.text();
    const records = parseCSVForBatch(csvContent);

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No valid records found in CSV. Ensure it has name and phone columns." },
        { status: 400 }
      );
    }

    // Check free tier limit
    if (tier === "free" && records.length > BATCH_CONFIG.FREE_TIER_MAX_RECORDS) {
      return NextResponse.json(
        {
          error: `Free tier limited to ${BATCH_CONFIG.FREE_TIER_MAX_RECORDS.toLocaleString()} records`,
          requiresPayment: true,
          recordCount: records.length,
          estimatedCost: Math.max(5.00, records.length * BATCH_CONFIG.COST_PER_QUERY),
        },
        { status: 402 }
      );
    }

    // Create assessment
    const assessmentId = nanoid(12);
    const assessment: Assessment = {
      id: assessmentId,
      email,
      tier: tier as "free" | "paid",
      status: "pending",
      createdAt: new Date(),
      recordCount: records.length,
    };

    assessments.set(assessmentId, assessment);

    console.log(`[Lead Lab] Assessment ${assessmentId} created:`, {
      email,
      tier,
      records: records.length,
    });

    // Process in background (don't await)
    processAssessmentAsync(assessmentId, records, email);

    return NextResponse.json({
      success: true,
      assessmentId,
      recordCount: records.length,
      message: "Assessment started. Poll /api/lead-lab/status/{id} for results.",
    });
  } catch (error: any) {
    console.error("[Lead Lab] Error:", error);
    return NextResponse.json(
      { error: error.message || "Assessment failed" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

async function processAssessmentAsync(
  assessmentId: string,
  records: BatchRecord[],
  email: string
) {
  const assessment = assessments.get(assessmentId);
  if (!assessment) return;

  try {
    // Update status
    assessment.status = "processing";
    assessments.set(assessmentId, assessment);

    console.log(`[Lead Lab] Processing ${records.length} records for ${assessmentId}...`);

    // Process through Trestle
    const { results, stats } = await processBatch(records, {
      onProgress: (processed, total) => {
        console.log(`[Lead Lab] ${assessmentId}: ${processed}/${total}`);
      },
    });

    // Transform stats to frontend format
    const leadLabStats = transformToLeadLabStats(stats, records, results);

    // Update assessment
    assessment.status = "complete";
    assessment.completedAt = new Date();
    assessment.stats = leadLabStats;

    // Store results for paid tier
    if (assessment.tier === "paid") {
      assessment.results = results;
    }

    assessments.set(assessmentId, assessment);

    console.log(`[Lead Lab] Assessment ${assessmentId} complete:`, {
      contactableRate: leadLabStats.contactableRate,
      gradeA: leadLabStats.gradeBreakdown.A,
      gradeB: leadLabStats.gradeBreakdown.B,
    });

    // TODO: Send email with results
    // await sendAssessmentEmail(email, leadLabStats);

  } catch (error: any) {
    console.error(`[Lead Lab] Assessment ${assessmentId} failed:`, error);
    assessment.status = "error";
    assessment.error = error.message;
    assessments.set(assessmentId, assessment);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORM STATS
// ═══════════════════════════════════════════════════════════════════════════════

function transformToLeadLabStats(
  batchStats: BatchStats,
  records: BatchRecord[],
  results: any[]
): LeadLabStats {
  // Count valid/invalid phones and emails
  let validPhones = 0;
  let invalidPhones = 0;
  let validEmails = 0;
  let invalidEmails = 0;
  let missingNames = 0;

  records.forEach((record) => {
    // Phone validation (basic - real validation happens in Trestle)
    const phoneDigits = record.phone.replace(/\D/g, "");
    if (phoneDigits.length >= 10) {
      validPhones++;
    } else {
      invalidPhones++;
    }

    // Email validation
    if (record.email) {
      if (record.email.includes("@") && record.email.includes(".")) {
        validEmails++;
      } else {
        invalidEmails++;
      }
    }

    // Name check
    if (!record.name || record.name.trim().length < 2) {
      missingNames++;
    }
  });

  // Check for duplicates
  const phoneSet = new Set<string>();
  let duplicates = 0;
  records.forEach((record) => {
    const phone = record.phone.replace(/\D/g, "");
    if (phoneSet.has(phone)) {
      duplicates++;
    } else {
      phoneSet.add(phone);
    }
  });

  // Calculate campaign readiness
  const smsReady = batchStats.contactable;
  const callReady = batchStats.mobile + batchStats.landline;
  const emailReady = validEmails;
  const notReady = Math.max(0, batchStats.total - Math.max(smsReady, callReady, emailReady));

  // Calculate average score
  let totalScore = 0;
  let scoredCount = 0;
  results.forEach((r) => {
    if (r.activityScore !== null) {
      totalScore += r.activityScore;
      scoredCount++;
    }
  });
  const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

  return {
    total: batchStats.total,
    gradeBreakdown: {
      A: batchStats.gradeA,
      B: batchStats.gradeB,
      C: batchStats.gradeC,
      D: batchStats.gradeD,
      F: batchStats.gradeF,
    },
    qualityBreakdown: {
      high: batchStats.highActivity,
      medium: batchStats.mediumActivity,
      low: batchStats.lowActivity,
    },
    averageScore,
    contactableRate: Math.round(batchStats.contactabilityRate * 100),
    litigatorRiskCount: batchStats.litigatorRisk,
    mobileCount: batchStats.mobile,
    landlineCount: batchStats.landline,
    dataFormat: {
      validPhones,
      invalidPhones,
      validEmails,
      invalidEmails,
      missingNames,
      duplicates,
    },
    campaignReadiness: {
      smsReady,
      callReady,
      emailReady,
      notReady,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Assessment Info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    name: "Lead Lab Assessment API",
    version: "1.0.0",
    description: "NEXTIER wrapper around Trestle Real Contact API",

    freeTier: {
      maxRecords: BATCH_CONFIG.FREE_TIER_MAX_RECORDS,
      features: ["Aggregate stats", "Grade distribution", "Activity scoring"],
    },

    paidTier: {
      pricePerRecord: `$${BATCH_CONFIG.COST_PER_QUERY}`,
      minCharge: "$5.00",
      features: ["Per-lead results", "CSV export", "No record limit"],
    },

    endpoints: {
      submit: "POST /api/lead-lab/assess (multipart/form-data)",
      status: "GET /api/lead-lab/status/{assessmentId}",
    },

    requiredColumns: ["name (or first_name + last_name)", "phone"],
    optionalColumns: ["email", "address", "city", "state", "zip"],
  });
}
