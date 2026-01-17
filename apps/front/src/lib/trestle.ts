/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRESTLE REAL CONTACT API CLIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * Contact verification and contactability scoring via Trestle Identity APIs
 *
 * API ENDPOINT:
 * - GET /1.1/real_contact - Verify phone, email, address with grades
 *
 * PRICING: $0.03/query (Real Contact API)
 *
 * RESPONSE DATA:
 * - Phone: is_valid, activity_score (0-100), line_type, name_match, contact_grade (A-F)
 * - Email: is_valid, name_match, contact_grade (A-F)
 * - Address: is_valid, name_match
 *
 * ADD-ONS (extra cost):
 * - litigator_checks: TCPA litigator risk flag
 * - email_checks_deliverability: Email deliverability check
 * - email_checks_age: Email age score
 *
 * ACTIVITY SCORE THRESHOLDS:
 * - 70+ = High confidence phone is connected and active
 * - 30- = High confidence phone is disconnected/inactive
 * - 50 = Insufficient signals to determine status
 */

const TRESTLE_BASE_URL = "https://api.trestleiq.com";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TrestleAddOn =
  | "litigator_checks"
  | "email_checks_deliverability"
  | "email_checks_age";

export type TrestleLineType =
  | "Mobile"
  | "Landline"
  | "FixedVOIP"
  | "NonFixedVOIP"
  | "Premium"
  | "TollFree"
  | "Voicemail"
  | "Other";

export type TrestleContactGrade = "A" | "B" | "C" | "D" | "F";

export interface TrestleRealContactRequest {
  /** Required: Full name of the person */
  name: string;
  /** Required: Phone number to validate */
  phone: string;
  /** Optional: Email address to validate */
  email?: string;
  /** Optional: Business name */
  businessName?: string;
  /** Optional: IP address */
  ipAddress?: string;
  /** Optional: Address fields */
  address?: {
    street_line_1?: string;
    city?: string;
    state_code?: string;
    postal_code?: string;
    country_code?: string;
  };
  /** Optional: Add-ons to enable */
  addOns?: TrestleAddOn[];
}

export interface TrestlePhoneResult {
  isValid: boolean | null;
  activityScore: number | null;
  lineType: TrestleLineType | null;
  nameMatch: boolean | null;
  contactGrade: TrestleContactGrade | null;
}

export interface TrestleEmailResult {
  isValid: boolean | null;
  nameMatch: boolean | null;
  contactGrade: TrestleContactGrade | null;
}

export interface TrestleAddressResult {
  isValid: boolean | null;
  nameMatch: boolean | null;
}

export interface TrestleLitigatorChecks {
  phoneIsLitigatorRisk: boolean | null;
}

export interface TrestleEmailChecks {
  isDeliverable: boolean | null;
  ageScore: number | null;
}

export interface TrestleRealContactResponse {
  phone: TrestlePhoneResult;
  email: TrestleEmailResult | null;
  address: TrestleAddressResult | null;
  addOns: {
    litigatorChecks: TrestleLitigatorChecks | null;
    emailChecks: TrestleEmailChecks | null;
  } | null;
  warnings: string[];
  error: { name: string; message: string } | null;
  raw: Record<string, unknown>;
}

