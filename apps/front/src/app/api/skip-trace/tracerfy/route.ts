/**
 * Tracerfy Skip Trace API
 *
 * POST - Begin a skip trace job
 * GET - Check status / get results
 */

import { NextRequest, NextResponse } from "next/server";
import {
  TracerfyClient,
  TraceType,
  TraceJobInput,
  extractPhones,
  extractEmails,
  calculateCreditsNeeded,
} from "@/lib/tracerfy";

const client = new TracerfyClient(process.env.TRACERFY_API_TOKEN);

// GET - Check balance, queues, or specific queue results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "analytics";
    const queueId = searchParams.get("queueId");

    if (action === "analytics") {
      const analytics = await client.getAnalytics();
      return NextResponse.json({ success: true, analytics });
    }

    if (action === "queues") {
      const queues = await client.getQueues();
      return NextResponse.json({ success: true, queues });
    }

    if (action === "results" && queueId) {
      const results = await client.getQueueResults(parseInt(queueId));

      // Process results to extract useful contact data
      const processed = results.map((result) => ({
        ...result,
        phones: extractPhones(result),
        emails: extractEmails(result),
        fullName: `${result.first_name} ${result.last_name}`.trim(),
      }));

      return NextResponse.json({
        success: true,
        results: processed,
        count: results.length,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Tracerfy API] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 }
    );
  }
}

// POST - Begin a skip trace job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      records,
      traceType = "normal",
      teamId,
    } = body as {
      records: TraceJobInput[];
      traceType?: TraceType;
      teamId?: string;
    };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "records array is required" },
        { status: 400 }
      );
    }

    // Check balance first
    const analytics = await client.getAnalytics();
    const creditsNeeded = calculateCreditsNeeded(records.length, traceType);

    if (analytics.balance < creditsNeeded) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits",
          balance: analytics.balance,
          creditsNeeded,
          recordCount: records.length,
        },
        { status: 402 }
      );
    }

    // Begin the trace
    const response = await client.beginTrace(records, traceType);

    return NextResponse.json({
      success: true,
      queueId: response.queue_id,
      status: response.status,
      rowsUploaded: response.rows_uploaded,
      traceType: response.trace_type,
      creditsPerLead: response.credits_per_lead,
      totalCredits: response.rows_uploaded * response.credits_per_lead,
      createdAt: response.created_at,
      teamId,
    });
  } catch (error) {
    console.error("[Tracerfy API] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start trace",
      },
      { status: 500 }
    );
  }
}
