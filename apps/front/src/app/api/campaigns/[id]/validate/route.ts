/**
 * Pre-Campaign Validation API
 *
 * Validates leads before campaign launch using Perplexity AI.
 * Filters out stale/closed businesses to protect SMS deliverability.
 *
 * Cost: ~$0.005/lead ($10 for 2,000 leads)
 * ROI: Removes 5-15% stale data → saves SMS costs + protects reputation
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, campaigns } from "@/lib/db/schema";
import { eq, and, gte, lte, isNotNull, sql } from "drizzle-orm";
import {
  batchValidate,
  quickValidationScan,
  BusinessValidation,
} from "@/lib/ai-workers/neva-research";

// Validation result status
type ValidationStatus = "VALID" | "STALE" | "CHANGED" | "UNKNOWN";

interface ValidationResult {
  leadId: string;
  companyName: string;
  status: ValidationStatus;
  confidence: number;
  summary: string;
  signals: Array<{
    source: string;
    signal: string;
    sentiment: "positive" | "negative" | "neutral";
  }>;
}

interface CampaignValidationResponse {
  success: boolean;
  campaignId: string;
  totalLeads: number;
  validated: number;
  results: {
    valid: ValidationResult[];
    stale: ValidationResult[];
    changed: ValidationResult[];
    unknown: ValidationResult[];
  };
  summary: {
    validCount: number;
    staleCount: number;
    changedCount: number;
    unknownCount: number;
    stalePercentage: number;
    estimatedSavings: string;
  };
  executionTimeMs: number;
}

// Classify validation result into status
function classifyValidation(validation: BusinessValidation): ValidationStatus {
  if (validation.status === "CLOSED") return "STALE";
  if (validation.status === "MOVED" || validation.status === "CHANGED_NAME")
    return "CHANGED";
  if (validation.status === "UNKNOWN" || validation.confidence < 50)
    return "UNKNOWN";
  return "VALID";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: campaignId } = await params;

  try {
    // Get campaign details
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaign[0];

    // Parse options from request body
    const body = await request.json().catch(() => ({}));
    const maxConcurrent = body.maxConcurrent || 10;
    const sampleSize = body.sampleSize || 100; // Validate a sample first

    // Get leads for this campaign based on score range and team
    const campaignLeads = await db
      .select({
        id: leads.id,
        company: leads.company,
        city: leads.city,
        state: leads.state,
        zipCode: leads.zipCode,
        phone: leads.phone,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, campaignData.teamId),
          gte(leads.score, campaignData.minScore),
          lte(leads.score, campaignData.maxScore),
          isNotNull(leads.company),
          isNotNull(leads.city),
          isNotNull(leads.state)
        )
      )
      .limit(sampleSize);

    if (campaignLeads.length === 0) {
      return NextResponse.json({
        success: true,
        campaignId,
        totalLeads: 0,
        validated: 0,
        results: { valid: [], stale: [], changed: [], unknown: [] },
        summary: {
          validCount: 0,
          staleCount: 0,
          changedCount: 0,
          unknownCount: 0,
          stalePercentage: 0,
          estimatedSavings: "$0",
        },
        executionTimeMs: Date.now() - startTime,
      });
    }

    // Prepare leads for batch validation
    const leadsToValidate = campaignLeads
      .filter((l) => l.company && l.city && l.state)
      .map((l) => ({
        id: l.id,
        companyName: l.company!,
        city: l.city!,
        state: l.state!,
        zip: l.zipCode || undefined,
        phone: l.phone || undefined,
      }));

    // Run batch validation
    const validationResults = await batchValidate(leadsToValidate, {
      maxConcurrent,
      delayMs: 300,
    });

    // Classify results
    const results: CampaignValidationResponse["results"] = {
      valid: [],
      stale: [],
      changed: [],
      unknown: [],
    };

    for (const lead of leadsToValidate) {
      const validation = validationResults.get(lead.id);
      if (!validation) continue;

      const status = classifyValidation(validation);
      const result: ValidationResult = {
        leadId: lead.id,
        companyName: lead.companyName,
        status,
        confidence: validation.confidence,
        summary: validation.summary,
        signals: validation.signals,
      };

      switch (status) {
        case "VALID":
          results.valid.push(result);
          break;
        case "STALE":
          results.stale.push(result);
          break;
        case "CHANGED":
          results.changed.push(result);
          break;
        case "UNKNOWN":
          results.unknown.push(result);
          break;
      }
    }

    // Calculate summary
    const totalValidated = leadsToValidate.length;
    const stalePercentage =
      totalValidated > 0
        ? Math.round((results.stale.length / totalValidated) * 100)
        : 0;

    // Estimate savings: $0.05/SMS, stale leads = wasted SMS
    const estimatedWastedSMS = results.stale.length * 0.05;
    const estimatedSavings = `$${estimatedWastedSMS.toFixed(2)}`;

    const response: CampaignValidationResponse = {
      success: true,
      campaignId,
      totalLeads: campaignLeads.length,
      validated: totalValidated,
      results,
      summary: {
        validCount: results.valid.length,
        staleCount: results.stale.length,
        changedCount: results.changed.length,
        unknownCount: results.unknown.length,
        stalePercentage,
        estimatedSavings,
      },
      executionTimeMs: Date.now() - startTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Campaign validation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Validation failed",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for validation status check
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  try {
    // Check if campaign exists and get basic info
    const campaign = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        minScore: campaigns.minScore,
        maxScore: campaigns.maxScore,
        teamId: campaigns.teamId,
      })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaign[0];

    // Count leads that would be validated
    const leadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, campaignData.teamId),
          gte(leads.score, campaignData.minScore),
          lte(leads.score, campaignData.maxScore),
          isNotNull(leads.company),
          isNotNull(leads.city),
          isNotNull(leads.state)
        )
      );

    const estimatedCost = (leadCount[0]?.count || 0) * 0.005;

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaignData.name,
      status: campaignData.status,
      leadsToValidate: leadCount[0]?.count || 0,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      estimatedTimeSeconds: Math.ceil((leadCount[0]?.count || 0) / 10) * 2, // ~2s per batch of 10
    });
  } catch (error) {
    console.error("Campaign validation check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Check failed",
      },
      { status: 500 }
    );
  }
}
