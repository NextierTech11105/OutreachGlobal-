import { NextRequest, NextResponse } from "next/server";

// Schedule System - Queue SMS, Calls, and Emails for later delivery

interface ScheduledItem {
  id: string;
  type: "sms" | "call" | "email";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  scheduledFor: string;
  createdAt: string;
  processedAt?: string;
  createdBy?: string;

  // Recipient info
  recipient: {
    name?: string;
    phone?: string;
    email?: string;
    propertyId?: string;
    propertyAddress?: string;
  };

  // Message content
  content: {
    message?: string;
    subject?: string;
    template?: string;
    templateData?: Record<string, unknown>;
  };

  // Result after processing
  result?: {
    success: boolean;
    messageId?: string;
    callSid?: string;
    error?: string;
  };
}

// In-memory storage (would be database in production)
const scheduledItems = new Map<string, ScheduledItem>();

// POST - Schedule a new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      scheduledFor,
      recipient,
      content,
      createdBy,
    } = body;

    if (!type || !["sms", "call", "email"].includes(type)) {
      return NextResponse.json({ error: "Valid type required (sms, call, email)" }, { status: 400 });
    }

    if (!scheduledFor) {
      return NextResponse.json({ error: "scheduledFor datetime required" }, { status: 400 });
    }

    if (!recipient || (!recipient.phone && !recipient.email)) {
      return NextResponse.json({ error: "Recipient phone or email required" }, { status: 400 });
    }

    // Validate type-specific requirements
    if (type === "sms" && !recipient.phone) {
      return NextResponse.json({ error: "Phone required for SMS" }, { status: 400 });
    }
    if (type === "call" && !recipient.phone) {
      return NextResponse.json({ error: "Phone required for calls" }, { status: 400 });
    }
    if (type === "email" && !recipient.email) {
      return NextResponse.json({ error: "Email required for email" }, { status: 400 });
    }

    const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const item: ScheduledItem = {
      id,
      type,
      status: "pending",
      scheduledFor,
      createdAt: new Date().toISOString(),
      createdBy,
      recipient,
      content: content || {},
    };

    scheduledItems.set(id, item);

    console.log(`[Schedule] Created ${type} scheduled for ${scheduledFor}:`, {
      id,
      recipient: recipient.phone || recipient.email,
    });

    return NextResponse.json({
      success: true,
      scheduled: {
        id,
        type,
        status: item.status,
        scheduledFor,
        recipient: {
          name: recipient.name,
          phone: recipient.phone ? `${recipient.phone.slice(0, 4)}****` : undefined,
          email: recipient.email,
        },
      },
    });
  } catch (error) {
    console.error("[Schedule] Error:", error);
    return NextResponse.json({ error: "Failed to schedule item" }, { status: 500 });
  }
}

// GET - List scheduled items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const propertyId = searchParams.get("propertyId");
  const upcoming = searchParams.get("upcoming") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");

  // Get specific item
  if (id) {
    const item = scheduledItems.get(id);
    if (!item) {
      return NextResponse.json({ error: "Scheduled item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item });
  }

  // List items
  let items = Array.from(scheduledItems.values());

  // Filter by type
  if (type) {
    items = items.filter((i) => i.type === type);
  }

  // Filter by status
  if (status) {
    items = items.filter((i) => i.status === status);
  }

  // Filter by property
  if (propertyId) {
    items = items.filter((i) => i.recipient.propertyId === propertyId);
  }

  // Filter upcoming only
  if (upcoming) {
    const now = new Date().toISOString();
    items = items.filter((i) => i.scheduledFor > now && i.status === "pending");
  }

  // Sort by scheduledFor
  items.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  // Limit results
  items = items.slice(0, limit);

  // Get counts by type
  const allItems = Array.from(scheduledItems.values());
  const counts = {
    total: allItems.length,
    pending: allItems.filter((i) => i.status === "pending").length,
    sms: allItems.filter((i) => i.type === "sms" && i.status === "pending").length,
    call: allItems.filter((i) => i.type === "call" && i.status === "pending").length,
    email: allItems.filter((i) => i.type === "email" && i.status === "pending").length,
  };

  return NextResponse.json({
    success: true,
    items: items.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      scheduledFor: i.scheduledFor,
      recipient: {
        name: i.recipient.name,
        propertyAddress: i.recipient.propertyAddress,
      },
    })),
    count: items.length,
    counts,
  });
}

// PUT - Update or cancel scheduled item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, scheduledFor, content } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const item = scheduledItems.get(id);
    if (!item) {
      return NextResponse.json({ error: "Scheduled item not found" }, { status: 404 });
    }

    // Cancel
    if (action === "cancel") {
      if (item.status !== "pending") {
        return NextResponse.json({ error: "Can only cancel pending items" }, { status: 400 });
      }
      item.status = "cancelled";
      scheduledItems.set(id, item);
      return NextResponse.json({ success: true, item: { id, status: item.status } });
    }

    // Reschedule
    if (scheduledFor) {
      if (item.status !== "pending") {
        return NextResponse.json({ error: "Can only reschedule pending items" }, { status: 400 });
      }
      item.scheduledFor = scheduledFor;
    }

    // Update content
    if (content) {
      item.content = { ...item.content, ...content };
    }

    scheduledItems.set(id, item);

    return NextResponse.json({
      success: true,
      item: {
        id,
        type: item.type,
        status: item.status,
        scheduledFor: item.scheduledFor,
      },
    });
  } catch (error) {
    console.error("[Schedule] Update error:", error);
    return NextResponse.json({ error: "Failed to update scheduled item" }, { status: 500 });
  }
}

// DELETE - Remove scheduled item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const item = scheduledItems.get(id);
  if (!item) {
    return NextResponse.json({ error: "Scheduled item not found" }, { status: 404 });
  }

  scheduledItems.delete(id);

  return NextResponse.json({ success: true, deleted: id });
}
