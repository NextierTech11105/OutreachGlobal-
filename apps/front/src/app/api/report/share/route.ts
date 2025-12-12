import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://monkfish-app-mb7h3.ondigitalocean.app";

interface ShareRequest {
  reportId: string;
  reportUrl?: string; // Direct public URL to report (e.g., CDN URL)
  reportName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName?: string;
  propertyAddress?: string;
  estimatedValue?: number;
  agentName?: string;
  agentPhone?: string;
  companyName?: string;
  sendSms?: boolean;
  sendEmail?: boolean;
}

// POST - Share report via SMS and/or Email
export async function POST(request: NextRequest) {
  try {
    const body: ShareRequest = await request.json();
    const {
      reportId,
      reportUrl: providedReportUrl,
      reportName,
      recipientPhone,
      recipientEmail,
      recipientName,
      propertyAddress,
      estimatedValue,
      agentName,
      agentPhone,
      companyName,
      sendSms = true,
      sendEmail = true,
    } = body;

    if (!reportId && !providedReportUrl) {
      return NextResponse.json(
        { error: "Report ID or URL is required" },
        { status: 400 },
      );
    }

    // Use provided URL (CDN) or fall back to app URL
    const reportUrl = providedReportUrl || `${APP_URL}/report/${reportId}`;
    const results: {
      sms?: { success: boolean; messageId?: string; error?: string };
      email?: { success: boolean; messageId?: string; error?: string };
    } = {};

    // Format currency for display
    const formattedValue = estimatedValue
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(estimatedValue)
      : null;

    // === SEND SMS VIA SIGNALHOUSE ===
    if (sendSms && recipientPhone && SIGNALHOUSE_API_KEY) {
      try {
        // Gianna-style personalized message
        const smsMessage = `Hi${recipientName ? ` ${recipientName.split(" ")[0]}` : ""}! ${
          agentName || "Your advisor"
        } from ${companyName || "NexTier"} prepared a property valuation report for ${
          propertyAddress || "your property"
        }${formattedValue ? ` - estimated at ${formattedValue}` : ""}.\n\nView your personalized report: ${reportUrl}\n\nReply STOP to opt out.`;

        const smsResponse = await fetch(
          "https://api.signalhouse.io/v1/messages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SIGNALHOUSE_API_KEY}`,
            },
            body: JSON.stringify({
              to: recipientPhone,
              text: smsMessage,
              from:
                process.env.SIGNALHOUSE_FROM_NUMBER ||
                process.env.TWILIO_PHONE_NUMBER,
            }),
          },
        );

        const smsData = await smsResponse.json();

        if (smsResponse.ok) {
          results.sms = {
            success: true,
            messageId: smsData.id || smsData.messageId,
          };
          console.log("[Report Share] SMS sent successfully:", smsData);
        } else {
          results.sms = {
            success: false,
            error: smsData.error || "SMS send failed",
          };
          console.error("[Report Share] SMS failed:", smsData);
        }
      } catch (smsError) {
        console.error("[Report Share] SMS error:", smsError);
        results.sms = { success: false, error: "SMS send failed" };
      }
    }

    // === SEND EMAIL VIA SENDGRID ===
    if (sendEmail && recipientEmail && SENDGRID_API_KEY) {
      try {
        const firstName = recipientName?.split(" ")[0] || "Homeowner";
        const agentFirstName = agentName?.split(" ")[0] || "Your Advisor";

        // Beautiful HTML email template
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Property Valuation Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #334155;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #334155;">
              <h1 style="margin: 0; color: #f8fafc; font-size: 28px; font-weight: 700;">
                ${companyName || "NexTier"}
              </h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">
                Your Trusted Real Estate Partner
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <p style="margin: 0; color: #f8fafc; font-size: 18px;">
                Hi ${firstName},
              </p>
              <p style="margin: 16px 0 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Great news! I've prepared a comprehensive property valuation report just for you.
              </p>
            </td>
          </tr>

          <!-- Property Card -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px; color: #93c5fd; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                      Property Address
                    </p>
                    <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                      ${propertyAddress || "Your Property"}
                    </p>
                    ${
                      formattedValue
                        ? `
                    <p style="margin: 16px 0 0 0; color: #93c5fd; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                      Estimated Value
                    </p>
                    <p style="margin: 4px 0 0; color: #34d399; font-size: 32px; font-weight: 700;">
                      ${formattedValue}
                    </p>
                    `
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <a href="${reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                View Your Full Report
              </a>
              <p style="margin: 16px 0 0; color: #64748b; font-size: 13px;">
                Click above or copy this link: ${reportUrl}
              </p>
            </td>
          </tr>

          <!-- What's Included -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0 0 16px; color: #f8fafc; font-size: 16px; font-weight: 600;">
                Your report includes:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                    &#10003; Detailed property analysis
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                    &#10003; Neighborhood insights & demographics
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                    &#10003; Comparable market analysis
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                    &#10003; AI-powered investment recommendations
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                    &#10003; Exit strategy options
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Agent Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #0f172a; border-top: 1px solid #334155;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #f8fafc; font-size: 16px; font-weight: 600;">
                      ${agentName || "Your Real Estate Advisor"}
                    </p>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">
                      ${companyName || "NexTier Real Estate"}
                    </p>
                    ${
                      agentPhone
                        ? `
                    <p style="margin: 12px 0 0;">
                      <a href="tel:${agentPhone}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
                        ${agentPhone}
                      </a>
                    </p>
                    `
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0; color: #475569; font-size: 12px;">
                Powered by NexTier Property Intelligence
              </p>
              <p style="margin: 8px 0 0; color: #334155; font-size: 11px;">
                This email was sent because a property report was requested. To unsubscribe, reply STOP.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        const textContent = `Hi ${firstName},

Great news! I've prepared a comprehensive property valuation report for ${propertyAddress || "your property"}.

${formattedValue ? `Estimated Value: ${formattedValue}\n` : ""}
View your full report here: ${reportUrl}

Your report includes:
- Detailed property analysis
- Neighborhood insights & demographics
- Comparable market analysis
- AI-powered investment recommendations
- Exit strategy options

${agentName || "Your Real Estate Advisor"}
${companyName || "NexTier Real Estate"}
${agentPhone ? `Phone: ${agentPhone}` : ""}

---
Powered by NexTier Property Intelligence`;

        const emailResponse = await fetch(
          "https://api.sendgrid.com/v3/mail/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
            },
            body: JSON.stringify({
              personalizations: [
                {
                  to: [
                    { email: recipientEmail, name: recipientName || undefined },
                  ],
                  subject: `Your Property Valuation Report${propertyAddress ? ` - ${propertyAddress}` : ""}`,
                },
              ],
              from: {
                email: process.env.SENDGRID_FROM_EMAIL || "reports@nextier.app",
                name: agentName || companyName || "NexTier",
              },
              reply_to: {
                email:
                  process.env.SENDGRID_REPLY_TO ||
                  process.env.SENDGRID_FROM_EMAIL ||
                  "hello@nextier.app",
                name: agentName || companyName || "NexTier",
              },
              content: [
                { type: "text/plain", value: textContent },
                { type: "text/html", value: htmlContent },
              ],
              tracking_settings: {
                click_tracking: { enable: true },
                open_tracking: { enable: true },
              },
            }),
          },
        );

        if (emailResponse.ok || emailResponse.status === 202) {
          results.email = { success: true };
          console.log("[Report Share] Email sent successfully");
        } else {
          const emailError = await emailResponse.text();
          results.email = { success: false, error: emailError };
          console.error("[Report Share] Email failed:", emailError);
        }
      } catch (emailError) {
        console.error("[Report Share] Email error:", emailError);
        results.email = { success: false, error: "Email send failed" };
      }
    }

    // Return results
    const smsSuccess = results.sms?.success ?? false;
    const emailSuccess = results.email?.success ?? false;
    const anySuccess = smsSuccess || emailSuccess;

    return NextResponse.json({
      success: anySuccess,
      reportUrl,
      results,
      message: anySuccess
        ? `Report shared successfully${smsSuccess ? " via SMS" : ""}${smsSuccess && emailSuccess ? " and" : ""}${emailSuccess ? " via email" : ""}`
        : "Failed to share report",
    });
  } catch (error) {
    console.error("[Report Share] Error:", error);
    return NextResponse.json(
      { error: "Failed to share report" },
      { status: 500 },
    );
  }
}
