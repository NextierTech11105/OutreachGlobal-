import { NextRequest, NextResponse } from "next/server";
import { TagLeadRequest } from "@/lib/types/bucket";

// POST /api/leads/:id/tag - Add/remove/replace tags on a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: TagLeadRequest = await request.json();

    if (!body.tags || !Array.isArray(body.tags)) {
      return NextResponse.json({ error: "Tags array is required" }, { status: 400 });
    }

    if (!["add", "remove", "replace"].includes(body.action)) {
      return NextResponse.json({ error: "Action must be add, remove, or replace" }, { status: 400 });
    }

    // In production:
    // 1. Fetch lead from database
    // 2. Apply tag action
    // 3. Save updated lead

    // Mock current tags
    const currentTags = ["priority", "high-equity"];
    let newTags: string[];

    switch (body.action) {
      case "add":
        newTags = [...new Set([...currentTags, ...body.tags])];
        break;
      case "remove":
        newTags = currentTags.filter((t) => !body.tags.includes(t));
        break;
      case "replace":
        newTags = body.tags;
        break;
      default:
        newTags = currentTags;
    }

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
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
  }
}
