import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, deals, dealActivities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * MACHINE STATE ROUTER
 *
 * Central orchestrator for the 5-Machine Pipeline:
 * 1. Initial SMS Machine - First touch, intent test
 * 2. Response Machine - Reply routing, signal detection
 * 3. Conversation Machine - Qualifying, nurturing, education
 * 4. Appointment Machine - Booking, calendar, handoff
 * 5. Deal Machine - Closing, monetization, exit
 *
 * This API handles state transitions and cross-machine events.
 */

// Machine states
type MachineState =
  | "initial_sms"      // Machine 1: Lead received first SMS
  | "awaiting_response" // Machine 1→2: Waiting for reply
  | "response_received" // Machine 2: Reply came in
  | "in_conversation"   // Machine 3: Active conversation
  | "qualified"         // Machine 3→4: Ready for appointment
  | "appointment_pending" // Machine 4: Appointment being scheduled
  | "appointment_set"   // Machine 4: Meeting booked
  | "deal_created"      // Machine 5: Deal in pipeline
  | "deal_active"       // Machine 5: Deal being worked
  | "closed_won"        // Machine 5: Success!
  | "closed_lost"       // Machine 5: Did not close
  | "nurturing"         // Long-term nurture sequence
  | "suppressed";       // Do not contact

// Event types that trigger state changes
type MachineEvent =
  | "sms_sent"
  | "sms_received"
  | "call_completed"
  | "qualified_signal"
  | "appointment_requested"
  | "appointment_booked"
  | "deal_created"
  | "deal_stage_changed"
  | "deal_won"
  | "deal_lost"
  | "opt_out"
  | "dnc_request";

interface StateTransitionInput {
  teamId: string;
  leadId: string;
  event: MachineEvent;
  metadata?: Record<string, unknown>;
}

// Default monetization rates by deal type
const DEFAULT_MONETIZATION: Record<string, { type: string; rate: number }> = {
  b2b_exit: { type: "advisory", rate: 5 },
  commercial: { type: "commission", rate: 6 },
  assemblage: { type: "commission", rate: 6 },
  blue_collar_exit: { type: "advisory", rate: 5 },
  development: { type: "equity", rate: 10 },
  residential_haos: { type: "commission", rate: 3 },
};