// Raw API response type (dot-notation keys)
interface TrestleRawResponse {
  "phone.is_valid"?: boolean | null;
  "phone.activity_score"?: number | null;
  "phone.line_type"?: string | null;
  "phone.name_match"?: boolean | null;
  "phone.contact_grade"?: string | null;
  "email.is_valid"?: boolean | null;
  "email.name_match"?: boolean | null;
  "email.contact_grade"?: string | null;
  "address.is_valid"?: boolean | null;
  "address.name_match"?: boolean | null;
  add_ons?: {
    litigator_checks?: {
      "phone.is_litigator_risk"?: boolean | null;
    };
    email_checks?: {
      "email.is_deliverable"?: boolean | null;
      "email.age_score"?: number | null;
    };
  } | null;
  warnings?: string[];
  error?: { name: string; message: string } | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class TrestleClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TRESTLE_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "[Trestle] No API key - set TRESTLE_API_KEY in environment variables"
      );
    }
  }

  /**
   * Make a request to the Trestle API
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${TRESTLE_BASE_URL}${endpoint}`);

    // Add query params
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trestle API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Validate a contact using Real Contact API
   *
   * @param request - Contact information to validate
   * @returns Validation results with phone/email/address grades and scores
   */
  async realContact(
    request: TrestleRealContactRequest
  ): Promise<TrestleRealContactResponse> {
    // Build query params
    const params: Record<string, string> = {
      name: request.name,
      phone: request.phone.replace(/\D/g, ""), // Strip non-digits
    };

    if (request.email) {
      params.email = request.email;
    }

    if (request.businessName) {
      params["business.name"] = request.businessName;
    }

    if (request.ipAddress) {
      params.ip_address = request.ipAddress;
    }

    // Address fields
    if (request.address) {
      if (request.address.street_line_1) {
        params["address.street_line_1"] = request.address.street_line_1;
      }
      if (request.address.city) {
        params["address.city"] = request.address.city;
      }
      if (request.address.state_code) {
        params["address.state_code"] = request.address.state_code;
      }
      if (request.address.postal_code) {
        params["address.postal_code"] = request.address.postal_code;
      }
      if (request.address.country_code) {
        params["address.country_code"] = request.address.country_code;
      }
    }

    // Add-ons
    if (request.addOns && request.addOns.length > 0) {
      params.add_ons = request.addOns.join(",");
    }

    // Make request
    const raw = await this.request<TrestleRawResponse>("/1.1/real_contact", params);

    // Transform response from dot-notation to structured object
    return this.transformResponse(raw);
  }

  /**
   * Transform Trestle's dot-notation response to a structured object
   */
  private transformResponse(raw: TrestleRawResponse): TrestleRealContactResponse {
    const phone: TrestlePhoneResult = {
      isValid: raw["phone.is_valid"] ?? null,
      activityScore: raw["phone.activity_score"] ?? null,
      lineType: (raw["phone.line_type"] as TrestleLineType) ?? null,
      nameMatch: raw["phone.name_match"] ?? null,
      contactGrade: (raw["phone.contact_grade"] as TrestleContactGrade) ?? null,
    };

    const email: TrestleEmailResult | null =
      raw["email.is_valid"] !== undefined
        ? {
            isValid: raw["email.is_valid"] ?? null,
            nameMatch: raw["email.name_match"] ?? null,
            contactGrade: (raw["email.contact_grade"] as TrestleContactGrade) ?? null,
          }
        : null;

    const address: TrestleAddressResult | null =
      raw["address.is_valid"] !== undefined
        ? {
            isValid: raw["address.is_valid"] ?? null,
            nameMatch: raw["address.name_match"] ?? null,
          }
        : null;

    let addOns: TrestleRealContactResponse["addOns"] = null;
    if (raw.add_ons) {
      addOns = {
        litigatorChecks: raw.add_ons.litigator_checks
          ? {
              phoneIsLitigatorRisk:
                raw.add_ons.litigator_checks["phone.is_litigator_risk"] ?? null,
            }
          : null,
        emailChecks: raw.add_ons.email_checks
          ? {
              isDeliverable: raw.add_ons.email_checks["email.is_deliverable"] ?? null,
              ageScore: raw.add_ons.email_checks["email.age_score"] ?? null,
            }
          : null,
      };
    }

    return {
      phone,
      email,
      address,
      addOns,
      warnings: raw.warnings || [],
      error: raw.error || null,
      raw: raw as unknown as Record<string, unknown>,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let trestleClient: TrestleClient | null = null;

export function getTrestleClient(): TrestleClient {
  if (!trestleClient) {
    trestleClient = new TrestleClient();
  }
  return trestleClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine if a phone number passes contactability threshold
 *
 * @param response - Trestle validation response
 * @param minActivityScore - Minimum activity score (default 70)
 * @param passingGrades - Acceptable contact grades (default A, B, C)
 */
export function isPhoneContactable(
  response: TrestleRealContactResponse,
  minActivityScore = 70,
  passingGrades: TrestleContactGrade[] = ["A", "B", "C"]
): boolean {
  const { phone } = response;

  // Must be valid
  if (!phone.isValid) return false;

  // Check activity score threshold
  if (phone.activityScore !== null && phone.activityScore < minActivityScore) {
    return false;
  }

  // Check contact grade
  if (phone.contactGrade && !passingGrades.includes(phone.contactGrade)) {
    return false;
  }

  return true;
}

/**
 * Determine if an email passes contactability threshold
 */
export function isEmailContactable(
  response: TrestleRealContactResponse,
  passingGrades: TrestleContactGrade[] = ["A", "B", "C"]
): boolean {
  const { email, addOns } = response;

  // No email data
  if (!email) return false;

  // Must be valid
  if (!email.isValid) return false;

  // Check contact grade
  if (email.contactGrade && !passingGrades.includes(email.contactGrade)) {
    return false;
  }

  // Check deliverability if available
  if (addOns?.emailChecks?.isDeliverable === false) {
    return false;
  }

  return true;
}

/**
 * Check if phone has litigator risk
 */
export function hasLitigatorRisk(response: TrestleRealContactResponse): boolean {
  return response.addOns?.litigatorChecks?.phoneIsLitigatorRisk === true;
}

/**
 * Get activity score description
 */
export function getActivityScoreDescription(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 70) return "High activity - connected and active";
  if (score >= 50) return "Moderate activity - uncertain status";
  if (score >= 30) return "Low activity - may be inactive";
  return "Very low activity - likely disconnected";
}

/**
 * Map Trestle line type to internal phone type
 */
export function mapLineType(
  lineType: TrestleLineType | null
): "Mobile" | "Landline" | "Unknown" {
  if (!lineType) return "Unknown";

  switch (lineType) {
    case "Mobile":
      return "Mobile";
    case "Landline":
      return "Landline";
    case "FixedVOIP":
    case "NonFixedVOIP":
      return "Landline"; // Treat VoIP as landline for SMS purposes
    default:
      return "Unknown";
  }
}

/**
 * Calculate overall contactability score (0-100) from Trestle results
 */
export function calculateContactabilityScore(
  response: TrestleRealContactResponse
): number {
  let score = 0;
  let factors = 0;

  // Phone factors (weighted heavily)
  if (response.phone.isValid) {
    score += 20;
    factors++;
  }

  if (response.phone.activityScore !== null) {
    score += response.phone.activityScore * 0.3; // 0-30 points
    factors++;
  }

  if (response.phone.contactGrade) {
    const gradeScores: Record<TrestleContactGrade, number> = {
      A: 20,
      B: 15,
      C: 10,
      D: 5,
      F: 0,
    };
    score += gradeScores[response.phone.contactGrade];
    factors++;
  }

  if (response.phone.nameMatch) {
    score += 10;
    factors++;
  }

  // Email factors
  if (response.email?.isValid) {
    score += 10;
    factors++;
  }

  if (response.email?.contactGrade) {
    const gradeScores: Record<TrestleContactGrade, number> = {
      A: 10,
      B: 7,
      C: 5,
      D: 2,
      F: 0,
    };
    score += gradeScores[response.email.contactGrade];
    factors++;
  }

  // Penalties
  if (response.addOns?.litigatorChecks?.phoneIsLitigatorRisk) {
    score -= 20; // Major penalty for litigator risk
  }

  // Normalize to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHONE FEEDBACK API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phone status for feedback
 */
export type TrestlePhoneStatus = "Connected" | "Disconnected";

/**
 * Phone feedback request for Trestle Phone Feedback API
 */
export interface TrestlePhoneFeedbackRequest {
  /** Response ID from Real Contact API call */
  responseId: string;
  /** Phone number that was contacted */
  phone: string;
  /** Whether the call connected */
  phoneStatus: TrestlePhoneStatus;
  /** Whether the right party was reached */
  phoneRightPartyContact: boolean;
}

/**
 * Phone feedback response from Trestle
 */
export interface TrestlePhoneFeedbackResponse {
  success: boolean;
  error?: { name: string; message: string };
}

/**
 * Send phone feedback to Trestle to improve their model
 *
 * This closes the loop between Real Contact predictions and actual outcomes.
 * Trestle uses this feedback to improve activity_score and contact_grade accuracy.
 *
 * @param request - Feedback data including response_id, phone, status, right_party
 * @returns Success/failure response
 *
 * @example
 * // After a successful call
 * await sendPhoneFeedback({
 *   responseId: "resp_123",
 *   phone: "4259853735",
 *   phoneStatus: "Connected",
 *   phoneRightPartyContact: true,
 * });
 *
 * // After a failed call (disconnected number)
 * await sendPhoneFeedback({
 *   responseId: "resp_456",
 *   phone: "5551234567",
 *   phoneStatus: "Disconnected",
 *   phoneRightPartyContact: false,
 * });
 */
export async function sendPhoneFeedback(
  request: TrestlePhoneFeedbackRequest
): Promise<TrestlePhoneFeedbackResponse> {
  const apiKey = process.env.TRESTLE_API_KEY || "";

  if (!apiKey) {
    console.warn("[Trestle] No API key - cannot send phone feedback");
    return { success: false, error: { name: "ConfigError", message: "Missing API key" } };
  }

  try {
    const response = await fetch(`${TRESTLE_BASE_URL}/1.0/phone_feedback`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        response_id: request.responseId,
        phone: request.phone.replace(/\D/g, ""),
        phone_status: request.phoneStatus,
        phone_right_party_contact: request.phoneRightPartyContact,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Trestle] Phone feedback error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: {
          name: "ApiError",
          message: `HTTP ${response.status}: ${errorText}`,
        },
      };
    }

    console.log(
      `[Trestle] Phone feedback sent: phone=${request.phone}, status=${request.phoneStatus}, rightParty=${request.phoneRightPartyContact}`
    );

    return { success: true };
  } catch (error) {
    console.error("[Trestle] Phone feedback error:", error);
    return {
      success: false,
      error: {
        name: "NetworkError",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Batch send phone feedback for multiple calls
 *
 * @param feedbacks - Array of feedback requests
 * @returns Results for each feedback
 */
export async function sendBatchPhoneFeedback(
  feedbacks: TrestlePhoneFeedbackRequest[]
): Promise<TrestlePhoneFeedbackResponse[]> {
  const results: TrestlePhoneFeedbackResponse[] = [];

  for (const feedback of feedbacks) {
    const result = await sendPhoneFeedback(feedback);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[Trestle] Batch phone feedback complete: ${successCount}/${feedbacks.length} successful`
  );

  return results;
}

console.log("[Trestle] Real Contact API client loaded");
