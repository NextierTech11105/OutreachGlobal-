import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";

/**
 * DIALER LOAD API
 *
 * Load leads into dialer workspace:
 * - Max 2,000 leads per workspace load
 * - Validates phone numbers
 * - Assigns to workspace/campaign
 * - Prepares for auto-dial or manual calling
 */

const MAX_DIALER_LEADS = 2000;

interface LoadRequest {
  leadIds: string[];
  workspaceId: string;
  campaignId?: string;
  priority?: "high" | "medium" | "low";
  dialMode?: "preview" | "power" | "predictive"; // Dialer modes
  assignedAgent?: string;
}

interface DialerWorkspace {
  id: string;
  workspaceId: string;
  campaignId?: string;
  status: "ready" | "active" | "paused" | "completed";
  totalLeads: number;
  dialedLeads: number;
  connectedCalls: number;
  dialMode: string;
  createdAt: string;
  leads: DialerLead[];
}

interface DialerLead {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  priority: string;
  status: "pending" | "dialing" | "connected" | "completed" | "skipped" | "failed";
  attempts: number;
  lastAttempt?: string;
  disposition?: string;
}

// In-memory workspace storage (production would use Redis/DB)
const dialerWorkspaces = new Map<string, DialerWorkspace>();

// POST - Load leads into dialer
export async function POST(request: NextRequest) {
  try {
    const body: LoadRequest = await request.json();
    const { leadIds, workspaceId, campaignId, priority, dialMode = "preview", assignedAgent } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds array is required" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Limit to max leads
    const limitedLeadIds = leadIds.slice(0, MAX_DIALER_LEADS);

    // Fetch lead data
    const leadsData = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        priority: leads.priority,
        status: leads.status,
      })
      .from(leads)
      .where(inArray(leads.id, limitedLeadIds));

    // Filter and validate leads
    const validLeads = leadsData.filter(l => {
      // Must have phone
      if (!l.phone || l.phone.length < 10) return false;
      // Skip suppressed leads
      // In production, also check suppressedAt field
      return true;
    });

    // Sort by priority if specified
    if (priority) {
      validLeads.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = (a.priority?.toLowerCase() || "medium") as keyof typeof priorityOrder;
        const bPriority = (b.priority?.toLowerCase() || "medium") as keyof typeof priorityOrder;
        return (priorityOrder[aPriority] || 1) - (priorityOrder[bPriority] || 1);
      });
    }

    // Create dialer leads
    const dialerLeads: DialerLead[] = validLeads.map(l => ({
      id: crypto.randomUUID(),
      leadId: l.id,
      firstName: l.firstName || "",
      lastName: l.lastName || "",
      phone: l.phone,
      priority: l.priority || "Medium",
      status: "pending",
      attempts: 0,
    }));

    // Create workspace
    const dialerWorkspaceId = `dialer-${workspaceId}-${Date.now()}`;
    const workspace: DialerWorkspace = {
      id: dialerWorkspaceId,
      workspaceId,
      campaignId,
      status: "ready",
      totalLeads: dialerLeads.length,
      dialedLeads: 0,
      connectedCalls: 0,
      dialMode,
      createdAt: new Date().toISOString(),
      leads: dialerLeads,
    };

    dialerWorkspaces.set(dialerWorkspaceId, workspace);

    // Update leads in DB with workspace assignment
    await db
      .update(leads)
      .set({
        dialerWorkspaceId,
        dialerLoadedAt: new Date(),
        assignedTo: assignedAgent,
        updatedAt: new Date(),
      })
      .where(inArray(leads.id, validLeads.map(l => l.id)));

    console.log(`[Dialer] Loaded ${validLeads.length} leads into workspace ${dialerWorkspaceId}`);

    return NextResponse.json({
      success: true,
      workspace: {
        id: dialerWorkspaceId,
        totalLeads: dialerLeads.length,
        dialMode,
        status: "ready",
      },
      skipped: leadIds.length - validLeads.length,
      message: `Loaded ${validLeads.length} leads into dialer workspace`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Load failed";
    console.error("[Dialer] Load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get workspace status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const dialerWorkspaceId = searchParams.get("dialerWorkspaceId");

    if (dialerWorkspaceId) {
      const workspace = dialerWorkspaces.get(dialerWorkspaceId);
      if (!workspace) {
        return NextResponse.json(
          { error: "Dialer workspace not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        workspace: {
          ...workspace,
          leads: workspace.leads.slice(0, 50), // Limit response size
        },
      });
    }

    if (workspaceId) {
      const workspaces = Array.from(dialerWorkspaces.values())
        .filter(w => w.workspaceId === workspaceId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({
        success: true,
        workspaces: workspaces.map(w => ({
          id: w.id,
          status: w.status,
          totalLeads: w.totalLeads,
          dialedLeads: w.dialedLeads,
          connectedCalls: w.connectedCalls,
          dialMode: w.dialMode,
          createdAt: w.createdAt,
        })),
      });
    }

    // Return all recent workspaces summary
    const recentWorkspaces = Array.from(dialerWorkspaces.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(w => ({
        id: w.id,
        workspaceId: w.workspaceId,
        status: w.status,
        totalLeads: w.totalLeads,
        dialedLeads: w.dialedLeads,
        dialMode: w.dialMode,
        createdAt: w.createdAt,
      }));

    return NextResponse.json({
      success: true,
      workspaces: recentWorkspaces,
      config: {
        maxLeads: MAX_DIALER_LEADS,
        dialModes: ["preview", "power", "predictive"],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[Dialer] Query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update workspace status (start/pause/resume)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dialerWorkspaceId, action, leadId, disposition } = body;

    if (!dialerWorkspaceId) {
      return NextResponse.json(
        { error: "dialerWorkspaceId is required" },
        { status: 400 }
      );
    }

    const workspace = dialerWorkspaces.get(dialerWorkspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Handle workspace actions
    if (action === "start") {
      workspace.status = "active";
    } else if (action === "pause") {
      workspace.status = "paused";
    } else if (action === "resume") {
      workspace.status = "active";
    } else if (action === "complete") {
      workspace.status = "completed";
    }

    // Handle lead disposition update
    if (leadId && disposition) {
      const lead = workspace.leads.find(l => l.leadId === leadId);
      if (lead) {
        lead.status = "completed";
        lead.disposition = disposition;
        lead.lastAttempt = new Date().toISOString();
        workspace.dialedLeads++;

        if (disposition === "connected" || disposition === "appointment_set") {
          workspace.connectedCalls++;
        }
      }
    }

    dialerWorkspaces.set(dialerWorkspaceId, workspace);

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        status: workspace.status,
        totalLeads: workspace.totalLeads,
        dialedLeads: workspace.dialedLeads,
        connectedCalls: workspace.connectedCalls,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    console.error("[Dialer] Update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
