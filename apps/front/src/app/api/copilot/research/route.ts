import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GIANNA COPILOT RESEARCH API
 *
 * AI-powered research and analysis for leads
 * - Generates comprehensive research reports
 * - Analyzes lead data for insights
 * - Provides actionable recommendations
 */

interface ResearchRequest {
  source: string;
  scope: "lead" | "bucket" | "market";
  limit?: number;
  leadId?: string;
  bucketId?: string;
  query?: string;
}

interface ResearchResult {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  leadId?: string;
  bucketId?: string;
  insights?: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    confidenceScore: number;
  };
  error?: string;
}

// Active research jobs stored in memory (production would use Redis)
const activeResearchJobs = new Map<string, ResearchResult>();

// POST - Initiate research
export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { source, scope, limit = 1, leadId, bucketId, query } = body;

    if (!source || !scope) {
      return NextResponse.json(
        { error: "source and scope are required" },
        { status: 400 }
      );
    }

    // Create research job
    const jobId = crypto.randomUUID();
    const researchJob: ResearchResult = {
      id: jobId,
      status: "queued",
      createdAt: new Date().toISOString(),
      leadId,
      bucketId,
    };

    activeResearchJobs.set(jobId, researchJob);

    // Simulate research processing
    setTimeout(async () => {
      const job = activeResearchJobs.get(jobId);
      if (job && job.status === "queued") {
        job.status = "processing";
        activeResearchJobs.set(jobId, job);

        // Simulate research completion after 3-5 seconds
        setTimeout(async () => {
          const processingJob = activeResearchJobs.get(jobId);
          if (processingJob && processingJob.status === "processing") {
            try {
              // Generate mock research insights
              const insights = generateMockInsights(scope, leadId, query);

              processingJob.status = "completed";
              processingJob.completedAt = new Date().toISOString();
              processingJob.insights = insights;
              activeResearchJobs.set(jobId, processingJob);
            } catch (error) {
              const processingJob = activeResearchJobs.get(jobId);
              if (processingJob) {
                processingJob.status = "failed";
                processingJob.error = error instanceof Error ? error.message : "Research failed";
                activeResearchJobs.set(jobId, processingJob);
              }
            }
          }
        }, 3000 + Math.random() * 2000);
      }
    }, 1000);

    return NextResponse.json({
      success: true,
      jobId,
      message: "Research job queued successfully",
      job: researchJob,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Research initiation failed";
    console.error("[GiannaCopilot] Research error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get research job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      // Return all active research jobs summary
      const jobs = Array.from(activeResearchJobs.values());
      return NextResponse.json({
        success: true,
        activeJobs: jobs.filter(j =>
          j.status !== "completed" && j.status !== "failed"
        ).length,
        totalJobs: jobs.length,
        jobs: jobs.slice(-10), // Last 10 jobs
      });
    }

    const job = activeResearchJobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Research job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[GiannaCopilot] Research query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to generate mock insights based on scope
function generateMockInsights(scope: string, leadId?: string, query?: string): ResearchResult["insights"] {
  // Get lead details if available
  let leadDetails = null;
  if (leadId) {
    try {
      const [lead] = db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      leadDetails = lead;
    } catch (error) {
      console.log("[GiannaCopilot] Lead lookup failed, using generic insights");
    }
  }

  const baseInsights = {
    summary: "Comprehensive research analysis completed",
    keyFindings: [
      "Target lead shows strong potential for conversion",
      "Multiple contact methods available for outreach",
      "Industry trends indicate high demand for our services"
    ],
    recommendations: [
      "Prioritize this lead for immediate contact",
      "Use personalized messaging based on industry insights",
      "Schedule follow-up within 48 hours for best results"
    ],
    confidenceScore: 0.85
  };

  if (scope === "lead" && leadDetails) {
    return {
      ...baseInsights,
      summary: `Research completed for ${leadDetails.firstName} ${leadDetails.lastName} at ${leadDetails.companyName || "unknown company"}`,
      keyFindings: [
        `Lead is a ${leadDetails.title || "decision maker"} with high authority`,
        `Company operates in ${leadDetails.industry || "a growing industry"}`,
        `Multiple contact methods available (phone: ${leadDetails.phone ? "yes" : "no"}, email: ${leadDetails.email ? "yes" : "no"})`,
        `Property ownership likelihood: ${leadDetails.propertyScore ? `${leadDetails.propertyScore}%` : "unknown"}`
      ],
      recommendations: [
        `Contact via ${leadDetails.phone ? "phone" : "email"} for highest response rate`,
        `Mention industry-specific benefits during conversation`,
        `Offer to schedule a demo or consultation within the next week`,
        `Follow up ${leadDetails.phone ? "with SMS" : "via email"} if no response within 48 hours`
      ]
    };
  }

  if (scope === "bucket") {
    return {
      ...baseInsights,
      summary: "Bucket-level research analysis completed",
      keyFindings: [
        "Bucket contains high-quality leads with strong conversion potential",
        "Majority of leads are decision makers or have high authority",
        "Diverse industry representation with multiple contact methods available"
      ],
      recommendations: [
        "Prioritize leads with phone numbers for immediate outreach",
        "Segment leads by industry for targeted messaging",
        "Schedule automated follow-ups for leads without immediate response",
        "Monitor conversion rates and adjust strategy as needed"
      ]
    };
  }

  if (scope === "market" && query) {
    return {
      ...baseInsights,
      summary: `Market research completed for: ${query}`,
      keyFindings: [
        `Market shows ${Math.random() > 0.5 ? "strong" : "moderate"} demand for our services`,
        `Competitive landscape analysis reveals opportunities for differentiation`,
        `Target audience responds best to ${Math.random() > 0.5 ? "value-based" : "feature-based"} messaging`
      ],
      recommendations: [
        `Focus marketing efforts on ${query} segment`,
        `Highlight unique value proposition in outreach materials`,
        `Consider targeted advertising campaigns in this market`,
        `Monitor market trends and adjust strategy quarterly`
      ]
    };
  }

  return baseInsights;
}