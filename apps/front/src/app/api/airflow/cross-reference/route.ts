/**
 * Airflow Cross-Reference API Routes
 * Called by cross_reference_dag.py for property/business matching
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory stores for demo
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

const pendingProperties = new Map<string, Property>();
const crossReferenceMatches = new Map<string, CrossReferenceMatch>();
const createdLeads = new Map<string, any>();

// GET /api/airflow/cross-reference
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "pending-properties";

    switch (action) {
      case "pending-properties":
        return handlePendingProperties(url.searchParams);
      case "matches":
        return handleGetMatches(url.searchParams);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow CrossRef] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/airflow/cross-reference
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "create-leads";
    const body = await request.json();

    switch (action) {
      case "create-leads":
        return handleCreateLeads(body);
      case "add-property":
        return handleAddProperty(body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow CrossRef] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePendingProperties(params: URLSearchParams) {
  const sinceHours = parseInt(params.get("since_hours") || "24");
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  // Get properties that haven't been cross-referenced yet
  const pending: Property[] = [];

  pendingProperties.forEach((prop) => {
    if (!prop.cross_referenced) {
      const createdAt = new Date(prop.created_at);
      if (createdAt >= since) {
        pending.push(prop);
      }
    }
  });

  console.log(`[Airflow CrossRef] Found ${pending.length} pending properties`);

  return NextResponse.json({
    properties: pending,
    count: pending.length,
  });
}

async function handleGetMatches(params: URLSearchParams) {
  const limit = parseInt(params.get("limit") || "100");
  const bundledOnly = params.get("bundled_only") === "true";

  let matches = Array.from(crossReferenceMatches.values());

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

async function handleCreateLeads(body: { matches: CrossReferenceMatch[] }) {
  const { matches } = body;

  if (!matches || !Array.isArray(matches)) {
    return NextResponse.json({ error: "Matches array required" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  for (const match of matches) {
    // Check for duplicate
    const existingKey = `${match.property_id}_${match.business_id}`;
    if (createdLeads.has(existingKey)) {
      skipped++;
      continue;
    }

    // Create lead from match
    const lead = {
      id: `lead_xref_${Date.now()}_${created}`,
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

    createdLeads.set(existingKey, lead);

    // Store match record
    const matchId = `match_${Date.now()}_${created}`;
    crossReferenceMatches.set(matchId, {
      id: matchId,
      ...match,
      created_at: new Date().toISOString(),
    });

    // Mark property as cross-referenced
    const prop = pendingProperties.get(match.property_id);
    if (prop) {
      prop.cross_referenced = true;
    }

    created++;
  }

  console.log(`[Airflow CrossRef] Created ${created} leads, skipped ${skipped} duplicates`);

  return NextResponse.json({
    success: true,
    created,
    skipped,
  });
}

async function handleAddProperty(body: {
  id?: string;
  address: string;
  owner_name: string;
}) {
  const id = body.id || `prop_${Date.now()}`;

  const property: Property = {
    id,
    address: body.address,
    owner_name: body.owner_name,
    created_at: new Date().toISOString(),
    cross_referenced: false,
  };

  pendingProperties.set(id, property);

  console.log(`[Airflow CrossRef] Added property ${id} for cross-referencing`);

  return NextResponse.json({
    success: true,
    property,
  });
}
