/**
 * Tracerfy API Client for LUCI Skip Trace
 *
 * Base URL: https://tracerfy.com/v1/api/
 * Auth: Bearer token
 *
 * Flow:
 * 1. POST /trace/ with CSV/JSON batch → get queue_id
 * 2. Poll /queue/:id OR wait for webhook
 * 3. Download CSV result from download_url
 *
 * Pricing:
 * - Normal trace: 1 credit/lead ($0.02)
 * - Enhanced trace: 15 credits/lead ($0.30) - includes relatives, aliases, past addresses
 */

const TRACERFY_BASE_URL = "https://tracerfy.com/v1/api";
const TRACERFY_API_KEY = process.env.TRACERFY_API_KEY;

// =============================================================================
// TYPES - Match actual API response
// =============================================================================

export interface TracerfyQueue {
  id: number;
  created_at: string;
  pending: boolean;
  download_url: string | null;
  rows_uploaded: number;
  credits_deducted: number;
  queue_type: "api" | "app";
  trace_type: "normal" | "enhanced";
  credits_per_lead: number;
}

export interface TracerfyAnalytics {
  total_queues: number;
  properties_traced: number;
  queues_pending: number;
  queues_completed: number;
  balance: number;
}

export interface TracerfyTraceRequest {
  address_column: string;
  city_column: string;
  state_column: string;
  zip_column?: string;
  first_name_column: string;
  last_name_column: string;
  mail_address_column: string;
  mail_city_column: string;
  mail_state_column: string;
  mailing_zip_column?: string;
  trace_type?: "normal" | "enhanced";
}

export interface TracerfyTraceResponse {
  message: string;
  queue_id: number;
  status: "pending";
  created_at: string;
  rows_uploaded: number;
  trace_type: "normal" | "enhanced";
  credits_per_lead: number;
}

// Normal trace result (single record from queue)
export interface TracerfyNormalResult {
  address: string;
  city: string;
  state: string;
  mail_address: string;
  mail_city: string;
  mail_state: string;
  first_name: string;
  last_name: string;
  primary_phone: string;
  primary_phone_type: "Mobile" | "Landline" | "";
  email_1: string;
  email_2: string;
  email_3: string;
  email_4: string;
  email_5: string;
  mobile_1: string;
  mobile_2: string;
  mobile_3: string;
  mobile_4: string;
  mobile_5: string;
  landline_1: string;
  landline_2: string;
  landline_3: string;
}

// Enhanced trace includes relatives, aliases, past addresses, businesses
export interface TracerfyEnhancedResult extends TracerfyNormalResult {
  zip: string;
  mail_zip: string;
  age: string;
  alias_1: string;
  alias_2: string;
  alias_3: string;
  alias_4: string;
  alias_5: string;
  past_address_1: string;
  past_address_2: string;
  past_address_3: string;
  past_address_4: string;
  past_address_5: string;
  business_1: string;
  business_2: string;
  business_3: string;
  business_4: string;
  business_5: string;
  // Relatives (up to 8)
  [key: `relative_${number}_name`]: string;
  [key: `relative_${number}_mobile_${number}`]: string;
  [key: `relative_${number}_landline_${number}`]: string;
  [key: `relative_${number}_email_${number}`]: string;
}

// Webhook payload
export interface TracerfyWebhookPayload {
  id: number;
  created_at: string;
  pending: false;
  download_url: string;
  rows_uploaded: number;
  credit_deducted: number;
  queue_type: "api";
  trace_type: "normal" | "enhanced";
  credits_per_lead: number;
}

// =============================================================================
// LUCI TYPES
// =============================================================================

export interface LuciTraceInput {
  address: string;
  city: string;
  state: string;
  zip?: string;
  first_name: string;
  last_name: string;
  mail_address?: string;
  mail_city?: string;
  mail_state?: string;
  mail_zip?: string;
}

export interface LuciTraceQueueResult {
  success: boolean;
  queue_id: number;
  rows_uploaded: number;
  trace_type: "normal" | "enhanced";
  credits_per_lead: number;
  estimated_cost: number;
  error?: string;
}

export interface LuciTraceResult {
  address: string;
  first_name: string;
  last_name: string;
  primary_phone: string | null;
  primary_phone_type: "mobile" | "landline" | null;
  all_phones: { number: string; type: "mobile" | "landline" }[];
  all_emails: string[];
  has_data: boolean;
}

// =============================================================================
// API CLIENT
// =============================================================================

