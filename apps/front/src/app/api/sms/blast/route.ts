import { NextRequest, NextResponse } from "next/server";
import { executeBatchSMS } from "@/lib/sms/ExecutionRouter";

/**
 * SMS BLAST API
 *
 * Sends SMS to multiple leads in a campaign batch.
 * Uses ExecutionRouter for all sends.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, template, limit, leads, teamId } = body;

    // If leads provided directly, use them
    // Otherwise fetch from database by campaignId
    let recipients: Array<{
      to: string;
      variables: Record<string, string>;
      leadId?: string;
    }> = [];

    if (leads && Array.isArray(leads)) {
      recipients = leads.map((lead: { phone: string; firstName?: string; lastName?: string; company?: string; id?: string }) => ({
        to: lead.phone,
        variables: {
          firstName: lead.firstName || "",
          lastName: lead.lastName || "",
          company: lead.company || "",
          name: lead.firstName || "",
        },
        leadId: lead.id,
      }));
    } else if (campaignId) {
      // Fetch leads from campaign
      // For now, return error - need leads passed directly
      return NextResponse.json(
        { success: false, error: "Pass leads array directly" },
        { status: 400 }
      );
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No leads to send to" },
        { status: 400 }
      );
    }

    // Use default template if custom template provided
    // ExecutionRouter requires templateId from CARTRIDGE_LIBRARY
    const templateId = "bb-1"; // Default opener template

    const result = await executeBatchSMS({
      templateId,
      recipients: recipients.slice(0, limit || 100),
      teamId,
      campaignId,
      worker: "GIANNA",
      trainingMode: process.env.SMS_TRAINING_MODE === "true",
    });

    return NextResponse.json({
      success: result.success,
      sent: result.totalSent,
      failed: result.totalFailed,
      total: result.totalRequested,
      trainingMode: result.trainingMode,
    });
  } catch (error) {
    console.error("[SMS Blast] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Blast failed" },
      { status: 500 }
    );
  }
}
