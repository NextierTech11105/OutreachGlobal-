import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, deals, dealActivities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * PROMOTE TO DEAL
 *
 * Promotes a qualified lead directly into the Deal Machine (Machine 5).
 * This is the primary integration point between Machine 3 (Conversation)
 * or Machine 4 (Appointment) and Machine 5 (Deal).
 *
 * POST /api/machine/promote
 * - Validates lead is ready for deal
 * - Creates deal with proper monetization
 * - Updates lead status
 * - Logs activity
 */

interface PromoteInput {
  teamId: string;
  leadId: string;
  userId: string;
  dealType?: string;
  estimatedValue?: number;
  priority?: string;
  notes?: string;
  // Source of the promotion
  source?: "conversation" | "appointment" | "manual" | "automation";
}

// Default monetization by deal type
// Nextier operates as a "waterfall advisory umbrella" - adapting to each unique situation
const DEFAULT_MONETIZATION: Record<string, { type: string; rate: number; isFlat?: boolean }> = {
  // === REAL ESTATE DEALS (percentage-based) ===
  b2b_exit: { type: "advisory", rate: 5 },
  commercial: { type: "commission", rate: 3 },
  assemblage: { type: "commission", rate: 4 },
  blue_collar_exit: { type: "advisory", rate: 8 },
  development: { type: "commission", rate: 2.5 },
  residential_haos: { type: "commission", rate: 6 },
  // === NEXTIER CONSULTING DEALS (project/retainer-based - flat fees) ===
  ai_system_design: { type: "project", rate: 25000, isFlat: true },
  foundational_database: { type: "project", rate: 15000, isFlat: true },
  tech_consulting: { type: "retainer", rate: 5000, isFlat: true },
  data_architecture: { type: "project", rate: 20000, isFlat: true },
  automation_build: { type: "project", rate: 10000, isFlat: true },
  crm_integration: { type: "project", rate: 8000, isFlat: true },
  nextier_implementation: { type: "project", rate: 50000, isFlat: true },
};

