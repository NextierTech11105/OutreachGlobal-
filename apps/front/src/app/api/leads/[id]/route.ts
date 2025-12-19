import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

/**
 * LEAD UPDATE API
 *
 * Update individual lead fields including contact info.
 *
 * CRITICAL BUSINESS RULE:
 * - When a mobile phone is added (skip trace OR manual entry), the lead becomes "campaign ready"
 * - A unique lead ID is already assigned on creation (lead_XXXXX format)
 * - Mobile phone presence = campaign ready = can be used in SMS/calling campaigns
 */

interface LeadUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status?: string;
  notes?: string;
  score?: number;
  tags?: string[];
  // Enrichment fields
  phoneType?: "mobile" | "landline" | "voip" | "unknown";
  secondaryPhone?: string;
  secondaryPhoneType?: string;
  // Metadata for additional phones/emails
  metadata?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
}

/**
 * Determines if a phone number is mobile
 * Used to set campaignReady status
 */
function isMobilePhone(phoneType?: string): boolean {
  if (!phoneType) return false;
  const mobileTypes = ["mobile", "cell", "cellular", "wireless"];
  return mobileTypes.includes(phoneType.toLowerCase());
}

/**
 * Determines if lead should be marked as campaign ready
 * Campaign ready = has at least one verified mobile phone
 */
function shouldBeCampaignReady(
  phone?: string,
  phoneType?: string,
  metadata?: Record<string, unknown>,
): boolean {
  // Direct mobile phone
  if (phone && isMobilePhone(phoneType)) {
    return true;
  }

  // Check metadata for phones array (from skip trace)
  if (metadata?.phones && Array.isArray(metadata.phones)) {
    const hasMobile = metadata.phones.some(
      (p: { type?: string; phone_type?: string; line_type?: string }) =>
        p.type === "mobile" ||
        p.phone_type === "mobile" ||
        p.line_type === "mobile",
    );
    if (hasMobile) return true;
  }

  // Check allPhones in metadata (from FDaily flow)
  if (metadata?.allPhones && Array.isArray(metadata.allPhones)) {
    const hasMobile = metadata.allPhones.some(
      (p: { isMobile?: boolean; type?: string }) =>
        p.isMobile === true || p.type === "mobile",
    );
    if (hasMobile) return true;
  }

  return false;
}

// GET - Get single lead by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const whereConditions = teamId
      ? and(eq(leads.id, id), eq(leads.teamId, teamId))
      : eq(leads.id, id);

    const [lead] = await db.select().from(leads).where(whereConditions);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: unknown) {
    console.error("[Lead API] GET Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: LeadUpdateInput = await request.json();

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Map allowed fields
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "title",
      "company",
      "address",
      "city",
      "state",
      "zipCode",
      "country",
      "status",
      "notes",
      "score",
      "tags",
    ];

    for (const field of allowedFields) {
      if (body[field as keyof LeadUpdateInput] !== undefined) {
        updateData[field] = body[field as keyof LeadUpdateInput];
      }
    }

    // Handle metadata merge
    if (
      body.metadata ||
      body.customFields ||
      body.phoneType ||
      body.secondaryPhone
    ) {
      // Fetch current lead to merge metadata
      const [current] = await db
        .select({ metadata: leads.metadata, customFields: leads.customFields })
        .from(leads)
        .where(eq(leads.id, id));

      if (current) {
        // Merge metadata
        const currentMeta = (current.metadata as Record<string, unknown>) || {};
        const newMeta = body.metadata || {};

        // Add phone type info
        if (body.phoneType) {
          newMeta.primaryPhoneType = body.phoneType;
        }
        if (body.secondaryPhone) {
          newMeta.secondaryPhone = body.secondaryPhone;
          newMeta.secondaryPhoneType = body.secondaryPhoneType || "unknown";
        }

        updateData.metadata = { ...currentMeta, ...newMeta };

        // Merge customFields
        if (body.customFields) {
          const currentCustom =
            (current.customFields as Record<string, unknown>) || {};
          updateData.customFields = { ...currentCustom, ...body.customFields };
        }
      }
    }

    // ============================================
    // CRITICAL: Check for campaign ready status
    // If a mobile phone is being added, mark as campaign ready
    // ============================================
    const isCampaignReady = shouldBeCampaignReady(
      body.phone || (updateData.phone as string),
      body.phoneType,
      updateData.metadata as Record<string, unknown>,
    );

    if (isCampaignReady) {
      // Update status if still "new" - mobile phone = qualified lead
      if (!body.status && updateData.status !== "contacted") {
        updateData.status = "qualified";
      }

      // Set campaign ready in metadata
      const meta = (updateData.metadata as Record<string, unknown>) || {};
      meta.campaignReady = true;
      meta.campaignReadyAt = new Date().toISOString();
      updateData.metadata = meta;

      console.log(
        `[Lead API] Lead ${id} marked campaign ready (mobile phone detected)`,
      );
    }

    // Filter by teamId for security
    const whereConditions = teamId
      ? and(eq(leads.id, id), eq(leads.teamId, teamId))
      : eq(leads.id, id);

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(whereConditions)
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lead: updated,
      campaignReady: isCampaignReady,
    });
  } catch (error: unknown) {
    console.error("[Lead API] PATCH Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Soft delete lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const whereConditions = teamId
      ? and(eq(leads.id, id), eq(leads.teamId, teamId))
      : eq(leads.id, id);

    // Soft delete by setting status to 'deleted'
    const [deleted] = await db
      .update(leads)
      .set({
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(whereConditions)
      .returning({ id: leads.id });

    if (!deleted) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Lead ${id} deleted`,
    });
  } catch (error: unknown) {
    console.error("[Lead API] DELETE Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
