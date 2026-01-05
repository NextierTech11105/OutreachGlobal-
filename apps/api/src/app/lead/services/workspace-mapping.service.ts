import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, inArray, sql } from "drizzle-orm";
import { leadsTable } from "@/database/schema-alias";
import { LeadState } from "@/database/schema/canonical-lead-state.schema";

// Workspace definitions
export type WorkspaceId =
  | "initial_outreach"
  | "retargeting"
  | "nudge_engine"
  | "content_nurture"
  | "inbound_responses"
  | "soft_interest"
  | "high_intent"
  | "appointments"
  | "call_queue"
  | "outcomes"
  | "suppressed";

export interface WorkspaceDefinition {
  id: WorkspaceId;
  name: string;
  description: string;
  states: LeadState[];
  icon?: string;
  color?: string;
  // Additional filters beyond state
  additionalFilters?: {
    hasTimer7D?: boolean;
    hasTimer14D?: boolean;
    minDaysInState?: number;
  };
}

// Canonical workspace-to-state mapping
export const WORKSPACE_DEFINITIONS: WorkspaceDefinition[] = [
  {
    id: "initial_outreach",
    name: "Initial Outreach",
    description: "New leads waiting for first contact or recently touched",
    states: ["new", "touched"],
    icon: "send",
    color: "blue",
  },
  {
    id: "retargeting",
    name: "Retargeting",
    description: "Leads in 7-day retargeting cycle (no response yet)",
    states: ["retargeting"],
    icon: "refresh-cw",
    color: "orange",
    additionalFilters: {
      hasTimer7D: true,
    },
  },
  {
    id: "nudge_engine",
    name: "Nudge Engine",
    description: "Leads in 14-day escalation cycle",
    states: ["retargeting"],
    icon: "bell",
    color: "amber",
    additionalFilters: {
      hasTimer14D: true,
      minDaysInState: 14,
    },
  },
  {
    id: "inbound_responses",
    name: "Inbound Responses",
    description: "Leads who have responded - need review",
    states: ["responded"],
    icon: "inbox",
    color: "green",
  },
  {
    id: "soft_interest",
    name: "Soft Interest",
    description: "Leads showing mild interest, needs nurturing",
    states: ["soft_interest"],
    icon: "heart",
    color: "pink",
  },
  {
    id: "content_nurture",
    name: "Content Nurture",
    description: "Leads in nurture sequences (SMS/MMS/email drip)",
    states: ["email_captured", "content_nurture"],
    icon: "mail",
    color: "purple",
  },
  {
    id: "high_intent",
    name: "High Intent",
    description: "Leads expressing buying/selling intent",
    states: ["high_intent"],
    icon: "trending-up",
    color: "emerald",
  },
  {
    id: "appointments",
    name: "Appointments",
    description: "Leads with scheduled meetings",
    states: ["appointment_booked"],
    icon: "calendar",
    color: "cyan",
  },
  {
    id: "call_queue",
    name: "Call Queue",
    description: "Leads escalated for human calling",
    states: ["in_call_queue"],
    icon: "phone",
    color: "red",
  },
  {
    id: "outcomes",
    name: "Outcomes",
    description: "Closed deals and completed leads",
    states: ["closed"],
    icon: "check-circle",
    color: "slate",
  },
  {
    id: "suppressed",
    name: "Suppressed",
    description: "Opted out / DNC leads",
    states: ["suppressed"],
    icon: "x-circle",
    color: "gray",
  },
];

// State to workspaces mapping (reverse lookup)
export const STATE_TO_WORKSPACES: Record<LeadState, WorkspaceId[]> = {
  new: ["initial_outreach"],
  touched: ["initial_outreach"],
  retargeting: ["retargeting", "nudge_engine"],
  responded: ["inbound_responses"],
  soft_interest: ["soft_interest"],
  email_captured: ["content_nurture"],
  content_nurture: ["content_nurture"],
  high_intent: ["high_intent"],
  appointment_booked: ["appointments"],
  in_call_queue: ["call_queue"],
  closed: ["outcomes"],
  suppressed: ["suppressed"],
};

