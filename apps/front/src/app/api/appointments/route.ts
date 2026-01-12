import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

/**
 * APPOINTMENTS API
 *
 * Manages scheduled calls, meetings, and demos.
 * Integrates with the Core Execution Pipeline:
 * - HOT CALL QUEUE → 15-MIN DISCOVERY → 1-HOUR STRATEGY
 *
 * Appointments are stored as lead metadata with scheduledCallAt field.
 */

interface Appointment {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  scheduledAt: string;
  duration: number;
  type: "call" | "meeting" | "demo" | "discovery" | "strategy";
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "rescheduled";
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

// GET - Fetch appointments for a team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    // Query leads that have scheduled calls
    // In the leads table, we look for leads with scheduledCallAt set
    const conditions = [
      eq(leads.teamId, teamId),
      sql`${leads.customFields}->>'scheduledCallAt' IS NOT NULL`,
    ];

    if (status) {
      conditions.push(
        sql`${leads.customFields}->>'appointmentStatus' = ${status}`,
      );
    }

    if (fromDate) {
      conditions.push(
        sql`(${leads.customFields}->>'scheduledCallAt')::timestamp >= ${fromDate}::timestamp`,
      );
    }

    if (toDate) {
      conditions.push(
        sql`(${leads.customFields}->>'scheduledCallAt')::timestamp <= ${toDate}::timestamp`,
      );
    }

    const leadsWithAppointments = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(
        desc(sql`(${leads.customFields}->>'scheduledCallAt')::timestamp`),
      )
      .limit(limit);

    // Transform to Appointment format
    const appointments: Appointment[] = leadsWithAppointments.map((lead) => {
      const customFields = (lead.customFields as Record<string, unknown>) || {};
      return {
        id: `apt_${lead.id}`,
        leadId: lead.id,
        leadName:
          `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown",
        leadPhone: lead.phone || "",
        leadEmail: lead.email || undefined,
        scheduledAt:
          (customFields.scheduledCallAt as string) || new Date().toISOString(),
        duration: (customFields.appointmentDuration as number) || 15,
        type: (customFields.appointmentType as Appointment["type"]) || "call",
        status:
          (customFields.appointmentStatus as Appointment["status"]) ||
          "scheduled",
        notes: (customFields.appointmentNotes as string) || undefined,
        assignedTo: (customFields.assignedTo as string) || undefined,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      };
    });

    // Categorize appointments
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const categorized = {
      today: appointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledAt);
        return (
          aptDate >= today && aptDate < tomorrow && apt.status === "scheduled"
        );
      }),
      upcoming: appointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledAt);
        return aptDate >= tomorrow && apt.status === "scheduled";
      }),
      past: appointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledAt);
        return aptDate < today || apt.status === "completed";
      }),
      cancelled: appointments.filter(
        (apt) => apt.status === "cancelled" || apt.status === "no-show",
      ),
    };

    return NextResponse.json({
      success: true,
      appointments,
      categorized,
      stats: {
        total: appointments.length,
        today: categorized.today.length,
        upcoming: categorized.upcoming.length,
        completed: appointments.filter((a) => a.status === "completed").length,
        cancelled: categorized.cancelled.length,
      },
    });
  } catch (error) {
    console.error("[Appointments] GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch appointments",
      },
      { status: 500 },
    );
  }
}

// POST - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leadId,
      teamId,
      scheduledAt,
      duration = 15,
      type = "call",
      notes,
      assignedTo,
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 },
      );
    }

    // Verify lead exists
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Update lead with appointment data
    const currentCustomFields =
      (lead.customFields as Record<string, unknown>) || {};
    const updatedCustomFields = {
      ...currentCustomFields,
      scheduledCallAt: scheduledAt,
      appointmentDuration: duration,
      appointmentType: type,
      appointmentStatus: "scheduled",
      appointmentNotes: notes || null,
      assignedTo: assignedTo || null,
      appointmentCreatedAt: new Date().toISOString(),
    };

    await db
      .update(leads)
      .set({
        customFields: updatedCustomFields,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    const appointment: Appointment = {
      id: `apt_${lead.id}`,
      leadId: lead.id,
      leadName:
        `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown",
      leadPhone: lead.phone || "",
      leadEmail: lead.email || undefined,
      scheduledAt,
      duration,
      type,
      status: "scheduled",
      notes,
      assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(
      `[Appointments] Created appointment for lead ${leadId} at ${scheduledAt}`,
    );

    return NextResponse.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("[Appointments] POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create appointment",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update an appointment
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, status, scheduledAt, duration, type, notes } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    // Verify lead exists
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Update appointment fields
    const currentCustomFields =
      (lead.customFields as Record<string, unknown>) || {};
    const updates: Record<string, unknown> = { ...currentCustomFields };

    if (status) updates.appointmentStatus = status;
    if (scheduledAt) updates.scheduledCallAt = scheduledAt;
    if (duration) updates.appointmentDuration = duration;
    if (type) updates.appointmentType = type;
    if (notes !== undefined) updates.appointmentNotes = notes;
    updates.appointmentUpdatedAt = new Date().toISOString();

    await db
      .update(leads)
      .set({
        customFields: updates,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    console.log(
      `[Appointments] Updated appointment for lead ${leadId}: status=${status}`,
    );

    return NextResponse.json({
      success: true,
      leadId,
      updates: { status, scheduledAt, duration, type },
    });
  } catch (error) {
    console.error("[Appointments] PATCH error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update appointment",
      },
      { status: 500 },
    );
  }
}
