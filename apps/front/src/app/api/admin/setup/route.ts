import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Setup key must be set in environment - no hardcoded fallback for security
const SETUP_KEY = process.env.ADMIN_SETUP_KEY;

if (!SETUP_KEY) {
  console.warn("[Setup] ADMIN_SETUP_KEY not configured - endpoint disabled");
}

/**
 * POST /api/admin/setup
 * One-time endpoint to set up the first super admin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setupKey, email } = body;

    if (setupKey !== SETUP_KEY) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 403 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Find user by email
    const userResult = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: `User not found: ${email}` },
        { status: 404 },
      );
    }

    const user = userResult[0];

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({
        success: true,
        message: "User is already a SUPER_ADMIN",
        user: { id: user.id, email: user.email, role: user.role },
      });
    }

    // Update role to SUPER_ADMIN
    await db
      .update(users)
      .set({ role: "SUPER_ADMIN", updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: `${email} is now a SUPER_ADMIN`,
      user: { id: user.id, email: user.email, role: "SUPER_ADMIN" },
    });
  } catch (error) {
    console.error("[Setup] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 },
    );
  }
}
