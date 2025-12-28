import { NextRequest, NextResponse } from "next/server";
import {
  createSubGroup,
  getSubGroups,
  getSubGroupDetails,
  updateSubGroup,
  deleteSubGroup,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List all sub-groups or get specific sub-group
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const subGroupId = searchParams.get("id");

  try {
    if (subGroupId) {
      // Get specific sub-group
      const result = await getSubGroupDetails(subGroupId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Sub-group not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        subGroup: result.data,
      });
    }

    // List all sub-groups
    const result = await getSubGroups();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch sub-groups" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      subGroups: result.data || [],
    });
  } catch (error: any) {
    console.error("[SignalHouse SubGroups] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new sub-group
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const result = await createSubGroup({
      name,
      description: description || `Sub-group for ${name}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create sub-group" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      subGroup: result.data,
    });
  } catch (error: any) {
    console.error("[SignalHouse SubGroups] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update existing sub-group
export async function PUT(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { subGroupId, name, description } = body;

    if (!subGroupId) {
      return NextResponse.json(
        { error: "subGroupId is required" },
        { status: 400 },
      );
    }

    const result = await updateSubGroup({
      subGroupId,
      name,
      description,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update sub-group" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      subGroup: result.data,
    });
  } catch (error: any) {
    console.error("[SignalHouse SubGroups] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove sub-group
export async function DELETE(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const subGroupId = searchParams.get("id");

    if (!subGroupId) {
      return NextResponse.json(
        { error: "Sub-group ID is required (use ?id=xxx)" },
        { status: 400 },
      );
    }

    const result = await deleteSubGroup(subGroupId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete sub-group" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deleted: subGroupId,
    });
  } catch (error: any) {
    console.error("[SignalHouse SubGroups] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
