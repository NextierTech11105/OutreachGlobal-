/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRACERFY SKIP TRACING API CLIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * Property owner skip tracing via Tracerfy.com
 *
 * API ENDPOINTS:
 * - POST /trace/       - Start skip trace job (CSV or JSON)
 * - GET  /queues/      - List all jobs
 * - GET  /queue/:id    - Get job results
 * - GET  /analytics/   - Account stats
 *
 * PRICING: $0.02/record (normal trace)
 * UPTIME: 99.8%
 * PROCESSING: Async with webhooks
 *
 * TRACE TYPES:
 * - normal: 1 credit/lead - basic contact data (phones, emails, mailing address)
 * - enhanced: 15 credits/lead - comprehensive data with relatives, aliases, businesses
 *
 * WEBHOOK: Configure at /api/skip-trace/tracerfy/webhook for job completion notifications
 */

const TRACERFY_BASE_URL = "https://tracerfy.com/v1/api";

// Webhook URL for async job completion notifications
export const TRACERFY_WEBHOOK_URL =
  process.env.TRACERFY_WEBHOOK_URL ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/skip-trace/tracerfy/webhook`;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TraceType = "normal" | "enhanced";

export interface TracerfyQueue {
  id: number;
  created_at: string;
  pending: boolean;
  download_url: string | null;
  rows_uploaded: number;
  credits_deducted: number;
  queue_type: "api" | "app";
  trace_type: TraceType;
  credits_per_lead: number;
}

export interface TracerfyAnalytics {
  total_queues: number;
  properties_traced: number;
  queues_pending: number;
  queues_completed: number;
  balance: number;
}

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
  primary_phone_type: string;
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
  // Relatives 1-8 with their contact info
  [key: `relative_${number}_name`]: string;
  [key: `relative_${number}_mobile_${number}`]: string;
  [key: `relative_${number}_landline_${number}`]: string;
  [key: `relative_${number}_email_${number}`]: string;
}

export interface TraceJobInput {
  address: string;
  city: string;
  state: string;
  zip?: string;
  first_name: string;
  last_name: string;
  mail_address: string;
  mail_city: string;
  mail_state: string;
  mailing_zip?: string;
}

export interface TraceJobResponse {
  message: string;
  queue_id: number;
  status: string;
  created_at: string;
  rows_uploaded: number;
  trace_type: TraceType;
  credits_per_lead: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class TracerfyClient {
  protected apiToken: string;

  constructor(apiToken?: string) {
    // Bearer token for Authorization header
    // Get from: https://tracerfy.com/dashboard
    this.apiToken = apiToken || process.env.TRACERFY_API_TOKEN || "";
    if (!this.apiToken) {
      console.warn(
        "[Tracerfy] No API token - set TRACERFY_API_TOKEN in .env.local",
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${TRACERFY_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiToken}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tracerfy API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get account analytics (balance, queues, etc.)
   */
  async getAnalytics(): Promise<TracerfyAnalytics> {
    return this.request<TracerfyAnalytics>("/analytics/");
  }

  /**
   * Get all trace queues
   */
  async getQueues(): Promise<TracerfyQueue[]> {
    return this.request<TracerfyQueue[]>("/queues/");
  }

  /**
   * Get single queue results
   */
  async getQueueResults(
    queueId: number,
  ): Promise<TracerfyNormalResult[] | TracerfyEnhancedResult[]> {
    return this.request(`/queue/${queueId}`);
  }

  /**
   * Start a trace job from JSON data
   */
  async beginTrace(
    records: TraceJobInput[],
    traceType: TraceType = "normal",
  ): Promise<TraceJobResponse> {
    return this.request<TraceJobResponse>("/trace/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json_data: JSON.stringify(records),
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
  }

  /**
   * Start a trace job from CSV file
   */
  async beginTraceFromCSV(
    csvFile: File | Blob,
    columnMapping: {
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
    },
    traceType: TraceType = "normal",
  ): Promise<TraceJobResponse> {
    const formData = new FormData();
    formData.append("csv_file", csvFile);
    formData.append("address_column", columnMapping.address_column);
    formData.append("city_column", columnMapping.city_column);
    formData.append("state_column", columnMapping.state_column);
    if (columnMapping.zip_column) {
      formData.append("zip_column", columnMapping.zip_column);
    }
    formData.append("first_name_column", columnMapping.first_name_column);
    formData.append("last_name_column", columnMapping.last_name_column);
    formData.append("mail_address_column", columnMapping.mail_address_column);
    formData.append("mail_city_column", columnMapping.mail_city_column);
    formData.append("mail_state_column", columnMapping.mail_state_column);
    if (columnMapping.mailing_zip_column) {
      formData.append("mailing_zip_column", columnMapping.mailing_zip_column);
    }
    formData.append("trace_type", traceType);

    const url = `${TRACERFY_BASE_URL}/trace/`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tracerfy API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Poll queue until complete
   */
  async waitForQueue(
    queueId: number,
    pollIntervalMs = 5000,
    maxWaitMs = 300000,
  ): Promise<TracerfyQueue> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const queues = await this.getQueues();
      const queue = queues.find((q) => q.id === queueId);

      if (!queue) {
        throw new Error(`Queue ${queueId} not found`);
      }

      if (!queue.pending && queue.download_url) {
        return queue;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Queue ${queueId} did not complete within ${maxWaitMs}ms`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let tracerfyClient: TracerfyClient | null = null;

