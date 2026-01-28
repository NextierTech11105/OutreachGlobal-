/**
 * LUCI Skip Trace Endpoint
 *
 * This endpoint is called by Campaign Hub to skip trace leads.
 * It uses the existing SkipTraceService with Tracerfy ($0.02/lead) as primary provider.
 *
 * Request: { leadIds: string[], teamId?: string }
 * Response: { success: boolean, results: SkipTraceResult[], stats: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm"; 
import { apiAuth } from "@/lib/api-auth";
import { getSkipTraceService } from "@/lib/services/skip-trace-service";

// Get skip trace service (uses Tracerfy when available)
const skipTraceService = getSkipTraceService();

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId, teamId: authTeamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds, teamId } = body;

    // Use auth teamId if not provided
    const effectiveTeamId = teamId || authTeamId;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds array required", success: false },
        { status: 400 }
      );
    }

    console.log(
      `[LUCI Skip Trace] Processing ${leadIds.length} leads for team ${effectiveTeamId}`
    );

    // Fetch lead data from database and enforce auth team scoping
    const leadRecords = await db
      .select()
      .from(leads)
      .where(and(eq(leads.teamId, effectiveTeamId), inArray(leads.id, leadIds)));

    if (leadRecords.length === 0) {
      return NextResponse.json(
        { error: "No leads found for this team", success: false },
        { status: 404 }
      );
    }

    if (leadRecords.length !== leadIds.length) {
      return NextResponse.json(
        {
          error: "One or more leads not found for this team",
          requested: leadIds.length,
          found: leadRecords.length,
        },
        { status: 403 }
      );
    }

    console.log(`[LUCI Skip Trace] Found ${leadRecords.length} lead records`);

    // Skip trace each lead
    const results: Array<{
      leadId: string;
      success: boolean;
      primaryMobile?: string;
      phones: Array<{ number: string; type: string }>;
      emails: string[];
      error?: string;
    }> = [];

    let successful = 0;
    let withMobile = 0;
    let withEmail = 0;
    let errors = 0;

    for (const lead of leadRecords) {
      // Get name and address from lead
      const firstName = lead.firstName || "";
      const lastName = lead.lastName || "";
      const address = lead.address || "";
      const city = lead.city || "";
      const state = lead.state || "";
      const zipCode = lead.zipCode || "";

      // Skip if no name
      if (!firstName && !lastName) {
        results.push({
          leadId: lead.id,
          success: false,
          phones: [],
          emails: [],
          error: "Missing name",
        });
        errors++;
        continue;
      }

      // Skip if no address
      if (!address || !city || !state) {
        results.push({
          leadId: lead.id,
          success: false,
          phones: [],
          emails: [],
          error: "Missing address info",
        });
        errors++;
        continue;
      }

      try {
        // Call skip trace service
        const result = await skipTraceService.skipTraceSingle({
          firstName,
          lastName,
          address,
          city,
          state,
          zip: zipCode,
        });

        if (result.success && result.phones.length > 0) {
          successful++;

          // Get primary mobile
          const primaryMobile =
            result.primaryMobile ||
            result.phones.find(
              (p) =>
                p.type?.toLowerCase() === "mobile" ||
                p.type?.toLowerCase() === "cell"
            )?.number ||
            result.phones[0]?.number;

          if (primaryMobile) {
            withMobile++;

            // Update lead with phone number
            await db
              .update(leads)
              .set({
                phone: primaryMobile,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, lead.id));
          }

          if (result.emails && result.emails.length > 0) {
            withEmail++;

            // Update lead with email if not already set
            if (!lead.email) {
              await db
                .update(leads)
                .set({
                  email: result.primaryEmail || result.emails[0],
                  updatedAt: new Date(),
                })
                .where(eq(leads.id, lead.id));
            }
          }

          results.push({
            leadId: lead.id,
            success: true,
            primaryMobile,
            phones: result.phones,
            emails: result.emails,
          });
        } else {
          results.push({
            leadId: lead.id,
            success: false,
            phones: result.phones || [],
            emails: result.emails || [],
            error: result.error || "No phone found",
          });
          errors++;
        }
      } catch (err) {
        console.error(`[LUCI Skip Trace] Error for lead ${lead.id}:`, err);
        results.push({
          leadId: lead.id,
          success: false,
          phones: [],
          emails: [],
          error: err instanceof Error ? err.message : "Skip trace failed",
        });
        errors++;
      }

      // Small delay between requests to avoid rate limiting
      if (leadRecords.indexOf(lead) < leadRecords.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Get usage stats
    const usageStats = skipTraceService.getUsageStats();

    console.log(
      `[LUCI Skip Trace] Complete: ${successful}/${leadRecords.length} successful, ${withMobile} with mobile, ${withEmail} with email`
    );

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: leadRecords.length,
        successful,
        withMobile,
        withEmail,
        errors,
      },
      usage: {
        today: usageStats.count,
        limit: usageStats.limit,
        remaining: usageStats.remaining,
        costPerLead: usageStats.costPerLead,
      },
    });
  } catch (error) {
    console.error("[LUCI Skip Trace] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Skip trace failed",
      },
      { status: 500 }
    );
  }
}

// GET - Check status and configuration
export async function GET() {
  try {
    const usageStats = skipTraceService.getUsageStats();

    return NextResponse.json({
      configured: true,
      provider: usageStats.provider,
      usage: {
        today: usageStats.count,
        limit: usageStats.limit,
        remaining: usageStats.remaining,
      },
      costPerLead: usageStats.costPerLead,
      batchSize: usageStats.batchSize,
    });
  } catch (error) {
    console.error("[LUCI Skip Trace] Status error:", error);
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
