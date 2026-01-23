import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Workflows stored in metadata of campaigns table or dedicated storage
// For now, use a simple key-value approach in a generic settings table
// If no table exists, we'll use localStorage fallback (client handles this)

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  conditions?: unknown[];
  actions?: unknown[];
  status: "active" | "draft" | "archived";
  teamId: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

// In-memory cache for workflows (until proper table is created)
// This allows the API to work while we set up proper persistence
const workflowsCache = new Map<string, WorkflowData>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId") || "admin";

  try {
    // Try to fetch from database first
    try {
      const result = await db.execute(
        sql`SELECT * FROM workflows WHERE team_id = ${teamId} ORDER BY created_at DESC`
      );
      if (result.rows && result.rows.length > 0) {
        return NextResponse.json({ data: result.rows, count: result.rows.length });
      }
    } catch {
      // Table doesn't exist, use cache
    }

    // Fallback to cache
    const workflows = Array.from(workflowsCache.values())
      .filter(w => w.teamId === teamId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ data: workflows, count: workflows.length });
  } catch (error) {
    console.error("Get workflows error:", error);
    return NextResponse.json(
      { error: "Failed to get workflows", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId = "admin", name, description, trigger, conditions, actions, status = "draft" } = body;

    if (!name || !trigger) {
      return NextResponse.json(
        { error: "name and trigger are required" },
        { status: 400 }
      );
    }

    const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const workflow: WorkflowData = {
      id,
      teamId,
      name,
      description,
      trigger,
      conditions: conditions || [],
      actions: actions || [],
      status,
      createdAt: now,
      updatedAt: now,
    };

    // Try to insert into database
    try {
      await db.execute(
        sql`INSERT INTO workflows (id, team_id, name, description, trigger, conditions, actions, status, created_at, updated_at)
            VALUES (${id}, ${teamId}, ${name}, ${description || null}, ${trigger}, ${JSON.stringify(conditions || [])}, ${JSON.stringify(actions || [])}, ${status}, NOW(), NOW())`
      );
    } catch {
      // Table doesn't exist, use cache
      workflowsCache.set(id, workflow);
    }

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Create workflow error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, trigger, conditions, actions, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Workflow id is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Try to update in database
    try {
      await db.execute(
        sql`UPDATE workflows SET
            name = COALESCE(${name}, name),
            description = COALESCE(${description}, description),
            trigger = COALESCE(${trigger}, trigger),
            conditions = COALESCE(${conditions ? JSON.stringify(conditions) : null}, conditions),
            actions = COALESCE(${actions ? JSON.stringify(actions) : null}, actions),
            status = COALESCE(${status}, status),
            updated_at = NOW()
            WHERE id = ${id}`
      );
    } catch {
      // Table doesn't exist, update cache
      const existing = workflowsCache.get(id);
      if (existing) {
        const updated = {
          ...existing,
          name: name ?? existing.name,
          description: description ?? existing.description,
          trigger: trigger ?? existing.trigger,
          conditions: conditions ?? existing.conditions,
          actions: actions ?? existing.actions,
          status: status ?? existing.status,
          updatedAt: now,
        };
        workflowsCache.set(id, updated);
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, updatedAt: now });
  } catch (error) {
    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Workflow id is required" },
        { status: 400 }
      );
    }

    // Try to delete from database
    try {
      await db.execute(sql`DELETE FROM workflows WHERE id = ${id}`);
    } catch {
      // Table doesn't exist, delete from cache
      workflowsCache.delete(id);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow", details: String(error) },
      { status: 500 }
    );
  }
}
