/**
 * Trestle API Client for LUCI Phone Verification
 *
 * Integrates with:
 * - Phone Validation API (phone_intel)
 * - Real Contact API (real_contact)
 *
 * Provides:
 * - Phone validity check
 * - Activity scoring (0-100)
 * - Line type detection (Mobile, Landline, VOIP)
 * - Carrier identification
 * - Litigator risk check (add-on)
 */

const TRESTLE_BASE_URL = "https://api.trestleiq.com/3.0";
const TRESTLE_API_KEY = process.env.TRESTLE_API_KEY;

// =============================================================================
// TYPES
// =============================================================================

export interface TrestlePhoneIntelRequest {
  phone: string;
  countryHint?: string;
  addOns?: ("litigator_checks")[];
}

export interface TrestlePhoneIntelResponse {
  id: string | null;
  phone_number: string | null;
  is_valid: boolean | null;
  activity_score: number | null;
  country_calling_code: string | null;
  country_code: string | null;
  country_name: string | null;
  line_type: TrestleLineType | null;
  carrier: string | null;
  is_prepaid: boolean | null;
  add_ons?: {
    litigator_checks?: {
      "phone.is_litigator_risk": boolean;
    };
  };
  error?: {
    name: string;
    message: string;
  };
  warnings?: string[];
}

export type TrestleLineType =
  | "Landline"
  | "Mobile"
  | "FixedVOIP"
  | "NonFixedVOIP"
  | "Premium"
  | "TollFree"
  | "Voicemail"
  | "Other";

export interface TrestleRealContactRequest {
  phone?: string;
  email?: string;
  name?: string;
  address?: string;
  addOns?: ("litigator_checks" | "email_checks")[];
}

export interface TrestleRealContactResponse {
  "phone.is_valid"?: boolean;
  "phone.activity_score"?: number;
  "phone.line_type"?: TrestleLineType;
  "phone.name_match"?: boolean;
  "phone.contact_grade"?: "A" | "B" | "C" | "D" | "F";
  "email.is_valid"?: boolean;
  "email.name_match"?: boolean;
  "email.contact_grade"?: "A" | "B" | "C" | "D" | "F";
  "address.is_valid"?: boolean;
  "address.name_match"?: boolean;
  add_ons?: {
    litigator_checks?: {
      "phone.is_litigator_risk": boolean;
    };
    email_checks?: {
      "email.is_deliverable": boolean;
      "email.age_score": number;
    };
  };
  error?: {
    name: string;
    message: string;
  };
  warnings?: string[];
}

// =============================================================================
// LUCI VERIFICATION RESULT
// =============================================================================

