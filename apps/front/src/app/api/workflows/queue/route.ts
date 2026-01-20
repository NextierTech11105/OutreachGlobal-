/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WORKFLOW QUEUE API - Copilot Worker Routing
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Routes leads to the appropriate AI worker queue:
 * - GIANNA (opener) → SMS outreach queue
 * - CATHY (nudger) → Follow-up queue
 * - SABRINA (closer) → Booking/call queue
 *
 * POST /api/workflows/queue
 * {
 *   "worker": "gianna" | "cathy" | "sabrina",
 *   "action": "queue_sms" | "queue_nudge" | "queue_booking",
 *   "lead": { name, company, phone, email, stage }
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface QueueRequest {
  worker: "gianna" | "cathy" | "sabrina";
  action: "queue_sms" | "queue_nudge" | "queue_booking";
  lead: {
    id?: string;
    name?: string;
    company?: string;
    phone?: string;
    email?: string;
    stage?: string;
    source?: string;
  };
  teamId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: QueueRequest = await req.json();
    const { worker, action, lead } = body;
    const teamId = body.teamId || req.headers.get("x-team-id") || "tm_nextiertech";

    if (!worker || !action || !lead) {
      return NextResponse.json(
        { error: "Missing required fields: worker, action, lead" },
        { status: 400 }
      );
    }

    // Find or create lead in database
    let leadId = lead.id;
    let dbLead;

    if (lead.phone) {
      // Try to find existing lead by phone
      const normalizedPhone = lead.phone.replace(/\D/g, "");
      const [existingLead] = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.teamId, teamId),
            eq(leads.phone, normalizedPhone)
          )
        )
        .limit(1);

      if (existingLead) {
        dbLead = existingLead;
        leadId = existingLead.id;
      } else {
        // Create new lead
        leadId = uuid();
        const [newLead] = await db
          .insert(leads)
          .values({
            id: leadId,
            teamId,
            phone: normalizedPhone,
            firstName: lead.name?.split(" ")[0] || null,
            lastName: lead.name?.split(" ").slice(1).join(" ") || null,
            company: lead.company || null,
            email: lead.email || null,
            stage: lead.stage || "new",
            source: lead.source || `copilot_${worker}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        dbLead = newLead;
      }
    }

    // Route to appropriate queue based on worker
    let queueResult;

    switch (worker) {
      case "gianna":
        // Queue for SMS opener
        queueResult = await queueForSms(leadId!, teamId, "gianna", dbLead);
        break;

      case "cathy":
        // Queue for follow-up nudge
        queueResult = await queueForSms(leadId!, teamId, "cathy", dbLead);
        break;

      case "sabrina":
        // Queue for booking/call
        queueResult = await queueForCall(leadId!, teamId, dbLead);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown worker: ${worker}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      worker,
      action,
      leadId,
      queued: true,
      ...queueResult,
      message: `Lead queued for ${worker.toUpperCase()}`,
    });
  } catch (error) {
    console.error("[Workflows Queue] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Queue failed" },
      { status: 500 }
    );
  }
}

async function queueForSms(
  leadId: string,
  teamId: string,
  worker: "gianna" | "cathy",
  lead?: any
) {
  try {
    // Update lead stage based on worker
    const newStage = worker === "gianna" ? "queued_opener" : "queued_nudge";
    await db
      .update(leads)
      .set({
        stage: newStage,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    // Notify backend queue processor
    try {
      await fetch(`${API_URL}/sms/queue/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-team-id": teamId,
        },
        body: JSON.stringify({
          leadId,
          worker,
          phone: lead?.phone,
          priority: worker === "gianna" ? 1 : 2,
        }),
      });
    } catch {
      // Backend notification is optional - lead still marked for processing
    }

    return {
      queueType: "sms",
      worker,
      stage: newStage,
    };
  } catch (error) {
    console.error("[SMS Queue] Error:", error);
    throw error;
  }
}

async function queueForCall(leadId: string, teamId: string, lead?: any) {
  try {
    // Update lead stage to indicate ready for call
    await db
      .update(leads)
      .set({
        stage: "ready_for_call",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    // Notify backend power dialer queue
    try {
      await fetch(`${API_URL}/power-dialer/queue/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-team-id": teamId,
        },
        body: JSON.stringify({
          leadId,
          phone: lead?.phone,
          priority: "high",
          source: "copilot_sabrina",
        }),
      });
    } catch {
      // Backend notification is optional
    }

    return {
      queueType: "call",
      worker: "sabrina",
      stage: "ready_for_call",
    };
  } catch (error) {
    console.error("[Call Queue] Error:", error);
    throw error;
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/workflows/queue",
    description: "Queue leads for AI worker processing",
    workers: {
      gianna: "SMS opener - first touch outreach",
      cathy: "SMS nudger - follow-up sequences",
      sabrina: "Closer - booking and call scheduling",
    },
    actions: {
      queue_sms: "Add to SMS outreach queue",
      queue_nudge: "Add to follow-up queue",
      queue_booking: "Add to call/booking queue",
    },
    example: {
      worker: "gianna",
      action: "queue_sms",
      lead: {
        name: "John Smith",
        company: "Acme Corp",
        phone: "+15551234567",
        email: "john@acme.com",
      },
    },
  });
}
