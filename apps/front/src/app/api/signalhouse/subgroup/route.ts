import { NextRequest, NextResponse } from "next/server";
import {
  createSubGroup,
  getSubGroups,
  getSubGroupDetails,
  updateSubGroup,
  deleteSubGroup,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List sub-groups or get specific sub-group
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const subGroupId = searchParams.get("subGroupId");

  try {
    // Get specific sub-group
    if (subGroupId) {
      const result = await getSubGroupDetails(subGroupId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 },
        );
      }
      return NextResponse.json({ success: true, subGroup: result.data });
    }

    // List all sub-groups
    const result = await getSubGroups();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      subGroups: result.data || [],
    });
  } catch (error) {
    console.error("[SignalHouse SubGroup] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get sub-groups",
      },
      { status: 500 },
    );
  }
}

// POST - Create a new sub-group
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const result = await createSubGroup({ name, description });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      subGroup: result.data,
      message: "Sub-group created successfully",
    });
  } catch (error) {
    console.error("[SignalHouse SubGroup] Create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create sub-group",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update a sub-group
export async function PATCH(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { subGroupId, name, description } = body;

    if (!subGroupId) {
      return NextResponse.json(
        { error: "subGroupId required" },
        { status: 400 },
      );
    }

    const result = await updateSubGroup({ subGroupId, name, description });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      subGroup: result.data,
      message: "Sub-group updated",
    });
  } catch (error) {
    console.error("[SignalHouse SubGroup] Update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update sub-group",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete a sub-group
export async function DELETE(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "SignalHouse not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const subGroupId = searchParams.get("subGroupId");

  if (!subGroupId) {
    return NextResponse.json({ error: "subGroupId required" }, { status: 400 });
  }

  try {
    const result = await deleteSubGroup(subGroupId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({ success: true, message: "Sub-group deleted" });
  } catch (error) {
    console.error("[SignalHouse SubGroup] Delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete sub-group",
      },
      { status: 500 },
    );
  }
}
