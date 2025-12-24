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
import { redis, isRedisAvailable } from "@/lib/redis";
import { db } from "@/lib/db";
import { callHistories } from "@/lib/db/schema";

// Twilio credentials for server-initiated calls
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextier.ai";

// Redis keys for Call Queue persistence
const CALL_QUEUE_KEY = "call:queue";
const CALL_STATES_KEY = "call:assistant_states";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PersonaId = "gianna" | "cathy" | "sabrina";

export type CallQueueType =
  | "immediate" // Call right now
  | "scheduled" // Scheduled for specific time
  | "follow_up" // Follow-up call
  | "callback" // Lead requested callback
  | "power_dial"; // Power dialer batch

export type PersonaMode =
  | "assistant" // Hands-free, user directs via voice/command
  | "inbound"; // Responding to inbound messages/calls

export type CampaignLane =
  | "initial" // GIANNA - First contact
  | "retarget" // GIANNA/CATHY - Re-engagement
  | "follow_up" // GIANNA/SABRINA - Following up
  | "book_appointment" // SABRINA - Booking calls
  | "nurture" // GIANNA - Long-term
  | "nudger"; // CATHY - Gentle reminders

export type LeadSource =
  | "usbizdata" // Business database (millions)
  | "realtor" // Realtor database (2.18M)
  | "consultant" // CRM consultants
  | "solopreneur" // Individual sales pros
  | "property"; // Property owners

export type BusinessLine =
  | "nextier" // Nextier users
  | "outreachglobal" // OutreachGlobal white label
  | "ecbb"; // Exit/expansion blue collar

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
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "failed"
    | "no_answer"
    | "skipped";
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
  outcome?:
    | "connected"
    | "voicemail"
    | "no_answer"
    | "busy"
    | "wrong_number"
    | "booked"
    | "declined";
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
// REDIS-BACKED STORAGE (with in-memory fallback)
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory fallback (used when Redis unavailable)
let callQueueMemory: Map<string, CallQueueItem> = new Map();
let assistantStatesMemory: Map<string, AssistantModeState> = new Map();
let redisAvailable = false;
let initialized = false;

// Initialize from Redis
async function initializeFromRedis(): Promise<void> {
  if (initialized) return;

  try {
    redisAvailable = isRedisAvailable();
    if (!redisAvailable) {
      console.log("[CallQueue] Redis not available, using in-memory");
      initialized = true;
      return;
    }

    // Load call queue from Redis
    const queueData = await redis.get<string>(CALL_QUEUE_KEY);
    if (queueData) {
      const parsed =
        typeof queueData === "string" ? JSON.parse(queueData) : queueData;
      if (Array.isArray(parsed)) {
        callQueueMemory = new Map(
          parsed.map((item: CallQueueItem) => [
            item.id,
            {
              ...item,
              createdAt: new Date(item.createdAt),
              scheduledAt: item.scheduledAt
                ? new Date(item.scheduledAt)
                : undefined,
              lastAttempt: item.lastAttempt
                ? new Date(item.lastAttempt)
                : undefined,
              completedAt: item.completedAt
                ? new Date(item.completedAt)
                : undefined,
            },
          ]),
        );
        console.log(
          `[CallQueue] Loaded ${callQueueMemory.size} calls from Redis`,
        );
      }
    }

    // Load assistant states from Redis
    const statesData = await redis.get<string>(CALL_STATES_KEY);
    if (statesData) {
      const parsed =
        typeof statesData === "string" ? JSON.parse(statesData) : statesData;
      if (Array.isArray(parsed)) {
        assistantStatesMemory = new Map(
          parsed.map((item: [string, AssistantModeState]) => item),
        );
        console.log(
          `[CallQueue] Loaded ${assistantStatesMemory.size} assistant states from Redis`,
        );
      }
    }

    initialized = true;
  } catch (error) {
    console.error("[CallQueue] Redis init error:", error);
    redisAvailable = false;
    initialized = true;
  }
}

