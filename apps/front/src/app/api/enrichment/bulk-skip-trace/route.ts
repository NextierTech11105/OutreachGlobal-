import { NextRequest, NextResponse } from "next/server";

/**
 * Bulk Skip Trace API - RealEstateAPI v2 Integration
 *
 * Uses /v2/SkipTrace/Bulk for batch processing up to 250 records at a time.
 * Supports webhook callback for async completion notification.
 *
 * Usage:
 *   POST /api/enrichment/bulk-skip-trace
 *   Body: { leads: [...], webhookUrl?, batchId?, teamId? }
 *
 * The insight: Business address → Property lookup → Owner = Business Owner
 * For blue collar businesses, owner often owns the building they operate from.
 */

const REALESTATE_API_URL = "https://api.realestateapi.com/v2/SkipTrace/Bulk";
const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || "";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Generate correlation ID for tracing
function generateCorrelationId(): string {
  return `bst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Input types
interface BulkSkipTraceInput {
  id: string; // Record ID from your system
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
}

interface BulkSkipTraceRequest {
  leads: BulkSkipTraceInput[];
  webhookUrl?: string;
  batchId?: string;
  teamId?: string;
}

// RealEstateAPI response types
interface SkipTracePhone {
  phone_number: string;
  phone_type: string;
  carrier?: string;
  line_type?: string;
  is_connected?: boolean;
  is_primary?: boolean;
  score?: number;
}

interface SkipTraceEmail {
  email_address: string;
  email_type?: string;
  is_valid?: boolean;
  is_primary?: boolean;
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
      middle_name?: string;
      dob?: string;
      age?: number;
    };
    phones?: SkipTracePhone[];
    emails?: SkipTraceEmail[];
    addresses?: Array<{
      street_address?: string;
      city?: string;
      state?: string;
      zip?: string;
      is_current?: boolean;
    }>;
    social_profiles?: SkipTraceSocial[];
    demographics?: {
      education?: string;
      occupation?: string;
      employer?: string;
      income_range?: string;
      net_worth_range?: string;
      marital_status?: string;
      home_owner_status?: string;
    };
    relatives?: Array<{
      first_name: string;
      last_name: string;
      relationship?: string;
      phone?: string;
    }>;
    associates?: Array<{
      first_name: string;
      last_name: string;
      type?: string;
      phone?: string;
    }>;
  };
  match_score?: number;
  error?: string;
}

interface BulkJobResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_requests: number;
  completed_requests?: number;
  failed_requests?: number;
  results?: SkipTraceResult[];
  estimated_completion_time?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = generateCorrelationId();

  try {
    const body: BulkSkipTraceRequest = await request.json();
    const { leads, webhookUrl, batchId, teamId } = body;

    // Validate
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "leads array is required and must not be empty" },
        { status: 400 },
      );
    }

    if (leads.length > 250) {
      return NextResponse.json(
        { error: "Maximum 250 leads per batch. Split into multiple requests." },
        { status: 400 },
      );
    }

    // Validate each lead has address
    const invalidLeads = leads.filter((l) => !l.address || !l.city || !l.state);
    if (invalidLeads.length > 0) {
      return NextResponse.json(
        {
          error: `${invalidLeads.length} leads missing required address fields`,
          invalidIds: invalidLeads.map((l) => l.id),
        },
        { status: 400 },
      );
    }

    // Check API key
    if (!REALESTATE_API_KEY) {
      console.warn(
        `[Bulk Skip Trace] REALESTATE_API_KEY not configured [${correlationId}]`,
      );
      return NextResponse.json(
        {
          error: "Skip trace API not configured",
          hint: "Set REALESTATE_API_KEY environment variable",
        },
        { status: 503 },
      );
    }

    console.log(
      `[Bulk Skip Trace] Processing ${leads.length} leads, batchId=${batchId || "none"} [${correlationId}]`,
    );

    // Build payload for RealEstateAPI
    const inputs = leads.map((lead) => ({
      // Use company name as context, but skip trace the owner
      first_name: lead.firstName || "",
      last_name: lead.lastName || "",
      // Business address is the key - often owner owns the building
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip || "",
      // Include original ID for mapping results back
      custom_id: lead.id,
    }));

    // Build webhook URL with metadata
    let callbackUrl = webhookUrl;
    if (callbackUrl) {
      const url = new URL(callbackUrl);
      if (batchId) url.searchParams.set("batchId", batchId);
      if (teamId) url.searchParams.set("teamId", teamId);
      url.searchParams.set("correlationId", correlationId);
      callbackUrl = url.toString();
    }

    // Call RealEstateAPI with retry logic
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(REALESTATE_API_URL, {
          method: "POST",
          headers: {
            "x-api-key": REALESTATE_API_KEY,
            "Content-Type": "application/json",
            "x-correlation-id": correlationId,
            "x-client": "nextier-platform",
          },
          body: JSON.stringify({
            inputs,
            webhook_url: callbackUrl,
          }),
        });

        // Handle rate limiting
        if (response.status === 429 && attempt < RETRY_CONFIG.maxRetries) {
          const retryAfter = response.headers.get("retry-after");
          const delayMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Math.min(
                RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
                RETRY_CONFIG.maxDelayMs,
              );

          console.warn(
            `[Bulk Skip Trace] Rate limited, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms [${correlationId}]`,
          );
          await sleep(delayMs);
          continue;
        }

        // Handle retryable server errors
        if (
          RETRY_CONFIG.retryableStatuses.includes(response.status) &&
          attempt < RETRY_CONFIG.maxRetries
        ) {
          const delayMs = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
            RETRY_CONFIG.maxDelayMs,
          );
          console.warn(
            `[Bulk Skip Trace] Retryable error ${response.status}, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} [${correlationId}]`,
          );
          await sleep(delayMs);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[Bulk Skip Trace] API error: ${response.status} - ${errorText} [${correlationId}]`,
          );

          if (response.status === 401) {
            return NextResponse.json(
              { error: "Invalid API key", correlationId },
              { status: 401 },
            );
          }
          if (response.status === 403) {
            return NextResponse.json(
              { error: "No skip trace credits remaining", correlationId },
              { status: 403 },
            );
          }

          return NextResponse.json(
            {
              error: `Bulk skip trace failed: ${response.status}`,
              correlationId,
            },
            { status: response.status },
          );
        }

        const result: BulkJobResponse = await response.json();

        console.log(
          `[Bulk Skip Trace] Job submitted: ${result.job_id}, status=${result.status} [${correlationId}]`,
        );

        // If results are immediately available (small batch), process them
        if (result.status === "completed" && result.results) {
          const processed = processResults(leads, result.results);
          return NextResponse.json({
            success: true,
            mode: "sync",
            jobId: result.job_id,
            correlationId,
            batchId,
            total: leads.length,
            processed: processed.length,
            failed: leads.length - processed.length,
            results: processed,
          });
        }

        // Async mode - webhook will be called when complete
        return NextResponse.json({
          success: true,
          mode: "async",
          jobId: result.job_id,
          correlationId,
          batchId,
          status: result.status,
          total: result.total_requests,
          estimatedCompletionTime: result.estimated_completion_time,
          message: webhookUrl
            ? `Results will be sent to webhook when complete`
            : `Poll GET /api/enrichment/bulk-skip-trace?jobId=${result.job_id} for results`,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delayMs = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
            RETRY_CONFIG.maxDelayMs,
          );
          console.warn(
            `[Bulk Skip Trace] Network error, retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} [${correlationId}]`,
          );
          await sleep(delayMs);
          continue;
        }
      }
    }

    throw lastError || new Error("Bulk skip trace failed after retries");
  } catch (error) {
    console.error(`[Bulk Skip Trace] Error [${correlationId}]:`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Bulk skip trace failed",
        correlationId,
      },
      { status: 500 },
    );
  }
}

