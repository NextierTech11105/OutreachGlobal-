/**
 * Calendar Leads API
 * GET leads for a date range (for calendar view)
 * POST push leads to SMS campaign stages / schedule to calendar
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// Lead type for calendar
interface CalendarLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  propertyValue?: number;
  equity?: number;
  leadType?: string;
  status: "new" | "contacted" | "qualified" | "nurture" | "closed" | "lost";
  createdAt: string;
  lastContactedAt?: string;
  source?: string;
}

// Campaign stage templates
const CAMPAIGN_TEMPLATES: Record<
  string,
  { message: string; category: string }
> = {
  initial: {
    category: "sms_initial",
    message:
      "Hi {name}! I noticed your property at {address}. I'm reaching out about potential opportunities in your area. Would you be open to a quick chat?",
  },
  nc_retarget: {
    category: "sms_followup",
    message:
      "Hi {name}, just following up on my previous message about {address}. I'd love to connect when you have a moment. Reply YES if interested!",
  },
  nurture: {
    category: "sms_nurture",
    message:
      "Hey {name}! Hope you're doing well. I wanted to check in and see if anything has changed with your property at {address}. Always here if you need anything!",
  },
  nudger: {
    category: "sms_nudge",
    message:
      "{name}, quick reminder - we're still interested in discussing {address}. This week might be our last chance to connect. Let me know if you'd like to chat!",
  },
};

// Map DB status to calendar status
function mapDbStatus(status: string): CalendarLead["status"] {
  const map: Record<string, CalendarLead["status"]> = {
    new: "new",
    contacted: "contacted",
    qualified: "qualified",
    nurturing: "nurture",
    closed: "closed",
    lost: "lost",
  };
  return map[status] || "new";
}

// GET - Fetch leads for calendar view by date range
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    // Validate date formats if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json(
        { error: "Invalid endDate format" },
        { status: 400 }
      );
    }

    // Build query conditions properly - these columns are defined in schema
    const conditions = [eq(leads.userId, userId)];

    if (startDate) {
      conditions.push(gte(leads.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(leads.createdAt, new Date(endDate)));
    }

    if (status && status !== "all") {
      conditions.push(eq(leads.status, status));
    }

    // Fetch leads from database
    const results = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(1000);

    // Transform to calendar format with proper type handling
    const calendarLeads: CalendarLead[] = results.map((lead) => ({
      id: lead.id,
      name:
        [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
        lead.name ||
        "Unknown",
      phone: lead.phone || undefined,
      email: lead.email || undefined,
      address: lead.propertyAddress || undefined,
      city: lead.propertyCity || undefined,
      state: lead.propertyState || undefined,
      propertyValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined,
      equity: lead.equity ? Number(lead.equity) : undefined,
      leadType: lead.leadType || lead.propertyType || undefined,
      status: mapDbStatus(lead.status || "new"),
      createdAt: lead.createdAt
        ? new Date(lead.createdAt).toISOString()
        : new Date().toISOString(),
      lastContactedAt: lead.lastActivityAt
        ? new Date(lead.lastActivityAt).toISOString()
        : undefined,
      source: lead.source || "Unknown",
    }));

    return NextResponse.json({
      success: true,
      leads: calendarLeads,
      count: calendarLeads.length,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("[Calendar Leads] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leads",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// POST - Push leads to SMS campaign stage or schedule to calendar
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      action,
      leads: inputLeads,
      campaignStage,
      customMessage,
      scheduledDate,
    } = body;

    // Validate action
    const validActions = ["push_to_campaign", "schedule_to_calendar", "update_status", "bulk_update_status", "add_leads"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    switch (action) {
      case "add_leads": {
        // Add leads to calendar (from sectors page)
        if (!inputLeads || !Array.isArray(inputLeads) || inputLeads.length === 0) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 }
          );
        }

        // Limit batch size to prevent abuse
        if (inputLeads.length > 500) {
          return NextResponse.json(
            { success: false, error: "Maximum 500 leads per request" },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          added: inputLeads.length,
          message: `${inputLeads.length} leads added to calendar`,
        });
      }

      case "push_to_campaign": {
        if (
          !inputLeads ||
          !Array.isArray(inputLeads) ||
          inputLeads.length === 0
        ) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 },
          );
        }

        // Limit batch size
        if (inputLeads.length > 500) {
          return NextResponse.json(
            { success: false, error: "Maximum 500 leads per request" },
            { status: 400 }
          );
        }

        if (!campaignStage || !CAMPAIGN_TEMPLATES[campaignStage]) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Valid campaignStage required (initial, nc_retarget, nurture, nudger)",
            },
            { status: 400 },
          );
        }

        const template = CAMPAIGN_TEMPLATES[campaignStage];
        const templateMessage = customMessage || template.message;

        // Format leads for SMS queue
        const smsLeads = inputLeads
          .filter((lead: CalendarLead) => lead.phone)
          .map((lead: CalendarLead) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            variables: {
              name: lead.name?.split(" ")[0] || "there",
              fullName: lead.name,
              address: lead.address || "your property",
              city: lead.city,
              state: lead.state,
              propertyValue: lead.propertyValue,
              equity: lead.equity,
            },
          }));

        if (smsLeads.length === 0) {
          return NextResponse.json(
            { success: false, error: "No leads with phone numbers" },
            { status: 400 }
          );
        }

        // Push to SMS queue as drafts for human review
        const queueResponse = await fetch(
          new URL("/api/sms/queue", request.url).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add_draft_batch",
              leads: smsLeads,
              templateCategory: template.category,
              templateMessage,
              campaignId: `calendar-${campaignStage}-${Date.now()}`,
              agent: "gianna",
            }),
          },
        );

        const queueResult = await queueResponse.json();

        return NextResponse.json({
          success: true,
          stage: campaignStage,
          totalLeads: inputLeads.length,
          leadsWithPhone: smsLeads.length,
          queued: queueResult.added || 0,
          skipped: queueResult.skipped || 0,
          campaignId: `calendar-${campaignStage}-${Date.now()}`,
          message: `${queueResult.added || smsLeads.length} leads pushed to ${campaignStage} campaign for review`,
        });
      }

      case "schedule_to_calendar": {
        if (
          !inputLeads ||
          !Array.isArray(inputLeads) ||
          inputLeads.length === 0
        ) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 },
          );
        }

        // Limit batch size
        if (inputLeads.length > 500) {
          return NextResponse.json(
            { success: false, error: "Maximum 500 leads per request" },
            { status: 400 }
          );
        }

        const scheduleDate =
          scheduledDate || new Date().toISOString().split("T")[0];

        // Validate date
        if (isNaN(Date.parse(scheduleDate))) {
          return NextResponse.json(
            { success: false, error: "Invalid scheduledDate format" },
            { status: 400 }
          );
        }

        const leadIds = inputLeads.map((l: CalendarLead) => l.id);
        const updatePromises = leadIds.map((id: string) =>
          db
            .update(leads)
            .set({
              scheduledFollowUp: new Date(scheduleDate),
              updatedAt: new Date(),
            })
            .where(and(eq(leads.id, id), eq(leads.userId, userId))),
        );

        await Promise.all(updatePromises);

        return NextResponse.json({
          success: true,
          scheduled: leadIds.length,
          scheduledDate: scheduleDate,
          message: `${leadIds.length} leads scheduled for ${new Date(scheduleDate).toLocaleDateString()}`,
        });
      }

      case "update_status": {
        const { leadId, newStatus } = body;

        if (!leadId || !newStatus) {
          return NextResponse.json(
            { success: false, error: "leadId and newStatus required" },
            { status: 400 },
          );
        }

        // Validate status
        const validStatuses = ["new", "contacted", "qualified", "nurturing", "closed", "lost"];
        if (!validStatuses.includes(newStatus)) {
          return NextResponse.json(
            { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
            { status: 400 }
          );
        }

        await db
          .update(leads)
          .set({
            status: newStatus,
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

        return NextResponse.json({
          success: true,
          leadId,
          newStatus,
          message: `Lead updated to ${newStatus}`,
        });
      }

      case "bulk_update_status": {
        const { leadIds, newStatus } = body;

        if (!leadIds || !Array.isArray(leadIds) || !newStatus) {
          return NextResponse.json(
            { success: false, error: "leadIds array and newStatus required" },
            { status: 400 },
          );
        }

        // Limit batch size
        if (leadIds.length > 500) {
          return NextResponse.json(
            { success: false, error: "Maximum 500 leads per request" },
            { status: 400 }
          );
        }

        // Validate status
        const validStatuses = ["new", "contacted", "qualified", "nurturing", "closed", "lost"];
        if (!validStatuses.includes(newStatus)) {
          return NextResponse.json(
            { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
            { status: 400 }
          );
        }

        const updatePromises = leadIds.map((id: string) =>
          db
            .update(leads)
            .set({
              status: newStatus,
              lastActivityAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(eq(leads.id, id), eq(leads.userId, userId))),
        );

        await Promise.all(updatePromises);

        return NextResponse.json({
          success: true,
          updated: leadIds.length,
          newStatus,
          message: `${leadIds.length} leads updated to ${newStatus}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Calendar Leads] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    );
  }
}
