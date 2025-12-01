import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

// DATABASE_URL must be set in environment
const DB_URL = process.env.DATABASE_URL || "";

export async function POST(request: NextRequest) {
  const client = new Client({ connectionString: DB_URL });

  try {
    const body = await request.json();
    const { state, city, company, limit = 100, offset = 0 } = body;

    await client.connect();

    // Build query for leads with company/address data
    let query = `
      SELECT
        id,
        first_name,
        last_name,
        company,
        email,
        phone,
        address,
        city,
        state,
        zip_code,
        property_id,
        metadata,
        created_at
      FROM leads
      WHERE 1=1
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (state) {
      query += ` AND state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    if (city) {
      query += ` AND city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (company) {
      query += ` AND company ILIKE $${paramIndex}`;
      params.push(`%${company}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await client.query(query, params);

    // Get count
    let countQuery = `SELECT COUNT(*) FROM leads WHERE 1=1`;
    const countParams: string[] = [];
    let countIndex = 1;

    if (state) {
      countQuery += ` AND state = $${countIndex}`;
      countParams.push(state);
      countIndex++;
    }
    if (city) {
      countQuery += ` AND city ILIKE $${countIndex}`;
      countParams.push(`%${city}%`);
      countIndex++;
    }
    if (company) {
      countQuery += ` AND company ILIKE $${countIndex}`;
      countParams.push(`%${company}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      leads: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error("B2B search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
