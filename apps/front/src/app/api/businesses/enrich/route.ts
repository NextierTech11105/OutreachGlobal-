/**
 * Business Enrichment API
 *
 * Takes imported businesses and enriches them with:
 * 1. Apollo People Search - finds decision makers + direct dials
 * 2. Twilio Line Type - verifies mobile vs landline
 * 3. Flags records as sms_ready when they have verified mobile
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { requireTenantContext } from "@/lib/api-auth";

const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY ||
  process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
  process.env.APOLLO_API_KEY ||
  "";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

// Decision maker titles to search for
const DECISION_MAKER_TITLES = [
  "Owner",
  "CEO",
  "President",
  "Founder",
  "Principal",
  "Managing Partner",
  "General Manager",
];

interface ApolloPersonMatch {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  phone_numbers?: Array<{
    sanitized_number?: string;
    raw_number?: string;
    type?: string;
  }>;
  linkedin_url?: string;
  organization?: {
    name?: string;
  };
}

// Search Apollo for decision makers at a company
async function searchApolloForDecisionMaker(
  companyName: string,
  domain?: string | null,
): Promise<ApolloPersonMatch | null> {
  if (!APOLLO_API_KEY) return null;

  try {
    // Use Apollo People Search to find decision makers
    const response = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify({
        organization_names: [companyName],
        person_titles: DECISION_MAKER_TITLES,
        page: 1,
        per_page: 1, // Just get the top match
      }),
    });

    if (!response.ok) {
      console.error(`[Apollo Search] Failed for ${companyName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const people = data.people || [];

    if (people.length === 0) {
      console.log(`[Apollo Search] No decision maker found for ${companyName}`);
      return null;
    }

    return people[0] as ApolloPersonMatch;
  } catch (error) {
    console.error(`[Apollo Search] Error for ${companyName}:`, error);
    return null;
  }
}

// Check line type via Twilio Lookup
async function checkLineType(
  phoneNumber: string,
): Promise<{ type: string; carrier?: string } | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log("[Twilio] Credentials not configured, skipping line type check");
    return null;
  }

  try {
    const formattedNumber = phoneNumber.replace(/\D/g, "");
    const response = await fetch(
      `https://lookups.twilio.com/v2/PhoneNumbers/+1${formattedNumber}?Fields=line_type_intelligence`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        },
      },
    );

    if (!response.ok) {
      console.error(`[Twilio] Lookup failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      type: data.line_type_intelligence?.type || "unknown",
      carrier: data.line_type_intelligence?.carrier_name,
    };
  } catch (error) {
    console.error("[Twilio] Line type check error:", error);
    return null;
  }
}

// POST - Enrich businesses with Apollo + line type check
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireTenantContext();

    const body = await request.json();
    const { limit = 10, businessIds } = body;

    // Get businesses to enrich
    let businessesToEnrich;
    if (businessIds && Array.isArray(businessIds)) {
      // Enrich specific businesses
      businessesToEnrich = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            or(...businessIds.map((id: string) => eq(businesses.id, id))),
          ),
        )
        .limit(limit);
    } else {
      // Enrich pending businesses
      businessesToEnrich = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            eq(businesses.enrichmentStatus, "pending"),
          ),
        )
        .limit(limit);
    }

    if (businessesToEnrich.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No businesses to enrich",
        stats: { total: 0, enriched: 0, smsReady: 0 },
      });
    }

    const results = {
      total: businessesToEnrich.length,
      enriched: 0,
      smsReady: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        id: string;
        company: string;
        status: string;
        decisionMaker?: string;
        phone?: string;
        lineType?: string;
        smsReady?: boolean;
      }>,
    };

    for (const business of businessesToEnrich) {
      try {
        // Search Apollo for decision maker
        const person = await searchApolloForDecisionMaker(
          business.companyName,
          business.website,
        );

        if (!person) {
          results.skipped++;
          results.details.push({
            id: business.id,
            company: business.companyName,
            status: "no_match",
          });

          // Mark as enriched but no data found
          await db
            .update(businesses)
            .set({
              enrichmentStatus: "no_match",
              apolloMatched: false,
              updatedAt: new Date(),
            })
            .where(eq(businesses.id, business.id));

          continue;
        }

        // Extract phone from Apollo result
        const apolloPhone =
          person.phone_numbers?.[0]?.sanitized_number ||
          person.phone_numbers?.[0]?.raw_number;

        let lineType: string | null = null;
        let isMobile = false;

        // Check line type if we got a phone
        if (apolloPhone) {
          const lineTypeResult = await checkLineType(apolloPhone);
          if (lineTypeResult) {
            lineType = lineTypeResult.type;
            isMobile = ["mobile", "cell", "wireless"].includes(
              lineType.toLowerCase(),
            );
          }
        }

        // Update business with enriched data
        await db
          .update(businesses)
          .set({
            // Owner/decision maker info
            ownerName: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
            ownerFirstName: person.first_name,
            ownerLastName: person.last_name,
            ownerTitle: person.title,
            ownerEmail: person.email,
            ownerPhone: apolloPhone,
            // Apollo tracking
            apolloMatched: true,
            apolloOrgId: person.id,
            // Enrichment status
            enrichmentStatus: isMobile ? "sms_ready" : "enriched",
            // Score boost if we found mobile
            score: isMobile ? Math.min((business.score || 0) + 20, 100) : business.score,
            updatedAt: new Date(),
          })
          .where(eq(businesses.id, business.id));

        results.enriched++;
        if (isMobile) results.smsReady++;

        results.details.push({
          id: business.id,
          company: business.companyName,
          status: "enriched",
          decisionMaker: person.name || `${person.first_name} ${person.last_name}`,
          phone: apolloPhone,
          lineType: lineType || undefined,
          smsReady: isMobile,
        });
      } catch (error) {
        console.error(`[Enrich] Error for ${business.companyName}:`, error);
        results.errors++;
        results.details.push({
          id: business.id,
          company: business.companyName,
          status: "error",
        });
      }

      // Rate limit: Apollo has limits, add small delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      message: `Enriched ${results.enriched} of ${results.total} businesses. ${results.smsReady} ready for SMS.`,
      stats: results,
    });
  } catch (error) {
    console.error("[Business Enrich] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Enrichment failed",
      },
      { status: 500 },
    );
  }
}

// GET - Check enrichment status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireTenantContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, enriched, sms_ready, no_match

    const conditions = [eq(businesses.userId, userId)];
    if (status) {
      conditions.push(eq(businesses.enrichmentStatus, status));
    }

    const results = await db
      .select({
        id: businesses.id,
        companyName: businesses.companyName,
        ownerName: businesses.ownerName,
        ownerPhone: businesses.ownerPhone,
        ownerEmail: businesses.ownerEmail,
        ownerTitle: businesses.ownerTitle,
        enrichmentStatus: businesses.enrichmentStatus,
        apolloMatched: businesses.apolloMatched,
        score: businesses.score,
      })
      .from(businesses)
      .where(and(...conditions))
      .limit(100);

    // Count by status
    const statusCounts = {
      pending: 0,
      enriched: 0,
      sms_ready: 0,
      no_match: 0,
    };

    for (const r of results) {
      const s = r.enrichmentStatus as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }

    return NextResponse.json({
      success: true,
      businesses: results,
      counts: statusCounts,
      apolloConfigured: !!APOLLO_API_KEY,
      twilioConfigured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
    });
  } catch (error) {
    console.error("[Business Enrich GET] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 },
    );
  }
}