export interface LuciVerificationResult {
  success: boolean;
  phone: string;
  is_valid: boolean;
  activity_score: number;
  line_type: "mobile" | "landline" | "voip" | "unknown";
  carrier: string | null;
  is_prepaid: boolean;
  is_litigator_risk: boolean;
  contact_grade: "A" | "B" | "C" | "D" | "F" | null;
  name_match: boolean | null;
  contactability_score: number; // LUCI's own scoring (0-100)
  recommendation: "APPROVE" | "REVIEW" | "REJECT";
  reject_reason?: string;
  raw_response?: TrestlePhoneIntelResponse | TrestleRealContactResponse;
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Verify a phone number using Trestle Phone Intel API
 * Cost: ~$0.03 per lookup
 */
export async function verifyPhone(
  phone: string,
  options?: { checkLitigator?: boolean }
): Promise<LuciVerificationResult> {
  if (!TRESTLE_API_KEY) {
    console.warn("[LUCI/Trestle] API key not configured");
    return createDefaultResult(phone, "API key not configured");
  }

  try {
    // Build URL with query params
    const url = new URL(`${TRESTLE_BASE_URL}/phone_intel`);
    url.searchParams.set("phone", normalizePhone(phone));

    if (options?.checkLitigator) {
      url.searchParams.set("add_ons", "litigator_checks");
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": TRESTLE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return createDefaultResult(phone, "Invalid API key");
      }
      if (response.status === 429) {
        return createDefaultResult(phone, "Rate limit exceeded");
      }
      return createDefaultResult(phone, `API error: ${response.status}`);
    }

    const data: TrestlePhoneIntelResponse = await response.json();
    return processPhoneIntelResponse(phone, data);
  } catch (error) {
    console.error("[LUCI/Trestle] Phone verification error:", error);
    return createDefaultResult(
      phone,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Verify contact using Trestle Real Contact API
 * More comprehensive - includes phone, email, address, name matching
 * Cost: ~$0.09 per lookup (avg 3 phones)
 */
export async function verifyContact(
  contact: {
    phone?: string;
    email?: string;
    name?: string;
    address?: string;
  },
  options?: { checkLitigator?: boolean; checkEmail?: boolean }
): Promise<LuciVerificationResult> {
  if (!TRESTLE_API_KEY) {
    console.warn("[LUCI/Trestle] API key not configured");
    return createDefaultResult(contact.phone || "", "API key not configured");
  }

  try {
    const url = new URL(`${TRESTLE_BASE_URL}/real_contact`);

    if (contact.phone) {
      url.searchParams.set("phone", normalizePhone(contact.phone));
    }
    if (contact.email) {
      url.searchParams.set("email", contact.email);
    }
    if (contact.name) {
      url.searchParams.set("name", contact.name);
    }
    if (contact.address) {
      url.searchParams.set("address", contact.address);
    }

    const addOns: string[] = [];
    if (options?.checkLitigator) addOns.push("litigator_checks");
    if (options?.checkEmail) addOns.push("email_checks");
    if (addOns.length > 0) {
      url.searchParams.set("add_ons", addOns.join(","));
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": TRESTLE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return createDefaultResult(
        contact.phone || "",
        `API error: ${response.status}`
      );
    }

    const data: TrestleRealContactResponse = await response.json();
    return processRealContactResponse(contact.phone || "", data);
  } catch (error) {
    console.error("[LUCI/Trestle] Contact verification error:", error);
    return createDefaultResult(
      contact.phone || "",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizePhone(phone: string): string {
  // Remove all non-digits
  return phone.replace(/\D/g, "");
}

function mapLineType(
  trestleType: TrestleLineType | null
): "mobile" | "landline" | "voip" | "unknown" {
  if (!trestleType) return "unknown";

  switch (trestleType) {
    case "Mobile":
      return "mobile";
    case "Landline":
      return "landline";
    case "FixedVOIP":
    case "NonFixedVOIP":
      return "voip";
    default:
      return "unknown";
  }
}

function calculateContactabilityScore(
  activityScore: number | null,
  lineType: "mobile" | "landline" | "voip" | "unknown",
  isValid: boolean,
  isPrepaid: boolean,
  isLitigator: boolean
): number {
  if (!isValid) return 0;
  if (isLitigator) return 0; // Hard reject litigators

  let score = activityScore || 50;

  // Line type bonuses/penalties (aligned with LUCI_THRESHOLDS)
  if (lineType === "mobile") {
    score += 20;
  } else if (lineType === "landline") {
    score -= 10;
  } else if (lineType === "voip") {
    score -= 15; // NonFixedVOIP is risky
  }

  // Prepaid slight penalty (less stable)
  if (isPrepaid) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function determineRecommendation(
  contactabilityScore: number,
  activityScore: number | null,
  isValid: boolean,
  isLitigator: boolean,
  lineType: "mobile" | "landline" | "voip" | "unknown"
): { recommendation: "APPROVE" | "REVIEW" | "REJECT"; reason?: string } {
  // Hard rejects
  if (!isValid) {
    return { recommendation: "REJECT", reason: "Invalid phone number" };
  }
  if (isLitigator) {
    return { recommendation: "REJECT", reason: "Known TCPA litigator" };
  }
  // RULE: Activity score < 50 = NO SMS (user requirement)
  if (activityScore !== null && activityScore < 50) {
    return { recommendation: "REJECT", reason: "Activity score below 50 - NO SMS" };
  }
  if (lineType === "voip") {
    return { recommendation: "REVIEW", reason: "VOIP number - higher risk" };
  }

  // Approval thresholds
  if (contactabilityScore >= 70 && lineType === "mobile") {
    return { recommendation: "APPROVE" };
  }
  if (contactabilityScore >= 60) {
    return { recommendation: "APPROVE" };
  }

  // Middle ground
  return { recommendation: "REVIEW", reason: `Moderate score: ${contactabilityScore}` };
}

function processPhoneIntelResponse(
  phone: string,
  data: TrestlePhoneIntelResponse
): LuciVerificationResult {
  const isValid = data.is_valid ?? false;
  const activityScore = data.activity_score;
  const lineType = mapLineType(data.line_type);
  const isPrepaid = data.is_prepaid ?? false;
  const isLitigator = data.add_ons?.litigator_checks?.["phone.is_litigator_risk"] ?? false;

  const contactabilityScore = calculateContactabilityScore(
    activityScore,
    lineType,
    isValid,
    isPrepaid,
    isLitigator
  );

  const { recommendation, reason } = determineRecommendation(
    contactabilityScore,
    activityScore,
    isValid,
    isLitigator,
    lineType
  );

  return {
    success: true,
    phone,
    is_valid: isValid,
    activity_score: activityScore ?? 0,
    line_type: lineType,
    carrier: data.carrier,
    is_prepaid: isPrepaid,
    is_litigator_risk: isLitigator,
    contact_grade: null, // Not available in phone_intel
    name_match: null, // Not available in phone_intel
    contactability_score: contactabilityScore,
    recommendation,
    reject_reason: reason,
    raw_response: data,
  };
}

function processRealContactResponse(
  phone: string,
  data: TrestleRealContactResponse
): LuciVerificationResult {
  const isValid = data["phone.is_valid"] ?? false;
  const activityScore = data["phone.activity_score"] ?? null;
  const lineType = mapLineType(data["phone.line_type"] ?? null);
  const contactGrade = data["phone.contact_grade"] ?? null;
  const nameMatch = data["phone.name_match"] ?? null;
  const isLitigator = data.add_ons?.litigator_checks?.["phone.is_litigator_risk"] ?? false;

  const contactabilityScore = calculateContactabilityScore(
    activityScore,
    lineType,
    isValid,
    false, // isPrepaid not in real_contact
    isLitigator
  );

  const { recommendation, reason } = determineRecommendation(
    contactabilityScore,
    activityScore,
    isValid,
    isLitigator,
    lineType
  );

  return {
    success: true,
    phone,
    is_valid: isValid,
    activity_score: activityScore ?? 0,
    line_type: lineType,
    carrier: null, // Not in real_contact response
    is_prepaid: false,
    is_litigator_risk: isLitigator,
    contact_grade: contactGrade,
    name_match: nameMatch,
    contactability_score: contactabilityScore,
    recommendation,
    reject_reason: reason,
    raw_response: data,
  };
}

function createDefaultResult(
  phone: string,
  errorReason: string
): LuciVerificationResult {
  return {
    success: false,
    phone,
    is_valid: false,
    activity_score: 0,
    line_type: "unknown",
    carrier: null,
    is_prepaid: false,
    is_litigator_risk: false,
    contact_grade: null,
    name_match: null,
    contactability_score: 0,
    recommendation: "REVIEW",
    reject_reason: errorReason,
  };
}

// =============================================================================
// BATCH VERIFICATION
// =============================================================================

/**
 * Batch verify phones with rate limiting
 * Trestle rate limits vary by plan - default conservative 10/sec
 */
export async function batchVerifyPhones(
  phones: string[],
  options?: {
    checkLitigator?: boolean;
    rateLimit?: number; // requests per second
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<Map<string, LuciVerificationResult>> {
  const results = new Map<string, LuciVerificationResult>();
  const rateLimit = options?.rateLimit || 10;
  const delayMs = 1000 / rateLimit;

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];
    const result = await verifyPhone(phone, { checkLitigator: options?.checkLitigator });
    results.set(phone, result);

    if (options?.onProgress) {
      options.onProgress(i + 1, phones.length);
    }

    // Rate limiting delay (except for last item)
    if (i < phones.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const trestleClient = {
  verifyPhone,
  verifyContact,
  batchVerifyPhones,
};

export default trestleClient;
