/**
 * Airflow Notify API Routes
 * Called by DAGs for sending notifications
 */

import { NextRequest, NextResponse } from "next/server";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  channels: string[];
  sent_at: string;
  status: "pending" | "sent" | "failed";
}

const notificationLog: Notification[] = [];

// POST /api/airflow/notify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return handleNotify(body);
  } catch (error) {
    console.error("[Airflow Notify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/airflow/notify - Get notification log
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const type = url.searchParams.get("type");

    let results = [...notificationLog];

    if (type) {
      results = results.filter((n) => n.type === type);
    }

    // Sort by sent_at descending
    results.sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
    );

    return NextResponse.json({
      notifications: results.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    console.error("[Airflow Notify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleNotify(body: Record<string, any>) {
  const { type, ...data } = body;

  // Build notification based on type
  let title = "";
  let message = "";

  switch (type) {
    case "cross_reference_complete":
      title = "Cross-Reference Pipeline Complete";
      message = `Created ${data.leads_created} new leads. Found ${data.bundled_deals} bundled deals.`;
      break;

    case "escalation_summary":
      title = "Gianna Escalation Summary";
      message = `Sent ${data.messages_sent} messages. ${data.messages_failed} failed. ${data.success_rate}% success rate.`;
      break;

    case "datalake_etl_complete":
      title = "Datalake ETL Complete";
      message = `Processed ${data.total_records} records from ${data.files_processed} files.`;
      break;

    case "hot_lead_alert":
      title = "Hot Lead Alert!";
      message = `Lead ${data.lead_name} responded positively. Response: "${data.response}"`;
      break;

    default:
      title = "Airflow Notification";
      message = JSON.stringify(data);
  }

  const notification: Notification = {
    id: `notify_${Date.now()}`,
    type,
    title,
    message,
    data,
    channels: ["console", "dashboard"],
    sent_at: new Date().toISOString(),
    status: "pending",
  };

  // Send to configured channels
  const channels: string[] = [];

  // Console logging (always)
  console.log(`[Airflow Notify] ${title}: ${message}`);
  channels.push("console");

  // Slack integration (if configured)
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${title}*\n${message}`,
          attachments: data.top_matches
            ? [
                {
                  color: "#36a64f",
                  title: "Top Bundled Deals",
                  text: data.top_matches
                    .map(
                      (m: any) =>
                        `• ${m.property_owner} - ${m.business_name} (Score: ${m.deal_score})`,
                    )
                    .join("\n"),
                },
              ]
            : undefined,
        }),
      });
      channels.push("slack");
    } catch (e) {
      console.error("[Airflow Notify] Slack notification failed:", e);
    }
  }

  // Email integration (if configured)
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (sendgridKey && notifyEmail && type === "hot_lead_alert") {
    // Only email for hot leads
    try {
      // TODO: SendGrid integration
      channels.push("email");
    } catch (e) {
      console.error("[Airflow Notify] Email notification failed:", e);
    }
  }

  notification.channels = channels;
  notification.status = "sent";
  notificationLog.push(notification);

  // Keep only last 500 notifications
  if (notificationLog.length > 500) {
    notificationLog.shift();
  }

  return NextResponse.json({
    success: true,
    notification_id: notification.id,
    channels,
  });
}
