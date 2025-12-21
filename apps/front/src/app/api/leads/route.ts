import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadTags, tags } from "@/lib/db/schema";
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
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to view leads" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const teamId = searchParams.get("teamId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where conditions - filter by teamId if provided, otherwise by userId
    const conditions: ReturnType<typeof eq>[] = [];
    if (teamId) {
      conditions.push(eq(leads.teamId, teamId));
    }

    if (status) {
      conditions.push(eq(leads.status, status));
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

    // Get tags for each lead
    const leadIds = results.map((l: { id: string }) => l.id);
    let leadTagsMap: Record<string, string[]> = {};

    if (leadIds.length > 0) {
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
    }

    // Transform leads to match frontend type
    const transformedLeads = results.map((lead: (typeof results)[number]) => ({
      id: lead.id,
      name:
        [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown",
      address: lead.propertyAddress || "",
      city: lead.propertyCity || "",
      state: lead.propertyState || "",
      zipCode: lead.propertyZip || "",
      propertyValue: lead.estimatedValue || 0,
      propertyType: lead.propertyType || "",
      bedrooms: lead.bedrooms || 0,
      bathrooms: Number(lead.bathrooms) || 0,
      squareFeet: lead.sqft || 0,
      yearBuilt: lead.yearBuilt || 0,
      email: lead.email || "",
      phone: lead.phone || "",
      phoneNumbers: [
        lead.phone && {
          number: lead.phone,
          label: "Primary",
          isPrimary: true,
          lineType: "mobile",
          verified: true,
          lastVerified:
            lead.skipTracedAt?.toISOString() || new Date().toISOString(),
        },
        lead.secondaryPhone && {
          number: lead.secondaryPhone,
          label: "Secondary",
          isPrimary: false,
          lineType: "mobile",
          verified: true,
          lastVerified:
            lead.skipTracedAt?.toISOString() || new Date().toISOString(),
        },
      ].filter(Boolean),
      status: mapDbStatusToFrontend(lead.status),
      source: lead.source || "Website",
      priority: "Medium" as const,
      assignedTo: undefined,
      lastContactDate: lead.lastActivityAt?.toISOString(),
      nextFollowUp: undefined,
      notes: lead.notes || "",
      tags: leadTagsMap[lead.id] || [],
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    }));

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
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(and(eq(leads.id, leadId), eq(leads.teamId, userId)))
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
