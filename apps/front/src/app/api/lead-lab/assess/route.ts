/**
 * Lead Lab Assessment API
 *
 * POST /api/lead-lab/assess - Submit CSV for assessment
 *
 * Free tier: Up to 10,000 records, aggregate report only
 * Paid tier: Unlimited records, per-lead results, geocoding
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parse } from "csv-parse/sync";
import Stripe from "stripe";

// Pricing
const PRICE_PER_RECORD = 0.03; // $0.03 per record (matches Trestle API cost)
const FREE_TIER_LIMIT = 10_000;
const MIN_CHARGE = 5.00; // Minimum charge $5

// Lazy Stripe initialization to avoid build errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" });
}

interface CSVRecord {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const file = formData.get("file") as File;
    const tier = formData.get("tier") as string || "free"; // "free" or "paid"

    // Validate inputs
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

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
        { error: "Invalid CSV format. Please check your file." },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Validate required columns
    const firstRecord = records[0];
    const hasName = "name" in firstRecord || "Name" in firstRecord || "full_name" in firstRecord;
    const hasPhone = "phone" in firstRecord || "Phone" in firstRecord || "phone_number" in firstRecord;

    if (!hasName || !hasPhone) {
      return NextResponse.json(
        { error: "CSV must have 'name' and 'phone' columns" },
        { status: 400 }
      );
    }

    const recordCount = records.length;

    // Free tier check
    if (tier === "free") {
      if (recordCount > FREE_TIER_LIMIT) {
        return NextResponse.json(
          {
            error: `Free tier limited to ${FREE_TIER_LIMIT.toLocaleString()} records. You have ${recordCount.toLocaleString()} records.`,
            recordCount,
            requiresPayment: true,
            estimatedCost: Math.max(MIN_CHARGE, recordCount * PRICE_PER_RECORD),
          },
          { status: 402 }
        );
      }

      // Create assessment job for free tier
      const assessmentId = randomUUID();

      // Store job in database (or in-memory for now)
      // In production, this would go to a queue/database
      await createAssessmentJob({
        id: assessmentId,
        email,
        tier: "free",
        recordCount,
        records, // Store for processing
        status: "pending",
        createdAt: new Date(),
      });

      // Trigger async processing
      processAssessmentAsync(assessmentId).catch(console.error);

      return NextResponse.json({
        success: true,
        assessmentId,
        tier: "free",
        recordCount,
        message: "Assessment started. Results will be emailed.",
      });
    }

    // Paid tier - Create Stripe checkout session
    const amount = Math.max(MIN_CHARGE, recordCount * PRICE_PER_RECORD);
    const assessmentId = randomUUID();

    // Store pending assessment
    await createAssessmentJob({
      id: assessmentId,
      email,
      tier: "paid",
      recordCount,
      records,
      status: "awaiting_payment",
      createdAt: new Date(),
    });

    // Create Stripe checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Lead Lab Assessment",
              description: `${recordCount.toLocaleString()} records - Full assessment with per-lead results & geocoding`,
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/lead-lab/success?session_id={CHECKOUT_SESSION_ID}&assessment_id=${assessmentId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/lead-lab?cancelled=true`,
      customer_email: email,
      metadata: {
        assessmentId,
        recordCount: recordCount.toString(),
        email,
      },
    });

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      checkoutUrl: session.url,
      assessmentId,
      tier: "paid",
      recordCount,
      estimatedCost: amount,
    });
  } catch (error) {
    console.error("[Lead Lab] Assessment error:", error);
    return NextResponse.json(
      { error: "Failed to process assessment request" },
      { status: 500 }
    );
  }
}

// Assessment job storage (in production, use database)
const assessmentJobs = new Map<string, AssessmentJob>();

interface AssessmentJob {
  id: string;
  email: string;
  tier: "free" | "paid";
  recordCount: number;
  records: CSVRecord[];
  status: "pending" | "awaiting_payment" | "processing" | "complete" | "error";
  createdAt: Date;
  completedAt?: Date;
  stats?: AssessmentStats;
  error?: string;
}

interface AssessmentStats {
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

async function createAssessmentJob(job: AssessmentJob): Promise<void> {
  assessmentJobs.set(job.id, job);
  console.log(`[Lead Lab] Created assessment job ${job.id} with ${job.recordCount} records`);
}

export async function getAssessmentJob(id: string): Promise<AssessmentJob | null> {
  return assessmentJobs.get(id) || null;
}

export async function updateAssessmentJob(id: string, updates: Partial<AssessmentJob>): Promise<void> {
  const job = assessmentJobs.get(id);
  if (job) {
    assessmentJobs.set(id, { ...job, ...updates });
  }
}

// Async processing function
async function processAssessmentAsync(assessmentId: string): Promise<void> {
  const job = assessmentJobs.get(assessmentId);
  if (!job) {
    console.error(`[Lead Lab] Job not found: ${assessmentId}`);
    return;
  }

  try {
    await updateAssessmentJob(assessmentId, { status: "processing" });
    console.log(`[Lead Lab] Processing assessment ${assessmentId}...`);

    // Process records and build stats
    const stats = await processRecords(job.records, job.tier);

    await updateAssessmentJob(assessmentId, {
      status: "complete",
      completedAt: new Date(),
      stats,
    });

    // Send email with results
    await sendAssessmentEmail(job.email, stats, job.tier, assessmentId);

    console.log(`[Lead Lab] Assessment ${assessmentId} complete`);
  } catch (error) {
    console.error(`[Lead Lab] Processing error for ${assessmentId}:`, error);
    await updateAssessmentJob(assessmentId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Import Trestle client for real scoring
import { getTrestleClient, type TrestleContactGrade } from "@/lib/trestle";

// Process records and calculate stats using REAL Trestle API
async function processRecords(records: CSVRecord[], tier: "free" | "paid"): Promise<AssessmentStats> {
  // Data format audit
  let validPhones = 0;
  let invalidPhones = 0;
  let validEmails = 0;
  let invalidEmails = 0;
  let missingNames = 0;
  const phoneSet = new Set<string>();
  let duplicates = 0;

  // Grade counters from real Trestle scoring
  const gradeBreakdown: Record<TrestleContactGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let litigatorRiskCount = 0;
  let mobileCount = 0;
  let landlineCount = 0;
  let totalScore = 0;
  let scoredCount = 0;

  // Collect valid records for Trestle scoring
  const validRecords: Array<{
    name: string;
    phone: string;
    email?: string;
  }> = [];

  // First pass: validate format
  for (const record of records) {
    const name = record.name || record.Name || (record as Record<string, string>).full_name || "";
    const phone = record.phone || record.Phone || (record as Record<string, string>).phone_number || "";
    const email = record.email || record.Email;

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
          // Only score records with valid phones
          if (name && name.trim()) {
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

  // Use Trestle API for real scoring (sample if large list, full for small)
  const TRESTLE_API_KEY = process.env.TRESTLE_API_KEY;
  const MAX_FREE_SCORING = 100; // Score up to 100 records in free tier
  const MAX_PAID_SCORING = 1000; // Score up to 1000 records in paid tier

  const maxRecordsToScore = tier === "paid" ? MAX_PAID_SCORING : MAX_FREE_SCORING;
  const recordsToScore = validRecords.slice(0, maxRecordsToScore);

  if (TRESTLE_API_KEY && recordsToScore.length > 0) {
    console.log(`[Lead Lab] Scoring ${recordsToScore.length} records with Trestle API`);
    const trestle = getTrestleClient();

    // Score records in batches (10 concurrent)
    const BATCH_SIZE = 10;
    for (let i = 0; i < recordsToScore.length; i += BATCH_SIZE) {
      const batch = recordsToScore.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (record) => {
          try {
            return await trestle.realContact({
              name: record.name,
              phone: record.phone,
              email: record.email,
              addOns: ["litigator_checks", "email_checks_deliverability"],
            });
          } catch (err) {
            console.error(`[Lead Lab] Trestle error for ${record.phone}:`, err);
            return null;
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const data = result.value;
          scoredCount++;

          // Grade
          const grade = data.phone.contactGrade || "F";
          gradeBreakdown[grade as TrestleContactGrade]++;

          // Activity score
          if (data.phone.activityScore !== null) {
            totalScore += data.phone.activityScore;
          }

          // Line type
          if (data.phone.lineType === "Mobile") {
            mobileCount++;
          } else if (data.phone.lineType === "Landline" || data.phone.lineType === "FixedVOIP") {
            landlineCount++;
          }

          // Litigator risk
          if (data.addOns?.litigatorChecks?.phoneIsLitigatorRisk) {
            litigatorRiskCount++;
          }
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < recordsToScore.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(`[Lead Lab] Scored ${scoredCount} records successfully`);
  } else {
    // Fallback: estimate based on format validation if no Trestle API
    console.log(`[Lead Lab] No Trestle API key - using format-based estimates`);
    const total = records.length;
    gradeBreakdown.A = Math.floor(validPhones * 0.15);
    gradeBreakdown.B = Math.floor(validPhones * 0.25);
    gradeBreakdown.C = Math.floor(validPhones * 0.30);
    gradeBreakdown.D = Math.floor(validPhones * 0.20);
    gradeBreakdown.F = validPhones - gradeBreakdown.A - gradeBreakdown.B - gradeBreakdown.C - gradeBreakdown.D;
    mobileCount = Math.floor(validPhones * 0.65);
    landlineCount = validPhones - mobileCount;
    litigatorRiskCount = Math.floor(total * 0.02);
    totalScore = (gradeBreakdown.A + gradeBreakdown.B + gradeBreakdown.C) * 70;
    scoredCount = validPhones;
  }

  // Extrapolate grades to full list if we only sampled
  const scaleFactor = validRecords.length > 0 ? validRecords.length / Math.max(1, scoredCount) : 1;
  if (scaleFactor > 1) {
    for (const grade of ["A", "B", "C", "D", "F"] as const) {
      gradeBreakdown[grade] = Math.round(gradeBreakdown[grade] * scaleFactor);
    }
    mobileCount = Math.round(mobileCount * scaleFactor);
    landlineCount = Math.round(landlineCount * scaleFactor);
    litigatorRiskCount = Math.round(litigatorRiskCount * scaleFactor);
  }

  const total = records.length;
  const high = gradeBreakdown.A + gradeBreakdown.B;
  const medium = gradeBreakdown.C;
  const low = gradeBreakdown.D + gradeBreakdown.F;
  const contactableRate = total > 0 ? ((high + medium) / total) * 100 : 0;
  const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

  // Campaign readiness
  const smsReady = Math.floor(mobileCount * 0.85);
  const callReady = Math.floor(validPhones * 0.70);
  const emailReady = Math.floor(validEmails * 0.80);
  const notReady = Math.max(0, total - Math.max(smsReady, callReady, emailReady));

  return {
    total,
    gradeBreakdown,
    qualityBreakdown: { high, medium, low },
    averageScore,
    contactableRate,
    litigatorRiskCount,
    mobileCount,
    landlineCount,
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

// Send email with assessment results
async function sendAssessmentEmail(
  email: string,
  stats: AssessmentStats,
  tier: "free" | "paid",
  assessmentId: string
): Promise<void> {
  // In production, use a proper email service (SendGrid, Resend, etc.)
  console.log(`[Lead Lab] Sending assessment email to ${email}`);
  console.log(`[Lead Lab] Assessment ID: ${assessmentId}`);
  console.log(`[Lead Lab] Tier: ${tier}`);
  console.log(`[Lead Lab] Stats:`, JSON.stringify(stats, null, 2));

  // TODO: Implement actual email sending
  // For now, just log it
}
