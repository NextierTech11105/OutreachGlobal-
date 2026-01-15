/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CALENDLY WEBHOOK - Meeting Booked Trigger
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/calendly/webhook
 *
 * FLOW:
 * 1. Lead books 15-min meeting via Calendly
 * 2. Webhook fires with invitee details
 * 3. Trigger Perplexity deep research for personalization
 * 4. Update lead with meeting info + research
 * 5. Prep the call with context
 *
 * THE HANDOFF:
 * Automation (THE LOOP) → Meeting Booked → Deep Research → High-Impact Call
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql, or, ilike } from "drizzle-orm";
import { Logger } from "@/lib/logger";

const log = new Logger("CalendlyWebhook");

// Calendly webhook event types
type CalendlyEvent =
  | "invitee.created"      // Meeting scheduled
  | "invitee.canceled"     // Meeting canceled
  | "invitee.rescheduled"; // Meeting rescheduled

interface CalendlyPayload {
  event: CalendlyEvent;
  payload: {
    event_type: {
      uuid: string;
      name: string;
      duration: number;
    };
    event: {
      uuid: string;
      name: string;
      start_time: string;
      end_time: string;
      location?: {
        type: string;
        location?: string;
        join_url?: string;
      };
    };
    invitee: {
      uuid: string;
      email: string;
      name: string;
      first_name?: string;
      last_name?: string;
      timezone: string;
      questions_and_answers?: Array<{
        question: string;
        answer: string;
      }>;
    };
    tracking?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CalendlyPayload = await request.json();
    const { event, payload } = body;

    log.info(`[Calendly] Event: ${event}`, { invitee: payload.invitee.email });

    // ═══════════════════════════════════════════════════════════════════════════
    // MEETING SCHEDULED - Trigger Perplexity Research
    // ═══════════════════════════════════════════════════════════════════════════
    if (event === "invitee.created") {
      const { invitee, event: meetingEvent } = payload;

      // Find the lead by email or phone
      const matchedLeads = await db
        .select()
        .from(leads)
        .where(
          or(
            ilike(leads.email, invitee.email),
            sql`custom_fields->>'email' ILIKE ${invitee.email}`
          )
        )
        .limit(1);

      let leadId: string | null = null;
      let leadData: typeof matchedLeads[0] | null = null;

      if (matchedLeads.length > 0) {
        leadData = matchedLeads[0];
        leadId = leadData.id;

        // Update lead with meeting info
        await db
          .update(leads)
          .set({
            stage: "appointment_set",
            customFields: sql`
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        COALESCE(custom_fields, '{}'::jsonb),
                        '{meetingId}',
                        ${JSON.stringify(meetingEvent.uuid)}::jsonb
                      ),
                      '{meetingTime}',
                      ${JSON.stringify(meetingEvent.start_time)}::jsonb
                    ),
                    '{meetingName}',
                    ${JSON.stringify(meetingEvent.name)}::jsonb
                  ),
                  '{temperature}',
                  '"HOT"'::jsonb
                ),
                '{calendlyInviteeId}',
                ${JSON.stringify(invitee.uuid)}::jsonb
              )
            `,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));

        log.info(`[Calendly] Lead updated: ${leadId} → appointment_set`);
      } else {
        // Create new lead from Calendly invitee
        const newLeadId = `lead_calendly_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await db.insert(leads).values({
          id: newLeadId,
          firstName: invitee.first_name || invitee.name.split(" ")[0] || "",
          lastName: invitee.last_name || invitee.name.split(" ").slice(1).join(" ") || "",
          email: invitee.email,
          phone: "",
          source: "calendly",
          stage: "appointment_set",
          customFields: {
            meetingId: meetingEvent.uuid,
            meetingTime: meetingEvent.start_time,
            meetingName: meetingEvent.name,
            temperature: "HOT",
            calendlyInviteeId: invitee.uuid,
            timezone: invitee.timezone,
            questionsAndAnswers: invitee.questions_and_answers,
            tracking: payload.tracking,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        leadId = newLeadId;
        log.info(`[Calendly] New lead created: ${newLeadId}`);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // TRIGGER PERPLEXITY DEEP RESEARCH
      // ═══════════════════════════════════════════════════════════════════════
      const companyName = leadData?.company ||
        (invitee.questions_and_answers?.find((q) => q.question.toLowerCase().includes("company"))?.answer);

      if (companyName || invitee.email) {
        try {
          // Extract domain from email for company research
          const emailDomain = invitee.email.split("@")[1];
          const researchTarget = companyName || emailDomain;

          log.info(`[Calendly] Triggering Perplexity research for: ${researchTarget}`);

          // Call Perplexity scanner asynchronously
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/research/deep`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId,
              companyName: researchTarget,
              inviteeEmail: invitee.email,
              inviteeName: invitee.name,
              meetingTime: meetingEvent.start_time,
              purpose: "meeting_prep",
              questions: [
                `What does ${researchTarget} do? Main products/services?`,
                `Who is the founder/CEO of ${researchTarget}?`,
                `What are recent news or announcements about ${researchTarget}?`,
                `What challenges might ${researchTarget} face that our automation could solve?`,
                `Company size and industry for ${researchTarget}?`,
              ],
            }),
          }).catch((err) => log.error("[Calendly] Research trigger failed:", err));

        } catch (error) {
          log.error("[Calendly] Research error:", error);
        }
      }

      return NextResponse.json({
        success: true,
        event: "invitee.created",
        leadId,
        action: "meeting_scheduled",
        meetingTime: meetingEvent.start_time,
        research: "triggered",
        nextStep: "Perplexity deep research for personalization",
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEETING CANCELED
    // ═══════════════════════════════════════════════════════════════════════════
    if (event === "invitee.canceled") {
      const { invitee } = payload;

      // Find and update the lead
      const result = await db
        .update(leads)
        .set({
          stage: "engaged", // Demote from appointment_set
          customFields: sql`
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{meetingCanceled}',
                'true'::jsonb
              ),
              '{temperature}',
              '"WARM"'::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(ilike(leads.email, invitee.email));

      log.info(`[Calendly] Meeting canceled for: ${invitee.email}`);

      return NextResponse.json({
        success: true,
        event: "invitee.canceled",
        action: "meeting_canceled",
        nextStep: "Lead demoted to WARM, re-enter nurture sequence",
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEETING RESCHEDULED
    // ═══════════════════════════════════════════════════════════════════════════
    if (event === "invitee.rescheduled") {
      const { invitee, event: meetingEvent } = payload;

      await db
        .update(leads)
        .set({
          customFields: sql`
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{meetingTime}',
                ${JSON.stringify(meetingEvent.start_time)}::jsonb
              ),
              '{rescheduled}',
              'true'::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(ilike(leads.email, invitee.email));

      log.info(`[Calendly] Meeting rescheduled for: ${invitee.email}`);

      return NextResponse.json({
        success: true,
        event: "invitee.rescheduled",
        action: "meeting_rescheduled",
        newTime: meetingEvent.start_time,
      });
    }

    return NextResponse.json({
      success: true,
      event,
      action: "unhandled_event",
    });
  } catch (error) {
    log.error("[Calendly] Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}

// Verify Calendly webhook signature (optional but recommended)
export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: "/api/calendly/webhook",
    events: ["invitee.created", "invitee.canceled", "invitee.rescheduled"],
    flow: {
      "invitee.created": [
        "Find/create lead",
        "Update stage to appointment_set",
        "Set temperature to HOT",
        "Trigger Perplexity deep research",
        "Prep personalized call notes",
      ],
      "invitee.canceled": [
        "Demote lead to WARM",
        "Re-enter nurture sequence",
      ],
      "invitee.rescheduled": [
        "Update meeting time",
        "Keep HOT status",
      ],
    },
  });
}
