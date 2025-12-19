/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CALL CENTER QUEUE API - SignalHouse Integrated
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Manages call queues for AI personas (GIANNA, CATHY, SABRINA) in both:
 * - Assistant Mode: Hands-free calling, user directs persona to "next lead"
 * - Inbound Response Mode: Handling incoming responses within campaign lanes
 *
 * SignalHouse.io handles the backend infrastructure (tenant, numbers, delivery)
 * We manage the queue logic and AI persona assignment on the frontend.
 */

import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PersonaId = "gianna" | "cathy" | "sabrina";

export type CallQueueType =
  | "immediate"      // Call right now
  | "scheduled"      // Scheduled for specific time
  | "follow_up"      // Follow-up call
  | "callback"       // Lead requested callback
  | "power_dial";    // Power dialer batch

export type PersonaMode =
  | "assistant"      // Hands-free, user directs via voice/command
  | "inbound";       // Responding to inbound messages/calls

export type CampaignLane =
  | "initial"        // GIANNA - First contact
  | "retarget"       // GIANNA/CATHY - Re-engagement
  | "follow_up"      // GIANNA/SABRINA - Following up
  | "book_appointment" // SABRINA - Booking calls
  | "nurture"        // GIANNA - Long-term
  | "nudger";        // CATHY - Gentle reminders

export type LeadSource =
  | "usbizdata"      // Business database (millions)
  | "realtor"        // Realtor database (2.18M)
  | "consultant"     // CRM consultants
  | "solopreneur"    // Individual sales pros
  | "property";      // Property owners

export type BusinessLine =
  | "nextier"        // Nextier users
  | "outreachglobal" // OutreachGlobal white label
  | "ecbb";          // Exit/expansion blue collar

export interface CallQueueItem {
  id: string;
  leadId: string;
  leadName?: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;

  // Persona assignment
  persona: PersonaId;
  mode: PersonaMode;
  campaignLane: CampaignLane;

  // Queue details
  queueType: CallQueueType;
  status: "pending" | "in_progress" | "completed" | "failed" | "no_answer" | "skipped";
  priority: number; // 1-10, higher = more urgent
  scheduledAt?: Date;

  // Context
  leadSource: LeadSource;
  businessLine: BusinessLine;
  attempts: number;
  lastAttempt?: Date;
  notes?: string;
  tags: string[];

