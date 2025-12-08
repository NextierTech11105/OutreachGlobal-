/**
 * Calendar Leads API
 * GET leads for a date range (for calendar view)
 * POST push leads to SMS campaign stages
 */

import { NextRequest, NextResponse } from "next/server";

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
const CAMPAIGN_TEMPLATES: Record<string, { message: string; category: string }> = {
  initial: {
    category: "sms_initial",
    message: "Hi {name}! I noticed your property at {address}. I'm reaching out about potential opportunities in your area. Would you be open to a quick chat?",
  },
  nc_retarget: {
    category: "sms_followup",
    message: "Hi {name}, just following up on my previous message about {address}. I'd love to connect when you have a moment. Reply YES if interested!",
  },
  nurture: {
    category: "sms_nurture",
    message: "Hey {name}! Hope you're doing well. I wanted to check in and see if anything has changed with your property at {address}. Always here if you need anything!",
  },
  nudger: {
    category: "sms_nudge",
    message: "{name}, quick reminder - we're still interested in discussing {address}. This week might be our last chance to connect. Let me know if you'd like to chat!",
  },
};

// GET - Fetch leads for calendar view by date range
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");

  try {
    // In production, this would query the database
    // For now, we'll return mock data that matches the calendar structure

    // Generate mock leads for the date range
    const leads: CalendarLead[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Mock data generation - replace with real DB query
      const names = ["John Smith", "Sarah Johnson", "Mike Williams", "Emily Davis", "James Brown", "Lisa Miller"];
      const statuses: CalendarLead["status"][] = ["new", "contacted", "qualified", "nurture"];
      const leadTypes = ["Pre-Foreclosure", "High Equity", "Absentee", "Tax Lien", "Inherited"];
      const cities = ["Miami", "Tampa", "Orlando", "Jacksonville"];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const count = Math.floor(Math.random() * 6) + 1;

        for (let i = 0; i < count; i++) {
          const leadStatus = statuses[Math.floor(Math.random() * statuses.length)];

          // Filter by status if provided
          if (status && status !== "all" && leadStatus !== status) continue;

          leads.push({
            id: `lead-${d.toISOString().split("T")[0]}-${i}`,
            name: names[Math.floor(Math.random() * names.length)],
            phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
            email: `lead${d.getDate()}${i}@email.com`,
            address: `${100 + i * 10} Main St`,
            city: cities[Math.floor(Math.random() * cities.length)],
            state: "FL",
            propertyValue: Math.floor(Math.random() * 400000 + 150000),
            equity: Math.floor(Math.random() * 200000 + 50000),
            leadType: leadTypes[Math.floor(Math.random() * leadTypes.length)],
            status: leadStatus,
            createdAt: new Date(d).toISOString(),
            source: "RealEstateAPI",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      leads,
      count: leads.length,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("[Calendar Leads] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// POST - Push leads to SMS campaign stage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leads, campaignStage, customMessage } = body;

    switch (action) {
      case "push_to_campaign": {
        if (!leads || !Array.isArray(leads) || leads.length === 0) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 }
          );
        }

        if (!campaignStage || !CAMPAIGN_TEMPLATES[campaignStage]) {
          return NextResponse.json(
            { success: false, error: "Valid campaignStage required (initial, nc_retarget, nurture, nudger)" },
            { status: 400 }
          );
        }

        const template = CAMPAIGN_TEMPLATES[campaignStage];
        const templateMessage = customMessage || template.message;

        // Format leads for SMS queue
        const smsLeads = leads
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
          return NextResponse.json({
            success: false,
            error: "No leads with phone numbers",
          });
        }

        // Push to SMS queue as drafts for human review
        const queueResponse = await fetch(new URL("/api/sms/queue", request.url).toString(), {
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
        });

        const queueResult = await queueResponse.json();

        return NextResponse.json({
          success: true,
          stage: campaignStage,
          totalLeads: leads.length,
          leadsWithPhone: smsLeads.length,
          queued: queueResult.added || 0,
          skipped: queueResult.skipped || 0,
          campaignId: `calendar-${campaignStage}-${Date.now()}`,
          message: `${queueResult.added || smsLeads.length} leads pushed to ${campaignStage} campaign for review`,
        });
      }

      case "update_status": {
        // Update lead status (contacted, qualified, etc.)
        const { leadId, newStatus } = body;

        if (!leadId || !newStatus) {
          return NextResponse.json(
            { success: false, error: "leadId and newStatus required" },
            { status: 400 }
          );
        }

        // In production, update the database
        // For now, just return success
        return NextResponse.json({
          success: true,
          leadId,
          newStatus,
          message: `Lead ${leadId} updated to ${newStatus}`,
        });
      }

      case "bulk_update_status": {
        // Bulk update lead statuses
        const { leadIds, newStatus } = body;

        if (!leadIds || !Array.isArray(leadIds) || !newStatus) {
          return NextResponse.json(
            { success: false, error: "leadIds array and newStatus required" },
            { status: 400 }
          );
        }

        // In production, bulk update the database
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
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Calendar Leads] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
