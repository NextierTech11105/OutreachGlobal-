/**
 * Webhook Security Logger
 *
 * Provides structured logging for webhook security events.
 * All logs are designed for observability without exposing sensitive data.
 */

export type AuthMethod = "URL_TOKEN" | "HEADER" | "NONE";

export interface WebhookSecurityLog {
  timestamp: string;
  request_id: string;
  auth_method: AuthMethod;
  verified: boolean;
  event_type: string;
  source_ip: string;
  user_agent?: string;
  from_number_masked?: string;
  to_number_masked?: string;
}

/**
 * Log a webhook security event with appropriate severity level.
 *
 * Log levels:
 * - ERROR: Authentication failed (auth_method = NONE or verified = false)
 * - INFO: Authentication succeeded
 */
export function logWebhookSecurity(log: WebhookSecurityLog): void {
  const level = !log.verified ? "ERROR" : "INFO";
  console.log(`[SignalHouse] [SECURITY] [${level}]`, JSON.stringify(log));
}

/**
 * Generate a unique request ID for tracing webhook requests.
 * Format: req_<timestamp_base36>_<random_6chars>
 *
 * Example: req_m1abc23_x7f9k2
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
