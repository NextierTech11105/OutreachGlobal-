/**
 * AUTOMATION API
 *
 * Manages baseline automation rules:
 * - Retarget drips (no-response)
 * - Nurture drips (confirmed contact)
 * - Hot lead flagging (valuations)
 * - Email capture handling
 * - Opt-out processing
 * - Wrong number handling
 */

import { NextRequest, NextResponse } from "next/server";
import { automationService } from "@/lib/services/automation-service";

// POST - Trigger automation actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // Start retarget drip for a lead
      case "start_retarget": {
        const { leadId, phone, firstName, propertyAddress } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 }
          );
        }

        automationService.scheduleRetargetDrip(leadId, phone, firstName, propertyAddress);

        return NextResponse.json({
          success: true,
          message: `Retarget drip scheduled for ${leadId}`,
          schedule: ["Day 7", "Day 14", "Day 30"],
        });
      }

      // Activate nurture drip for confirmed contact
      case "activate_nurture": {
        const { leadId, phone, email } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 }
          );
        }

        automationService.activateNurtureDrip(leadId, phone, email);

        return NextResponse.json({
          success: true,
          message: `Nurture drip activated for ${leadId}`,
          schedule: ["Day 3 email", "Day 7 SMS", "Day 14 call", "Day 21 email", "Day 30 SMS"],
        });
      }

      // Flag as hot lead (valuation sent)
      case "flag_hot_lead": {
        const { leadId, phone, email, reason } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 }
          );
        }

        automationService.flagAsHotLead(leadId, phone, email, reason || "valuation");

        const state = automationService.getLeadState(leadId);

        return NextResponse.json({
          success: true,
          message: `🔥 HOT LEAD flagged: ${leadId}`,
          priority: "hot",
          score: state?.score || 50,
          followUp: ["Hour 24 SMS", "Hour 48 call", "Day 3 SMS", "Day 7 SMS"],
        });
      }

      // Process incoming message (auto-classify and route)
      case "process_message": {
        const { leadId, phone, message, propertyId } = body;

        if (!leadId || !phone || !message) {
          return NextResponse.json(
            { success: false, error: "leadId, phone, and message required" },
            { status: 400 }
          );
        }

        const result = automationService.processIncomingMessage(leadId, phone, message, propertyId);
        const state = automationService.getLeadState(leadId);

        return NextResponse.json({
          success: true,
          classification: result.classification,
          extractedEmail: result.extractedEmail,
          action: result.action,
          leadState: {
            priority: state?.priority,
            score: state?.score,
            phoneVerified: state?.phoneVerified,
            emailVerified: state?.emailVerified,
            optedOut: state?.optedOut,
            wrongNumber: state?.wrongNumber,
          },
        });
      }

      // Manually opt-out a lead
      case "opt_out": {
        const { leadId, phone } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 }
          );
        }

        automationService.handleOptOut(leadId, phone);

        return NextResponse.json({
          success: true,
          message: `Lead ${leadId} opted out`,
        });
      }

      // Mark as wrong number
      case "wrong_number": {
        const { leadId, phone } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 }
          );
        }

        automationService.handleWrongNumber(leadId, phone);

        return NextResponse.json({
          success: true,
          message: `Lead ${leadId} marked as wrong number`,
        });
      }

      // Start batch retarget drip
      case "start_batch_retarget": {
        const { leads } = body;

        if (!leads || !Array.isArray(leads)) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 }
          );
        }

        let scheduled = 0;
        for (const lead of leads) {
          if (lead.leadId && lead.phone) {
            automationService.scheduleRetargetDrip(
              lead.leadId,
              lead.phone,
              lead.firstName,
              lead.propertyAddress
            );
            scheduled++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `Retarget drip scheduled for ${scheduled} leads`,
          scheduled,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Automation] Error:", error);
    return NextResponse.json(
      { success: false, error: "Automation action failed" },
      { status: 500 }
    );
  }
}

// GET - Get automation stats and lead states
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";
  const leadId = searchParams.get("leadId");

  try {
    switch (action) {
      case "stats": {
        const stats = automationService.getStats();
        return NextResponse.json({
          success: true,
          stats,
        });
      }

      case "lead": {
        if (!leadId) {
          return NextResponse.json(
            { success: false, error: "leadId required" },
            { status: 400 }
          );
        }

        const state = automationService.getLeadState(leadId);

        if (!state) {
          return NextResponse.json(
            { success: false, error: "Lead not found in automation system" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          lead: state,
        });
      }

      case "hot_leads": {
        const hotLeads = automationService.getAllHotLeads();
        return NextResponse.json({
          success: true,
          count: hotLeads.length,
          leads: hotLeads.map(l => ({
            leadId: l.leadId,
            phone: l.phone,
            email: l.email,
            score: l.score,
            valuationSent: l.valuationSent,
            blueprintSent: l.blueprintSent,
            lastResponseAt: l.lastResponseAt,
          })),
        });
      }

      case "warm_leads": {
        const warmLeads = automationService.getAllWarmLeads();
        return NextResponse.json({
          success: true,
          count: warmLeads.length,
          leads: warmLeads.map(l => ({
            leadId: l.leadId,
            phone: l.phone,
            email: l.email,
            score: l.score,
            dripStage: l.drip.stage,
            dripSequence: l.drip.sequence,
          })),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Automation] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get automation data" },
      { status: 500 }
    );
  }
}
