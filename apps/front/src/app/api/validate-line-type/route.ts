/**
 * Line Type Validation API
 *
 * Uses Twilio Lookup to detect phone line type and routes accordingly:
 * - MOBILE → SMS Queue (for texting)
 * - LANDLINE/VOIP → Call Queue (for power dialer)
 *
 * Cost: ~$0.005 per lookup (Twilio Lookup v2)
 */

import { NextRequest, NextResponse } from "next/server";

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_LOOKUP_URL = "https://lookups.twilio.com/v2/PhoneNumbers";

// Line types
export type LineType =
  | "mobile"
  | "landline"
  | "voip"
  | "toll_free"
  | "premium"
  | "unknown";

export interface LineTypeResult {
  phone: string;
  lineType: LineType;
  carrier?: string;
  error?: string;
  routeTo: "sms" | "call" | "skip";
  reason?: string;
}

export interface ValidationRequest {
  phones: string[];
  addToQueue?: boolean; // Automatically add to appropriate queue
  leadData?: Array<{
    phone: string;
    leadId: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    address?: string;
  }>;
  smsTemplate?: string;
  smsCampaignId?: string;
}

/**
 * Validate a single phone number using Twilio Lookup
 */
async function validateLineType(phone: string): Promise<LineTypeResult> {
  // Normalize phone number
  const normalized = phone.replace(/\D/g, "");

  // Basic validation
  if (normalized.length < 10 || normalized.length > 11) {
    return {
      phone,
      lineType: "unknown",
      routeTo: "skip",
      reason: "Invalid phone number length",
      error: "Invalid phone number",
    };
  }

  // Format to E.164 for Twilio
  const e164 = normalized.length === 10 ? `+1${normalized}` : `+${normalized}`;

  // If no Twilio credentials, use heuristic
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn("[Line Type] Twilio not configured, using heuristic");
    return heuristicLineType(phone, normalized);
  }

  try {
    const response = await fetch(
      `${TWILIO_LOOKUP_URL}/${e164}?Fields=line_type_intelligence`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Line Type] Twilio error:", response.status, errorText);

      // Fallback to heuristic if Twilio fails
      return heuristicLineType(phone, normalized);
    }

    const data = await response.json();
    const lineTypeInfo = data.line_type_intelligence || {};
    const lineType = mapTwilioLineType(lineTypeInfo.type);
    const carrier = lineTypeInfo.carrier_name;

    // Determine routing
    const { routeTo, reason } = determineRoute(lineType);

    return {
      phone,
      lineType,
      carrier,
      routeTo,
      reason,
    };
  } catch (error) {
    console.error("[Line Type] Lookup error:", error);
    return heuristicLineType(phone, normalized);
  }
}

/**
 * Map Twilio line type to our types
 */
function mapTwilioLineType(twilioType: string | undefined): LineType {
  const typeMap: Record<string, LineType> = {
    mobile: "mobile",
    landline: "landline",
    voip: "voip",
    tollFree: "toll_free",
    toll_free: "toll_free",
    premium: "premium",
    fixed_voip: "voip",
    nonFixedVoip: "voip",
    non_fixed_voip: "voip",
  };

  return typeMap[twilioType || ""] || "unknown";
}

/**
 * Determine which queue to route based on line type
 */
function determineRoute(lineType: LineType): {
  routeTo: "sms" | "call" | "skip";
  reason: string;
} {
  switch (lineType) {
    case "mobile":
      return { routeTo: "sms", reason: "Mobile - SMS enabled" };

    case "landline":
      return { routeTo: "call", reason: "Landline - Call only" };

    case "voip":
      // VOIP can sometimes receive SMS but unreliable - route to call
      return { routeTo: "call", reason: "VoIP - Unreliable SMS, use call" };

    case "toll_free":
      return { routeTo: "skip", reason: "Toll-free - Cannot contact" };

    case "premium":
      return { routeTo: "skip", reason: "Premium rate - Skip" };

    case "unknown":
    default:
      // Unknown - default to call queue to be safe (won't get carrier spam flags)
      return { routeTo: "call", reason: "Unknown type - Default to call" };
  }
}

/**
 * Heuristic line type detection when Twilio is unavailable
 * Uses NPA-NXX patterns and carrier data
 */
function heuristicLineType(phone: string, normalized: string): LineTypeResult {
  // Basic heuristics:
  // - 800, 888, 877, 866, 855, 844, 833 = toll-free
  // - 900, 976 = premium
  // - Most others default to unknown (route to call for safety)

  const areaCode =
    normalized.length === 11 ? normalized.slice(1, 4) : normalized.slice(0, 3);

  const tollFreeCodes = ["800", "888", "877", "866", "855", "844", "833"];
  const premiumCodes = ["900", "976"];

  if (tollFreeCodes.includes(areaCode)) {
    return {
      phone,
      lineType: "toll_free",
      routeTo: "skip",
      reason: "Toll-free detected (heuristic)",
    };
  }

  if (premiumCodes.includes(areaCode)) {
    return {
      phone,
      lineType: "premium",
      routeTo: "skip",
      reason: "Premium rate detected (heuristic)",
    };
  }

  // Without Twilio, we can't reliably detect mobile vs landline
  // Default to call queue to avoid SMS spam issues
  return {
    phone,
    lineType: "unknown",
    routeTo: "call",
    reason: "Unknown type (no Twilio) - Default to call for safety",
  };
}

