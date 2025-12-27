/**
 * ADMIN AUDIT LOGGING
 *
 * Helper functions for logging admin actions for security and compliance.
 * All super-admin actions should be logged for audit trail.
 */

import { db } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";
import { NextRequest } from "next/server";

export type AuditAction =
  // Company actions
  | "company.create"
  | "company.update"
  | "company.delete"
  // User/team member actions
  | "user.add_to_team"
  | "user.remove_from_team"
  | "user.change_role"
  | "user.promote_super_admin"
  | "user.demote_super_admin"
  // Impersonation
  | "impersonate.start"
  | "impersonate.end"
  // Settings
  | "settings.update"
  // Data operations
  | "data.clear"
  | "data.export"
  | "data.import";

export type AuditCategory =
  | "company"
  | "user"
  | "impersonate"
  | "settings"
  | "data";

export type AuditTargetType = "team" | "user" | "teamMember" | "setting";

interface AuditLogParams {
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  category: AuditCategory;
  targetType?: AuditTargetType;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  request?: NextRequest;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    if (!db) {
      console.warn("[AuditLog] Database not available, skipping audit log");
      return;
    }

    const {
      adminId,
      adminEmail,
      action,
      category,
      targetType,
      targetId,
      targetName,
      details,
      request,
    } = params;

    // Extract IP and user agent from request if available
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      // Try various headers for IP (in order of preference)
      ipAddress =
        request.headers.get("x-real-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("cf-connecting-ip") ||
        null;

      userAgent = request.headers.get("user-agent") || null;
    }

    await db.insert(adminAuditLogs).values({
      adminId,
      adminEmail,
      action,
      category,
      targetType,
      targetId,
      targetName,
      details: details || null,
      ipAddress,
      userAgent,
    });

    console.log(
      `[AuditLog] ${adminEmail} performed ${action} on ${targetType || "system"} ${targetId || ""}`,
    );
  } catch (error) {
    // Don't throw - audit logging should never break the main operation
    console.error("[AuditLog] Failed to log admin action:", error);
  }
}

/**
 * Get the action category from the action string
 */
export function getCategoryFromAction(action: AuditAction): AuditCategory {
  const prefix = action.split(".")[0];
  switch (prefix) {
    case "company":
      return "company";
    case "user":
      return "user";
    case "impersonate":
      return "impersonate";
    case "settings":
      return "settings";
    case "data":
      return "data";
    default:
      return "data";
  }
}
