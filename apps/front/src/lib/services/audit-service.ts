import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId: string;
  userId?: number;
  details?: any;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    const { action, entityType, entityId, userId, details } = params;

    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      userId: userId || null,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw, just log the error to avoid breaking the main flow
  }
}

export async function getAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  userId?: number;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const {
    entityType,
    entityId,
    userId,
    action,
    limit = 50,
    offset = 0,
  } = params;

  let query = db.select().from(auditLogs);

  if (entityType) {
    query = query.where(eq(auditLogs.entityType, entityType));
  }

  if (entityId) {
    query = query.where(eq(auditLogs.entityId, entityId));
  }

  if (userId) {
    query = query.where(eq(auditLogs.userId, userId));
  }

  if (action) {
    query = query.where(eq(auditLogs.action, action));
  }

  return query
    .orderBy((auditLogs, { desc }) => [desc(auditLogs.createdAt)])
    .limit(limit)
    .offset(offset);
}
