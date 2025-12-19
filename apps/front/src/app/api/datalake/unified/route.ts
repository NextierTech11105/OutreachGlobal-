/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED DATALAKE API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Consolidates businesses + contacts + leads into ONE unified view.
 * No more fragmented queries across 3 tables.
 *
 * 5,514,091 contacts → ONE endpoint → LUCY → GIANNA/CATHY/SABRINA
 *
 * SignalHouse.io handles SMS/Voice infrastructure.
 * We handle the data and AI persona orchestration.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, contacts, leads } from "@/lib/db/schema";
import { sql, eq, and, or, desc, asc, isNotNull, like, ilike } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnifiedContact {
  id: string;
  source: "business" | "contact" | "lead";
  sourceId: string;

  // Identity
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;

  // Contact info
  phone?: string;
  mobilePhone?: string;
  email?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Business context
  sicCode?: string;
  sector?: string;
  employeeCount?: number;
  annualRevenue?: number;

  // Lead scoring
  score: number;
  tags: string[];
  status: string;

  // Campaign readiness
  hasPhone: boolean;
  hasEmail: boolean;
  skipTraceNeeded: boolean;
  campaignReady: boolean;

  // AI worker assignment
  suggestedWorker: "gianna" | "cathy" | "sabrina";
  suggestedLane: string;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Query unified datalake
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const action = searchParams.get("action") || "stats";
  const source = searchParams.get("source"); // business | contact | lead | all
  const hasPhone = searchParams.get("hasPhone");
  const hasEmail = searchParams.get("hasEmail");
  const campaignReady = searchParams.get("campaignReady");
  const sector = searchParams.get("sector");
  const state = searchParams.get("state");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = searchParams.get("sortDir") || "desc";

  try {
    switch (action) {
      // ═══════════════════════════════════════════════════════════════════════
      // STATS - Get counts across all sources
      // ═══════════════════════════════════════════════════════════════════════
      case "stats": {
        const [businessCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(businesses);

        const [contactCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contacts);

        const [leadCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads);

        // Campaign ready = has phone
        const [businessesWithPhone] = await db
          .select({ count: sql<number>`count(*)` })
          .from(businesses)
          .where(
            or(isNotNull(businesses.phone), isNotNull(businesses.ownerPhone))
          );

        const [contactsWithPhone] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contacts)
          .where(isNotNull(contacts.phone));

        const [leadsWithPhone] = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(isNotNull(leads.phone));

        const totalRecords =
          (businessCount?.count || 0) +
          (contactCount?.count || 0) +
          (leadCount?.count || 0);

        const totalCampaignReady =
          (businessesWithPhone?.count || 0) +
          (contactsWithPhone?.count || 0) +
          (leadsWithPhone?.count || 0);

        return NextResponse.json({
          success: true,
          unified: {
            totalRecords,
            totalCampaignReady,
            needsSkipTrace: totalRecords - totalCampaignReady,
          },
          bySource: {
            businesses: {
              total: businessCount?.count || 0,
              withPhone: businessesWithPhone?.count || 0,
            },
            contacts: {
              total: contactCount?.count || 0,
              withPhone: contactsWithPhone?.count || 0,
            },
            leads: {
              total: leadCount?.count || 0,
              withPhone: leadsWithPhone?.count || 0,
            },
          },
          lucyPipeline: {
            dailyLimit: 2000,
            monthlyTarget: 20000,
            batchSize: 250,
            message: "LUCY scans → GIANNA/CATHY/SABRINA execute",
          },
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // QUERY - Search across unified view
      // ═══════════════════════════════════════════════════════════════════════
      case "query": {
        const results: UnifiedContact[] = [];

        // Query businesses if source is all or business
        if (!source || source === "all" || source === "business") {
          const bizResults = await db
            .select({
              id: businesses.id,
              companyName: businesses.companyName,
              ownerName: businesses.ownerName,
              ownerFirstName: businesses.ownerFirstName,
              ownerLastName: businesses.ownerLastName,
              phone: businesses.phone,
              ownerPhone: businesses.ownerPhone,
              email: businesses.email,
              ownerEmail: businesses.ownerEmail,
              address: businesses.address,
              city: businesses.city,
              state: businesses.state,
              zip: businesses.zip,
              sicCode: businesses.sicCode,
              employeeCount: businesses.employeeCount,
              annualRevenue: businesses.annualRevenue,
              status: businesses.status,
              createdAt: businesses.createdAt,
              updatedAt: businesses.updatedAt,
            })
            .from(businesses)
            .where(
              and(
                search
                  ? or(
                      ilike(businesses.companyName, `%${search}%`),
                      ilike(businesses.ownerName, `%${search}%`)
                    )
                  : undefined,
                state ? eq(businesses.state, state) : undefined,
                sector ? eq(businesses.sicCode, sector) : undefined,
                hasPhone === "true"
                  ? or(
                      isNotNull(businesses.phone),
                      isNotNull(businesses.ownerPhone)
                    )
                  : undefined,
                hasEmail === "true"
                  ? or(
                      isNotNull(businesses.email),
                      isNotNull(businesses.ownerEmail)
                    )
                  : undefined
              )
            )
            .orderBy(
              sortDir === "desc"
                ? desc(businesses.createdAt)
                : asc(businesses.createdAt)
            )
            .limit(limit)
            .offset(offset);

          for (const biz of bizResults) {
            const phone = biz.ownerPhone || biz.phone;
            const email = biz.ownerEmail || biz.email;
            const hasPhoneVal = !!phone;
            const hasEmailVal = !!email;

            results.push({
              id: `biz_${biz.id}`,
              source: "business",
              sourceId: biz.id,
              name:
                biz.ownerName ||
                `${biz.ownerFirstName || ""} ${biz.ownerLastName || ""}`.trim() ||
                biz.companyName || "Unknown",
              firstName: biz.ownerFirstName || undefined,
              lastName: biz.ownerLastName || undefined,
              company: biz.companyName || undefined,
              phone: phone || undefined,
              mobilePhone: biz.ownerPhone || undefined,
              email: email || undefined,
              address: biz.address || undefined,
              city: biz.city || undefined,
              state: biz.state || undefined,
              zip: biz.zip || undefined,
              sicCode: biz.sicCode || undefined,
              employeeCount: biz.employeeCount || undefined,
              annualRevenue: biz.annualRevenue
                ? Number(biz.annualRevenue)
                : undefined,
              score: calculateScore(biz),
              tags: generateTags(biz),
              status: biz.status || "new",
              hasPhone: hasPhoneVal,
              hasEmail: hasEmailVal,
              skipTraceNeeded: !hasPhoneVal,
              campaignReady: hasPhoneVal,
              suggestedWorker: "gianna",
              suggestedLane: "initial",
              createdAt: biz.createdAt || new Date(),
              updatedAt: biz.updatedAt || undefined,
            });
          }
        }

        // Query leads if source is all or lead
        if (!source || source === "all" || source === "lead") {
          const leadResults = await db
            .select({
              id: leads.id,
              firstName: leads.firstName,
              lastName: leads.lastName,
              email: leads.email,
              phone: leads.phone,
              company: leads.company,
              address: leads.address,
              city: leads.city,
              state: leads.state,
              zip: leads.zip,
              score: leads.score,
              status: leads.status,
              createdAt: leads.createdAt,
              updatedAt: leads.updatedAt,
            })
            .from(leads)
            .where(
              and(
                search
                  ? or(
                      ilike(leads.firstName, `%${search}%`),
                      ilike(leads.lastName, `%${search}%`),
                      ilike(leads.company, `%${search}%`)
                    )
                  : undefined,
                state ? eq(leads.state, state) : undefined,
                status ? eq(leads.status, status) : undefined,
                hasPhone === "true" ? isNotNull(leads.phone) : undefined,
                hasEmail === "true" ? isNotNull(leads.email) : undefined
              )
            )
            .orderBy(
              sortDir === "desc" ? desc(leads.createdAt) : asc(leads.createdAt)
            )
            .limit(limit)
            .offset(offset);

          for (const lead of leadResults) {
            const hasPhoneVal = !!lead.phone;
            const hasEmailVal = !!lead.email;

            results.push({
              id: `lead_${lead.id}`,
              source: "lead",
              sourceId: lead.id,
              name:
                `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
                "Unknown",
              firstName: lead.firstName || undefined,
              lastName: lead.lastName || undefined,
              company: lead.company || undefined,
              phone: lead.phone || undefined,
              email: lead.email || undefined,
              address: lead.address || undefined,
              city: lead.city || undefined,
              state: lead.state || undefined,
              zip: lead.zip || undefined,
              score: lead.score || 50,
              tags: [],
              status: lead.status || "new",
              hasPhone: hasPhoneVal,
              hasEmail: hasEmailVal,
              skipTraceNeeded: !hasPhoneVal,
              campaignReady: hasPhoneVal,
              suggestedWorker: getSuggestedWorker(lead.status || "new"),
              suggestedLane: getSuggestedLane(lead.status || "new"),
              createdAt: lead.createdAt || new Date(),
              updatedAt: lead.updatedAt || undefined,
            });
          }
        }

        // Sort combined results by score (highest first)
        results.sort((a, b) => b.score - a.score);

        return NextResponse.json({
          success: true,
          results: results.slice(0, limit),
          total: results.length,
          pagination: {
            limit,
            offset,
            hasMore: results.length >= limit,
          },
          filters: {
            source,
            hasPhone,
            hasEmail,
            state,
            sector,
            search,
          },
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // CAMPAIGN-READY - Get records ready for GIANNA/CATHY/SABRINA
      // ═══════════════════════════════════════════════════════════════════════
      case "campaign-ready": {
        const worker = searchParams.get("worker") || "gianna";
        const lane = searchParams.get("lane") || "initial";

        // Get businesses with phones (campaign ready)
        const readyLeads = await db
          .select({
            id: businesses.id,
            companyName: businesses.companyName,
            ownerName: businesses.ownerName,
            ownerFirstName: businesses.ownerFirstName,
            ownerLastName: businesses.ownerLastName,
            phone: businesses.ownerPhone,
            email: businesses.ownerEmail,
            address: businesses.address,
            city: businesses.city,
            state: businesses.state,
            sicCode: businesses.sicCode,
            annualRevenue: businesses.annualRevenue,
          })
          .from(businesses)
          .where(isNotNull(businesses.ownerPhone))
          .orderBy(desc(businesses.annualRevenue))
          .limit(limit);

        const formatted = readyLeads.map((biz) => ({
          id: biz.id,
          name:
            biz.ownerName ||
            `${biz.ownerFirstName || ""} ${biz.ownerLastName || ""}`.trim(),
          company: biz.companyName,
          phone: biz.phone,
          email: biz.email,
          location: `${biz.city || ""}, ${biz.state || ""}`.trim(),
          sector: biz.sicCode,
          revenue: biz.annualRevenue,
          worker,
          lane,
          ready: true,
        }));

        return NextResponse.json({
          success: true,
          worker,
          lane,
          leads: formatted,
          count: formatted.length,
          message: `${formatted.length} leads ready for ${worker.toUpperCase()} on ${lane} lane`,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: stats, query, campaign-ready" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Unified Datalake] Error:", error);
    return NextResponse.json(
      { error: "Query failed", details: String(error) },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateScore(biz: any): number {
  let score = 50; // Base score

  // Revenue boost
  if (biz.annualRevenue) {
    const rev = Number(biz.annualRevenue);
    if (rev >= 10000000) score += 30;
    else if (rev >= 5000000) score += 25;
    else if (rev >= 1000000) score += 20;
    else if (rev >= 500000) score += 15;
    else if (rev >= 100000) score += 10;
  }

  // Employee boost
  if (biz.employeeCount) {
    if (biz.employeeCount >= 100) score += 10;
    else if (biz.employeeCount >= 20) score += 5;
  }

  // Contact quality boost
  if (biz.ownerPhone) score += 10;
  if (biz.ownerEmail) score += 5;
  if (biz.ownerName) score += 5;

  return Math.min(100, score);
}

function generateTags(biz: any): string[] {
  const tags: string[] = [];

  if (biz.annualRevenue && Number(biz.annualRevenue) >= 1000000) {
    tags.push("high-revenue");
  }
  if (biz.employeeCount && biz.employeeCount >= 20) {
    tags.push("established");
  }
  if (biz.ownerPhone) {
    tags.push("mobile-verified");
  }
  if (biz.sicCode) {
    tags.push(`sic-${biz.sicCode}`);
  }

  return tags;
}

function getSuggestedWorker(
  status: string
): "gianna" | "cathy" | "sabrina" {
  switch (status) {
    case "new":
    case "pending":
      return "gianna";
    case "contacted":
    case "no_response":
      return "cathy";
    case "interested":
    case "qualified":
      return "sabrina";
    default:
      return "gianna";
  }
}

function getSuggestedLane(status: string): string {
  switch (status) {
    case "new":
    case "pending":
      return "initial";
    case "contacted":
      return "follow_up";
    case "no_response":
      return "nudger";
    case "interested":
      return "book_appointment";
    case "qualified":
      return "book_appointment";
    default:
      return "initial";
  }
}
