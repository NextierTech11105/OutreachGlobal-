import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");

  try {
    if (teamId) {
      const data = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.teamId, teamId))
        .orderBy(desc(campaigns.createdAt));
      return NextResponse.json({ data, count: data.length });
    }

    const data = await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to get campaigns", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, name, type, status, config } = body;

    if (!teamId || !name) {
      return NextResponse.json(
        { error: "teamId and name are required" },
        { status: 400 }
      );
    }

    const id = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        id,
        teamId,
        name,
        type: type || "sms",
        status: status || "draft",
        config: config || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign", details: String(error) },
      { status: 500 }
    );
  }
}
