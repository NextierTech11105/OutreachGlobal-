import { NextRequest, NextResponse } from "next/server";
import { Lead, BucketLeadsResponse, applyAutoTags } from "@/lib/types/bucket";

// Generate mock leads for a bucket
function generateMockLeads(bucketId: string, source: "real-estate" | "apollo" | "mixed", count: number): Lead[] {
  const leads: Lead[] = [];

  const firstNames = ["John", "Mike", "David", "Chris", "James", "Robert", "William", "Richard", "Joseph", "Thomas"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  const companies = ["ABC Plumbing", "XYZ HVAC", "Premier Roofing", "Elite Electric", "Pro Landscaping", "Quality Construction", "Master Carpentry", "Top Tier Painting"];
  const industries = ["Plumbing", "HVAC", "Roofing", "Electrical", "Landscaping", "Construction", "Carpentry", "Painting"];
  const cities = ["New York", "Los Angeles", "Houston", "Dallas", "Austin", "Miami", "Chicago", "Phoenix"];
  const states = ["NY", "CA", "TX", "TX", "TX", "FL", "IL", "AZ"];
  const propertyTypes = ["SFR", "Multi-Family", "Commercial", "Industrial"];
  const signals = ["hiring surge", "funding round", "expansion", "new location", "technology adoption"];
  const statuses: Lead["status"][] = ["new", "contacted", "qualified", "nurturing"];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const cityIndex = Math.floor(Math.random() * cities.length);
    const isRealEstate = source === "real-estate" || (source === "mixed" && Math.random() > 0.5);

    const lead: Lead = {
      id: `lead-${bucketId}-${i}`,
      bucketId,
      source: isRealEstate ? "real-estate" : "apollo",
      status: statuses[Math.floor(Math.random() * statuses.length)],
      tags: [],
      autoTags: [],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companies[i % companies.length].toLowerCase().replace(/\s+/g, "")}.com`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      enrichmentStatus: Math.random() > 0.3 ? "completed" : "pending",
      activityCount: Math.floor(Math.random() * 10),
    };

    // Add property data for real estate leads
    if (isRealEstate || source === "mixed") {
      const estimatedValue = Math.floor(Math.random() * 900000) + 100000;
      const equityPercent = Math.floor(Math.random() * 80) + 20;
      lead.propertyData = {
        propertyId: `prop-${i}`,
        address: `${Math.floor(Math.random() * 9000) + 1000} ${lastName} St`,
        city: cities[cityIndex],
        state: states[cityIndex],
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        propertyType: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
        bedrooms: Math.floor(Math.random() * 4) + 2,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        sqft: Math.floor(Math.random() * 2000) + 1000,
        yearBuilt: Math.floor(Math.random() * 50) + 1970,
        estimatedValue,
        estimatedEquity: Math.floor(estimatedValue * (equityPercent / 100)),
        equityPercent,
        lastSaleDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        lastSaleAmount: Math.floor(estimatedValue * 0.7),
        ownerOccupied: Math.random() > 0.4,
        absenteeOwner: Math.random() > 0.6,
      };
    }

    // Add Apollo data for B2B leads
    if (!isRealEstate || source === "mixed") {
      const revenue = Math.floor(Math.random() * 9000000) + 1000000;
      lead.apolloData = {
        personId: `apollo-person-${i}`,
        organizationId: `apollo-org-${i}`,
        title: "Owner",
        company: companies[i % companies.length],
        companyDomain: `${companies[i % companies.length].toLowerCase().replace(/\s+/g, "")}.com`,
        industry: industries[i % industries.length],
        revenue,
        revenueRange: revenue >= 5000000 ? "$5M-$10M" : "$1M-$5M",
        employeeCount: Math.floor(Math.random() * 50) + 5,
        employeeRange: "11-50",
        linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        intentScore: Math.floor(Math.random() * 100),
        signals: [signals[Math.floor(Math.random() * signals.length)]],
        foundedYear: Math.floor(Math.random() * 20) + 2000,
      };
    }

    // Apply auto-tags
    lead.autoTags = applyAutoTags(lead);

    // Add some manual tags
    if (Math.random() > 0.7) {
      lead.tags.push("priority");
    }
    if (lead.enrichmentStatus === "completed" && Math.random() > 0.5) {
      lead.enrichedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    leads.push(lead);
  }

  return leads;
}

// GET /api/buckets/:id/leads - Get leads for a bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "25");
    const status = searchParams.get("status");
    const tag = searchParams.get("tag");
    const enriched = searchParams.get("enriched");

    // Determine source and count based on bucket ID
    let source: "real-estate" | "apollo" | "mixed" = "mixed";
    let totalCount = 50;

    if (id === "bucket-1") {
      source = "real-estate";
      totalCount = 156;
    } else if (id === "bucket-2") {
      source = "apollo";
      totalCount = 89;
    } else if (id === "bucket-3") {
      source = "real-estate";
      totalCount = 234;
    }

    // Generate leads
    let leads = generateMockLeads(id, source, totalCount);

    // Apply filters
    if (status) {
      leads = leads.filter((l) => l.status === status);
    }
    if (tag) {
      leads = leads.filter((l) => l.tags.includes(tag) || l.autoTags.includes(tag));
    }
    if (enriched === "true") {
      leads = leads.filter((l) => l.enrichmentStatus === "completed");
    } else if (enriched === "false") {
      leads = leads.filter((l) => l.enrichmentStatus !== "completed");
    }

    // Paginate
    const total = leads.length;
    const start = (page - 1) * perPage;
    const paginatedLeads = leads.slice(start, start + perPage);

    const response: BucketLeadsResponse = {
      leads: paginatedLeads,
      total,
      page,
      perPage,
      enrichmentStatus: id === "bucket-3" ? "processing" : "completed",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Bucket Leads API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
