/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRACERFY WEBHOOK HANDLER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Receives completion notifications when skip trace jobs finish.
 * Downloads results and stores enriched contact data.
 *
 * Flow: Tracerfy completes → Webhook → Extract mobiles/emails → Ready for SMS
 */

import { NextRequest, NextResponse } from "next/server";
import {
  TracerfyClient,
  TracerfyNormalResult,
  extractPhones,
  extractEmails,
} from "@/lib/tracerfy";
import { Logger } from "@/lib/logger";

const client = new TracerfyClient(process.env.TRACERFY_API_TOKEN);
const log = new Logger("TracerfyWebhook");

interface TracerfyWebhookPayload {
  id: number;
  created_at: string;
  pending: boolean;
  download_url: string;
  rows_uploaded: number;
  credit_deducted: number;
  queue_type: string;
  trace_type: string;
  credits_per_lead: number;
}

// In-memory store for webhook results (would be Redis/DB in production)
const webhookResults: Map<
  number,
  {
    timestamp: Date;
    data: Array<{
      address: string;
      city: string;
      state: string;
      firstName: string;
      lastName: string;
      primaryMobile: string;
      mobiles: string[];
      emails: string[];
    }>;
  }
> = new Map();

// Export for other routes to access
export function getWebhookResults(queueId: number) {
  return webhookResults.get(queueId);
}

export async function POST(request: NextRequest) {
  try {
    const payload: TracerfyWebhookPayload = await request.json();

    log.info("Webhook received", {
      queueId: payload.id,
      rowsUploaded: payload.rows_uploaded,
      creditsDeducted: payload.credit_deducted,
      traceType: payload.trace_type,
      pending: payload.pending,
    });

    // Queue is complete - fetch and process results
    if (!payload.pending && payload.download_url) {
      const results = await client.getQueueResults(payload.id);

      // Extract just phones and emails for each result (B2B essentials)
      const enrichedData = (results as TracerfyNormalResult[]).map((result) => {
        const phones = extractPhones(result);
        const emails = extractEmails(result);
        const mobiles = phones.filter((p) => p.type === "Mobile").map((p) => p.number);

        return {
          address: result.address,
          city: result.city,
          state: result.state,
          firstName: result.first_name,
          lastName: result.last_name,
          // Primary mobile for SMS campaigns
          primaryMobile: mobiles[0] || "",
          // All mobiles
          mobiles,
          // Emails
          emails,
        };
      });

      // Store results for pickup
      webhookResults.set(payload.id, {
        timestamp: new Date(),
        data: enrichedData,
      });

      // Clean up old results (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [id, result] of webhookResults) {
        if (result.timestamp.getTime() < oneHourAgo) {
          webhookResults.delete(id);
        }
      }

      // Stats
      const withMobile = enrichedData.filter((d) => d.primaryMobile).length;
      const withEmail = enrichedData.filter((d) => d.emails.length > 0).length;

      log.info("Processed trace results", {
        queueId: payload.id,
        total: enrichedData.length,
        withMobile,
        withEmail,
        mobileRate: `${Math.round((withMobile / enrichedData.length) * 100)}%`,
        emailRate: `${Math.round((withEmail / enrichedData.length) * 100)}%`,
        cost: `$${(payload.credit_deducted * 0.02).toFixed(2)}`,
      });

      return NextResponse.json({
        success: true,
        processed: enrichedData.length,
        withMobile,
        withEmail,
        queueId: payload.id,
        message: "Results stored and ready for pickup",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook received, job still pending",
      queueId: payload.id,
    });
  } catch (error) {
    log.error("Webhook error", { error: error instanceof Error ? error.message : error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

// GET - Check webhook results for a queue
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queueId = searchParams.get("queueId");

  if (!queueId) {
    return NextResponse.json({
      success: true,
      pendingQueues: webhookResults.size,
      message: "Provide ?queueId=123 to get specific results",
    });
  }

  const results = webhookResults.get(parseInt(queueId));

  if (!results) {
    return NextResponse.json({
      success: false,
      error: "No results found for this queue",
      queueId,
    });
  }

  return NextResponse.json({
    success: true,
    queueId: parseInt(queueId),
    processedAt: results.timestamp.toISOString(),
    count: results.data.length,
    results: results.data,
  });
}
