import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadTags, tags, teams } from "@/lib/db/schema";
import {
  eq,
  and,
  ilike,
  inArray,
  desc,
  asc,
  sql,
  count as sqlCount,
} from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

// GET - List leads with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Get auth - allow owners without team
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is team owner - owners can see all leads
    let isOwner = false;
    if (teamId) {
      const teamResult = await db
        .select({ ownerId: teams.ownerId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
      isOwner = teamResult[0]?.ownerId === userId;
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    // SECURITY: teamId comes from JWT, not query params

    // Handle pipeline_stats action - return counts by pipeline stage
    if (action === "pipeline_stats") {
      const pipelineStages = [
        "raw",
        "ready",
        "queued",
        "sent",
        "replied",
        "booked",
      ];
      const pipeline: Record<string, number> = {};

      for (const stage of pipelineStages) {
        // Scope by teamId only for non-owners
        const conditions = [eq(leads.pipelineStatus, stage)];
        if (teamId && !isOwner) {
          conditions.push(eq(leads.teamId, teamId));
        }

        const [result] = await db
          .select({ count: sqlCount() })
          .from(leads)
          .where(and(...conditions));

        pipeline[stage] = result?.count || 0;
      }

      // For now, count leads with status "queued" or "sent" as active campaigns proxy
      // TODO: Replace with actual campaigns table count
      const activeCampaigns = pipeline.queued > 0 || pipeline.sent > 0 ? 1 : 0;

      return NextResponse.json({
        success: true,
        pipeline,
        activeCampaigns,
      });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Pre-queue status mapping (new/no-response/engaged → pipelineStatus)
    const PREQUEUE_STATUS_MAP: Record<string, string[]> = {
      new: ["raw", "ready"], // Fresh leads not yet contacted
      "no-response": ["sent", "queued"], // Sent but no reply
      engaged: ["replied"], // Have responded
    };

    // For owners: show all leads. For members: scope by teamId
    const conditions: ReturnType<typeof eq>[] = [];
    if (teamId && !isOwner) {
      conditions.push(eq(leads.teamId, teamId));
    }

    // Check if status is a pre-queue status or traditional status
    if (status) {
      if (PREQUEUE_STATUS_MAP[status]) {
        // Pre-queue status - map to pipelineStatus
        conditions.push(
          inArray(leads.pipelineStatus, PREQUEUE_STATUS_MAP[status]),
        );
      } else {
        // Traditional lead status
        conditions.push(eq(leads.status, status));
      }
    }

    if (source) {
      conditions.push(eq(leads.source, source));
    }

    if (search) {
      conditions.push(
        sql`(
          ${leads.firstName} ILIKE ${"%" + search + "%"} OR
          ${leads.lastName} ILIKE ${"%" + search + "%"} OR
          ${leads.email} ILIKE ${"%" + search + "%"} OR
          ${leads.phone} ILIKE ${"%" + search + "%"} OR
          ${leads.address} ILIKE ${"%" + search + "%"}
        )`,
      );
    }

    // Get total count
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [countResult] = await db
      .select({ count: sqlCount() })
      .from(leads)
      .where(whereClause);

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Get leads with sorting
    const orderColumn = (() => {
      switch (sortBy) {
        case "name":
          return leads.firstName;
        case "status":
          return leads.status;
        case "score":
          return leads.score;
        case "updatedAt":
          return leads.updatedAt;
        default:
          return leads.createdAt;
      }
    })();

    const orderDir = sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn);

    const results = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset);

    // Get tags for each lead (skip if table doesn't exist)
    const leadIds = results.map((l: { id: string }) => l.id);
    let leadTagsMap: Record<string, string[]> = {};

    if (leadIds.length > 0) {
      try {
        const tagResults = await db
          .select({
            leadId: leadTags.leadId,
            tagName: tags.name,
          })
          .from(leadTags)
          .innerJoin(tags, eq(leadTags.tagId, tags.id))
          .where(inArray(leadTags.leadId, leadIds));

        leadTagsMap = tagResults.reduce(
          (
            acc: Record<string, string[]>,
            { leadId, tagName }: { leadId: string; tagName: string },
          ) => {
            if (!acc[leadId]) acc[leadId] = [];
            acc[leadId].push(tagName);
            return acc;
          },
          {} as Record<string, string[]>,
        );
      } catch {
        // lead_tags table may not exist yet - continue without tags
        console.warn("[Leads API] Could not fetch tags - table may not exist");
      }
    }

    // Transform leads to match frontend type - INCLUDE ALL USBIZDATA FIELDS
    const transformedLeads = results.map((lead: (typeof results)[number]) => {
      // Extract USBizData fields from metadata
      const meta = (lead.metadata as Record<string, unknown>) || {};

      return {
        id: lead.id,
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        name:
          [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown",
        company: lead.company || "",
        title: lead.title || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        zipCode: lead.zipCode || "",
        email: lead.email || "",
        phone: lead.phone || "",
        phoneNumbers: lead.phone
          ? [
              {
                number: lead.phone,
                label: "Primary",
                isPrimary: true,
                lineType: "mobile",
                verified: true,
                lastVerified: new Date().toISOString(),
              },
            ]
          : [],
        status: mapDbStatusToFrontend(lead.status || "new"),
        pipelineStatus: lead.pipelineStatus,
        score: lead.score || 0,
        source: lead.source || "import",
        priority: "Medium" as const,
        assignedTo: undefined,
        lastContactDate: undefined,
        nextFollowUp: undefined,
        notes: lead.notes || "",
        tags: leadTagsMap[lead.id] || [],
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        // === USBIZDATA FIELDS FROM METADATA ===
        revenue: meta.revenue || meta.salesVolume || meta.annualRevenue || null,
        employees: meta.employees || meta.employeeCount || meta.numEmployees || null,
        sicCode: meta.sicCode || meta.sic || meta.primarySicCode || null,
        sicDescription: meta.sicDescription || meta.primarySicDescription || null,
        naicsCode: meta.naicsCode || meta.naics || null,
        industry: meta.industry || meta.industryCategory || null,
        yearEstablished: meta.yearEstablished || meta.yearStarted || null,
        website: meta.website || meta.url || null,
        listSource: meta.listSource || meta.dataSource || lead.source || null,
        // Raw metadata for anything else
        metadata: meta,
      };
    });

    return NextResponse.json({
      success: true,
      leads: transformedLeads,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("[Leads API] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update lead status
export async function PATCH(request: NextRequest) {
  try {
    // Get auth - allow owners without team
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if owner
    let isOwner = false;
    if (teamId) {
      const teamResult = await db
        .select({ ownerId: teams.ownerId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
      isOwner = teamResult[0]?.ownerId === userId;
    }

    const body = await request.json();
    const { leadId, status, notes, priority } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = mapFrontendStatusToDb(status);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Owners can update any lead, members scoped by teamId
    const whereConditions = [eq(leads.id, leadId)];
    if (teamId && !isOwner) {
      whereConditions.push(eq(leads.teamId, teamId));
    }

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(and(...whereConditions))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lead: updated,
    });
  } catch (error: unknown) {
    console.error("[Leads API] PATCH Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Map frontend status to DB status
function mapFrontendStatusToDb(status: string): string {
  const map: Record<string, string> = {
    New: "new",
    Contacted: "contacted",
    Qualified: "qualified",
    Proposal: "nurturing",
    Negotiation: "nurturing",
    "Closed Won": "closed",
    "Closed Lost": "lost",
  };
  return map[status] || "new";
}

// Map DB status to frontend status
function mapDbStatusToFrontend(status: string): string {
  const map: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    nurturing: "Negotiation",
    closed: "Closed Won",
    lost: "Closed Lost",
  };
  return map[status] || "New";
}
