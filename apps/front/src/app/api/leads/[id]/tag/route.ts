import { NextRequest, NextResponse } from "next/server";
import { TagLeadRequest } from "@/lib/types/bucket";
import { db } from "@/lib/db";
import { leads, leadTags, tags } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

// POST /api/leads/:id/tag - Add/remove/replace tags on a lead (REAL DATABASE)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: TagLeadRequest = await request.json();

    if (!body.tags || !Array.isArray(body.tags)) {
      return NextResponse.json(
        { error: "Tags array is required" },
        { status: 400 },
      );
    }

    if (!["add", "remove", "replace"].includes(body.action)) {
      return NextResponse.json(
        { error: "Action must be add, remove, or replace" },
        { status: 400 },
      );
    }

    // Fetch lead to verify ownership
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get current tags from database
    const currentTagResults = await db
      .select({ name: tags.name })
      .from(leadTags)
      .innerJoin(tags, eq(leadTags.tagId, tags.id))
      .where(eq(leadTags.leadId, id));

    const currentTags = currentTagResults.map((t: { name: string }) => t.name);

    // Calculate new tags based on action
    let newTags: string[];
    switch (body.action) {
      case "add":
        newTags = [...new Set([...currentTags, ...body.tags])];
        break;
      case "remove":
        newTags = currentTags.filter((t: string) => !body.tags.includes(t));
        break;
      case "replace":
        newTags = body.tags;
        break;
      default:
        newTags = currentTags;
    }

    // Remove old tag associations if replacing or removing
    if (body.action === "replace" || body.action === "remove") {
      await db.delete(leadTags).where(eq(leadTags.leadId, id));
    }

    // Add new tag associations
    const tagsToAdd =
      body.action === "replace"
        ? newTags
        : body.tags.filter((t) => !currentTags.includes(t));

    if (tagsToAdd.length > 0) {
      // Get or create tag IDs
      const existingTags = await db
        .select()
        .from(tags)
        .where(inArray(tags.name, tagsToAdd));

      const existingTagNames = existingTags.map(
        (t: { name: string }) => t.name,
      );
      const newTagNames = tagsToAdd.filter(
        (t) => !existingTagNames.includes(t),
      );

      // Create missing tags
      const createdTags =
        newTagNames.length > 0
          ? await db
              .insert(tags)
              .values(
                newTagNames.map((name) => ({
                  name,
                  slug: name.toLowerCase().replace(/\s+/g, "-"),
                  userId,
                })),
              )
              .returning()
          : [];

      // Link all tags to the lead
      const allTagIds = [...existingTags, ...createdTags].map((t) => t.id);
      if (allTagIds.length > 0) {
        await db.insert(leadTags).values(
          allTagIds.map((tagId) => ({
            leadId: id,
            tagId,
            appliedBy: userId,
          })),
        );
      }
    }

    // Update lead's updatedAt
    await db
      .update(leads)
      .set({ updatedAt: new Date() })
      .where(eq(leads.id, id));

    return NextResponse.json({
      success: true,
      leadId: id,
      action: body.action,
      previousTags: currentTags,
      currentTags: newTags,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Lead Tag API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 },
    );
  }
}