  // Outcomes
  outcome?: "connected" | "voicemail" | "no_answer" | "busy" | "wrong_number" | "booked" | "declined";
  duration?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AssistantModeState {
  persona: PersonaId;
  mode: "assistant";
  active: boolean;
  currentLead?: CallQueueItem;
  queuedLeads: number;
  completedToday: number;
  campaignLane: CampaignLane;
  voiceEnabled: boolean;

  // SignalHouse integration
  signalhouseSessionId?: string;
  twilioCallSid?: string;
}

// Persona to campaign lane mapping
const PERSONA_LANES: Record<PersonaId, CampaignLane[]> = {
  gianna: ["initial", "retarget", "follow_up", "nurture"],
  cathy: ["nudger", "retarget"],
  sabrina: ["follow_up", "book_appointment"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (Replace with DB/Redis in production)
// ═══════════════════════════════════════════════════════════════════════════════

const callQueue: Map<string, CallQueueItem> = new Map();
const assistantStates: Map<string, AssistantModeState> = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getNextLead(persona: PersonaId, campaignLane?: CampaignLane): CallQueueItem | null {
  const allowedLanes = campaignLane ? [campaignLane] : PERSONA_LANES[persona];
  const items = Array.from(callQueue.values());

  const nextLead = items
    .filter(item =>
      item.status === "pending" &&
      item.persona === persona &&
      allowedLanes.includes(item.campaignLane) &&
      (!item.scheduledAt || new Date(item.scheduledAt) <= new Date())
    )
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.scheduledAt && b.scheduledAt) {
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];

  return nextLead || null;
}

function getPersonaForLane(lane: CampaignLane): PersonaId {
  switch (lane) {
    case "initial":
    case "nurture":
      return "gianna";
    case "nudger":
      return "cathy";
    case "book_appointment":
      return "sabrina";
    case "retarget":
      return "gianna";
    case "follow_up":
      return "sabrina";
    default:
      return "gianna";
  }
}

function getPersonaScriptHint(persona: PersonaId, lead: CallQueueItem): string {
  const firstName = lead.leadName?.split(" ")[0] || "there";
  switch (persona) {
    case "gianna":
      return `Opening: "Hey ${firstName}, it's Gianna. Quick question - did you get a chance to see that ${lead.company ? "business valuation" : "property report"} I sent over?"`;
    case "cathy":
      return `Nudge: "${firstName}! It's Cathy. I've left a few messages - starting to feel like my mother-in-law trying to reach me. Got 2 minutes?"`;
    case "sabrina":
      return `Booking: "Hi ${firstName}, Sabrina here. You mentioned you wanted to talk through some options - I've got Tuesday at 2 or Wednesday at 10. Which works better?"`;
    default:
      return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Queue stats, list, next call, assistant state
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";
  const persona = searchParams.get("persona") as PersonaId | null;
  const lane = searchParams.get("lane") as CampaignLane | null;

  try {
    const items = Array.from(callQueue.values());

    switch (action) {
      case "stats": {
        const stats = {
          total: items.length,
          pending: items.filter((i) => i.status === "pending").length,
          inProgress: items.filter((i) => i.status === "in_progress").length,
          completed: items.filter((i) => i.status === "completed").length,
          failed: items.filter((i) => i.status === "failed").length,
          noAnswer: items.filter((i) => i.status === "no_answer").length,
          byPersona: {
            gianna: items.filter(i => i.persona === "gianna" && i.status === "pending").length,
            cathy: items.filter(i => i.persona === "cathy" && i.status === "pending").length,
            sabrina: items.filter(i => i.persona === "sabrina" && i.status === "pending").length,
          },
          byLane: {
            initial: items.filter(i => i.campaignLane === "initial" && i.status === "pending").length,
            retarget: items.filter(i => i.campaignLane === "retarget" && i.status === "pending").length,
            follow_up: items.filter(i => i.campaignLane === "follow_up" && i.status === "pending").length,
            book_appointment: items.filter(i => i.campaignLane === "book_appointment" && i.status === "pending").length,
            nurture: items.filter(i => i.campaignLane === "nurture" && i.status === "pending").length,
            nudger: items.filter(i => i.campaignLane === "nudger" && i.status === "pending").length,
          },
        };
        return NextResponse.json({ success: true, stats });
      }

      case "next": {
        if (!persona) {
          return NextResponse.json({ success: false, error: "persona required" }, { status: 400 });
        }

        const nextLead = getNextLead(persona, lane || undefined);
        if (!nextLead) {
          return NextResponse.json({
            success: true,
            nextCall: null,
            message: `No leads in queue for ${persona}${lane ? ` on ${lane} lane` : ""}`,
          });
        }

        return NextResponse.json({
          success: true,
          nextCall: nextLead,
          remaining: items.filter(i =>
            i.status === "pending" &&
            i.persona === persona &&
            (lane ? i.campaignLane === lane : PERSONA_LANES[persona].includes(i.campaignLane))
          ).length - 1,
        });
      }

      case "list": {
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "50");

        let filtered = items;
        if (status) {
          filtered = filtered.filter((i) => i.status === status);
        }
        if (persona) {
          filtered = filtered.filter((i) => i.persona === persona);
        }
        if (lane) {
          filtered = filtered.filter((i) => i.campaignLane === lane);
        }

        filtered.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return NextResponse.json({
          success: true,
          items: filtered.slice(0, limit),
          total: filtered.length,
        });
      }

      case "assistant-state": {
        if (!persona) {
          return NextResponse.json({ success: false, error: "persona required" }, { status: 400 });
        }

        const state = assistantStates.get(persona);
        const defaultLane = PERSONA_LANES[persona][0];

        return NextResponse.json({
          success: true,
          state: state || {
            persona,
            mode: "assistant",
            active: false,
            queuedLeads: items.filter(i => i.persona === persona && i.status === "pending").length,
            completedToday: 0,
            campaignLane: defaultLane,
            voiceEnabled: false,
          },
          allowedLanes: PERSONA_LANES[persona],
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Call Queue] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue info" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Add calls, start/stop assistant mode, next lead, initiate call
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // ═══════════════════════════════════════════════════════════════════════
      // ADD SINGLE LEAD TO QUEUE
      // ═══════════════════════════════════════════════════════════════════════
      case "add_single": {
        const {
          leadId,
          leadName,
          phone,
          email,
          company,
          address,
          persona = "gianna",
          campaignLane = "initial",
          queueType = "immediate",
          priority = 5,
          scheduledAt,
          leadSource = "usbizdata",
          businessLine = "nextier",
          tags = [],
        } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 },
          );
        }

        const id = generateId();
        const item: CallQueueItem = {
          id,
          leadId,
          leadName,
          phone,
          email,
          company,
          address,
          persona,
          mode: "assistant",
          campaignLane,
          queueType,
          status: "pending",
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          leadSource,
          businessLine,
          attempts: 0,
          tags,
          createdAt: new Date(),
        };

        callQueue.set(id, item);

        return NextResponse.json({
          success: true,
          callId: id,
          persona,
          campaignLane,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // ADD BATCH OF LEADS TO QUEUE
      // ═══════════════════════════════════════════════════════════════════════
      case "add_batch": {
        const {
          leads,
          persona = "gianna",
          campaignLane = "initial",
          queueType = "power_dial",
          priority = 5,
          scheduledAt,
          leadSource = "usbizdata",
          businessLine = "nextier",
        } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 },
          );
        }

        const results = {
          added: 0,
          skipped: 0,
          callIds: [] as string[],
        };

        for (const lead of leads) {
          if (!lead.phone) {
            results.skipped++;
            continue;
          }

          const id = generateId();
          const item: CallQueueItem = {
            id,
            leadId: lead.id || generateId(),
            leadName: lead.name,
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            address: lead.address,
            persona,
            mode: "assistant",
            campaignLane,
            queueType,
            status: "pending",
            priority: lead.score ? Math.min(10, Math.floor(lead.score / 10)) : priority,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            leadSource,
            businessLine,
            attempts: 0,
            tags: lead.tags || [],
            createdAt: new Date(),
          };

          callQueue.set(id, item);
          results.added++;
          results.callIds.push(id);
        }

        return NextResponse.json({
          success: true,
          ...results,
          persona,
          campaignLane,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // ADD FROM LUCY (Batch add from all campaign lanes)
      // ═══════════════════════════════════════════════════════════════════════
      case "add_from_lucy": {
        const { batches, leadSource = "usbizdata", businessLine = "nextier" } = body;

        if (!batches || typeof batches !== "object") {
          return NextResponse.json(
            { success: false, error: "batches object required" },
            { status: 400 },
          );
        }

        const results: Record<string, number> = {};

        for (const [lane, leads] of Object.entries(batches)) {
          if (!Array.isArray(leads)) continue;

          const persona = getPersonaForLane(lane as CampaignLane);

          for (const lead of leads as any[]) {
            if (!lead.phone && !lead.mobilePhone) continue;

            const id = generateId();
            const item: CallQueueItem = {
              id,
              leadId: lead.id || generateId(),
              leadName: lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
              phone: lead.phone || lead.mobilePhone,
              email: lead.email,
              company: lead.company || lead.businessName,
              address: lead.address,
              persona,
              mode: "assistant",
              campaignLane: lane as CampaignLane,
              queueType: "power_dial",
              status: "pending",
              priority: lead.score ? Math.min(10, Math.floor(lead.score / 10)) : 5,
              leadSource,
              businessLine,
              attempts: 0,
              tags: lead.tags || [],
              createdAt: new Date(),
            };

            callQueue.set(id, item);
            results[lane] = (results[lane] || 0) + 1;
          }
        }

        return NextResponse.json({
          success: true,
          message: "Leads added from LUCY preparation",
          results,
          totalAdded: Object.values(results).reduce((a, b) => a + b, 0),
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // START ASSISTANT MODE
      // ═══════════════════════════════════════════════════════════════════════
      case "start_assistant": {
        const { persona, campaignLane, voiceEnabled = true } = body;

        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const lane = campaignLane || PERSONA_LANES[persona as PersonaId][0];
        if (!PERSONA_LANES[persona as PersonaId].includes(lane)) {
          return NextResponse.json({
            success: false,
            error: `${persona} cannot work ${lane} lane. Allowed: ${PERSONA_LANES[persona as PersonaId].join(", ")}`,
          }, { status: 400 });
        }

        const items = Array.from(callQueue.values());
        const nextLead = getNextLead(persona, lane);

        const state: AssistantModeState = {
          persona,
          mode: "assistant",
          active: true,
          currentLead: nextLead || undefined,
          queuedLeads: items.filter(i =>
            i.persona === persona &&
            i.status === "pending" &&
            i.campaignLane === lane
          ).length,
          completedToday: items.filter(i =>
            i.persona === persona &&
            i.status === "completed" &&
            i.completedAt?.toDateString() === new Date().toDateString()
          ).length,
          campaignLane: lane,
          voiceEnabled,
        };

        // Mark current lead as in_progress
        if (nextLead) {
          nextLead.status = "in_progress";
          nextLead.lastAttempt = new Date();
          nextLead.attempts++;
          callQueue.set(nextLead.id, nextLead);
        }

        assistantStates.set(persona, state);

        return NextResponse.json({
          success: true,
          message: `${persona.toUpperCase()} assistant mode activated on ${lane} lane`,
          state,
          voicePrompt: nextLead
            ? `Ready to call ${nextLead.leadName || "lead"}${nextLead.company ? ` from ${nextLead.company}` : ""}. Say "call" to begin or "next" to skip.`
            : `No leads in ${lane} queue. Add leads or switch lanes.`,
          scriptHint: nextLead ? getPersonaScriptHint(persona, nextLead) : null,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // NEXT LEAD (User says "next lead" or clicks button)
      // ═══════════════════════════════════════════════════════════════════════
      case "next_lead": {
        const { persona, outcome, notes } = body;

        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const state = assistantStates.get(persona);
        if (!state || !state.active) {
          return NextResponse.json({
            success: false,
            error: "Assistant mode not active. Start it first.",
          }, { status: 400 });
        }

        // Complete current lead if exists
        if (state.currentLead) {
          const currentItem = callQueue.get(state.currentLead.id);
          if (currentItem) {
            currentItem.status = outcome === "skipped" ? "skipped" : "completed";
            currentItem.completedAt = new Date();
            currentItem.outcome = outcome || "connected";
            if (notes) currentItem.notes = notes;
            callQueue.set(currentItem.id, currentItem);
          }
          state.completedToday++;
        }

        // Get next lead
        const nextLead = getNextLead(persona, state.campaignLane);

        if (nextLead) {
          nextLead.status = "in_progress";
          nextLead.lastAttempt = new Date();
          nextLead.attempts++;
          callQueue.set(nextLead.id, nextLead);
          state.currentLead = nextLead;
          state.queuedLeads--;
        } else {
          state.currentLead = undefined;
        }

        assistantStates.set(persona, state);

        return NextResponse.json({
          success: true,
          state,
          voicePrompt: nextLead
            ? `Next up: ${nextLead.leadName || "lead"}${nextLead.company ? ` from ${nextLead.company}` : ""}. ${nextLead.attempts > 1 ? `Attempt ${nextLead.attempts}.` : ""} Say "call" to dial.`
            : `Queue empty for ${state.campaignLane} lane. ${state.completedToday} calls completed today.`,
          scriptHint: nextLead ? getPersonaScriptHint(persona, nextLead) : null,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // INITIATE CALL (SignalHouse/Twilio integration)
      // ═══════════════════════════════════════════════════════════════════════
      case "call": {
        const { persona } = body;

        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const state = assistantStates.get(persona);
        if (!state?.currentLead) {
          return NextResponse.json({
            success: false,
            error: "No current lead. Get next lead first.",
          }, { status: 400 });
        }

        const lead = state.currentLead;

        // TODO: Integrate with SignalHouse/Twilio for actual call
        // SignalHouse handles the infrastructure, we just send the request
        return NextResponse.json({
          success: true,
          message: `Initiating call to ${lead.leadName || "lead"} at ${lead.phone}`,
          callDetails: {
            leadId: lead.leadId,
            phone: lead.phone,
            persona,
            campaignLane: state.campaignLane,
            callSid: `SIGNALHOUSE_${Date.now()}`,
            status: "initiating",
          },
          voicePrompt: `Calling ${lead.leadName || "lead"}. I'll assist with the conversation. Say "hang up" to end or "next" when done.`,
          scriptHint: getPersonaScriptHint(persona, lead),
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STOP ASSISTANT MODE
      // ═══════════════════════════════════════════════════════════════════════
      case "stop_assistant": {
        const { persona } = body;

        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const state = assistantStates.get(persona);
        if (state) {
          state.active = false;
          state.currentLead = undefined;
          assistantStates.set(persona, state);
        }

        return NextResponse.json({
          success: true,
          message: `${persona.toUpperCase()} assistant mode deactivated`,
          stats: state ? {
            completedToday: state.completedToday,
            remainingInQueue: state.queuedLeads,
          } : null,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // SWITCH CAMPAIGN LANE
      // ═══════════════════════════════════════════════════════════════════════
      case "switch_lane": {
        const { persona, campaignLane } = body;

        if (!persona || !campaignLane) {
          return NextResponse.json(
            { success: false, error: "persona and campaignLane required" },
            { status: 400 },
          );
        }

        if (!PERSONA_LANES[persona as PersonaId].includes(campaignLane)) {
          return NextResponse.json({
            success: false,
            error: `${persona} cannot work ${campaignLane} lane. Allowed: ${PERSONA_LANES[persona as PersonaId].join(", ")}`,
          }, { status: 400 });
        }

        const state = assistantStates.get(persona);
        if (!state) {
          return NextResponse.json(
            { success: false, error: "Start assistant mode first" },
            { status: 400 },
          );
        }

        const items = Array.from(callQueue.values());
        state.campaignLane = campaignLane;
        state.queuedLeads = items.filter(i =>
          i.persona === persona &&
          i.status === "pending" &&
          i.campaignLane === campaignLane
        ).length;

        const nextLead = getNextLead(persona, campaignLane);
        if (nextLead) {
          nextLead.status = "in_progress";
          nextLead.lastAttempt = new Date();
          nextLead.attempts++;
          callQueue.set(nextLead.id, nextLead);
        }
        state.currentLead = nextLead || undefined;

        assistantStates.set(persona, state);

        return NextResponse.json({
          success: true,
          message: `Switched to ${campaignLane} lane`,
          state,
          voicePrompt: nextLead
            ? `Now on ${campaignLane}. First lead: ${nextLead.leadName || "lead"}. ${state.queuedLeads} total in queue.`
            : `${campaignLane} lane is empty. Switch lanes or add leads.`,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // LEGACY ACTIONS (backwards compatibility)
      // ═══════════════════════════════════════════════════════════════════════
      case "start_call": {
        const { callId } = body;

        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const item = callQueue.get(callId);
        if (!item) {
          return NextResponse.json(
            { success: false, error: "Call not found" },
            { status: 404 },
          );
        }

        item.status = "in_progress";
        item.attempts++;
        item.lastAttempt = new Date();
        callQueue.set(callId, item);

        return NextResponse.json({
          success: true,
          call: item,
        });
      }

      case "complete_call": {
        const { callId, outcome, notes, duration } = body;

        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const item = callQueue.get(callId);
        if (!item) {
          return NextResponse.json(
            { success: false, error: "Call not found" },
            { status: 404 },
          );
        }

        item.status = outcome === "no_answer" ? "no_answer" : "completed";
        item.outcome = outcome;
        item.notes = notes;
        item.duration = duration;
        item.completedAt = new Date();
        callQueue.set(callId, item);

        return NextResponse.json({
          success: true,
          call: item,
        });
      }

      case "reschedule": {
        const { callId, scheduledAt } = body;

        if (!callId || !scheduledAt) {
          return NextResponse.json(
            { success: false, error: "callId and scheduledAt required" },
            { status: 400 },
          );
        }

        const item = callQueue.get(callId);
        if (!item) {
          return NextResponse.json(
            { success: false, error: "Call not found" },
            { status: 404 },
          );
        }

        item.status = "pending";
        item.scheduledAt = new Date(scheduledAt);
        callQueue.set(callId, item);

        return NextResponse.json({
          success: true,
          call: item,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Call Queue] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Remove calls from queue
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, callId, leadId, persona, campaignLane } = body;

    switch (action) {
      case "remove": {
        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const deleted = callQueue.delete(callId);
        return NextResponse.json({
          success: deleted,
          message: deleted ? "Call removed" : "Call not found",
        });
      }

      case "remove_lead": {
        if (!leadId) {
          return NextResponse.json(
            { success: false, error: "leadId required" },
            { status: 400 },
          );
        }

        let removed = 0;
        for (const [id, item] of callQueue) {
          if (item.leadId === leadId && item.status === "pending") {
            callQueue.delete(id);
            removed++;
          }
        }

        return NextResponse.json({
          success: true,
          removed,
        });
      }

      case "clear_completed": {
        let removed = 0;
        for (const [id, item] of callQueue) {
          if (item.status === "completed") {
            callQueue.delete(id);
            removed++;
          }
        }

        return NextResponse.json({
          success: true,
          removed,
        });
      }

      case "clear_persona": {
        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        let removed = 0;
        for (const [id, item] of callQueue) {
          if (item.persona === persona && item.status === "pending") {
            if (!campaignLane || item.campaignLane === campaignLane) {
              callQueue.delete(id);
              removed++;
            }
          }
        }

        return NextResponse.json({
          success: true,
          removed,
          persona,
          campaignLane: campaignLane || "all",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Call Queue] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}
