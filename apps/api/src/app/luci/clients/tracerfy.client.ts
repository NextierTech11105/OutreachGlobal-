/**
 * Tracerfy API Client
 * Skip tracing via Tracerfy.com
 * Base URL: https://tracerfy.com/v1/api/
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TraceTypeValue } from "../constants";

export interface TracerfyQueue {
  id: number;
  created_at: string;
  pending: boolean;
  download_url: string | null;
  rows_uploaded: number;
  credits_deducted: number;
  queue_type: "api" | "app";
  trace_type: TraceTypeValue;
  credits_per_lead: number;
}

export interface TracerfyAnalytics {
  total_queues: number;
  properties_traced: number;
  queues_pending: number;
  queues_completed: number;
  balance: number;
}

export interface TracerfyTraceResult {
  message: string;
  queue_id: number;
  status: "pending";
  created_at: string;
  rows_uploaded: number;
  trace_type: TraceTypeValue;
  credits_per_lead: number;
}

export interface TracerfyRecord {
  address: string;
  city: string;
  state: string;
  zip?: string;
  mail_address: string;
  mail_city: string;
  mail_state: string;
  mail_zip?: string;
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
  // Enhanced trace fields (optional)
  age?: string;
  alias_1?: string;
  alias_2?: string;
  alias_3?: string;
  alias_4?: string;
  alias_5?: string;
  past_address_1?: string;
  past_address_2?: string;
  past_address_3?: string;
  past_address_4?: string;
  past_address_5?: string;
  business_1?: string;
  business_2?: string;
  business_3?: string;
  business_4?: string;
  business_5?: string;
  // Relatives (enhanced only)
  relative_1_name?: string;
  relative_1_mobile_1?: string;
  relative_1_email_1?: string;
  // ... up to relative_8
}

export interface TraceRequest {
  csvBuffer?: Buffer;
  jsonData?: Record<string, unknown>[];
  columnMapping: {
    address: string;
    city: string;
    state: string;
    zip?: string;
    firstName: string;
    lastName: string;
    mailAddress: string;
    mailCity: string;
    mailState: string;
    mailingZip?: string;
  };
  traceType?: TraceTypeValue;
}

@Injectable()
export class TracerfyClient {
  private readonly logger = new Logger(TracerfyClient.name);
  private readonly baseUrl = "https://tracerfy.com/v1/api";
  private readonly apiToken: string;

  constructor(private config: ConfigService) {
    this.apiToken = this.config.get<string>("TRACERFY_API_TOKEN") || "";
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
    };
  }

  /**
   * Fetch all queues for the authenticated user
   */
  async getQueues(): Promise<TracerfyQueue[]> {
    const res = await fetch(`${this.baseUrl}/queues/`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Tracerfy getQueues failed: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Fetch single queue results
   */
  async getQueue(queueId: number): Promise<TracerfyRecord[]> {
    const res = await fetch(`${this.baseUrl}/queue/${queueId}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Tracerfy getQueue failed: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Get account analytics
   */
  async getAnalytics(): Promise<TracerfyAnalytics> {
    const res = await fetch(`${this.baseUrl}/analytics/`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Tracerfy getAnalytics failed: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Begin skip trace from CSV buffer
   */
  async beginTrace(request: TraceRequest): Promise<TracerfyTraceResult> {
    const formData = new FormData();

    // Add column mappings
    formData.append("address_column", request.columnMapping.address);
    formData.append("city_column", request.columnMapping.city);
    formData.append("state_column", request.columnMapping.state);
    if (request.columnMapping.zip) {
      formData.append("zip_column", request.columnMapping.zip);
    }
    formData.append("first_name_column", request.columnMapping.firstName);
    formData.append("last_name_column", request.columnMapping.lastName);
    formData.append("mail_address_column", request.columnMapping.mailAddress);
    formData.append("mail_city_column", request.columnMapping.mailCity);
    formData.append("mail_state_column", request.columnMapping.mailState);
    if (request.columnMapping.mailingZip) {
      formData.append("mailing_zip_column", request.columnMapping.mailingZip);
    }

    // Trace type
    formData.append("trace_type", request.traceType || "normal");

    // Add CSV or JSON
    if (request.csvBuffer) {
      const blob = new Blob([request.csvBuffer], { type: "text/csv" });
      formData.append("csv_file", blob, "leads.csv");
    } else if (request.jsonData) {
      formData.append("json_data", JSON.stringify(request.jsonData));
    } else {
      throw new Error("Must provide csvBuffer or jsonData");
    }

    const res = await fetch(`${this.baseUrl}/trace/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Tracerfy beginTrace failed: ${error}`);
      throw new Error(`Tracerfy beginTrace failed: ${res.status}`);
    }

    const result = await res.json();
    this.logger.log(
      `Tracerfy queue created: ${result.queue_id} (${result.rows_uploaded} rows)`,
    );

    return result;
  }

  /**
   * Poll queue until complete
   */
  async waitForQueue(
    queueId: number,
    maxWaitMs = 300000,
    pollIntervalMs = 5000,
  ): Promise<TracerfyQueue> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const queues = await this.getQueues();
      const queue = queues.find((q) => q.id === queueId);

      if (!queue) {
        throw new Error(`Queue ${queueId} not found`);
      }

      if (!queue.pending && queue.download_url) {
        this.logger.log(`Tracerfy queue ${queueId} complete`);
        return queue;
      }

      this.logger.debug(`Tracerfy queue ${queueId} still pending...`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Tracerfy queue ${queueId} timed out after ${maxWaitMs}ms`);
  }

  /**
   * Download CSV results from completed queue
   */
  async downloadResults(downloadUrl: string): Promise<string> {
    const res = await fetch(downloadUrl);

    if (!res.ok) {
      throw new Error(`Failed to download Tracerfy results: ${res.status}`);
    }

    return res.text();
  }

  /**
   * Extract all phone numbers from a Tracerfy record
   */
  extractPhones(record: TracerfyRecord): string[] {
    const phones: string[] = [];

    if (record.primary_phone) phones.push(record.primary_phone);

    // Mobiles
    for (let i = 1; i <= 5; i++) {
      const phone = record[`mobile_${i}` as keyof TracerfyRecord];
      if (phone && typeof phone === "string" && !phones.includes(phone)) {
        phones.push(phone);
      }
    }

    // Landlines
    for (let i = 1; i <= 3; i++) {
      const phone = record[`landline_${i}` as keyof TracerfyRecord];
      if (phone && typeof phone === "string" && !phones.includes(phone)) {
        phones.push(phone);
      }
    }

    return phones;
  }

  /**
   * Extract all emails from a Tracerfy record
   */
  extractEmails(record: TracerfyRecord): string[] {
    const emails: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const email = record[`email_${i}` as keyof TracerfyRecord];
      if (email && typeof email === "string" && !emails.includes(email)) {
        emails.push(email);
      }
    }

    return emails;
  }
}
