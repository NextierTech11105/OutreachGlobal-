import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

// DATABASE_URL must be set in environment
const DB_URL = process.env.DATABASE_URL || "";
const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";

export async function POST(request: NextRequest) {
  const client = new Client({ connectionString: DB_URL });

  try {
    const body = await request.json();
    const { leadId, address, city, state, zip } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    if (!address || !state) {
      return NextResponse.json({ error: "address and state are required" }, { status: 400 });
    }

    // Query RealEstateAPI for property at this address
    const searchPayload = {
      address: address,
      city: city || undefined,
      state: state,
      zip: zip || undefined,
      size: 1,
    };

    console.log("Enriching lead with address:", searchPayload);

    const apiResponse = await fetch("https://api.realestateapi.com/v2/PropertySearch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(searchPayload),
    });

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("RealEstateAPI error:", apiData);
      return NextResponse.json(
        { error: apiData.message || "Property lookup failed" },
        { status: apiResponse.status }
      );
    }

    if (!apiData.data || apiData.data.length === 0) {
      return NextResponse.json(
        { error: "No property found at this address", searched: searchPayload },
        { status: 404 }
      );
    }

    const property = apiData.data[0];

    // Connect to database
    await client.connect();

    // Upsert property record
    const propertyId = property.id || property.propertyId || `prop-${Date.now()}`;

    const upsertPropertyQuery = `
      INSERT INTO properties (
        id, external_id, source,
        owner_first_name, owner_last_name,
        use_code, type, owner_occupied,
        lot_square_feet, building_square_feet,
        assessed_value, estimated_value, year_built,
        address, mortgage_info, metadata,
        occupancy_status, last_sale_date, last_sale_price,
        equity_amount, equity_percent, loan_balance,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        owner_first_name = EXCLUDED.owner_first_name,
        owner_last_name = EXCLUDED.owner_last_name,
        assessed_value = EXCLUDED.assessed_value,
        estimated_value = EXCLUDED.estimated_value,
        equity_amount = EXCLUDED.equity_amount,
        equity_percent = EXCLUDED.equity_percent,
        loan_balance = EXCLUDED.loan_balance,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;

    const propertyAddress = property.address || {};

    const propertyParams = [
      propertyId,
      property.propertyId || property.id,
      "realestate_api",
      property.owner1FirstName || null,
      property.owner1LastName || null,
      property.propertyUseCode?.toString() || null,
      property.propertyType || null,
      property.ownerOccupied || false,
      property.lotSquareFeet || null,
      property.squareFeet || null,
      property.assessedValue || null,
      property.estimatedValue || null,
      property.yearBuilt || null,
      JSON.stringify(propertyAddress),
      JSON.stringify({
        balance: property.openMortgageBalance,
        lender: property.lenderName,
        rate: property.interestRate,
      }),
      JSON.stringify(property),
      property.ownerOccupied ? "occupied" : "vacant",
      property.lastSaleDate || null,
      property.lastSaleAmount ? parseInt(property.lastSaleAmount) : null,
      property.estimatedEquity || null,
      property.equityPercent || null,
      property.openMortgageBalance || null,
    ];

    const propertyResult = await client.query(upsertPropertyQuery, propertyParams);

    // Update lead with property_id
    await client.query(
      "UPDATE leads SET property_id = $1, updated_at = NOW() WHERE id = $2",
      [propertyId, leadId]
    );

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      property: propertyResult.rows[0],
      raw_api_data: property,
    });
  } catch (error: unknown) {
    console.error("B2B enrich error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enrichment failed" },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