export function getTracerfyClient(): TracerfyClient {
  if (!tracerfyClient) {
    tracerfyClient = new TracerfyClient();
  }
  return tracerfyClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract all valid phone numbers from a trace result
 */
export function extractPhones(
  result: TracerfyNormalResult,
): { number: string; type: string }[] {
  const phones: { number: string; type: string }[] = [];

  // Primary phone
  if (result.primary_phone) {
    phones.push({
      number: result.primary_phone,
      type: result.primary_phone_type || "Unknown",
    });
  }

  // Mobiles
  for (let i = 1; i <= 5; i++) {
    const mobile = result[`mobile_${i}` as keyof TracerfyNormalResult];
    if (mobile && typeof mobile === "string" && mobile.trim()) {
      phones.push({ number: mobile, type: "Mobile" });
    }
  }

  // Landlines
  for (let i = 1; i <= 3; i++) {
    const landline = result[`landline_${i}` as keyof TracerfyNormalResult];
    if (landline && typeof landline === "string" && landline.trim()) {
      phones.push({ number: landline, type: "Landline" });
    }
  }

  // De-duplicate
  const seen = new Set<string>();
  return phones.filter((p) => {
    const normalized = p.number.replace(/\D/g, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

/**
 * Extract all valid emails from a trace result
 */
export function extractEmails(result: TracerfyNormalResult): string[] {
  const emails: string[] = [];

  for (let i = 1; i <= 5; i++) {
    const email = result[`email_${i}` as keyof TracerfyNormalResult];
    if (email && typeof email === "string" && email.trim()) {
      emails.push(email);
    }
  }

  return [...new Set(emails)];
}

/**
 * Calculate credits needed for a trace job
 */
export function calculateCreditsNeeded(
  recordCount: number,
  traceType: TraceType,
): number {
  const creditsPerLead = traceType === "enhanced" ? 15 : 1;
  return recordCount * creditsPerLead;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVERSE NAME APPEND
// ═══════════════════════════════════════════════════════════════════════════════
//
// When you have names + locations but need contact info
// Input: First name, last name, city, state
// Output: Mailing addresses, up to 8 phones, up to 5 emails
//

export interface NameAppendInput {
  first_name: string;
  last_name: string;
  middle_name?: string;
  city: string;
  state: string;
}

export interface NameAppendResult {
  first_name: string;
  middle_name?: string;
  last_name: string;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
  age?: number;
  deceased?: boolean;
  // Up to 8 phone numbers
  phone_1?: string;
  phone_1_type?: string;
  phone_2?: string;
  phone_2_type?: string;
  phone_3?: string;
  phone_3_type?: string;
  phone_4?: string;
  phone_4_type?: string;
  phone_5?: string;
  phone_5_type?: string;
  phone_6?: string;
  phone_6_type?: string;
  phone_7?: string;
  phone_7_type?: string;
  phone_8?: string;
  phone_8_type?: string;
  // Up to 5 emails
  email_1?: string;
  email_2?: string;
  email_3?: string;
  email_4?: string;
  email_5?: string;
}

export interface NameAppendJobResponse {
  message: string;
  queue_id: number;
  status: "pending" | "processing" | "completed";
  type: "name append";
  created_at: string;
  rows_uploaded: number;
}

/**
 * Extended TracerfyClient with Name Append support
 */
export class TracerfyNameAppendClient extends TracerfyClient {
  /**
   * Start a name append job from JSON data
   * Use when you have names + locations but need phones/emails
   */
  async beginNameAppend(
    records: NameAppendInput[],
  ): Promise<NameAppendJobResponse> {
    const url = `${TRACERFY_BASE_URL}/name-append/`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json_data: JSON.stringify(records),
        first_name_column: "first_name",
        last_name_column: "last_name",
        middle_name_column: "middle_name",
        city_column: "city",
        state_column: "state",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Tracerfy Name Append error: ${response.status} - ${error}`,
      );
    }

    return response.json();
  }

  /**
   * Start a name append job from CSV file
   */
  async beginNameAppendFromCSV(
    csvFile: File | Blob,
    columnMapping: {
      first_name_column: string;
      last_name_column: string;
      city_column: string;
      state_column: string;
      middle_name_column?: string;
    },
  ): Promise<NameAppendJobResponse> {
    const formData = new FormData();
    formData.append("csv_file", csvFile);
    formData.append("first_name_column", columnMapping.first_name_column);
    formData.append("last_name_column", columnMapping.last_name_column);
    formData.append("city_column", columnMapping.city_column);
    formData.append("state_column", columnMapping.state_column);
    if (columnMapping.middle_name_column) {
      formData.append("middle_name_column", columnMapping.middle_name_column);
    }

    const url = `${TRACERFY_BASE_URL}/name-append/`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Tracerfy Name Append error: ${response.status} - ${error}`,
      );
    }

    return response.json();
  }

  /**
   * Get name append job results
   */
  async getNameAppendResults(queueId: number): Promise<NameAppendResult[]> {
    return this.getQueueResults(queueId) as Promise<NameAppendResult[]>;
  }
}

/**
 * Extract all phones from a name append result
 */
export function extractNameAppendPhones(
  result: NameAppendResult,
): { number: string; type: string }[] {
  const phones: { number: string; type: string }[] = [];

  for (let i = 1; i <= 8; i++) {
    const phone = result[`phone_${i}` as keyof NameAppendResult] as
      | string
      | undefined;
    const type = result[`phone_${i}_type` as keyof NameAppendResult] as
      | string
      | undefined;
    if (phone && phone.trim()) {
      phones.push({ number: phone, type: type || "Unknown" });
    }
  }

  // De-duplicate
  const seen = new Set<string>();
  return phones.filter((p) => {
    const normalized = p.number.replace(/\D/g, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

/**
 * Extract all emails from a name append result
 */
export function extractNameAppendEmails(result: NameAppendResult): string[] {
  const emails: string[] = [];

  for (let i = 1; i <= 5; i++) {
    const email = result[`email_${i}` as keyof NameAppendResult] as
      | string
      | undefined;
    if (email && email.trim()) {
      emails.push(email);
    }
  }

  return [...new Set(emails)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHMENT STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════
//
// USBIZDATA FORMAT (proper fields):
// - First Name, Last Name, Address, City, State, Zip
// - Use SKIP TRACE for best accuracy ($0.02/lead)
//
// USE SKIP TRACE (default for USBizData):
// - Has first name + last name in proper fields
// - Has full address with city, state, zip
// - Best accuracy with all data points
//
// USE NAME APPEND (fallback):
// - Only has names + city/state (no street address)
// - Partial data from Apollo/other sources
//

export type EnrichmentStrategy = "skip_trace" | "name_append" | "both";

/**
 * USBizData comes with proper fields:
 * - First Name, Last Name
 * - Street Address, City, State, Zip
 *
 * This means SKIP TRACE is always the best choice for USBizData
 */
export function determineEnrichmentStrategy(
  record: Record<string, string | undefined>,
): EnrichmentStrategy {
  // Check for proper USBizData fields
  const hasFirstName = !!(
    record.first_name ||
    record.firstName ||
    record["First Name"]
  );
  const hasLastName = !!(
    record.last_name ||
    record.lastName ||
    record["Last Name"]
  );
  const hasAddress = !!(
    record.address ||
    record.street_address ||
    record["Street Address"] ||
    record.Address
  );
  const hasCity = !!(record.city || record.City);
  const hasState = !!(record.state || record.State || record.ST);
  const hasZip = !!(
    record.zip ||
    record.zipCode ||
    record["Zip Code"] ||
    record.ZIP
  );

  const hasFullAddress = hasAddress && hasCity && hasState;
  const hasName = hasFirstName || hasLastName;

  // USBizData format = Skip Trace (best accuracy)
  if (hasFullAddress && hasName) {
    return "skip_trace";
  }

  // Has name + location but no street address = Name Append
  if (hasName && hasCity && hasState && !hasAddress) {
    return "name_append";
  }

  // Has address but no name = Skip Trace (can still match)
  if (hasFullAddress) {
    return "skip_trace";
  }

  // Fallback to name append
  return "name_append";
}

/**
 * Map USBizData fields to Tracerfy input format
 */
export function mapUSBizDataToTraceInput(
  record: Record<string, string>,
): TraceJobInput {
  return {
    first_name:
      record.first_name ||
      record.firstName ||
      record["First Name"] ||
      record["Contact Name"]?.split(" ")[0] ||
      "",
    last_name:
      record.last_name ||
      record.lastName ||
      record["Last Name"] ||
      record["Contact Name"]?.split(" ").slice(1).join(" ") ||
      "",
    address:
      record.address ||
      record.street_address ||
      record["Street Address"] ||
      record.Address ||
      "",
    city: record.city || record.City || "",
    state: record.state || record.State || record.ST || "",
    zip: record.zip || record.zipCode || record["Zip Code"] || record.ZIP || "",
    // Mailing address defaults to same as property address
    mail_address:
      record.mail_address || record.address || record["Street Address"] || "",
    mail_city: record.mail_city || record.city || record.City || "",
    mail_state: record.mail_state || record.state || record.State || "",
    mailing_zip: record.mailing_zip || record.zip || record["Zip Code"] || "",
  };
}
