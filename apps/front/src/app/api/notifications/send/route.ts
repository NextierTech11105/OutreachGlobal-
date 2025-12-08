import { NextRequest, NextResponse } from "next/server";

// Notification Service - Sends alerts via various channels

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

interface NotificationRequest {
  type: "voicemail" | "lead" | "sms_response" | "system" | "alert";
  priority: "high" | "medium" | "low";
  title?: string;
  message?: string;
  from?: string;
  transcription?: string;
  insights?: Record<string, unknown>;
  recordingUrl?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  slackChannel?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationRequest = await request.json();
    const {
      type,
      priority,
      title,
      message,
      from,
      transcription,
      insights,
      recordingUrl,
      recipientEmail,
      recipientPhone,
      slackChannel,
    } = body;

    console.log("[Notifications] Sending:", { type, priority, from });

    const results: {
      email?: { success: boolean; error?: string };
      slack?: { success: boolean; error?: string };
      sms?: { success: boolean; error?: string };
    } = {};

    // Format notification content
    const notificationTitle = title || formatTitle(type, priority);
    const notificationBody = message || formatBody(body);

    // === SEND EMAIL NOTIFICATION ===
    if (recipientEmail && SENDGRID_API_KEY) {
      try {
        const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientEmail }] }],
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "alerts@nextier.app",
              name: "NexTier Alerts",
            },
            subject: `[${priority.toUpperCase()}] ${notificationTitle}`,
            content: [
              {
                type: "text/html",
                value: `
                  <div style="font-family: sans-serif; padding: 20px; background: #1a1a2e; color: #eaeaea;">
                    <h2 style="color: ${priority === "high" ? "#ef4444" : priority === "medium" ? "#f59e0b" : "#22c55e"}">
                      ${notificationTitle}
                    </h2>
                    <p>${notificationBody}</p>
                    ${from ? `<p><strong>From:</strong> ${from}</p>` : ""}
                    ${transcription ? `<p><strong>Message:</strong> ${transcription}</p>` : ""}
                    ${recordingUrl ? `<p><a href="${recordingUrl}" style="color: #3b82f6;">Listen to Recording</a></p>` : ""}
                    <hr style="border-color: #333;">
                    <p style="color: #666; font-size: 12px;">NexTier Notification System</p>
                  </div>
                `,
              },
            ],
          }),
        });

        results.email = { success: emailResponse.ok || emailResponse.status === 202 };
        if (!results.email.success) {
          results.email.error = await emailResponse.text();
        }
      } catch (err) {
        results.email = { success: false, error: String(err) };
      }
    }

    // === SEND SLACK NOTIFICATION ===
    if (SLACK_WEBHOOK_URL) {
      try {
        const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: slackChannel || "#notifications",
            username: "NexTier Bot",
            icon_emoji: priority === "high" ? ":rotating_light:" : ":bell:",
            attachments: [
              {
                color: priority === "high" ? "danger" : priority === "medium" ? "warning" : "good",
                title: notificationTitle,
                text: notificationBody,
                fields: [
                  from ? { title: "From", value: from, short: true } : null,
                  { title: "Priority", value: priority.toUpperCase(), short: true },
                  transcription
                    ? { title: "Message", value: transcription.slice(0, 200) + (transcription.length > 200 ? "..." : "") }
                    : null,
                ].filter(Boolean),
                footer: "NexTier Notification System",
                ts: Math.floor(Date.now() / 1000),
              },
            ],
          }),
        });

        results.slack = { success: slackResponse.ok };
        if (!results.slack.success) {
          results.slack.error = await slackResponse.text();
        }
      } catch (err) {
        results.slack = { success: false, error: String(err) };
      }
    }

    // === SEND SMS NOTIFICATION (for high priority only) ===
    if (recipientPhone && priority === "high" && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try {
        const formData = new URLSearchParams();
        formData.append("To", recipientPhone);
        formData.append("From", TWILIO_PHONE_NUMBER);
        formData.append("Body", `[URGENT] ${notificationTitle}\n${from ? `From: ${from}\n` : ""}${notificationBody.slice(0, 140)}`);

        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          }
        );

        results.sms = { success: smsResponse.ok };
        if (!results.sms.success) {
          results.sms.error = await smsResponse.text();
        }
      } catch (err) {
        results.sms = { success: false, error: String(err) };
      }
    }

    const anySuccess = Object.values(results).some((r) => r?.success);

    return NextResponse.json({
      success: anySuccess,
      results,
      message: anySuccess ? "Notification sent" : "Failed to send notification",
    });
  } catch (error) {
    console.error("[Notifications] Error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}

function formatTitle(type: string, priority: string): string {
  const titles: Record<string, string> = {
    voicemail: "New Voicemail Received",
    lead: "New Lead Alert",
    sms_response: "SMS Response Received",
    system: "System Notification",
    alert: "Alert",
  };
  return titles[type] || "Notification";
}

function formatBody(body: NotificationRequest): string {
  switch (body.type) {
    case "voicemail":
      return body.insights?.intent === "interested"
        ? "A potential lead left a voicemail expressing interest. Follow up immediately!"
        : "New voicemail received. Review and respond as appropriate.";
    case "lead":
      return "A new lead has been captured and requires attention.";
    case "sms_response":
      return "A contact has responded to your SMS. Review their message.";
    default:
      return body.message || "You have a new notification.";
  }
}
