import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templateLibrary } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/t/[team]/template-library - List templates for team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> }
) {
  try {
    const { team: teamId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const stage = searchParams.get("stage");
    const agent = searchParams.get("agent");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(templateLibrary.teamId, teamId)];

    if (category) {
      conditions.push(eq(templateLibrary.category, category));
    }
    if (stage) {
      conditions.push(eq(templateLibrary.stage, stage));
    }
    if (agent) {
      conditions.push(eq(templateLibrary.agent, agent));
    }

    const templates = await db
      .select()
      .from(templateLibrary)
      .where(and(...conditions))
      .orderBy(desc(templateLibrary.createdAt));

    // Group by category for easier UI consumption
    const grouped = templates.reduce((acc, template) => {
      const cat = template.category || "uncategorized";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    return NextResponse.json({
      success: true,
      data: templates,
      grouped,
      count: templates.length,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Failed to get templates", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/t/[team]/template-library - Create template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> }
) {
  try {
    const { team: teamId } = await params;
    const body = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const { name, content, category, stage, agent, mergeFields, status } = body;

    if (!name || !content || !category) {
      return NextResponse.json(
        { error: "name, content, and category are required" },
        { status: 400 }
      );
    }

    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const [newTemplate] = await db
      .insert(templateLibrary)
      .values({
        id,
        teamId,
        name,
        content,
        category,
        stage: stage || null,
        agent: agent || null,
        mergeFields: mergeFields || [],
        status: status || "active",
        sendCount: 0,
        responseCount: 0,
        conversionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newTemplate },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Failed to create template", details: String(error) },
      { status: 500 }
    );
  }
}
