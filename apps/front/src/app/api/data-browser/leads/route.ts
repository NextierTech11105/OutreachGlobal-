import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const leadsData = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        address: leads.address,
        city: leads.city,
        state: leads.state,
        zipCode: leads.zipCode,
        status: leads.pipelineStatus,
        score: leads.score,
        source: leads.source,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.teamId, teamId))
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.teamId, teamId));

    const totalCount = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      leads: leadsData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("[Data Browser API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
