import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templateLibrary } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/t/[team]/template-library/[id] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: templateId } = await params;

    if (!teamId || !templateId) {
      return NextResponse.json(
        { error: "Team ID and Template ID are required" },
        { status: 400 },
      );
    }

    const [template] = await db
      .select()
      .from(templateLibrary)
      .where(
        and(
          eq(templateLibrary.id, templateId),
          eq(templateLibrary.teamId, teamId),
        ),
      );

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Failed to get template", details: String(error) },
      { status: 500 },
    );
  }
}

// PATCH /api/t/[team]/template-library/[id] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: templateId } = await params;
    const body = await request.json();

    if (!teamId || !templateId) {
      return NextResponse.json(
        { error: "Team ID and Template ID are required" },
        { status: 400 },
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.agent !== undefined) updateData.agent = body.agent;
    if (body.mergeFields !== undefined)
      updateData.mergeFields = body.mergeFields;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.sendCount !== undefined) updateData.sendCount = body.sendCount;
    if (body.responseCount !== undefined)
      updateData.responseCount = body.responseCount;
    if (body.conversionCount !== undefined)
      updateData.conversionCount = body.conversionCount;

    const [updatedTemplate] = await db
      .update(templateLibrary)
      .set(updateData)
      .where(
        and(
          eq(templateLibrary.id, templateId),
          eq(templateLibrary.teamId, teamId),
        ),
      )
      .returning();

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updatedTemplate });
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Failed to update template", details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE /api/t/[team]/template-library/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: templateId } = await params;

    if (!teamId || !templateId) {
      return NextResponse.json(
        { error: "Team ID and Template ID are required" },
        { status: 400 },
      );
    }

    const [deletedTemplate] = await db
      .delete(templateLibrary)
      .where(
        and(
          eq(templateLibrary.id, templateId),
          eq(templateLibrary.teamId, teamId),
        ),
      )
      .returning();

    if (!deletedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template", details: String(error) },
      { status: 500 },
    );
  }
}
