import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Verify email with token
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const email = request.nextUrl.searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=invalid_verification_link`
      );
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=user_not_found`
      );
    }

    if (user.emailVerifiedAt) {
      // Already verified
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?message=email_already_verified`
      );
    }

    // Verify email
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?message=email_verified`
    );
  } catch (error) {
    console.error("[Auth] Verify email error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=verification_failed`
    );
  }
}

// POST - Resend verification email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ success: true });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ 
        success: true, 
        message: "Email already verified" 
      });
    }

    // Generate verification token (simple base64 of email + timestamp)
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64url");
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    // Send verification email
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: email,
      subject: "Verify your email address",
      html: `
        <h2>Verify Your Email</h2>
        <p>Hi ${user.name},</p>
        <p>Click the button below to verify your email address:</p>
        <p><a href="${verifyUrl}" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Verify Email</a></p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth] Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
