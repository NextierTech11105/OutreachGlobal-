/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRESTLE REAL CONTACT API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates phone/email contactability via Trestle Real Contact API.
 * This is the CONTACTABILITY ENGINE - the second gate in the enrichment pipeline.
 *
 * PIPELINE FLOW:
 * 1. Tracerfy Skip Trace ($0.02) → Data Engine (phones, emails)
 * 2. Trestle Real Contact ($0.03) → Contactability Engine (grades, scores) ← THIS
 * 3. Lead Registration → Lead ID + Campaign ID assignment
 *
 * Only leads passing BOTH gates are registered for campaigns.
 *
 * COST: $0.03/query
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTrestleClient,
  isPhoneContactable,
  isEmailContactable,
  hasLitigatorRisk,
  calculateContactabilityScore,
  type TrestleRealContactRequest,
  type TrestleAddOn,
} from "@/lib/trestle";
import {
  TRESTLE_GOOD_ACTIVITY_SCORE,
  TRESTLE_PASSING_GRADES,
  TRESTLE_DEFAULT_ADDONS,
} from "@/config/constants";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationRequest {
  /** Full name (required) */
  name: string;
  /** Phone number (required) */
  phone: string;
  /** Email address (optional) */
  email?: string;
  /** Business name (optional) */
  businessName?: string;
  /** Address for address validation (optional) */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  /** Add-ons to enable (defaults to litigator_checks + email_checks_deliverability) */
  addOns?: TrestleAddOn[];
}

interface ValidationResponse {
  success: boolean;
  /** Whether the contact passed all contactability checks */
  isContactable: boolean;
  /** Overall contactability score (0-100) */
  contactabilityScore: number;
  /** Phone validation results */
  phone: {
    isValid: boolean;
    activityScore: number | null;
    lineType: string | null;
    contactGrade: string | null;
    nameMatch: boolean | null;
    isContactable: boolean;
  };
  /** Email validation results (if email provided) */
  email?: {
    isValid: boolean;
    contactGrade: string | null;
    nameMatch: boolean | null;
    isDeliverable: boolean | null;
    isContactable: boolean;
  };
  /** Address validation results (if address provided) */
  address?: {
    isValid: boolean;
    nameMatch: boolean | null;
  };
  /** Risk flags */
  risks: {
    isLitigatorRisk: boolean;
    hasLowActivityScore: boolean;
    hasFailingGrade: boolean;
  };
  /** Warnings from Trestle API */
  warnings: string[];
  /** Error if any */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Validate a contact
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name and phone are required",
        },
        { status: 400 }
      );
    }

    // Build Trestle request
    const trestleRequest: TrestleRealContactRequest = {
      name: body.name,
      phone: body.phone,
      email: body.email,
      businessName: body.businessName,
      addOns: body.addOns || [...TRESTLE_DEFAULT_ADDONS] as TrestleAddOn[],
    };

    // Add address if provided
    if (body.address) {
      trestleRequest.address = {
        street_line_1: body.address.street,
        city: body.address.city,
        state_code: body.address.state,
        postal_code: body.address.zip,
        country_code: "US",
      };
    }

    // Call Trestle API
    const client = getTrestleClient();
    const result = await client.realContact(trestleRequest);

    // Check for API error
    if (result.error) {
      console.error("[Trestle] API Error:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: `Trestle API error: ${result.error.message}`,
        },
        { status: 500 }
      );
    }

    // Evaluate contactability
    const phoneContactable = isPhoneContactable(
      result,
      TRESTLE_GOOD_ACTIVITY_SCORE,
      [...TRESTLE_PASSING_GRADES]
    );
    const emailContactable = body.email
      ? isEmailContactable(result, [...TRESTLE_PASSING_GRADES])
      : false;
    const litigatorRisk = hasLitigatorRisk(result);
    const contactabilityScore = calculateContactabilityScore(result);

    // Risk flags
    const hasLowActivityScore =
      result.phone.activityScore !== null &&
      result.phone.activityScore < TRESTLE_GOOD_ACTIVITY_SCORE;
    const hasFailingGrade =
      result.phone.contactGrade !== null &&
      !TRESTLE_PASSING_GRADES.includes(
        result.phone.contactGrade as (typeof TRESTLE_PASSING_GRADES)[number]
      );

    // Overall contactability = phone passes AND no litigator risk
    const isContactable = phoneContactable && !litigatorRisk;

    // Build response
    const response: ValidationResponse = {
      success: true,
      isContactable,
      contactabilityScore,
      phone: {
        isValid: result.phone.isValid ?? false,
        activityScore: result.phone.activityScore,
        lineType: result.phone.lineType,
        contactGrade: result.phone.contactGrade,
        nameMatch: result.phone.nameMatch,
        isContactable: phoneContactable,
      },
      risks: {
        isLitigatorRisk: litigatorRisk,
        hasLowActivityScore,
        hasFailingGrade,
      },
      warnings: result.warnings,
    };

    // Add email results if email was provided
    if (body.email && result.email) {
      response.email = {
        isValid: result.email.isValid ?? false,
        contactGrade: result.email.contactGrade,
        nameMatch: result.email.nameMatch,
        isDeliverable: result.addOns?.emailChecks?.isDeliverable ?? null,
        isContactable: emailContactable,
      };
    }

    // Add address results if address was provided
    if (body.address && result.address) {
      response.address = {
        isValid: result.address.isValid ?? false,
        nameMatch: result.address.nameMatch,
      };
    }

    console.log(
      `[Trestle] Validated ${body.phone}: contactable=${isContactable}, score=${contactabilityScore}, grade=${result.phone.contactGrade}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Trestle] Validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to validate contact",
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Health check / info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    service: "Trestle Real Contact API",
    status: "active",
    cost: "$0.03/query",
    description: "Phone/email contactability validation",
    requiredFields: ["name", "phone"],
    optionalFields: ["email", "businessName", "address"],
    availableAddOns: [
      "litigator_checks",
      "email_checks_deliverability",
      "email_checks_age",
    ],
    thresholds: {
      minActivityScore: TRESTLE_GOOD_ACTIVITY_SCORE,
      passingGrades: TRESTLE_PASSING_GRADES,
    },
  });
}
