/**
 * BUSINESS LIST COMPANIES API
 * Queries the businesses table (USBizData and other B2B data)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { and, or, eq, sql, desc, ilike } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, states, industries, sicCodes, page = 1, perPage = 50 } = body;

    const conditions = [];

    if (query && query.trim()) {
      const q = "%" + query.trim() + "%";
      conditions.push(or(ilike(businesses.companyName, q), ilike(businesses.ownerName, q), ilike(businesses.city, q)));
    }

    if (states && states.length > 0) {
      conditions.push(or(...states.map((s: string) => eq(businesses.state, s.toUpperCase()))));
    }

    if (sicCodes && sicCodes.length > 0) {
      conditions.push(or(...sicCodes.map((sic: string) => eq(businesses.sicCode, sic))));
    }

    if (industries && industries.length > 0) {
      conditions.push(or(...industries.map((ind: string) => ilike(businesses.sicDescription, "%" + ind + "%"))));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db.select({ count: sql`count(*)::int` }).from(businesses).where(whereClause);
    const total = countResult[0]?.count || 0;

    const results = await db
      .select()
      .from(businesses)
      .where(whereClause)
      .orderBy(desc(businesses.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);

    const companies = results.map((r) => ({
      id: r.id,
      name: r.companyName,
      company: r.companyName,
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      phone: r.phone || r.ownerPhone,
      email: r.email || r.ownerEmail,
      website: r.website,
      industry: r.sicDescription,
      sicCode: r.sicCode,
      employees: r.employeeCount,
      revenue: r.annualRevenue,
      contactName: r.ownerName || r.executiveName || "",
      firstName: r.ownerFirstName || "",
      lastName: r.ownerLastName || "",
      title: r.ownerTitle || r.executiveTitle || "",
      enrichmentStatus: r.enrichmentStatus,
    }));

    return NextResponse.json({ success: true, companies, total, page, perPage });
  } catch (error) {
    console.error("[Business List API] Error:", error);
    return NextResponse.json({ success: false, error: "Search failed", companies: [], total: 0 }, { status: 500 });
  }
}

export async function GET() {
  try {
    const countResult = await db.select({ count: sql`count(*)::int` }).from(businesses);
    return NextResponse.json({ success: true, total: countResult[0]?.count || 0 });
  } catch (error) {
    return NextResponse.json({ success: false, total: 0 }, { status: 500 });
  }
}
