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

    // Get leads with sorting - include ALL sort options from Campaign Hub
    const orderColumn = (() => {
      switch (sortBy) {
        case "name":
          return leads.firstName;
        case "company":
          return leads.company;
        case "state":
          return leads.state;
        case "status":
          return leads.status;
        case "score":
          return leads.score;
        case "updatedAt":
          return leads.updatedAt;
        // USBizData fields - stored in metadata JSON
        case "revenue":
          return sql`(${leads.metadata}->>'annualRevenue')::numeric`;
        case "employees":
          return sql`(${leads.metadata}->>'employees')::integer`;
        case "sicCode":
          return sql`${leads.metadata}->>'sicCode'`;
        case "industry":
          return sql`COALESCE(${leads.metadata}->>'industry', ${leads.metadata}->>'sicDescription')`;
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
      // Extract USBizData fields from metadata AND customFields.originalRow
      const meta = (lead.metadata as Record<string, unknown>) || {};
      const custom = (lead.customFields as Record<string, unknown>) || {};
      const orig = (custom.originalRow as Record<string, unknown>) || {};

      // Helper to get field from multiple sources - checks metadata FIRST (where new imports store data)
      const get = (...keys: string[]) => {
        for (const k of keys) {
          // Check metadata first (new import format)
          if (meta[k] !== undefined && meta[k] !== null && meta[k] !== "") return meta[k];
          // Then originalRow (CSV columns after normalization)
          if (orig[k] !== undefined && orig[k] !== null && orig[k] !== "") return orig[k];
          // Then customFields
          if (custom[k] !== undefined && custom[k] !== null && custom[k] !== "") return custom[k];
        }
        return null;
      };

      // USBIZDATA FIELDS - check ALL possible key formats:
      // 1. camelCase (new imports): annualRevenue
      // 2. snake_case (old imports): annual_revenue
      // 3. Original CSV headers: "Annual Revenue"
      const streetAddress = lead.address || get("streetAddress", "street_address", "address", "Street Address", "Address") || "";
      const cityVal = lead.city || get("city", "City") || "";
      const stateVal = lead.state || get("state", "State") || "";
      const zipVal = lead.zipCode || get("zipCode", "zip_code", "zip", "Zip Code", "Zip") || "";
      const countyVal = get("county", "County") || "";
      const areaCode = get("areaCode", "area_code", "Area Code") || "";
      const websiteUrl = get("website", "websiteUrl", "website_url", "web_address", "Website URL", "Website", "url") || "";
      const numEmployees = get("employees", "employeeCount", "employee_count", "number_of_employees", "Number of Employees", "Employees") || null;
      const annualRev = get("annualRevenue", "annual_revenue", "revenue", "salesVolume", "sales_volume", "Annual Revenue", "Sales Volume") || null;
      const sicCodeVal = get("sicCode", "sic_code", "sic", "SIC Code", "Primary SIC Code", "primary_sic_code") || "";
      const sicDescVal = get("sicDescription", "sic_description", "SIC Description", "Primary SIC Description", "primary_sic_description") || "";

      // Handle names - check ALL USBizData variations including Key Person, Owner, Principal
      const contactName = get("contactName", "contact_name", "Contact Name", "keyPerson", "key_person", "Key Person", "ownerName", "owner_name", "Owner Name", "principalName", "principal_name", "Principal Name") as string || "";
      const firstNameVal = lead.firstName || get("firstName", "first_name", "first", "key_person_first_name", "Key Person First Name", "owner_first_name", "Owner First Name") || contactName.split(" ")[0] || "";
      const lastNameVal = lead.lastName || get("lastName", "last_name", "last", "key_person_last_name", "Key Person Last Name", "owner_last_name", "Owner Last Name") || contactName.split(" ").slice(1).join(" ") || "";
      const companyVal = lead.company || get("company", "companyName", "company_name", "Company Name", "business", "business_name") || "";

      return {
        id: lead.id,
        firstName: firstNameVal,
        lastName: lastNameVal,
        name: [firstNameVal, lastNameVal].filter(Boolean).join(" ") || contactName || companyVal || "Unknown",
        company: companyVal,
        title: lead.title || "",
        // FULL ADDRESS
        address: streetAddress,
        city: cityVal,
        state: stateVal,
        zipCode: zipVal,
        county: countyVal,
        areaCode: areaCode,
        email: lead.email || get("Email Address", "email", "emailAddress") || "",
        phone: lead.phone || get("Phone Number", "phone", "phoneNumber") || "",
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
        // === ALL USBIZDATA FIELDS ===
        revenue: annualRev,
        employees: numEmployees,
        sicCode: sicCodeVal,
        sicDescription: sicDescVal,
        naicsCode: get("NAICS Code", "naicsCode", "naics") || null,
        industry: sicDescVal || get("Industry", "industry") || null,
        yearEstablished: get("Year Established", "yearEstablished") || null,
        website: websiteUrl,
        listSource: get("listSource", "dataSource", "bucketName") || lead.source || null,
        // Include ALL original CSV fields for debugging
        originalData: orig,
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
