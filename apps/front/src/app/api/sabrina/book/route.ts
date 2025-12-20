/**
 * SABRINA BOOK API - The Closer
 *
 * Handles appointment booking for qualified leads:
 * - POST: Book appointment, send calendar invite
 * - GET: Get available slots
 *
 * SABRINA positions calls as "strategy sessions" not sales calls.
 * Uses specific times rather than "whenever works".
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signalHouseService } from "@/lib/services/signalhouse-service";
import { SABRINA } from "@/lib/ai-workers/digital-workers";

// Business hours for scheduling (9 AM - 5 PM EST)
const BUSINESS_HOURS = {
  start: 9,
  end: 17,
  timezone: "America/New_York",
};

// Slot duration in minutes
const SLOT_DURATION = 30;

// Generate available slots for the next N days
function generateAvailableSlots(days: number = 5): Array<{ date: string; time: string; slot: string }> {
  const slots: Array<{ date: string; time: string; slot: string }> = [];
  const now = new Date();

  for (let d = 1; d <= days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      for (let min = 0; min < 60; min += SLOT_DURATION) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, min, 0, 0);

        // Format nicely
        const dateStr = slotTime.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const timeStr = slotTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        slots.push({
          date: dateStr,
          time: timeStr,
          slot: slotTime.toISOString(),
        });
      }
    }
  }

  return slots;
}

// Booking confirmation templates
const BOOKING_TEMPLATES = {
  confirmation: {
    sms: `{{first_name}} — you're all set for {{date}} at {{time}}! 📅

I'll call you then. Here's what we'll cover:
- Quick look at your property/business situation
- 3 options you might not know about
- No pressure, just ideas

See you soon!
— Sabrina`,
    subject: "Strategy Session Confirmed",
  },
  reminder: {
    sms: `Hey {{first_name}}! Just a friendly reminder about our call tomorrow at {{time}}. Looking forward to chatting! — Sabrina`,
    subject: "Reminder: Strategy Session Tomorrow",
  },
  followup: {
    sms: `{{first_name}} — thanks for the great conversation! As promised, here's the next step: {{next_step}}. Let me know if you have any questions!`,
  },
};

interface BookRequest {
  leadId: string;
  slot: string; // ISO date string
  duration?: number; // minutes
  notes?: string;
  sendConfirmation?: boolean;
  calendarLink?: string; // Custom calendar link
}

// POST - Book an appointment
export async function POST(request: NextRequest) {
  try {
    const body: BookRequest = await request.json();
    const {
      leadId,
      slot,
      duration = SLOT_DURATION,
      notes,
      sendConfirmation = true,
      calendarLink,
    } = body;

    if (!leadId || !slot) {
      return NextResponse.json(
        { success: false, error: "leadId and slot are required" },
        { status: 400 }
      );
    }

    // Validate slot is in the future
    const slotDate = new Date(slot);
    if (slotDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Slot must be in the future" },
        { status: 400 }
      );
    }

    // Get lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    // Format dates for message
    const dateStr = slotDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const timeStr = slotDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Create appointment record
    const appointmentId = crypto.randomUUID();
    const appointment = {
      id: appointmentId,
      leadId,
      scheduledAt: slot,
      duration,
      status: "scheduled",
      notes,
      worker: "sabrina",
      createdAt: new Date().toISOString(),
    };

    // Update lead with appointment info
    await db
      .update(leads)
      .set({
        status: "appointment",
        appointmentDate: slotDate,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    // Send confirmation if requested
    let confirmationSent = false;
    if (sendConfirmation && lead.phone) {
      let message = BOOKING_TEMPLATES.confirmation.sms;
      message = message.replace(/\{\{first_name\}\}/g, lead.firstName || "there");
      message = message.replace(/\{\{date\}\}/g, dateStr);
      message = message.replace(/\{\{time\}\}/g, timeStr);

      // Add calendar link if provided
      if (calendarLink) {
        message += `\n\nAdd to calendar: ${calendarLink}`;
      }

      try {
        await signalHouseService.sendSMS({
          to: lead.phone,
          message,
          tags: ["sabrina", "booking", "confirmation"],
        });

        // Log SMS
        await db.insert(smsMessages).values({
          id: crypto.randomUUID(),
          leadId,
          direction: "outbound",
          fromNumber: process.env.SIGNALHOUSE_PHONE_NUMBER || "",
          toNumber: lead.phone,
          body: message,
          status: "sent",
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        confirmationSent = true;
      } catch (smsError) {
        console.error("[Sabrina Book] SMS error:", smsError);
      }
    }

    console.log(
      `[Sabrina Book] Booked appointment for ${lead.firstName} on ${dateStr} at ${timeStr}`
    );

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointmentId,
        leadId,
        scheduledAt: slot,
        duration,
        dateFormatted: dateStr,
        timeFormatted: timeStr,
        notes,
      },
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        phone: lead.phone,
        email: lead.email,
      },
      confirmationSent,
      worker: "sabrina",
    });
  } catch (error) {
    console.error("[Sabrina Book] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Booking failed",
      },
      { status: 500 }
    );
  }
}

// GET - Get available slots
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "5");
  const leadId = searchParams.get("leadId");

  // Generate slots
  const slots = generateAvailableSlots(Math.min(days, 14));

  // Get lead info if provided
  let lead = null;
  if (leadId) {
    const [foundLead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);
    lead = foundLead;
  }

  // Group by date
  const slotsByDate: Record<string, Array<{ time: string; slot: string }>> = {};
  for (const slot of slots) {
    if (!slotsByDate[slot.date]) {
      slotsByDate[slot.date] = [];
    }
    slotsByDate[slot.date].push({ time: slot.time, slot: slot.slot });
  }

  return NextResponse.json({
    success: true,
    worker: {
      id: SABRINA.id,
      name: SABRINA.name,
      role: SABRINA.role,
      tagline: SABRINA.tagline,
    },
    lead: lead
      ? {
          id: lead.id,
          firstName: lead.firstName,
          hasEmail: !!lead.email,
          currentStatus: lead.status,
        }
      : null,
    availableSlots: slotsByDate,
    totalSlots: slots.length,
    businessHours: BUSINESS_HOURS,
    suggestedPhrases: SABRINA.linguistic.closings,
  });
}
