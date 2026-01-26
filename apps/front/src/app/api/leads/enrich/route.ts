/**
 * /api/leads/enrich - Selective Lead Enrichment API
 *
 * Allows "window shopping" raw data and enriching on-demand:
 * - Tracerfy: Skip trace to find phone/email ($0.02/lead)
 * - Trestle: Phone verification & validation ($0.03/lead)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  TracerfyClient,
  extractPhones,
  extractEmails,
} from "@/lib/tracerfy";
import { verifyPhone } from "@/lib/luci/trestle-client";

const tracerfy = new TracerfyClient();

interface EnrichRequest {
  leadIds: string[];
  provider: "tracerfy" | "trestle";
  teamId?: string;
}

// GET - Get enrichment status and pricing
export async function GET() {
  try {
    let tracerfyCredits = 0;
    try {
      const analytics = await tracerfy.getAnalytics();
      tracerfyCredits = analytics.balance || 0;
    } catch {
      // Tracerfy not configured
    }

    return NextResponse.json({
      success: true,
      providers: {
        tracerfy: {
          name: "Tracerfy Skip Trace",
          cost: 0.02,
          description: "Find phone numbers and emails for leads without contact info",
          configured: !!process.env.TRACERFY_API_KEY,
          credits: tracerfyCredits,
        },
        trestle: {
          name: "Trestle Phone Verification",
          cost: 0.03,
          description: "Verify phone validity, activity score, and line type",
          configured: !!process.env.TRESTLE_API_KEY,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get enrichment status" },
      { status: 500 }
    );
  }
}

// POST - Enrich selected leads
export async function POST(request: NextRequest) {
  try {
    const body: EnrichRequest = await request.json();
    const { leadIds, provider } = body;

    if (!leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No lead IDs provided" },
        { status: 400 }
      );
    }

    if (!provider || !["tracerfy", "trestle"].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Provider must be 'tracerfy' or 'trestle'" },
        { status: 400 }
      );
    }

    // Fetch leads from database
    const leadsToEnrich = await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds));

    if (leadsToEnrich.length === 0) {
      return NextResponse.json(
        { success: false, error: "No leads found with provided IDs" },
        { status: 404 }
      );
    }

    console.log(`[Enrich] Processing ${leadsToEnrich.length} leads with ${provider}`);

    const results: Array<{
      leadId: string;
      success: boolean;
      phone?: string;
      email?: string;
      verification?: any;
      error?: string;
    }> = [];

    if (provider === "tracerfy") {
      // Skip trace to find contact info
      const traceInputs = leadsToEnrich.map((lead) => ({
        first_name: lead.firstName || "",
        last_name: lead.lastName || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        zip: lead.zipCode || "",
      }));

      try {
        const job = await tracerfy.beginTrace(traceInputs, "normal");
        const queue = await tracerfy.waitForQueue(job.queue_id, 3000, 120000);

        if (queue.download_url) {
          const traceResults = await tracerfy.getQueueResults(queue.id);

          for (let i = 0; i < traceResults.length; i++) {
            const result = traceResults[i];
            const lead = leadsToEnrich[i];
            const phones = extractPhones(result as any);
            const emails = extractEmails(result as any);
            const mobile = phones.find((p) => p.type === "Mobile")?.number;
            const primaryEmail = emails[0];

            // Update lead in database with found contact info
            if (mobile || primaryEmail) {
              await db
                .update(leads)
                .set({
                  phone: mobile || lead.phone,
                  email: primaryEmail || lead.email,
                  pipelineStatus: "traced",
                  customFields: {
                    ...(lead.customFields as object || {}),
                    enrichedAt: new Date().toISOString(),
                    enrichedBy: "tracerfy",
                    allPhones: phones.map((p) => p.number),
                    allEmails: emails,
                  },
                  updatedAt: new Date(),
                })
                .where(eq(leads.id, lead.id));
            }

            results.push({
              leadId: lead.id,
              success: true,
              phone: mobile,
              email: primaryEmail,
            });
          }
        } else {
          // Trace didn't complete
          for (const lead of leadsToEnrich) {
            results.push({
              leadId: lead.id,
              success: false,
              error: "Trace job timed out",
            });
          }
        }
      } catch (error) {
        console.error("[Enrich] Tracerfy error:", error);
        for (const lead of leadsToEnrich) {
          results.push({
            leadId: lead.id,
            success: false,
            error: error instanceof Error ? error.message : "Tracerfy error",
          });
        }
      }
    } else if (provider === "trestle") {
      // Verify existing phone numbers
      for (const lead of leadsToEnrich) {
        if (!lead.phone) {
          results.push({
            leadId: lead.id,
            success: false,
            error: "No phone number to verify",
          });
          continue;
        }

        try {
          const verification = await verifyPhone(lead.phone, { checkLitigator: true });

          // Update lead with verification results
          await db
            .update(leads)
            .set({
              score: verification.contactability_score,
              pipelineStatus: verification.recommendation === "APPROVE" ? "verified" : "review",
              customFields: {
                ...(lead.customFields as object || {}),
                verifiedAt: new Date().toISOString(),
                verifiedBy: "trestle",
                trestleResult: {
                  is_valid: verification.is_valid,
                  activity_score: verification.activity_score,
                  line_type: verification.line_type,
                  carrier: verification.carrier,
                  is_litigator_risk: verification.is_litigator_risk,
                  recommendation: verification.recommendation,
                },
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));

          results.push({
            leadId: lead.id,
            success: true,
            phone: lead.phone,
            verification: {
              is_valid: verification.is_valid,
              activity_score: verification.activity_score,
              line_type: verification.line_type,
              recommendation: verification.recommendation,
            },
          });

          // Small delay to respect rate limits
          await new Promise((r) => setTimeout(r, 100));
        } catch (error) {
          results.push({
            leadId: lead.id,
            success: false,
            error: error instanceof Error ? error.message : "Trestle error",
          });
        }
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const cost = provider === "tracerfy" ? successful * 0.02 : successful * 0.03;

    return NextResponse.json({
      success: true,
      provider,
      results,
      stats: {
        total: leadsToEnrich.length,
        successful,
        failed,
        cost: cost.toFixed(2),
      },
    });
  } catch (error) {
    console.error("[Enrich] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Enrichment failed",
      },
      { status: 500 }
    );
  }
}
