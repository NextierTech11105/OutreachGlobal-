import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");

  try {
    if (teamId) {
      const data = await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.teamId, teamId))
        .orderBy(desc(messageTemplates.createdAt));
      return NextResponse.json({ data, count: data.length });
    }

    const data = await db
      .select()
      .from(messageTemplates)
      .orderBy(desc(messageTemplates.createdAt));
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("Get message templates error:", error);
    return NextResponse.json(
      { error: "Failed to get message templates", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, name, content, type, category } = body;

    if (!teamId || !name || !content) {
      return NextResponse.json(
        { error: "teamId, name, and content are required" },
        { status: 400 },
      );
    }

    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const [newTemplate] = await db
      .insert(messageTemplates)
      .values({
        id,
        teamId,
        name,
        content,
        type: type || "sms",
        category: category || "general",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error("Create message template error:", error);
    return NextResponse.json(
      { error: "Failed to create message template", details: String(error) },
      { status: 500 },
    );
  }
}
