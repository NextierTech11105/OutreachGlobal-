import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const CONTACT_EMAIL = "tb@outreachglobal.io";

// Lazy-load Resend to avoid build-time issues when API key is missing
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  // Dynamic import to avoid module-level initialization
  const { Resend } = require("resend");
  return new Resend(apiKey);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source, provider } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const firstName = name?.split(" ")[0] || "";
    const lastName = name?.split(" ").slice(1).join(" ") || "";

    // Check if lead already exists
    const existing = await db.query.leads.findFirst({
      where: (t, { eq }) => eq(t.email, emailLower),
    });

    let leadId: string;

    if (existing) {
      // Update existing lead
      leadId = existing.id;
      console.log("[Capture Signup] Lead already exists:", emailLower);
    } else {
      // Create new lead
      leadId = nanoid();
      const now = new Date();

      await db.insert(leads).values({
        id: leadId,
        email: emailLower,
        firstName,
        lastName,
        source: source || "google_oauth",
        status: "new",
        pipelineStatus: "raw",
        dripSequence: "nurture",
        dripStage: 0,
        tags: ["signup_attempt", provider || "google"],
        metadata: {
          signupProvider: provider || "google",
          signupDate: now.toISOString(),
        },
        teamId: process.env.ADMIN_TEAM_ID || "admin",
        createdAt: now,
        updatedAt: now,
      });

      console.log("[Capture Signup] New lead created:", emailLower);
    }

    // Send welcome/trial email
    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: "NEXTIER <hello@nextier.io>",
          to: emailLower,
          subject: "Welcome to NEXTIER - Your 2-Week Access",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #0ea5e9;">Welcome to NEXTIER${firstName ? `, ${firstName}` : ""}!</h1>

              <p>Thanks for signing up. You now have <strong>2 weeks of access</strong> to explore what NEXTIER can do.</p>

              <p>NEXTIER is a Revenue Execution Engine that turns data into deals:</p>
              <ul>
                <li>Data → Campaign → SMS → AI → Call → Close</li>
                <li>Automated outreach at scale</li>
                <li>AI-powered conversations</li>
              </ul>

              <p><strong>Want to see it in action?</strong></p>

              <p style="margin: 24px 0;">
                <a href="mailto:${CONTACT_EMAIL}?subject=NEXTIER Discovery Call" style="background: linear-gradient(to right, #0ea5e9, #f97316); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Reply for 15-Min Discovery Call
                </a>
              </p>

              <p>Or just reply to this email - we'll reach out within 24 hours.</p>

              <p style="color: #666; font-size: 14px;">
                - The NEXTIER Team
              </p>
            </div>
          `,
        });
        console.log("[Capture Signup] Welcome email sent to:", emailLower);
      } catch (emailError) {
        console.error("[Capture Signup] Email failed:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      message: "Lead captured",
    });
  } catch (error) {
    console.error("[Capture Signup] Error:", error);
    return NextResponse.json(
      { error: "Failed to capture lead" },
      { status: 500 }
    );
  }
}
