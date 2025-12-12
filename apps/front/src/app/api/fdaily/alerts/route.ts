import { NextRequest, NextResponse } from "next/server";

/**
 * FDAILY Alert Dispatcher
 *
 * Triggers campaigns/notifications when material changes detected:
 * - SMS via SignalHouse/Twilio
 * - Email via SendGrid
 * - Webhook notifications
 * - Internal task creation
 *
 * Campaign triggers by change type:
 * - MLS_LISTED:       "Property just listed - act fast!"
 * - MLS_EXPIRED:      "Listing expired - owner frustrated"
 * - MLS_PRICE_DROP:   "Price dropped X% - motivated seller"
 * - DEED_CHANGE:      Remove from campaigns
 * - AUCTION_SCHEDULED: "Auction in X days - last chance"
 * - OCCUPANCY_CHANGE: "Owner moved out - cash offer time"
 * - TAX_LIEN_ADDED:   "Tax lien filed - distressed owner"
 */

// SignalHouse SMS - Uses JWT Bearer token auth
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_JWT = process.env.SIGNALHOUSE_JWT || process.env.SIGNALHOUSE_AUTH_TOKEN || "";
const SIGNALHOUSE_FROM = process.env.SIGNALHOUSE_FROM_NUMBER || "";
const SIGNALHOUSE_GROUP_ID = process.env.SIGNALHOUSE_GROUP_ID || ""; // e.g., "GEUJ8L"
const SIGNALHOUSE_SUBGROUP_ID = process.env.SIGNALHOUSE_SUBGROUP_ID || ""; // e.g., "SMZ0IJ"

// Twilio SMS (fallback)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || "";

// SendGrid Email
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

interface AlertPayload {
  changeType: string;
  priority: string;
  propertyId: string;
  address: string;
  leadId?: string;
  caseNumber?: string;
  actionRequired: string;
  previousValue?: any;
  newValue?: any;
  detectedAt: string;
}

interface CampaignConfig {
  enabled: boolean;
  smsTemplate: string;
  emailSubject: string;
  emailTemplate: string;
  priority: number; // 1 = immediate, 2 = within hour, 3 = daily digest
}

// Campaign configurations by change type
const CAMPAIGN_CONFIG: Record<string, CampaignConfig> = {
  MLS_LISTED: {
    enabled: true,
    smsTemplate: "Hi {{ownerName}}, noticed {{address}} just hit the market. If listing doesn't work out, I buy properties for cash with quick closing. Interested? -{{agentName}}",
    emailSubject: "Quick question about {{address}}",
    emailTemplate: "Hi {{ownerName}},\n\nI saw your property at {{address}} just went on the market. I'm a local investor who purchases homes as-is for cash.\n\nIf your listing doesn't go as planned or you need a faster solution, I'd love to make you a fair cash offer.\n\nNo pressure - just wanted to let you know you have options.\n\nBest,\n{{agentName}}\n{{agentPhone}}",
    priority: 1,
  },
  MLS_EXPIRED: {
    enabled: true,
    smsTemplate: "Hi {{ownerName}}, saw {{address}} listing expired. I know that's frustrating. I buy homes as-is, cash, fast close. Can we chat? -{{agentName}}",
    emailSubject: "Re: {{address}} - I may be able to help",
    emailTemplate: "Hi {{ownerName}},\n\nI noticed your listing at {{address}} recently expired. I understand how frustrating that can be after having your home on the market.\n\nI purchase properties for cash and can close quickly - no need for repairs, showings, or waiting for buyer financing.\n\nWould you be open to hearing a cash offer? No obligation.\n\nBest,\n{{agentName}}",
    priority: 1,
  },
  MLS_PRICE_DROP: {
    enabled: true,
    smsTemplate: "Hi {{ownerName}}, saw price drop on {{address}}. If you want to skip the listing hassle, I'll make a fair cash offer, close in 2 weeks. -{{agentName}}",
    emailSubject: "Alternative option for {{address}}",
    emailTemplate: "Hi {{ownerName}},\n\nI noticed you recently reduced the price on {{address}}. Sometimes the traditional selling process just doesn't work out.\n\nI'm an investor who buys homes for cash. If you'd rather have a guaranteed sale with a quick close, I'd be happy to make you an offer.\n\nLet me know if you'd like to explore this option.\n\nBest,\n{{agentName}}",
    priority: 2,
  },
  AUCTION_SCHEDULED: {
    enabled: true,
    smsTemplate: "URGENT: {{ownerName}}, your property {{address}} has auction scheduled. I can pay cash TODAY to stop foreclosure. Call me: {{agentPhone}} -{{agentName}}",
    emailSubject: "URGENT: Stop foreclosure on {{address}}",
    emailTemplate: "{{ownerName}},\n\nI understand {{address}} has a foreclosure auction scheduled. This is an urgent situation, but you still have options.\n\nI can purchase your property for cash and close BEFORE the auction date. This would:\n- Stop the foreclosure\n- Potentially save your credit\n- Give you cash to relocate\n\nPlease call me immediately at {{agentPhone}}. Time is critical.\n\n{{agentName}}",
    priority: 1,
  },
  OCCUPANCY_CHANGE: {
    enabled: true,
    smsTemplate: "Hi {{ownerName}}, noticed you may have moved from {{address}}. If you're looking to sell, I buy properties as-is for cash. -{{agentName}}",
    emailSubject: "Question about {{address}}",
    emailTemplate: "Hi {{ownerName}},\n\nI noticed you may no longer be living at {{address}}. If you're looking to sell the property, I'd be interested in making you a cash offer.\n\nI buy homes in any condition and can close on your timeline.\n\nWould you be interested in hearing an offer?\n\nBest,\n{{agentName}}",
    priority: 2,
  },
  ADDITIONAL_NOTICE: {
    enabled: true,
    smsTemplate: "{{ownerName}}, noticed new filing on {{address}}. I help homeowners avoid foreclosure by buying for cash. Can we talk today? -{{agentName}}",
    emailSubject: "Important: Options for {{address}}",
    emailTemplate: "{{ownerName}},\n\nI'm reaching out because I noticed a new foreclosure-related filing on {{address}}. I know this is a stressful situation.\n\nI've helped many homeowners in similar situations by purchasing their homes for cash. This allows them to:\n- Avoid foreclosure on their credit\n- Walk away with cash\n- Move forward with peace of mind\n\nWould you be open to a confidential conversation about your options?\n\n{{agentName}}\n{{agentPhone}}",
    priority: 1,
  },
  TAX_LIEN_ADDED: {
    enabled: true,
    smsTemplate: "Hi {{ownerName}}, saw tax lien on {{address}}. I can buy your property and handle the lien. Quick close, cash. Want to chat? -{{agentName}}",
    emailSubject: "Solution for {{address}} tax situation",
    emailTemplate: "Hi {{ownerName}},\n\nI noticed there's a tax lien on {{address}}. Dealing with tax liens can be overwhelming, but I may be able to help.\n\nI purchase properties for cash and can handle the lien payoff as part of the sale. You'd walk away with cash and the burden off your shoulders.\n\nWould you like to discuss this option?\n\nBest,\n{{agentName}}",
    priority: 2,
  },
  DEED_CHANGE: {
    enabled: false, // Don't campaign - property sold
    smsTemplate: "",
    emailSubject: "",
    emailTemplate: "",
    priority: 3,
  },
};

