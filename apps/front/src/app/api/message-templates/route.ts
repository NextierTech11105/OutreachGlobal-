import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageTemplates } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET - Fetch all templates (optionally filtered by teamId)
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

// POST - Create a new template
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

    // Store template data in the jsonb `data` field
    const templateData = {
      content,
      category: category || "general",
      timesUsed: 0,
      responseRate: 0,
      isActive: true,
    };

    const [newTemplate] = await db
      .insert(messageTemplates)
      .values({
        id,
        teamId,
        name,
        type: type || "sms",
        data: templateData,
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

// PUT - Update a template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, content, category, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Template id is required" },
        { status: 400 },
      );
    }

    // Get existing template to preserve data
    const [existing] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const existingData = (existing.data as Record<string, unknown>) || {};
    const updatedData = {
      ...existingData,
      content: content ?? existingData.content,
      category: category ?? existingData.category,
      isActive: isActive ?? existingData.isActive,
    };

    const [updated] = await db
      .update(messageTemplates)
      .set({
        name: name ?? existing.name,
        data: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(messageTemplates.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update message template error:", error);
    return NextResponse.json(
      { error: "Failed to update message template", details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE - Remove a template
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Template id is required" },
        { status: 400 },
      );
    }

    await db
      .delete(messageTemplates)
      .where(eq(messageTemplates.id, id));

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Delete message template error:", error);
    return NextResponse.json(
      { error: "Failed to delete message template", details: String(error) },
      { status: 500 },
    );
  }
}
