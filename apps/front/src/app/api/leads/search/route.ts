import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";

/**
 * LEAD SEARCH API
 *
 * Search leads by name, phone, or email for appointment scheduling.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ leads: [] });
    }

    const searchPattern = `%${query}%`;

    const results = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        email: leads.email,
        companyName: leads.companyName,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          or(
            ilike(leads.firstName, searchPattern),
            ilike(leads.lastName, searchPattern),
            ilike(leads.phone, searchPattern),
            ilike(leads.email, searchPattern),
            ilike(leads.companyName, searchPattern),
          ),
        ),
      )
      .limit(limit);

    return NextResponse.json({
      success: true,
      leads: results,
      count: results.length,
    });
  } catch (error) {
    console.error("[LeadSearch] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to search leads",
      },
      { status: 500 },
    );
  }
}
