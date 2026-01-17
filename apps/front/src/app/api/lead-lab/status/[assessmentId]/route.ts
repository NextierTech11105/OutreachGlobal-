/**
 * Lead Lab Assessment Status API
 *
 * GET /api/lead-lab/status/[assessmentId] - Get assessment status and results
 */

import { NextRequest, NextResponse } from "next/server";
import { getAssessmentJob } from "../../assess/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    const job = await getAssessmentJob(assessmentId);

    if (!job) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      assessmentId: job.id,
      status: job.status,
      tier: job.tier,
      recordCount: job.recordCount,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      stats: job.stats,
      error: job.error,
    });
  } catch (error) {
    console.error("[Lead Lab] Status check error:", error);
    return NextResponse.json(
      { error: "Failed to get assessment status" },
      { status: 500 }
    );
  }
}
