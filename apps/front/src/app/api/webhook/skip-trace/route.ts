import { NextRequest, NextResponse } from "next/server";

// Note: Database integration can be added when needed
// import { db } from "@/lib/db";
// import { leads } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";

/**
 * Bulk Skip Trace Webhook Receiver
 *
 * RealEstateAPI calls this webhook when bulk skip trace job completes.
 * Updates leads with enriched contact data (phones, emails, socials).
 *
 * Query params from callback URL:
 * - batchId: Original batch identifier
 * - teamId: Team that initiated the request
 * - correlationId: For tracing
 */

interface SkipTracePhone {
  phone_number: string;
  phone_type: string;
  carrier?: string;
  line_type?: string;
  is_connected?: boolean;
  score?: number;
}

interface SkipTraceEmail {
  email_address: string;
  email_type?: string;
  is_valid?: boolean;
  score?: number;
}

interface SkipTraceSocial {
  platform: string;
  url: string;
  username?: string;
}

interface SkipTraceResult {
  input: Record<string, string>;
  success: boolean;
  output?: {
    identity?: {
      first_name?: string;
      last_name?: string;
      dob?: string;
      age?: number;
    };
    phones?: SkipTracePhone[];
    emails?: SkipTraceEmail[];
    social_profiles?: SkipTraceSocial[];
    demographics?: Record<string, unknown>;
  };
  match_score?: number;
  error?: string;
}

interface BulkSkipTraceWebhookPayload {
  job_id: string;
  status: "completed" | "failed";
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
  results: SkipTraceResult[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const teamId = searchParams.get("teamId");
  const correlationId = searchParams.get("correlationId") || "unknown";

  console.log(
    `[Skip Trace Webhook] Received callback, batchId=${batchId}, teamId=${teamId} [${correlationId}]`,
  );

  try {
    const payload: BulkSkipTraceWebhookPayload = await request.json();

    console.log(
      `[Skip Trace Webhook] Job ${payload.job_id}: ${payload.status}, ${payload.completed_requests}/${payload.total_requests} completed [${correlationId}]`,
    );

    if (payload.status === "failed") {
      console.error(
        `[Skip Trace Webhook] Job ${payload.job_id} failed [${correlationId}]`,
      );
      return NextResponse.json({
        received: true,
        status: "failed",
        jobId: payload.job_id,
      });
    }

    // Process results
    const processed = {
      total: payload.results.length,
      enriched: 0,
      failed: 0,
      skipped: 0,
    };

    for (const result of payload.results) {
      // Get original record ID from input (we passed it as custom_id)
      const recordId = result.input?.custom_id;

      if (!recordId) {
        processed.skipped++;
        continue;
      }

      if (!result.success || !result.output) {
        processed.failed++;
        continue;
      }

      // Extract best phone (prefer mobile)
      const phones = result.output.phones || [];
      const mobilePhone = phones.find(
        (p) => p.phone_type === "mobile" || p.line_type === "mobile",
      );
      const bestPhone = mobilePhone || phones[0];

      // Extract best email
      const emails = result.output.emails || [];
      const personalEmail = emails.find((e) => e.email_type === "personal");
      const bestEmail = personalEmail || emails[0];

      // Extract socials
      const socials = result.output.social_profiles || [];
      const linkedin = socials.find(
        (s) => s.platform.toLowerCase() === "linkedin",
      );
      const facebook = socials.find(
        (s) => s.platform.toLowerCase() === "facebook",
      );

      // Build enrichment data
      const enrichmentData = {
        skipTraced: true,
        skipTracedAt: new Date().toISOString(),
        batchId,
        correlationId,
        // Best contacts
        phone: bestPhone?.phone_number || null,
        phoneType: bestPhone?.phone_type || null,
        email: bestEmail?.email_address || null,
        // All phones with mobile flag
        allPhones: phones.map((p) => ({
          number: p.phone_number,
          type: p.phone_type,
          isMobile: p.phone_type === "mobile" || p.line_type === "mobile",
          carrier: p.carrier,
          isConnected: p.is_connected,
          score: p.score,
        })),
        // All emails
        allEmails: emails.map((e) => ({
          email: e.email_address,
          type: e.email_type,
          isValid: e.is_valid,
          score: e.score,
        })),
        // Socials
        socials: {
          linkedin: linkedin?.url || null,
          facebook: facebook?.url || null,
        },
        // Demographics
        demographics: result.output.demographics || null,
        // Match quality
        matchScore: result.match_score,
      };

      // Log enrichment data (DB update can be added when needed)
      console.log(`[Skip Trace Webhook] Enriched ${recordId}:`, {
        phone: bestPhone?.phone_number,
        email: bestEmail?.email_address,
        socials: {
          linkedin: linkedin?.url,
          facebook: facebook?.url,
        },
        matchScore: result.match_score,
      });

      // TODO: Uncomment when DB integration needed
      // try {
      //   await db
      //     .update(leads)
      //     .set({
      //       phone: bestPhone?.phone_number || undefined,
      //       email: bestEmail?.email_address || undefined,
      //       enriched: true,
      //       enrichedAt: new Date(),
      //       customFields: enrichmentData,
      //     })
      //     .where(eq(leads.id, recordId));
      // } catch (dbError) {
      //   console.error(`[Skip Trace Webhook] DB update failed:`, dbError);
      // }

      processed.enriched++;
    }

    console.log(
      `[Skip Trace Webhook] Processed: ${processed.enriched} enriched, ${processed.failed} failed, ${processed.skipped} skipped [${correlationId}]`,
    );

    return NextResponse.json({
      received: true,
      status: "processed",
      jobId: payload.job_id,
      batchId,
      teamId,
      correlationId,
      processed,
    });
  } catch (error) {
    console.error(`[Skip Trace Webhook] Error [${correlationId}]:`, error);
    return NextResponse.json(
      {
        received: true,
        status: "error",
        error: error instanceof Error ? error.message : "Processing failed",
        correlationId,
      },
      { status: 200 }, // Return 200 so RealEstateAPI doesn't retry
    );
  }
}

// GET - Endpoint info
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "POST /api/webhook/skip-trace",
    description:
      "Webhook receiver for RealEstateAPI bulk skip trace completion",
    queryParams: ["batchId", "teamId", "correlationId"],
    payload: "BulkSkipTraceWebhookPayload from RealEstateAPI",
  });
}