export async function POST(request: NextRequest) {
  try {
    const body: PromoteInput = await request.json();
    const {
      teamId,
      leadId,
      userId,
      dealType: inputDealType,
      estimatedValue: inputValue,
      priority = "medium",
      notes,
      source = "manual",
    } = body;

    if (!teamId || !leadId || !userId) {
      return NextResponse.json(
        { error: "teamId, leadId, and userId required" },
        { status: 400 }
      );
    }

    // Check if lead already has a deal
    const existingDeal = await db
      .select()
      .from(deals)
      .where(and(eq(deals.leadId, leadId), eq(deals.teamId, teamId)))
      .limit(1);

    if (existingDeal.length) {
      return NextResponse.json({
        success: false,
        error: "Lead already has an active deal",
        existingDealId: existingDeal[0].id,
      }, { status: 409 });
    }

    // Get lead data
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead.length) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadData = lead[0];

    // Determine deal type if not specified
    const dealType = inputDealType || determineDealType(leadData);

    // Determine estimated value
    const estimatedValue = inputValue || leadData.estimatedValue || 0;

    // Get monetization rates
    const monetization = DEFAULT_MONETIZATION[dealType] || DEFAULT_MONETIZATION.residential_haos;
    // Consulting deals use flat fees, real estate deals use percentage
    const estimatedEarnings = monetization.isFlat
      ? monetization.rate
      : (estimatedValue * monetization.rate) / 100;

    // Build deal name
    const dealName = buildDealName(leadData, dealType);

    // Build property data snapshot
    const propertyData = leadData.propertyAddress ? {
      id: leadData.propertyId || "",
      address: leadData.propertyAddress,
      city: leadData.propertyCity,
      state: leadData.propertyState,
      zip: leadData.propertyZip,
      type: leadData.propertyType || "unknown",
      avm: leadData.estimatedValue,
      equity: leadData.estimatedEquity,
      sqft: leadData.sqft,
      bedrooms: leadData.bedrooms,
      bathrooms: leadData.bathrooms ? Number(leadData.bathrooms) : undefined,
    } : undefined;

    // Build business data snapshot
    const businessData = leadData.companyName ? {
      id: leadData.apolloOrgId || "",
      name: leadData.companyName,
      industry: leadData.industry || leadData.apolloIndustry || "unknown",
      revenue: leadData.apolloRevenue,
      employees: leadData.apolloEmployeeCount,
    } : undefined;

    // Build seller info
    const seller = {
      name: `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim() || "Unknown",
      email: leadData.email,
      phone: leadData.phone,
      company: leadData.companyName,
    };

    // Create the deal
    const dealId = uuidv4();
    const now = new Date();

    const newDeal = {
      id: dealId,
      teamId,
      userId,
      leadId,
      name: dealName,
      description: notes || `Deal created from ${source} - ${leadData.status} lead`,
      type: dealType,
      stage: "discovery",
      priority,
      estimatedValue,
      monetization: {
        type: monetization.type,
        rate: monetization.rate,
        estimatedEarnings,
      },
      seller,
      propertyData,
      businessData,
      assignedTo: userId,
      createdAt: now,
      updatedAt: now,
      stageChangedAt: now,
      tags: buildInitialTags(leadData, source),
    };

    await db.insert(deals).values(newDeal);

    // Log the deal creation activity
    await db.insert(dealActivities).values({
      id: uuidv4(),
      dealId,
      userId,
      type: "stage_change",
      title: "Deal created",
      description: `Promoted from ${leadData.status} lead via ${source}`,
      metadata: {
        fromLeadId: leadId,
        fromStatus: leadData.status,
        source,
        estimatedValue,
        dealType,
      },
      createdAt: now,
    });

    // Update lead status
    await db
      .update(leads)
      .set({
        status: "deal_created",
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    return NextResponse.json({
      success: true,
      message: "Lead promoted to deal successfully",
      deal: {
        id: dealId,
        name: dealName,
        type: dealType,
        stage: "discovery",
        estimatedValue,
        estimatedEarnings,
        monetization,
      },
      previousStatus: leadData.status,
      newStatus: "deal_created",
      machine: {
        from: getMachineFromStatus(leadData.status as string),
        to: 5,
        name: "Deal Machine",
      },
    });
  } catch (error) {
    console.error("[Machine] Promote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to promote lead" },
      { status: 500 }
    );
  }
}

// Helper: Determine deal type from lead data
function determineDealType(leadData: Record<string, unknown>): string {
  // Business lead indicators
  if (leadData.apolloOrgId || leadData.companyName) {
    const revenue = leadData.apolloRevenue as number;
    const employees = leadData.apolloEmployeeCount as number;

    // Larger business = B2B Exit
    if ((revenue && revenue > 1000000) || (employees && employees > 10)) {
      return "b2b_exit";
    }
    // Smaller = Blue Collar Exit
    return "blue_collar_exit";
  }

  // Property type determination
  const propertyType = (leadData.propertyType as string)?.toLowerCase() || "";
  const propertyClass = (leadData.propertyClass as string)?.toLowerCase() || "";

  // Commercial properties
  if (
    propertyClass === "commercial" ||
    propertyType.includes("commercial") ||
    propertyType.includes("retail") ||
    propertyType.includes("office") ||
    propertyType.includes("industrial")
  ) {
    return "commercial";
  }

  // Land/Development
  if (
    propertyType.includes("land") ||
    propertyType.includes("vacant") ||
    propertyClass === "vacant land"
  ) {
    return "development";
  }

  // Multi-family could be assemblage opportunity
  const units = leadData.units as number;
  if (units && units > 4) {
    return "assemblage";
  }

  // Default: residential
  return "residential_haos";
}

// Helper: Build deal name from lead data
function buildDealName(leadData: Record<string, unknown>, dealType: string): string {
  const ownerName = `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim();

  // For property deals
  if (leadData.propertyAddress) {
    const address = leadData.propertyAddress as string;
    const shortAddress = address.split(",")[0]; // Get just the street address
    return `${shortAddress} - ${ownerName || "Unknown Owner"}`;
  }

  // For business deals
  if (leadData.companyName) {
    return `${leadData.companyName} - ${dealType.replace(/_/g, " ")}`;
  }

  // Fallback
  return `${ownerName || "Unknown"} - ${dealType.replace(/_/g, " ")}`;
}

// Helper: Build initial tags based on lead data
function buildInitialTags(leadData: Record<string, unknown>, source: string): string[] {
  const tags: string[] = [source];

  // Add distress indicators
  if (leadData.preForeclosure) tags.push("pre-foreclosure");
  if (leadData.foreclosure) tags.push("foreclosure");
  if (leadData.taxLien) tags.push("tax-lien");
  if (leadData.probate) tags.push("probate");
  if (leadData.inherited) tags.push("inherited");
  if (leadData.vacant) tags.push("vacant");
  if (leadData.highEquity) tags.push("high-equity");

  // Add business indicators
  if (leadData.apolloOrgId) tags.push("apollo-enriched");
  if (leadData.companyName) tags.push("business");

  return tags;
}

// Helper: Get machine number from status
function getMachineFromStatus(status: string): number {
  const statusToMachine: Record<string, number> = {
    new: 1,
    contacted: 1,
    responded: 2,
    in_conversation: 3,
    qualified: 3,
    nurturing: 3,
    appointment_pending: 4,
    appointment_set: 4,
    deal_created: 5,
  };
  return statusToMachine[status] || 1;
}