// GET - Check job status
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({
      configured: !!REALESTATE_API_KEY,
      endpoint: "POST /api/enrichment/bulk-skip-trace",
      maxBatchSize: 250,
      requiredFields: ["leads[].address", "leads[].city", "leads[].state"],
      optionalFields: [
        "leads[].firstName",
        "leads[].lastName",
        "leads[].zip",
        "webhookUrl",
        "batchId",
        "teamId",
      ],
      costPerTrace: "$0.10-0.25",
    });
  }

  if (!REALESTATE_API_KEY) {
    return NextResponse.json(
      { error: "Skip trace API not configured" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `https://api.realestateapi.com/v2/SkipTrace/Bulk/${jobId}`,
      {
        method: "GET",
        headers: {
          "x-api-key": REALESTATE_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to get job status: ${response.status}` },
        { status: response.status },
      );
    }

    const result: BulkJobResponse = await response.json();

    return NextResponse.json({
      jobId: result.job_id,
      status: result.status,
      total: result.total_requests,
      completed: result.completed_requests || 0,
      failed: result.failed_requests || 0,
      results: result.status === "completed" ? result.results : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to check status",
      },
      { status: 500 },
    );
  }
}

// Process results and map back to original leads
function processResults(
  originalLeads: BulkSkipTraceInput[],
  results: SkipTraceResult[],
): Array<{
  id: string;
  leadId: string;
  success: boolean;
  phones: Array<{
    number: string;
    type: string;
    isMobile: boolean;
    score?: number;
  }>;
  emails: Array<{
    email: string;
    type: string;
    isValid?: boolean;
    score?: number;
  }>;
  socials: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  demographics?: Record<string, unknown>;
  matchScore?: number;
  error?: string;
}> {
  return results.map((result, index) => {
    const originalLead = originalLeads[index];
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (!result.success || !result.output) {
      return {
        id: originalLead?.id || `unknown_${index}`,
        leadId,
        success: false,
        phones: [],
        emails: [],
        socials: {},
        error: result.error || "No data returned",
      };
    }

    const phones = (result.output.phones || []).map((p) => ({
      number: p.phone_number,
      type: p.phone_type || "unknown",
      isMobile: p.phone_type === "mobile" || p.line_type === "mobile",
      carrier: p.carrier,
      isConnected: p.is_connected,
      score: p.score,
    }));

    const emails = (result.output.emails || []).map((e) => ({
      email: e.email_address,
      type: e.email_type || "unknown",
      isValid: e.is_valid,
      score: e.score,
    }));

    const socialProfiles = result.output.social_profiles || [];
    const socials = {
      linkedin: socialProfiles.find(
        (s) => s.platform.toLowerCase() === "linkedin",
      )?.url,
      facebook: socialProfiles.find(
        (s) => s.platform.toLowerCase() === "facebook",
      )?.url,
      twitter: socialProfiles.find(
        (s) => s.platform.toLowerCase() === "twitter",
      )?.url,
      instagram: socialProfiles.find(
        (s) => s.platform.toLowerCase() === "instagram",
      )?.url,
    };

    return {
      id: originalLead?.id || `unknown_${index}`,
      leadId,
      success: true,
      phones,
      emails,
      socials,
      demographics: result.output.demographics,
      identity: result.output.identity,
      relatives: result.output.relatives,
      associates: result.output.associates,
      matchScore: result.match_score,
    };
  });
}
