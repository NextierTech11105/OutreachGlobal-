import { NextRequest, NextResponse } from "next/server";
import { getTeamFromToken } from "@/lib/auth/extension-auth";

/**
 * POST /api/extension/add-to-cadence
 *
 * Add a lead to a campaign cadence.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const team = await getTeamFromToken(token);

    if (!team) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { phone, email, cadenceId, leadId } = body;

    if (!cadenceId) {
      return NextResponse.json(
        { success: false, error: "Cadence ID is required" },
        { status: 400 },
      );
    }

    if (!phone && !email && !leadId) {
      return NextResponse.json(
        { success: false, error: "Phone, email, or lead ID is required" },
        { status: 400 },
      );
    }

    // TODO: Find or create lead
    // let targetLeadId = leadId;
    // if (!targetLeadId && phone) {
    //   const lead = await db.query.leads.findFirst({
    //     where: eq(leads.phone, phone.replace(/\D/g, ''))
    //   });
    //   targetLeadId = lead?.id;
    // }

    // TODO: Add to cadence queue
    // await db.insert(cadenceQueue).values({
    //   leadId: targetLeadId,
    //   cadenceId,
    //   step: 1,
    //   status: 'pending',
    //   scheduledFor: new Date(),
    // });

    return NextResponse.json({
      success: true,
      message: "Lead added to cadence",
    });
  } catch (error) {
    console.error("Extension add-to-cadence error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add to cadence" },
      { status: 500 },
    );
  }
}
