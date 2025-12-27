import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  getAllTenantMappings,
  fullTenantSync,
  addSubBrand,
  mapTeamToSubBrand,
} from "@/lib/signalhouse/tenant-mapping";
import { isConfigured } from "@/lib/signalhouse/client";

// GET - List all tenant/brand mappings
export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    const mappings = getAllTenantMappings();

    return NextResponse.json({
      success: true,
      configured: isConfigured(),
      ...mappings,
    });
  } catch (error) {
    console.error("[Tenant Admin] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get tenants",
      },
      { status: 500 },
    );
  }
}

// POST - Sync tenants to SignalHouse or create new sub-brand
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const action = body.action || "sync";

    // Full sync to SignalHouse
    if (action === "sync") {
      const result = await fullTenantSync();
      return NextResponse.json({
        success: result.success,
        message: result.success
          ? "Tenants synced to SignalHouse"
          : "Some syncs failed",
        ...result,
      });
    }

    // Create new sub-brand
    if (action === "create-sub-brand") {
      const { parentBrandId, name, displayName, description } = body;

      if (!parentBrandId || !name) {
        return NextResponse.json(
          { error: "parentBrandId and name are required" },
          { status: 400 },
        );
      }

      const result = await addSubBrand(
        parentBrandId,
        name,
        displayName || name,
        description || "",
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Sub-brand created",
        subBrand: result.subBrand,
      });
    }

    // Map team to sub-brand
    if (action === "map-team") {
      const { teamId, subBrandId } = body;

      if (!teamId || !subBrandId) {
        return NextResponse.json(
          { error: "teamId and subBrandId are required" },
          { status: 400 },
        );
      }

      mapTeamToSubBrand(teamId, subBrandId);

      return NextResponse.json({
        success: true,
        message: `Team ${teamId} mapped to sub-brand ${subBrandId}`,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Tenant Admin] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    );
  }
}
