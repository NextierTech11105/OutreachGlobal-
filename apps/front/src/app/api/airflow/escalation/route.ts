/**
 * Airflow Escalation API Routes
 * Called by gianna_escalation_dag.py for lead management
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo - replace with actual DB
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

const escalationLeads = new Map<string, EscalationLead>();
const dailyStats: DailyStats = {
  date: new Date().toISOString().split("T")[0],
  sent_today: 0,
  failed_today: 0,
  responses_today: 0,
};

// Reset daily stats at midnight
function checkResetDailyStats() {
  const today = new Date().toISOString().split("T")[0];
  if (dailyStats.date !== today) {
    dailyStats.date = today;
    dailyStats.sent_today = 0;
    dailyStats.failed_today = 0;
    dailyStats.responses_today = 0;
  }
}

// GET /api/airflow/escalation
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "due";

    checkResetDailyStats();

    switch (action) {
      case "due":
        return handleGetDue(url.searchParams);
      case "daily-stats":
        return handleDailyStats();
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

    checkResetDailyStats();

    switch (action) {
      case "update-states":
        return handleUpdateStates(body);
      case "pause":
        return handlePause(body);
      case "flag-hot":
        return handleFlagHot(body);
      case "add-lead":
        return handleAddLead(body);
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

async function handleGetDue(params: URLSearchParams) {
  const limit = parseInt(params.get("limit") || "50");
  const minHours = parseInt(params.get("min_hours") || "24");
  const now = new Date();

  // Find leads due for escalation
  const dueLeads: EscalationLead[] = [];

  escalationLeads.forEach((lead) => {
    // Skip paused leads
    if (lead.escalation_paused) return;

    // Skip leads at max steps
    if (lead.escalation_step >= 10) return;

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
  });

  // Sort by escalation step (lower first) and limit
  dueLeads.sort((a, b) => a.escalation_step - b.escalation_step);
  const limited = dueLeads.slice(0, limit);

  console.log(`[Airflow Escalation] Found ${limited.length} leads due (of ${dueLeads.length} total)`);

  return NextResponse.json({
    leads: limited,
    total_due: dueLeads.length,
  });
}

async function handleDailyStats() {
  return NextResponse.json(dailyStats);
}

async function handleGetResponses(params: URLSearchParams) {
  const sinceHours = parseInt(params.get("since_hours") || "1");
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  // In production, query message responses from DB
  // For demo, return empty array
  const responses: any[] = [];

  return NextResponse.json({
    responses,
    count: responses.length,
  });
}

async function handleUpdateStates(body: {
  updates: Array<{
    lead_id: string;
    escalation_step: number;
    next_escalation_at?: string | null;
    escalation_paused?: boolean;
    pause_reason?: string;
  }>;
}) {
  const { updates } = body;

  if (!updates || !Array.isArray(updates)) {
    return NextResponse.json({ error: "Updates array required" }, { status: 400 });
  }

  let updated = 0;

  for (const update of updates) {
    const lead = escalationLeads.get(update.lead_id);
    if (lead) {
      lead.escalation_step = update.escalation_step;
      lead.next_escalation_at = update.next_escalation_at || null;
      lead.escalation_paused = update.escalation_paused || false;
      lead.pause_reason = update.pause_reason;
      lead.updated_at = new Date().toISOString();
      updated++;
    }
  }

  // Update daily stats
  dailyStats.sent_today += updates.length;

  console.log(`[Airflow Escalation] Updated ${updated} lead states`);

  return NextResponse.json({
    success: true,
    updated,
  });
}

async function handlePause(body: { lead_id: string; reason: string }) {
  const { lead_id, reason } = body;

  const lead = escalationLeads.get(lead_id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  lead.escalation_paused = true;
  lead.pause_reason = reason;
  lead.updated_at = new Date().toISOString();

  console.log(`[Airflow Escalation] Paused lead ${lead_id}: ${reason}`);

  return NextResponse.json({
    success: true,
    lead_id,
    reason,
  });
}

async function handleFlagHot(body: { lead_id: string; response: string }) {
  const { lead_id, response } = body;

  const lead = escalationLeads.get(lead_id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  lead.is_hot = true;
  lead.last_response = response;
  lead.updated_at = new Date().toISOString();

  console.log(`[Airflow Escalation] Flagged lead ${lead_id} as HOT`);

  return NextResponse.json({
    success: true,
    lead_id,
    is_hot: true,
  });
}

async function handleAddLead(body: {
  id?: string;
  name: string;
  phone: string;
  company?: string;
  property_address?: string;
}) {
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

  escalationLeads.set(id, lead);

  console.log(`[Airflow Escalation] Added lead ${id} to escalation queue`);

  return NextResponse.json({
    success: true,
    lead,
  });
}
