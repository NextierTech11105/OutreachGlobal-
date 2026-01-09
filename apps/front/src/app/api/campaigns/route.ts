import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");

  // Only select columns that exist in production database
  const selectFields = {
    id: campaigns.id,
    teamId: campaigns.teamId,
    sdrId: campaigns.sdrId,
    name: campaigns.name,
    description: campaigns.description,
    targetMethod: campaigns.targetMethod,
    minScore: campaigns.minScore,
    maxScore: campaigns.maxScore,
    location: campaigns.location,
    status: campaigns.status,
    estimatedLeadsCount: campaigns.estimatedLeadsCount,
    startsAt: campaigns.startsAt,
    endsAt: campaigns.endsAt,
    pausedAt: campaigns.pausedAt,
    resumedAt: campaigns.resumedAt,
    metadata: campaigns.metadata,
    createdAt: campaigns.createdAt,
    updatedAt: campaigns.updatedAt,
  };

  try {
    if (teamId) {
      const data = await db
        .select(selectFields)
        .from(campaigns)
        .where(eq(campaigns.teamId, teamId))
        .orderBy(desc(campaigns.createdAt));
      return NextResponse.json({ data, count: data.length });
    }

    const data = await db
      .select(selectFields)
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to get campaigns", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId,
      name,
      description,
      targetMethod,
      minScore,
      maxScore,
      location,
      status,
      startsAt,
      endsAt,
      // SMS Campaign fields
      category,
      persona,
      template,
      message,
      audienceDescription,
      recipientCount,
      // === Campaign Type & ML Tracking ===
      campaignType, // 'initial' | 'nudger' | 'nurture'
      attemptNumber,
      totalAttemptsSinceInception,
      lastAttemptedAt,
      mlLabels,
    } = body;

    if (!teamId || !name) {
      return NextResponse.json(
        { error: "teamId and name are required" },
        { status: 400 },
      );
    }

    // Validate SMS message length (must be ≤160 chars)
    if (message && message.length > 160) {
      return NextResponse.json(
        { error: "SMS message must be 160 characters or less" },
        { status: 400 },
      );
    }

    const id = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    // Build ML labels with full timestamp tracking
    const mlLabelData = mlLabels || {
      campaignType: campaignType || "initial",
      attemptSequence: attemptNumber || 1,
      createdAtUtc: now.toISOString(),
      scheduledAtUtc: startsAt || null,
      audienceContext: audienceDescription || "",
      personaId: persona || "",
      category: category || "",
      template: template || "",
    };

    // Only insert columns that exist in production database
    // Store campaign type and ML data in metadata field
    const metadata = {
      campaignType: campaignType || "initial",
      attemptNumber: attemptNumber || 1,
      totalAttempts: totalAttemptsSinceInception || 1,
      mlLabels: mlLabelData,
      category,
      persona,
      template,
      message,
    };

    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        id,
        teamId,
        name,
        description: description || audienceDescription || null,
        targetMethod: targetMethod || "SCORE_BASED",
        minScore: minScore ?? 0,
        maxScore: maxScore ?? 100,
        location: location || null,
        status: status || "SCHEDULED",
        startsAt: startsAt ? new Date(startsAt) : now,
        endsAt: endsAt ? new Date(endsAt) : null,
        metadata,
        createdAt: now,
        updatedAt: now,
        estimatedLeadsCount: recipientCount || 0,
      })
      .returning();

    console.log(
      `[Campaigns API] Created ${campaignType || "initial"} campaign: ${name} (${id}) with ${recipientCount || 0} recipients`,
    );
    console.log(
      `[Campaigns API] Campaign Type: ${campaignType || "initial"}, Attempt #${attemptNumber || 1}`,
    );
    console.log(
      `[Campaigns API] Category: ${category}, Persona: ${persona}, Template: ${template}`,
    );
    console.log(
      `[Campaigns API] Message (${message?.length || 0} chars): ${message?.substring(0, 50)}...`,
    );
    console.log(`[Campaigns API] ML Labels:`, JSON.stringify(mlLabelData));

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign", details: String(error) },
      { status: 500 },
    );
  }
}
