import { NextRequest, NextResponse } from "next/server";
import { getTeamFromToken } from "@/lib/auth/extension-auth";

/**
 * POST /api/extension/capture-lead
 *
 * Quick lead capture from Chrome extension.
 * Creates a new lead with minimal info and optional campaign assignment.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify extension auth token
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
    const {
      firstName,
      lastName,
      company,
      phone,
      email,
      campaignId,
      source,
      sourceUrl,
    } = body;

    // Validate required fields
    if (!phone && !email) {
      return NextResponse.json(
        { success: false, error: "Phone or email is required" },
        { status: 400 },
      );
    }

    // Normalize phone number
    const normalizedPhone = phone?.replace(/\D/g, "");

    // Create lead via internal API or database
    // This is a placeholder - integrate with your actual lead creation logic
    const leadData = {
      teamId: team.id,
      firstName: firstName || null,
      lastName: lastName || null,
      company: company || null,
      phone: normalizedPhone || null,
      email: email || null,
      source: source || "chrome_extension",
      sourceUrl: sourceUrl || null,
      status: "new",
      createdAt: new Date(),
    };

    // TODO: Insert into leads table
    // const lead = await db.insert(leads).values(leadData).returning();

    // If campaign specified, add to campaign
    if (campaignId) {
      // TODO: Add to campaign queue
      // await addLeadToCampaign(lead.id, campaignId);
    }

    return NextResponse.json({
      success: true,
      message: "Lead captured successfully",
      // leadId: lead.id,
    });
  } catch (error) {
    console.error("Extension capture-lead error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to capture lead" },
      { status: 500 },
    );
  }
}
