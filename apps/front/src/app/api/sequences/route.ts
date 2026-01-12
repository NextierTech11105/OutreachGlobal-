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

// Pre-populate with example sequences
const EXAMPLE_SEQUENCES: Sequence[] = [
  {
    id: "seq_email_capture_7day",
    teamId: "default",
    name: "Email Capture - 7 Day",
    description: "GIANNA opener sequence to capture email within 7 days",
    status: "active",
    worker: "gianna",
    blocks: [
      {
        id: "block_1",
        name: "Initial Outreach",
        order: 1,
        delayDays: 0,
        delayHours: 0,
        sms: {
          enabled: true,
          templateId: "bb-1",
          message:
            "Hi {firstName}! Quick question about your property at {address}. Do you have 2 mins? - Gianna",
        },
        email: {
          enabled: false,
          subject: "",
          message: "",
        },
        voice: {
          enabled: false,
          message: "",
        },
      },
      {
        id: "block_2",
        name: "Follow-up #1",
        order: 2,
        delayDays: 2,
        delayHours: 0,
        condition: { skipIf: "responded" },
        sms: {
          enabled: true,
          templateId: "bb-2",
          message:
            "Hey {firstName}, just following up. I have some interesting market data for your area. Want me to send it over?",
        },
        email: {
          enabled: false,
          subject: "",
          message: "",
        },
        voice: {
          enabled: false,
          message: "",
        },
      },
      {
        id: "block_3",
        name: "Follow-up #2",
        order: 3,
        delayDays: 3,
        delayHours: 0,
        condition: { skipIf: "responded" },
        sms: {
          enabled: true,
          templateId: "bb-3",
          message:
            "{firstName}, last message from me. If you ever want a free property valuation, just reply YES. - Gianna",
        },
        email: {
          enabled: true,
          subject: "Free Property Valuation for {address}",
          message:
            "Hi {firstName},\n\nI wanted to reach out one more time about your property. We're offering free valuations in your area this month.\n\nReply to this email or text me back if interested!\n\n- Gianna",
        },
        voice: {
          enabled: false,
          message: "",
        },
      },
    ],
    totalDays: 7,
    leadsEnrolled: 156,
    responseRate: 23.4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seq_ghost_reengagement",
    teamId: "default",
    name: "Ghost Re-engagement",
    description: "CATHY nudger sequence for leads who stopped responding",
    status: "active",
    worker: "cathy",
    blocks: [
      {
        id: "block_1",
        name: "Re-engagement",
        order: 1,
        delayDays: 0,
        delayHours: 0,
        sms: {
          enabled: true,
          message:
            "Hi {firstName}, noticed we lost touch. Just checking if you're still interested? - Cathy",
        },
        email: {
          enabled: false,
          subject: "",
          message: "",
        },
        voice: {
          enabled: false,
          message: "",
        },
      },
      {
        id: "block_2",
        name: "Value Add",
        order: 2,
        delayDays: 5,
        delayHours: 0,
        condition: { skipIf: "responded" },
        sms: {
          enabled: true,
          message:
            "{firstName}, quick update: market conditions have changed. Want a brief update? Reply YES for details.",
        },
        email: {
          enabled: true,
          subject: "Market Update for Your Area",
          message:
            "Hi {firstName},\n\nThe market in your area has shifted recently. I thought you might find this update valuable.\n\nWould you like me to send you the details?\n\n- Cathy",
        },
        voice: {
          enabled: false,
          message: "",
        },
      },
    ],
    totalDays: 5,
    leadsEnrolled: 89,
    responseRate: 18.2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seq_appointment_booking",
    teamId: "default",
    name: "Appointment Booking",
    description: "SABRINA closer sequence to book strategy calls",
    status: "active",
    worker: "sabrina",
    blocks: [
      {
        id: "block_1",
        name: "Initial Ask",
        order: 1,
        delayDays: 0,
        delayHours: 0,
        sms: {
          enabled: true,
          message:
            "Hi {firstName}! I'm Sabrina. Based on our conversation, I'd love to schedule a 15-min strategy call. What day works best?",
        },
        email: {
          enabled: true,
          subject: "Let's Schedule Your Strategy Call",
          message:
            "Hi {firstName},\n\nThank you for your interest! I'd love to schedule a 15-minute strategy call to discuss your goals.\n\nWhat day this week works best for you?\n\n- Sabrina",
        },
        voice: {
          enabled: false,
          message: "",
        },
      },
      {
        id: "block_2",
        name: "Follow-up",
        order: 2,
        delayDays: 1,
        delayHours: 0,
        condition: { skipIf: "appointment_set" },
        sms: {
          enabled: true,
          message:
            "{firstName}, I have a few slots open this week. Would Tuesday or Thursday work better for a quick call?",
        },
        email: {
          enabled: false,
          subject: "",
          message: "",
        },
        voice: {
          enabled: true,
          message:
            "Hi {firstName}, this is Sabrina calling to schedule your strategy session. I have availability Tuesday and Thursday this week. Please call me back or reply to my text to confirm a time.",
        },
      },
    ],
    totalDays: 3,
    leadsEnrolled: 42,
    responseRate: 45.2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Initialize store with examples
EXAMPLE_SEQUENCES.forEach((seq) => SEQUENCES_STORE.set(seq.id, seq));

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
