import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * GET /api/leads/lookup
 * Lookup a lead by phone number for inbound call context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "phone parameter required" },
        { status: 400 },
      );
    }

    // Normalize phone number (remove non-digits, handle +1 prefix)
    const normalizedPhone = phone.replace(/\D/g, "").replace(/^1/, "");
    const phoneWithPrefix = `+1${normalizedPhone}`;
    const phoneLast10 = normalizedPhone.slice(-10);

    if (!db) {
      return NextResponse.json({
        success: true,
        lead: null,
        classification: null,
        message: "Database not available",
      });
    }

    // Search for lead by phone number (try different formats)
    const leadResult = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        status: leads.status,
        score: leads.score,
        tags: leads.tags,
      })
      .from(leads)
      .where(
        sql`${leads.phone} LIKE ${"%" + phoneLast10} OR ${leads.phone} = ${phoneWithPrefix} OR ${leads.phone} = ${normalizedPhone}`,
      )
      .limit(1);

    const lead = leadResult[0] || null;

    // Determine classification based on lead data
    let classification = null;
    if (lead) {
      if (lead.status === "qualified") {
        classification = "Hot Lead";
      } else if (lead.score && lead.score > 70) {
        classification = "High Priority";
      } else if (lead.tags?.includes("callback-requested")) {
        classification = "Callback";
      } else {
        classification = "Known Contact";
      }
    }

    return NextResponse.json({
      success: true,
      lead,
      classification,
    });
  } catch (error) {
    console.error("[Lead Lookup] Error:", error);
    return NextResponse.json(
      {
        success: false,
        lead: null,
        error: error instanceof Error ? error.message : "Lookup failed",
      },
      { status: 500 },
    );
  }
}
