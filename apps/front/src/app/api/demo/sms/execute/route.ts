import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Template messages
const TEMPLATES: Record<string, string> = {
  opener: "Hey {firstName}, this is Gianna from Nextier. I noticed you're in {industry} in {city} - we help businesses like yours get more qualified leads. Worth a quick chat?",
  followup: "Hi {firstName}! Just following up on my earlier message. I'd love to show you how we've helped other {industry} professionals in {state} grow their business. Free to talk this week?",
  reengagement: "Hey {firstName}, it's been a while! Wanted to check in and see how things are going at {company}. We've got some new tools that might interest you.",
};

function fillTemplate(template: string, lead: Record<string, string>): string {
  return template
    .replace(/{firstName}/g, lead.firstName || "there")
    .replace(/{lastName}/g, lead.lastName || "")
    .replace(/{company}/g, lead.company || "your company")
    .replace(/{city}/g, lead.city || "your area")
    .replace(/{state}/g, lead.state || "")
    .replace(/{industry}/g, lead.industry || "your industry");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leads = [],
      leadIds = [],
      templateType = "opener",
      customTemplate,
      dryRun = true
    } = body;

    const targetLeads = leads.length > 0 ? leads : [];
    const totalCount = targetLeads.length || leadIds.length;

    if (totalCount === 0) {
      return NextResponse.json(
        { error: "No leads provided for SMS execution" },
        { status: 400 }
      );
    }

    const template = customTemplate || TEMPLATES[templateType] || TEMPLATES.opener;
    const batchId = uuidv4();

    if (dryRun) {
      // Dry run - simulate results without actually sending
      const avgSegments = 1.2;
      const estimatedCost = totalCount * avgSegments * 0.0075;

      return NextResponse.json({
        success: true,
        dryRun: true,
        batchId,
        totalQueued: totalCount,
        success: totalCount,
        failed: 0,
        estimatedCost,
        message: `DRY RUN: Would queue ${totalCount} SMS messages`,
      });
    }

    // Real execution - call SignalHouse or SMS provider
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Check if SignalHouse is configured
    const signalHouseKey = process.env.SIGNALHOUSE_API_KEY;

    if (!signalHouseKey) {
      return NextResponse.json({
        success: false,
        error: "SMS provider not configured. Set SIGNALHOUSE_API_KEY in environment.",
        batchId,
      }, { status: 500 });
    }

    // Send messages via SignalHouse
    for (const lead of targetLeads.slice(0, 100)) { // Limit to 100 for safety
      try {
        const message = fillTemplate(template, lead);

        const response = await fetch("https://api.signalhouse.io/api/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": signalHouseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: lead.phone,
            from: process.env.SIGNALHOUSE_FROM_NUMBER || process.env.SMS_FROM_NUMBER,
            body: message,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          const errData = await response.json().catch(() => ({}));
          errors.push(`${lead.phone}: ${errData.message || response.status}`);
        }
      } catch (err) {
        failCount++;
        errors.push(`${lead.phone}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    const estimatedCost = successCount * 1.2 * 0.0075;

    return NextResponse.json({
      success: true,
      dryRun: false,
      batchId,
      totalQueued: successCount + failCount,
      success: successCount,
      failed: failCount,
      estimatedCost,
      errors: errors.slice(0, 10),
      message: `Sent ${successCount} SMS messages, ${failCount} failed`,
    });

  } catch (error) {
    console.error("[Demo SMS Execute] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute SMS batch" },
      { status: 500 }
    );
  }
}