async function makeRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  if (!TRACERFY_API_KEY) {
    throw new Error("TRACERFY_API_KEY not configured");
  }

  const response = await fetch(`${TRACERFY_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${TRACERFY_API_KEY}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Tracerfy API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get account analytics (balance, queue counts)
 */
export async function getAnalytics(): Promise<TracerfyAnalytics> {
  return makeRequest<TracerfyAnalytics>("/analytics/");
}

/**
 * Get all queues
 */
export async function getQueues(): Promise<TracerfyQueue[]> {
  return makeRequest<TracerfyQueue[]>("/queues/");
}

/**
 * Get single queue results
 */
export async function getQueueResults(
  queueId: number
): Promise<TracerfyNormalResult[] | TracerfyEnhancedResult[]> {
  return makeRequest(`/queue/${queueId}`);
}

/**
 * Check if queue is complete
 */
export async function isQueueComplete(queueId: number): Promise<{
  complete: boolean;
  download_url: string | null;
}> {
  const queues = await getQueues();
  const queue = queues.find(q => q.id === queueId);

  if (!queue) {
    throw new Error(`Queue ${queueId} not found`);
  }

  return {
    complete: !queue.pending,
    download_url: queue.download_url,
  };
}

/**
 * Start a batch trace from JSON data
 * Returns queue_id - poll or wait for webhook
 * MINIMUM 10 RECORDS REQUIRED
 */
export async function startTrace(
  records: LuciTraceInput[],
  options?: { traceType?: "normal" | "enhanced" }
): Promise<LuciTraceQueueResult> {
  if (!TRACERFY_API_KEY) {
    return {
      success: false,
      queue_id: 0,
      rows_uploaded: 0,
      trace_type: "normal",
      credits_per_lead: 1,
      estimated_cost: 0,
      error: "TRACERFY_API_KEY not configured",
    };
  }

  // Tracerfy requires minimum 10 records
  if (records.length < 10) {
    return {
      success: false,
      queue_id: 0,
      rows_uploaded: 0,
      trace_type: options?.traceType || "normal",
      credits_per_lead: options?.traceType === "enhanced" ? 15 : 1,
      estimated_cost: 0,
      error: `Minimum 10 records required (got ${records.length})`,
    };
  }

  const traceType = options?.traceType || "normal";
  const creditsPerLead = traceType === "enhanced" ? 15 : 1;

  try {
    // Format data for Tracerfy API
    const jsonData = records.map(r => ({
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip || "",
      first_name: r.first_name,
      last_name: r.last_name,
      mail_address: r.mail_address || r.address,
      mail_city: r.mail_city || r.city,
      mail_state: r.mail_state || r.state,
      mailing_zip: r.mail_zip || r.zip || "",
    }));

    const response = await fetch(`${TRACERFY_BASE_URL}/trace/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TRACERFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json_data: JSON.stringify(jsonData),
        address_column: "address",
        city_column: "city",
        state_column: "state",
        zip_column: "zip",
        first_name_column: "first_name",
        last_name_column: "last_name",
        mail_address_column: "mail_address",
        mail_city_column: "mail_city",
        mail_state_column: "mail_state",
        mailing_zip_column: "mailing_zip",
        trace_type: traceType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        queue_id: 0,
        rows_uploaded: 0,
        trace_type: traceType,
        credits_per_lead: creditsPerLead,
        estimated_cost: 0,
        error: `API error ${response.status}: ${errorText}`,
      };
    }

    const data: TracerfyTraceResponse = await response.json();

    return {
      success: true,
      queue_id: data.queue_id,
      rows_uploaded: data.rows_uploaded,
      trace_type: data.trace_type,
      credits_per_lead: data.credits_per_lead,
      estimated_cost: data.rows_uploaded * data.credits_per_lead * 0.02,
    };
  } catch (error) {
    return {
      success: false,
      queue_id: 0,
      rows_uploaded: 0,
      trace_type: traceType,
      credits_per_lead: creditsPerLead,
      estimated_cost: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Poll queue until complete, then return results
 */
export async function waitForQueue(
  queueId: number,
  options?: {
    pollInterval?: number; // ms between polls (default 5000)
    maxWait?: number; // max ms to wait (default 300000 = 5 min)
    onProgress?: (status: { pending: boolean; elapsed: number }) => void;
  }
): Promise<LuciTraceResult[]> {
  const pollInterval = options?.pollInterval || 5000;
  const maxWait = options?.maxWait || 300000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const status = await isQueueComplete(queueId);

    if (options?.onProgress) {
      options.onProgress({
        pending: !status.complete,
        elapsed: Date.now() - startTime,
      });
    }

    if (status.complete) {
      const results = await getQueueResults(queueId);
      return results.map(normalizeResult);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Queue ${queueId} did not complete within ${maxWait}ms`);
}

/**
 * Normalize Tracerfy result to LUCI format
 */
function normalizeResult(result: TracerfyNormalResult): LuciTraceResult {
  const allPhones: { number: string; type: "mobile" | "landline" }[] = [];

  // Collect mobiles
  const mobiles = [result.mobile_1, result.mobile_2, result.mobile_3, result.mobile_4, result.mobile_5]
    .filter(p => p && p.trim());
  mobiles.forEach(p => allPhones.push({ number: p, type: "mobile" }));

  // Collect landlines
  const landlines = [result.landline_1, result.landline_2, result.landline_3]
    .filter(p => p && p.trim());
  landlines.forEach(p => allPhones.push({ number: p, type: "landline" }));

  // Collect emails
  const allEmails = [result.email_1, result.email_2, result.email_3, result.email_4, result.email_5]
    .filter(e => e && e.trim());

  // Primary phone
  const primaryPhone = result.primary_phone || mobiles[0] || landlines[0] || null;
  const primaryPhoneType = result.primary_phone_type === "Mobile" ? "mobile" :
                           result.primary_phone_type === "Landline" ? "landline" : null;

  return {
    address: result.address,
    first_name: result.first_name,
    last_name: result.last_name,
    primary_phone: primaryPhone,
    primary_phone_type: primaryPhoneType,
    all_phones: allPhones,
    all_emails: allEmails,
    has_data: allPhones.length > 0 || allEmails.length > 0,
  };
}

/**
 * Handle webhook callback from Tracerfy
 * Use this in your webhook route
 */
export function parseWebhook(payload: TracerfyWebhookPayload): {
  queue_id: number;
  download_url: string;
  rows: number;
  credits_used: number;
  trace_type: "normal" | "enhanced";
} {
  return {
    queue_id: payload.id,
    download_url: payload.download_url,
    rows: payload.rows_uploaded,
    credits_used: payload.credit_deducted,
    trace_type: payload.trace_type,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const tracerfyClient = {
  getAnalytics,
  getQueues,
  getQueueResults,
  isQueueComplete,
  startTrace,
  waitForQueue,
  parseWebhook,
};

export default tracerfyClient;
