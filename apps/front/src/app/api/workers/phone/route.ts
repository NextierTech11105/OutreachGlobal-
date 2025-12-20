/**
 * Worker Phone Assignments API
 *
 * Manages phone number assignments for AI Digital Workers:
 * - GIANNA (Opener): Initial outreach, email capture
 * - CATHY (Nudger): Humor-based re-engagement
 * - SABRINA (Closer): Objection handling, appointment booking
 *
 * Each worker gets a dedicated SignalHouse phone number per team.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Valid worker IDs
const VALID_WORKERS = ["gianna", "cathy", "sabrina", "neva", "luci"] as const;
type WorkerId = (typeof VALID_WORKERS)[number];

// Worker display names and descriptions
const WORKER_INFO: Record<
  WorkerId,
  { name: string; role: string; description: string }
> = {
  gianna: {
    name: "GIANNA",
    role: "Opener",
    description: "Initial outreach, email capture, content permission",
  },
  cathy: {
    name: "CATHY",
    role: "Nudger",
    description: "Humor-based nudges, ghost revival, re-engagement",
  },
  sabrina: {
    name: "SABRINA",
    role: "Closer",
    description: "Objection handling, appointment booking, closing",
  },
  neva: {
    name: "NEVA",
    role: "Researcher",
    description: "Property/business research, pre-call briefings",
  },
  luci: {
    name: "LUCI",
    role: "Copilot",
    description: "Data copilot, campaign generation, analytics",
  },
};

interface WorkerPhoneAssignment {
  id: string;
  teamId: string;
  workerId: string;
  workerName: string;
  phoneNumber: string;
  signalhouseSubgroupId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET - Get phone assignment for a worker
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worker = searchParams.get("worker") as WorkerId | null;
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 }
      );
    }

    // If worker specified, get that specific assignment
    if (worker) {
      if (!VALID_WORKERS.includes(worker)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid worker. Must be one of: ${VALID_WORKERS.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Try to get from database first
      const result = await db.execute(sql`
        SELECT * FROM worker_phone_assignments
        WHERE team_id = ${teamId} AND worker_id = ${worker}
        LIMIT 1
      `);

      const assignment = result.rows?.[0] as WorkerPhoneAssignment | undefined;

      if (assignment) {
        return NextResponse.json({
          success: true,
          assignment: {
            ...assignment,
            workerInfo: WORKER_INFO[worker],
          },
        });
      }

      // Fall back to environment variable
      const envKey = `${worker.toUpperCase()}_PHONE_NUMBER`;
      const envPhone = process.env[envKey];

      return NextResponse.json({
        success: true,
        assignment: envPhone
          ? {
              workerId: worker,
              workerName: WORKER_INFO[worker].name,
              phoneNumber: envPhone,
              isActive: true,
              source: "environment",
              workerInfo: WORKER_INFO[worker],
            }
          : null,
        message: envPhone
          ? "Using phone from environment variable"
          : "No phone assigned",
      });
    }

    // Get all assignments for the team
    const result = await db.execute(sql`
      SELECT * FROM worker_phone_assignments
      WHERE team_id = ${teamId}
      ORDER BY worker_id
    `);

    const assignments = (result.rows || []) as WorkerPhoneAssignment[];

    // Merge with env vars for any missing workers
    const allAssignments = VALID_WORKERS.map((wid) => {
      const dbAssignment = assignments.find((a) => a.workerId === wid);
      if (dbAssignment) {
        return {
          ...dbAssignment,
          source: "database",
          workerInfo: WORKER_INFO[wid],
        };
      }

      // Check env var
      const envKey = `${wid.toUpperCase()}_PHONE_NUMBER`;
      const envPhone = process.env[envKey];

      return {
        workerId: wid,
        workerName: WORKER_INFO[wid].name,
        phoneNumber: envPhone || null,
        isActive: !!envPhone,
        source: envPhone ? "environment" : "unassigned",
        workerInfo: WORKER_INFO[wid],
      };
    });

    return NextResponse.json({
      success: true,
      assignments: allAssignments,
      workers: WORKER_INFO,
    });
  } catch (error) {
    console.error("[Worker Phone API] GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get assignments",
      },
      { status: 500 }
    );
  }
}

// POST - Assign phone to worker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { worker, phoneNumber, teamId, signalhouseSubgroupId } = body;

    if (!worker || !phoneNumber || !teamId) {
      return NextResponse.json(
        { success: false, error: "worker, phoneNumber, and teamId are required" },
        { status: 400 }
      );
    }

    if (!VALID_WORKERS.includes(worker)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid worker. Must be one of: ${VALID_WORKERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Normalize phone number to E.164
    let normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length === 10) {
      normalizedPhone = `+1${normalizedPhone}`;
    } else if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = `+${normalizedPhone}`;
    }

    const workerInfo = WORKER_INFO[worker as WorkerId];
    const now = new Date();

    // Upsert the assignment
    await db.execute(sql`
      INSERT INTO worker_phone_assignments (
        id, team_id, worker_id, worker_name, phone_number, signalhouse_subgroup_id, is_active, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${teamId},
        ${worker},
        ${`${workerInfo.name} (${workerInfo.role})`},
        ${normalizedPhone},
        ${signalhouseSubgroupId || null},
        true,
        ${now},
        ${now}
      )
      ON CONFLICT (team_id, worker_id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        signalhouse_subgroup_id = EXCLUDED.signalhouse_subgroup_id,
        is_active = true,
        updated_at = EXCLUDED.updated_at
    `);

    console.log(
      `[Worker Phone API] Assigned ${normalizedPhone} to ${worker} for team ${teamId}`
    );

    return NextResponse.json({
      success: true,
      assignment: {
        workerId: worker,
        workerName: `${workerInfo.name} (${workerInfo.role})`,
        phoneNumber: normalizedPhone,
        signalhouseSubgroupId: signalhouseSubgroupId || null,
        isActive: true,
        teamId,
      },
    });
  } catch (error) {
    console.error("[Worker Phone API] POST Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to assign phone",
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove phone assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worker = searchParams.get("worker");
    const teamId = searchParams.get("teamId");

    if (!worker || !teamId) {
      return NextResponse.json(
        { success: false, error: "worker and teamId are required" },
        { status: 400 }
      );
    }

    if (!VALID_WORKERS.includes(worker as WorkerId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid worker. Must be one of: ${VALID_WORKERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    await db.execute(sql`
      UPDATE worker_phone_assignments
      SET is_active = false, updated_at = NOW()
      WHERE team_id = ${teamId} AND worker_id = ${worker}
    `);

    console.log(
      `[Worker Phone API] Deactivated phone for ${worker} in team ${teamId}`
    );

    return NextResponse.json({
      success: true,
      message: `Phone assignment deactivated for ${worker}`,
    });
  } catch (error) {
    console.error("[Worker Phone API] DELETE Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove assignment",
      },
      { status: 500 }
    );
  }
}
