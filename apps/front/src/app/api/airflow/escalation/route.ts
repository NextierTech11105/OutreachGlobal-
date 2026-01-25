/**
 * Airflow Escalation API Routes
 * Called by gianna_escalation_dag.py for lead management
 *
 * Uses appState table for persistence.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appState } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface EscalationLead {
  id: string;
  name: string;
  phone: string;
  company: string;
  property_address: string;
  escalation_step: number;
  next_escalation_at: string | null;
  escalation_paused: boolean;
  pause_reason?: string;
  message_history: string[];
  last_response?: string;
  is_hot: boolean;
  created_at: string;
  updated_at: string;
}

interface DailyStats {
  date: string;
  sent_today: number;
  failed_today: number;
  responses_today: number;
}

// Helper to get daily stats from database
async function getDailyStats(teamId: string = "default"): Promise<DailyStats> {
  const today = new Date().toISOString().split("T")[0];
  const key = `escalation_daily_stats:${today}`;

  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (state?.value) {
    return state.value as DailyStats;
  }

  return {
    date: today,
    sent_today: 0,
    failed_today: 0,
    responses_today: 0,
  };
}

// Helper to save daily stats
async function saveDailyStats(
  teamId: string = "default",
  stats: DailyStats
): Promise<void> {
  const key = `escalation_daily_stats:${stats.date}`;

  const [existing] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: stats, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      key,
      value: stats,
    });
  }
}

// Helper to get escalation lead
async function getEscalationLead(
  leadId: string,
  teamId: string = "default"
): Promise<EscalationLead | null> {
  const key = `escalation_lead:${leadId}`;

  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  return state?.value as EscalationLead | null;
}

// Helper to save escalation lead
async function saveEscalationLead(
  lead: EscalationLead,
  teamId: string = "default"
): Promise<void> {
  const key = `escalation_lead:${lead.id}`;

  const [existing] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: lead, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      key,
      value: lead,
    });
  }
}

// GET /api/airflow/escalation
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "due";
    const teamId = url.searchParams.get("teamId") || "default";

    switch (action) {
      case "due":
        return handleGetDue(url.searchParams, teamId);
      case "daily-stats":
        return handleDailyStats(teamId);
      case "responses":
        return handleGetResponses(url.searchParams);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow Escalation] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/airflow/escalation
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "update-states";
    const body = await request.json();
    const teamId = body.teamId || "default";

    switch (action) {
      case "update-states":
        return handleUpdateStates(body, teamId);
      case "pause":
        return handlePause(body, teamId);
      case "flag-hot":
        return handleFlagHot(body, teamId);
      case "add-lead":
        return handleAddLead(body, teamId);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow Escalation] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleGetDue(params: URLSearchParams, teamId: string) {
  const limit = parseInt(params.get("limit") || "50");
  const now = new Date();

  // Get all escalation leads from database
  const allStates = await db
    .select()
    .from(appState)
    .where(eq(appState.teamId, teamId));

  const escalationLeads = allStates
    .filter((s) => s.key.startsWith("escalation_lead:") && s.value)
    .map((s) => s.value as EscalationLead);

  // Find leads due for escalation
  const dueLeads: EscalationLead[] = [];

  for (const lead of escalationLeads) {
    // Skip paused leads
    if (lead.escalation_paused) continue;

    // Skip leads at max steps
    if (lead.escalation_step >= 10) continue;

    // Check if due
    if (lead.next_escalation_at) {
      const nextTime = new Date(lead.next_escalation_at);
      if (nextTime <= now) {
        dueLeads.push(lead);
      }
    } else if (lead.escalation_step === 0) {
      // New leads with no escalation yet
      dueLeads.push(lead);
    }
  }

  // Sort by escalation step (lower first) and limit
  dueLeads.sort((a, b) => a.escalation_step - b.escalation_step);
  const limited = dueLeads.slice(0, limit);

  console.log(
    `[Airflow Escalation] Found ${limited.length} leads due (of ${dueLeads.length} total)`
  );

  return NextResponse.json({
    leads: limited,
    total_due: dueLeads.length,
  });
}

async function handleDailyStats(teamId: string) {
  const stats = await getDailyStats(teamId);
  return NextResponse.json(stats);
}

async function handleGetResponses(params: URLSearchParams) {
  // In production, query message responses from DB
  const responses: unknown[] = [];

  return NextResponse.json({
    responses,
    count: responses.length,
  });
}

async function handleUpdateStates(
  body: {
    updates: Array<{
      lead_id: string;
      escalation_step: number;
      next_escalation_at?: string | null;
      escalation_paused?: boolean;
      pause_reason?: string;
    }>;
  },
  teamId: string
) {
  const { updates } = body;

  if (!updates || !Array.isArray(updates)) {
    return NextResponse.json(
      { error: "Updates array required" },
      { status: 400 }
    );
  }

  let updated = 0;

  for (const update of updates) {
    const lead = await getEscalationLead(update.lead_id, teamId);
    if (lead) {
      lead.escalation_step = update.escalation_step;
      lead.next_escalation_at = update.next_escalation_at || null;
      lead.escalation_paused = update.escalation_paused || false;
      lead.pause_reason = update.pause_reason;
      lead.updated_at = new Date().toISOString();
      await saveEscalationLead(lead, teamId);
      updated++;
    }
  }

  // Update daily stats
  const stats = await getDailyStats(teamId);
  stats.sent_today += updates.length;
  await saveDailyStats(teamId, stats);

  console.log(`[Airflow Escalation] Updated ${updated} lead states`);

  return NextResponse.json({
    success: true,
    updated,
  });
}

async function handlePause(
  body: { lead_id: string; reason: string },
  teamId: string
) {
  const { lead_id, reason } = body;

  const lead = await getEscalationLead(lead_id, teamId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  lead.escalation_paused = true;
  lead.pause_reason = reason;
  lead.updated_at = new Date().toISOString();
  await saveEscalationLead(lead, teamId);

  console.log(`[Airflow Escalation] Paused lead ${lead_id}: ${reason}`);

  return NextResponse.json({
    success: true,
    lead_id,
    reason,
  });
}

async function handleFlagHot(
  body: { lead_id: string; response: string },
  teamId: string
) {
  const { lead_id, response } = body;

  const lead = await getEscalationLead(lead_id, teamId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  lead.is_hot = true;
  lead.last_response = response;
  lead.updated_at = new Date().toISOString();
  await saveEscalationLead(lead, teamId);

  console.log(`[Airflow Escalation] Flagged lead ${lead_id} as HOT`);

  return NextResponse.json({
    success: true,
    lead_id,
    is_hot: true,
  });
}

async function handleAddLead(
  body: {
    id?: string;
    name: string;
    phone: string;
    company?: string;
    property_address?: string;
  },
  teamId: string
) {
  const id = body.id || `lead_${Date.now()}`;

  const lead: EscalationLead = {
    id,
    name: body.name,
    phone: body.phone,
    company: body.company || "",
    property_address: body.property_address || "",
    escalation_step: 0,
    next_escalation_at: new Date().toISOString(), // Start immediately
    escalation_paused: false,
    message_history: [],
    is_hot: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await saveEscalationLead(lead, teamId);

  console.log(`[Airflow Escalation] Added lead ${id} to escalation queue`);

  return NextResponse.json({
    success: true,
    lead,
  });
}
