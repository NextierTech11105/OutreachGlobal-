/**
 * PII Redaction Helpers
 *
 * Functions to mask sensitive data before logging.
 * Ensures webhook logs don't expose phone numbers, message content, or secrets.
 */

/**
 * Mask phone number for safe logging.
 * Preserves last 4 digits for debugging while hiding the rest.
 *
 * Examples:
 *   +15551234567 → +1***-***-4567
 *   5551234567   → +1***-***-4567
 *   null/empty   → [none]
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return "[none]";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `+1***-***-${digits.slice(-4)}`;
}

/**
 * Truncate message body for safe logging.
 * Preserves first N chars for debugging context without exposing full content.
 *
 * Examples:
 *   "Hello world"          → "Hello world"
 *   "Long message..."      → "Long message here is...[150 chars]"
 *   null/empty             → [empty]
 */
export function truncateBody(
  body: string | undefined | null,
  maxLen = 30,
): string {
  if (!body) return "[empty]";
  if (body.length <= maxLen) return body;
  return `${body.slice(0, maxLen)}...[${body.length} chars]`;
}

/**
 * Redact sensitive fields from webhook payload before logging.
 *
 * Protects:
 * - Phone numbers (from, to)
 * - Message content (text, body)
 * - Any token/secret fields
 */
export function redactPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const safe = { ...payload };

  // Mask phone numbers
  if (safe.from) safe.from = maskPhone(String(safe.from));
  if (safe.to) safe.to = maskPhone(String(safe.to));

  // Truncate message content
  if (safe.text) safe.text = truncateBody(String(safe.text));
  if (safe.body) safe.body = truncateBody(String(safe.body));

  // Remove any tokens/secrets that might be in payload
  delete safe.token;
  delete safe.secret;
  delete safe.apiKey;
  delete safe.authToken;
  delete safe.api_key;
  delete safe.auth_token;

  return safe;
}
