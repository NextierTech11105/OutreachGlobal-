import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/api-auth";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";
import { logAdminAction } from "@/lib/audit-log";

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset a user's password and return temp password for admin to share
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 },
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Generate new temp password
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Update user's password
    const [updated] = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Audit log
    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      action: "user.password_reset",
      category: "user",
      targetType: "user",
      targetId: userId,
      targetName: updated.email,
      details: { resetBy: "admin" },
      request,
    });

    console.log(
      `[Admin Users] Password reset for user: ${updated.email} (${userId})`,
    );

    return NextResponse.json({
      success: true,
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      tempPassword, // Admin shares this with user
    });
  } catch (error) {
    console.error("[Admin Users] Password Reset Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset password",
      },
      { status: 500 },
    );
  }
}