// Persist call queue to Redis
async function persistQueue(): Promise<void> {
  if (!redisAvailable) return;
  try {
    const data = Array.from(callQueueMemory.entries()).map(([, v]) => v);
    await redis.set(CALL_QUEUE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("[CallQueue] Failed to persist queue:", error);
  }
}

// Persist assistant states to Redis
async function persistStates(): Promise<void> {
  if (!redisAvailable) return;
  try {
    const data = Array.from(assistantStatesMemory.entries());
    await redis.set(CALL_STATES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("[CallQueue] Failed to persist states:", error);
  }
}

// Getter for call queue (ensures initialization)
async function getCallQueue(): Promise<Map<string, CallQueueItem>> {
  await initializeFromRedis();
  return callQueueMemory;
}

// Getter for assistant states (ensures initialization)
async function getAssistantStates(): Promise<Map<string, AssistantModeState>> {
  await initializeFromRedis();
  return assistantStatesMemory;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Lead Priority Hierarchy
 * ───────────────────────────────────────────────────────────────────────────
 *
 * GREEN (Responded) = 3x Priority Boost - HOTTEST LEADS
 *   → Lead called back, replied to SMS, or engaged with content
 *   → These are ready to close - call immediately!
 *
 * GOLD = 2x Priority Boost
 *   → Skip Traced (validated via USBizData)
 *   → Mobile Captured (contactable by phone)
 *   → Email Captured (contactable by email)
 *
 * Standard = 1x (base priority)
 *   → Raw leads without enrichment
 *
 * Visual in Inbox:
 *   - Green tag = responded (highest priority)
 *   - Gold tag = fully contactable
 */
function getEffectivePriority(item: CallQueueItem): number {
  const tags = item.tags?.map((t) => t.toLowerCase()) || [];

  // GREEN = Responded leads get 3x priority (HOTTEST - call immediately)
  const hasResponded = tags.includes("responded") || tags.includes("green");
  if (hasResponded) {
    return item.priority * 3;
  }

  // GOLD = Skip traced + Mobile + Email = 2x priority
  const hasGold = tags.includes("gold");
  const hasFullContact = item.phone && item.email;
  if (hasGold || hasFullContact) {
    return item.priority * 2;
  }

  // Standard priority
  return item.priority;
}

async function getNextLead(
  persona: PersonaId,
  campaignLane?: CampaignLane,
): Promise<CallQueueItem | null> {
  const allowedLanes = campaignLane ? [campaignLane] : PERSONA_LANES[persona];
  const callQueue = await getCallQueue();
  const items = Array.from(callQueue.values());

  const nextLead = items
    .filter(
      (item) =>
        item.status === "pending" &&
        item.persona === persona &&
        allowedLanes.includes(item.campaignLane) &&
        (!item.scheduledAt || new Date(item.scheduledAt) <= new Date()),
    )
    .sort((a, b) => {
      // GOLD labels get 100% priority boost
      const priorityA = getEffectivePriority(a);
      const priorityB = getEffectivePriority(b);
      if (priorityB !== priorityA) return priorityB - priorityA;
      // Then by scheduled time
      if (a.scheduledAt && b.scheduledAt) {
        return (
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      }
      // Then by creation time (FIFO)
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
// TWILIO CALL INITIATION
// ═══════════════════════════════════════════════════════════════════════════════

interface TwilioCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

async function initiateTwilioCall(
  toNumber: string,
  leadId: string,
  persona: PersonaId,
  teamId?: string,
): Promise<TwilioCallResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    // Format phone number
    const formattedTo = toNumber.startsWith("+") ? toNumber : `+1${toNumber.replace(/\D/g, "")}`;

    // Twilio REST API to initiate outbound call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

    // TwiML URL for call handling - connects to browser client
    const twimlUrl = `${BASE_URL}/api/webhook/twilio/outbound?leadId=${leadId}&persona=${persona}`;

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: TWILIO_PHONE_NUMBER,
        Url: twimlUrl,
        StatusCallback: `${BASE_URL}/api/webhook/twilio`,
        StatusCallbackEvent: "initiated ringing answered completed",
      }).toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[CallQueue] Twilio error:", result);
      return { success: false, error: result.message || "Call failed" };
    }

    // Log call to database
    try {
      await db.insert(callHistories).values({
        id: crypto.randomUUID(),
        teamId: teamId || "default",
        leadId,
        direction: "outbound",
        fromNumber: TWILIO_PHONE_NUMBER,
        toNumber: formattedTo,
        status: "initiated",
        twilioSid: result.sid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dbError) {
      console.error("[CallQueue] DB insert error:", dbError);
    }

    return { success: true, callSid: result.sid };
  } catch (error) {
    console.error("[CallQueue] Call initiation error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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
    const callQueue = await getCallQueue();
    const assistantStates = await getAssistantStates();
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
            gianna: items.filter(
              (i) => i.persona === "gianna" && i.status === "pending",
            ).length,
            cathy: items.filter(
              (i) => i.persona === "cathy" && i.status === "pending",
            ).length,
            sabrina: items.filter(
              (i) => i.persona === "sabrina" && i.status === "pending",
            ).length,
          },
          byLane: {
            initial: items.filter(
              (i) => i.campaignLane === "initial" && i.status === "pending",
            ).length,
            retarget: items.filter(
              (i) => i.campaignLane === "retarget" && i.status === "pending",
            ).length,
            follow_up: items.filter(
              (i) => i.campaignLane === "follow_up" && i.status === "pending",
            ).length,
            book_appointment: items.filter(
              (i) =>
                i.campaignLane === "book_appointment" && i.status === "pending",
            ).length,
            nurture: items.filter(
              (i) => i.campaignLane === "nurture" && i.status === "pending",
            ).length,
            nudger: items.filter(
              (i) => i.campaignLane === "nudger" && i.status === "pending",
            ).length,
          },
        };
        return NextResponse.json({ success: true, stats });
      }

      case "next": {
        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const nextLead = await getNextLead(persona, lane || undefined);
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
          remaining:
            items.filter(
              (i) =>
                i.status === "pending" &&
                i.persona === persona &&
                (lane
                  ? i.campaignLane === lane
                  : PERSONA_LANES[persona].includes(i.campaignLane)),
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
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        return NextResponse.json({
          success: true,
          items: filtered.slice(0, limit),
          total: filtered.length,
        });
      }

      case "assistant-state": {
        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const state = assistantStates.get(persona);
        const defaultLane = PERSONA_LANES[persona][0];

        return NextResponse.json({
          success: true,
          state: state || {
            persona,
            mode: "assistant",
            active: false,
            queuedLeads: items.filter(
              (i) => i.persona === persona && i.status === "pending",
            ).length,
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

        const callQueue = await getCallQueue();
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
        await persistQueue();

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

        const callQueue = await getCallQueue();
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
            priority: lead.score
              ? Math.min(10, Math.floor(lead.score / 10))
              : priority,
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

        await persistQueue();

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
        const {
          batches,
          leadSource = "usbizdata",
          businessLine = "nextier",
        } = body;

        if (!batches || typeof batches !== "object") {
          return NextResponse.json(
            { success: false, error: "batches object required" },
            { status: 400 },
          );
        }

        const callQueue = await getCallQueue();
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
              leadName:
                lead.name ||
                `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
              phone: lead.phone || lead.mobilePhone,
              email: lead.email,
              company: lead.company || lead.businessName,
              address: lead.address,
              persona,
              mode: "assistant",
              campaignLane: lane as CampaignLane,
              queueType: "power_dial",
              status: "pending",
              priority: lead.score
                ? Math.min(10, Math.floor(lead.score / 10))
                : 5,
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

        await persistQueue();

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
          return NextResponse.json(
            {
              success: false,
              error: `${persona} cannot work ${lane} lane. Allowed: ${PERSONA_LANES[persona as PersonaId].join(", ")}`,
            },
            { status: 400 },
          );
        }

        const callQueue = await getCallQueue();
        const assistantStates = await getAssistantStates();
        const items = Array.from(callQueue.values());
        const nextLead = await getNextLead(persona, lane);

        const state: AssistantModeState = {
          persona,
          mode: "assistant",
          active: true,
          currentLead: nextLead || undefined,
          queuedLeads: items.filter(
            (i) =>
              i.persona === persona &&
              i.status === "pending" &&
              i.campaignLane === lane,
          ).length,
          completedToday: items.filter(
            (i) =>
              i.persona === persona &&
              i.status === "completed" &&
              i.completedAt?.toDateString() === new Date().toDateString(),
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
          await persistQueue();
        }

        assistantStates.set(persona, state);
        await persistStates();

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

        const callQueue = await getCallQueue();
        const assistantStates = await getAssistantStates();
        const state = assistantStates.get(persona);
        if (!state || !state.active) {
          return NextResponse.json(
            {
              success: false,
              error: "Assistant mode not active. Start it first.",
            },
            { status: 400 },
          );
        }

        // Complete current lead if exists
        if (state.currentLead) {
          const currentItem = callQueue.get(state.currentLead.id);
          if (currentItem) {
            currentItem.status =
              outcome === "skipped" ? "skipped" : "completed";
            currentItem.completedAt = new Date();
            currentItem.outcome = outcome || "connected";
            if (notes) currentItem.notes = notes;
            callQueue.set(currentItem.id, currentItem);
          }
          state.completedToday++;
        }

        // Get next lead
        const nextLead = await getNextLead(persona, state.campaignLane);

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
        await persistQueue();
        await persistStates();

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
      // INITIATE CALL (Twilio integration - Phone only, no SMS)
      // ═══════════════════════════════════════════════════════════════════════
      case "call": {
        const { persona, teamId } = body;

        if (!persona) {
          return NextResponse.json(
            { success: false, error: "persona required" },
            { status: 400 },
          );
        }

        const assistantStates = await getAssistantStates();
        const callQueue = await getCallQueue();
        const state = assistantStates.get(persona);
        if (!state?.currentLead) {
          return NextResponse.json(
            {
              success: false,
              error: "No current lead. Get next lead first.",
            },
            { status: 400 },
          );
        }

        const lead = state.currentLead;

        // Initiate actual Twilio call
        const callResult = await initiateTwilioCall(
          lead.phone,
          lead.leadId,
          persona,
          teamId,
        );

        if (!callResult.success) {
          return NextResponse.json({
            success: false,
            error: callResult.error,
            message: `Failed to call ${lead.leadName || "lead"}`,
          }, { status: 500 });
        }

        // Update queue item with Twilio SID
        const queueItem = callQueue.get(lead.id);
        if (queueItem) {
          queueItem.status = "in_progress";
          callQueue.set(lead.id, queueItem);
          await persistQueue();
        }

        // Update assistant state with call SID
        state.twilioCallSid = callResult.callSid;
        assistantStates.set(persona, state);
        await persistStates();

        return NextResponse.json({
          success: true,
          message: `Calling ${lead.leadName || "lead"} at ${lead.phone}`,
          callDetails: {
            leadId: lead.leadId,
            phone: lead.phone,
            persona,
            campaignLane: state.campaignLane,
            callSid: callResult.callSid,
            status: "initiated",
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

        const assistantStates = await getAssistantStates();
        const state = assistantStates.get(persona);
        if (state) {
          state.active = false;
          state.currentLead = undefined;
          assistantStates.set(persona, state);
          await persistStates();
        }

        return NextResponse.json({
          success: true,
          message: `${persona.toUpperCase()} assistant mode deactivated`,
          stats: state
            ? {
                completedToday: state.completedToday,
                remainingInQueue: state.queuedLeads,
              }
            : null,
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
          return NextResponse.json(
            {
              success: false,
              error: `${persona} cannot work ${campaignLane} lane. Allowed: ${PERSONA_LANES[persona as PersonaId].join(", ")}`,
            },
            { status: 400 },
          );
        }

        const callQueue = await getCallQueue();
        const assistantStates = await getAssistantStates();
        const state = assistantStates.get(persona);
        if (!state) {
          return NextResponse.json(
            { success: false, error: "Start assistant mode first" },
            { status: 400 },
          );
        }

        const items = Array.from(callQueue.values());
        state.campaignLane = campaignLane;
        state.queuedLeads = items.filter(
          (i) =>
            i.persona === persona &&
            i.status === "pending" &&
            i.campaignLane === campaignLane,
        ).length;

        const nextLead = await getNextLead(persona, campaignLane);
        if (nextLead) {
          nextLead.status = "in_progress";
          nextLead.lastAttempt = new Date();
          nextLead.attempts++;
          callQueue.set(nextLead.id, nextLead);
        }
        state.currentLead = nextLead || undefined;

        assistantStates.set(persona, state);
        await persistQueue();
        await persistStates();

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

        const callQueue = await getCallQueue();
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
        await persistQueue();

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

        const callQueue = await getCallQueue();
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
        await persistQueue();

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

        const callQueue = await getCallQueue();
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
        await persistQueue();

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
    const callQueue = await getCallQueue();

    switch (action) {
      case "remove": {
        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const deleted = callQueue.delete(callId);
        if (deleted) await persistQueue();
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

        if (removed > 0) await persistQueue();
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

        if (removed > 0) await persistQueue();
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

        if (removed > 0) await persistQueue();
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
