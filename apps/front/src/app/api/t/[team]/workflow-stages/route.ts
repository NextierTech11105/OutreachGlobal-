import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowStageConfigs } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// Default stages to seed when none exist
const DEFAULT_STAGES = [
  {
    name: "Initial Message",
    description: "First contact with leads via GIANNA",
    order: 0,
    defaultAgent: "GIANNA",
    triggerMode: "automatic",
    campaignType: "SMS_INITIAL",
    icon: "MessageSquare",
    color: "#3b82f6",
  },
  {
    name: "Retarget",
    description: "Follow-up non-responders after 3-5 days",
    order: 1,
    defaultAgent: "GIANNA",
    triggerMode: "scheduled",
    delayDays: 3,
    campaignType: "SMS_RETARGET_NC",
    icon: "RefreshCw",
    color: "#8b5cf6",
  },
  {
    name: "Nudger",
    description: "Re-anchor after ~2 weeks with different number via CATHY",
    order: 2,
    defaultAgent: "CATHY",
    triggerMode: "manual",
    delayDays: 14,
    usesDifferentNumber: true,
    campaignType: "SMS_NUDGE",
    icon: "Zap",
    color: "#f59e0b",
  },
  {
    name: "Content Nurture",
    description: "Educational drip content for long-term engagement",
    order: 3,
    defaultAgent: "GIANNA",
    triggerMode: "scheduled",
    campaignType: "SMS_NURTURE",
    icon: "BookOpen",
    color: "#10b981",
  },
  {
    name: "Book Appointment",
    description: "Push for appointment booking via SABRINA",
    order: 4,
    defaultAgent: "SABRINA",
    triggerMode: "manual",
    campaignType: "BOOK_APPOINTMENT",
    icon: "Calendar",
    color: "#ec4899",
  },
];

// GET /api/t/[team]/workflow-stages - List stage configurations for team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> }
) {
  try {
    const { team: teamId } = await params;

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const stages = await db
      .select()
      .from(workflowStageConfigs)
      .where(eq(workflowStageConfigs.teamId, teamId))
      .orderBy(asc(workflowStageConfigs.order));

    // If no stages exist, return defaults (can be seeded on first use)
    if (stages.length === 0) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_STAGES.map((s, i) => ({
          id: `default_${i}`,
          teamId,
          ...s,
          createdAt: null,
          updatedAt: null,
        })),
        isDefault: true,
        count: DEFAULT_STAGES.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: stages,
      count: stages.length,
    });
  } catch (error) {
    console.error("Get workflow stages error:", error);
    return NextResponse.json(
      { error: "Failed to get workflow stages", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/t/[team]/workflow-stages - Create or seed stage configurations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> }
) {
  try {
    const { team: teamId } = await params;
    const body = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Option 1: Seed default stages
    if (body.seedDefaults) {
      const now = new Date();
      const stagesToInsert = DEFAULT_STAGES.map((s, i) => ({
        id: `stage_${teamId}_${Date.now()}_${i}`,
        teamId,
        name: s.name,
        description: s.description || null,
        order: s.order,
        defaultAgent: s.defaultAgent || null,
        triggerMode: s.triggerMode,
        delayDays: s.delayDays || null,
        campaignType: s.campaignType || null,
        usesDifferentNumber: s.usesDifferentNumber || false,
        icon: s.icon || null,
        color: s.color || null,
        createdAt: now,
        updatedAt: now,
      }));

      const inserted = await db
        .insert(workflowStageConfigs)
        .values(stagesToInsert)
        .returning();

      return NextResponse.json(
        {
          success: true,
          message: `Seeded ${inserted.length} default stages`,
          data: inserted,
        },
        { status: 201 }
      );
    }

    // Option 2: Create a custom stage
    const { name, description, order, defaultAgent, triggerMode, delayDays, campaignType, usesDifferentNumber, icon, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Stage name is required" },
        { status: 400 }
      );
    }

    const id = `stage_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const [newStage] = await db
      .insert(workflowStageConfigs)
      .values({
        id,
        teamId,
        name,
        description: description || null,
        order: order ?? 0,
        defaultAgent: defaultAgent || null,
        triggerMode: triggerMode || "manual",
        delayDays: delayDays || null,
        campaignType: campaignType || null,
        usesDifferentNumber: usesDifferentNumber || false,
        icon: icon || null,
        color: color || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newStage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create workflow stage error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow stage", details: String(error) },
      { status: 500 }
    );
  }
}