async function sendSignalHouseSMS(to: string, message: string): Promise<boolean> {
  // Prefer JWT auth, fall back to API key
  const authToken = SIGNALHOUSE_JWT || SIGNALHOUSE_API_KEY;
  if (!authToken || !SIGNALHOUSE_FROM) {
    console.warn("[Alert] SignalHouse not configured");
    return false;
  }

  try {
    // SignalHouse API v1 endpoint
    const response = await fetch("https://api.signalhouse.io/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        from: SIGNALHOUSE_FROM,
        to: to.replace(/\D/g, "").slice(-10), // Normalize to 10 digits
        text: message,
        ...(SIGNALHOUSE_GROUP_ID && { groupId: SIGNALHOUSE_GROUP_ID }),
        ...(SIGNALHOUSE_SUBGROUP_ID && { subGroupId: SIGNALHOUSE_SUBGROUP_ID }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Alert] SignalHouse error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Alert] SignalHouse SMS failed:", error);
    return false;
  }
}

async function sendTwilioSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn("[Alert] Twilio not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          From: TWILIO_FROM,
          To: to,
          Body: message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("[Alert] Twilio SMS failed:", error);
    return false;
  }
}

async function sendSendGridEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("[Alert] SendGrid not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "alerts@homeowneradvisor.com", name: "Homeowner Advisor" },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Alert] SendGrid email failed:", error);
    return false;
  }
}

function fillTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  }
  return result;
}

// POST /api/fdaily/alerts - Dispatch alerts for detected changes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      changes,
      agentName = "Your Local Investor",
      agentPhone = "",
      ownerContacts = {}, // { leadId: { phone, email, name } }
    } = body;

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: "No changes to process" },
        { status: 400 }
      );
    }

    const results = {
      processed: 0,
      smsSent: 0,
      emailsSent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const change of changes as AlertPayload[]) {
      const config = CAMPAIGN_CONFIG[change.changeType];

      if (!config || !config.enabled) {
        results.skipped++;
        continue;
      }

      results.processed++;

      // Get contact info for this lead
      const contact = ownerContacts[change.leadId || ""] || {};
      const ownerName = contact.name || "Homeowner";
      const ownerPhone = contact.phone;
      const ownerEmail = contact.email;

      const templateData = {
        ownerName,
        address: change.address,
        agentName,
        agentPhone,
        caseNumber: change.caseNumber || "",
      };

      // Send SMS if phone available
      if (ownerPhone && config.smsTemplate) {
        const smsMessage = fillTemplate(config.smsTemplate, templateData);

        // Try SignalHouse first, fall back to Twilio
        const smsSent = await sendSignalHouseSMS(ownerPhone, smsMessage) ||
                       await sendTwilioSMS(ownerPhone, smsMessage);

        if (smsSent) {
          results.smsSent++;
        } else {
          results.errors.push(`SMS failed for ${change.leadId}: ${ownerPhone}`);
        }
      }

      // Send email if email available
      if (ownerEmail && config.emailTemplate) {
        const emailSubject = fillTemplate(config.emailSubject, templateData);
        const emailBody = fillTemplate(config.emailTemplate, templateData);

        const emailSent = await sendSendGridEmail(ownerEmail, emailSubject, emailBody);

        if (emailSent) {
          results.emailsSent++;
        } else {
          results.errors.push(`Email failed for ${change.leadId}: ${ownerEmail}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} alerts: ${results.smsSent} SMS, ${results.emailsSent} emails sent`,
    });

  } catch (error: any) {
    console.error("[Alert Dispatcher] Error:", error);
    return NextResponse.json(
      { error: error.message || "Alert dispatch failed" },
      { status: 500 }
    );
  }
}

// GET /api/fdaily/alerts - Get campaign templates
export async function GET() {
  return NextResponse.json({
    templates: Object.entries(CAMPAIGN_CONFIG).map(([type, config]) => ({
      changeType: type,
      enabled: config.enabled,
      priority: config.priority,
      smsTemplate: config.smsTemplate,
      emailSubject: config.emailSubject,
    })),
    message: "Campaign templates for FDAILY property changes",
  });
}
