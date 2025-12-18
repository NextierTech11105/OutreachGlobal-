/**
 * LUCI → Call Center Queue Push Endpoint
 *
 * Connects LUCI (data lake) to the power dialer queue.
 * Used by Sectors page to push leads to call queue.
 *
 * Flow:
 * 1. Sectors page selects leads with phones
 * 2. This endpoint adds them to call queue
 * 3. Power dialer loads leads for calling
 */

import { NextRequest, NextResponse } from "next/server";

// Import in-memory queue from call-center (would be shared service in production)
interface CallQueueItem {
  id: string;
  leadId: string;
  leadName?: string;
  phone: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  industry?: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "no_answer";
  priority: number;
  scheduledAt?: Date;
  attempts: number;
  lastAttempt?: Date;
  notes?: string;
  source?: string;
  tags?: string[];
  createdAt: Date;
}

// Global call queue (shared with call-center/queue)
declare global {
  var __callQueue: Map<string, CallQueueItem> | undefined;
}

function getCallQueue(): Map<string, CallQueueItem> {
  if (!globalThis.__callQueue) {
    globalThis.__callQueue = new Map();
  }
  return globalThis.__callQueue;
}

interface PhoneWithType {
  number: string;
  type?: string;
}

interface LeadForDialer {
  id: string;
  name?: string;
  contactName?: string;
  companyName?: string;
  phone?: string;
  mobilePhone?: string;
  enrichedPhones?: PhoneWithType[];
  address?: string;
  city?: string;
  state?: string;
  industry?: string;
  isDecisionMaker?: boolean;
}

interface PushToDialerRequest {
  leads: LeadForDialer[];
  campaignId?: string;
  campaignName?: string;
  priority?: number;
  scheduledAt?: string;
  source?: string;
  tags?: string[];
}

// Helper: Get best phone from lead (any phone for calls, not just mobile)
function getBestPhone(lead: LeadForDialer): string | null {
  // For calls, any phone works - prioritize in order
  if (lead.mobilePhone) return lead.mobilePhone;
  if (lead.enrichedPhones?.length) return lead.enrichedPhones[0].number;
  return lead.phone || null;
}

export async function POST(request: NextRequest) {
  try {
    const body: PushToDialerRequest = await request.json();
    const {
      leads,
      campaignId,
      campaignName,
      priority = 5,
      scheduledAt,
      source,
      tags = [],
    } = body;

    // Validate
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: "leads array is required" },
        { status: 400 },
      );
    }

    // Filter leads with valid phone numbers
    const leadsWithPhones = leads.filter((lead) => getBestPhone(lead));

    if (leadsWithPhones.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No leads with valid phone numbers",
          totalLeads: leads.length,
        },
        { status: 400 },
      );
    }

    console.log(
      `[LUCI Push Dialer] Processing ${leadsWithPhones.length} leads for call queue`,
    );

    const callQueue = getCallQueue();
    const results = {
      added: 0,
      skipped: 0,
      callIds: [] as string[],
    };

    // Add leads to call queue
    for (const lead of leadsWithPhones) {
      const phone = getBestPhone(lead)!;

      // Check for duplicates (same phone in pending status)
      const existingCall = Array.from(callQueue.values()).find(
        (c) =>
          c.phone === phone && c.status === "pending" && c.leadId === lead.id,
      );

      if (existingCall) {
        results.skipped++;
        continue;
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const callItem: CallQueueItem = {
        id: callId,
        leadId: lead.id,
        leadName: lead.contactName || lead.name || lead.companyName || "Lead",
        phone,
        company: lead.companyName,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        industry: lead.industry,
        status: "pending",
        priority: lead.isDecisionMaker ? priority + 2 : priority, // Boost decision makers
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        attempts: 0,
        source: source || campaignId || "luci-sectors",
        tags: [...tags, ...(lead.isDecisionMaker ? ["decision-maker"] : [])],
        createdAt: new Date(),
      };

      callQueue.set(callId, callItem);
      results.added++;
      results.callIds.push(callId);
    }

    console.log(
      `[LUCI Push Dialer] Added ${results.added} leads to call queue, ${results.skipped} skipped`,
    );

    // Get queue stats
    const allCalls = Array.from(callQueue.values());
    const queueStats = {
      total: allCalls.length,
      pending: allCalls.filter((c) => c.status === "pending").length,
      inProgress: allCalls.filter((c) => c.status === "in_progress").length,
      completed: allCalls.filter((c) => c.status === "completed").length,
    };

    return NextResponse.json({
      success: true,
      campaignId: campaignId || `luci-dialer-${Date.now()}`,
      campaignName:
        campaignName || `Dialer Campaign ${new Date().toLocaleDateString()}`,
      added: results.added,
      skipped: results.skipped,
      callIds: results.callIds,
      stats: {
        totalLeads: leads.length,
        withPhones: leadsWithPhones.length,
        decisionMakers: leads.filter((l) => l.isDecisionMaker).length,
      },
      queueStats,
      nextStep:
        "Go to Power Dialer to start calling or GET /api/call-center/queue?action=next",
    });
  } catch (error) {
    console.error("[LUCI Push Dialer] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to push to dialer",
      },
      { status: 500 },
    );
  }
}

// GET - Check dialer queue status
export async function GET() {
  try {
    const callQueue = getCallQueue();
    const allCalls = Array.from(callQueue.values());

    const stats = {
      total: allCalls.length,
      pending: allCalls.filter((c) => c.status === "pending").length,
      inProgress: allCalls.filter((c) => c.status === "in_progress").length,
      completed: allCalls.filter((c) => c.status === "completed").length,
      failed: allCalls.filter((c) => c.status === "failed").length,
      noAnswer: allCalls.filter((c) => c.status === "no_answer").length,
    };

    // Get next call to make
    const now = new Date();
    const pendingCalls = allCalls
      .filter(
        (c) =>
          c.status === "pending" &&
          (!c.scheduledAt || new Date(c.scheduledAt) <= now),
      )
      .sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      success: true,
      endpoint: "POST /api/luci/push-to-dialer",
      description: "Push leads from LUCI/Sectors to call queue",
      queue: stats,
      nextCall: pendingCalls[0] || null,
      pendingCount: pendingCalls.length,
      usage: {
        requiredFields: ["leads"],
        optionalFields: [
          "campaignId",
          "campaignName",
          "priority (1-10)",
          "scheduledAt (ISO date)",
          "source",
          "tags (array)",
        ],
      },
    });
  } catch (error) {
    console.error("[LUCI Push Dialer] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue info" },
      { status: 500 },
    );
  }
}
