import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, or, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    // Fetch leads with call_queue status or pipelineStatus
    const callQueueLeads = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        status: leads.status,
        pipelineStatus: leads.pipelineStatus,
        source: leads.source,
        tags: leads.tags,
        metadata: leads.metadata,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        sql`${leads.teamId} = ${teamId} AND (
          ${leads.status} = 'call_queue' OR
          ${leads.pipelineStatus} = 'call_queue' OR
          'call_queue' = ANY(${leads.tags})
        )`
      )
      .orderBy(desc(leads.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      leads: callQueueLeads,
      count: callQueueLeads.length,
    });
  } catch (error) {
    console.error("[Call Queue API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch call queue leads" },
      { status: 500 }
    );
  }
}
