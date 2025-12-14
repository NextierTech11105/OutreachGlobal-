/**
 * Airflow Cross-Reference API Routes
 * Called by cross_reference_dag.py for property/business matching
 *
 * NOTE: This uses in-memory storage for demo purposes.
 * In production, replace with database storage (PostgreSQL/Redis).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

// WARNING: In-memory storage - data will be lost on server restart
// TODO: Replace with database storage for production
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

// In-memory stores - FOR DEMO ONLY
// Production should use: PostgreSQL, Redis, or similar persistent storage
const pendingProperties = new Map<string, Property>();
const crossReferenceMatches = new Map<string, CrossReferenceMatch>();
const createdLeads = new Map<string, Record<string, unknown>>();

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

// GET /api/airflow/cross-reference
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "pending-properties";

    // Validate action
    const validActions = ["pending-properties", "matches"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 },
      );
    }

    switch (action) {
      case "pending-properties":
        return handlePendingProperties(url.searchParams);
      case "matches":
        return handleGetMatches(url.searchParams);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error(
      "[Airflow CrossRef] GET error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/airflow/cross-reference
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "create-leads";

    // Validate action
    const validActions = ["create-leads", "add-property"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 },
      );
    }

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
    console.error(
      "[Airflow CrossRef] POST error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handlePendingProperties(params: URLSearchParams) {
  // Validate and bound since_hours
  const sinceHoursRaw = params.get("since_hours");
  let sinceHours = 24;

  if (sinceHoursRaw) {
    const parsed = parseInt(sinceHoursRaw, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "since_hours must be a positive integer" },
        { status: 400 },
      );
    }
    sinceHours = Math.min(parsed, MAX_SINCE_HOURS);
  }

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
    storage_warning: "Using in-memory storage - data is not persisted",
  });
}

async function handleGetMatches(params: URLSearchParams) {
  // Validate and bound limit
  const limitRaw = params.get("limit");
  let limit = 100;

  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "limit must be a positive integer" },
        { status: 400 },
      );
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

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
    storage_warning: "Using in-memory storage - data is not persisted",
  });
}

async function handleCreateLeads(body: { matches: CrossReferenceMatch[] }) {
  const { matches } = body;

  if (!matches || !Array.isArray(matches)) {
    return NextResponse.json(
      { error: "matches array required" },
      { status: 400 },
    );
  }

  // Validate batch size
  if (matches.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum batch size is ${MAX_BATCH_SIZE} matches` },
      { status: 400 },
    );
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    // Validate required fields
    if (!match.property_id || !match.business_id) {
      errors.push(`Match ${i}: missing property_id or business_id`);
      skipped++;
      continue;
    }

    // Check for duplicate using deterministic key
    const existingKey = `${match.property_id}_${match.business_id}`;
    if (createdLeads.has(existingKey)) {
      skipped++;
      continue;
    }

    // Generate unique ID using UUID to avoid collisions
    const leadId = `lead_xref_${randomUUID()}`;
    const matchId = `match_${randomUUID()}`;

    // Create lead from match
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

    createdLeads.set(existingKey, lead);

    // Store match record
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

  console.log(
    `[Airflow CrossRef] Created ${created} leads, skipped ${skipped} duplicates`,
  );

  return NextResponse.json({
    success: true,
    created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    storage_warning: "Using in-memory storage - data is not persisted",
  });
}

async function handleAddProperty(body: {
  id?: string;
  address: string;
  owner_name: string;
}) {
  // Validate required fields
  if (!body.address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  if (!body.owner_name) {
    return NextResponse.json(
      { error: "owner_name is required" },
      { status: 400 },
    );
  }

  // Validate field formats
  if (!validateAddress(body.address)) {
    return NextResponse.json(
      { error: "Invalid address format (1-500 characters)" },
      { status: 400 },
    );
  }

  if (!validateOwnerName(body.owner_name)) {
    return NextResponse.json(
      { error: "Invalid owner_name format (1-200 characters)" },
      { status: 400 },
    );
  }

  // Validate or generate ID
  let id: string;
  if (body.id) {
    if (!validateId(body.id)) {
      return NextResponse.json(
        {
          error:
            "Invalid id format (alphanumeric, underscores, hyphens, max 100 chars)",
        },
        { status: 400 },
      );
    }
    id = body.id;
  } else {
    id = `prop_${randomUUID()}`;
  }

  // Check for duplicate
  if (pendingProperties.has(id)) {
    return NextResponse.json(
      { error: "Property with this ID already exists" },
      { status: 409 },
    );
  }

  const property: Property = {
    id,
    address: body.address,
    owner_name: body.owner_name,
    created_at: new Date().toISOString(),
    cross_referenced: false,
  };

  pendingProperties.set(id, property);

  console.log(`[Airflow CrossRef] Added property for cross-referencing`);

  return NextResponse.json({
    success: true,
    property,
    storage_warning: "Using in-memory storage - data is not persisted",
  });
}