/**
 * POST - Validate line types and optionally route to queues
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const {
      phones,
      addToQueue = false,
      leadData,
      smsTemplate,
      smsCampaignId,
    } = body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json(
        { error: "phones array required", success: false },
        { status: 400 },
      );
    }

    if (phones.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 phones per request", success: false },
        { status: 400 },
      );
    }

    // Validate all phones
    const results: LineTypeResult[] = [];
    const stats = {
      mobile: 0,
      landline: 0,
      voip: 0,
      toll_free: 0,
      premium: 0,
      unknown: 0,
      smsQueue: 0,
      callQueue: 0,
      skipped: 0,
    };

    for (const phone of phones) {
      const result = await validateLineType(phone);
      results.push(result);

      // Update stats
      stats[result.lineType]++;
      if (result.routeTo === "sms") stats.smsQueue++;
      else if (result.routeTo === "call") stats.callQueue++;
      else stats.skipped++;

      // Small delay to avoid rate limits
      if (phones.length > 10) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    // If addToQueue is true, add to appropriate queues
    let queueResults = null;
    if (addToQueue && leadData) {
      queueResults = await routeToQueues(
        results,
        leadData,
        smsTemplate,
        smsCampaignId,
      );
    }

    return NextResponse.json({
      success: true,
      results,
      stats,
      queueResults,
      summary: `${stats.smsQueue} to SMS, ${stats.callQueue} to Call, ${stats.skipped} skipped`,
    });
  } catch (error) {
    console.error("[Line Type] Validation error:", error);
    return NextResponse.json(
      { error: "Validation failed", success: false },
      { status: 500 },
    );
  }
}

/**
 * Route validated phones to appropriate queues
 */
async function routeToQueues(
  results: LineTypeResult[],
  leadData: ValidationRequest["leadData"],
  smsTemplate?: string,
  campaignId?: string,
) {
  const smsLeads: Array<{
    leadId: string;
    phone: string;
    firstName: string;
    lastName?: string;
    companyName?: string;
  }> = [];

  const callLeads: Array<{
    id: string;
    name: string;
    phone: string;
    address?: string;
  }> = [];

  // Build lead lookup
  const leadMap = new Map<string, (typeof leadData)[0]>();
  leadData?.forEach((lead) => {
    leadMap.set(lead.phone.replace(/\D/g, "").slice(-10), lead);
  });

  // Route based on validation results
  for (const result of results) {
    const normalizedPhone = result.phone.replace(/\D/g, "").slice(-10);
    const lead = leadMap.get(normalizedPhone);

    if (!lead) continue;

    if (result.routeTo === "sms") {
      smsLeads.push({
        leadId: lead.leadId,
        phone: result.phone,
        firstName: lead.firstName || "",
        lastName: lead.lastName,
        companyName: lead.companyName,
      });
    } else if (result.routeTo === "call") {
      callLeads.push({
        id: lead.leadId,
        name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
        phone: result.phone,
        address: lead.address,
      });
    }
  }

  const queueResults = {
    sms: { added: 0, skipped: 0 },
    call: { added: 0, skipped: 0 },
  };

  // Add to SMS queue (if template provided)
  if (smsLeads.length > 0 && smsTemplate) {
    try {
      const smsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/sms/queue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_batch",
            leads: smsLeads,
            templateMessage: smsTemplate,
            templateCategory: "line-validated",
            campaignId,
          }),
        },
      );

      if (smsResponse.ok) {
        const smsData = await smsResponse.json();
        queueResults.sms.added = smsData.added || 0;
        queueResults.sms.skipped = smsData.skipped || 0;
      }
    } catch (err) {
      console.error("[Line Type] SMS queue error:", err);
    }
  }

  // Add to Call queue
  if (callLeads.length > 0) {
    try {
      const callResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/call-center/queue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_batch",
            leads: callLeads,
            priority: 5,
          }),
        },
      );

      if (callResponse.ok) {
        const callData = await callResponse.json();
        queueResults.call.added = callData.added || 0;
        queueResults.call.skipped = callData.skipped || 0;
      }
    } catch (err) {
      console.error("[Line Type] Call queue error:", err);
    }
  }

  return queueResults;
}

/**
 * GET - API documentation and status
 */
export async function GET() {
  const hasTwilio = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);

  return NextResponse.json({
    name: "Line Type Validation API",
    description: "Validates phone line types and routes to appropriate queues",
    configured: {
      twilio: hasTwilio,
      fallback: "Heuristic detection when Twilio unavailable",
    },
    routing: {
      mobile: "SMS Queue - For texting campaigns",
      landline: "Call Queue - For power dialer",
      voip: "Call Queue - SMS unreliable on VoIP",
      toll_free: "Skip - Cannot contact toll-free numbers",
      premium: "Skip - Premium rate numbers blocked",
      unknown: "Call Queue - Default to call for safety",
    },
    endpoints: {
      validate: "POST /api/validate-line-type { phones: ['1234567890'] }",
      validateAndRoute:
        "POST /api/validate-line-type { phones, addToQueue: true, leadData: [...], smsTemplate }",
    },
    cost: hasTwilio ? "~$0.005 per lookup (Twilio)" : "Free (heuristic only)",
  });
}
