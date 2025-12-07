/**
 * Email Batch API
 * Send bulk emails via SendGrid
 */

import { NextRequest, NextResponse } from "next/server";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "hello@nextier.app";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "NexTier";

interface Lead {
  id: string;
  name?: string;
  email: string;
  address?: string;
}

interface BatchEmailRequest {
  leads: Lead[];
  subject: string;
  body: string;
  scheduledAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchEmailRequest = await request.json();
    const { leads, subject, body: emailBody, scheduledAt } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: "leads array required" },
        { status: 400 }
      );
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: "subject and body required" },
        { status: 400 }
      );
    }

    if (!SENDGRID_API_KEY) {
      return NextResponse.json(
        { success: false, error: "SendGrid not configured" },
        { status: 500 }
      );
    }

    // Filter out leads without email
    const validLeads = leads.filter((lead) => lead.email);

    if (validLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid email addresses found" },
        { status: 400 }
      );
    }

    // For scheduled emails, we'd store them in a queue
    // For now, we send immediately
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails in batches of 100 (SendGrid limit)
    const batchSize = 100;
    for (let i = 0; i < validLeads.length; i += batchSize) {
      const batch = validLeads.slice(i, i + batchSize);

      // Create personalizations for each lead
      const personalizations = batch.map((lead) => ({
        to: [{ email: lead.email, name: lead.name || undefined }],
        subject: subject
          .replace(/{name}/g, lead.name || "Friend")
          .replace(/{address}/g, lead.address || "your property"),
        dynamic_template_data: {
          name: lead.name || "Friend",
          address: lead.address || "",
        },
      }));

      try {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
          },
          body: JSON.stringify({
            personalizations,
            from: {
              email: FROM_EMAIL,
              name: FROM_NAME,
            },
            content: [
              {
                type: "text/plain",
                value: emailBody
                  .replace(/{name}/g, "{{{name}}}")
                  .replace(/{address}/g, "{{{address}}}"),
              },
              {
                type: "text/html",
                value: `<div style="font-family: sans-serif; line-height: 1.6;">${emailBody
                  .replace(/\n/g, "<br>")
                  .replace(/{name}/g, "{{{name}}}")
                  .replace(/{address}/g, "{{{address}}}")}</div>`,
              },
            ],
            tracking_settings: {
              click_tracking: { enable: true },
              open_tracking: { enable: true },
            },
          }),
        });

        if (response.ok || response.status === 202) {
          results.sent += batch.length;
        } else {
          const errorText = await response.text();
          results.failed += batch.length;
          results.errors.push(`Batch failed: ${errorText}`);
        }
      } catch (error) {
        results.failed += batch.length;
        results.errors.push(
          `Batch error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: results.sent > 0,
      sent: results.sent,
      failed: results.failed,
      total: validLeads.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("[Email Batch] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send emails" },
      { status: 500 }
    );
  }
}