@Injectable()
export class WorkspaceMappingService {
  private readonly logger = new Logger(WorkspaceMappingService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Get workspace definition by ID
   */
  getWorkspace(workspaceId: WorkspaceId): WorkspaceDefinition | undefined {
    return WORKSPACE_DEFINITIONS.find((w) => w.id === workspaceId);
  }

  /**
   * Get all workspace definitions
   */
  getAllWorkspaces(): WorkspaceDefinition[] {
    return WORKSPACE_DEFINITIONS;
  }

  /**
   * Get workspaces that a lead state belongs to
   */
  getWorkspacesForState(state: LeadState): WorkspaceId[] {
    return STATE_TO_WORKSPACES[state] || [];
  }

  /**
   * Get lead counts per workspace for a team
   */
  async getWorkspaceCounts(teamId: string): Promise<Record<WorkspaceId, number>> {
    // Get state counts
    const stateCounts = await this.db
      .select({
        state: leadsTable.leadState,
        count: sql<number>`count(*)::int`,
      })
      .from(leadsTable)
      .where(eq(leadsTable.teamId, teamId))
      .groupBy(leadsTable.leadState);

    // Map states to workspaces and aggregate
    const workspaceCounts: Record<WorkspaceId, number> = {
      initial_outreach: 0,
      retargeting: 0,
      nudge_engine: 0,
      content_nurture: 0,
      inbound_responses: 0,
      soft_interest: 0,
      high_intent: 0,
      appointments: 0,
      call_queue: 0,
      outcomes: 0,
      suppressed: 0,
    };

    for (const { state, count } of stateCounts) {
      if (!state) continue;
      const workspaces = STATE_TO_WORKSPACES[state as LeadState] || [];
      for (const workspace of workspaces) {
        workspaceCounts[workspace] += count;
      }
    }

    return workspaceCounts;
  }

  /**
   * Get leads in a specific workspace
   */
  async getWorkspaceLeads(
    teamId: string,
    workspaceId: WorkspaceId,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Unknown workspace: ${workspaceId}`);
    }

    let query = this.db
      .select()
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          inArray(leadsTable.leadState, workspace.states),
        ),
      )
      .orderBy(sql`${leadsTable.updatedAt} DESC`)
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  /**
   * Get suggested next workspace for a lead based on current state
   */
  getSuggestedTransitions(currentState: LeadState): {
    workspace: WorkspaceId;
    action: string;
    description: string;
  }[] {
    const transitions: {
      workspace: WorkspaceId;
      action: string;
      description: string;
    }[] = [];

    switch (currentState) {
      case "new":
        transitions.push({
          workspace: "initial_outreach",
          action: "Send Initial Message",
          description: "Start outreach sequence",
        });
        break;

      case "touched":
        transitions.push(
          {
            workspace: "inbound_responses",
            action: "Wait for Response",
            description: "Lead will move here when they reply",
          },
          {
            workspace: "retargeting",
            action: "Retarget (7D)",
            description: "Will auto-move after 7 days of no response",
          },
        );
        break;

      case "retargeting":
        transitions.push(
          {
            workspace: "inbound_responses",
            action: "Wait for Response",
            description: "Lead can still respond",
          },
          {
            workspace: "nudge_engine",
            action: "Escalate (14D)",
            description: "Will auto-escalate after 14 days",
          },
        );
        break;

      case "responded":
        transitions.push(
          {
            workspace: "soft_interest",
            action: "Mark Soft Interest",
            description: "Lead shows curiosity but not high intent",
          },
          {
            workspace: "content_nurture",
            action: "Capture Email",
            description: "Move to content nurture sequence",
          },
          {
            workspace: "high_intent",
            action: "Mark High Intent",
            description: "Lead ready for call/booking",
          },
        );
        break;

      case "soft_interest":
        transitions.push(
          {
            workspace: "content_nurture",
            action: "Capture Email",
            description: "Start nurture sequence",
          },
          {
            workspace: "high_intent",
            action: "Escalate",
            description: "Interest increased",
          },
        );
        break;

      case "email_captured":
      case "content_nurture":
        transitions.push(
          {
            workspace: "high_intent",
            action: "Escalate",
            description: "Lead ready for sales contact",
          },
          {
            workspace: "appointments",
            action: "Book Meeting",
            description: "Schedule appointment directly",
          },
        );
        break;

      case "high_intent":
        transitions.push(
          {
            workspace: "appointments",
            action: "Book Meeting",
            description: "Schedule appointment",
          },
          {
            workspace: "call_queue",
            action: "Add to Call Queue",
            description: "Escalate for immediate call",
          },
          {
            workspace: "outcomes",
            action: "Close",
            description: "Mark as closed/won",
          },
        );
        break;

      case "appointment_booked":
        transitions.push(
          {
            workspace: "call_queue",
            action: "Move to Calls",
            description: "Ready for call follow-up",
          },
          {
            workspace: "outcomes",
            action: "Close",
            description: "Mark deal outcome",
          },
        );
        break;

      case "in_call_queue":
        transitions.push({
          workspace: "outcomes",
          action: "Close",
          description: "Mark deal outcome after call",
        });
        break;
    }

    return transitions;
  }

  /**
   * Get workspace navigation structure for frontend
   */
  getNavigationStructure(): {
    section: string;
    workspaces: WorkspaceDefinition[];
  }[] {
    return [
      {
        section: "Outreach",
        workspaces: WORKSPACE_DEFINITIONS.filter((w) =>
          ["initial_outreach", "retargeting", "nudge_engine"].includes(w.id),
        ),
      },
      {
        section: "Responses",
        workspaces: WORKSPACE_DEFINITIONS.filter((w) =>
          ["inbound_responses", "soft_interest"].includes(w.id),
        ),
      },
      {
        section: "Nurture",
        workspaces: WORKSPACE_DEFINITIONS.filter((w) =>
          ["content_nurture"].includes(w.id),
        ),
      },
      {
        section: "Sales",
        workspaces: WORKSPACE_DEFINITIONS.filter((w) =>
          ["high_intent", "appointments", "call_queue"].includes(w.id),
        ),
      },
      {
        section: "Complete",
        workspaces: WORKSPACE_DEFINITIONS.filter((w) =>
          ["outcomes", "suppressed"].includes(w.id),
        ),
      },
    ];
  }

  /**
   * Validate that a lead can be in a workspace based on state
   */
  validateLeadWorkspace(leadState: LeadState, workspaceId: WorkspaceId): boolean {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return false;
    return workspace.states.includes(leadState);
  }
}
