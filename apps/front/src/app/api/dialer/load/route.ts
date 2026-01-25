import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, appState } from "@/lib/db/schema";
import { inArray, eq, and, desc } from "drizzle-orm";

/**
 * DIALER LOAD API
 *
 * Load leads into dialer workspace:
 * - Max 2,000 leads per workspace load
 * - Validates phone numbers
 * - Assigns to workspace/campaign
 * - Prepares for auto-dial or manual calling
 *
 * Uses appState table for workspace persistence.
 */

const MAX_DIALER_LEADS = 2000;

interface LoadRequest {
  leadIds: string[];
  workspaceId: string;
  campaignId?: string;
  priority?: "high" | "medium" | "low";
  dialMode?: "preview" | "power" | "predictive";
  assignedAgent?: string;
  teamId?: string;
}

interface DialerWorkspace {
  id: string;
  workspaceId: string;
  teamId: string;
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
  status:
    | "pending"
    | "dialing"
    | "connected"
    | "completed"
    | "skipped"
    | "failed";
  attempts: number;
  lastAttempt?: string;
  disposition?: string;
}

// Helper to get workspace from database
async function getWorkspace(
  dialerWorkspaceId: string
): Promise<DialerWorkspace | null> {
  const key = `dialer_workspace:${dialerWorkspaceId}`;
  const [state] = await db
    .select()
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);

  return state?.value as DialerWorkspace | null;
}

// Helper to save workspace to database
async function saveWorkspace(workspace: DialerWorkspace): Promise<void> {
  const key = `dialer_workspace:${workspace.id}`;

  const [existing] = await db
    .select()
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: workspace, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId: workspace.teamId,
      key,
      value: workspace,
    });
  }
}

// POST - Load leads into dialer
export async function POST(request: NextRequest) {
  try {
    const body: LoadRequest = await request.json();
    const {
      leadIds,
      workspaceId,
      campaignId,
      priority,
      dialMode = "preview",
      assignedAgent,
      teamId = "default",
    } = body;

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
        priority: leads.pipelineStatus,
        status: leads.status,
      })
      .from(leads)
      .where(inArray(leads.id, limitedLeadIds));

    // Filter and validate leads
    const validLeads = leadsData.filter((l) => {
      // Must have phone
      if (!l.phone || l.phone.length < 10) return false;
      return true;
    });

    // Sort by priority if specified
    if (priority) {
      validLeads.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = (a.priority?.toLowerCase() ||
          "medium") as keyof typeof priorityOrder;
        const bPriority = (b.priority?.toLowerCase() ||
          "medium") as keyof typeof priorityOrder;
        return (
          (priorityOrder[aPriority] || 1) - (priorityOrder[bPriority] || 1)
        );
      });
    }

    // Create dialer leads
    const dialerLeads: DialerLead[] = validLeads.map((l) => ({
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
      teamId,
      campaignId,
      status: "ready",
      totalLeads: dialerLeads.length,
      dialedLeads: 0,
      connectedCalls: 0,
      dialMode,
      createdAt: new Date().toISOString(),
      leads: dialerLeads,
    };

    await saveWorkspace(workspace);

    // Update leads in DB with workspace assignment
    if (validLeads.length > 0) {
      await db
        .update(leads)
        .set({
          customFields: {
            dialerWorkspaceId,
            dialerLoadedAt: new Date().toISOString(),
            assignedTo: assignedAgent,
          },
          updatedAt: new Date(),
        })
        .where(
          inArray(
            leads.id,
            validLeads.map((l) => l.id)
          )
        );
    }

    console.log(
      `[Dialer] Loaded ${validLeads.length} leads into workspace ${dialerWorkspaceId}`
    );

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
    const teamId = searchParams.get("teamId") || "default";

    if (dialerWorkspaceId) {
      const workspace = await getWorkspace(dialerWorkspaceId);
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
      // Find workspaces by workspaceId pattern
      const keyPattern = `dialer_workspace:dialer-${workspaceId}-%`;
      const states = await db
        .select()
        .from(appState)
        .where(
          and(
            eq(appState.teamId, teamId),
            // Use LIKE for pattern matching
            eq(appState.key, `dialer_workspace:dialer-${workspaceId}`)
          )
        )
        .limit(20);

      // Get all workspace states that match the pattern
      const allStates = await db
        .select()
        .from(appState)
        .where(eq(appState.teamId, teamId))
        .orderBy(desc(appState.createdAt));

      const workspaces = allStates
        .filter(
          (s) =>
            s.key.startsWith(`dialer_workspace:dialer-${workspaceId}`) &&
            s.value
        )
        .map((s) => s.value as DialerWorkspace)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      return NextResponse.json({
        success: true,
        workspaces: workspaces.map((w) => ({
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
    const allStates = await db
      .select()
      .from(appState)
      .where(eq(appState.teamId, teamId))
      .orderBy(desc(appState.createdAt))
      .limit(50);

    const recentWorkspaces = allStates
      .filter((s) => s.key.startsWith("dialer_workspace:") && s.value)
      .map((s) => s.value as DialerWorkspace)
      .slice(0, 10)
      .map((w) => ({
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

    const workspace = await getWorkspace(dialerWorkspaceId);
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
      const lead = workspace.leads.find((l) => l.leadId === leadId);
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

    await saveWorkspace(workspace);

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
