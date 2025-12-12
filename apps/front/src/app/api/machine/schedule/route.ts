import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, deals, dealActivities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * SCHEDULE FROM DEAL
 *
 * Creates an appointment/meeting from a deal context.
 * This is the integration between Machine 5 (Deal) and Machine 4 (Appointment).
 *
 * Used when:
 * - Deal needs a discovery call
 * - Deal needs a strategy session
 * - Deal needs a closing meeting
 *
 * POST /api/machine/schedule
 */

interface ScheduleInput {
  teamId: string;
  dealId: string;
  userId: string;
  appointmentType:
    | "discovery"
    | "strategy"
    | "proposal"
    | "closing"
    | "follow_up";
  title?: string;
  description?: string;
  duration?: number; // minutes
  preferredDate?: string;
  preferredTimeSlots?: string[];
  attendees?: Array<{
    name: string;
    email?: string;
    phone?: string;
    role: "seller" | "buyer" | "agent" | "attorney" | "other";
  }>;
  notes?: string;
}

// Appointment type configurations
const APPOINTMENT_CONFIGS: Record<
  string,
  {
    defaultTitle: string;
    defaultDuration: number;
    description: string;
    nextStage?: string;
  }
> = {
  discovery: {
    defaultTitle: "Discovery Call",
    defaultDuration: 30,
    description: "Initial discovery call to understand needs and motivation",
    nextStage: "qualification",
  },
  strategy: {
    defaultTitle: "Strategy Session",
    defaultDuration: 60,
    description: "In-depth strategy session to discuss options and approach",
    nextStage: "proposal",
  },
  proposal: {
    defaultTitle: "Proposal Presentation",
    defaultDuration: 45,
    description: "Present proposal and discuss terms",
    nextStage: "negotiation",
  },
  closing: {
    defaultTitle: "Closing Meeting",
    defaultDuration: 90,
    description: "Final closing meeting to complete the transaction",
    nextStage: "closing",
  },
  follow_up: {
    defaultTitle: "Follow-up Call",
    defaultDuration: 15,
    description: "Follow-up to address questions or concerns",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleInput = await request.json();
    const {
      teamId,
      dealId,
      userId,
      appointmentType,
      title,
      description,
      duration,
      preferredDate,
      preferredTimeSlots,
      attendees = [],
      notes,
    } = body;

    if (!teamId || !dealId || !userId || !appointmentType) {
      return NextResponse.json(
        { error: "teamId, dealId, userId, and appointmentType required" },
        { status: 400 },
      );
    }

    // Get deal data
    const deal = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.teamId, teamId)))
      .limit(1);

    if (!deal.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const dealData = deal[0];

    // Get associated lead if exists
    let leadData = null;
    if (dealData.leadId) {
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, dealData.leadId))
        .limit(1);
      if (lead.length) {
        leadData = lead[0];
      }
    }

    // Get appointment configuration
    const config = APPOINTMENT_CONFIGS[appointmentType];

    // Build appointment title
    const appointmentTitle =
      title || `${config.defaultTitle}: ${dealData.name}`;

    // Build attendee list (add seller from deal if not specified)
    const finalAttendees = [...attendees];
    const seller = dealData.seller as Record<string, string> | null;

    if (seller && !attendees.some((a) => a.role === "seller")) {
      finalAttendees.push({
        name: seller.name || "Seller",
        email: seller.email,
        phone: seller.phone,
        role: "seller" as const,
      });
    }

    // Create appointment request (to be processed by calendar system)
    const appointmentRequest = {
      id: uuidv4(),
      dealId,
      leadId: dealData.leadId,
      teamId,
      userId,
      type: appointmentType,
      title: appointmentTitle,
      description: description || config.description,
      duration: duration || config.defaultDuration,
      preferredDate,
      preferredTimeSlots: preferredTimeSlots || ["morning", "afternoon"],
      attendees: finalAttendees,
      notes,
      status: "pending",
      context: {
        dealName: dealData.name,
        dealType: dealData.type,
        dealStage: dealData.stage,
        estimatedValue: dealData.estimatedValue,
        propertyAddress: leadData?.propertyAddress,
        companyName: leadData?.companyName,
      },
      createdAt: new Date().toISOString(),
    };

    // Log activity on the deal
    await db.insert(dealActivities).values({
      id: uuidv4(),
      dealId,
      userId,
      type: "meeting",
      subtype: appointmentType,
      title: `${config.defaultTitle} scheduled`,
      description: `${appointmentType} meeting requested for ${dealData.name}`,
      metadata: {
        appointmentType,
        duration: duration || config.defaultDuration,
        preferredDate,
        attendeeCount: finalAttendees.length,
      },
      createdAt: new Date(),
    });

    // Update lead status if exists
    if (dealData.leadId) {
      await db
        .update(leads)
        .set({
          status: "appointment_pending",
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, dealData.leadId));
    }

    return NextResponse.json({
      success: true,
      message: "Appointment scheduling initiated",
      appointmentRequest,
      deal: {
        id: dealData.id,
        name: dealData.name,
        stage: dealData.stage,
        suggestedNextStage: config.nextStage,
      },
      nextActions: [
        "Appointment will be confirmed once calendar slot is selected",
        config.nextStage
          ? `After meeting, consider moving deal to ${config.nextStage}`
          : null,
        "Send calendar invite to attendees",
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("[Machine] Schedule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to schedule" },
      { status: 500 },
    );
  }
}

// GET - Get scheduling suggestions for a deal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("dealId");
    const teamId = searchParams.get("teamId");

    if (!dealId || !teamId) {
      return NextResponse.json(
        { error: "dealId and teamId required" },
        { status: 400 },
      );
    }

    // Get deal
    const deal = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.teamId, teamId)))
      .limit(1);

    if (!deal.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const dealData = deal[0];

    // Suggest appointment type based on deal stage
    const stageSuggestions: Record<string, string[]> = {
      discovery: ["discovery"],
      qualification: ["strategy", "discovery"],
      proposal: ["proposal", "strategy"],
      negotiation: ["proposal", "follow_up"],
      contract: ["closing", "follow_up"],
      closing: ["closing"],
    };

    const suggestedTypes = stageSuggestions[dealData.stage] || ["follow_up"];

    // Build suggestions
    const suggestions = suggestedTypes.map((type) => ({
      type,
      ...APPOINTMENT_CONFIGS[type],
      recommended: type === suggestedTypes[0],
    }));

    return NextResponse.json({
      success: true,
      deal: {
        id: dealData.id,
        name: dealData.name,
        stage: dealData.stage,
      },
      suggestions,
      appointmentTypes: Object.entries(APPOINTMENT_CONFIGS).map(
        ([type, config]) => ({
          type,
          ...config,
        }),
      ),
    });
  } catch (error) {
    console.error("[Machine] Schedule suggestions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get suggestions",
      },
      { status: 500 },
    );
  }
}
