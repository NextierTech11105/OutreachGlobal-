import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Gmail SMTP configuration
// Uses Google App Password (not regular password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "tb@outreachglobal.io",
    pass: process.env.GMAIL_APP_PASSWORD || "", // App password from Google
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, cc, bcc, replyTo } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "to and subject are required" },
        { status: 400 },
      );
    }

    const gmailUser = process.env.GMAIL_USER || "tb@outreachglobal.io";
    const gmailName = process.env.GMAIL_NAME || "TB";

    // Check if Gmail is configured
    if (!process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          error: "Gmail not configured",
          setup: {
            step1: "Go to https://myaccount.google.com/apppasswords",
            step2: "Generate an App Password for 'Mail'",
            step3: "Add GMAIL_USER and GMAIL_APP_PASSWORD to your environment",
          },
        },
        { status: 503 },
      );
    }

    const mailOptions = {
      from: `"${gmailName}" <${gmailUser}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text: text || (html ? html.replace(/<[^>]*>/g, "") : ""),
      html: html || text,
      ...(cc && { cc: Array.isArray(cc) ? cc.join(", ") : cc }),
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(", ") : bcc }),
      ...(replyTo && { replyTo }),
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      from: gmailUser,
      to,
      subject,
    });
  } catch (error: any) {
    console.error("[Email Send] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to send email",
        code: error.code,
      },
      { status: 500 },
    );
  }
}

// GET - Check email configuration status
export async function GET() {
  const gmailUser = process.env.GMAIL_USER;
  const hasAppPassword = !!process.env.GMAIL_APP_PASSWORD;

  return NextResponse.json({
    configured: !!(gmailUser && hasAppPassword),
    email: gmailUser || "not set",
    hasAppPassword,
    provider: "gmail",
    setup: !hasAppPassword
      ? {
          step1: "Go to https://myaccount.google.com/apppasswords",
          step2: "Sign in with your Google account",
          step3: "Select 'Mail' and your device",
          step4: "Copy the 16-character app password",
          step5: "Add to Digital Ocean: GMAIL_USER=tb@outreachglobal.io",
          step6: "Add to Digital Ocean: GMAIL_APP_PASSWORD=your_app_password",
        }
      : null,
  });
}