// GET - Get current machine state for a lead
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const teamId = searchParams.get("teamId");

    if (!leadId || !teamId) {
      return NextResponse.json(
        { error: "leadId and teamId required" },
        { status: 400 }
      );
    }

    // Get lead data
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead.length) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadData = lead[0];

    // Check for associated deal
    const deal = await db
      .select()
      .from(deals)
      .where(and(eq(deals.leadId, leadId), eq(deals.teamId, teamId)))
      .limit(1);

    // Determine current machine state based on lead status and deal status
    let currentMachine: number;
    let currentState: MachineState;
    let nextActions: string[] = [];

    if (deal.length) {
      // In Deal Machine (5)
      currentMachine = 5;
      currentState = deal[0].stage === "closed_won" ? "closed_won" :
                     deal[0].stage === "closed_lost" ? "closed_lost" : "deal_active";
      nextActions = getNextActionsForDeal(deal[0].stage);
    } else {
      // Determine machine based on lead status
      switch (leadData.status) {
        case "new":
          currentMachine = 1;
          currentState = "initial_sms";
          nextActions = ["Send initial SMS", "Add to campaign"];
          break;
        case "contacted":
          currentMachine = 2;
          currentState = "awaiting_response";
          nextActions = ["Wait for response", "Send follow-up"];
          break;
        case "responded":
          currentMachine = 2;
          currentState = "response_received";
          nextActions = ["Classify response", "Route to conversation"];
          break;
        case "qualified":
          currentMachine = 3;
          currentState = "qualified";
          nextActions = ["Create deal", "Schedule appointment", "Continue nurturing"];
          break;
        case "nurturing":
          currentMachine = 3;
          currentState = "nurturing";
          nextActions = ["Send content", "Check for re-engagement"];
          break;
        case "appointment_set":
          currentMachine = 4;
          currentState = "appointment_set";
          nextActions = ["Prepare for meeting", "Create deal", "Send reminder"];
          break;
        case "deal_created":
          currentMachine = 5;
          currentState = "deal_created";
          nextActions = ["Move to qualification", "Add documents"];
          break;
        default:
          currentMachine = 1;
          currentState = "initial_sms";
          nextActions = ["Send initial SMS"];
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      currentMachine,
      machineName: getMachineName(currentMachine),
      currentState,
      nextActions,
      lead: {
        id: leadData.id,
        name: `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim(),
        status: leadData.status,
        lastActivityAt: leadData.lastActivityAt,
      },
      deal: deal.length ? {
        id: deal[0].id,
        stage: deal[0].stage,
        type: deal[0].type,
        estimatedValue: deal[0].estimatedValue,
      } : null,
    });
  } catch (error) {
    console.error("[Machine] State query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get state" },
      { status: 500 }
    );
  }
}

// POST - Process a machine event and trigger state transitions
export async function POST(request: NextRequest) {
  try {
    const body: StateTransitionInput = await request.json();
    const { teamId, leadId, event, metadata = {} } = body;

    if (!teamId || !leadId || !event) {
      return NextResponse.json(
        { error: "teamId, leadId, and event required" },
        { status: 400 }
      );
    }

    // Get current lead
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead.length) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadData = lead[0];
    let newStatus = leadData.status;
    let actions: string[] = [];
    let dealCreated = false;
    let newDeal = null;

    // Process event and determine state transition
    switch (event) {
      case "sms_sent":
        if (leadData.status === "new") {
          newStatus = "contacted";
          actions.push("Lead marked as contacted");
        }
        break;

      case "sms_received":
        newStatus = "responded";
        actions.push("Response received - route to conversation machine");
        break;

      case "call_completed":
        const disposition = metadata.disposition as string;
        if (disposition === "appointment_set") {
          newStatus = "appointment_set";
          actions.push("Appointment booked - ready for deal creation");
        } else if (disposition === "qualified") {
          newStatus = "qualified";
          actions.push("Lead qualified - ready for deal pipeline");
        } else if (disposition === "not_interested") {
          newStatus = "nurturing";
          actions.push("Moved to nurture sequence");
        }
        break;

      case "qualified_signal":
        newStatus = "qualified";
        actions.push("Lead qualified via signal detection");
        // Auto-suggest deal creation
        actions.push("SUGGESTION: Create deal from this qualified lead");
        break;

      case "appointment_requested":
        newStatus = "qualified";
        actions.push("Appointment interest detected - route to booking");
        break;

      case "appointment_booked":
        newStatus = "appointment_set";
        actions.push("Appointment confirmed - prepare handoff package");
        break;

      case "deal_created":
        newStatus = "deal_created";
        actions.push("Deal created - entering Deal Machine");
        break;

      case "deal_stage_changed":
        // Update deal stage (handled by deals API)
        actions.push(`Deal stage updated to ${metadata.newStage}`);
        break;

      case "deal_won":
        newStatus = "closed";
        actions.push("Deal closed successfully!");
        break;

      case "deal_lost":
        // Can optionally move back to nurturing
        if (metadata.reopenLead) {
          newStatus = "nurturing";
          actions.push("Deal lost - lead moved to nurture sequence");
        }
        break;

      case "opt_out":
      case "dnc_request":
        newStatus = "suppressed";
        actions.push("Contact suppressed - do not contact");
        break;
    }

    // Update lead status if changed
    if (newStatus !== leadData.status) {
      await db
        .update(leads)
        .set({
          status: newStatus,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    }

    // Auto-create deal if qualified and requested
    if (event === "qualified_signal" && metadata.autoCreateDeal) {
      const dealType = (metadata.dealType as string) || determineDealType(leadData);
      const monetization = DEFAULT_MONETIZATION[dealType];
      const estimatedValue = leadData.estimatedValue || 0;

      newDeal = {
        id: uuidv4(),
        teamId,
        userId: (metadata.userId as string) || "system",
        leadId,
        name: leadData.propertyAddress || leadData.companyName ||
              `Deal - ${leadData.firstName} ${leadData.lastName}`,
        type: dealType,
        stage: "discovery",
        priority: "medium",
        estimatedValue,
        monetization: {
          type: monetization.type,
          rate: monetization.rate,
          estimatedEarnings: (estimatedValue * monetization.rate) / 100,
        },
        seller: {
          name: `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim(),
          email: leadData.email,
          phone: leadData.phone,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.insert(deals).values(newDeal);

      // Log the activity
      await db.insert(dealActivities).values({
        id: uuidv4(),
        dealId: newDeal.id,
        userId: (metadata.userId as string) || "system",
        type: "stage_change",
        title: "Deal auto-created from qualified lead",
        description: `Deal automatically created when lead was qualified via ${event}`,
        metadata: { event, fromStatus: leadData.status },
        createdAt: new Date(),
      });

      dealCreated = true;
      actions.push(`Deal created: ${newDeal.name}`);

      // Update lead status
      await db
        .update(leads)
        .set({
          status: "deal_created",
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    }

    // Determine new machine state
    const newMachine = getMachineFromStatus(newStatus);

    return NextResponse.json({
      success: true,
      event,
      previousStatus: leadData.status,
      newStatus,
      previousMachine: getMachineFromStatus(leadData.status as string),
      newMachine,
      machineName: getMachineName(newMachine),
      actions,
      dealCreated,
      deal: newDeal,
      nextActions: getNextActionsForStatus(newStatus),
    });
  } catch (error) {
    console.error("[Machine] Event processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process event" },
      { status: 500 }
    );
  }
}

// Helper: Get machine number from status
function getMachineFromStatus(status: string): number {
  const statusToMachine: Record<string, number> = {
    new: 1,
    contacted: 1,
    responded: 2,
    in_conversation: 3,
    qualified: 3,
    nurturing: 3,
    appointment_pending: 4,
    appointment_set: 4,
    deal_created: 5,
    deal_active: 5,
    closed: 5,
    suppressed: 0,
  };
  return statusToMachine[status] || 1;
}

// Helper: Get machine name
function getMachineName(machine: number): string {
  const names: Record<number, string> = {
    0: "Suppressed",
    1: "Initial SMS Machine",
    2: "Response Machine",
    3: "Conversation Machine",
    4: "Appointment Machine",
    5: "Deal Machine",
  };
  return names[machine] || "Unknown";
}

// Helper: Get next actions for a deal stage
function getNextActionsForDeal(stage: string): string[] {
  const stageActions: Record<string, string[]> = {
    discovery: ["Gather information", "Move to qualification", "Schedule discovery call"],
    qualification: ["Verify financials", "Assess motivation", "Move to proposal"],
    proposal: ["Prepare proposal", "Present to seller", "Move to negotiation"],
    negotiation: ["Counter-offer", "Finalize terms", "Move to contract"],
    contract: ["Draft contract", "Review with attorney", "Get signatures"],
    closing: ["Coordinate closing", "Final walkthrough", "Close deal"],
    closed_won: ["Collect commission", "Request referral", "Add to testimonials"],
    closed_lost: ["Document reason", "Move to nurture", "Schedule follow-up"],
  };
  return stageActions[stage] || [];
}

// Helper: Get next actions for a lead status
function getNextActionsForStatus(status: string): string[] {
  const statusActions: Record<string, string[]> = {
    new: ["Send initial SMS", "Add to campaign"],
    contacted: ["Wait for response", "Send follow-up"],
    responded: ["Classify response", "Route to conversation"],
    qualified: ["Create deal", "Schedule appointment"],
    nurturing: ["Send content", "Monitor for signals"],
    appointment_set: ["Prepare for meeting", "Create deal"],
    deal_created: ["Start discovery", "Add to pipeline"],
    suppressed: ["No action - do not contact"],
  };
  return statusActions[status] || [];
}

// Helper: Determine deal type from lead data
function determineDealType(leadData: Record<string, unknown>): string {
  // If it's a business lead (has Apollo data)
  if (leadData.apolloOrgId || leadData.companyName) {
    const revenue = leadData.apolloRevenue as number;
    if (revenue && revenue > 5000000) {
      return "b2b_exit";
    }
    return "blue_collar_exit";
  }

  // Property-based determination
  const propertyType = leadData.propertyType as string;
  if (propertyType) {
    if (["commercial", "industrial", "retail", "office"].includes(propertyType.toLowerCase())) {
      return "commercial";
    }
    if (propertyType.toLowerCase().includes("land")) {
      return "development";
    }
  }

  // Default to residential
  return "residential_haos";
}
