import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import { requireTenantContext } from "@/lib/api-auth";

// GET - List companies from businesses table
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireTenantContext();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    const query = db
      .select({
        id: businesses.id,
        name: businesses.companyName,
        industry: businesses.sicDescription,
        location: sql<string>`CONCAT(${businesses.city}, ', ', ${businesses.state})`,
        employees: businesses.employeeCount,
        website: businesses.website,
        phone: businesses.phone,
        email: businesses.email,
        ownerName: businesses.ownerName,
        ownerTitle: businesses.ownerTitle,
        status: businesses.status,
        score: businesses.score,
        enrichmentStatus: businesses.enrichmentStatus,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(eq(businesses.userId, userId))
      .orderBy(desc(businesses.score), desc(businesses.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await query;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(eq(businesses.userId, userId));

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      companies: results,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Companies API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch companies",
      },
      { status: 500 },
    );
  }
}
