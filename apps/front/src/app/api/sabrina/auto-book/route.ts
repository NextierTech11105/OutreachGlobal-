/**
 * SABRINA AUTO-BOOK API
 *
 * Automatically sends booking messages to qualified leads.
 * This is triggered by the workflow engine when leads reach the BOOKING stage.
 *
 * Flow:
 * 1. Workflow detects lead is ready to book (email_captured, wants_call, high_intent)
 * 2. Workflow triggers this endpoint
 * 3. SABRINA generates available slots and sends booking message
 * 4. Lead responds with preferred time
 * 5. Human (or auto-confirm if enabled) books the appointment
 *
 * ENFORCEMENT: All sends go through ExecutionRouter with templateId.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { eq, inArray, and, sql } from "drizzle-orm";
import { executeSMS, isRouterConfigured } from "@/lib/sms/ExecutionRouter";
import { SABRINA } from "@/lib/ai-workers/digital-workers";

// Business hours for scheduling
const BUSINESS_HOURS = {
  start: 9,
  end: 17,
  timezone: "America/New_York",
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING & PAYMENT CONFIGURATION - Nextier Core Revenue Engine
// ═══════════════════════════════════════════════════════════════════════════════
//
// PHILOSOPHY: 15-min meetings → Intent + Feedback → $500 Special → Control Relationship
// We dictate the pace. They come to us. We control perception.
//
const BOOKING_CONFIG = {
  // 15-min strategy calls (30-min available for qualified)
  CALENDLY_15MIN:
    process.env.CALENDLY_15MIN_LINK ||
    "https://calendly.com/tb-outreachglobal/15min",
  CALENDLY_30MIN:
    process.env.CALENDLY_LINK || "https://calendly.com/tb-outreachglobal/30min",

  // Stripe Payment Links - $500 One-Time Special (with feedback deal)
  PAYMENT_LINKS: {
    // $500 One-Time Special - Entry point, includes feedback session
    SPECIAL:
      process.env.STRIPE_SPECIAL_LINK || "https://buy.stripe.com/special",
    // $2,500 Weekly - For committed clients
    WEEKLY: process.env.STRIPE_WEEKLY_LINK || "https://buy.stripe.com/weekly",
    // $8,000 Monthly - Full retainer
    MONTHLY:
      process.env.STRIPE_MONTHLY_LINK || "https://buy.stripe.com/monthly",
  },

  // Feedback deal structure
  FEEDBACK_DEAL: {
    price: 500,
    includes: [
      "15-min strategy call",
      "Custom workflow audit",
      "Feedback session",
      "Implementation roadmap",
    ],
    upsell: "Weekly retainer after proving value",
  },

  // Video conference
  VIDEO_PROVIDER: process.env.VIDEO_PROVIDER || "google_meet",
  ZOOM_LINK: process.env.ZOOM_PERSONAL_LINK,
  GOOGLE_MEET_PREFIX: "https://meet.google.com",
};

// Generate next N available slots
function getNextAvailableSlots(count: number = 3): string[] {
  const slots: string[] = [];
  const now = new Date();
  let daysChecked = 0;

  while (slots.length < count && daysChecked < 10) {
    daysChecked++;
    const date = new Date(now);
    date.setDate(date.getDate() + daysChecked);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Add morning slot (10 AM)
    const morningSlot = new Date(date);
    morningSlot.setHours(10, 0, 0, 0);
    if (slots.length < count) {
      slots.push(formatSlot(morningSlot));
    }

    // Add afternoon slot (2 PM)
    const afternoonSlot = new Date(date);
    afternoonSlot.setHours(14, 0, 0, 0);
    if (slots.length < count) {
      slots.push(formatSlot(afternoonSlot));
    }
  }

  return slots;
}

function formatSlot(date: Date): string {
  const dayStr = date.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dayStr} at ${timeStr}`;
}

interface AutoBookRequest {
  leadIds: string[];
  teamId: string;
  templateId?: string;
  autoConfirmSlot?: boolean; // Auto-confirm if lead picks a slot
  trainingMode?: boolean;
}

interface AutoBookResult {
  leadId: string;
  success: boolean;
  messageId?: string;
  error?: string;
  slots?: string[];
}

// POST - Send booking messages to leads
export async function POST(request: NextRequest) {
  try {
    const body: AutoBookRequest = await request.json();
    const {
      leadIds,
      teamId,
      templateId = "sabrina-book-offer",
      autoConfirmSlot = false,
      trainingMode = false,
    } = body;

    if (!leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "leadIds is required" },
        { status: 400 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 },
      );
    }

    // Check router configuration
    const routerStatus = isRouterConfigured();
    if (!routerStatus.configured) {
      return NextResponse.json(
        { success: false, error: `SMS not configured: ${routerStatus.reason}` },
        { status: 503 },
      );
    }

    // Get SABRINA's phone number
    let sabrinaNumber: string | undefined;
    try {
      const phoneRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/workers/phone?worker=sabrina&teamId=${teamId}`,
      );
      const phoneData = await phoneRes.json();
      if (phoneData.success && phoneData.assignment?.phoneNumber) {
        sabrinaNumber = phoneData.assignment.phoneNumber;
      }
    } catch (e) {
      sabrinaNumber = process.env.SABRINA_PHONE_NUMBER;
    }

    // Fetch leads
    const leadsData = await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds));

    if (leadsData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No leads found" },
        { status: 404 },
      );
    }

    const results: AutoBookResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Generate available slots
    const availableSlots = getNextAvailableSlots(3);
    const slotsText = availableSlots.map((s, i) => `${i + 1}. ${s}`).join("\n");

    // Process each lead
    for (const lead of leadsData) {
      if (!lead.phone) {
        results.push({
          leadId: lead.id,
          success: false,
          error: "No phone number",
        });
        failCount++;
        continue;
      }

      // Build message variables
      const variables: Record<string, string> = {
        firstName: lead.firstName || "there",
        first_name: lead.firstName || "there",
        slots: slotsText,
        slot1: availableSlots[0] || "",
        slot2: availableSlots[1] || "",
        slot3: availableSlots[2] || "",
      };

      // Send via ExecutionRouter
      try {
        const result = await executeSMS({
          templateId,
          to: lead.phone,
          from: sabrinaNumber,
          variables,
          leadId: lead.id,
          teamId,
          worker: "SABRINA",
          trainingMode,
        });

        if (result.success) {
          results.push({
            leadId: lead.id,
            success: true,
            messageId: result.messageId,
            slots: availableSlots,
          });
          successCount++;

          // Update lead status
          const customFields =
            (lead.customFields as Record<string, unknown>) || {};
          await db
            .update(leads)
            .set({
              pipelineStatus: "booking",
              customFields: {
                ...customFields,
                sabrinaStatus: "booking_sent",
                sabrinaLastSentAt: new Date().toISOString(),
                sabrinaOfferedSlots: availableSlots,
                sabrinaAutoConfirm: autoConfirmSlot,
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));

          // Log the message
          try {
            await db.insert(smsMessages).values({
              id: result.messageId || crypto.randomUUID(),
              leadId: lead.id,
              direction: "outbound",
              fromNumber: result.sentFrom || sabrinaNumber,
              toNumber: lead.phone,
              body: result.renderedMessage,
              status: trainingMode ? "training" : "sent",
              sentAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch (e) {
            // Non-fatal logging error
          }
        } else {
          results.push({
            leadId: lead.id,
            success: false,
            error: result.error || "Send failed",
          });
          failCount++;
        }
      } catch (error) {
        results.push({
          leadId: lead.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failCount++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `[SABRINA AutoBook] Batch complete: ${successCount} sent, ${failCount} failed`,
    );

    return NextResponse.json({
      success: true,
      summary: {
        total: leadIds.length,
        sent: successCount,
        failed: failCount,
      },
      results,
      offeredSlots: availableSlots,
      worker: "sabrina",
    });
  } catch (error) {
    console.error("[SABRINA AutoBook] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Auto-book failed",
      },
      { status: 500 },
    );
  }
}

// GET - Get leads ready for booking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 },
      );
    }

    // Find leads that are ready for booking
    // Criteria: has email OR tagged as high_intent OR in booking pipeline
    const readyLeads = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        email: leads.email,
        status: leads.status,
        pipelineStatus: leads.pipelineStatus,
        tags: leads.tags,
        customFields: leads.customFields,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          sql`(
            ${leads.email} IS NOT NULL
            OR ${leads.pipelineStatus} = 'booking'
            OR ${leads.tags}::text LIKE '%high_intent%'
            OR ${leads.tags}::text LIKE '%wants_call%'
            OR ${leads.customFields}->>'email_captured' IS NOT NULL
          )`,
        ),
      )
      .limit(limit);

    // Filter out leads that already have pending booking messages
    const pendingBooking = readyLeads.filter((lead) => {
      const customFields = lead.customFields as Record<string, unknown> | null;
      return customFields?.sabrinaStatus !== "booking_sent";
    });

    // Get available slots
    const availableSlots = getNextAvailableSlots(3);

    return NextResponse.json({
      success: true,
      worker: {
        id: SABRINA.id,
        name: SABRINA.name,
        role: SABRINA.role,
      },
      leads: {
        total: readyLeads.length,
        pendingBooking: pendingBooking.length,
        list: pendingBooking.map((lead) => ({
          id: lead.id,
          name:
            `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
            "Unknown",
          phone: lead.phone,
          hasEmail: !!lead.email,
          pipelineStatus: lead.pipelineStatus,
          tags: lead.tags,
        })),
      },
      availableSlots,
      businessHours: BUSINESS_HOURS,
    });
  } catch (error) {
    console.error("[SABRINA AutoBook] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get leads",
      },
      { status: 500 },
    );
  }
}
