/**
 * Airflow Cross-Reference API Routes
 * Called by cross_reference_dag.py for property/business matching
 *
 * Uses appState table for persistence.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { appState } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface Property {
  id: string;
  address: string;
  owner_name: string;
  created_at: string;
  cross_referenced: boolean;
}

interface CrossReferenceMatch {
  id: string;
  property_id: string;
  business_id: string;
  property_address: string;
  property_owner: string;
  business_name: string;
  business_contact: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  address_score: number;
  name_score: number;
  combined_score: number;
  match_type: string;
  bundled_deal: boolean;
  deal_score: number;
  created_at: string;
}

// Validation constants
const MAX_LIMIT = 1000;
const MAX_SINCE_HOURS = 168; // 7 days
const MAX_BATCH_SIZE = 100;

// Input validation helpers
function validateAddress(address: string): boolean {
  return (
    typeof address === "string" && address.length > 0 && address.length <= 500
  );
}

function validateOwnerName(name: string): boolean {
  return typeof name === "string" && name.length > 0 && name.length <= 200;
}

function validateId(id: string): boolean {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

// Helper functions for database operations
async function getProperty(
  propId: string,
  teamId: string
): Promise<Property | null> {
  const key = `xref_property:${propId}`;
  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);
  return state?.value as Property | null;
}

async function saveProperty(property: Property, teamId: string): Promise<void> {
  const key = `xref_property:${property.id}`;
  const [existing] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: property, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      key,
      value: property,
    });
  }
}

async function saveMatch(match: CrossReferenceMatch, teamId: string): Promise<void> {
  const key = `xref_match:${match.id}`;
  await db.insert(appState).values({
    id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teamId,
    key,
    value: match,
  });
}

async function saveLead(
  leadKey: string,
  lead: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const key = `xref_lead:${leadKey}`;
  await db.insert(appState).values({
    id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teamId,
    key,
    value: lead,
  });
}

async function hasLead(leadKey: string, teamId: string): Promise<boolean> {
  const key = `xref_lead:${leadKey}`;
  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);
  return !!state;
}

// GET /api/airflow/cross-reference
export async function GET(request: NextRequest) {
  try {
    const { userId, teamId: authTeamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "pending-properties";
    const teamId = url.searchParams.get("teamId") || authTeamId || "default";

    const validActions = ["pending-properties", "matches"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    switch (action) {
      case "pending-properties":
        return handlePendingProperties(url.searchParams, teamId);
      case "matches":
        return handleGetMatches(url.searchParams, teamId);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error(
      "[Airflow CrossRef] GET error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/airflow/cross-reference
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId: authTeamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "create-leads";
    const body = await request.json();
    const teamId = body.teamId || authTeamId || "default";

    const validActions = ["create-leads", "add-property"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    switch (action) {
      case "create-leads":
        return handleCreateLeads(body, teamId);
      case "add-property":
        return handleAddProperty(body, teamId);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error(
      "[Airflow CrossRef] POST error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePendingProperties(params: URLSearchParams, teamId: string) {
  const sinceHoursRaw = params.get("since_hours");
  let sinceHours = 24;

  if (sinceHoursRaw) {
    const parsed = parseInt(sinceHoursRaw, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "since_hours must be a positive integer" },
        { status: 400 }
      );
    }
    sinceHours = Math.min(parsed, MAX_SINCE_HOURS);
  }

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  // Get all properties from database
  const allStates = await db
    .select()
    .from(appState)
    .where(eq(appState.teamId, teamId));

  const properties = allStates
    .filter((s) => s.key.startsWith("xref_property:") && s.value)
    .map((s) => s.value as Property);

  // Filter pending properties
  const pending = properties.filter((prop) => {
    if (prop.cross_referenced) return false;
    const createdAt = new Date(prop.created_at);
    return createdAt >= since;
  });

  console.log(`[Airflow CrossRef] Found ${pending.length} pending properties`);

  return NextResponse.json({
    properties: pending,
    count: pending.length,
  });
}

async function handleGetMatches(params: URLSearchParams, teamId: string) {
  const limitRaw = params.get("limit");
  let limit = 100;

  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "limit must be a positive integer" },
        { status: 400 }
      );
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  const bundledOnly = params.get("bundled_only") === "true";

  // Get all matches from database
  const allStates = await db
    .select()
    .from(appState)
    .where(eq(appState.teamId, teamId));

  let matches = allStates
    .filter((s) => s.key.startsWith("xref_match:") && s.value)
    .map((s) => s.value as CrossReferenceMatch);

  if (bundledOnly) {
    matches = matches.filter((m) => m.bundled_deal);
  }

  // Sort by deal score descending
  matches.sort((a, b) => b.deal_score - a.deal_score);

  return NextResponse.json({
    matches: matches.slice(0, limit),
    total: matches.length,
    bundled_deals: matches.filter((m) => m.bundled_deal).length,
  });
}

async function handleCreateLeads(
  body: { matches: CrossReferenceMatch[] },
  teamId: string
) {
  const { matches } = body;

  if (!matches || !Array.isArray(matches)) {
    return NextResponse.json(
      { error: "matches array required" },
      { status: 400 }
    );
  }

  if (matches.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum batch size is ${MAX_BATCH_SIZE} matches` },
      { status: 400 }
    );
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    if (!match.property_id || !match.business_id) {
      errors.push(`Match ${i}: missing property_id or business_id`);
      skipped++;
      continue;
    }

    // Check for duplicate using deterministic key
    const existingKey = `${match.property_id}_${match.business_id}`;
    if (await hasLead(existingKey, teamId)) {
      skipped++;
      continue;
    }

    const leadId = `lead_xref_${randomUUID()}`;
    const matchId = `match_${randomUUID()}`;

    const lead = {
      id: leadId,
      type: match.bundled_deal ? "bundled_deal" : "cross_reference",
      name: match.business_contact || match.property_owner,
      company: match.business_name,
      phone: match.business_phone,
      email: match.business_email,
      property_address: match.property_address,
      business_address: match.business_address,
      match_scores: {
        address: match.address_score,
        name: match.name_score,
        combined: match.combined_score,
        deal: match.deal_score,
      },
      source: "airflow_cross_reference",
      created_at: new Date().toISOString(),
    };

    await saveLead(existingKey, lead, teamId);

    // Store match record
    await saveMatch(
      {
        ...match,
        id: matchId,
        created_at: new Date().toISOString(),
      },
      teamId
    );

    // Mark property as cross-referenced
    const prop = await getProperty(match.property_id, teamId);
    if (prop) {
      prop.cross_referenced = true;
      await saveProperty(prop, teamId);
    }

    created++;
  }

  console.log(
    `[Airflow CrossRef] Created ${created} leads, skipped ${skipped} duplicates`
  );

  return NextResponse.json({
    success: true,
    created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}

async function handleAddProperty(
  body: {
    id?: string;
    address: string;
    owner_name: string;
  },
  teamId: string
) {
  if (!body.address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  if (!body.owner_name) {
    return NextResponse.json(
      { error: "owner_name is required" },
      { status: 400 }
    );
  }

  if (!validateAddress(body.address)) {
    return NextResponse.json(
      { error: "Invalid address format (1-500 characters)" },
      { status: 400 }
    );
  }

  if (!validateOwnerName(body.owner_name)) {
    return NextResponse.json(
      { error: "Invalid owner_name format (1-200 characters)" },
      { status: 400 }
    );
  }

  let id: string;
  if (body.id) {
    if (!validateId(body.id)) {
      return NextResponse.json(
        {
          error:
            "Invalid id format (alphanumeric, underscores, hyphens, max 100 chars)",
        },
        { status: 400 }
      );
    }
    id = body.id;
  } else {
    id = `prop_${randomUUID()}`;
  }

  // Check for duplicate
  const existing = await getProperty(id, teamId);
  if (existing) {
    return NextResponse.json(
      { error: "Property with this ID already exists" },
      { status: 409 }
    );
  }

  const property: Property = {
    id,
    address: body.address,
    owner_name: body.owner_name,
    created_at: new Date().toISOString(),
    cross_referenced: false,
  };

  await saveProperty(property, teamId);

  console.log(`[Airflow CrossRef] Added property for cross-referencing`);

  return NextResponse.json({
    success: true,
    property,
  });
}
