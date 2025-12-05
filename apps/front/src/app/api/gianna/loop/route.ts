import { NextRequest, NextResponse } from "next/server";
import { giannaLoopEngine, LeadEscalationState } from "@/lib/engines/gianna-loop-engine";
import smsGiannaLoop from "@/lib/templates/sms_gianna_loop.json";

// In-memory store for demo - in production, use PostgreSQL
const leadStates = new Map<string, LeadEscalationState>();

// GET /api/gianna/loop - Get loop status, templates, or specific lead status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const leadId = searchParams.get("lead_id");
    const step = searchParams.get("step");

    // Get all templates
    if (action === "templates") {
      return NextResponse.json({
        success: true,
        loop_config: smsGiannaLoop.loop_config,
        style: smsGiannaLoop.style,
        templates: smsGiannaLoop.templates,
      });
    }

    // Preview a specific step
    if (action === "preview" && step) {
      const stepNum = parseInt(step);
      const firstName = searchParams.get("first_name") || "John";
      const companyName = searchParams.get("company_name") || "Acme Corp";

      const preview = giannaLoopEngine.previewStep(stepNum, {
        first_name: firstName,
        company_name: companyName,
      });

      if (!preview) {
        return NextResponse.json(
          { error: `No template for step ${step}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        step: stepNum,
        message: preview,
        character_count: preview.length,
      });
    }

    // Get lead status
    if (leadId) {
      const state = leadStates.get(leadId);
      if (!state) {
        return NextResponse.json(
          { error: `Lead not found: ${leadId}` },
          { status: 404 }
        );
      }

      const status = giannaLoopEngine.getLoopStatus(state);
      return NextResponse.json({
        success: true,
        lead_id: leadId,
        state,
        status,
      });
    }

    // Return all active loops
    const activeLoops = Array.from(leadStates.values())
      .filter((s) => !s.is_completed && !s.is_paused)
      .map((s) => ({
        ...s,
        status: giannaLoopEngine.getLoopStatus(s),
      }));

    return NextResponse.json({
      success: true,
      active_loops: activeLoops.length,
      total_leads: leadStates.size,
      leads: activeLoops.slice(0, 50), // Limit to 50 for response size
    });
  } catch (error) {
    console.error("[Gianna Loop API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get loop data" },
      { status: 500 }
    );
  }
}

// POST /api/gianna/loop - Start loop, send next, pause, resume, reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, lead_id, campaign_id, phone, first_name, company_name } = body;

    switch (action) {
      case "start": {
        // Start a new loop for a lead
        if (!lead_id || !phone || !first_name) {
          return NextResponse.json(
            { error: "lead_id, phone, and first_name are required" },
            { status: 400 }
          );
        }

        const newState: LeadEscalationState = {
          lead_id,
          campaign_id: campaign_id || "default",
          phone,
          first_name,
          company_name: company_name || "",
          current_step: 0,
          last_sent_at: null,
          is_paused: false,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        leadStates.set(lead_id, newState);

        // Send first message immediately
        const result = await giannaLoopEngine.sendNextMessage(newState);

        if (result.success) {
          newState.current_step = result.step_sent || 1;
          newState.last_sent_at = new Date().toISOString();
          newState.updated_at = new Date().toISOString();
          leadStates.set(lead_id, newState);
        }

        return NextResponse.json({
          success: true,
          action: "started",
          lead_id,
          result,
          state: newState,
        });
      }

      case "send_next": {
        // Send next message in loop
        if (!lead_id) {
          return NextResponse.json(
            { error: "lead_id is required" },
            { status: 400 }
          );
        }

        const state = leadStates.get(lead_id);
        if (!state) {
          return NextResponse.json(
            { error: `Lead not found: ${lead_id}` },
            { status: 404 }
          );
        }

        const result = await giannaLoopEngine.sendNextMessage(state);

        if (result.success) {
          state.current_step = result.step_sent || state.current_step + 1;
          state.last_sent_at = new Date().toISOString();
          state.updated_at = new Date().toISOString();

          if (result.is_loop_complete) {
            state.is_completed = true;
          }

          leadStates.set(lead_id, state);
        }

        return NextResponse.json({
          success: true,
          action: "send_next",
          lead_id,
          result,
          state,
        });
      }

      case "pause": {
        if (!lead_id) {
          return NextResponse.json(
            { error: "lead_id is required" },
            { status: 400 }
          );
        }

        const state = leadStates.get(lead_id);
        if (!state) {
          return NextResponse.json(
            { error: `Lead not found: ${lead_id}` },
            { status: 404 }
          );
        }

        state.is_paused = true;
        state.updated_at = new Date().toISOString();
        leadStates.set(lead_id, state);

        return NextResponse.json({
          success: true,
          action: "paused",
          lead_id,
          state,
        });
      }

      case "resume": {
        if (!lead_id) {
          return NextResponse.json(
            { error: "lead_id is required" },
            { status: 400 }
          );
        }

        const state = leadStates.get(lead_id);
        if (!state) {
          return NextResponse.json(
            { error: `Lead not found: ${lead_id}` },
            { status: 404 }
          );
        }

        state.is_paused = false;
        state.updated_at = new Date().toISOString();
        leadStates.set(lead_id, state);

        return NextResponse.json({
          success: true,
          action: "resumed",
          lead_id,
          state,
        });
      }

      case "reset": {
        if (!lead_id) {
          return NextResponse.json(
            { error: "lead_id is required" },
            { status: 400 }
          );
        }

        const state = leadStates.get(lead_id);
        if (!state) {
          return NextResponse.json(
            { error: `Lead not found: ${lead_id}` },
            { status: 404 }
          );
        }

        const resetState = giannaLoopEngine.resetLoop(state);
        leadStates.set(lead_id, resetState);

        return NextResponse.json({
          success: true,
          action: "reset",
          lead_id,
          state: resetState,
        });
      }

      case "process_batch": {
        // Process all active loops
        const activeStates = Array.from(leadStates.values()).filter(
          (s) => !s.is_completed && !s.is_paused
        );

        const results = await giannaLoopEngine.processLeadBatch(activeStates);

        // Update states based on results
        for (const [leadId, result] of results.entries()) {
          const state = leadStates.get(leadId);
          if (state && result.success) {
            state.current_step = result.step_sent || state.current_step + 1;
            state.last_sent_at = new Date().toISOString();
            state.updated_at = new Date().toISOString();
            if (result.is_loop_complete) {
              state.is_completed = true;
            }
            leadStates.set(leadId, state);
          }
        }

        const successCount = Array.from(results.values()).filter((r) => r.success).length;

        return NextResponse.json({
          success: true,
          action: "batch_processed",
          total_processed: activeStates.length,
          successful: successCount,
          failed: activeStates.length - successCount,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Gianna Loop API] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
