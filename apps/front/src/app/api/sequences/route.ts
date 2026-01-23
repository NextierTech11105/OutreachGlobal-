import { NextRequest, NextResponse } from "next/server";

/**
 * SEQUENCES API
 *
 * Multi-step automated outreach sequences with scheduling.
 * Core Pipeline integration:
 * - CAMPAIGN PREP → OUTBOUND SMS/Email/Voice (timed delivery)
 * - Respects opt-outs and lead status
 *
 * Sequence = Series of campaign blocks executed over time
 * Block = Initial Outreach, Follow-up #1, Follow-up #2, etc.
 * Each block can have: SMS, Email, Voice channels
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ChannelContent {
  enabled: boolean;
  templateId?: string;
  subject?: string;
  message: string;
}

interface CampaignBlock {
  id: string;
  name: string; // "Initial Outreach", "Follow-up #1", etc.
  order: number;
  delayDays: number;
  delayHours: number;
  sms: ChannelContent;
  email: ChannelContent;
  voice: ChannelContent;
  condition?: {
    skipIf: "responded" | "opted_out" | "email_captured" | "appointment_set";
  };
}

interface Sequence {
  id: string;
  teamId: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  worker: "gianna" | "cathy" | "sabrina";
  blocks: CampaignBlock[];
  totalDays: number;
  leadsEnrolled: number;
  responseRate: number;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (TODO: Move to DB)
// ═══════════════════════════════════════════════════════════════════════════

const SEQUENCES_STORE: Map<string, Sequence> = new Map();

// No more mock data - empty by default

// ═══════════════════════════════════════════════════════════════════════════
// GET - List sequences for a team
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");

    let sequences = Array.from(SEQUENCES_STORE.values());

    // Filter by team (or show all for "default")
    if (teamId && teamId !== "default") {
      sequences = sequences.filter(
        (s) => s.teamId === teamId || s.teamId === "default",
      );
    }

    // Filter by status
    if (status) {
      sequences = sequences.filter((s) => s.status === status);
    }

    // Map to format expected by UI
    const mappedSequences = sequences.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      steps: s.blocks.length,
      totalDays: s.totalDays,
      leadsEnrolled: s.leadsEnrolled,
      responseRate: s.responseRate,
      worker: s.worker,
      createdAt: s.createdAt,
      blocks: s.blocks, // Include full blocks for editor
    }));

    // Calculate stats
    const stats = {
      total: sequences.length,
      active: sequences.filter((s) => s.status === "active").length,
      paused: sequences.filter((s) => s.status === "paused").length,
      draft: sequences.filter((s) => s.status === "draft").length,
      totalEnrolled: sequences.reduce((acc, s) => acc + s.leadsEnrolled, 0),
    };

    return NextResponse.json({
      success: true,
      sequences: mappedSequences,
      stats,
    });
  } catch (error) {
    console.error("[Sequences] GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch sequences",
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Create a new sequence
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, name, description, worker = "gianna", blocks = [] } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Calculate total days from blocks
    const totalDays = blocks.reduce(
      (acc: number, block: CampaignBlock) => acc + (block.delayDays || 0),
      0,
    );

    const sequence: Sequence = {
      id: `seq_${Date.now()}`,
      teamId: teamId || "default",
      name,
      description: description || "",
      status: "draft",
      worker,
      blocks: blocks.map((block: CampaignBlock, index: number) => ({
        ...block,
        id: block.id || `block_${index + 1}`,
        order: index + 1,
      })),
      totalDays,
      leadsEnrolled: 0,
      responseRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SEQUENCES_STORE.set(sequence.id, sequence);

    console.log(`[Sequences] Created sequence: ${sequence.id} - ${name}`);

    return NextResponse.json({
      success: true,
      sequence,
    });
  } catch (error) {
    console.error("[Sequences] POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create sequence",
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH - Update a sequence
// ═══════════════════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, status, blocks, worker } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const sequence = SEQUENCES_STORE.get(id);
    if (!sequence) {
      return NextResponse.json(
        { error: "Sequence not found" },
        { status: 404 },
      );
    }

    // Update fields
    if (name) sequence.name = name;
    if (description !== undefined) sequence.description = description;
    if (status) sequence.status = status;
    if (worker) sequence.worker = worker;
    if (blocks) {
      sequence.blocks = blocks.map((block: CampaignBlock, index: number) => ({
        ...block,
        id: block.id || `block_${index + 1}`,
        order: index + 1,
      }));
      sequence.totalDays = blocks.reduce(
        (acc: number, block: CampaignBlock) => acc + (block.delayDays || 0),
        0,
      );
    }
    sequence.updatedAt = new Date().toISOString();

    SEQUENCES_STORE.set(id, sequence);

    console.log(`[Sequences] Updated sequence: ${id}`);

    return NextResponse.json({
      success: true,
      sequence,
    });
  } catch (error) {
    console.error("[Sequences] PATCH error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update sequence",
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE - Delete a sequence
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!SEQUENCES_STORE.has(id)) {
      return NextResponse.json(
        { error: "Sequence not found" },
        { status: 404 },
      );
    }

    SEQUENCES_STORE.delete(id);

    console.log(`[Sequences] Deleted sequence: ${id}`);

    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error("[Sequences] DELETE error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete sequence",
      },
      { status: 500 },
    );
  }
}
