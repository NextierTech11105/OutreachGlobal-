import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

const CONTACT_EMAIL = "tb@outreachglobal.io";

// Lazy-load Resend to avoid build-time issues when API key is missing
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const { Resend } = require("resend");
  return new Resend(apiKey);
};

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation (basic)
const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return phone;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, smsConsent, company } = body;

    // Validate required fields
    if (!firstName?.trim()) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }
    if (!lastName?.trim()) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const formattedPhone = formatPhone(phone);

    // Check if lead already exists by email or phone
    const existingByEmail = await db.query.leads.findFirst({
      where: (t, { eq }) => eq(t.email, emailLower),
    });

    const existingByPhone = await db.query.leads.findFirst({
      where: (t, { eq }) => eq(t.phone, formattedPhone),
    });

    const existing = existingByEmail || existingByPhone;

    let leadId: string;
    let isNew = false;

    if (existing) {
      // Update existing lead to call queue status
      leadId = existing.id;
      await db
        .update(leads)
        .set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: emailLower,
          phone: formattedPhone,
          company: company?.trim() || existing.company,
          status: "call_queue",
          pipelineStatus: "call_queue",
          tags: [...(existing.tags || []), "web_form", "call_queue"],
          metadata: {
            ...(existing.metadata as Record<string, unknown> || {}),
            smsConsent,
            lastFormSubmit: new Date().toISOString(),
            source: "get_started_form",
          },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existing.id));

      console.log("[Lead Capture] Updated existing lead:", emailLower);
    } else {
      // Create new lead
      leadId = nanoid();
      const now = new Date();
      isNew = true;

      await db.insert(leads).values({
        id: leadId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailLower,
        phone: formattedPhone,
        company: company?.trim() || null,
        source: "web_form",
        status: "call_queue",
        pipelineStatus: "call_queue",
        score: 50, // Medium priority for web form leads
        tags: ["web_form", "call_queue", "strategy_session_request"],
        metadata: {
          smsConsent,
          formSubmitDate: now.toISOString(),
          source: "get_started_form",
        },
        teamId: process.env.ADMIN_TEAM_ID || "admin",
        createdAt: now,
        updatedAt: now,
      });

      console.log("[Lead Capture] New lead created:", emailLower);
    }

    // Send notification email to founder
    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: "NEXTIER Leads <leads@nextier.io>",
          to: CONTACT_EMAIL,
          subject: `New Strategy Session Request: ${firstName} ${lastName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #10b981; margin-bottom: 20px;">New Lead in Call Queue</h1>

              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #1e293b;">${firstName} ${lastName}</h2>

                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 100px;">Email:</td>
                    <td style="padding: 8px 0;"><a href="mailto:${emailLower}" style="color: #0ea5e9;">${emailLower}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 8px 0;"><a href="tel:${formattedPhone}" style="color: #0ea5e9;">${formattedPhone}</a></td>
                  </tr>
                  ${company ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Company:</td>
                    <td style="padding: 8px 0;">${company}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">SMS Consent:</td>
                    <td style="padding: 8px 0;">${smsConsent ? "Yes" : "No"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Status:</td>
                    <td style="padding: 8px 0;"><span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">IN CALL QUEUE</span></td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 14px;">
                ${isNew ? "This is a new lead." : "This lead already existed and has been updated."}
              </p>

              <p style="margin-top: 20px;">
                <a href="tel:${formattedPhone}" style="background: linear-gradient(to right, #10b981, #0ea5e9); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Call Now
                </a>
              </p>
            </div>
          `,
        });
        console.log("[Lead Capture] Notification email sent to:", CONTACT_EMAIL);
      } catch (emailError) {
        console.error("[Lead Capture] Notification email failed:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      isNew,
      lead: {
        id: leadId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailLower,
        phone: formattedPhone,
        status: "call_queue",
      },
      message: isNew ? "Lead created and added to call queue" : "Lead updated and added to call queue",
    });
  } catch (error) {
    console.error("[Lead Capture] Error:", error);
    return NextResponse.json(
      { error: "Failed to capture lead. Please try again." },
      { status: 500 }
    );
  }
}
